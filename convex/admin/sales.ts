/**
 * Sales Admin Module
 *
 * CRUD operations for managing shop sales and promotions.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { SALES_CONFIG } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Sale type validator
const saleTypeValidator = v.union(
  v.literal("flash"),
  v.literal("weekend"),
  v.literal("launch"),
  v.literal("holiday"),
  v.literal("anniversary"),
  v.literal("returning")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all sales with optional filtering
 */
export const listSales = query({
  args: {
    includeInactive: v.optional(v.boolean()),
    includeExpired: v.optional(v.boolean()),
    saleType: v.optional(saleTypeValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let sales = await ctx.db.query("shopSales").collect();

    // Filter by active status
    if (!args.includeInactive) {
      sales = sales.filter((s) => s.isActive);
    }

    // Filter by expiry
    if (!args.includeExpired) {
      const now = Date.now();
      sales = sales.filter((s) => s.endsAt > now);
    }

    // Filter by type
    if (args.saleType) {
      sales = sales.filter((s) => s.saleType === args.saleType);
    }

    // Sort by start date (newest first)
    return sales.sort((a, b) => b.startsAt - a.startsAt);
  },
});

/**
 * Get a single sale by ID
 */
export const getSale = query({
  args: {
    saleDbId: v.id("shopSales"),
  },
  handler: async (ctx, { saleDbId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.get(saleDbId);
  },
});

/**
 * Get sale statistics
 */
export const getSaleStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const sales = await ctx.db.query("shopSales").collect();

    const activeSales = sales.filter((s) => s.isActive && s.startsAt <= now && s.endsAt > now);
    const upcomingSales = sales.filter((s) => s.isActive && s.startsAt > now);
    const expiredSales = sales.filter((s) => s.endsAt <= now);

    // Get total usage
    const totalUsage = sales.reduce((sum, s) => sum + s.usageCount, 0);

    // Get usage by type
    const usageByType: Record<string, number> = {};
    for (const sale of sales) {
      usageByType[sale.saleType] = (usageByType[sale.saleType] ?? 0) + sale.usageCount;
    }

    return {
      totalSales: sales.length,
      activeSales: activeSales.length,
      upcomingSales: upcomingSales.length,
      expiredSales: expiredSales.length,
      totalUsage,
      usageByType,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new sale
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
    startsAt: v.number(),
    endsAt: v.number(),
    priority: v.optional(v.number()),
    // Conditions
    minPurchaseAmount: v.optional(v.number()),
    maxUsesTotal: v.optional(v.number()),
    maxUsesPerUser: v.optional(v.number()),
    returningPlayerOnly: v.optional(v.boolean()),
    newPlayerOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Validate saleId doesn't exist
    const existing = await ctx.db
      .query("shopSales")
      .withIndex("by_sale_id", (q) => q.eq("saleId", args.saleId))
      .first();

    if (existing) {
      throw new Error(`Sale with ID "${args.saleId}" already exists`);
    }

    // Validate discount
    if (args.discountPercent !== undefined) {
      if (args.discountPercent < 0 || args.discountPercent > SALES_CONFIG.MAX_DISCOUNT_PERCENT) {
        throw new Error(`Discount must be between 0 and ${SALES_CONFIG.MAX_DISCOUNT_PERCENT}%`);
      }
    }

    // Validate dates
    if (args.endsAt <= args.startsAt) {
      throw new Error("End date must be after start date");
    }

    // Build conditions object if any conditions provided
    let conditions = undefined;
    if (
      args.minPurchaseAmount !== undefined ||
      args.maxUsesTotal !== undefined ||
      args.maxUsesPerUser !== undefined ||
      args.returningPlayerOnly !== undefined ||
      args.newPlayerOnly !== undefined
    ) {
      conditions = {
        minPurchaseAmount: args.minPurchaseAmount,
        maxUsesTotal: args.maxUsesTotal,
        maxUsesPerUser: args.maxUsesPerUser,
        returningPlayerOnly: args.returningPlayerOnly,
        newPlayerOnly: args.newPlayerOnly,
      };
    }

    const saleDbId = await ctx.db.insert("shopSales", {
      saleId: args.saleId,
      name: args.name,
      description: args.description,
      saleType: args.saleType,
      discountPercent: args.discountPercent,
      bonusCards: args.bonusCards,
      bonusGems: args.bonusGems,
      applicableProducts: args.applicableProducts,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      isActive: true,
      createdBy: adminId,
      createdAt: Date.now(),
      totalDiscountGiven: 0,
      priority: args.priority ?? 1,
      conditions,
      usageCount: 0,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_sale",
      metadata: {
        saleDbId,
        saleId: args.saleId,
        saleName: args.name,
        saleType: args.saleType,
        discountPercent: args.discountPercent,
      },
      success: true,
    });

    return { saleDbId, message: `Created sale "${args.name}"` };
  },
});

/**
 * Update an existing sale
 */
