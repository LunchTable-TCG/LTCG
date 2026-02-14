import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a promo code by its code string.
 */
export const getPromoCode = query({
  args: { code: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();
  },
});

/**
 * Get all redemptions for a user.
 */
export const getUserRedemptions = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("promoRedemptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new promo code.
 */
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    rewardType: v.union(v.literal("gold"), v.literal("gems"), v.literal("pack")),
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (existing) {
      throw new Error(`Promo code "${args.code}" already exists`);
    }

    const id = await ctx.db.insert("promoCodes", {
      code: args.code.toUpperCase(),
      description: args.description,
      rewardType: args.rewardType,
      rewardAmount: args.rewardAmount,
      rewardPackId: args.rewardPackId,
      maxRedemptions: args.maxRedemptions,
      redemptionCount: 0,
      expiresAt: args.expiresAt,
      isActive: args.isActive,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Redeem a promo code for a user.
 * Validates the code, checks limits, increments counter, records redemption.
 * Returns the promo code details so the host app can grant the reward.
 */
export const redeemPromoCode = mutation({
  args: {
    userId: v.string(),
    code: v.string(),
  },
  returns: v.object({
    rewardType: v.union(v.literal("gold"), v.literal("gems"), v.literal("pack")),
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const code = args.code.toUpperCase();

    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!promoCode) {
      throw new Error("Invalid promo code");
    }

    if (!promoCode.isActive) {
      throw new Error("This promo code is no longer active");
    }

    if (promoCode.expiresAt && promoCode.expiresAt < Date.now()) {
      throw new Error("This promo code has expired");
    }

    if (promoCode.maxRedemptions && promoCode.redemptionCount >= promoCode.maxRedemptions) {
      throw new Error("This promo code has reached its redemption limit");
    }

    // Check if user already redeemed
    const existingRedemption = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_user_code", (q) =>
        q.eq("userId", args.userId).eq("promoCodeId", promoCode._id)
      )
      .first();

    if (existingRedemption) {
      throw new Error("You have already redeemed this promo code");
    }

    // Increment redemption count
    await ctx.db.patch(promoCode._id, {
      redemptionCount: promoCode.redemptionCount + 1,
    });

    // Record redemption
    await ctx.db.insert("promoRedemptions", {
      userId: args.userId,
      promoCodeId: promoCode._id,
      code,
      rewardReceived: `${promoCode.rewardType}: ${promoCode.rewardAmount}`,
      redeemedAt: Date.now(),
    });

    return {
      rewardType: promoCode.rewardType,
      rewardAmount: promoCode.rewardAmount,
      rewardPackId: promoCode.rewardPackId,
    };
  },
});
