import { v } from "convex/values";
import { query, mutation, internalMutation, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { validateSession } from "./lib/validators";
import { CHAT } from "./lib/constants";
import { RateLimiter, SECOND } from "@convex-dev/ratelimiter";
import { components } from "./_generated/api";
import type { UserStatus } from "./lib/types";

/**
 * Global Chat System
 *
 * Real-time messaging for the Tavern Hall lobby using Convex 2026 best practices.
 *
 * Features:
 * - Real-time message synchronization via reactive queries
 * - Rate limiting (1 message per 2 seconds)
 * - Online user presence tracking
 * - System message support
 * - Public read access, authenticated write access
 *
 * @see https://docs.convex.dev/functions/queries
 * @see https://docs.convex.dev/functions/mutations
 */

// =============================================================================
// Constants
// =============================================================================

const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_MESSAGE_LIMIT = 50;

// Rate limiter for chat messages: max 5 messages per 10 seconds per user
const rateLimiter = new RateLimiter(components.ratelimiter, {
  sendMessage: {
    kind: "token bucket",
    rate: CHAT.RATE_LIMIT_MAX_MESSAGES, // 5 messages
    period: CHAT.RATE_LIMIT_WINDOW_MS, // per 10 seconds
    capacity: CHAT.RATE_LIMIT_MAX_MESSAGES, // no burst capacity
  },
});

// =============================================================================
// Validators
// =============================================================================

const messageValidator = v.object({
  _id: v.id("globalChatMessages"),
  _creationTime: v.number(),
  userId: v.id("users"),
  username: v.string(),
  message: v.string(),
  createdAt: v.number(),
  isSystem: v.boolean(),
});

const onlineUserValidator = v.object({
  userId: v.id("users"),
  username: v.string(),
  status: v.union(
    v.literal("online"),
    v.literal("in_game"),
    v.literal("idle")
  ),
  lastActiveAt: v.number(),
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get recent global chat messages
 *
 * Returns the most recent messages in chronological order.
 * Public query - no authentication required to read.
 *
 * @param limit - Maximum number of messages to return (default 50, max 100)
 */
export const getRecentMessages = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(messageValidator),
  handler: async (ctx, args) => {
    // Validate and clamp limit to reasonable bounds
    let limit = args.limit ?? DEFAULT_MESSAGE_LIMIT;
    if (limit < 1) limit = 1;
    if (limit > 100) limit = 100;

    // Fetch messages in reverse chronological order
    const messages = await ctx.db
      .query("globalChatMessages")
      .withIndex("by_created")
      .order("desc")
      .take(limit);

    // Return in chronological order (oldest first)
    return messages.reverse();
  },
});

/**
 * Get online users
 *
 * Returns users who have been active in the last 5 minutes.
 * Public query - no authentication required.
 */
export const getOnlineUsers = query({
  args: {},
  returns: v.array(onlineUserValidator),
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - CHAT.PRESENCE_TIMEOUT_MS;

    // Get presence records for users active in last 5 minutes
    const presenceRecords = await ctx.db
      .query("userPresence")
      .withIndex("by_last_active", (q) => q.gte("lastActiveAt", cutoff))
      .collect();

    // Return sorted by last active (most recent first)
    return presenceRecords
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        status: p.status,
        lastActiveAt: p.lastActiveAt,
      }))
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  },
});

/**
 * Get message count for a time period
 *
 * Useful for analytics and moderation tracking.
 *
 * @param since - Timestamp to count messages from (default: last 24 hours)
 */
