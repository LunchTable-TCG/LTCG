import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { requireGuildMembership } from "./core";

// ============================================================================
// Constants
// ============================================================================

const MAX_MESSAGE_LENGTH = 500;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_MESSAGE_LIMIT = 100;

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets recent messages for a guild
 * - User must be a member
 */
export const getRecentMessages = query({
  args: {
    guildId: v.id("guilds"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("guildMessages"),
      userId: v.id("users"),
      username: v.string(),
      message: v.string(),
      createdAt: v.number(),
      isSystem: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Verify membership
    await requireGuildMembership(ctx, auth.userId, args.guildId);

    const limit = Math.min(args.limit ?? DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT);

    // Get recent messages
    const messages = await ctx.db
      .query("guildMessages")
      .withIndex("by_guild_created", (q) => q.eq("guildId", args.guildId))
      .order("desc")
      .take(limit);

    // Return in chronological order
    return messages.reverse();
  },
});

/**
 * Gets paginated messages for a guild (for infinite scroll)
 * - User must be a member
 */
export const getPaginatedMessages = query({
  args: {
    guildId: v.id("guilds"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Verify membership
    await requireGuildMembership(ctx, auth.userId, args.guildId);

    // Get paginated messages (newest first for infinite scroll)
    const result = await ctx.db
      .query("guildMessages")
      .withIndex("by_guild_created", (q) => q.eq("guildId", args.guildId))
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});

/**
 * Gets message count for a guild
 */
export const getMessageCount = query({
  args: {
    guildId: v.id("guilds"),
    since: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("guildMessages")
      .withIndex("by_guild_created", (q) => q.eq("guildId", args.guildId));

    if (args.since) {
      query = query.filter((q) => q.gte(q.field("createdAt"), args.since!));
    }

    const messages = await query.collect();
    return messages.length;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Sends a message to a guild chat
 * - User must be a member
 * - Message must not be empty
 * - Message must be under max length
 * - Rate limited to prevent spam
 */
export const sendMessage = mutation({
  args: {
    guildId: v.id("guilds"),
    message: v.string(),
  },
  returns: v.object({
    messageId: v.id("guildMessages"),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Verify membership
    await requireGuildMembership(ctx, userId, args.guildId);

    // Validate message
    const trimmedMessage = args.message.trim();
    if (trimmedMessage.length === 0) {
      throw createError(ErrorCode.CHAT_MESSAGE_EMPTY);
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      throw createError(ErrorCode.CHAT_MESSAGE_TOO_LONG);
    }

    // TODO: Add rate limiting (reuse pattern from globalChat.ts)

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
      userId,
      username: username || "Unknown",
      message: trimmedMessage,
      createdAt: now,
      isSystem: false,
    });

    // Update member's last active time
    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) => q.eq("guildId", args.guildId).eq("userId", userId))
      .first();

    if (membership) {
      await ctx.db.patch(membership._id, { lastActiveAt: now });
    }

    return { messageId };
  },
});

/**
 * Sends a system message to a guild chat (internal use)
 * This is used by other mutations to announce events
 */
export const sendSystemMessage = mutation({
  args: {
    guildId: v.id("guilds"),
    message: v.string(),
  },
  returns: v.object({
    messageId: v.id("guildMessages"),
  }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    const now = Date.now();

    // Create system message
    const messageId = await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
      userId,
      username: username || "System",
      message: args.message,
      createdAt: now,
      isSystem: true,
    });

    return { messageId };
  },
});
