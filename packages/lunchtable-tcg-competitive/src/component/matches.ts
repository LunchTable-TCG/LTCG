import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const matchHistoryValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  winnerId: v.string(),
  loserId: v.string(),
  gameType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
  winnerRatingBefore: v.number(),
  winnerRatingAfter: v.number(),
  loserRatingBefore: v.number(),
  loserRatingAfter: v.number(),
  xpAwarded: v.optional(v.number()),
  completedAt: v.number(),
});

export const recordMatch = mutation({
  args: {
    winnerId: v.string(),
    loserId: v.string(),
    gameType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    winnerRatingBefore: v.number(),
    winnerRatingAfter: v.number(),
    loserRatingBefore: v.number(),
    loserRatingAfter: v.number(),
    xpAwarded: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const matchId = await ctx.db.insert("matchHistory", {
      winnerId: args.winnerId,
      loserId: args.loserId,
      gameType: args.gameType,
      winnerRatingBefore: args.winnerRatingBefore,
      winnerRatingAfter: args.winnerRatingAfter,
      loserRatingBefore: args.loserRatingBefore,
      loserRatingAfter: args.loserRatingAfter,
      xpAwarded: args.xpAwarded,
      completedAt: Date.now(),
    });

    return matchId as string;
  },
});

export const getPlayerMatches = query({
  args: {
    playerId: v.string(),
    gameType: v.optional(v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchHistoryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    // Get matches where player is either winner or loser
    const winnerMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_winner", (q) => q.eq("winnerId", args.playerId))
      .collect();

    const loserMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_loser", (q) => q.eq("loserId", args.playerId))
      .collect();

    let allMatches = [...winnerMatches, ...loserMatches];

    // Filter by game type if specified
    if (args.gameType) {
      allMatches = allMatches.filter((m) => m.gameType === args.gameType);
    }

    // Sort by completedAt descending and limit
    const matches = allMatches
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit);

    return matches.map((match) => ({
      ...match,
      _id: match._id as string,
    }));
  },
});

export const getRecentMatches = query({
  args: {
    gameType: v.optional(v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchHistoryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.gameType) {
      const gameType = args.gameType;
      const matches = await ctx.db
        .query("matchHistory")
        .withIndex("by_game_type", (q) => q.eq("gameType", gameType))
        .order("desc")
        .take(limit);

      return matches.map((match) => ({
        ...match,
        _id: match._id as string,
      }));
    }

    const matches = await ctx.db
      .query("matchHistory")
      .withIndex("by_completed")
      .order("desc")
      .take(limit);

    return matches.map((match) => ({
      ...match,
      _id: match._id as string,
    }));
  },
});

export const getHeadToHead = query({
  args: {
    playerId: v.string(),
    opponentId: v.string(),
    gameType: v.optional(v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"))),
  },
  returns: v.object({
    matches: v.array(matchHistoryValidator),
    wins: v.number(),
    losses: v.number(),
  }),
  handler: async (ctx, args) => {
    // Get matches where playerId won against opponentId
    const wonMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_winner", (q) => q.eq("winnerId", args.playerId))
      .filter((q) => q.eq(q.field("loserId"), args.opponentId))
      .collect();

    // Get matches where playerId lost to opponentId
    const lostMatches = await ctx.db
      .query("matchHistory")
      .withIndex("by_loser", (q) => q.eq("loserId", args.playerId))
      .filter((q) => q.eq(q.field("winnerId"), args.opponentId))
      .collect();

    let allMatches = [...wonMatches, ...lostMatches];

    // Filter by game type if specified
    if (args.gameType) {
      allMatches = allMatches.filter((m) => m.gameType === args.gameType);
    }

    // Sort by completedAt descending
    const matches = allMatches.sort((a, b) => b.completedAt - a.completedAt);

    const wins = wonMatches.length;
    const losses = lostMatches.length;

    return {
      matches: matches.map((match) => ({
        ...match,
        _id: match._id as string,
      })),
      wins,
      losses,
    };
  },
});
