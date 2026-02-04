import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
import { PAGINATION } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { type CardResult, openPack } from "../lib/helpers";
import {
  cardResultValidator,
  playerBalanceValidator,
  transactionHistoryValidator,
} from "../lib/returnValidators";
import type { TransactionType } from "../lib/types";
import { getOrCreatePlayerCurrency, recordTransaction } from "../lib/validators";

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
      await recordTransaction(ctx, args.userId, "gift", "gold", gold, gold, "Welcome bonus");
    }

    if (gems > 0) {
      await recordTransaction(ctx, args.userId, "gift", "gems", gems, gems, "Welcome bonus");
    }
  },
});

/**
 * Helper function to adjust player currency without authentication overhead
 *
 * Used by other mutations to avoid ctx.runMutation overhead and reduce latency.
 * Handles atomic currency updates, validates sufficient balance, updates lifetime stats,
 * and records transactions for audit trail.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Currency adjustment parameters
 * @param params.userId - User ID to adjust currency for
 * @param params.goldDelta - Amount of gold to add/subtract (positive or negative)
 * @param params.gemsDelta - Amount of gems to add/subtract (positive or negative)
 * @param params.transactionType - Type of transaction for audit trail
 * @param params.description - Human-readable description of the transaction
 * @param params.referenceId - Optional reference ID (e.g., pack product ID, promo code ID)
 * @param params.metadata - Optional metadata for the transaction record
 * @returns Updated currency balances (gold and gems)
 * @throws {ErrorCode.ECONOMY_INSUFFICIENT_GOLD} If player doesn't have enough gold
 * @throws {ErrorCode.ECONOMY_INSUFFICIENT_GEMS} If player doesn't have enough gems
 */
export async function adjustPlayerCurrencyHelper(
  ctx: MutationCtx,
  params: {
    userId: Id<"users">;
    goldDelta?: number;
    gemsDelta?: number;
    transactionType: TransactionType;
    description: string;
    referenceId?: string;
    metadata?: Record<string, string | number | boolean | undefined>;
  }
): Promise<{ gold: number; gems: number }> {
  const currency = await getOrCreatePlayerCurrency(ctx, params.userId);

  const goldDelta = params.goldDelta ?? 0;
  const gemsDelta = params.gemsDelta ?? 0;

  const newGold = currency.gold + goldDelta;
  const newGems = currency.gems + gemsDelta;

  // Validate sufficient balance
  if (newGold < 0) {
    throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
      current: currency.gold,
      required: -goldDelta,
    });
  }
  if (newGems < 0) {
    throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GEMS, {
      current: currency.gems,
      required: -gemsDelta,
    });
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
      params.userId,
      params.transactionType,
      "gold",
      goldDelta,
      newGold,
      params.description,
      params.referenceId,
      params.metadata
    );
  }

  if (gemsDelta !== 0) {
    await recordTransaction(
      ctx,
      params.userId,
      params.transactionType,
      "gems",
      gemsDelta,
      newGems,
      params.description,
      params.referenceId,
      params.metadata
    );
  }

  return { gold: newGold, gems: newGems };
}

/**
 * Adjust player currency (internal mutation wrapper)
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
    metadata: v.optional(
      v.union(
        v.object({
          productId: v.optional(v.string()),
          packType: v.optional(v.string()),
          packName: v.optional(v.string()),
          achievementId: v.optional(v.string()),
          questId: v.optional(v.string()),
          questType: v.optional(v.string()),
          category: v.optional(v.string()),
          cardId: v.optional(v.string()),
          previousPhase: v.optional(v.string()),
          newPhase: v.optional(v.string()),
          trigger: v.optional(v.string()),
          price: v.optional(v.number()),
          platformFee: v.optional(v.number()),
        }),
        v.null()
      )
    ),
  },
  handler: async (ctx, args) => {
    return await adjustPlayerCurrencyHelper(ctx, {
      ...args,
      metadata: args.metadata ?? undefined,
    });
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get player's current currency balance
 */
