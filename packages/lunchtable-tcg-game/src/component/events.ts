import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record a game event.
 */
export const recordEvent = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    turnNumber: v.number(),
    eventType: v.string(),
    playerId: v.string(),
    playerUsername: v.string(),
    description: v.string(),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  },
  returns: v.id("gameEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("gameEvents", {
      lobbyId: args.lobbyId,
      gameId: args.gameId,
      turnNumber: args.turnNumber,
      eventType: args.eventType as any,
      playerId: args.playerId,
      playerUsername: args.playerUsername,
      description: args.description,
      metadata: args.metadata,
      timestamp: args.timestamp,
    });
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get events for a specific lobby, ordered by timestamp.
 */
export const getEventsForLobby = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    return await ctx.db
      .query("gameEvents")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .order("asc")
      .take(limit);
  },
});

/**
 * Get events for a specific game ID, ordered by timestamp.
 */
export const getEventsForGame = query({
  args: {
    gameId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;

    return await ctx.db
      .query("gameEvents")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .order("asc")
      .take(limit);
  },
});
