import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { getGuildById, getUserGuildMembership, requireGuildOwnership } from "./core";

// ============================================================================
// Constants
// ============================================================================

const MAX_GUILD_MEMBERS = 50;
const MAX_REQUEST_MESSAGE_LENGTH = 200;

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets the current user's pending join requests
 */
export const getMyJoinRequests = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("guildJoinRequests"),
      guildId: v.id("guilds"),
      guildName: v.string(),
      guildProfileImageUrl: v.optional(v.string()),
      guildMemberCount: v.number(),
      message: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("cancelled")
      ),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Get user's requests
    const requests = await ctx.db
      .query("guildJoinRequests")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId).eq("status", "pending"))
      .collect();

    // Resolve guild details
    const results = await Promise.all(
      requests.map(async (request) => {
        const guild = await ctx.db.get(request.guildId);
        if (!guild) return null;

        const profileImageUrl = guild.profileImageId
          ? await ctx.storage.getUrl(guild.profileImageId)
          : null;

        return {
          _id: request._id,
          guildId: request.guildId,
          guildName: guild.name,
          guildProfileImageUrl: profileImageUrl ?? undefined,
          guildMemberCount: guild.memberCount,
          message: request.message,
          status: request.status,
          createdAt: request.createdAt,
        };
      })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Gets pending join requests for a guild (owner only)
 */
export const getGuildJoinRequests = query({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.array(
    v.object({
      _id: v.id("guildJoinRequests"),
      userId: v.id("users"),
      username: v.optional(v.string()),
      level: v.number(),
      rankedElo: v.number(),
      isAiAgent: v.boolean(),
      message: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, auth.userId, args.guildId);

    // Get pending requests
    const requests = await ctx.db
      .query("guildJoinRequests")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId).eq("status", "pending"))
      .collect();

    // Resolve user details
    const results = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);

        return {
          _id: request._id,
          userId: request.userId,
          username: user?.username,
          level: user?.level ?? 1,
          rankedElo: user?.rankedElo ?? 1000,
          isAiAgent: user?.isAiAgent ?? false,
          message: request.message,
          createdAt: request.createdAt,
        };
      })
    );

    // Sort by creation time (newest first)
    return results.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Requests to join a private guild
 * - Guild must be private
 * - User must not already be in a guild
 * - User must not have a pending request
 */
export const requestToJoin = mutation({
  args: {
    guildId: v.id("guilds"),
    message: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get guild
    const guild = await getGuildById(ctx, args.guildId);

    // Guild must be private (public guilds can be joined directly)
    if (guild.visibility !== "private") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This guild is public. You can join directly.",
      });
    }

    // Check if guild is full
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Check if user is already in a guild
    const existingMembership = await getUserGuildMembership(ctx, userId);
    if (existingMembership) {
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD);
    }

    // Check for existing pending request
    const existingRequest = await ctx.db
      .query("guildJoinRequests")
      .withIndex("by_guild_user", (q) => q.eq("guildId", args.guildId).eq("userId", userId))
      .first();

    if (existingRequest && existingRequest.status === "pending") {
      throw createError(ErrorCode.GUILD_REQUEST_ALREADY_PENDING);
    }

    // Validate message length
    if (args.message && args.message.length > MAX_REQUEST_MESSAGE_LENGTH) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Message must be ${MAX_REQUEST_MESSAGE_LENGTH} characters or less`,
      });
    }

    const now = Date.now();

    // Create request
    await ctx.db.insert("guildJoinRequests", {
      guildId: args.guildId,
      userId,
      message: args.message,
      status: "pending",
      createdAt: now,
    });

    // TODO: Send inbox notification to guild owner

    return { success: true };
  },
});

/**
 * Cancels a pending join request
 */
export const cancelJoinRequest = mutation({
  args: {
    requestId: v.id("guildJoinRequests"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get request
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw createError(ErrorCode.GUILD_REQUEST_NOT_FOUND);
    }

    // Verify request is from this user
    if (request.userId !== userId) {
      throw createError(ErrorCode.GUILD_REQUEST_NOT_FOUND);
    }

    // Cancel request
    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Approves a join request (owner only)
 */
export const approveRequest = mutation({
  args: {
    requestId: v.id("guildJoinRequests"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId: ownerId } = await requireAuthMutation(ctx);

    // Get request
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw createError(ErrorCode.GUILD_REQUEST_NOT_FOUND);
    }

    // Verify ownership
    await requireGuildOwnership(ctx, ownerId, request.guildId);

    // Get guild
    const guild = await getGuildById(ctx, request.guildId);

    // Check if guild is full
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Check if user is still not in a guild
    const existingMembership = await getUserGuildMembership(ctx, request.userId);
    if (existingMembership) {
      // User joined another guild, reject this request
      await ctx.db.patch(args.requestId, {
        status: "rejected",
        respondedAt: Date.now(),
        respondedBy: ownerId,
      });
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD, {
        reason: "This user has already joined another guild",
      });
    }

    const now = Date.now();
    const newMember = await ctx.db.get(request.userId);

    // Approve request
    await ctx.db.patch(args.requestId, {
      status: "approved",
      respondedAt: now,
      respondedBy: ownerId,
    });

    // Add as member
    await ctx.db.insert("guildMembers", {
      guildId: request.guildId,
      userId: request.userId,
      role: "member",
      joinedAt: now,
    });

    // Update member count
    await ctx.db.patch(request.guildId, {
      memberCount: guild.memberCount + 1,
      updatedAt: now,
    });

    // Send system message
    await ctx.db.insert("guildMessages", {
      guildId: request.guildId,
      userId: request.userId,
      username: newMember?.username || "Unknown",
      message: `${newMember?.username || "A new member"} has joined the guild!`,
      createdAt: now,
      isSystem: true,
    });

    // TODO: Send inbox notification to user

    return { success: true };
  },
});

/**
 * Rejects a join request (owner only)
 */
export const rejectRequest = mutation({
  args: {
    requestId: v.id("guildJoinRequests"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId: ownerId } = await requireAuthMutation(ctx);

    // Get request
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw createError(ErrorCode.GUILD_REQUEST_NOT_FOUND);
    }

    // Verify ownership
    await requireGuildOwnership(ctx, ownerId, request.guildId);

    // Reject request
    await ctx.db.patch(args.requestId, {
      status: "rejected",
      respondedAt: Date.now(),
      respondedBy: ownerId,
    });

    // TODO: Send inbox notification to user

    return { success: true };
  },
});
