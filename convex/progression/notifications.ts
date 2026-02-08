/**
 * Player Notifications System
 *
 * Handles real-time notifications for achievements, level ups, and quest completions
 */

import { literals } from "convex-helpers/validators";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { checkRateLimitWrapper } from "../lib/rateLimit";

const notificationDocValidator = v.object({
  _id: v.id("playerNotifications"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: literals("achievement_unlocked", "level_up", "quest_completed", "badge_earned"),
  title: v.string(),
  message: v.string(),
  data: v.optional(v.any()), // Polymorphic payload varies by notification type
  isRead: v.boolean(),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
});

export type NotificationType =
  | "achievement_unlocked"
  | "level_up"
  | "quest_completed"
  | "badge_earned";

/**
 * Get unread notifications for current user
 * Returns empty array if not authenticated (no error thrown)
 */
export const getUnreadNotifications = query({
  args: {},
  returns: v.array(notificationDocValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // Not authenticated, return empty
    }

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", identity.subject))
      .first();

    if (!user) {
      return []; // User not found in DB
    }

    const notifications = await ctx.db
      .query("playerNotifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("isRead", false))
      .order("desc")
      .take(20);

    return notifications;
  },
});

/**
 * Get all recent notifications (read and unread)
 * Returns empty array if not authenticated (no error thrown)
 */
export const getAllNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(notificationDocValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // Not authenticated, return empty
    }

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", identity.subject))
      .first();

    if (!user) {
      return []; // User not found in DB
    }

    const notifications = await ctx.db
      .query("playerNotifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    return notifications;
  },
});

/**
 * Mark notification as read
 */
export const markNotificationAsRead = mutation({
  args: {
    notificationId: v.id("playerNotifications"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw createError(ErrorCode.NOTIFICATION_NOT_FOUND);
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

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

    // SECURITY: Rate limit notification reads to prevent spam
    // Max 30 reads per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "NOTIFICATION_READ", userId);

    const unreadNotifications = await ctx.db
      .query("playerNotifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: Date.now(),
      });
    }

    return { success: true, count: unreadNotifications.length };
  },
});

/**
 * Delete old notifications (internal cleanup)
 * Limits to 1000 per run to avoid mutation timeouts - cron will clean up rest over time
 */
export const cleanupOldNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Limit to 1000 per run to avoid timeouts with large datasets
    const oldNotifications = await ctx.db
      .query("playerNotifications")
      .filter((q) => q.lt(q.field("createdAt"), thirtyDaysAgo))
      .take(1000);

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { success: true, deleted: oldNotifications.length };
  },
});

/**
 * Create achievement unlock notification (internal)
 */
export const createAchievementNotification = internalMutation({
  args: {
    userId: v.id("users"),
    achievementId: v.string(),
    achievementName: v.string(),
    achievementRarity: v.string(),
    rewards: v.object({
      gold: v.optional(v.number()),
      xp: v.optional(v.number()),
      gems: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("playerNotifications", {
      userId: args.userId,
      type: "achievement_unlocked",
      title: "Achievement Unlocked!",
      message: args.achievementName,
      data: {
        achievementId: args.achievementId,
        rarity: args.achievementRarity,
        rewards: args.rewards,
      },
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create level up notification (internal)
 */
export const createLevelUpNotification = internalMutation({
  args: {
    userId: v.id("users"),
    newLevel: v.number(),
    oldLevel: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("playerNotifications", {
      userId: args.userId,
      type: "level_up",
      title: "Level Up!",
      message: `You reached level ${args.newLevel}!`,
      data: {
        newLevel: args.newLevel,
        oldLevel: args.oldLevel,
      },
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create quest completed notification (internal)
 */
export const createQuestCompletedNotification = internalMutation({
  args: {
    userId: v.id("users"),
    questName: v.string(),
    questType: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("playerNotifications", {
      userId: args.userId,
      type: "quest_completed",
      title: "Quest Completed!",
      message: args.questName,
      data: {
        questType: args.questType,
      },
      isRead: false,
      createdAt: Date.now(),
    });
  },
});

/**
 * Create badge earned notification (internal)
 */
export const createBadgeNotification = internalMutation({
  args: {
    userId: v.id("users"),
    badgeName: v.string(),
    badgeDescription: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("playerNotifications", {
      userId: args.userId,
      type: "badge_earned",
      title: "Badge Earned!",
      message: args.badgeName,
      data: {
        description: args.badgeDescription,
      },
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
