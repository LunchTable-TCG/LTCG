import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Helpers
// ============================================================================

/**
 * Sorts two user IDs to ensure consistent conversation lookup
 * The smaller ID is always participant1
 */
function sortParticipants(userId1: Id<"users">, userId2: Id<"users">) {
  return userId1 < userId2
    ? { participant1Id: userId1, participant2Id: userId2 }
    : { participant1Id: userId2, participant2Id: userId1 };
}

/**
 * Checks if two users are friends
 */
async function areFriends(
  ctx: { db: any },
  userId1: Id<"users">,
  userId2: Id<"users">
): Promise<boolean> {
  const friendship = await ctx.db
    .query("friendships")
    .withIndex("by_user_friend", (q: any) => q.eq("userId", userId1).eq("friendId", userId2))
    .first();

  return friendship?.status === "accepted";
}

/**
 * Gets the "other" participant ID in a conversation
 */
function getOtherParticipantId(
  conversation: { participant1Id: Id<"users">; participant2Id: Id<"users"> },
  userId: Id<"users">
): Id<"users"> {
  return conversation.participant1Id === userId
    ? conversation.participant2Id
    : conversation.participant1Id;
}

/**
 * Gets the last read timestamp for a user in a conversation
 */
function getLastReadForUser(
  conversation: {
    participant1Id: Id<"users">;
    participant2Id: Id<"users">;
    participant1LastRead?: number;
    participant2LastRead?: number;
  },
  userId: Id<"users">
): number | undefined {
  return conversation.participant1Id === userId
    ? conversation.participant1LastRead
    : conversation.participant2LastRead;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets all DM conversations for the current user
 * Returns sorted by last message time (most recent first)
 */
export const getConversations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("dmConversations"),
      friendId: v.id("users"),
      friendUsername: v.optional(v.string()),
      isOnline: v.boolean(),
      lastMessageAt: v.number(),
      lastMessagePreview: v.optional(v.string()),
      unreadCount: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Get conversations where user is participant1
    const asParticipant1 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", auth.userId))
      .filter((q) => q.neq(q.field("participant1Archived"), true))
      .collect();

    // Get conversations where user is participant2
    const asParticipant2 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", auth.userId))
      .filter((q) => q.neq(q.field("participant2Archived"), true))
      .collect();

    const allConversations = [...asParticipant1, ...asParticipant2];

    if (allConversations.length === 0) {
      return [];
    }

    const now = Date.now();

    // Enrich with friend details, last message, and unread count
    const results = await Promise.all(
      allConversations.map(async (conv) => {
        const friendId = getOtherParticipantId(conv, auth.userId);
        const lastRead = getLastReadForUser(conv, auth.userId);

        const [friend, presence, lastMessage, unreadMessages] = await Promise.all([
          ctx.db.get(friendId),
          ctx.db
            .query("userPresence")
            .withIndex("by_user", (q) => q.eq("userId", friendId))
            .first(),
          ctx.db
            .query("directMessages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
            .order("desc")
            .first(),
          // Count unread messages
          lastRead
            ? ctx.db
                .query("directMessages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .filter((q) =>
                  q.and(
                    q.gt(q.field("createdAt"), lastRead),
                    q.neq(q.field("senderId"), auth.userId)
                  )
                )
                .collect()
            : ctx.db
                .query("directMessages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .filter((q) => q.neq(q.field("senderId"), auth.userId))
                .collect(),
        ]);

        const isOnline = presence ? now - presence.lastActiveAt < ONLINE_THRESHOLD_MS : false;

        return {
          _id: conv._id,
          friendId,
          friendUsername: friend?.username,
          isOnline,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: lastMessage?.message.slice(0, 50),
          unreadCount: unreadMessages.length,
        };
      })
    );

    // Sort by last message time (most recent first)
    return results.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

/**
 * Gets or creates a conversation with a friend
 * - Users must be friends
 */
export const getOrCreateConversation = mutation({
  args: {
    friendId: v.id("users"),
  },
  returns: v.object({
    conversationId: v.id("dmConversations"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Cannot DM yourself
    if (args.friendId === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot start a conversation with yourself",
      });
    }

    // Verify friendship
    const isFriend = await areFriends(ctx, userId, args.friendId);
    if (!isFriend) {
      throw createError(ErrorCode.DM_NOT_FRIENDS);
    }

    // Sort participant IDs for consistent lookup
    const { participant1Id, participant2Id } = sortParticipants(userId, args.friendId);

    // Check for existing conversation
    const existing = await ctx.db
      .query("dmConversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    if (existing) {
      // Un-archive if archived
      if (
        (participant1Id === userId && existing.participant1Archived) ||
        (participant2Id === userId && existing.participant2Archived)
      ) {
        const update =
          participant1Id === userId
            ? { participant1Archived: false }
            : { participant2Archived: false };
        await ctx.db.patch(existing._id, update);
      }
      return { conversationId: existing._id, isNew: false };
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("dmConversations", {
      participant1Id,
      participant2Id,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
    });

    return { conversationId, isNew: true };
  },
});

/**
 * Gets messages for a conversation
 * - User must be a participant
 */
export const getConversationMessages = query({
  args: {
    conversationId: v.id("dmConversations"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("directMessages"),
      senderId: v.id("users"),
      senderUsername: v.string(),
      message: v.string(),
      createdAt: v.number(),
      isSystem: v.optional(v.boolean()),
      isOwn: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw createError(ErrorCode.DM_CONVERSATION_NOT_FOUND);
    }

    // Verify user is a participant
    if (
      conversation.participant1Id !== auth.userId &&
      conversation.participant2Id !== auth.userId
    ) {
      throw createError(ErrorCode.DM_NOT_PARTICIPANT);
    }

    const limit = Math.min(args.limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

    // Get messages
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .take(limit);

    // Return in chronological order with isOwn flag
    return messages.reverse().map((m) => ({
      _id: m._id,
      senderId: m.senderId,
      senderUsername: m.senderUsername,
      message: m.message,
      createdAt: m.createdAt,
      isSystem: m.isSystem,
      isOwn: m.senderId === auth.userId,
    }));
  },
});

/**
 * Gets paginated messages for a conversation (for infinite scroll)
 */
export const getPaginatedMessages = query({
  args: {
    conversationId: v.id("dmConversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw createError(ErrorCode.DM_CONVERSATION_NOT_FOUND);
    }

    // Verify user is a participant
    if (
      conversation.participant1Id !== auth.userId &&
      conversation.participant2Id !== auth.userId
    ) {
      throw createError(ErrorCode.DM_NOT_PARTICIPANT);
    }

    // Get paginated messages
    const result = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Sends a direct message to a friend
 * - Creates conversation if it doesn't exist
 * - Users must be friends
 */
export const sendDirectMessage = mutation({
  args: {
    conversationId: v.optional(v.id("dmConversations")),
    friendId: v.optional(v.id("users")),
    message: v.string(),
  },
  returns: v.object({
    messageId: v.id("directMessages"),
    conversationId: v.id("dmConversations"),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Validate message
    const trimmedMessage = args.message.trim();
    if (trimmedMessage.length === 0) {
      throw createError(ErrorCode.CHAT_MESSAGE_EMPTY);
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw createError(ErrorCode.CHAT_MESSAGE_TOO_LONG);
    }

    let conversationId: Id<"dmConversations">;
    let friendId: Id<"users">;

    if (args.conversationId) {
      // Use existing conversation
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) {
        throw createError(ErrorCode.DM_CONVERSATION_NOT_FOUND);
      }

      // Verify user is a participant
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        throw createError(ErrorCode.DM_NOT_PARTICIPANT);
      }

      conversationId = args.conversationId;
      friendId = getOtherParticipantId(conversation, userId);
    } else if (args.friendId) {
      // Create or get conversation
      const result = await ctx.runMutation(
        // @ts-expect-error - internal reference
        ctx.functions.social.dm.getOrCreateConversation,
        { friendId: args.friendId }
      );
      conversationId = result.conversationId;
      friendId = args.friendId;
    } else {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Either conversationId or friendId must be provided",
      });
    }

    // Verify still friends (in case of existing conversation)
    const isFriend = await areFriends(ctx, userId, friendId);
    if (!isFriend) {
      throw createError(ErrorCode.DM_NOT_FRIENDS);
    }

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("directMessages", {
      conversationId,
      senderId: userId,
      senderUsername: username || "Unknown",
      message: trimmedMessage,
      createdAt: now,
    });

    // Update conversation
    const conversation = await ctx.db.get(conversationId);
    if (conversation) {
      await ctx.db.patch(conversationId, {
        lastMessageAt: now,
        messageCount: (conversation.messageCount || 0) + 1,
      });
    }

    return { messageId, conversationId };
  },
});

/**
 * Marks a conversation as read
 */
export const markConversationRead = mutation({
  args: {
    conversationId: v.id("dmConversations"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw createError(ErrorCode.DM_CONVERSATION_NOT_FOUND);
    }

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw createError(ErrorCode.DM_NOT_PARTICIPANT);
    }

    const now = Date.now();

    // Update last read timestamp for this user
    const update =
      conversation.participant1Id === userId
        ? { participant1LastRead: now }
        : { participant2LastRead: now };

    await ctx.db.patch(args.conversationId, update);

    return { success: true };
  },
});

/**
 * Archives a conversation (hides it from list without deleting messages)
 */
export const archiveConversation = mutation({
  args: {
    conversationId: v.id("dmConversations"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw createError(ErrorCode.DM_CONVERSATION_NOT_FOUND);
    }

    // Verify user is a participant
    if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
      throw createError(ErrorCode.DM_NOT_PARTICIPANT);
    }

    // Archive for this user only
    const update =
      conversation.participant1Id === userId
        ? { participant1Archived: true }
        : { participant2Archived: true };

    await ctx.db.patch(args.conversationId, update);

    return { success: true };
  },
});

/**
 * Gets unread message count across all conversations
 */
export const getTotalUnreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Get all conversations
    const asParticipant1 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", auth.userId))
      .filter((q) => q.neq(q.field("participant1Archived"), true))
      .collect();

    const asParticipant2 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", auth.userId))
      .filter((q) => q.neq(q.field("participant2Archived"), true))
      .collect();

    const allConversations = [...asParticipant1, ...asParticipant2];

    let totalUnread = 0;

    for (const conv of allConversations) {
      const lastRead = getLastReadForUser(conv, auth.userId);

      const unreadMessages = lastRead
        ? await ctx.db
            .query("directMessages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
            .filter((q) =>
              q.and(q.gt(q.field("createdAt"), lastRead), q.neq(q.field("senderId"), auth.userId))
            )
            .collect()
        : await ctx.db
            .query("directMessages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
            .filter((q) => q.neq(q.field("senderId"), auth.userId))
            .collect();

      totalUnread += unreadMessages.length;
    }

    return totalUnread;
  },
});
