import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// TODO: userPresence table was removed from schema
// These functions need to be reimplemented or removed
// const presenceReturnValidator = v.object({
//   _id: v.string(),
//   _creationTime: v.number(),
//   userId: v.string(),
//   status: v.string(),
//   lastSeen: v.number(),
//   currentActivity: v.optional(v.string()),
//   metadata: v.optional(v.any()),
// });

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

// TODO: userPresence table removed - reimplemented needed
// export const updatePresence = mutation({
//   args: {
//     userId: v.string(),
//     status: v.string(),
//     currentActivity: v.optional(v.string()),
//     metadata: v.optional(v.any()),
//   },
//   returns: v.string(),
//   handler: async (ctx, args) => {
//     throw new Error("userPresence table removed - needs reimplementation");
//   },
// });

// TODO: userPresence table removed - reimplemented needed
// export const getPresence = query({
//   args: {
//     userId: v.string(),
//   },
//   returns: v.union(presenceReturnValidator, v.null()),
//   handler: async (ctx, args) => {
//     throw new Error("userPresence table removed - needs reimplementation");
//   },
// });

// TODO: userPresence table removed - reimplemented needed
// export const getBulkPresence = query({
//   args: {
//     userIds: v.array(v.string()),
//   },
//   returns: v.array(presenceReturnValidator),
//   handler: async (ctx, args) => {
//     throw new Error("userPresence table removed - needs reimplementation");
//   },
// });

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
