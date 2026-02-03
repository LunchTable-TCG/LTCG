/**
 * Launch Checklist Management
 *
 * Track pre-launch checklist items across categories.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const checklistCategoryValidator = v.union(
  v.literal("treasury"),
  v.literal("token"),
  v.literal("marketing"),
  v.literal("technical"),
  v.literal("team")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all checklist items
 */
export const getAll = query({
  args: {
    category: v.optional(checklistCategoryValidator),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    let items;
    if (args.category) {
      items = await ctx.db
        .query("launchChecklist")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      items = await ctx.db.query("launchChecklist").collect();
    }

    // Sort by order within each category
    items.sort((a, b) => {
      if (a.category !== b.category) {
        const categoryOrder = ["treasury", "token", "marketing", "technical", "team"];
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      }
      return a.order - b.order;
    });

    return items;
  },
});

/**
 * Get checklist summary by category
 */
export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const items = await ctx.db.query("launchChecklist").collect();

    const categories = ["treasury", "token", "marketing", "technical", "team"] as const;
    const summary: Record<
      string,
      { total: number; completed: number; required: number; requiredCompleted: number }
    > = {};

    for (const category of categories) {
      const categoryItems = items.filter((i) => i.category === category);
      const requiredItems = categoryItems.filter((i) => i.isRequired);

      summary[category] = {
        total: categoryItems.length,
        completed: categoryItems.filter((i) => i.isCompleted).length,
        required: requiredItems.length,
        requiredCompleted: requiredItems.filter((i) => i.isCompleted).length,
      };
    }

    const totalItems = items.length;
    const totalCompleted = items.filter((i) => i.isCompleted).length;
    const totalRequired = items.filter((i) => i.isRequired).length;
    const totalRequiredCompleted = items.filter((i) => i.isRequired && i.isCompleted).length;

    return {
      byCategory: summary,
      overall: {
        total: totalItems,
        completed: totalCompleted,
        required: totalRequired,
        requiredCompleted: totalRequiredCompleted,
        percentComplete: totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0,
        allRequiredComplete: totalRequiredCompleted === totalRequired,
      },
    };
  },
});

/**
 * Check if all required items are complete
 */
export const isReadyForLaunch = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const items = await ctx.db.query("launchChecklist").collect();
    const requiredItems = items.filter((i) => i.isRequired);
    const incompleteRequired = requiredItems.filter((i) => !i.isCompleted);

    return {
      ready: incompleteRequired.length === 0,
      incompleteItems: incompleteRequired.map((i) => ({
        id: i._id,
        category: i.category,
        item: i.item,
      })),
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Add a checklist item
 */
export const addItem = mutation({
  args: {
    category: checklistCategoryValidator,
    item: v.string(),
    description: v.optional(v.string()),
    isRequired: v.boolean(),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Get max order for category if not specified
    let order = args.order;
    if (order === undefined) {
      const items = await ctx.db
        .query("launchChecklist")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
      order = items.length > 0 ? Math.max(...items.map((i) => i.order)) + 1 : 0;
    }

    const itemId = await ctx.db.insert("launchChecklist", {
      category: args.category,
      item: args.item,
      description: args.description,
      isRequired: args.isRequired,
      isCompleted: false,
      order,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.checklist.add",
      metadata: { itemId, category: args.category, item: args.item },
      success: true,
    });

    return itemId;
  },
});

/**
 * Mark item as complete
 */
export const completeItem = mutation({
  args: {
    itemId: v.id("launchChecklist"),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Checklist item not found");
    }

    await ctx.db.patch(args.itemId, {
      isCompleted: true,
      completedBy: userId,
      completedAt: Date.now(),
      evidence: args.evidence,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.checklist.complete",
      metadata: { itemId: args.itemId, item: item.item },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Mark item as incomplete
 */
export const uncompleteItem = mutation({
  args: {
    itemId: v.id("launchChecklist"),
  },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error("Checklist item not found");
    }

    await ctx.db.patch(itemId, {
      isCompleted: false,
      completedBy: undefined,
      completedAt: undefined,
      evidence: undefined,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.checklist.uncomplete",
      metadata: { itemId, item: item.item },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete a checklist item
 */
export const deleteItem = mutation({
  args: {
    itemId: v.id("launchChecklist"),
  },
  handler: async (ctx, { itemId }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const item = await ctx.db.get(itemId);
    if (!item) {
      throw new Error("Checklist item not found");
    }

    await ctx.db.delete(itemId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.checklist.delete",
      metadata: { itemId, item: item.item },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Setup default checklist items
 */
export const setupDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existing = await ctx.db.query("launchChecklist").collect();
    if (existing.length > 0) {
      return { message: "Checklist already has items", count: existing.length };
    }

    const defaultItems = [
      // Treasury
      { category: "treasury", item: "Fee collection wallet created", isRequired: true, order: 0 },
      { category: "treasury", item: "Distribution wallet created", isRequired: true, order: 1 },
      { category: "treasury", item: "Treasury funded with launch SOL", isRequired: true, order: 2 },
      { category: "treasury", item: "Spending policies configured", isRequired: false, order: 3 },

      // Token
      { category: "token", item: "Token name and symbol finalized", isRequired: true, order: 0 },
      { category: "token", item: "Token description written", isRequired: true, order: 1 },
      { category: "token", item: "Token image uploaded", isRequired: true, order: 2 },
      { category: "token", item: "Token marked as ready", isRequired: true, order: 3 },

      // Marketing
      { category: "marketing", item: "Twitter account ready", isRequired: false, order: 0 },
      { category: "marketing", item: "Telegram group created", isRequired: false, order: 1 },
      { category: "marketing", item: "Discord server ready", isRequired: false, order: 2 },
      { category: "marketing", item: "Launch announcement drafted", isRequired: true, order: 3 },
      { category: "marketing", item: "Influencer outreach complete", isRequired: false, order: 4 },

      // Technical
      { category: "technical", item: "Helius webhook configured", isRequired: true, order: 0 },
      { category: "technical", item: "Alert channels configured", isRequired: true, order: 1 },
      { category: "technical", item: "Analytics dashboard tested", isRequired: false, order: 2 },
      { category: "technical", item: "Backup RPC configured", isRequired: false, order: 3 },

      // Team
      { category: "team", item: "Team briefed on launch plan", isRequired: true, order: 0 },
      { category: "team", item: "Emergency contacts documented", isRequired: true, order: 1 },
      { category: "team", item: "Launch roles assigned", isRequired: true, order: 2 },
      {
        category: "team",
        item: "Post-launch monitoring schedule set",
        isRequired: false,
        order: 3,
      },
    ];

    let count = 0;
    for (const item of defaultItems) {
      await ctx.db.insert("launchChecklist", {
        category: item.category as any,
        item: item.item,
        isRequired: item.isRequired,
        isCompleted: false,
        order: item.order,
      });
      count++;
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "launch.checklist.setup_defaults",
      metadata: { itemsCreated: count },
      success: true,
    });

    return { message: "Default checklist created", count };
  },
});
