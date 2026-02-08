/**
 * Daily & Weekly Rewards Module
 *
 * Handles free daily packs, login streak bonuses, and weekly jackpot.
 * F2P players have a small shot at valuable variants through these systems.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { DAILY_REWARDS, VARIANT_CONFIG, XP_SYSTEM } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  addCardsToInventory,
  getRandomCard,
  selectVariant,
  weightedRandomRarity,
} from "../lib/helpers";
import type { CardResult, CardVariant, Rarity } from "../lib/types";
import { adjustPlayerCurrencyHelper } from "./economy";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the start of the current day in UTC
 */
function getTodayStart(): number {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime();
}

/**
 * Get the start of the current week (Sunday) in UTC
 */
function getWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = now.getUTCDate() - dayOfWeek;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff)).getTime();
}

/**
 * Calculate login streak based on last claim time
 */
function calculateStreak(lastClaimTime: number | undefined, currentStreak: number): number {
  if (!lastClaimTime) return 1;

  const today = getTodayStart();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const lastClaimDay = new Date(lastClaimTime);
  lastClaimDay.setUTCHours(0, 0, 0, 0);
  const lastClaimDayTime = lastClaimDay.getTime();

  // If claimed yesterday, increment streak (max 7)
  if (lastClaimDayTime === yesterday) {
    return Math.min(currentStreak + 1, 7);
  }

  // If claimed today, keep current streak
  if (lastClaimDayTime === today) {
    return currentStreak;
  }

  // Streak broken - reset to 1
  return 1;
}

/**
 * Roll the weekly jackpot
 * Returns the variant won (or null for nothing special)
 */
function rollWeeklyJackpot(): CardVariant | null {
  const chances = DAILY_REWARDS.WEEKLY_JACKPOT_CHANCES;
  const roll = Math.random() * 10000;

  if (roll < chances.numbered) return "numbered";
  if (roll < chances.numbered + chances.fullArt) return "full_art";
  if (roll < chances.numbered + chances.fullArt + chances.altArt) return "alt_art";
  if (roll < chances.numbered + chances.fullArt + chances.altArt + chances.foil) return "foil";

  return null;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get player's daily reward status
 */
export const getDailyRewardStatus = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const user = await ctx.db.get(userId);
    if (!user) throw createError(ErrorCode.NOT_FOUND_USER);

    const todayStart = getTodayStart();
    const weekStart = getWeekStart();

    // Check daily pack
    const lastDailyPack = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "daily_pack"))
      .order("desc")
      .first();

    const canClaimDailyPack = !lastDailyPack || lastDailyPack.claimedAt < todayStart;

    // Check login streak
    const lastLoginReward = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "login_streak"))
      .order("desc")
      .first();

    const canClaimLoginStreak = !lastLoginReward || lastLoginReward.claimedAt < todayStart;
    const currentStreak = user.loginStreak ?? 0;
    const nextStreak = calculateStreak(lastLoginReward?.claimedAt, currentStreak);

    // Check weekly jackpot
    const lastJackpot = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "weekly_jackpot"))
      .order("desc")
      .first();

    const canClaimJackpot = !lastJackpot || lastJackpot.claimedAt < weekStart;

    // Calculate next reset times
    const nextDailyReset = todayStart + 24 * 60 * 60 * 1000;
    const nextWeeklyReset = weekStart + 7 * 24 * 60 * 60 * 1000;

    return {
      dailyPack: {
        canClaim: canClaimDailyPack,
        cardCount: DAILY_REWARDS.DAILY_PACK_CARDS,
        nextResetAt: nextDailyReset,
      },
      loginStreak: {
        canClaim: canClaimLoginStreak,
        currentStreak,
        nextStreak,
        goldReward: DAILY_REWARDS.LOGIN_STREAK_GOLD[Math.min(nextStreak - 1, 6)] ?? 50,
        nextResetAt: nextDailyReset,
      },
      weeklyJackpot: {
        canClaim: canClaimJackpot,
        chances: {
          foil: "1%",
          altArt: "0.25%",
          fullArt: "0.1%",
          numbered: "0.01%",
        },
        nextResetAt: nextWeeklyReset,
      },
    };
  },
});

