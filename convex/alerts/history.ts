/**
 * Alert History Management
 *
 * Query and manage alert history.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * Get recent alert history
 */
export const getRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_created")
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with rule info
    const enriched = await Promise.all(
      history.map(async (h) => {
        const rule = await ctx.db.get(h.ruleId);
        return {
          ...h,
          ruleName: rule?.name ?? "Unknown",
          ruleType: rule?.triggerType,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get alert history by rule
 */
export const getByRule = query({
  args: {
    ruleId: v.id("alertRules"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("alertHistory")
      .withIndex("by_rule", (q) => q.eq("ruleId", args.ruleId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get unacknowledged alerts
 */
export const getUnacknowledged = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const history = await ctx.db
      .query("alertHistory")
      .withIndex("by_created")
      .order("desc")
      .collect();

    const unacked = history.filter((h) => !h.acknowledgedBy);

    // Enrich with rule info
    const enriched = await Promise.all(
      unacked.map(async (h) => {
        const rule = await ctx.db.get(h.ruleId);
        return {
          ...h,
          ruleName: rule?.name ?? "Unknown",
          ruleType: rule?.triggerType,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get alert stats
 */
export const getStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const days = args.days ?? 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const history = await ctx.db.query("alertHistory").withIndex("by_created").collect();
    const filtered = history.filter((h) => h.createdAt >= since);

    const bySeverity = {
      info: filtered.filter((h) => h.severity === "info").length,
      warning: filtered.filter((h) => h.severity === "warning").length,
      critical: filtered.filter((h) => h.severity === "critical").length,
    };

    const acknowledged = filtered.filter((h) => h.acknowledgedBy).length;

    return {
      totalAlerts: filtered.length,
      bySeverity,
      acknowledged,
      unacknowledged: filtered.length - acknowledged,
      avgPerDay: filtered.length / days,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Acknowledge an alert
 */
export const acknowledge = mutation({
  args: {
    alertId: v.id("alertHistory"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    if (alert.acknowledgedBy) {
      return { success: false, message: "Already acknowledged" };
    }

    await ctx.db.patch(args.alertId, {
      acknowledgedBy: userId,
      acknowledgedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Acknowledge all unacknowledged alerts
 */
export const acknowledgeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const history = await ctx.db.query("alertHistory").collect();
    const unacked = history.filter((h) => !h.acknowledgedBy);

    let count = 0;
    for (const alert of unacked) {
      await ctx.db.patch(alert._id, {
        acknowledgedBy: userId,
        acknowledgedAt: Date.now(),
      });
      count++;
    }

    return { success: true, acknowledged: count };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Record a new alert in history
 */
export const record = internalMutation({
  args: {
    ruleId: v.id("alertRules"),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    channelsNotified: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("alertHistory", {
      ruleId: args.ruleId,
      severity: args.severity,
      title: args.title,
      message: args.message,
      data: args.data,
      channelsNotified: args.channelsNotified,
      createdAt: Date.now(),
    });
  },
});
