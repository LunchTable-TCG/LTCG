import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import type { Id } from "../_generated/dataModel";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export const inboxMessageTypeValidator = v.union(
  v.literal("reward"),
  v.literal("announcement"),
  v.literal("challenge"),
  v.literal("friend_request"),
  v.literal("system"),
  v.literal("achievement")
);

export type InboxMessageType =
  | "reward"
  | "announcement"
  | "challenge"
  | "friend_request"
  | "system"
  | "achievement";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get inbox messages for the current user with optional filtering.
 * Returns messages sorted by createdAt (newest first), excluding deleted messages.
 */
export const getInboxMessages = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(inboxMessageTypeValidator),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = Math.min(args.limit ?? 50, 100);

    let messagesQuery;

    if (args.type) {
      // Filter by type
      messagesQuery = ctx.db
        .query("userInbox")
        .withIndex("by_user_type", (q) => q.eq("userId", userId).eq("type", args.type!));
    } else if (args.unreadOnly) {
      // Filter by unread only
      messagesQuery = ctx.db
        .query("userInbox")
        .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false));
    } else {
      // All messages for user
      messagesQuery = ctx.db
        .query("userInbox")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    }

    const messages = await messagesQuery
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .order("desc")
      .take(limit);

    // Filter out expired messages
    const now = Date.now();
    return messages.filter((m) => !m.expiresAt || m.expiresAt > now);
  },
});

/**
 * Get unread message count for the current user (for badge display).
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    const now = Date.now();

    const unreadMessages = await ctx.db
      .query("userInbox")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Filter out expired and count
    return unreadMessages.filter((m) => !m.expiresAt || m.expiresAt > now).length;
  },
});

/**
 * Get a single inbox message by ID.
 */
export const getMessage = query({
  args: {
    messageId: v.id("userInbox"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId || message.deletedAt) {
      return null;
    }

    return message;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Mark a single message as read.
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("userInbox"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw createError(ErrorCode.NOT_FOUND_INBOX_MESSAGE);
    }

    if (message.isRead) {
      return { success: true, alreadyRead: true };
    }

    await ctx.db.patch(args.messageId, {
      isRead: true,
      readAt: Date.now(),
    });

    return { success: true, alreadyRead: false };
  },
});

/**
 * Mark all unread messages as read.
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    const unreadMessages = await ctx.db
      .query("userInbox")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const now = Date.now();
    await Promise.all(
      unreadMessages.map((m) =>
        ctx.db.patch(m._id, {
          isRead: true,
          readAt: now,
        })
      )
    );

    return { success: true, count: unreadMessages.length };
  },
});

/**
 * Claim a reward from an inbox message.
 * This grants the reward items and marks the message as claimed.
 */
export const claimReward = mutation({
  args: {
    messageId: v.id("userInbox"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw createError(ErrorCode.NOT_FOUND_INBOX_MESSAGE);
    }

    if (message.type !== "reward") {
      throw createError(ErrorCode.INVALID_OPERATION, { reason: "This message is not a reward" });
    }

    if (message.claimedAt) {
      throw createError(ErrorCode.REWARD_ALREADY_CLAIMED);
    }

    // Check expiration
    if (message.expiresAt && message.expiresAt < Date.now()) {
      throw createError(ErrorCode.REWARD_EXPIRED);
    }

    const data = message.data as {
      rewardType: "gold" | "cards" | "packs";
      gold?: number;
      cardIds?: string[];
      packCount?: number;
    };

    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    const rewards: { gold?: number; cards?: string[]; packs?: number } = {};

    // Grant rewards based on type
    if (data.rewardType === "gold" && data.gold) {
      await ctx.db.patch(userId, {
        gold: (user.gold || 0) + data.gold,
      });
      rewards.gold = data.gold;
    }

    if (data.rewardType === "cards" && data.cardIds) {
      // TODO: Implement card rewards using playerCards table
      // Cards require cardDefinitionId (Id<"cardDefinitions">), not string cardIds
      // For now, just log that cards were claimed
      rewards.cards = data.cardIds;
    }

    if (data.rewardType === "packs" && data.packCount) {
      // TODO: Implement pack token system
      // For now, just log that packs were claimed
      rewards.packs = data.packCount;
    }

    // Mark as claimed and read
    await ctx.db.patch(args.messageId, {
      claimedAt: Date.now(),
      isRead: true,
      readAt: message.readAt || Date.now(),
    });

    return { success: true, rewards };
  },
});

/**
 * Delete (soft) an inbox message.
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("userInbox"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw createError(ErrorCode.NOT_FOUND_INBOX_MESSAGE);
    }

    // Don't allow deleting unclaimed rewards
    if (message.type === "reward" && !message.claimedAt) {
      throw createError(ErrorCode.INVALID_OPERATION, { reason: "Cannot delete unclaimed rewards" });
    }

    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for use by other Convex functions)
// ============================================================================

/**
 * Create an inbox message (internal use only).
 * Called by admin functions, challenge system, friend system, etc.
 */
export const createInboxMessage = internalMutation({
  args: {
    userId: v.id("users"),
    type: inboxMessageTypeValidator,
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    senderId: v.optional(v.id("users")),
    senderUsername: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("userInbox", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      message: args.message,
      data: args.data,
      senderId: args.senderId,
      senderUsername: args.senderUsername,
      isRead: false,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    return { messageId };
  },
});

/**
 * Create inbox messages for multiple users (broadcast).
 */
export const createBroadcastMessages = internalMutation({
  args: {
    userIds: v.array(v.id("users")),
    type: inboxMessageTypeValidator,
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    senderId: v.optional(v.id("users")),
    senderUsername: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const messageIds: Id<"userInbox">[] = [];

    for (const userId of args.userIds) {
      const messageId = await ctx.db.insert("userInbox", {
        userId,
        type: args.type,
        title: args.title,
        message: args.message,
        data: args.data,
        senderId: args.senderId,
        senderUsername: args.senderUsername,
        isRead: false,
        expiresAt: args.expiresAt,
        createdAt: now,
      });
      messageIds.push(messageId);
    }

    return { messageIds, count: messageIds.length };
  },
});

/**
 * Cleanup expired and old messages (scheduled job).
 */
export const cleanupOldMessages = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Find expired messages
    const expiredMessages = await ctx.db
      .query("userInbox")
      .withIndex("by_expires")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .take(100);

    // Find old deleted messages (permanently delete after 30 days)
    const oldDeletedMessages = await ctx.db
      .query("userInbox")
      .withIndex("by_created")
      .filter((q) =>
        q.and(
          q.neq(q.field("deletedAt"), undefined),
          q.lt(q.field("deletedAt"), thirtyDaysAgo)
        )
      )
      .take(100);

    // Soft delete expired, hard delete old deleted
    let softDeleted = 0;
    let hardDeleted = 0;

    for (const msg of expiredMessages) {
      if (!msg.deletedAt) {
        await ctx.db.patch(msg._id, { deletedAt: now });
        softDeleted++;
      }
    }

    for (const msg of oldDeletedMessages) {
      await ctx.db.delete(msg._id);
      hardDeleted++;
    }

    return { softDeleted, hardDeleted };
  },
});