/**
 * Get player's reward history
 */
export const getRewardHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Claim daily free pack
 * Awards 3 random cards with small variant chances
 */
export const claimDailyPack = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    cardsReceived: v.array(
      v.object({
        cardDefinitionId: v.id("cardDefinitions"),
        name: v.string(),
        rarity: v.string(),
        variant: v.string(),
      })
    ),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    const todayStart = getTodayStart();

    // Check if already claimed today
    const lastClaim = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "daily_pack"))
      .order("desc")
      .first();

    if (lastClaim && lastClaim.claimedAt >= todayStart) {
      throw createError(ErrorCode.ECONOMY_ALREADY_CLAIMED, {
        reason: "Daily pack already claimed today",
      });
    }

    // Generate cards
    const cards: CardResult[] = [];
    const cardCount = DAILY_REWARDS.DAILY_PACK_CARDS;

    // Daily pack has very low variant rates (half of basic pack)
    const dailyMultipliers = { foil: 0.5, altArt: 0.5, fullArt: 0.5 };

    for (let i = 0; i < cardCount; i++) {
      const rarity = weightedRandomRarity();
      const variant = selectVariant(dailyMultipliers, true); // Use gold pack rates
      const card = await getRandomCard(ctx, rarity);

      await addCardsToInventory(ctx, userId, card._id, 1, variant, "daily");

      cards.push({
        cardDefinitionId: card._id,
        name: card.name,
        rarity: card.rarity,
        archetype: card.archetype,
        cardType: card.cardType,
        attack: card.attack,
        defense: card.defense,
        cost: card.cost,
        imageUrl: card.imageUrl,
        variant,
      });
    }

    // Record the claim
    await ctx.db.insert("dailyRewards", {
      userId,
      rewardType: "daily_pack",
      claimedAt: Date.now(),
      reward: {
        type: "pack",
        packId: "daily_pack",
      },
    });

    return {
      success: true,
      cardsReceived: cards.map((c) => ({
        cardDefinitionId: c.cardDefinitionId,
        name: c.name,
        rarity: c.rarity,
        variant: c.variant,
      })),
    };
  },
});

/**
 * Claim login streak bonus
 * Awards gold based on consecutive daily logins (max 7 day streak)
 */
export const claimLoginStreak = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    goldReceived: v.number(),
    currentStreak: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    const todayStart = getTodayStart();

    // Check if already claimed today
    const lastClaim = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "login_streak"))
      .order("desc")
      .first();

    if (lastClaim && lastClaim.claimedAt >= todayStart) {
      throw createError(ErrorCode.ECONOMY_ALREADY_CLAIMED, {
        reason: "Login streak already claimed today",
      });
    }

    // Get user and calculate streak
    const user = await ctx.db.get(userId);
    if (!user) throw createError(ErrorCode.NOT_FOUND_USER);

    const currentStreak = user.loginStreak ?? 0;
    const newStreak = calculateStreak(lastClaim?.claimedAt, currentStreak);

    // Get gold reward for this streak day (0-indexed array, 1-indexed streak)
    const goldReward = DAILY_REWARDS.LOGIN_STREAK_GOLD[Math.min(newStreak - 1, 6)] ?? 50;

    // Update user streak
    await ctx.db.patch(userId, { loginStreak: newStreak });

    // Award gold
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: goldReward,
      transactionType: "reward",
      description: `Login streak day ${newStreak}`,
    });

    // Award battle pass XP based on streak day
    const { addXP } = await import("../lib/xpHelpers");
    const dailyXP = XP_SYSTEM.DAILY_LOGIN_XP[Math.min(newStreak - 1, 6)] ?? 25;
    await addXP(ctx, userId, dailyXP, { source: "daily_login" });

    // Record the claim
    await ctx.db.insert("dailyRewards", {
      userId,
      rewardType: "login_streak",
      claimedAt: Date.now(),
      reward: {
        type: "gold",
        amount: goldReward,
      },
    });

    return {
      success: true,
      goldReceived: goldReward,
      currentStreak: newStreak,
    };
  },
});

