import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const seasonReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  seasonId: v.string(),
  name: v.string(),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("upcoming"),
    v.literal("active"),
    v.literal("ended")
  ),
  totalTiers: v.number(),
  xpPerTier: v.number(),
  startDate: v.number(),
  endDate: v.number(),
  createdAt: v.number(),
  createdBy: v.string(),
  updatedAt: v.number(),
});

const rewardValidator = v.object({
  type: v.union(
    v.literal("gold"),
    v.literal("gems"),
    v.literal("xp"),
    v.literal("card"),
    v.literal("pack"),
    v.literal("title"),
    v.literal("avatar")
  ),
  amount: v.optional(v.number()),
  cardId: v.optional(v.string()),
  packProductId: v.optional(v.string()),
  titleName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});

const tierReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  battlePassId: v.string(),
  tier: v.number(),
  freeReward: v.optional(rewardValidator),
  premiumReward: v.optional(rewardValidator),
  isMilestone: v.boolean(),
});

const progressReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  battlePassId: v.string(),
  currentXP: v.number(),
  currentTier: v.number(),
  isPremium: v.boolean(),
  premiumPurchasedAt: v.optional(v.number()),
  claimedFreeTiers: v.array(v.number()),
  claimedPremiumTiers: v.array(v.number()),
  lastXPGainAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const createSeason = mutation({
  args: {
    seasonId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    totalTiers: v.number(),
    xpPerTier: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // End other active seasons
    const activeSeasons = await ctx.db
      .query("battlePassSeasons")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    for (const season of activeSeasons) {
      await ctx.db.patch(season._id, { status: "ended", updatedAt: Date.now() });
    }

    const now = Date.now();
    const id = await ctx.db.insert("battlePassSeasons", {
      seasonId: args.seasonId,
      name: args.name,
      description: args.description,
      status: "active",
      totalTiers: args.totalTiers,
      xpPerTier: args.xpPerTier,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: now,
      createdBy: args.createdBy,
      updatedAt: now,
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
      .withIndex("by_status", (q) => q.eq("status", "active"))
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
    battlePassId: v.string(),
    tier: v.number(),
    freeReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()),
        cardId: v.optional(v.string()),
        packProductId: v.optional(v.string()),
        titleName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
    premiumReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()),
        cardId: v.optional(v.string()),
        packProductId: v.optional(v.string()),
        titleName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
    isMilestone: v.boolean(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const seasonDoc = await ctx.db.get(args.battlePassId as any);
    if (!seasonDoc) {
      throw new Error(`Battle Pass season not found: ${args.battlePassId}`);
    }

    const id = await ctx.db.insert("battlePassTiers", {
      battlePassId: args.battlePassId as any,
      tier: args.tier,
      freeReward: args.freeReward,
      premiumReward: args.premiumReward,
      isMilestone: args.isMilestone,
    });

    return id as string;
  },
});

export const getTiers = query({
  args: {
    battlePassId: v.string(),
  },
  returns: v.array(tierReturnValidator),
  handler: async (ctx, args) => {
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", args.battlePassId as any))
      .collect();

    return tiers
      .sort((a, b) => a.tier - b.tier)
      .map((tier) => ({
        ...tier,
        _id: tier._id as string,
        battlePassId: tier.battlePassId as string,
      }));
  },
});

export const getPlayerProgress = query({
  args: {
    userId: v.string(),
    battlePassId: v.optional(v.string()),
  },
  returns: v.union(progressReturnValidator, v.null()),
  handler: async (ctx, args) => {
    let targetBattlePassId = args.battlePassId;

    if (!targetBattlePassId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();

      if (!currentSeason) return null;
      targetBattlePassId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) =>
        q.eq("userId", args.userId).eq("battlePassId", targetBattlePassId as any)
      )
      .unique();

    if (!progress) return null;

    return {
      ...progress,
      _id: progress._id as string,
      battlePassId: progress.battlePassId as string,
    };
  },
});

