import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new chat session.
 */
export const createChatSession = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  returns: v.id("aiChatSessions"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionId = await ctx.db.insert("aiChatSessions", {
      userId: args.userId,
      sessionId: args.sessionId,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
      isActive: true,
    });

    return sessionId;
  },
});

/**
 * Add a message to a chat session.
 */
export const addChatMessage = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    message: v.string(),
  },
  returns: v.id("aiChatMessages"),
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("aiChatMessages", {
      userId: args.userId,
      sessionId: args.sessionId,
      role: args.role,
      message: args.message,
      createdAt: Date.now(),
    });

    // Update session
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, {
        lastMessageAt: Date.now(),
        messageCount: session.messageCount + 1,
      });
    }

    return messageId;
  },
});

/**
 * End a chat session.
 */
export const endChatSession = mutation({
  args: { sessionId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (session) {
      await ctx.db.patch(session._id, { isActive: false });
    }

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get chat sessions for a user.
 */
export const getChatSessions = query({
  args: {
    userId: v.string(),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      return await ctx.db
        .query("aiChatSessions")
        .withIndex("by_user_active", (q) =>
          q.eq("userId", args.userId).eq("isActive", true)
        )
        .collect();
    }

    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Get a specific chat session.
 */
export const getChatSession = query({
  args: { sessionId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

/**
 * Get messages for a chat session.
 */
export const getChatMessages = query({
  args: {
    sessionId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("aiChatMessages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .take(limit);
  },
});
