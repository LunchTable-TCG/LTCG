import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new game state.
 */
export const createGameState = mutation({
  args: {
    state: v.any(),
  },
  returns: v.id("gameStates"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameStates", args.state);
  },
});

/**
 * Update an existing game state with partial fields.
 */
export const updateGameState = mutation({
  args: {
    stateId: v.id("gameStates"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stateId, args.updates);
    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a game state by its ID.
 */
export const getGameState = query({
  args: { stateId: v.id("gameStates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stateId);
  },
});

/**
 * Get a game state by lobby ID.
 */
export const getGameStateByLobby = query({
  args: { lobbyId: v.id("gameLobbies") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();
  },
});
