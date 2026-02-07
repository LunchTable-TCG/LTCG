/**
 * Battle Pass System
 *
 * Manages battle pass progression, tier rewards, and premium pass purchases.
 * Integrates with the existing XP system to grant battle pass XP alongside player XP.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  battlePassProgressValidator,
  battlePassStatusValidator,
  battlePassTierValidator,
  claimBattlePassRewardValidator,
} from "../lib/returnValidators";
import { addXP } from "../lib/xpHelpers";

// ============================================================================
// Types
// ============================================================================

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: Id<"cardDefinitions">;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Check if user has an active Stripe subscription
 */
async function hasActiveSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  return subscription !== null;
}

/**
 * Get the currently active battle pass
 */
async function getActiveBattlePass(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("battlePassSeasons")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .first();
}

/**
 * Get or create user's battle pass progress
 */
async function getOrCreateBattlePassProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  battlePassId: Id<"battlePassSeasons">
): Promise<Doc<"battlePassProgress">> {
  const existing = await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user_battlepass", (q) => q.eq("userId", userId).eq("battlePassId", battlePassId))
    .first();

  if (existing) return existing;

  // Create new progress record
  const now = Date.now();
  const progressId = await ctx.db.insert("battlePassProgress", {
    userId,
    battlePassId,
    currentXP: 0,
    currentTier: 0,
    isPremium: false,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    createdAt: now,
    updatedAt: now,
  });

  const newProgress = await ctx.db.get(progressId);
  if (!newProgress) {
    throw createError(ErrorCode.LIBRARY_XP_CREATION_FAILED, { userId });
  }
  return newProgress;
}

/**
 * Get user's battle pass progress (read-only)
 */
async function getBattlePassProgress(
  ctx: QueryCtx,
  userId: Id<"users">,
  battlePassId: Id<"battlePassSeasons">
) {
  return await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user_battlepass", (q) => q.eq("userId", userId).eq("battlePassId", battlePassId))
    .first();
}

/**
 * Calculate tier from XP
 */
function calculateTierFromXP(xp: number, xpPerTier: number, maxTiers: number) {
  if (xpPerTier <= 0) return 0;
  return Math.min(Math.floor(xp / xpPerTier), maxTiers);
}

/**
 * Grant a battle pass reward to the user
 */
async function grantReward(
  ctx: MutationCtx,
  userId: Id<"users">,
  reward: BattlePassReward,
  tier: number,
  isPremium: boolean
) {
  const trackType = isPremium ? "Premium" : "Free";
  const description = `Battle Pass Tier ${tier} (${trackType})`;

  switch (reward.type) {
    case "gold":
      if (reward.amount && reward.amount > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId,
          goldDelta: reward.amount,
          transactionType: "reward",
          description,
          metadata: { tier, isPremium },
        });
      }
      break;

    case "gems":
      if (reward.amount && reward.amount > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId,
          gemsDelta: reward.amount,
          transactionType: "reward",
          description,
          metadata: { tier, isPremium },
        });
      }
      break;

    case "xp":
      // Award player XP (uses playerXP table, not users.xp)
      if (reward.amount && reward.amount > 0) {
        await addXP(ctx, userId, reward.amount, {
          source: "battlepass_reward",
          skipBattlePass: true, // Prevent infinite loop
        });
      }
      break;

    case "card":
      if (reward.cardId) {
        // Add card to player's collection
        const cardId = reward.cardId;
        const existingCard = await ctx.db
          .query("playerCards")
          .withIndex("by_user_card", (q) => q.eq("userId", userId).eq("cardDefinitionId", cardId))
          .first();

        if (existingCard) {
          await ctx.db.patch(existingCard._id, {
            quantity: existingCard.quantity + 1,
            lastUpdatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("playerCards", {
            userId,
            cardDefinitionId: reward.cardId,
            quantity: 1,
            isFavorite: false,
            acquiredAt: Date.now(),
            lastUpdatedAt: Date.now(),
          });
        }
      }
      break;

    case "pack":
      // For pack rewards, we'll add them to the user's inbox to claim
      // This requires opening the pack which has randomness
      if (reward.packProductId && reward.amount) {
        await ctx.db.insert("userInbox", {
          userId,
          type: "reward",
          title: "Battle Pass Pack Reward",
          message: `You earned ${reward.amount} pack(s) from Battle Pass Tier ${tier}!`,
          data: {
            rewardType: "packs",
            packProductId: reward.packProductId,
            packCount: reward.amount,
            claimed: false,
          },
          isRead: false,
          createdAt: Date.now(),
        });
      }
      break;

    case "title":
      // Titles could be stored in a user_titles table or as badges
      if (reward.titleName) {
        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "milestone",
          badgeId: `battlepass_title_${reward.titleName.toLowerCase().replace(/\s+/g, "_")}`,
          displayName: reward.titleName,
          description: `Earned from Battle Pass Tier ${tier}`,
          earnedAt: Date.now(),
        });
      }
      break;

    case "avatar":
      // Avatar rewards could be stored in user preferences or a dedicated table
      // For now, we'll track it as a badge
      if (reward.avatarUrl) {
        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "milestone",
          badgeId: `battlepass_avatar_tier_${tier}`,
          displayName: `Battle Pass Avatar (Tier ${tier})`,
          description: "Exclusive avatar from Battle Pass",
          iconUrl: reward.avatarUrl,
          earnedAt: Date.now(),
        });
      }
      break;
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current battle pass status for the user
 */
