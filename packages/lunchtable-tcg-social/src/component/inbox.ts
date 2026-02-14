import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const inboxTypeValidator = v.union(
  v.literal("reward"),
  v.literal("announcement"),
  v.literal("challenge"),
  v.literal("friend_request"),
  v.literal("guild_invite"),
  v.literal("guild_request"),
  v.literal("system"),
  v.literal("achievement")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Send a message to a user's inbox.
 */
export const send = mutation({
  args: {
    userId: v.string(),
    type: inboxTypeValidator,
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    senderId: v.optional(v.string()),
    senderUsername: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("userInbox", {
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
    return id;
  },
});

/**
 * Mark an inbox item as read.
 */
export const markRead = mutation({
  args: {
    inboxItemId: v.id("userInbox"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);
    if (!item) {
      throw new Error("Inbox item not found");
    }
    if (item.userId !== args.userId) {
      throw new Error("Inbox item does not belong to this user");
    }

    await ctx.db.patch(args.inboxItemId, {
      isRead: true,
      readAt: Date.now(),
    });

    return null;
  },
});

/**
 * Claim a reward from an inbox item.
 */
export const claimReward = mutation({
  args: {
    inboxItemId: v.id("userInbox"),
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);
    if (!item) {
      throw new Error("Inbox item not found");
    }
    if (item.userId !== args.userId) {
      throw new Error("Inbox item does not belong to this user");
    }
    if (item.claimedAt) {
      throw new Error("Reward already claimed");
    }
    if (item.expiresAt && item.expiresAt < Date.now()) {
      throw new Error("Inbox item has expired");
    }

    await ctx.db.patch(args.inboxItemId, {
      claimedAt: Date.now(),
      isRead: true,
      readAt: item.readAt ?? Date.now(),
    });

    return item.data;
  },
});

/**
 * Soft-delete an inbox item.
 */
export const deleteItem = mutation({
  args: {
    inboxItemId: v.id("userInbox"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.inboxItemId);
    if (!item) {
      throw new Error("Inbox item not found");
    }
    if (item.userId !== args.userId) {
      throw new Error("Inbox item does not belong to this user");
    }

    await ctx.db.patch(args.inboxItemId, {
      deletedAt: Date.now(),
    });

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a user's inbox items (excluding deleted).
 */
export const getInbox = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    unreadOnly: v.optional(v.boolean()),
    type: v.optional(inboxTypeValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.unreadOnly) {
      const items = await ctx.db
        .query("userInbox")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", args.userId).eq("isRead", false)
        )
        .order("desc")
        .take(args.limit ?? 50);

      return items.filter((i) => !i.deletedAt);
    }

    if (args.type) {
      const items = await ctx.db
        .query("userInbox")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", args.userId).eq("type", args.type!)
        )
        .order("desc")
        .take(args.limit ?? 50);

      return items.filter((i) => !i.deletedAt);
    }

    const items = await ctx.db
      .query("userInbox")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);

    return items.filter((i) => !i.deletedAt);
  },
});

/**
 * Get unread count for a user's inbox.
 */
export const getUnreadCount = query({
  args: {
    userId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("userInbox")
      .withIndex("by_user_unread", (q) =>
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();

    return items.filter((i) => !i.deletedAt).length;
  },
});