export const getPlayerBalance = query({
  args: {},
  returns: playerBalanceValidator,
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

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
 * @deprecated Use getTransactionHistoryPaginated for better performance with cursor-based pagination.
 *             This function uses inefficient offset-based pagination that loads 1000 records into memory
 *             and filters them client-side.
 */
export const getTransactionHistory = query({
  args: {
    page: v.optional(v.number()),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("gems"))),
  },
  returns: transactionHistoryValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const page = args.page ?? 1;
    const pageSize = PAGINATION.TRANSACTION_PAGE_SIZE;

    const query = ctx.db
      .query("currencyTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc");

    // Filter by currency type if specified
    if (args.currencyType) {
      // Limit to 1000 recent transactions to prevent unbounded queries
      const allTransactions = await query.take(1000);
      const filtered = allTransactions.filter((t) => t.currencyType === args.currencyType);

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

    // No filter - limit to 1000 recent transactions
    const allTransactions = await query.take(1000);
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

/**
 * Get player's transaction history (cursor-based pagination)
 * Uses Convex's built-in pagination for better performance and scalability
 */
export const getTransactionHistoryPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("gems"))),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    let query = ctx.db
      .query("currencyTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc");

    // Apply currency type filter BEFORE pagination to ensure correct page size
    if (args.currencyType) {
      query = query.filter((q) => q.eq(q.field("currencyType"), args.currencyType));
    }

    return await query.paginate(args.paginationOpts);
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
    code: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    rewardDescription: v.string(),
    cardsReceived: v.optional(v.array(cardResultValidator)),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find promo code (case-insensitive)
    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!promoCode) {
      throw createError(ErrorCode.ECONOMY_PROMO_CODE_INVALID);
    }

    // Validate promo code
    if (!promoCode.isActive) {
      throw createError(ErrorCode.ECONOMY_PROMO_CODE_INVALID, {
        reason: "This promo code is no longer active",
      });
    }

    if (promoCode.expiresAt && promoCode.expiresAt < Date.now()) {
      throw createError(ErrorCode.ECONOMY_PROMO_CODE_EXPIRED);
    }

    if (promoCode.maxRedemptions && promoCode.redemptionCount >= promoCode.maxRedemptions) {
      throw createError(ErrorCode.ECONOMY_PROMO_CODE_INVALID, {
        reason: "This promo code has reached its redemption limit",
      });
    }

    // Check if user already redeemed
    const existingRedemption = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_user_code", (q) => q.eq("userId", userId).eq("promoCodeId", promoCode._id))
      .first();

    if (existingRedemption) {
      throw createError(ErrorCode.ECONOMY_PROMO_CODE_USED);
    }

    // Grant reward based on type
    let rewardDescription = "";
    let rewardCards: CardResult[] | undefined;

    if (promoCode.rewardType === "gold") {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: promoCode.rewardAmount,
        transactionType: "gift",
        description: `Promo code: ${args.code}`,
        referenceId: promoCode._id,
      });
      rewardDescription = `${promoCode.rewardAmount} Gold`;
    } else if (promoCode.rewardType === "gems") {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        gemsDelta: promoCode.rewardAmount,
        transactionType: "gift",
        description: `Promo code: ${args.code}`,
        referenceId: promoCode._id,
      });
      rewardDescription = `${promoCode.rewardAmount} Gems`;
    } else if (promoCode.rewardType === "pack") {
      // Look up pack product
      const rewardPackId = promoCode.rewardPackId;
      if (!rewardPackId) {
        throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
          reason: "Promo code has no reward pack",
        });
      }
      const packProduct = await ctx.db
        .query("shopProducts")
        .withIndex("by_product_id", (q) => q.eq("productId", rewardPackId))
        .first();

      if (!packProduct || !packProduct.packConfig) {
        throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
          reason: "Invalid pack configuration for promo code",
        });
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
          productId: rewardPackId,
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
