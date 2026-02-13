import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_CHAIN_LENGTH = 12;

// Chain link validator
const chainLinkValidator = v.object({
  cardId: v.string(),
  playerId: v.string(),
  effectId: v.string(),
  spellSpeed: v.number(),
  targets: v.array(v.string()),
  negated: v.optional(v.boolean()),
});

// Chain state return validator
const chainStateValidator = v.object({
  _id: v.string(),
  gameId: v.string(),
  links: v.array(chainLinkValidator),
  resolving: v.boolean(),
  priorityPlayerId: v.optional(v.string()),
});

/**
 * Creates a new chain state for a game.
 * Throws if a chain already exists for this game.
 */
export const startChain = mutation({
  args: {
    gameId: v.string(),
    priorityPlayerId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if chain already exists
    const existing = await ctx.db
      .query("chainState")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (existing && !existing.resolving) {
      throw new Error(
        `Chain already exists for game ${args.gameId}. Resolve existing chain before starting a new one.`
      );
    }

    // Create new chain
    const chainId = await ctx.db.insert("chainState", {
      gameId: args.gameId,
      links: [],
      resolving: false,
      priorityPlayerId: args.priorityPlayerId,
    });

    return chainId as string;
  },
});

/**
 * Adds a link to the chain.
 * Validates spell speed (must be >= previous link's spell speed, except Speed 1 can always start a chain).
 * Max 12 links.
 */
export const addToChain = mutation({
  args: {
    chainId: v.id("chainState"),
    cardId: v.string(),
    playerId: v.string(),
    effectId: v.string(),
    spellSpeed: v.number(),
    targets: v.array(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${args.chainId}`);
    }

    if (chain.resolving) {
      throw new Error("Cannot add to chain while resolving");
    }

    // Check max chain length
    if (chain.links.length >= MAX_CHAIN_LENGTH) {
      throw new Error(
        `Chain cannot exceed ${MAX_CHAIN_LENGTH} links (current: ${chain.links.length})`
      );
    }

    // Validate spell speed
    const currentLinks = chain.links;
    if (currentLinks.length > 0) {
      const lastLink = currentLinks[currentLinks.length - 1];
      if (!lastLink) {
        throw new Error("Invalid chain state: last link is undefined");
      }

      // Spell Speed rules:
      // - Speed 1 (Normal) can only be activated when chain is empty
      // - Speed 2 (Quick) can chain to Speed 1 or 2
      // - Speed 3 (Counter) can chain to any speed
      if (args.spellSpeed === 1) {
        throw new Error(
          "Spell Speed 1 effects cannot be chained to existing effects"
        );
      }

      if (args.spellSpeed < lastLink.spellSpeed) {
        throw new Error(
          `Spell Speed ${args.spellSpeed} cannot chain to Spell Speed ${lastLink.spellSpeed}`
        );
      }
    }

    // Add link to chain
    const newLink = {
      cardId: args.cardId,
      playerId: args.playerId,
      effectId: args.effectId,
      spellSpeed: args.spellSpeed,
      targets: args.targets,
      negated: false,
    };

    await ctx.db.patch(args.chainId, {
      links: [...currentLinks, newLink],
    });

    // Return 1-indexed position
    return currentLinks.length + 1;
  },
});

/**
 * Resolves chain in LIFO order.
 * Pops links one at a time from the end, returns the array of resolved links.
 * Marks the chain as resolving=true, then deletes the chainState when done.
 */
export const resolveChain = mutation({
  args: {
    chainId: v.id("chainState"),
  },
  returns: v.array(chainLinkValidator),
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${args.chainId}`);
    }

    // Mark as resolving
    await ctx.db.patch(args.chainId, { resolving: true });

    // Resolve in LIFO order (reverse)
    const resolvedLinks = [...chain.links].reverse();

    // Delete chain state after resolution
    await ctx.db.delete(args.chainId);

    return resolvedLinks;
  },
});

/**
 * Returns the current chain state for a game (unresolved).
 * Returns null if no active chain.
 */
export const getCurrentChain = query({
  args: {
    gameId: v.string(),
  },
  returns: v.union(chainStateValidator, v.null()),
  handler: async (ctx, args) => {
    const chain = await ctx.db
      .query("chainState")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!chain || chain.resolving) {
      return null;
    }

    return {
      ...chain,
      _id: chain._id as string,
    };
  },
});

/**
 * Switches priority to the other player.
 */
export const passPriority = mutation({
  args: {
    chainId: v.id("chainState"),
    nextPlayerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${args.chainId}`);
    }

    await ctx.db.patch(args.chainId, {
      priorityPlayerId: args.nextPlayerId,
    });

    return null;
  },
});

/**
 * Marks a specific chain link as negated.
 * Used by counter-trap effects.
 */
export const negateLink = mutation({
  args: {
    chainId: v.id("chainState"),
    chainPosition: v.number(), // 1-indexed
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chain = await ctx.db.get(args.chainId);
    if (!chain) {
      throw new Error(`Chain not found: ${args.chainId}`);
    }

    // Convert 1-indexed to 0-indexed
    const linkIndex = args.chainPosition - 1;

    if (linkIndex < 0 || linkIndex >= chain.links.length) {
      throw new Error(
        `Invalid chain position: ${args.chainPosition} (chain has ${chain.links.length} links)`
      );
    }

    // Update the specific link
    const updatedLinks = [...chain.links];
    const targetLink = updatedLinks[linkIndex];
    if (targetLink) {
      updatedLinks[linkIndex] = { ...targetLink, negated: true };
    }

    await ctx.db.patch(args.chainId, {
      links: updatedLinks,
    });

    return null;
  },
});
