/**
 * Sales System Module
 *
 * Handles rotating sales, discounts, and promotional pricing.
 * Supports flash sales, weekend deals, returning player offers, etc.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { SALES_CONFIG } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

// =============================================================================
// Types
// =============================================================================

export type SaleType = "flash" | "weekend" | "launch" | "holiday" | "anniversary" | "returning";

export interface ActiveSale {
  saleId: string;
  name: string;
  description: string;
  saleType: SaleType;
  discountPercent?: number;
  bonusCards?: number;
  bonusGems?: number;
  applicableProducts: string[];
  startsAt: number;
  endsAt: number;
  priority: number;
}

export interface DiscountedPrice {
  originalGold?: number;
  originalGems?: number;
  discountedGold?: number;
  discountedGems?: number;
  discountPercent: number;
  saleId: string;
  saleName: string;
  bonusCards?: number;
  bonusGems?: number;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Check if user qualifies as a returning player
 * Returns true if user hasn't been active in RETURNING_PLAYER_DAYS
 */
async function isReturningPlayer(ctx: QueryCtx, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  // Parse lastLoginDate string (YYYY-MM-DD) or fall back to creation time
  let lastActivity = user._creationTime;
  if (user.lastLoginDate) {
    const parsed = new Date(user.lastLoginDate).getTime();
    if (!Number.isNaN(parsed)) {
      lastActivity = parsed;
    }
  }

  const daysSinceActive = (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);

  return daysSinceActive >= SALES_CONFIG.RETURNING_PLAYER_DAYS;
}

/**
 * Check if user qualifies as a new player
 * Returns true if account was created within NEW_PLAYER_DAYS
 */
async function isNewPlayer(ctx: QueryCtx, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;

  const accountAge = (Date.now() - user._creationTime) / (24 * 60 * 60 * 1000);

  return accountAge <= SALES_CONFIG.NEW_PLAYER_DAYS;
}

/**
 * Check if user can use a specific sale (based on conditions)
 */
