import { RateLimiter } from "@convex-dev/ratelimiter";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, internalMutation, mutation, query } from "../_generated/server";
import { globalChatMessageCounter } from "../infrastructure/shardedCounters";
import { CHAT } from "../lib/constants";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { getRankFromRating } from "../lib/helpers";
import type { UserStatus } from "../lib/types";

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
  status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
  lastActiveAt: v.number(),
  rank: v.string(), // Rank tier (Bronze, Silver, Gold, etc.)
  rankedElo: v.number(), // ELO rating for ranked
});

// =============================================================================
// Queries
// =============================================================================

/**
 * Get recent global chat messages.
 * Returns the most recent messages in chronological order.
 * Public query - no authentication required to read.
 *
 * @param limit - Maximum number of messages to return (default: 50, max: 100)
 * @returns Array of chat messages with user info and timestamps
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
 * Get paginated global chat messages (for infinite scroll).
 * Returns messages in chronological order (oldest first) with cursor support.
 * Public query - no authentication required to read.
 *
 * Use with usePaginatedQuery hook on the frontend for infinite scroll.
 *
 * @param paginationOpts - Pagination options with numItems and cursor
 * @returns PaginationResult with page of messages and continuation cursor
 */
export const getPaginatedMessages = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    // Query messages in descending order (newest first)
    // Convex pagination works with the natural query order
    const paginatedResult = await ctx.db
      .query("globalChatMessages")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);

    // Reverse the page to show oldest first (chronological order for chat)
    return {
      ...paginatedResult,
      page: paginatedResult.page.reverse(),
    };
  },
});

/**
 * Get online users in the Tavern Hall.
 * Returns users who have been active in the last 5 minutes.
 * Filters out AI agents (story mode NPCs).
 * Public query - no authentication required.
 *
 * @returns Array of online users with status, rank, and ELO rating
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

    // Filter out AI agents by checking user record and include rank data
    const filteredRecords = await Promise.all(
      presenceRecords.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        // Exclude AI agents (story mode NPCs)
        if (user?.isAiAgent) return null;

        // Get user's ranked ELO and calculate rank
        const rankedElo = user?.rankedElo ?? 1000;
        const rank = getRankFromRating(rankedElo);

        return {
          userId: p.userId,
          username: p.username,
          status: p.status,
          lastActiveAt: p.lastActiveAt,
          rank,
          rankedElo,
        };
      })
    );

    // Remove nulls and return sorted by last active (most recent first)
    return filteredRecords
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  },
});

/**
 * Get message count for a time period.
 * Useful for analytics and moderation tracking.
 *
 * @param since - Timestamp to count messages from (default: last 24 hours)
 * @returns Total number of messages sent since the specified timestamp
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
      .withIndex("by_created", (q) => q.gte("createdAt", since))
      .collect();

    return messages.length;
  },
});

/**
 * Get total message count across all time.
 * Uses sharded counter for efficient counting.
 *
 * @returns Total number of messages ever sent in global chat
 */
export const getTotalMessageCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    return await globalChatMessageCounter.count(ctx, "global");
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Send a message to global chat.
 * Validates authentication, content, and enforces rate limiting (5 messages per 10 seconds).
 * Updates user presence as a side effect.
 *
 * @param content - Message content (max 500 characters)
 * @returns Message ID of the created message
 * @throws CHAT_MESSAGE_TOO_LONG if content exceeds 500 characters
 * @throws CHAT_MESSAGE_EMPTY if content is empty after trimming
 * @throws RATE_LIMIT_CHAT_MESSAGE if rate limit exceeded
 */
export const sendMessage = mutation({
  args: {
    content: v.string(),
  },
  returns: v.id("globalChatMessages"),
  handler: async (ctx, args) => {
    // Validate authentication
    const { userId, username } = await requireAuthMutation(ctx);

    // Validate content length BEFORE trimming (prevent wasteful processing)
    if (args.content.length > MAX_MESSAGE_LENGTH) {
      throw createError(ErrorCode.CHAT_MESSAGE_TOO_LONG, {
        maxLength: MAX_MESSAGE_LENGTH,
        actualLength: args.content.length,
      });
    }

    // Validate message content
    const content = args.content.trim();
    if (!content) {
      throw createError(ErrorCode.CHAT_MESSAGE_EMPTY);
    }

    // Rate limiting using Convex's official rate limiter
    // This is transactional, fair, and prevents race conditions
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "sendMessage", {
      key: userId,
    });

    if (!ok) {
      const waitSeconds = Math.ceil(retryAfter / 1000);
      throw createError(ErrorCode.RATE_LIMIT_CHAT_MESSAGE, {
        retryAfter,
        waitSeconds,
      });
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

    // Increment global message counter
    await globalChatMessageCounter.add(ctx, "global", 1);

    // Update user presence (heartbeat) - non-critical, do after message insert
    await updatePresenceInternal(ctx, userId, username, "online");

    return messageId;
  },
});

/**
 * Update user presence (heartbeat).
 * Called periodically to keep user in the "online" list.
 * Should be called every 30 seconds from the frontend.
 *
 * OPTIMIZATION: Pass presenceId from previous call to skip query and avoid OCC conflicts.
 * First call returns the presenceId, subsequent calls should pass it back.
 *
 * @param status - User status: "online", "in_game", or "idle" (default: "online")
 * @param presenceId - Optional: ID from previous call to skip query (reduces write conflicts)
 * @returns presenceId for use in subsequent calls
 */
export const updatePresence = mutation({
  args: {
    status: v.optional(v.union(v.literal("online"), v.literal("in_game"), v.literal("idle"))),
    presenceId: v.optional(v.id("userPresence")),
  },
  returns: v.id("userPresence"),
  handler: async (ctx, args) => {
    // Validate authentication
    const { userId, username } = await requireAuthMutation(ctx);

    const status = args.status ?? "online";
    const now = Date.now();

    // Fast path: if presenceId provided, skip query and patch directly
    if (args.presenceId) {
      // Verify the document still exists and belongs to this user
      const existing = await ctx.db.get(args.presenceId);
      if (existing && existing.userId === userId) {
        await ctx.db.patch(args.presenceId, {
          username,
          lastActiveAt: now,
          status,
        });
        return args.presenceId;
      }
      // Document was deleted or doesn't belong to user, fall through to create new
    }

    // Slow path: query for existing or create new
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        username,
        lastActiveAt: now,
        status,
      });
      return existingPresence._id;
    }

    // Create new record
    const newPresenceId = await ctx.db.insert("userPresence", {
      userId,
      username,
      lastActiveAt: now,
      status,
    });
    return newPresenceId;
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Send a system message to global chat.
 * Internal mutation for system announcements (e.g., "Player won a match").
 * Called from other backend functions, not directly from clients.
 *
 * IMPORTANT: Requires a system user to exist in the database.
 * Create one with: { username: "system", email: "system@localhost", name: "System", createdAt: Date.now() }
 *
 * @param message - System message content
 * @param systemUserId - Optional ID of the system user (will auto-fetch if not provided)
 * @returns Message ID of the created system message
 * @throws NOT_FOUND_USER if system user not found
 * @internal Called from backend only, not from client
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
        throw createError(ErrorCode.NOT_FOUND_USER, {
          reason:
            "System user not found. Create a system user with username 'system' before sending system messages.",
        });
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
