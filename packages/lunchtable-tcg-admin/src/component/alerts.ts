import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const severityValidator = v.union(
  v.literal("info"),
  v.literal("warning"),
  v.literal("critical")
);

const triggerTypeValidator = v.union(
  v.literal("price_change"),
  v.literal("price_threshold"),
  v.literal("volume_spike"),
  v.literal("whale_activity"),
  v.literal("holder_milestone"),
  v.literal("bonding_progress"),
  v.literal("treasury_balance"),
  v.literal("transaction_failed"),
  v.literal("graduation"),
  v.literal("integrity_violation")
);

const channelTypeValidator = v.union(
  v.literal("in_app"),
  v.literal("push"),
  v.literal("slack"),
  v.literal("discord"),
  v.literal("email")
);

// ============================================================================
// ALERT RULES
// ============================================================================

/**
 * Create a new alert rule.
 */
export const createAlertRule = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    triggerType: triggerTypeValidator,
    conditions: v.object({
      threshold: v.optional(v.number()),
      direction: v.optional(
        v.union(v.literal("above"), v.literal("below"), v.literal("change"))
      ),
      timeframeMinutes: v.optional(v.number()),
      percentChange: v.optional(v.number()),
    }),
    severity: severityValidator,
    cooldownMinutes: v.number(),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("alertRules", {
      name: args.name,
      description: args.description,
      isEnabled: args.isEnabled,
      triggerType: args.triggerType,
      conditions: args.conditions,
      severity: args.severity,
      cooldownMinutes: args.cooldownMinutes,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * List alert rules, optionally filtered by enabled state.
 */
export const listAlertRules = query({
  args: { enabled: v.optional(v.boolean()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.enabled !== undefined) {
      return await ctx.db
        .query("alertRules")
        .withIndex("by_enabled", (q) => q.eq("isEnabled", args.enabled!))
        .collect();
    }
    return await ctx.db.query("alertRules").collect();
  },
});

/**
 * Trigger an alert for a rule (checks cooldown, creates history).
 */
export const triggerAlert = mutation({
  args: {
    ruleId: v.id("alertRules"),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const rule = await ctx.db.get(args.ruleId);
    if (!rule || !rule.isEnabled) return null;

    // Check cooldown
    if (rule.lastTriggeredAt) {
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      if (Date.now() - rule.lastTriggeredAt < cooldownMs) {
        return null; // In cooldown
      }
    }

    // Get enabled channels
    const channels = await ctx.db
      .query("alertChannels")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    const severityLevels: Record<string, number> = {
      info: 0,
      warning: 1,
      critical: 2,
    };

    const notifiedChannels = channels
      .filter((ch) => {
        const minLevel = severityLevels[ch.config.minSeverity] ?? 0;
        const alertLevel = severityLevels[rule.severity] ?? 0;
        return alertLevel >= minLevel;
      })
      .map((ch) => ch.name);

    // Create history entry
    const historyId = await ctx.db.insert("alertHistory", {
      ruleId: args.ruleId,
      severity: rule.severity,
      title: args.title,
      message: args.message,
      data: args.data,
      channelsNotified: notifiedChannels,
      createdAt: Date.now(),
    });

    // Update last triggered
    await ctx.db.patch(args.ruleId, {
      lastTriggeredAt: Date.now(),
    });

    return historyId;
  },
});

/**
 * Acknowledge an alert.
 */
export const acknowledgeAlert = mutation({
  args: {
    alertHistoryId: v.id("alertHistory"),
    acknowledgedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.alertHistoryId, {
      acknowledgedBy: args.acknowledgedBy,
      acknowledgedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Get alert history with optional filtering.
 */
export const getAlertHistory = query({
  args: {
    ruleId: v.optional(v.id("alertRules")),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.ruleId) {
      return await ctx.db
        .query("alertHistory")
        .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId! as Id<"alertRules">))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("alertHistory")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

// ============================================================================
// ALERT CHANNELS
// ============================================================================

/**
 * Create an alert channel.
 */
export const createAlertChannel = mutation({
  args: {
    type: channelTypeValidator,
    name: v.string(),
    isEnabled: v.boolean(),
    config: v.object({
      webhookUrl: v.optional(v.string()),
      email: v.optional(v.string()),
      minSeverity: severityValidator,
    }),
    createdBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("alertChannels", {
      type: args.type,
      name: args.name,
      isEnabled: args.isEnabled,
      config: args.config,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * List all alert channels.
 */
export const listAlertChannels = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("alertChannels").collect();
  },
});
