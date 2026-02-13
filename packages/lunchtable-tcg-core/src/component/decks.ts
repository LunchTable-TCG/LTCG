import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    cards: v.array(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.id("decks"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("decks", {
      ownerId: args.ownerId,
      name: args.name,
      cards: args.cards,
      isActive: false,
      metadata: args.metadata,
    });
  },
});

export const getForPlayer = query({
  args: {
    ownerId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("decks"),
      _creationTime: v.number(),
      ownerId: v.string(),
      name: v.string(),
      cards: v.array(v.string()),
      isActive: v.boolean(),
      metadata: v.optional(v.any()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const getById = query({
  args: {
    id: v.id("decks"),
  },
  returns: v.union(
    v.object({
      _id: v.id("decks"),
      _creationTime: v.number(),
      ownerId: v.string(),
      name: v.string(),
      cards: v.array(v.string()),
      isActive: v.boolean(),
      metadata: v.optional(v.any()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
    name: v.optional(v.string()),
    cards: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.ownerId !== args.ownerId) {
      throw new Error("Not authorized to update this deck");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.cards !== undefined) updates.cards = args.cards;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

export const remove = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.ownerId !== args.ownerId) {
      throw new Error("Not authorized to delete this deck");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const setActive = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.ownerId !== args.ownerId) {
      throw new Error("Not authorized to modify this deck");
    }

    // Deactivate all decks for this owner
    const ownerDecks = await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    for (const d of ownerDecks) {
      if (d.isActive) {
        await ctx.db.patch(d._id, { isActive: false });
      }
    }

    // Activate the target deck
    await ctx.db.patch(args.id, { isActive: true });
    return null;
  },
});

export const validate = query({
  args: {
    id: v.id("decks"),
    rules: v.object({
      minCards: v.number(),
      maxCards: v.number(),
      maxCopies: v.number(),
      maxLegendaryCopies: v.optional(v.number()),
    }),
  },
  returns: v.object({
    valid: v.boolean(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) {
      return { valid: false, errors: ["Deck not found"] };
    }

    const errors: string[] = [];
    const { minCards, maxCards, maxCopies, maxLegendaryCopies } = args.rules;

    if (deck.cards.length < minCards) {
      errors.push(
        `Deck has ${deck.cards.length} cards, minimum is ${minCards}`
      );
    }
    if (deck.cards.length > maxCards) {
      errors.push(
        `Deck has ${deck.cards.length} cards, maximum is ${maxCards}`
      );
    }

    // Count copies of each card
    const cardCounts = new Map<string, number>();
    for (const cardId of deck.cards) {
      cardCounts.set(cardId, (cardCounts.get(cardId) ?? 0) + 1);
    }

    // Check max copies per card
    for (const [cardId, count] of cardCounts) {
      if (count > maxCopies) {
        errors.push(
          `Card "${cardId}" appears ${count} times, maximum is ${maxCopies}`
        );
      }
    }

    // Check legendary copy limits if rule is set
    if (maxLegendaryCopies !== undefined) {
      for (const [cardId, count] of cardCounts) {
        const cardDef = await ctx.db
          .query("cardDefinitions")
          .withIndex("by_name", (q) => q.eq("name", cardId))
          .first();

        if (cardDef && cardDef.rarity === "legendary" && count > maxLegendaryCopies) {
          errors.push(
            `Legendary card "${cardId}" appears ${count} times, maximum is ${maxLegendaryCopies}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
    newName: v.string(),
  },
  returns: v.id("decks"),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) {
      throw new Error("Deck not found");
    }
    if (deck.ownerId !== args.ownerId) {
      throw new Error("Not authorized to duplicate this deck");
    }

    return await ctx.db.insert("decks", {
      ownerId: args.ownerId,
      name: args.newName,
      cards: [...deck.cards],
      isActive: false,
      metadata: deck.metadata,
    });
  },
});
