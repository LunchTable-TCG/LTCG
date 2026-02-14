import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const presenceStatusValidator = v.union(
  v.literal("online"),
  v.literal("in_game"),
  v.literal("idle")
);

const notificationReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  type: v.union(
    v.literal("achievement_unlocked"),
    v.literal("level_up"),
    v.literal("quest_completed"),
    v.literal("badge_earned")
  ),
  title: v.string(),
  message: v.string(),
  data: v.optional(v.any()),
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
});

/**
 * Update a user's presence status (upsert).
 */
export const updatePresence = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    status: presenceStatusValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        lastActiveAt: now,
        status: args.status,
      });
      return existing._id as string;
    }

    const id = await ctx.db.insert("userPresence", {
      userId: args.userId,
      username: args.username,
      lastActiveAt: now,
      status: args.status,
    });
    return id as string;
  },
});

/**
 * Get a user's presence status.
 */
export const getPresence = query({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get online users (active within the last N minutes).
 */
export const getOnlineUsers = query({
  args: {
    sinceMinutes: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const cutoff = Date.now() - (args.sinceMinutes ?? 5) * 60 * 1000;

    const users = await ctx.db
      .query("userPresence")
      .withIndex("by_last_active")
      .order("desc")
      .take(args.limit ?? 100);

    return users.filter((u) => u.lastActiveAt >= cutoff);
  },
});

export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("achievement_unlocked"),
      v.literal("level_up"),
      v.literal("quest_completed"),
      v.literal("badge_earned")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("playerNotifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
      data: args.data,
    });

    return id as string;
  },
});

export const getNotifications = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
  },
  returns: v.array(notificationReturnValidator),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("playerNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc");

    if (args.unreadOnly) {
      query = ctx.db
        .query("playerNotifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", args.userId).eq("isRead", false)
        )
        .order("desc");
    }

    const notifications = await query.take(args.limit ?? 50);

    return notifications.map((n) => ({
      ...n,
      _id: n._id as string,
    }));
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("playerNotifications"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== args.userId) {
      throw new Error("Notification does not belong to this user");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return null;
  },
});

export const clearNotifications = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("playerNotifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    return null;
  },
});
