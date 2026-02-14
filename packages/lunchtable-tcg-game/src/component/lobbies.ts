import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new game lobby.
 */
export const createLobby = mutation({
  args: {
    hostId: v.string(),
    hostUsername: v.string(),
    hostRank: v.string(),
    hostRating: v.number(),
    deckArchetype: v.string(),
    mode: v.string(),
    isPrivate: v.boolean(),
    joinCode: v.optional(v.string()),
    maxRatingDiff: v.optional(v.number()),
    stageId: v.optional(v.string()),
    allowSpectators: v.optional(v.boolean()),
    maxSpectators: v.optional(v.number()),
    wagerAmount: v.optional(v.number()),
    cryptoWagerCurrency: v.optional(v.string()),
    cryptoWagerTier: v.optional(v.number()),
    cryptoEscrowPda: v.optional(v.string()),
    cryptoHostWallet: v.optional(v.string()),
  },
  returns: v.id("gameLobbies"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameLobbies", {
      hostId: args.hostId,
      hostUsername: args.hostUsername,
      hostRank: args.hostRank,
      hostRating: args.hostRating,
      deckArchetype: args.deckArchetype,
      mode: args.mode,
      status: "waiting",
      isPrivate: args.isPrivate,
      joinCode: args.joinCode,
      maxRatingDiff: args.maxRatingDiff,
      stageId: args.stageId,
      spectatorCount: 0,
      allowSpectators: args.allowSpectators ?? true,
      maxSpectators: args.maxSpectators ?? 100,
      wagerAmount: args.wagerAmount,
      cryptoWagerCurrency: args.cryptoWagerCurrency as any,
      cryptoWagerTier: args.cryptoWagerTier,
      cryptoEscrowPda: args.cryptoEscrowPda,
      cryptoHostWallet: args.cryptoHostWallet,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a game lobby with partial fields.
 */
export const updateLobby = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.lobbyId, args.updates);
    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a lobby by its ID.
 */
export const getLobby = query({
  args: { lobbyId: v.id("gameLobbies") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lobbyId);
  },
});

/**
 * Get a lobby by its join code.
 */
export const getLobbyByJoinCode = query({
  args: { joinCode: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameLobbies")
      .withIndex("by_join_code", (q) => q.eq("joinCode", args.joinCode))
      .first();
  },
});

/**
 * Get active lobbies (waiting or active).
 */
export const getActiveLobbies = query({
  args: {
    status: v.optional(v.string()),
    mode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.mode && args.status) {
      return await ctx.db
        .query("gameLobbies")
        .withIndex("by_mode_status", (q) =>
          q.eq("mode", args.mode!).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    if (args.status) {
      return await ctx.db
        .query("gameLobbies")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    // Default: return waiting lobbies
    return await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get lobbies hosted by a specific user.
 */
export const getLobbiesByHost = query({
  args: {
    hostId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", args.hostId))
      .order("desc")
      .take(limit);
  },
});