async function canUseSale(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  sale: {
    _id: Id<"shopSales">;
    conditions?: {
      maxUsesTotal?: number;
      maxUsesPerUser?: number;
      returningPlayerOnly?: boolean;
      newPlayerOnly?: boolean;
    } | null;
    usageCount: number;
  }
): Promise<{ canUse: boolean; reason?: string }> {
  const conditions = sale.conditions;

  if (!conditions) return { canUse: true };

  // Check global max uses
  if (conditions.maxUsesTotal !== undefined && sale.usageCount >= conditions.maxUsesTotal) {
    return { canUse: false, reason: "Sale has reached maximum redemptions" };
  }

  // Check per-user limit
  if (conditions.maxUsesPerUser !== undefined) {
    const userUsage = await ctx.db
      .query("saleUsage")
      .withIndex("by_user_sale", (q) => q.eq("userId", userId).eq("saleId", sale._id.toString()))
      .collect();

    if (userUsage.length >= conditions.maxUsesPerUser) {
      return { canUse: false, reason: "You have reached the limit for this sale" };
    }
  }

  // Check returning player requirement
  if (conditions.returningPlayerOnly) {
    const returning = await isReturningPlayer(ctx, userId);
    if (!returning) {
      return { canUse: false, reason: "This sale is for returning players only" };
    }
  }

  // Check new player requirement
  if (conditions.newPlayerOnly) {
    const newPlayer = await isNewPlayer(ctx, userId);
    if (!newPlayer) {
      return { canUse: false, reason: "This sale is for new players only" };
    }
  }

  return { canUse: true };
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all currently active sales
 */
export const getActiveSales = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const sales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    // Sort by priority (higher priority first)
    return sales.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get active sales applicable to a specific product
 */
export const getSalesForProduct = query({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allActiveSales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    // Filter to sales that apply to this product (empty array means all products)
    const applicableSales = allActiveSales.filter(
      (sale) =>
        sale.applicableProducts.length === 0 || sale.applicableProducts.includes(args.productId)
    );

    // Sort by priority
    return applicableSales.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get discounted price for a product (applying best sale)
 */
export const getDiscountedPrice = query({
  args: {
    productId: v.string(),
  },
  handler: async (ctx, args): Promise<DiscountedPrice | null> => {
    // Get the product
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product) return null;

    const now = Date.now();

    // Get applicable sales
    const allActiveSales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    const applicableSales = allActiveSales.filter(
      (sale) =>
        sale.applicableProducts.length === 0 || sale.applicableProducts.includes(args.productId)
    );

    if (applicableSales.length === 0) return null;

    // Get highest priority sale
    const bestSale = applicableSales.sort((a, b) => b.priority - a.priority)[0];
    if (!bestSale) return null;

    const discountPercent = bestSale.discountPercent ?? 0;
    const discountMultiplier = 1 - discountPercent / 100;

    return {
      originalGold: product.goldPrice ?? undefined,
      originalGems: product.gemPrice ?? undefined,
      discountedGold: product.goldPrice
        ? Math.floor(product.goldPrice * discountMultiplier)
        : undefined,
      discountedGems: product.gemPrice
        ? Math.floor(product.gemPrice * discountMultiplier)
        : undefined,
      discountPercent,
      saleId: bestSale.saleId,
      saleName: bestSale.name,
      bonusCards: bestSale.bonusCards,
      bonusGems: bestSale.bonusGems,
    };
  },
});

/**
 * Get all sales the user can currently use (checking conditions)
 */
export const getAvailableSalesForUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    const now = Date.now();

    const allActiveSales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    const availableSales = [];

    for (const sale of allActiveSales) {
      const { canUse } = await canUseSale(ctx, userId, sale);
      if (canUse) {
        availableSales.push(sale);
      }
    }

    return availableSales.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get user's sale usage history
 */
export const getSaleUsageHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = args.limit ?? 20;

    const usage = await ctx.db
      .query("saleUsage")
      .filter((q) => q.eq(q.field("userId"), userId))
      .order("desc")
      .take(limit);

    return usage;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Record sale usage (called after a purchase)
 */
export const recordSaleUsage = mutation({
  args: {
    saleId: v.string(),
    productId: v.string(),
    originalPrice: v.number(),
    discountedPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find the sale
    const sale = await ctx.db
      .query("shopSales")
      .withIndex("by_sale_id", (q) => q.eq("saleId", args.saleId))
      .first();

    if (!sale) {
      throw createError(ErrorCode.ECONOMY_SALE_NOT_FOUND, { saleId: args.saleId });
    }

    // Verify user can still use this sale
    const { canUse, reason } = await canUseSale(ctx, userId, sale);
    if (!canUse) {
      throw createError(ErrorCode.ECONOMY_SALE_UNAVAILABLE, { reason });
    }

    // Record usage
    await ctx.db.insert("saleUsage", {
      userId,
      saleId: args.saleId,
      usedAt: Date.now(),
      productId: args.productId,
      originalPrice: args.originalPrice,
      discountedPrice: args.discountedPrice,
      discountAmount: args.originalPrice - args.discountedPrice,
    });

    // Increment sale usage count
    await ctx.db.patch(sale._id, {
      usageCount: sale.usageCount + 1,
    });

    return { success: true };
  },
});

/**
 * Helper to apply sale discount and record usage
 * Returns the discounted prices and any bonuses
 */
export async function applySaleToPrice(
  ctx: MutationCtx,
  userId: Id<"users">,
  productId: string,
  goldPrice: number | undefined,
  gemPrice: number | undefined
): Promise<{
  finalGoldPrice: number | undefined;
  finalGemPrice: number | undefined;
  discountApplied: number;
  bonusCards: number;
  bonusGems: number;
  saleId: string | null;
}> {
  const now = Date.now();

  // Get applicable sales
  const allActiveSales = await ctx.db
    .query("shopSales")
    .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
    .filter((q) => q.gte(q.field("endsAt"), now))
    .collect();

  const applicableSales = allActiveSales.filter(
    (sale) => sale.applicableProducts.length === 0 || sale.applicableProducts.includes(productId)
  );

  // Find best sale user can use
  let bestSale = null;
  for (const sale of applicableSales.sort((a, b) => b.priority - a.priority)) {
    const { canUse } = await canUseSale(ctx, userId, sale);
    if (canUse) {
      bestSale = sale;
      break;
    }
  }

  if (!bestSale) {
    return {
      finalGoldPrice: goldPrice,
      finalGemPrice: gemPrice,
      discountApplied: 0,
      bonusCards: 0,
      bonusGems: 0,
      saleId: null,
    };
  }

  const discountPercent = bestSale.discountPercent ?? 0;
  const discountMultiplier = 1 - discountPercent / 100;

  return {
    finalGoldPrice: goldPrice ? Math.floor(goldPrice * discountMultiplier) : undefined,
    finalGemPrice: gemPrice ? Math.floor(gemPrice * discountMultiplier) : undefined,
    discountApplied: discountPercent,
    bonusCards: bestSale.bonusCards ?? 0,
    bonusGems: bestSale.bonusGems ?? 0,
    saleId: bestSale.saleId,
  };
}
