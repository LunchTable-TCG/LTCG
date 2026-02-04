/**
 * Admin Notifications Management
 *
 * In-app notifications for admin users.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// Validators
const notificationTypeValidator = v.union(
  v.literal("alert"),
  v.literal("system"),
  v.literal("action_required")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * Get current user's notifications
 */
export const getMy = query({
  args: {
    unreadOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    if (args.unreadOnly) {
      return await ctx.db
        .query("adminNotifications")
        .withIndex("by_admin_read", (q) => q.eq("adminId", userId).eq("isRead", false))
        .order("desc")
        .take(args.limit ?? 50);
    }

    return await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const unread = await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin_read", (q) => q.eq("adminId", userId).eq("isRead", false))
      .collect();

    return unread.length;
  },
});

/**
 * Get notifications with alert details
 */
export const getWithAlertDetails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const notifications = await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .order("desc")
      .take(args.limit ?? 50);

    // Enrich with alert history details if available
    const enriched = await Promise.all(
      notifications.map(async (n) => {
        if (n.alertHistoryId) {
          const alertHistory = await ctx.db.get(n.alertHistoryId);
          if (alertHistory) {
            const rule = await ctx.db.get(alertHistory.ruleId);
            return {
              ...n,
              alertDetails: {
                severity: alertHistory.severity,
                data: alertHistory.data,
                ruleName: rule?.name,
              },
            };
          }
        }
        return n;
      })
    );

    return enriched;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Mark notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("adminNotifications"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.adminId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, { isRead: true });

    return { success: true };
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const unread = await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin_read", (q) => q.eq("adminId", userId).eq("isRead", false))
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return { success: true, count: unread.length };
  },
});

/**
 * Delete a notification
 */
export const remove = mutation({
  args: {
    notificationId: v.id("adminNotifications"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.adminId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.notificationId);

    return { success: true };
  },
});

/**
 * Clear all notifications
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const all = await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin", (q) => q.eq("adminId", userId))
      .collect();

    for (const notification of all) {
      await ctx.db.delete(notification._id);
    }

    return { success: true, count: all.length };
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Create a notification for an admin
 */
export const create = internalMutation({
  args: {
    adminId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: notificationTypeValidator,
    alertHistoryId: v.optional(v.id("alertHistory")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("adminNotifications", {
      adminId: args.adminId,
      alertHistoryId: args.alertHistoryId,
      title: args.title,
      message: args.message,
      type: args.type,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create notifications for all admins
 */
export const createForAllAdmins = internalMutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: notificationTypeValidator,
    alertHistoryId: v.optional(v.id("alertHistory")),
  },
  handler: async (ctx, args) => {
    // Get all active admins
    const adminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "admin").eq("isActive", true))
      .collect();

    const superadminRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_role", (q) => q.eq("role", "superadmin").eq("isActive", true))
      .collect();

    const allAdmins = [...adminRoles, ...superadminRoles];
    const adminIds = new Set(allAdmins.map((r) => r.userId));

    let count = 0;
    for (const adminId of adminIds) {
      await ctx.db.insert("adminNotifications", {
        adminId,
        alertHistoryId: args.alertHistoryId,
        title: args.title,
        message: args.message,
        type: args.type,
        isRead: false,
        createdAt: Date.now(),
      });
      count++;
    }

    return { created: count };
  },
});
