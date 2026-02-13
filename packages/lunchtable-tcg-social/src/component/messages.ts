import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

const messageReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  conversationId: v.string(),
  senderId: v.string(),
  content: v.string(),
  timestamp: v.number(),
  readBy: v.optional(v.array(v.string())),
  metadata: v.optional(v.any()),
});

const conversationReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  participantIds: v.array(v.string()),
  lastMessageAt: v.optional(v.number()),
  lastMessagePreview: v.optional(v.string()),
  metadata: v.optional(v.any()),
});

export const sendMessage = mutation({
  args: {
    senderId: v.string(),
    recipientId: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.senderId === args.recipientId) {
      throw new Error("Cannot send message to yourself");
    }

    // Find or create conversation
    const sortedIds = [args.senderId, args.recipientId].sort();

    let conversation = await ctx.db
      .query("dmConversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("participantIds")[0], sortedIds[0]),
          q.eq(q.field("participantIds")[1], sortedIds[1])
        )
      )
      .first();

    if (!conversation) {
      const conversationId = await ctx.db.insert("dmConversations", {
        participantIds: sortedIds,
        lastMessageAt: Date.now(),
        lastMessagePreview: args.content.substring(0, 100),
        metadata: {},
      });
      conversation = await ctx.db.get(conversationId);
    } else {
      // Update conversation metadata
      await ctx.db.patch(conversation._id, {
        lastMessageAt: Date.now(),
        lastMessagePreview: args.content.substring(0, 100),
      });
    }

    const messageId = await ctx.db.insert("directMessages", {
      conversationId: conversation!._id,
      senderId: args.senderId,
      content: args.content,
      timestamp: Date.now(),
      readBy: [args.senderId],
      metadata: args.metadata,
    });

    return messageId as string;
  },
});

export const getConversation = query({
  args: {
    userId1: v.string(),
    userId2: v.string(),
  },
  returns: v.union(conversationReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const sortedIds = [args.userId1, args.userId2].sort();

    const conversation = await ctx.db
      .query("dmConversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("participantIds")[0], sortedIds[0]),
          q.eq(q.field("participantIds")[1], sortedIds[1])
        )
      )
      .first();

    if (!conversation) return null;

    return {
      ...conversation,
      _id: conversation._id as string,
    };
  },
});

export const getMessages = query({
  args: {
    conversationId: v.id("dmConversations"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc");

    if (args.before) {
      query = query.filter((q) => q.lt(q.field("timestamp"), args.before!));
    }

    const messages = await query
      .take(args.limit ?? 50);

    return messages.map((m) => ({
      ...m,
      _id: m._id as string,
      conversationId: m.conversationId as string,
    }));
  },
});

export const getConversations = query({
  args: {
    userId: v.string(),
  },
  returns: v.array(conversationReturnValidator),
  handler: async (ctx, args) => {
    const conversations = await ctx.db
      .query("dmConversations")
      .filter((q) =>
        q.or(
          q.eq(q.field("participantIds")[0], args.userId),
          q.eq(q.field("participantIds")[1], args.userId)
        )
      )
      .collect();

    // Sort by last message time
    return conversations
      .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0))
      .map((c) => ({
        ...c,
        _id: c._id as string,
      }));
  },
});

export const markRead = mutation({
  args: {
    conversationId: v.id("dmConversations"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify conversation exists and user is participant
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participantIds.includes(args.userId)) {
      throw new Error("User is not a participant in this conversation");
    }

    // Mark all messages as read by this user
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    for (const message of messages) {
      const readBy = message.readBy ?? [];
      if (!readBy.includes(args.userId)) {
        await ctx.db.patch(message._id, {
          readBy: [...readBy, args.userId],
        });
      }
    }

    return null;
  },
});
