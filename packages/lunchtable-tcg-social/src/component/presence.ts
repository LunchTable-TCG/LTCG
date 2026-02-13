import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const presenceReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  status: v.string(),
  lastSeen: v.number(),
  currentActivity: v.optional(v.string()),
  metadata: v.optional(v.any()),
});

const notificationReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  userId: v.string(),
  type: v.string(),
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  createdAt: v.number(),
  data: v.optional(v.any()),
  metadata: v.optional(v.any()),
});

export const updatePresence = mutation({
  args: {
    userId: v.string(),
    status: v.string(),
    currentActivity: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        lastSeen: Date.now(),
        currentActivity: args.currentActivity,
        metadata: args.metadata,
      });
      return existing._id as string;
    }

    const id = await ctx.db.insert("userPresence", {
      userId: args.userId,
      status: args.status,
      lastSeen: Date.now(),
      currentActivity: args.currentActivity,
      metadata: args.metadata,
    });

    return id as string;
  },
});

export const getPresence = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(presenceReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (!presence) return null;

    return {
      ...presence,
      _id: presence._id as string,
    };
  },
});

export const getBulkPresence = query({
  args: {
    userIds: v.array(v.string()),
  },
  returns: v.array(presenceReturnValidator),
  handler: async (ctx, args) => {
    const presences = [];

    for (const userId of args.userIds) {
      const presence = await ctx.db
        .query("userPresence")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();

      if (presence) {
        presences.push({
          ...presence,
          _id: presence._id as string,
        });
      }
    }

    return presences;
  },
});

export const createNotification = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    metadata: v.optional(v.any()),
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
      metadata: args.metadata,
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
