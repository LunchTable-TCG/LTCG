import { v } from "convex/values";
import { query } from "./_generated/server";

const rankingEntryValidator = v.object({
  userId: v.string(),
  username: v.string(),
  rank: v.number(),
  rating: v.number(),
  level: v.optional(v.number()),
  wins: v.number(),
  losses: v.number(),
  winRate: v.number(),
  isAiAgent: v.boolean(),
});

const leaderboardValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
  playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),
  rankings: v.array(rankingEntryValidator),
  lastUpdated: v.number(),
});

export const getTopPlayers = query({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.optional(v.union(v.literal("all"), v.literal("humans"), v.literal("ai"))),
    limit: v.optional(v.number()),
  },
  returns: v.array(rankingEntryValidator),
  handler: async (ctx, args) => {
    const segment = args.playerSegment ?? "all";
    const limit = args.limit ?? 100;

    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", segment)
      )
      .first();

    if (!snapshot) return [];

    return snapshot.rankings.slice(0, limit);
  },
});

export const getPlayerRank = query({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerId: v.string(),
    playerSegment: v.optional(v.union(v.literal("all"), v.literal("humans"), v.literal("ai"))),
  },
  returns: v.union(rankingEntryValidator, v.null()),
  handler: async (ctx, args) => {
    const segment = args.playerSegment ?? "all";

    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", segment)
      )
      .first();

    if (!snapshot) return null;

    const playerEntry = snapshot.rankings.find((r) => r.userId === args.playerId);
    return playerEntry ?? null;
  },
});

export const getAroundPlayer = query({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerId: v.string(),
    playerSegment: v.optional(v.union(v.literal("all"), v.literal("humans"), v.literal("ai"))),
    range: v.optional(v.number()),
  },
  returns: v.object({
    player: v.union(rankingEntryValidator, v.null()),
    above: v.array(rankingEntryValidator),
    below: v.array(rankingEntryValidator),
  }),
  handler: async (ctx, args) => {
    const segment = args.playerSegment ?? "all";
    const range = args.range ?? 5;

    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", segment)
      )
      .first();

    if (!snapshot) {
      return { player: null, above: [], below: [] };
    }

    const playerIndex = snapshot.rankings.findIndex((r) => r.userId === args.playerId);

    if (playerIndex === -1) {
      return { player: null, above: [], below: [] };
    }

    const player = snapshot.rankings[playerIndex];
    const above = snapshot.rankings.slice(Math.max(0, playerIndex - range), playerIndex);
    const below = snapshot.rankings.slice(playerIndex + 1, playerIndex + 1 + range);

    return {
      player,
      above,
      below,
    };
  },
});

export const getLeaderboard = query({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.optional(v.union(v.literal("all"), v.literal("humans"), v.literal("ai"))),
  },
  returns: v.union(leaderboardValidator, v.null()),
  handler: async (ctx, args) => {
    const segment = args.playerSegment ?? "all";

    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", segment)
      )
      .first();

    if (!snapshot) return null;

    return {
      ...snapshot,
      _id: snapshot._id as string,
    };
  },
});
