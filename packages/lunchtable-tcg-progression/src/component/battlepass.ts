import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const seasonReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  isActive: v.boolean(),
  totalTiers: v.number(),
  premiumPrice: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

const tierReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  seasonId: v.string(),
  tier: v.number(),
  xpRequired: v.number(),
  freeReward: v.optional(v.any()),
  premiumReward: v.optional(v.any()),
  metadata: v.optional(v.any()),
});

const progressReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  seasonId: v.string(),
  currentTier: v.number(),
  currentXP: v.number(),
  isPremium: v.boolean(),
  claimedTiers: v.array(v.number()),
  metadata: v.optional(v.any()),
});

export const createSeason = mutation({
  args: {
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    totalTiers: v.number(),
    premiumPrice: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Deactivate other active seasons
    const activeSeasons = await ctx.db
      .query("battlePassSeasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const season of activeSeasons) {
      await ctx.db.patch(season._id, { isActive: false });
    }

    const id = await ctx.db.insert("battlePassSeasons", {
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      isActive: true,
      totalTiers: args.totalTiers,
      premiumPrice: args.premiumPrice,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getCurrentSeason = query({
  args: {},
  returns: v.union(seasonReturnValidator, v.null()),
  handler: async (ctx) => {
    const season = await ctx.db
      .query("battlePassSeasons")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    if (!season) return null;

    return {
      ...season,
      _id: season._id as string,
    };
  },
});

export const defineTier = mutation({
  args: {
    seasonId: v.string(),
    tier: v.number(),
    xpRequired: v.number(),
    freeReward: v.optional(v.any()),
    premiumReward: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const season = await ctx.db.get(args.seasonId as any);
    if (!season) {
      throw new Error(`Season not found: ${args.seasonId}`);
    }

    const id = await ctx.db.insert("battlePassTiers", {
      seasonId: args.seasonId as any,
      tier: args.tier,
      xpRequired: args.xpRequired,
      freeReward: args.freeReward,
      premiumReward: args.premiumReward,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getTiers = query({
  args: {
    seasonId: v.string(),
  },
  returns: v.array(tierReturnValidator),
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_season", (q) => q.eq("seasonId", args.seasonId as any))
      .collect();

    return tiers
      .sort((a, b) => a.tier - b.tier)
      .map((tier) => ({
        ...tier,
        _id: tier._id as string,
        seasonId: tier.seasonId as string,
      }));
  },
});

export const getPlayerProgress = query({
  args: {
    userId: v.string(),
    seasonId: v.optional(v.string()),
  },
  returns: v.union(progressReturnValidator, v.null()),
  handler: async (ctx, args) => {
    let targetSeasonId = args.seasonId;

    if (!targetSeasonId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .first();

      if (!currentSeason) return null;
      targetSeasonId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", args.userId).eq("seasonId", targetSeasonId as any)
      )
      .unique();

    if (!progress) return null;

    return {
      ...progress,
      _id: progress._id as string,
      seasonId: progress.seasonId as string,
    };
  },
});

export const addXP = mutation({
  args: {
    userId: v.string(),
    seasonId: v.optional(v.string()),
    amount: v.number(),
  },
  returns: v.object({
    currentTier: v.number(),
    currentXP: v.number(),
    tierUps: v.number(),
  }),
  handler: async (ctx, args) => {
    let targetSeasonId = args.seasonId;

    if (!targetSeasonId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .first();

      if (!currentSeason) {
        throw new Error("No active season found");
      }
      targetSeasonId = currentSeason._id as string;
    }

    let progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", args.userId).eq("seasonId", targetSeasonId as any)
      )
      .unique();

    if (!progress) {
      // Initialize progress for this season
      const id = await ctx.db.insert("battlePassProgress", {
        userId: args.userId,
        seasonId: targetSeasonId as any,
        currentTier: 0,
        currentXP: args.amount,
        isPremium: false,
        claimedTiers: [],
      });

      return {
        currentTier: 0,
        currentXP: args.amount,
        tierUps: 0,
      };
    }

    const newXP = progress.currentXP + args.amount;
    let currentTier = progress.currentTier;
    let tierUps = 0;

    // Get all tiers for this season
    const allTiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_season", (q) => q.eq("seasonId", targetSeasonId as any))
      .collect();

    const sortedTiers = allTiers.sort((a, b) => a.tier - b.tier);

    // Calculate tier ups
    for (const tier of sortedTiers) {
      if (tier.tier <= currentTier) continue;
      if (newXP >= tier.xpRequired) {
        currentTier = tier.tier;
        tierUps++;
      } else {
        break;
      }
    }

    await ctx.db.patch(progress._id, {
      currentXP: newXP,
      currentTier,
    });

    return {
      currentTier,
      currentXP: newXP,
      tierUps,
    };
  },
});

export const claimTier = mutation({
  args: {
    userId: v.string(),
    seasonId: v.optional(v.string()),
    tier: v.number(),
  },
  returns: v.union(
    v.object({
      success: v.boolean(),
      reward: v.any(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    let targetSeasonId = args.seasonId;

    if (!targetSeasonId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .first();

      if (!currentSeason) {
        throw new Error("No active season found");
      }
      targetSeasonId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", args.userId).eq("seasonId", targetSeasonId as any)
      )
      .unique();

    if (!progress) {
      throw new Error("Player has no battle pass progress");
    }

    if (progress.currentTier < args.tier) {
      throw new Error("Tier not yet reached");
    }

    if (progress.claimedTiers.includes(args.tier)) {
      return { success: false, reward: null };
    }

    const tierDef = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_season_tier", (q) =>
        q.eq("seasonId", targetSeasonId as any).eq("tier", args.tier)
      )
      .unique();

    if (!tierDef) {
      throw new Error(`Tier ${args.tier} not found in season ${targetSeasonId}`);
    }

    const reward = progress.isPremium
      ? tierDef.premiumReward || tierDef.freeReward
      : tierDef.freeReward;

    await ctx.db.patch(progress._id, {
      claimedTiers: [...progress.claimedTiers, args.tier],
    });

    return {
      success: true,
      reward,
    };
  },
});

export const upgradeToPremium = mutation({
  args: {
    userId: v.string(),
    seasonId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let targetSeasonId = args.seasonId;

    if (!targetSeasonId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .first();

      if (!currentSeason) {
        throw new Error("No active season found");
      }
      targetSeasonId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", args.userId).eq("seasonId", targetSeasonId as any)
      )
      .unique();

    if (!progress) {
      throw new Error("Player has no battle pass progress");
    }

    if (progress.isPremium) {
      // Already premium
      return null;
    }

    await ctx.db.patch(progress._id, {
      isPremium: true,
    });

    return null;
  },
});