export const getMessageCount = query({
  args: {
    since: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const since = args.since ?? Date.now() - 24 * 60 * 60 * 1000;

    const messages = await ctx.db
      .query("globalChatMessages")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    return messages.length;
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Send a message to global chat
 *
 * Validates authentication, content, and enforces rate limiting.
 * Updates user presence as a side effect.
 *
 * @param token - Session token for authentication
 * @param content - Message content (max 500 characters)
 * @returns Message ID
 * @throws Error if not authenticated, rate limited, or invalid content
 */
export const sendMessage = mutation({
  args: {
    token: v.string(),
    content: v.string(),
  },
  returns: v.id("globalChatMessages"),
  handler: async (ctx, args) => {
    // Validate authentication
    const { userId, username } = await validateSession(ctx, args.token);

    // Validate content length BEFORE trimming (prevent wasteful processing)
    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`);
    }

    // Validate message content
    const content = args.content.trim();
    if (!content) {
      throw new Error("Message cannot be empty");
    }

    // Rate limiting using Convex's official rate limiter
    // This is transactional, fair, and prevents race conditions
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "sendMessage", {
      key: userId,
    });

    if (!ok) {
      const waitSeconds = Math.ceil(retryAfter / 1000);
      throw new Error(
        `Please wait ${waitSeconds} second${waitSeconds !== 1 ? "s" : ""} between messages`
      );
    }

    // Capture timestamp once for consistency
    const now = Date.now();

    // Insert message
    const messageId = await ctx.db.insert("globalChatMessages", {
      userId,
      username,
      message: content,
      createdAt: now,
      isSystem: false,
    });

    // Update user presence (heartbeat) - non-critical, do after message insert
    await updatePresenceInternal(ctx, userId, username, "online");

    return messageId;
  },
});

/**
 * Update user presence (heartbeat)
 *
 * Called periodically to keep user in the "online" list.
 * Should be called every 30 seconds from the frontend.
 *
 * @param token - Session token for authentication
 * @param status - User status (default: "online")
 */
export const updatePresence = mutation({
  args: {
    token: v.string(),
    status: v.optional(
      v.union(v.literal("online"), v.literal("in_game"), v.literal("idle"))
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Validate authentication
    const { userId, username } = await validateSession(ctx, args.token);

    const status = args.status ?? "online";

    await updatePresenceInternal(ctx, userId, username, status);

    return null;
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Send a system message
 *
 * Internal mutation for system announcements (e.g., "Player won a match").
 * Called from other backend functions, not directly from clients.
 *
 * IMPORTANT: Requires a system user to exist in the database.
 * Create one with: { username: "System", email: "system@localhost", name: "System", createdAt: Date.now() }
 *
 * @param message - System message content
 * @param systemUserId - Optional: ID of the system user (will auto-fetch if not provided)
 * @returns Message ID
 */
export const sendSystemMessage = internalMutation({
  args: {
    message: v.string(),
    systemUserId: v.optional(v.id("users")),
  },
  returns: v.id("globalChatMessages"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get or validate system user
    let systemUserId = args.systemUserId;

    if (!systemUserId) {
      // Try to find existing system user
      const systemUser = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", "system"))
        .first();

      if (!systemUser) {
        throw new Error(
          "System user not found. Create a system user with username 'system' before sending system messages."
        );
      }

      systemUserId = systemUser._id;
    }

    const messageId = await ctx.db.insert("globalChatMessages", {
      userId: systemUserId,
      username: "System",
      message: args.message,
      createdAt: now,
      isSystem: true,
    });

    return messageId;
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Internal helper to update or create presence record
 *
 * Upserts the userPresence record for the given user.
 * Separate function to avoid code duplication.
 */
async function updatePresenceInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  username: string,
  status: UserStatus
): Promise<void> {
  const now = Date.now();

  // Check if presence record exists (use .first() to avoid .unique() crash on duplicates)
  const existingPresence = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existingPresence) {
    // Update existing record
    await ctx.db.patch(existingPresence._id, {
      username, // Update username in case it changed
      lastActiveAt: now,
      status,
    });
  } else {
    // Create new record
    await ctx.db.insert("userPresence", {
      userId,
      username,
      lastActiveAt: now,
      status,
    });
  }
}