export const getBattlePassStatus = query({
  args: {},
  returns: battlePassStatusValidator,
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      return null;
    }

    // Get user progress
    const progress = await getBattlePassProgress(ctx, userId, battlePass._id);

    // Get linked season info
    const season = await ctx.db.get(battlePass.seasonId);

    return {
      battlePassId: battlePass._id,
      seasonId: battlePass.seasonId,
      name: battlePass.name,
      description: battlePass.description,
      seasonName: season?.name,
      status: battlePass.status,
      totalTiers: battlePass.totalTiers,
      xpPerTier: battlePass.xpPerTier,
      // Note: premiumPrice and tokenPrice removed - premium access now via Stripe subscriptions
      startDate: battlePass.startDate,
      endDate: battlePass.endDate,
      // User progress
      currentXP: progress?.currentXP ?? 0,
      currentTier: progress?.currentTier ?? 0,
      isPremium: progress?.isPremium ?? false,
      claimedFreeTiers: progress?.claimedFreeTiers ?? [],
      claimedPremiumTiers: progress?.claimedPremiumTiers ?? [],
      // Calculate XP to next tier
      xpToNextTier:
        progress && progress.currentTier < battlePass.totalTiers
          ? battlePass.xpPerTier - (progress.currentXP % battlePass.xpPerTier)
          : 0,
      // Days remaining
      daysRemaining: Math.max(
        0,
        Math.ceil((battlePass.endDate - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    };
  },
});

/**
 * Get all tiers for the current battle pass
 */
export const getBattlePassTiers = query({
  args: {
    battlePassId: v.optional(v.id("battlePassSeasons")),
  },
  returns: v.array(battlePassTierValidator),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get battle pass (active one if not specified)
    let battlePassId = args.battlePassId;
    if (!battlePassId) {
      const activeBattlePass = await getActiveBattlePass(ctx);
      if (!activeBattlePass) return [];
      battlePassId = activeBattlePass._id;
    }

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) return [];

    // Get user progress
    const progress = await getBattlePassProgress(ctx, userId, battlePassId);

    // Get all tiers
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    // Sort by tier number
    tiers.sort((a, b) => a.tier - b.tier);

    // Enrich with user progress info
    return tiers.map((tier) => ({
      tier: tier.tier,
      freeReward: tier.freeReward,
      premiumReward: tier.premiumReward,
      isMilestone: tier.isMilestone,
      isUnlocked: progress ? progress.currentTier >= tier.tier : false,
      freeRewardClaimed: progress?.claimedFreeTiers.includes(tier.tier) ?? false,
      premiumRewardClaimed: progress?.claimedPremiumTiers.includes(tier.tier) ?? false,
      canClaimFree:
        progress !== null &&
        progress.currentTier >= tier.tier &&
        !progress.claimedFreeTiers.includes(tier.tier) &&
        tier.freeReward !== undefined,
      canClaimPremium:
        !!progress?.isPremium &&
        progress.currentTier >= tier.tier &&
        !progress.claimedPremiumTiers.includes(tier.tier) &&
        tier.premiumReward !== undefined,
    }));
  },
});

