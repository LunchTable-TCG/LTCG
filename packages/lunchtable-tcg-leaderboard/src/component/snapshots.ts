import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

const snapshotValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
  playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),
  rankings: v.array(rankingEntryValidator),
  lastUpdated: v.number(),
});

export const createSnapshot = mutation({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),
    rankings: v.array(rankingEntryValidator),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if snapshot already exists and update, or create new
    const existing = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", args.playerSegment)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rankings: args.rankings,
        lastUpdated: Date.now(),
      });
      return existing._id as string;
    }

    const id = await ctx.db.insert("leaderboardSnapshots", {
      leaderboardType: args.leaderboardType,
      playerSegment: args.playerSegment,
      rankings: args.rankings,
      lastUpdated: Date.now(),
    });

    return id as string;
  },
});

export const getSnapshots = query({
  args: {
    leaderboardType: v.optional(v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"))),
    playerSegment: v.optional(v.union(v.literal("all"), v.literal("humans"), v.literal("ai"))),
  },
  returns: v.array(snapshotValidator),
  handler: async (ctx, args) => {
    let snapshots = await ctx.db.query("leaderboardSnapshots").collect();

    // Filter by leaderboardType if specified
    if (args.leaderboardType) {
      snapshots = snapshots.filter((s) => s.leaderboardType === args.leaderboardType);
    }

    // Filter by playerSegment if specified
    if (args.playerSegment) {
      snapshots = snapshots.filter((s) => s.playerSegment === args.playerSegment);
    }

    return snapshots
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .map((snapshot) => ({
        ...snapshot,
        _id: snapshot._id as string,
      }));
  },
});

export const getSnapshotById = query({
  args: {
    id: v.id("leaderboardSnapshots"),
  },
  returns: v.union(snapshotValidator, v.null()),
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.id);
    if (!snapshot) return null;
    return {
      ...snapshot,
      _id: snapshot._id as string,
    };
  },
});

export const getSnapshot = query({
  args: {
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),
  },
  returns: v.union(snapshotValidator, v.null()),
  handler: async (ctx, args) => {
    const snapshot = await ctx.db
      .query("leaderboardSnapshots")
      .withIndex("by_leaderboard", (q) =>
        q.eq("leaderboardType", args.leaderboardType).eq("playerSegment", args.playerSegment)
      )
      .first();

    if (!snapshot) return null;

    return {
      ...snapshot,
      _id: snapshot._id as string,
    };
  },
});
