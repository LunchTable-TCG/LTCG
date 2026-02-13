import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const matchHistoryValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  playerId: v.string(),
  opponentId: v.string(),
  opponentName: v.optional(v.string()),
  result: v.string(),
  ratingChange: v.optional(v.number()),
  gameMode: v.string(),
  gameId: v.optional(v.string()),
  timestamp: v.number(),
  metadata: v.optional(v.any()),
});

export const recordMatch = mutation({
  args: {
    winnerId: v.string(),
    loserId: v.string(),
    loserName: v.optional(v.string()),
    winnerName: v.optional(v.string()),
    winnerRatingChange: v.optional(v.number()),
    loserRatingChange: v.optional(v.number()),
    gameMode: v.string(),
    gameId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.object({
    winnerMatchId: v.string(),
    loserMatchId: v.string(),
  }),
  handler: async (ctx, args) => {
    const timestamp = Date.now();

    const winnerMatchId = await ctx.db.insert("matchHistory", {
      playerId: args.winnerId,
      opponentId: args.loserId,
      opponentName: args.loserName,
      result: "win",
      ratingChange: args.winnerRatingChange,
      gameMode: args.gameMode,
      gameId: args.gameId,
      timestamp,
      metadata: args.metadata,
    });

    const loserMatchId = await ctx.db.insert("matchHistory", {
      playerId: args.loserId,
      opponentId: args.winnerId,
      opponentName: args.winnerName,
      result: "loss",
      ratingChange: args.loserRatingChange,
      gameMode: args.gameMode,
      gameId: args.gameId,
      timestamp,
      metadata: args.metadata,
    });

    return {
      winnerMatchId: winnerMatchId as string,
      loserMatchId: loserMatchId as string,
    };
  },
});

export const getPlayerMatches = query({
  args: {
    playerId: v.string(),
    gameMode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchHistoryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let matchesQuery = ctx.db
      .query("matchHistory")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId));

    if (args.gameMode) {
      matchesQuery = ctx.db
        .query("matchHistory")
        .withIndex("by_player_mode", (q) =>
          q.eq("playerId", args.playerId).eq("gameMode", args.gameMode)
        );
    }

    const matches = await matchesQuery.order("desc").take(limit);

    return matches.map((match) => ({
      ...match,
      _id: match._id as string,
    }));
  },
});

export const getRecentMatches = query({
  args: {
    gameMode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(matchHistoryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const allMatches = await ctx.db
      .query("matchHistory")
      .order("desc")
      .collect();

    let matches = allMatches;

    if (args.gameMode) {
      matches = matches.filter((m) => m.gameMode === args.gameMode);
    }

    const uniqueMatches = new Map<string, typeof allMatches[0]>();
    for (const match of matches) {
      const gameKey = match.gameId || `${match.playerId}-${match.opponentId}-${match.timestamp}`;
      if (!uniqueMatches.has(gameKey)) {
        uniqueMatches.set(gameKey, match);
      }
      if (uniqueMatches.size >= limit) break;
    }

    return Array.from(uniqueMatches.values()).map((match) => ({
      ...match,
      _id: match._id as string,
    }));
  },
});

export const getHeadToHead = query({
  args: {
    playerId: v.string(),
    opponentId: v.string(),
    gameMode: v.optional(v.string()),
  },
  returns: v.object({
    matches: v.array(matchHistoryValidator),
    wins: v.number(),
    losses: v.number(),
    draws: v.number(),
  }),
  handler: async (ctx, args) => {
    let matchesQuery = ctx.db
      .query("matchHistory")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("opponentId"), args.opponentId));

    if (args.gameMode) {
      matchesQuery = ctx.db
        .query("matchHistory")
        .withIndex("by_player_mode", (q) =>
          q.eq("playerId", args.playerId).eq("gameMode", args.gameMode)
        )
        .filter((q) => q.eq(q.field("opponentId"), args.opponentId));
    }

    const matches = await matchesQuery.order("desc").collect();

    const wins = matches.filter((m) => m.result === "win").length;
    const losses = matches.filter((m) => m.result === "loss").length;
    const draws = matches.filter((m) => m.result === "draw").length;

    return {
      matches: matches.map((match) => ({
        ...match,
        _id: match._id as string,
      })),
      wins,
      losses,
      draws,
    };
  },
});