export const addXP = mutation({
  args: {
    userId: v.string(),
    battlePassId: v.optional(v.string()),
    amount: v.number(),
  },
  returns: v.object({
    currentTier: v.number(),
    currentXP: v.number(),
    tierUps: v.number(),
  }),
  handler: async (ctx, args) => {
    let targetBattlePassId = args.battlePassId;

    if (!targetBattlePassId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();

      if (!currentSeason) {
        throw new Error("No active battle pass season found");
      }
      targetBattlePassId = currentSeason._id as string;
    }

    // Get the battle pass season to get xpPerTier
    const battlePassDoc = await ctx.db.get(targetBattlePassId as any);
    if (!battlePassDoc) {
      throw new Error(`Battle pass season not found: ${targetBattlePassId}`);
    }
    // Cast to access battlePassSeasons-specific fields
    const battlePass = battlePassDoc as any;

    let progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) =>
        q.eq("userId", args.userId).eq("battlePassId", targetBattlePassId as any)
      )
      .unique();

    const now = Date.now();

    if (!progress) {
      // Initialize progress for this battle pass
      const newXP = args.amount;
      const currentTier = Math.floor(newXP / (battlePass.xpPerTier as number));

      const id = await ctx.db.insert("battlePassProgress", {
        userId: args.userId,
        battlePassId: targetBattlePassId as any,
        currentXP: newXP,
        currentTier: Math.min(currentTier, battlePass.totalTiers as number),
        isPremium: false,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
        lastXPGainAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return {
        currentTier: Math.min(currentTier, battlePass.totalTiers as number),
        currentXP: newXP,
        tierUps: currentTier,
      };
    }

    const newXP = progress.currentXP + args.amount;
    const oldTier = progress.currentTier;
    const newTier = Math.min(Math.floor(newXP / (battlePass.xpPerTier as number)), battlePass.totalTiers as number);
    const tierUps = newTier - oldTier;

    await ctx.db.patch(progress._id, {
      currentXP: newXP,
      currentTier: newTier,
      lastXPGainAt: now,
      updatedAt: now,
    });

    return {
      currentTier: newTier,
      currentXP: newXP,
      tierUps,
    };
  },
});

export const claimTier = mutation({
  args: {
    userId: v.string(),
    battlePassId: v.optional(v.string()),
    tier: v.number(),
    isPremium: v.boolean(),
  },
  returns: v.union(
    v.object({
      success: v.boolean(),
      freeReward: v.optional(
        v.object({
          type: v.union(
            v.literal("gold"),
            v.literal("gems"),
            v.literal("xp"),
            v.literal("card"),
            v.literal("pack"),
            v.literal("title"),
            v.literal("avatar")
          ),
          amount: v.optional(v.number()),
          cardId: v.optional(v.string()),
          packProductId: v.optional(v.string()),
          titleName: v.optional(v.string()),
          avatarUrl: v.optional(v.string()),
        })
      ),
      premiumReward: v.optional(
        v.object({
          type: v.union(
            v.literal("gold"),
            v.literal("gems"),
            v.literal("xp"),
            v.literal("card"),
            v.literal("pack"),
            v.literal("title"),
            v.literal("avatar")
          ),
          amount: v.optional(v.number()),
          cardId: v.optional(v.string()),
          packProductId: v.optional(v.string()),
          titleName: v.optional(v.string()),
          avatarUrl: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    let targetBattlePassId = args.battlePassId;

    if (!targetBattlePassId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();

      if (!currentSeason) {
        throw new Error("No active battle pass season found");
      }
      targetBattlePassId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) =>
        q.eq("userId", args.userId).eq("battlePassId", targetBattlePassId as any)
      )
      .unique();

    if (!progress) {
      throw new Error("Player has no battle pass progress");
    }

    if (progress.currentTier < args.tier) {
      throw new Error("Tier not yet reached");
    }

    // Check if already claimed
    if (args.isPremium) {
      if (!progress.isPremium) {
        throw new Error("Player does not have premium battle pass");
      }
      if (progress.claimedPremiumTiers.includes(args.tier)) {
        return null;
      }
    } else {
      if (progress.claimedFreeTiers.includes(args.tier)) {
        return null;
      }
    }

    const tierDef = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass_tier", (q) =>
        q.eq("battlePassId", targetBattlePassId as any).eq("tier", args.tier)
      )
      .unique();

    if (!tierDef) {
      throw new Error(`Tier ${args.tier} not found in battle pass ${targetBattlePassId}`);
    }

    // Update claimed tiers
    if (args.isPremium) {
      await ctx.db.patch(progress._id, {
        claimedPremiumTiers: [...progress.claimedPremiumTiers, args.tier],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(progress._id, {
        claimedFreeTiers: [...progress.claimedFreeTiers, args.tier],
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      freeReward: tierDef.freeReward,
      premiumReward: args.isPremium ? tierDef.premiumReward : undefined,
    };
  },
});

export const upgradeToPremium = mutation({
  args: {
    userId: v.string(),
    battlePassId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let targetBattlePassId = args.battlePassId;

    if (!targetBattlePassId) {
      const currentSeason = await ctx.db
        .query("battlePassSeasons")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .first();

      if (!currentSeason) {
        throw new Error("No active battle pass season found");
      }
      targetBattlePassId = currentSeason._id as string;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) =>
        q.eq("userId", args.userId).eq("battlePassId", targetBattlePassId as any)
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
      premiumPurchasedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return null;
  },
});
