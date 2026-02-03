/**
 * Promo Code Admin Module
 *
 * CRUD operations for managing promo codes.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Reward type validator matching schema
const rewardTypeValidator = v.union(
  v.literal("gold"),
  v.literal("gems"),
  v.literal("pack")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all promo codes with optional filtering
 */
export const listPromoCodes = query({
  args: {
    includeInactive: v.optional(v.boolean()),
    includeExpired: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let codes = await ctx.db.query("promoCodes").collect();

    // Filter by active status
    if (!args.includeInactive) {
      codes = codes.filter((c) => c.isActive);
    }

    // Filter by expiration
    if (!args.includeExpired) {
      const now = Date.now();
      codes = codes.filter((c) => !c.expiresAt || c.expiresAt > now);
    }

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      codes = codes.filter(
        (c) =>
          c.code.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    codes.sort((a, b) => b.createdAt - a.createdAt);

    return {
      codes,
      totalCount: codes.length,
    };
  },
});

/**
 * Get a single promo code by ID
 */
export const getPromoCode = query({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, { promoCodeId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const code = await ctx.db.get(promoCodeId);
    if (!code) return null;

    // Get redemption history
    const redemptions = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_code", (q) => q.eq("promoCodeId", promoCodeId))
      .order("desc")
      .take(50);

    return {
      ...code,
      redemptions,
    };
  },
});

/**
 * Get promo code statistics
 */
export const getPromoCodeStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const codes = await ctx.db.query("promoCodes").collect();
    const now = Date.now();

    const activeCodes = codes.filter((c) => c.isActive);
    const expiredCodes = codes.filter((c) => c.expiresAt && c.expiresAt <= now);
    const exhaustedCodes = codes.filter(
      (c) => c.maxRedemptions && c.redemptionCount >= c.maxRedemptions
    );

    // Count by reward type
    const byRewardType = {
      gold: activeCodes.filter((c) => c.rewardType === "gold").length,
      gems: activeCodes.filter((c) => c.rewardType === "gems").length,
      pack: activeCodes.filter((c) => c.rewardType === "pack").length,
    };

    // Total redemptions
    const totalRedemptions = codes.reduce((sum, c) => sum + c.redemptionCount, 0);

    return {
      totalCodes: codes.length,
      activeCodes: activeCodes.length,
      expiredCodes: expiredCodes.length,
      exhaustedCodes: exhaustedCodes.length,
      byRewardType,
      totalRedemptions,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new promo code
 */
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    rewardType: rewardTypeValidator,
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Normalize code to uppercase
    const normalizedCode = args.code.toUpperCase().trim();

    // Check for duplicate code
    const existing = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existing) {
      throw new Error(`Promo code "${normalizedCode}" already exists`);
    }

    // Validate pack reward
    if (args.rewardType === "pack" && !args.rewardPackId) {
      throw new Error("Pack reward type requires a pack product ID");
    }

    const promoCodeId = await ctx.db.insert("promoCodes", {
      code: normalizedCode,
      description: args.description,
      rewardType: args.rewardType,
      rewardAmount: args.rewardAmount,
      rewardPackId: args.rewardPackId,
      maxRedemptions: args.maxRedemptions,
      redemptionCount: 0,
      expiresAt: args.expiresAt,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_promo_code",
      metadata: {
        promoCodeId,
        code: normalizedCode,
        rewardType: args.rewardType,
        rewardAmount: args.rewardAmount,
      },
      success: true,
    });

    return { promoCodeId, message: `Created promo code "${normalizedCode}"` };
  },
});

/**
 * Update an existing promo code
 */
export const updatePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
    description: v.optional(v.string()),
    rewardAmount: v.optional(v.number()),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    clearMaxRedemptions: v.optional(v.boolean()),
    clearExpiresAt: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const code = await ctx.db.get(args.promoCodeId);
    if (!code) {
      throw new Error("Promo code not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (args.description !== undefined) updates.description = args.description;
    if (args.rewardAmount !== undefined) updates.rewardAmount = args.rewardAmount;
    if (args.rewardPackId !== undefined) updates.rewardPackId = args.rewardPackId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Handle clearing optional fields
    if (args.clearMaxRedemptions) {
      updates.maxRedemptions = undefined;
    } else if (args.maxRedemptions !== undefined) {
      updates.maxRedemptions = args.maxRedemptions;
    }

    if (args.clearExpiresAt) {
      updates.expiresAt = undefined;
    } else if (args.expiresAt !== undefined) {
      updates.expiresAt = args.expiresAt;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.promoCodeId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_promo_code",
      metadata: {
        promoCodeId: args.promoCodeId,
        code: code.code,
        updates: Object.keys(updates),
      },
      success: true,
    });

    return { success: true, message: `Updated promo code "${code.code}"` };
  },
});

