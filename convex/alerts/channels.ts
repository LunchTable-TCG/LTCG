/**
 * Alert Channels Management
 *
 * Create and manage notification channels for alerts.
 */

import { v } from "convex/values";
import { internalAction, query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";

// Import internal separately to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround to avoid TS2589
const internal: any = require("../_generated/api").internal;
import { requireRole } from "../lib/roles";

// Validators
const channelTypeValidator = v.union(
  v.literal("in_app"),
  v.literal("push"),
  v.literal("slack"),
  v.literal("discord"),
  v.literal("email")
);

const severityValidator = v.union(v.literal("info"), v.literal("warning"), v.literal("critical"));

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all alert channels
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
        .query("alertChannels")
        .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
        .collect();
    }

    return await ctx.db.query("alertChannels").collect();
  },
});

/**
 * Get channels by type
 */
export const getByType = query({
  args: {
    type: channelTypeValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    return await ctx.db
      .query("alertChannels")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

/**
 * Get enabled channels for a severity level
 */
export const getForSeverity = query({
  args: {
    severity: severityValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const channels = await ctx.db
      .query("alertChannels")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    const severityOrder = { info: 0, warning: 1, critical: 2 };
    const targetLevel = severityOrder[args.severity];

    return channels.filter((c) => {
      const channelLevel = severityOrder[c.config.minSeverity];
      return targetLevel >= channelLevel;
    });
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new alert channel
 */
export const create = mutation({
  args: {
    type: channelTypeValidator,
    name: v.string(),
    config: v.object({
      webhookUrl: v.optional(v.string()),
      email: v.optional(v.string()),
      minSeverity: severityValidator,
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate config based on type
    if ((args.type === "slack" || args.type === "discord") && !args.config.webhookUrl) {
      throw new Error(`${args.type} channel requires a webhook URL`);
    }
    if (args.type === "email" && !args.config.email) {
      throw new Error("Email channel requires an email address");
    }

    const channelId = await ctx.db.insert("alertChannels", {
      type: args.type,
      name: args.name,
      isEnabled: true,
      config: args.config,
      createdBy: userId,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.channel.create",
      metadata: { channelId, type: args.type, name: args.name },
      success: true,
    });

    return channelId;
  },
});

/**
 * Update an alert channel
 */
export const update = mutation({
  args: {
    channelId: v.id("alertChannels"),
    name: v.optional(v.string()),
    config: v.optional(
      v.object({
        webhookUrl: v.optional(v.string()),
        email: v.optional(v.string()),
        minSeverity: severityValidator,
      })
    ),
    isEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Alert channel not found");
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates["name"] = args.name;
    if (args.config !== undefined) updates["config"] = args.config;
    if (args.isEnabled !== undefined) updates["isEnabled"] = args.isEnabled;

    await ctx.db.patch(args.channelId, updates);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.channel.update",
      metadata: { channelId: args.channelId, updates },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Delete an alert channel
 */
export const remove = mutation({
  args: {
    channelId: v.id("alertChannels"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Alert channel not found");
    }

    await ctx.db.delete(args.channelId);

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.channel.delete",
      metadata: { channelId: args.channelId, name: channel.name },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Test a channel by sending a test notification
 */
export const test = mutation({
  args: {
    channelId: v.id("alertChannels"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Alert channel not found");
    }

    // Schedule the test notification
    await ctx.scheduler.runAfter(0, internal.alerts.channels.sendTestNotificationAction, {
      channelId: args.channelId,
      channelType: channel.type,
      webhookUrl: channel.config.webhookUrl,
      email: channel.config.email,
    });

    return { success: true, message: "Test notification scheduled" };
  },
});

/**
 * Setup default channels
 */
export const setupDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const existing = await ctx.db.query("alertChannels").collect();
    if (existing.length > 0) {
      return { message: "Alert channels already configured", count: existing.length };
    }

    // Create default in-app channel
    await ctx.db.insert("alertChannels", {
      type: "in_app",
      name: "In-App Notifications",
      isEnabled: true,
      config: { minSeverity: "info" },
      createdBy: userId,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "alert.channels.setup_defaults",
      metadata: { channelsCreated: 1 },
      success: true,
    });

    return { message: "Default alert channel created", count: 1 };
  },
});

// =============================================================================
// Internal Actions (External API calls)
// =============================================================================

/**
 * Send test notification to a channel
 */
export const sendTestNotificationAction = internalAction({
  args: {
    channelId: v.id("alertChannels"),
    channelType: v.string(),
    webhookUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const testMessage = {
      title: "Test Alert",
      message: "This is a test notification from the LTCG Alert System.",
      severity: "info",
      timestamp: new Date().toISOString(),
    };

    try {
      if (args.channelType === "slack" && args.webhookUrl) {
        await fetch(args.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${testMessage.title}*\n${testMessage.message}`,
            attachments: [
              {
                color: "#36a64f",
                fields: [
                  { title: "Severity", value: testMessage.severity, short: true },
                  { title: "Time", value: testMessage.timestamp, short: true },
                ],
              },
            ],
          }),
        });
      } else if (args.channelType === "discord" && args.webhookUrl) {
        await fetch(args.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: testMessage.title,
                description: testMessage.message,
                color: 0x36a64f,
                fields: [
                  { name: "Severity", value: testMessage.severity, inline: true },
                  { name: "Time", value: testMessage.timestamp, inline: true },
                ],
              },
            ],
          }),
        });
      }

      console.log(`Test notification sent to ${args.channelType} channel ${args.channelId}`);
    } catch (error) {
      console.error(`Failed to send test notification to channel ${args.channelId}:`, error);
    }
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Send alert to all enabled channels matching severity
 */
export const sendToChannels = internalMutation({
  args: {
    severity: severityValidator,
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const channels = await ctx.db
      .query("alertChannels")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();

    const severityOrder = { info: 0, warning: 1, critical: 2 };
    const targetLevel = severityOrder[args.severity];

    const channelsToNotify = channels.filter((c) => {
      const channelLevel = severityOrder[c.config.minSeverity];
      return targetLevel >= channelLevel;
    });

    // Schedule notifications for external channels
    for (const channel of channelsToNotify) {
      if (channel.type === "slack" || channel.type === "discord") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.scheduler.runAfter(
          0,
          // biome-ignore lint/suspicious/noExplicitAny: Scheduler requires flexible internal API access
          (internal as any).alerts.channels.sendExternalNotificationAction,
          {
            channelType: channel.type,
            webhookUrl: channel.config.webhookUrl!,
            title: args.title,
            message: args.message,
            severity: args.severity,
            data: args.data,
          }
        );
      }
    }

    return channelsToNotify.map((c) => c.type);
  },
});

/**
 * Send notification to external channel
 */
export const sendExternalNotificationAction = internalAction({
  args: {
    channelType: v.string(),
    webhookUrl: v.string(),
    title: v.string(),
    message: v.string(),
    severity: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    const severityColors: Record<string, { slack: string; discord: number }> = {
      info: { slack: "#36a64f", discord: 0x36a64f },
      warning: { slack: "#f0ad4e", discord: 0xf0ad4e },
      critical: { slack: "#d9534f", discord: 0xd9534f },
    };

    const color = severityColors[args.severity] ?? severityColors["info"]!;

    try {
      if (args.channelType === "slack") {
        await fetch(args.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `*${args.title}*`,
            attachments: [
              {
                color: color.slack,
                text: args.message,
                fields: [
                  { title: "Severity", value: args.severity.toUpperCase(), short: true },
                  { title: "Time", value: new Date().toISOString(), short: true },
                ],
              },
            ],
          }),
        });
      } else if (args.channelType === "discord") {
        await fetch(args.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [
              {
                title: args.title,
                description: args.message,
                color: color.discord,
                fields: [
                  { name: "Severity", value: args.severity.toUpperCase(), inline: true },
                  { name: "Time", value: new Date().toISOString(), inline: true },
                ],
                footer: { text: "LTCG Alert System" },
              },
            ],
          }),
        });
      }
    } catch (error) {
      console.error(`Failed to send ${args.channelType} notification:`, error);
    }
  },
});
