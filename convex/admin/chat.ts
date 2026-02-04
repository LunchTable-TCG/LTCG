/**
 * Chat Moderation Admin Module
 *
 * Operations for managing global chat messages and user mutes.
 * Requires moderator role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Queries
// =============================================================================

/**
 * List recent chat messages with optional filtering
 */
export const listMessages = query({
  args: {
    userId: v.optional(v.id("users")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const limit = args.limit ?? 100;
    const offset = args.offset ?? 0;

    let messages = await (async () => {
      if (args.userId) {
        return await ctx.db
          .query("globalChatMessages")
          .withIndex("by_user", (q) => q.eq("userId", args.userId!))
          .order("desc")
          .collect();
      }
      return await ctx.db.query("globalChatMessages").order("desc").collect();
    })();

    type Message = (typeof messages)[number];

    // Filter by time
    if (args.since) {
      messages = messages.filter((m: Message) => m.createdAt >= args.since!);
    }

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      messages = messages.filter(
        (m: Message) =>
          m.message.toLowerCase().includes(searchLower) ||
          m.username.toLowerCase().includes(searchLower)
      );
    }

    const totalCount = messages.length;
    const paginated = messages.slice(offset, offset + limit);

    return {
      messages: paginated,
      totalCount,
      hasMore: offset + limit < totalCount,
    };
  },
});

/**
 * Get a single message by ID
 */
export const getMessage = query({
  args: {
    messageId: v.id("globalChatMessages"),
  },
  handler: async (ctx, { messageId }) => {
    const { userId: adminId } = await requireAuthQuery(ctx);
    await requireRole(ctx, adminId, "moderator");

    const message = await ctx.db.get(messageId);
    if (!message) return null;

    // Get user info
    const user = await ctx.db.get(message.userId);

    // Get user's other recent messages
    const otherMessages = await ctx.db
      .query("globalChatMessages")
      .withIndex("by_user", (q) => q.eq("userId", message.userId))
      .order("desc")
      .take(20);

    return {
      ...message,
      user: user
        ? {
            _id: user._id,
            username: user.username,
            accountStatus: user.accountStatus,
            mutedUntil: user.mutedUntil,
          }
        : null,
      otherMessages: otherMessages.filter((m) => m._id !== messageId),
    };
  },
});

/**
 * Get chat statistics
 */
export const getChatStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get all messages for counting
    const allMessages = await ctx.db.query("globalChatMessages").collect();

    // Count messages in time periods
    const messagesLastHour = allMessages.filter((m) => m.createdAt > oneHourAgo).length;
    const messagesLast24h = allMessages.filter((m) => m.createdAt > oneDayAgo).length;

    // Count unique users who sent messages today
    const uniqueUsersToday = new Set(
      allMessages.filter((m) => m.createdAt > oneDayAgo).map((m) => m.userId)
    ).size;

    // Get currently muted users
    const mutedUsers = await ctx.db
      .query("users")
      .filter((q) => q.gt(q.field("mutedUntil"), now))
      .collect();

    return {
      totalMessages: allMessages.length,
      messagesLastHour,
      messagesLast24h,
      uniqueUsersToday,
      mutedUsersCount: mutedUsers.length,
    };
  },
});

/**
 * Get list of currently muted users
 */
export const getMutedUsers = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const now = Date.now();

    const mutedUsers = await ctx.db
      .query("users")
      .filter((q) => q.gt(q.field("mutedUntil"), now))
      .collect();

    return mutedUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      mutedUntil: u.mutedUntil,
      remainingMinutes: Math.ceil((u.mutedUntil! - now) / (1000 * 60)),
    }));
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Delete a chat message
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("globalChatMessages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Store message content for audit before deleting
    const deletedContent = message.message;
    const deletedUserId = message.userId;
    const deletedUsername = message.username;

    await ctx.db.delete(args.messageId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_chat_message",
      metadata: {
        messageId: args.messageId,
        userId: deletedUserId,
        username: deletedUsername,
        messageContent: deletedContent.substring(0, 100), // Truncate for audit
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: "Message deleted",
    };
  },
});

/**
 * Bulk delete chat messages
 */
export const bulkDeleteMessages = mutation({
  args: {
    messageIds: v.array(v.id("globalChatMessages")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    let deleted = 0;

    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (message) {
        await ctx.db.delete(messageId);
        deleted++;
      }
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "bulk_delete_chat_messages",
      metadata: {
        messageCount: deleted,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: `Deleted ${deleted} messages`,
    };
  },
});

/**
 * Delete all messages from a specific user
 */
export const deleteUserMessages = mutation({
  args: {
    userId: v.id("users"),
    since: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    let messages = await ctx.db
      .query("globalChatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter by time if specified
    if (args.since) {
      messages = messages.filter((m) => m.createdAt >= args.since!);
    }

    let deleted = 0;
    for (const message of messages) {
      await ctx.db.delete(message._id);
      deleted++;
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_user_messages",
      metadata: {
        userId: args.userId,
        username: user.username,
        messageCount: deleted,
        since: args.since,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: `Deleted ${deleted} messages from ${user.username}`,
    };
  },
});

/**
 * Mute a user from chat
 */
export const muteUser = mutation({
  args: {
    userId: v.id("users"),
    durationMinutes: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const mutedUntil = Date.now() + args.durationMinutes * 60 * 1000;

    await ctx.db.patch(args.userId, {
      mutedUntil,
    });

    // Create moderation action record
    await ctx.db.insert("moderationActions", {
      adminId,
      userId: args.userId,
      actionType: "mute",
      reason: args.reason ?? "Chat mute",
      duration: args.durationMinutes * 60 * 1000, // Duration in ms
      expiresAt: mutedUntil,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "mute_user",
      metadata: {
        userId: args.userId,
        username: user.username,
        durationMinutes: args.durationMinutes,
        mutedUntil,
        reason: args.reason,
      },
      success: true,
    });

    return {
      success: true,
      message: `${user.username} muted for ${args.durationMinutes} minutes`,
    };
  },
});

/**
 * Unmute a user
 */
export const unmuteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "moderator");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      mutedUntil: undefined,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "unmute_user",
      metadata: {
        userId: args.userId,
        username: user.username,
      },
      success: true,
    });

    return {
      success: true,
      message: `${user.username} unmuted`,
    };
  },
});

/**
 * Clear all chat messages (admin only)
 */
export const clearAllMessages = mutation({
  args: {
    confirmPhrase: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Require confirmation phrase
    if (args.confirmPhrase !== "CLEAR ALL CHAT") {
      throw new Error("Confirmation phrase incorrect");
    }

    const allMessages = await ctx.db.query("globalChatMessages").collect();

    for (const message of allMessages) {
      await ctx.db.delete(message._id);
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "clear_all_chat",
      metadata: {
        messageCount: allMessages.length,
      },
      success: true,
    });

    return {
      success: true,
      message: `Cleared ${allMessages.length} messages`,
    };
  },
});