/**
 * Toggle promo code active status
 */
export const togglePromoCodeActive = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, { promoCodeId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const code = await ctx.db.get(promoCodeId);
    if (!code) {
      throw new Error("Promo code not found");
    }

    const newStatus = !code.isActive;
    await ctx.db.patch(promoCodeId, { isActive: newStatus });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_promo_code" : "deactivate_promo_code",
      metadata: {
        promoCodeId,
        code: code.code,
        previousStatus: code.isActive,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Promo code "${code.code}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete a promo code permanently
 */
export const deletePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, { promoCodeId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const code = await ctx.db.get(promoCodeId);
    if (!code) {
      throw new Error("Promo code not found");
    }

    // Check if there are redemptions
    const hasRedemptions = await ctx.db
      .query("promoRedemptions")
      .withIndex("by_code", (q) => q.eq("promoCodeId", promoCodeId))
      .first();

    if (hasRedemptions) {
      throw new Error(
        "Cannot delete promo code with redemption history. Deactivate it instead."
      );
    }

    await ctx.db.delete(promoCodeId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_promo_code",
      metadata: {
        promoCodeId,
        code: code.code,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted promo code "${code.code}"` };
  },
});

/**
 * Generate random promo codes in bulk
 */
export const bulkGeneratePromoCodes = mutation({
  args: {
    prefix: v.string(),
    count: v.number(),
    description: v.string(),
    rewardType: rewardTypeValidator,
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    if (args.count < 1 || args.count > 100) {
      throw new Error("Count must be between 1 and 100");
    }

    // Validate pack reward
    if (args.rewardType === "pack" && !args.rewardPackId) {
      throw new Error("Pack reward type requires a pack product ID");
    }

    const now = Date.now();
    const createdCodes: string[] = [];
    const prefix = args.prefix.toUpperCase().trim();

    for (let i = 0; i < args.count; i++) {
      // Generate random suffix (6 alphanumeric characters)
      const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `${prefix}-${suffix}`;

      // Check for collision (unlikely but possible)
      const existing = await ctx.db
        .query("promoCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();

      if (!existing) {
        await ctx.db.insert("promoCodes", {
          code,
          description: args.description,
          rewardType: args.rewardType,
          rewardAmount: args.rewardAmount,
          rewardPackId: args.rewardPackId,
          maxRedemptions: args.maxRedemptions ?? 1, // Default to single use
          redemptionCount: 0,
          expiresAt: args.expiresAt,
          isActive: true,
          createdAt: now,
        });
        createdCodes.push(code);
      }
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "bulk_generate_promo_codes",
      metadata: {
        prefix,
        requestedCount: args.count,
        createdCount: createdCodes.length,
        rewardType: args.rewardType,
        rewardAmount: args.rewardAmount,
      },
      success: true,
    });

    return {
      success: true,
      codes: createdCodes,
      message: `Generated ${createdCodes.length} promo codes`,
    };
  },
});

/**
 * Export promo codes for distribution (returns codes as list)
 */
export const exportPromoCodes = query({
  args: {
    onlyActive: v.optional(v.boolean()),
    onlyUnused: v.optional(v.boolean()),
    prefix: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let codes = await ctx.db.query("promoCodes").collect();

    // Filter by active status
    if (args.onlyActive) {
      codes = codes.filter((c) => c.isActive);
    }

    // Filter by unused
    if (args.onlyUnused) {
      codes = codes.filter((c) => c.redemptionCount === 0);
    }

    // Filter by prefix
    if (args.prefix) {
      const prefixUpper = args.prefix.toUpperCase();
      codes = codes.filter((c) => c.code.startsWith(prefixUpper));
    }

    return codes.map((c) => ({
      code: c.code,
      description: c.description,
      rewardType: c.rewardType,
      rewardAmount: c.rewardAmount,
      redemptionCount: c.redemptionCount,
      maxRedemptions: c.maxRedemptions,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
    }));
  },
});
