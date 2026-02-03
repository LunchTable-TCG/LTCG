/**
 * Alert Rules Management
 *
 * Create and manage alert rules for monitoring token activity.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators
const triggerTypeValidator = v.union(
  v.literal("price_change"),
  v.literal("price_threshold"),
  v.literal("volume_spike"),
  v.literal("whale_activity"),
  v.literal("holder_milestone"),
  v.literal("bonding_progress"),
  v.literal("treasury_balance"),
  v.literal("transaction_failed"),
  v.literal("graduation")
);

const severityValidator = v.union(v.literal("info"), v.literal("warning"), v.literal("critical"));

const conditionsValidator = v.object({
  threshold: v.optional(v.number()),
  direction: v.optional(v.union(v.literal("above"), v.literal("below"), v.literal("change"))),
  timeframeMinutes: v.optional(v.number()),
  percentChange: v.optional(v.number()),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all alert rules
 */
export const getAll = query({
  args: {
    enabledOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    if (args.enabledOnly) {
      return await ctx.db
        .query("alertRules")
        .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
        .collect();
    }

    return await ctx.db.query("alertRules").collect();
  },
});

/**
 * Get rules by trigger type
 */
export const getByType = query({
  args: {
    triggerType: triggerTypeValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("alertRules")
      .withIndex("by_type", (q) => q.eq("triggerType", args.triggerType))
      .collect();
  },
});

/**
 * Get a single rule
 */
export const getById = query({
  args: {
    ruleId: v.id("alertRules"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db.get(args.ruleId);
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new alert rule
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    triggerType: triggerTypeValidator,
    conditions: conditionsValidator,
    severity: severityValidator,
    cooldownMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const ruleId = await ctx.db.insert("alertRules", {
      name: args.name,
      description: args.description,
      isEnabled: true,
      triggerType: args.triggerType,
      conditions: args.conditions,
      severity: args.severity,
      cooldownMinutes: args.cooldownMinutes,
      createdBy: userId,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.rule.create",
      metadata: { ruleId, name: args.name, triggerType: args.triggerType },
      success: true,
    });

    return ruleId;
  },
});

/**
 * Update an alert rule
 */
export const update = mutation({
  args: {
    ruleId: v.id("alertRules"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    conditions: v.optional(conditionsValidator),
    severity: v.optional(severityValidator),
    cooldownMinutes: v.optional(v.number()),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Alert rule not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.conditions !== undefined) updates["conditions"] = args.conditions;
    if (args.severity !== undefined) updates["severity"] = args.severity;
    if (args.cooldownMinutes !== undefined) updates["cooldownMinutes"] = args.cooldownMinutes;
    if (args.isEnabled !== undefined) updates["isEnabled"] = args.isEnabled;

    await ctx.db.patch(args.ruleId, updates);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.rule.update",
      metadata: { ruleId: args.ruleId, updates },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete an alert rule
 */
export const remove = mutation({
  args: {
    ruleId: v.id("alertRules"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Alert rule not found");
    }

    await ctx.db.delete(args.ruleId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.rule.delete",
      metadata: { ruleId: args.ruleId, name: rule.name },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Toggle rule enabled status
 */
export const toggleEnabled = mutation({
  args: {
    ruleId: v.id("alertRules"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) {
      throw new Error("Alert rule not found");
    }

    await ctx.db.patch(args.ruleId, {
      isEnabled: !rule.isEnabled,
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: rule.isEnabled ? "alert.rule.disable" : "alert.rule.enable",
      metadata: { ruleId: args.ruleId },
      success: true,
    });

    return { success: true, isEnabled: !rule.isEnabled };
  },
});

/**
 * Setup default alert rules
 */
export const setupDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existing = await ctx.db.query("alertRules").collect();
    if (existing.length > 0) {
      return { message: "Alert rules already configured", count: existing.length };
    }

    const defaultRules = [
      {
        name: "Large Buy Alert",
        description: "Alert on buys over 1 SOL",
        triggerType: "whale_activity" as const,
        conditions: { threshold: 1_000_000_000, direction: "above" as const },
        severity: "warning" as const,
        cooldownMinutes: 5,
      },
      {
        name: "Price Drop Alert",
        description: "Alert on 10%+ price drop in 1 hour",
        triggerType: "price_change" as const,
        conditions: { percentChange: -10, timeframeMinutes: 60 },
        severity: "critical" as const,
        cooldownMinutes: 30,
      },
      {
        name: "Price Pump Alert",
        description: "Alert on 20%+ price increase in 1 hour",
        triggerType: "price_change" as const,
        conditions: { percentChange: 20, timeframeMinutes: 60 },
        severity: "info" as const,
        cooldownMinutes: 30,
      },
      {
        name: "Holder Milestone",
        description: "Alert at holder milestones (100, 500, 1000, etc.)",
        triggerType: "holder_milestone" as const,
        conditions: { threshold: 100 },
        severity: "info" as const,
        cooldownMinutes: 60,
      },
      {
        name: "Graduation Alert",
        description: "Alert when bonding curve reaches 80%+",
        triggerType: "bonding_progress" as const,
        conditions: { threshold: 80, direction: "above" as const },
        severity: "critical" as const,
        cooldownMinutes: 60,
      },
      {
        name: "Token Graduated",
        description: "Alert when token graduates to Raydium",
        triggerType: "graduation" as const,
        conditions: {},
        severity: "critical" as const,
        cooldownMinutes: 0,
      },
      {
        name: "Low Treasury Balance",
        description: "Alert when treasury SOL balance is low",
        triggerType: "treasury_balance" as const,
        conditions: { threshold: 100_000_000, direction: "below" as const },
        severity: "warning" as const,
        cooldownMinutes: 60,
      },
    ];

    let count = 0;
    for (const rule of defaultRules) {
      await ctx.db.insert("alertRules", {
        ...rule,
        isEnabled: true,
        createdBy: userId,
        createdAt: Date.now(),
      });
      count++;
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.rules.setup_defaults",
      metadata: { rulesCreated: count },
      success: true,
    });

    return { message: "Default alert rules created", count };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Update last triggered timestamp (called when alert fires)
 */
export const updateLastTriggered = internalMutation({
  args: {
    ruleId: v.id("alertRules"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ruleId, {
      lastTriggeredAt: Date.now(),
    });
  },
});