/**
 * Claim weekly jackpot
 * Small chance at rare variants, resets every Sunday
 */
export const claimWeeklyJackpot = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    won: v.boolean(),
    variant: v.optional(v.string()),
    card: v.optional(
      v.object({
        cardDefinitionId: v.id("cardDefinitions"),
        name: v.string(),
        rarity: v.string(),
        variant: v.string(),
        serialNumber: v.optional(v.number()),
      })
    ),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    const weekStart = getWeekStart();

    // Check if already claimed this week
    const lastClaim = await ctx.db
      .query("dailyRewards")
      .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("rewardType", "weekly_jackpot"))
      .order("desc")
      .first();

    if (lastClaim && lastClaim.claimedAt >= weekStart) {
      throw createError(ErrorCode.ECONOMY_ALREADY_CLAIMED, {
        reason: "Weekly jackpot already claimed this week",
      });
    }

    // Roll the jackpot
    const wonVariant = rollWeeklyJackpot();

    let cardResult:
      | {
          cardDefinitionId: Id<"cardDefinitions">;
          name: string;
          rarity: string;
          variant: string;
          serialNumber?: number;
        }
      | undefined;

    if (wonVariant) {
      // Player won! Generate a card with the variant
      const rarity: Rarity = wonVariant === "numbered" ? "legendary" : weightedRandomRarity();
      const card = await getRandomCard(ctx, rarity);

      let serialNumber: number | undefined;

      // For numbered variants, assign a serial number
      if (wonVariant === "numbered") {
        // Get next available serial for this card
        const existingNumbered = await ctx.db
          .query("numberedCardRegistry")
          .withIndex("by_card", (q) => q.eq("cardDefinitionId", card._id))
          .collect();

        serialNumber = existingNumbered.length + 1;

        if (serialNumber <= VARIANT_CONFIG.NUMBERED_MAX_SERIAL) {
          // Register the numbered card
          await ctx.db.insert("numberedCardRegistry", {
            cardDefinitionId: card._id,
            serialNumber,
            maxSerial: VARIANT_CONFIG.NUMBERED_MAX_SERIAL,
            mintedAt: Date.now(),
            mintedTo: userId,
            mintMethod: "pack",
            currentOwner: userId,
          });

          await addCardsToInventory(ctx, userId, card._id, 1, "numbered", "jackpot", serialNumber);
        } else {
          // Max numbered reached, give full_art instead
          await addCardsToInventory(ctx, userId, card._id, 1, "full_art", "jackpot");
          serialNumber = undefined;
        }
      } else {
        await addCardsToInventory(ctx, userId, card._id, 1, wonVariant, "jackpot");
      }

      cardResult = {
        cardDefinitionId: card._id,
        name: card.name,
        rarity: card.rarity,
        variant: wonVariant,
        serialNumber,
      };
    }

    // Record the claim
    await ctx.db.insert("dailyRewards", {
      userId,
      rewardType: "weekly_jackpot",
      claimedAt: Date.now(),
      reward:
        wonVariant && cardResult
          ? {
              type: "card",
              cardId: cardResult.cardDefinitionId,
              variant: wonVariant,
            }
          : {
              type: "pack", // Nothing won - just a marker
              packId: "jackpot_miss",
            },
    });

    return {
      success: true,
      won: wonVariant !== null,
      variant: wonVariant ?? undefined,
      card: cardResult,
    };
  },
});