export const updateSale = mutation({
  args: {
    saleDbId: v.id("shopSales"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    discountPercent: v.optional(v.number()),
    bonusCards: v.optional(v.number()),
    bonusGems: v.optional(v.number()),
    applicableProducts: v.optional(v.array(v.string())),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    priority: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    // Conditions
    minPurchaseAmount: v.optional(v.number()),
    maxUsesTotal: v.optional(v.number()),
    maxUsesPerUser: v.optional(v.number()),
    returningPlayerOnly: v.optional(v.boolean()),
    newPlayerOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const sale = await ctx.db.get(args.saleDbId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    // Build updates
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.discountPercent !== undefined) {
      if (args.discountPercent < 0 || args.discountPercent > SALES_CONFIG.MAX_DISCOUNT_PERCENT) {
        throw new Error(`Discount must be between 0 and ${SALES_CONFIG.MAX_DISCOUNT_PERCENT}%`);
      }
      updates["discountPercent"] = args.discountPercent;
    }
    if (args.bonusCards !== undefined) updates["bonusCards"] = args.bonusCards;
    if (args.bonusGems !== undefined) updates["bonusGems"] = args.bonusGems;
    if (args.applicableProducts !== undefined)
      updates["applicableProducts"] = args.applicableProducts;
    if (args.startsAt !== undefined) updates["startsAt"] = args.startsAt;
    if (args.endsAt !== undefined) updates["endsAt"] = args.endsAt;
    if (args.priority !== undefined) updates["priority"] = args.priority;
    if (args.isActive !== undefined) updates["isActive"] = args.isActive;

    // Update conditions if any provided
    if (
      args.minPurchaseAmount !== undefined ||
      args.maxUsesTotal !== undefined ||
      args.maxUsesPerUser !== undefined ||
      args.returningPlayerOnly !== undefined ||
      args.newPlayerOnly !== undefined
    ) {
      const currentConditions = sale.conditions ?? {};
      updates["conditions"] = {
        ...currentConditions,
        ...(args.minPurchaseAmount !== undefined && { minPurchaseAmount: args.minPurchaseAmount }),
        ...(args.maxUsesTotal !== undefined && { maxUsesTotal: args.maxUsesTotal }),
        ...(args.maxUsesPerUser !== undefined && { maxUsesPerUser: args.maxUsesPerUser }),
        ...(args.returningPlayerOnly !== undefined && {
          returningPlayerOnly: args.returningPlayerOnly,
        }),
        ...(args.newPlayerOnly !== undefined && { newPlayerOnly: args.newPlayerOnly }),
      };
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.saleDbId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_sale",
      metadata: {
        saleDbId: args.saleDbId,
        saleId: sale.saleId,
        saleName: sale.name,
        updatedFields: Object.keys(updates).join(", "),
      },
      success: true,
    });

    return { success: true, message: `Updated sale "${sale.name}"` };
  },
});

/**
 * End a sale early
 */
export const endSaleEarly = mutation({
  args: {
    saleDbId: v.id("shopSales"),
  },
  handler: async (ctx, { saleDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const sale = await ctx.db.get(saleDbId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    await ctx.db.patch(saleDbId, {
      endsAt: Date.now(),
      isActive: false,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "end_sale_early",
      metadata: {
        saleDbId,
        saleId: sale.saleId,
        saleName: sale.name,
        originalEndDate: sale.endsAt,
      },
      success: true,
    });

    return { success: true, message: `Ended sale "${sale.name}" early` };
  },
});

/**
 * Toggle sale active status
 */
export const toggleSaleActive = mutation({
  args: {
    saleDbId: v.id("shopSales"),
  },
  handler: async (ctx, { saleDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const sale = await ctx.db.get(saleDbId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    const newStatus = !sale.isActive;
    await ctx.db.patch(saleDbId, { isActive: newStatus });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_sale" : "deactivate_sale",
      metadata: {
        saleDbId,
        saleId: sale.saleId,
        saleName: sale.name,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Sale "${sale.name}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete a sale permanently
 */
export const deleteSale = mutation({
  args: {
    saleDbId: v.id("shopSales"),
  },
  handler: async (ctx, { saleDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const sale = await ctx.db.get(saleDbId);
    if (!sale) {
      throw new Error("Sale not found");
    }

    await ctx.db.delete(saleDbId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_sale",
      metadata: {
        saleDbId,
        saleId: sale.saleId,
        saleName: sale.name,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted sale "${sale.name}"` };
  },
});

/**
 * Create a quick flash sale
 */
export const createFlashSale = mutation({
  args: {
    name: v.string(),
    discountPercent: v.number(),
    applicableProducts: v.array(v.string()),
    durationHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const now = Date.now();
    const durationMs =
      (args.durationHours ?? SALES_CONFIG.FLASH_SALE_DURATION_HOURS) * 60 * 60 * 1000;
    const saleId = `flash_${now}`;

    const saleDbId = await ctx.db.insert("shopSales", {
      saleId,
      name: args.name,
      description: `Flash sale! ${args.discountPercent}% off for a limited time.`,
      saleType: "flash",
      discountPercent: args.discountPercent,
      applicableProducts: args.applicableProducts,
      startsAt: now,
      endsAt: now + durationMs,
      isActive: true,
      priority: 10, // Flash sales have high priority
      usageCount: 0,
      createdBy: adminId,
      createdAt: now,
      totalDiscountGiven: 0,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_flash_sale",
      metadata: {
        saleDbId,
        saleId,
        saleName: args.name,
        discountPercent: args.discountPercent,
        durationHours: args.durationHours ?? SALES_CONFIG.FLASH_SALE_DURATION_HOURS,
      },
      success: true,
    });

    return {
      saleDbId,
      saleId,
      endsAt: now + durationMs,
      message: `Created flash sale "${args.name}"`,
    };
  },
});
