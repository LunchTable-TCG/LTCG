import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const saleTypeValidator = v.union(
  v.literal("flash"),
  v.literal("weekend"),
  v.literal("launch"),
  v.literal("holiday"),
  v.literal("anniversary"),
  v.literal("returning")
);

const applicableProductTypeValidator = v.union(
  v.literal("pack"),
  v.literal("box"),
  v.literal("currency"),
  v.literal("gem_package")
);

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all currently active sales.
 */
export const getActiveSales = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const now = Date.now();

    const sales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    return sales.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get active sales applicable to a specific product.
 */
export const getSalesForProduct = query({
  args: { productId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const now = Date.now();

    const allActiveSales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    const applicableSales = allActiveSales.filter(
      (sale) =>
        sale.applicableProducts.length === 0 ||
        sale.applicableProducts.includes(args.productId)
    );

    return applicableSales.sort((a, b) => b.priority - a.priority);
  },
});

/**
 * Get the discounted price for a product (applying best sale).
 */
export const getDiscountedPrice = query({
  args: {
    userId: v.string(),
    productId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product) return null;

    const now = Date.now();

    const allActiveSales = await ctx.db
      .query("shopSales")
      .withIndex("by_active_time", (q) => q.eq("isActive", true).lte("startsAt", now))
      .filter((q) => q.gte(q.field("endsAt"), now))
      .collect();

    const applicableSales = allActiveSales.filter(
      (sale) =>
        sale.applicableProducts.length === 0 ||
        sale.applicableProducts.includes(args.productId)
    );

    if (applicableSales.length === 0) return null;

    // Check per-user usage limits
    let bestSale = null;
    for (const sale of applicableSales.sort((a, b) => b.priority - a.priority)) {
      if (sale.conditions?.maxUsesPerUser !== undefined) {
        const userUsage = await ctx.db
          .query("saleUsage")
          .withIndex("by_user_sale", (q) =>
            q.eq("userId", args.userId).eq("saleId", sale.saleId)
          )
          .collect();
        if (userUsage.length >= sale.conditions.maxUsesPerUser) continue;
      }
      if (sale.conditions?.maxUsesTotal !== undefined && sale.usageCount >= sale.conditions.maxUsesTotal) {
        continue;
      }
      bestSale = sale;
      break;
    }

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

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new sale.
 */
export const createSale = mutation({
  args: {
    saleId: v.string(),
    name: v.string(),
    description: v.string(),
    saleType: saleTypeValidator,
    discountPercent: v.optional(v.number()),
    bonusCards: v.optional(v.number()),
    bonusGems: v.optional(v.number()),
    applicableProducts: v.array(v.string()),
    applicableProductTypes: v.optional(v.array(applicableProductTypeValidator)),
    startsAt: v.number(),
    endsAt: v.number(),
    isActive: v.boolean(),
    priority: v.number(),
    conditions: v.optional(
      v.object({
        minPurchaseAmount: v.optional(v.number()),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        returningPlayerOnly: v.optional(v.boolean()),
        newPlayerOnly: v.optional(v.boolean()),
        minPlayerLevel: v.optional(v.number()),
      })
    ),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("shopSales", {
      ...args,
      usageCount: 0,
      totalDiscountGiven: 0,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Record usage of a sale by a user.
 */
export const recordSaleUsage = mutation({
  args: {
    userId: v.string(),
    saleId: v.string(),
    productId: v.string(),
    originalPrice: v.number(),
    discountedPrice: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const discountAmount = args.originalPrice - args.discountedPrice;

    await ctx.db.insert("saleUsage", {
      userId: args.userId,
      saleId: args.saleId,
      productId: args.productId,
      originalPrice: args.originalPrice,
      discountedPrice: args.discountedPrice,
      discountAmount,
      usedAt: Date.now(),
    });

    // Update sale usage stats
    const sale = await ctx.db
      .query("shopSales")
      .withIndex("by_sale_id", (q) => q.eq("saleId", args.saleId))
      .first();

    if (sale) {
      await ctx.db.patch(sale._id, {
        usageCount: sale.usageCount + 1,
        totalDiscountGiven: sale.totalDiscountGiven + discountAmount,
      });
    }

    return null;
  },
});
