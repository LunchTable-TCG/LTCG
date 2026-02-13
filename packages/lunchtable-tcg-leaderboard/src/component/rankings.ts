import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const leaderboardEntryValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  boardId: v.string(),
  playerId: v.string(),
  playerName: v.optional(v.string()),
  score: v.number(),
  rank: v.optional(v.number()),
  wins: v.optional(v.number()),
  losses: v.optional(v.number()),
  streak: v.optional(v.number()),
  rating: v.optional(v.number()),
  lastUpdated: v.number(),
  metadata: v.optional(v.any()),
});

export const submitScore = mutation({
  args: {
    boardId: v.string(),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    score: v.number(),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    streak: v.optional(v.number()),
    rating: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_player", (q) =>
        q.eq("boardId", args.boardId).eq("playerId", args.playerId)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        playerName: args.playerName ?? existing.playerName,
        wins: args.wins ?? existing.wins,
        losses: args.losses ?? existing.losses,
        streak: args.streak ?? existing.streak,
        rating: args.rating ?? existing.rating,
        lastUpdated: now,
        metadata: args.metadata ?? existing.metadata,
      });
      return existing._id as string;
    }

    const id = await ctx.db.insert("leaderboardEntries", {
      boardId: args.boardId,
      playerId: args.playerId,
      playerName: args.playerName,
      score: args.score,
      wins: args.wins,
      losses: args.losses,
      streak: args.streak,
      rating: args.rating,
      lastUpdated: now,
      metadata: args.metadata,
    });
    return id as string;
  },
});

export const getTopPlayers = query({
  args: {
    boardId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_score", (q) => q.eq("boardId", args.boardId))
      .order("desc")
      .take(limit);

    return entries.map((entry, index) => ({
      ...entry,
      _id: entry._id as string,
      rank: index + 1,
    }));
  },
});

export const getPlayerRank = query({
  args: {
    boardId: v.string(),
    playerId: v.string(),
  },
  returns: v.union(leaderboardEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_player", (q) =>
        q.eq("boardId", args.boardId).eq("playerId", args.playerId)
      )
      .unique();

    if (!entry) return null;

    const higherScores = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_score", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.gt(q.field("score"), entry.score))
      .collect();

    const rank = higherScores.length + 1;

    return {
      ...entry,
      _id: entry._id as string,
      rank,
    };
  },
});

export const getAroundPlayer = query({
  args: {
    boardId: v.string(),
    playerId: v.string(),
    range: v.optional(v.number()),
  },
  returns: v.object({
    player: v.union(leaderboardEntryValidator, v.null()),
    above: v.array(leaderboardEntryValidator),
    below: v.array(leaderboardEntryValidator),
  }),
  handler: async (ctx, args) => {
    const range = args.range ?? 5;

    const entry = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_player", (q) =>
        q.eq("boardId", args.boardId).eq("playerId", args.playerId)
      )
      .unique();

    if (!entry) {
      return { player: null, above: [], below: [] };
    }

    const higherScores = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_score", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.gt(q.field("score"), entry.score))
      .order("desc")
      .take(range);

    const lowerScores = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board_score", (q) => q.eq("boardId", args.boardId))
      .filter((q) => q.lt(q.field("score"), entry.score))
      .order("desc")
      .take(range);

    const playerRank = higherScores.length + 1;

    return {
      player: {
        ...entry,
        _id: entry._id as string,
        rank: playerRank,
      },
      above: higherScores.reverse().map((e, i) => ({
        ...e,
        _id: e._id as string,
        rank: playerRank - higherScores.length + i,
      })),
      below: lowerScores.map((e, i) => ({
        ...e,
        _id: e._id as string,
        rank: playerRank + i + 1,
      })),
    };
  },
});

export const getByCategory = query({
  args: {
    boardId: v.string(),
  },
  returns: v.array(leaderboardEntryValidator),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    return entries
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        _id: entry._id as string,
        rank: index + 1,
      }));
  },
});

export const resetCategory = mutation({
  args: {
    boardId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("leaderboardEntries")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }

    return entries.length;
  },
});
