import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * AI Chat System
 *
 * Provides conversational AI support for players using ElizaOS runtime.
 * Messages are persisted in Convex for real-time sync and history.
 *
 * Features:
 * - Session-based conversations (auto-created on first message)
 * - Real-time message sync via reactive queries
 * - Authenticated write access
 * - Internal mutation for agent responses (called from Next.js API)
 */

// =============================================================================
// Constants
// =============================================================================

const MAX_MESSAGE_LENGTH = 2000;
const MAX_SESSION_MESSAGES = 100; // Keep last 100 messages per session

// =============================================================================
// Validators
// =============================================================================

const messageValidator = v.object({
  _id: v.id("aiChatMessages"),
  _creationTime: v.number(),
  userId: v.id("users"),
  sessionId: v.string(),
  role: v.union(v.literal("user"), v.literal("agent")),
  message: v.string(),
  createdAt: v.number(),
});

const sessionValidator = v.object({
  _id: v.id("aiChatSessions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  sessionId: v.string(),
  createdAt: v.number(),
  lastMessageAt: v.number(),
  messageCount: v.number(),
  isActive: v.boolean(),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get the user's active AI chat session.
 * Returns null if no active session exists.
 */
export const getActiveSession = query({
  args: {},
  returns: v.union(sessionValidator, v.null()),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", auth.userId).eq("isActive", true))
      .first();

    return session;
  },
});

/**
 * Get messages for a specific session.
 * Returns messages in chronological order (oldest first).
 */
export const getSessionMessages = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Verify session belongs to user
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== auth.userId) {
      return [];
    }

    // Get messages in chronological order
    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", auth.userId).eq("sessionId", args.sessionId)
      )
      .order("asc")
      .take(MAX_SESSION_MESSAGES);

    return messages;
  },
});

/**
 * Get all sessions for the current user (for history view).
 */
export const getUserSessions = query({
  args: {},
  returns: v.array(sessionValidator),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const sessions = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .order("desc")
      .take(20);

    return sessions;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new AI chat session.
 * Deactivates any existing active session first.
 */
export const createSession = mutation({
  args: {},
  returns: v.object({
    sessionId: v.string(),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);
    const now = Date.now();

    // Deactivate existing active sessions
    const activeSessions = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_user_active", (q) => q.eq("userId", auth.userId).eq("isActive", true))
      .collect();

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, { isActive: false });
    }

    // Generate a unique session ID
    const sessionId = `ai_${auth.userId}_${now}_${Math.random().toString(36).substring(2, 9)}`;

    // Create the new session
    await ctx.db.insert("aiChatSessions", {
      userId: auth.userId,
      sessionId,
      createdAt: now,
      lastMessageAt: now,
      messageCount: 0,
      isActive: true,
    });

    return { sessionId };
  },
});

/**
 * Send a user message to the AI chat.
 * Creates a new session if one doesn't exist.
 * Returns the message ID and session ID.
 */
export const sendUserMessage = mutation({
  args: {
    message: v.string(),
    sessionId: v.optional(v.string()),
  },
  returns: v.object({
    messageId: v.id("aiChatMessages"),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);
    const now = Date.now();

    // Validate message length
    const trimmedMessage = args.message.trim();
    if (trimmedMessage.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Message cannot be empty",
      });
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      });
    }

    let sessionId = args.sessionId;

    // Get or create session
    if (!sessionId) {
      // Check for active session
      const activeSession = await ctx.db
        .query("aiChatSessions")
        .withIndex("by_user_active", (q) => q.eq("userId", auth.userId).eq("isActive", true))
        .first();

      if (activeSession) {
        sessionId = activeSession.sessionId;
      } else {
        // Create new session
        sessionId = `ai_${auth.userId}_${now}_${Math.random().toString(36).substring(2, 9)}`;
        await ctx.db.insert("aiChatSessions", {
          userId: auth.userId,
          sessionId,
          createdAt: now,
          lastMessageAt: now,
          messageCount: 0,
          isActive: true,
        });
      }
    }

    // Verify session belongs to user
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();

    if (!session || session.userId !== auth.userId) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, {
        entity: "AI chat session",
      });
    }

    // Insert the user message
    const messageId = await ctx.db.insert("aiChatMessages", {
      userId: auth.userId,
      sessionId,
      role: "user",
      message: trimmedMessage,
      createdAt: now,
    });

    // Update session stats
    await ctx.db.patch(session._id, {
      lastMessageAt: now,
      messageCount: session.messageCount + 1,
    });

    return { messageId, sessionId };
  },
});

/**
 * Save an agent response to the chat.
 * Called from Next.js API route after getting ElizaOS response.
 * Session ownership was already verified when user sent message.
 */
export const saveAgentResponse = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Verify session exists and belongs to the specified user
    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== args.userId) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, {
        entity: "AI chat session",
        reason: "Session not found or unauthorized",
      });
    }

    // Insert the agent message
    const messageId = await ctx.db.insert("aiChatMessages", {
      userId: args.userId,
      sessionId: args.sessionId,
      role: "agent",
      message: args.message,
      createdAt: now,
    });

    // Update session stats
    await ctx.db.patch(session._id, {
      lastMessageAt: now,
      messageCount: session.messageCount + 1,
    });

    return { messageId };
  },
});

/**
 * End the current session (mark as inactive).
 */
export const endSession = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    const session = await ctx.db
      .query("aiChatSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || session.userId !== auth.userId) {
      return { success: false };
    }

    await ctx.db.patch(session._id, { isActive: false });
    return { success: true };
  },
});
