import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get notifications for an admin, optionally only unread.
 */
export const getNotifications = query({
  args: {
    adminId: v.string(),
    unreadOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.unreadOnly) {
      return await ctx.db
        .query("adminNotifications")
        .withIndex("by_admin_read", (q) =>
          q.eq("adminId", args.adminId).eq("isRead", false)
        )
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin", (q) => q.eq("adminId", args.adminId))
      .order("desc")
      .take(100);
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a notification for an admin.
 */
export const createNotification = mutation({
  args: {
    adminId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("alert"), v.literal("system"), v.literal("action_required")),
    alertHistoryId: v.optional(v.id("alertHistory")),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("adminNotifications", {
      adminId: args.adminId,
      title: args.title,
      message: args.message,
      type: args.type,
      alertHistoryId: args.alertHistoryId,
      isRead: false,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Mark a single notification as read.
 */
export const markAsRead = mutation({
  args: { notificationId: v.id("adminNotifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

/**
 * Mark all notifications as read for an admin.
 */
export const markAllAsRead = mutation({
  args: { adminId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("adminNotifications")
      .withIndex("by_admin_read", (q) =>
        q.eq("adminId", args.adminId).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return unread.length;
  },
});