/**
 * Get user's battle pass progress
 */
export const getUserBattlePassProgress = query({
  args: {
    battlePassId: v.optional(v.id("battlePassSeasons")),
  },
  returns: battlePassProgressValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    let battlePassId = args.battlePassId;
    if (!battlePassId) {
      const activeBattlePass = await getActiveBattlePass(ctx);
      if (!activeBattlePass) return null;
      battlePassId = activeBattlePass._id;
    }

    const progress = await getBattlePassProgress(ctx, userId, battlePassId);
    if (!progress) return null;

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) return null;

    // Check subscription status to determine premium access
    const isPremium = await hasActiveSubscription(ctx, userId);

    return {
      battlePassId: progress.battlePassId,
      currentXP: progress.currentXP,
      currentTier: progress.currentTier,
      isPremium, // Override with subscription status
      premiumPurchasedAt: progress.premiumPurchasedAt,
      claimedFreeTiers: progress.claimedFreeTiers,
      claimedPremiumTiers: progress.claimedPremiumTiers,
      lastXPGainAt: progress.lastXPGainAt,
      xpPerTier: battlePass.xpPerTier,
      totalTiers: battlePass.totalTiers,
      xpToNextTier:
        progress.currentTier < battlePass.totalTiers
          ? battlePass.xpPerTier - (progress.currentXP % battlePass.xpPerTier)
          : 0,
      tierProgress:
        battlePass.xpPerTier > 0
          ? (progress.currentXP % battlePass.xpPerTier) / battlePass.xpPerTier
          : 0,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Claim a battle pass tier reward
 */
export const claimBattlePassReward = mutation({
  args: {
    tier: v.number(),
    track: v.union(v.literal("free"), v.literal("premium")),
  },
  returns: claimBattlePassRewardValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // Get user progress
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);

    // Validate tier is unlocked
    if (progress.currentTier < args.tier) {
      throw createError(ErrorCode.QUEST_NOT_COMPLETED, {
        reason: `Tier ${args.tier} not unlocked yet`,
      });
    }

    // Get tier definition
    const tierDef = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass_tier", (q) =>
        q.eq("battlePassId", battlePass._id).eq("tier", args.tier)
      )
      .first();

    if (!tierDef) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: `Tier ${args.tier} not found`,
      });
    }

    // Validate track and claim status
    let reward: BattlePassReward;
    if (args.track === "free") {
      if (!tierDef.freeReward) {
        throw createError(ErrorCode.NOT_FOUND_QUEST, {
          reason: `No free reward for tier ${args.tier}`,
        });
      }
      reward = tierDef.freeReward;
      if (progress.claimedFreeTiers.includes(args.tier)) {
        throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
          reason: "Free reward already claimed",
        });
      }
    } else {
      // Premium track - check subscription status
      const isPremium = await hasActiveSubscription(ctx, userId);
      if (!isPremium) {
        throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GEMS, {
          reason: "Active subscription required to claim premium rewards",
        });
      }
      if (!tierDef.premiumReward) {
        throw createError(ErrorCode.NOT_FOUND_QUEST, {
          reason: `No premium reward for tier ${args.tier}`,
        });
      }
      reward = tierDef.premiumReward;
      if (progress.claimedPremiumTiers.includes(args.tier)) {
        throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
          reason: "Premium reward already claimed",
        });
      }
    }

    // Grant the reward
    await grantReward(ctx, userId, reward, args.tier, args.track === "premium");

    // Mark as claimed
    if (args.track === "free") {
      await ctx.db.patch(progress._id, {
        claimedFreeTiers: [...progress.claimedFreeTiers, args.tier],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(progress._id, {
        claimedPremiumTiers: [...progress.claimedPremiumTiers, args.tier],
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      tier: args.tier,
      track: args.track,
      reward: {
        type: reward.type,
        amount: reward.amount,
      },
    };
  },
});

export const claimAllAvailableRewards = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    claimedFree: v.number(),
    claimedPremium: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // Get user progress
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);

    // Live subscription check to prevent claiming after cancellation
    const isPremium = progress.isPremium || await hasActiveSubscription(ctx, userId);

    // Get all tiers
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePass._id))
      .collect();

    let claimedFree = 0;
    let claimedPremium = 0;
    const newClaimedFreeTiers = [...progress.claimedFreeTiers];
    const newClaimedPremiumTiers = [...progress.claimedPremiumTiers];

    for (const tier of tiers) {
      if (tier.tier > progress.currentTier) continue;

      // Claim free reward if available
      if (tier.freeReward && !progress.claimedFreeTiers.includes(tier.tier)) {
        await grantReward(ctx, userId, tier.freeReward, tier.tier, false);
        newClaimedFreeTiers.push(tier.tier);
        claimedFree++;
      }

      // Claim premium reward if available and user is premium
      if (
        isPremium &&
        tier.premiumReward &&
        !progress.claimedPremiumTiers.includes(tier.tier)
      ) {
        await grantReward(ctx, userId, tier.premiumReward, tier.tier, true);
        newClaimedPremiumTiers.push(tier.tier);
        claimedPremium++;
      }
    }

    // Update claimed tiers
    await ctx.db.patch(progress._id, {
      claimedFreeTiers: newClaimedFreeTiers,
      claimedPremiumTiers: newClaimedPremiumTiers,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      claimedFree,
      claimedPremium,
    };
  },
});

