import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  validateSession,
  getPlayerCurrency,
  getOrCreatePlayerCurrency,
  recordTransaction,
} from "./lib/validators";
import { PAGINATION } from "./lib/constants";
import type { CurrencyType, TransactionType } from "./lib/types";
import { openPack, type PackConfig, type CardResult } from "./lib/helpers";

// ============================================================================
// INTERNAL MUTATIONS (called by other backend functions)
// ============================================================================

/**
 * Initialize player currency with welcome bonus
 * Called during signup
 */
export const initializePlayerCurrency = internalMutation({
  args: {
    userId: v.id("users"),
    welcomeBonus: v.object({
      gold: v.number(),
      gems: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Check if already initialized
    const existing = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return; // Already initialized
    }

    const { gold, gems } = args.welcomeBonus;

    // Create currency record
    await ctx.db.insert("playerCurrency", {
      userId: args.userId,
      gold,
      gems,
      lifetimeGoldEarned: gold,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: gems,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: Date.now(),
    });

    // Record welcome bonus transactions
    if (gold > 0) {
      await recordTransaction(
        ctx,
        args.userId,
        "gift",
        "gold",
        gold,
        gold,
        "Welcome bonus"
      );
    }

    if (gems > 0) {
      await recordTransaction(
        ctx,
        args.userId,
        "gift",
        "gems",
        gems,
        gems,
        "Welcome bonus"
      );
    }
  },
});

/**
 * Adjust player currency (internal helper for shop/marketplace)
 * Handles atomic updates and transaction recording
 */
export const adjustPlayerCurrency = internalMutation({
  args: {
    userId: v.id("users"),
    goldDelta: v.optional(v.number()),
    gemsDelta: v.optional(v.number()),
    transactionType: v.union(
      v.literal("purchase"),
      v.literal("reward"),
      v.literal("sale"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("conversion"),
      v.literal("marketplace_fee"),
      v.literal("auction_bid"),
      v.literal("auction_refund")
    ),
    description: v.string(),
    referenceId: v.optional(v.string()),
    metadata: v.optional(v.any()), // Keep v.any() here as Convex doesn't support complex union types in args
  },
  handler: async (ctx, args) => {
    const currency = await getOrCreatePlayerCurrency(ctx, args.userId);

    const goldDelta = args.goldDelta ?? 0;
    const gemsDelta = args.gemsDelta ?? 0;

    const newGold = currency.gold + goldDelta;
    const newGems = currency.gems + gemsDelta;

    // Validate sufficient balance
    if (newGold < 0) {
      throw new Error(`Insufficient gold (have ${currency.gold}, need ${-goldDelta})`);
    }
    if (newGems < 0) {
      throw new Error(`Insufficient gems (have ${currency.gems}, need ${-gemsDelta})`);
    }

    // Update lifetime stats
    let lifetimeGoldEarned = currency.lifetimeGoldEarned;
    let lifetimeGoldSpent = currency.lifetimeGoldSpent;
    let lifetimeGemsEarned = currency.lifetimeGemsEarned;
    let lifetimeGemsSpent = currency.lifetimeGemsSpent;

    if (goldDelta > 0) lifetimeGoldEarned += goldDelta;
    if (goldDelta < 0) lifetimeGoldSpent += Math.abs(goldDelta);
    if (gemsDelta > 0) lifetimeGemsEarned += gemsDelta;
    if (gemsDelta < 0) lifetimeGemsSpent += Math.abs(gemsDelta);

    // Update currency record
    await ctx.db.patch(currency._id, {
      gold: newGold,
      gems: newGems,
      lifetimeGoldEarned,
      lifetimeGoldSpent,
      lifetimeGemsEarned,
      lifetimeGemsSpent,
      lastUpdatedAt: Date.now(),
    });

    // Record transactions
    if (goldDelta !== 0) {
      await recordTransaction(
        ctx,
        args.userId,
        args.transactionType,
        "gold",
        goldDelta,
        newGold,
        args.description,
        args.referenceId,
        args.metadata
      );
    }

    if (gemsDelta !== 0) {
      await recordTransaction(
        ctx,
        args.userId,
        args.transactionType,
        "gems",
        gemsDelta,
        newGems,
        args.description,
        args.referenceId,
        args.metadata
      );
    }

    return { gold: newGold, gems: newGems };
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get player's current currency balance
 */
export const getPlayerBalance = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Query currency directly instead of using getPlayerCurrency (which throws)
    const currency = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return defaults if currency doesn't exist yet (scheduled init may be pending)
    if (!currency) {
      return {
        gold: 0,
        gems: 0,
        lifetimeStats: {
          goldEarned: 0,
          goldSpent: 0,
          gemsEarned: 0,
          gemsSpent: 0,
        },
        lastUpdatedAt: Date.now(),
      };
    }

    return {
      gold: currency.gold,
      gems: currency.gems,
      lifetimeStats: {
        goldEarned: currency.lifetimeGoldEarned,
        goldSpent: currency.lifetimeGoldSpent,
        gemsEarned: currency.lifetimeGemsEarned,
        gemsSpent: currency.lifetimeGemsSpent,
      },
      lastUpdatedAt: currency.lastUpdatedAt,
    };
  },
});

/**
 * Get player's transaction history (paginated)
 */
export const getTransactionHistory = query({
  args: {
    token: v.string(),
    page: v.optional(v.number()),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("gems"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);
    const page = args.page ?? 1;
    const pageSize = PAGINATION.TRANSACTION_PAGE_SIZE;

    let query = ctx.db
      .query("currencyTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc");

    // Filter by currency type if specified
    if (args.currencyType) {
      const allTransactions = await query.collect();
      const filtered = allTransactions.filter(
        (t) => t.currencyType === args.currencyType
      );

      const startIdx = (page - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const paginated = filtered.slice(startIdx, endIdx);

      return {
        transactions: paginated,
        page,
        pageSize,
        total: filtered.length,
        hasMore: endIdx < filtered.length,
      };
    }

    // No filter - paginate directly
    const allTransactions = await query.collect();
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginated = allTransactions.slice(startIdx, endIdx);

    return {
      transactions: paginated,
      page,
      pageSize,
      total: allTransactions.length,
      hasMore: endIdx < allTransactions.length,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Redeem a promotional code
 */
export const redeemPromoCode = mutation({
  args: {
    token: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Find promo code (case-insensitive)
    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!promoCode) {
      throw new Error("Invalid promo code");
    }

    // Validate promo code
    if (!promoCode.isActive) {
      throw new Error("This promo code is no longer active");
    }

    if (promoCode.expiresAt && promoCode.expiresAt < Date.now()) {
      throw new Error("This promo code has expired");
    }

    if (
      promoCode.maxRedemptions &&
      promoCode.redemptionCount >= promoCode.maxRedemptions
    ) {
      throw new Error("This promo code has reached its redemption limit");
    }

    // Check if user already redeemed
    const existingRedemption = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_user_code", (q) =>
        q.eq("userId", userId).eq("promoCodeId", promoCode._id)
      )
      .first();

    if (existingRedemption) {
      throw new Error("You have already redeemed this promo code");
    }

    // Grant reward based on type
    let rewardDescription = "";
    let rewardCards: CardResult[] | undefined;

    if (promoCode.rewardType === "gold") {
      await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
        userId,
        goldDelta: promoCode.rewardAmount,
        transactionType: "gift",
        description: `Promo code: ${args.code}`,
        referenceId: promoCode._id,
      });
      rewardDescription = `${promoCode.rewardAmount} Gold`;
    } else if (promoCode.rewardType === "gems") {
      await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
        userId,
        gemsDelta: promoCode.rewardAmount,
        transactionType: "gift",
        description: `Promo code: ${args.code}`,
        referenceId: promoCode._id,
      });
      rewardDescription = `${promoCode.rewardAmount} Gems`;
    } else if (promoCode.rewardType === "pack") {
      // Look up pack product
      const packProduct = await ctx.db
        .query("shopProducts")
        .withIndex("by_product_id", (q) => q.eq("productId", promoCode.rewardPackId!))
        .first();

      if (!packProduct || !packProduct.packConfig) {
        throw new Error("Invalid pack configuration for promo code");
      }

      const allCards: CardResult[] = [];

      // Open packs (once per rewardAmount)
      for (let i = 0; i < promoCode.rewardAmount; i++) {
        const cards = await openPack(ctx, packProduct.packConfig, userId);
        allCards.push(...cards);

        // Record pack opening
        const startIdx = i * packProduct.packConfig.cardCount;
        const endIdx = startIdx + packProduct.packConfig.cardCount;
        const packCards = allCards.slice(startIdx, endIdx);

        await ctx.db.insert("packOpeningHistory", {
          userId,
          productId: promoCode.rewardPackId!,
          packType: packProduct.name,
          cardsReceived: packCards.map((c) => ({
            cardDefinitionId: c.cardDefinitionId,
            name: c.name,
            rarity: c.rarity,
          })),
          currencyUsed: "gold",
          amountPaid: 0,
          openedAt: Date.now(),
        });
      }

      rewardDescription = `${promoCode.rewardAmount}x ${packProduct.name}`;
      rewardCards = allCards;
    }

    // Increment redemption count
    await ctx.db.patch(promoCode._id, {
      redemptionCount: promoCode.redemptionCount + 1,
    });

    // Record redemption
    await ctx.db.insert("promoRedemptions", {
      userId,
      promoCodeId: promoCode._id,
      code: args.code.toUpperCase(),
      rewardReceived: rewardDescription,
      redeemedAt: Date.now(),
    });

    return {
      success: true,
      rewardDescription,
      cardsReceived: promoCode.rewardType === "pack" ? rewardCards : undefined,
    };
  },
});
