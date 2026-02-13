import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const playerMatchInfo = v.object({
  playerId: v.string(),
  deckId: v.string(),
  rating: v.number(),
});

const queueEntryReturn = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  playerId: v.string(),
  deckId: v.string(),
  rating: v.number(),
  joinedAt: v.number(),
  mode: v.string(),
  metadata: v.optional(v.any()),
});

export const joinQueue = mutation({
  args: {
    playerId: v.string(),
    deckId: v.string(),
    rating: v.number(),
    mode: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .unique();

    if (existing) {
      throw new Error(`Player ${args.playerId} is already in the queue`);
    }

    const id = await ctx.db.insert("matchmakingQueue", {
      playerId: args.playerId,
      deckId: args.deckId,
      rating: args.rating,
      mode: args.mode,
      joinedAt: Date.now(),
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const leaveQueue = mutation({
  args: {
    playerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .unique();

    if (entry) {
      await ctx.db.delete(entry._id);
    }

    return null;
  },
});

export const findMatch = mutation({
  args: {
    mode: v.string(),
    ratingRange: v.number(),
  },
  returns: v.union(
    v.object({
      matched: v.literal(false),
    }),
    v.object({
      matched: v.literal(true),
      player1: playerMatchInfo,
      player2: playerMatchInfo,
    })
  ),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();

    if (entries.length < 2) {
      return { matched: false as const };
    }

    // Sort by joinedAt ascending (FIFO)
    entries.sort((a, b) => a.joinedAt - b.joinedAt);

    // Iterate pairs looking for compatible rating
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const ratingDiff = Math.abs(entries[i].rating - entries[j].rating);
        if (ratingDiff <= args.ratingRange) {
          const p1 = entries[i];
          const p2 = entries[j];

          // Remove both from queue
          await ctx.db.delete(p1._id);
          await ctx.db.delete(p2._id);

          return {
            matched: true as const,
            player1: {
              playerId: p1.playerId,
              deckId: p1.deckId,
              rating: p1.rating,
            },
            player2: {
              playerId: p2.playerId,
              deckId: p2.deckId,
              rating: p2.rating,
            },
          };
        }
      }
    }

    return { matched: false as const };
  },
});

export const getQueueStatus = query({
  args: {
    mode: v.string(),
  },
  returns: v.object({
    count: v.number(),
    oldestWaitMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();

    if (entries.length === 0) {
      return { count: 0, oldestWaitMs: 0 };
    }

    const oldestJoinedAt = Math.min(...entries.map((e) => e.joinedAt));
    const oldestWaitMs = Date.now() - oldestJoinedAt;

    return {
      count: entries.length,
      oldestWaitMs,
    };
  },
});

export const getPlayerQueueEntry = query({
  args: {
    playerId: v.string(),
  },
  returns: v.union(queueEntryReturn, v.null()),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .unique();

    if (!entry) return null;

    return {
      ...entry,
      _id: entry._id as string,
    };
  },
});
