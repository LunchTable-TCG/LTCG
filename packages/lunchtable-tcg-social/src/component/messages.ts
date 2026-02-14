import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const messageReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  conversationId: v.string(),
  senderId: v.string(),
  senderUsername: v.string(),
  message: v.string(),
  createdAt: v.number(),
  isSystem: v.optional(v.boolean()),
});

const conversationReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  participant1Id: v.string(),
  participant2Id: v.string(),
  createdAt: v.number(),
  lastMessageAt: v.number(),
  messageCount: v.number(),
  participant1LastRead: v.optional(v.number()),
  participant2LastRead: v.optional(v.number()),
  participant1Archived: v.optional(v.boolean()),
  participant2Archived: v.optional(v.boolean()),
});

export const sendMessage = mutation({
  args: {
    senderId: v.string(),
    senderUsername: v.string(),
    recipientId: v.string(),
    message: v.string(),
    isSystem: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.senderId === args.recipientId) {
      throw new Error("Cannot send message to yourself");
    }

    // Find or create conversation
    const sortedIds = [args.senderId, args.recipientId].sort();
    const [participant1Id, participant2Id] = sortedIds;

    let conversation = await ctx.db
      .query("dmConversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
      )
      .first();

    const now = Date.now();

    if (!conversation) {
      const conversationId = await ctx.db.insert("dmConversations", {
        participant1Id,
        participant2Id,
        createdAt: now,
        lastMessageAt: now,
        messageCount: 0,
      });
      const newConversation = await ctx.db.get(conversationId);
      if (!newConversation) {
        throw new Error("Failed to create conversation");
      }
      conversation = newConversation;
    }

    // Update conversation
    await ctx.db.patch(conversation._id, {
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
    });

    const messageId = await ctx.db.insert("directMessages", {
      conversationId: conversation._id,
      senderId: args.senderId,
      senderUsername: args.senderUsername,
      message: args.message,
      createdAt: now,
      isSystem: args.isSystem,
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
    const [participant1Id, participant2Id] = sortedIds;

    const conversation = await ctx.db
      .query("dmConversations")
      .withIndex("by_participants", (q) =>
        q.eq("participant1Id", participant1Id).eq("participant2Id", participant2Id)
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
      query = query.filter((q) => q.lt(q.field("createdAt"), args.before!));
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
    const asParticipant1 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant1", (q) => q.eq("participant1Id", args.userId))
      .collect();

    const asParticipant2 = await ctx.db
      .query("dmConversations")
      .withIndex("by_participant2", (q) => q.eq("participant2Id", args.userId))
      .collect();

    const conversations = [...asParticipant1, ...asParticipant2];

    // Sort by last message time
    return conversations
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
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

    if (conversation.participant1Id !== args.userId && conversation.participant2Id !== args.userId) {
      throw new Error("User is not a participant in this conversation");
    }

    // Update the lastRead timestamp for the participant
    const now = Date.now();
    if (conversation.participant1Id === args.userId) {
      await ctx.db.patch(args.conversationId, {
        participant1LastRead: now,
      });
    } else {
      await ctx.db.patch(args.conversationId, {
        participant2LastRead: now,
      });
    }

    return null;
  },
});