// ============================================================================
// Internal Mutations (called from XP system)
// ============================================================================

/**
 * Add battle pass XP to a user
 * Called internally when XP is earned from games, quests, etc.
 */
export const addBattlePassXP = internalMutation({
  args: {
    userId: v.id("users"),
    xpAmount: v.number(),
    source: v.string(), // "game_win", "quest_complete", "daily_bonus", etc.
  },
  handler: async (ctx, args) => {
    if (args.xpAmount <= 0) return { tiersGained: 0, newTier: 0 };

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      return { tiersGained: 0, newTier: 0 };
    }

    // Get or create user progress
    const progress = await getOrCreateBattlePassProgress(ctx, args.userId, battlePass._id);

    // Apply premium XP multiplier if user has active subscription
    const isPremium = await hasActiveSubscription(ctx, args.userId);
    const xpMultiplier = isPremium ? 1.5 : 1.0; // 50% bonus for premium
    const xpToAdd = Math.floor(args.xpAmount * xpMultiplier);

    const oldTier = progress.currentTier;
    const newXP = progress.currentXP + xpToAdd;
    const newTier = calculateTierFromXP(newXP, battlePass.xpPerTier, battlePass.totalTiers);

    // Update progress
    await ctx.db.patch(progress._id, {
      currentXP: newXP,
      currentTier: newTier,
      lastXPGainAt: Date.now(),
      updatedAt: Date.now(),
    });

    const tiersGained = newTier - oldTier;

    // Create notification if tiers were gained
    if (tiersGained > 0) {
      await ctx.db.insert("playerNotifications", {
        userId: args.userId,
        type: "level_up",
        title: "Battle Pass Level Up!",
        message:
          tiersGained === 1
            ? `You reached Tier ${newTier}!`
            : `You gained ${tiersGained} tiers! Now at Tier ${newTier}.`,
        data: {
          type: "battle_pass_tier_up",
          oldTier,
          newTier,
          tiersGained,
        },
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { tiersGained, newTier };
  },
});

/**
 * Get current battle pass for internal use
 */
export const getCurrentBattlePass = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await getActiveBattlePass(ctx);
  },
});
