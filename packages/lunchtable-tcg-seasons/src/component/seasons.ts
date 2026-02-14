import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

const seasonStatusValidator = v.union(
  v.literal("upcoming"),
  v.literal("active"),
  v.literal("ended")
);

const rankResetTypeValidator = v.union(
  v.literal("full"),
  v.literal("soft"),
  v.literal("none")
);

const rewardTierValidator = v.object({
  tier: v.string(),
  minElo: v.number(),
  goldReward: v.number(),
  gemsReward: v.number(),
  cardPackReward: v.optional(v.number()),
  exclusiveCardId: v.optional(v.string()),
  titleReward: v.optional(v.string()),
});

// Queries
export const getActiveSeason = query({
  args: {},
  returns: v.any(), // Season doc or null
  handler: async (ctx) => {
    return await ctx.db.query("seasons").withIndex("by_status", (q) => q.eq("status", "active")).first();
  },
});

export const getSeasons = query({
  args: { status: v.optional(seasonStatusValidator) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db.query("seasons").withIndex("by_status", (q) => q.eq("status", args.status!)).collect();
    }
    return await ctx.db.query("seasons").collect();
  },
});

export const getSeason = query({
  args: { seasonId: v.id("seasons") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.seasonId);
  },
});

export const getSeasonByNumber = query({
  args: { number: v.number() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("seasons").withIndex("by_number", (q) => q.eq("number", args.number)).first();
  },
});

// Mutations
export const createSeason = mutation({
  args: {
    name: v.string(),
    number: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    description: v.optional(v.string()),
    rankResetType: rankResetTypeValidator,
    softResetPercentage: v.optional(v.number()),
    rewards: v.optional(v.array(rewardTierValidator)),
    createdBy: v.string(),
  },
  returns: v.id("seasons"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("seasons", {
      name: args.name,
      number: args.number,
      status: "upcoming",
      startDate: args.startDate,
      endDate: args.endDate,
      description: args.description,
      rankResetType: args.rankResetType,
      softResetPercentage: args.softResetPercentage,
      rewards: args.rewards ?? [],
      createdAt: now,
      createdBy: args.createdBy,
      updatedAt: now,
    });
  },
});

export const updateSeason = mutation({
  args: {
    seasonId: v.id("seasons"),
    name: v.optional(v.string()),
    status: v.optional(seasonStatusValidator),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    description: v.optional(v.string()),
    rankResetType: v.optional(rankResetTypeValidator),
    softResetPercentage: v.optional(v.number()),
    rewards: v.optional(v.array(rewardTierValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { seasonId, ...updates } = args;
    const filtered: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filtered[key] = value;
    }
    await ctx.db.patch(seasonId, filtered);
    return null;
  },
});

export const deleteSeason = mutation({
  args: { seasonId: v.id("seasons") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.seasonId);
    return null;
  },
});

// Snapshots
export const createSnapshot = mutation({
  args: {
    seasonId: v.id("seasons"),
    seasonNumber: v.number(),
    userId: v.string(),
    username: v.string(),
    finalElo: v.number(),
    tier: v.string(),
    rank: v.number(),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
  },
  returns: v.id("seasonSnapshots"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("seasonSnapshots", {
      ...args,
      rewardsDistributed: false,
      createdAt: Date.now(),
    });
  },
});

export const getSeasonSnapshots = query({
  args: {
    seasonId: v.id("seasons"),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const q = ctx.db.query("seasonSnapshots").withIndex("by_season", (q) => q.eq("seasonId", args.seasonId));
    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

export const markRewardsDistributed = mutation({
  args: { snapshotId: v.id("seasonSnapshots") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.snapshotId, { rewardsDistributed: true });
    return null;
  },
});

export const getUserSnapshots = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("seasonSnapshots").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
  },
});
