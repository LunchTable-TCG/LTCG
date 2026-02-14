import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a player to the matchmaking queue.
 */
export const joinQueue = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    rating: v.number(),
    deckArchetype: v.string(),
    mode: v.string(),
  },
  returns: v.id("matchmakingQueue"),
  handler: async (ctx, args) => {
    // Remove existing entry if any
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return await ctx.db.insert("matchmakingQueue", {
      userId: args.userId,
      username: args.username,
      rating: args.rating,
      deckArchetype: args.deckArchetype,
      mode: args.mode,
      joinedAt: Date.now(),
    });
  },
});

/**
 * Remove a player from the matchmaking queue.
 */
export const leaveQueue = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (entry) {
      await ctx.db.delete(entry._id);
    }

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all entries in the matchmaking queue (optionally filtered by mode).
 */
export const getQueueEntries = query({
  args: {
    mode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.mode) {
      return await ctx.db
        .query("matchmakingQueue")
        .withIndex("by_mode_rating", (q) => q.eq("mode", args.mode!))
        .order("asc")
        .take(limit);
    }

    return await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_rating")
      .order("asc")
      .take(limit);
  },
});

/**
 * Get a specific player's queue entry.
 */
export const getQueueEntry = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});
