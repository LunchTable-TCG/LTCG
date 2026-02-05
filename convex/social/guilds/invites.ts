import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { getGuildById, getUserGuildMembership, requireGuildOwnership } from "./core";

// ============================================================================
// Constants
// ============================================================================

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_GUILD_MEMBERS = 50;

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets all pending invites for the current user
 */
export const getMyInvites = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("guildInvites"),
      guildId: v.id("guilds"),
      guildName: v.string(),
      guildProfileImageUrl: v.optional(v.string()),
      guildMemberCount: v.number(),
      invitedByUsername: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Get pending invites
    const invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_invited_user", (q) =>
        q.eq("invitedUserId", auth.userId).eq("status", "pending")
      )
      .collect();

    const now = Date.now();

    // Filter out expired invites and resolve details
    const results = await Promise.all(
      invites
        .filter((invite) => invite.expiresAt > now)
        .map(async (invite) => {
          const [guild, inviter] = await Promise.all([
            ctx.db.get(invite.guildId),
            ctx.db.get(invite.invitedBy),
          ]);

          if (!guild) return null;

          const profileImageUrl = guild.profileImageId
            ? await ctx.storage.getUrl(guild.profileImageId)
            : null;

          return {
            _id: invite._id,
            guildId: invite.guildId,
            guildName: guild.name,
            guildProfileImageUrl: profileImageUrl ?? undefined,
            guildMemberCount: guild.memberCount,
            invitedByUsername: inviter?.username,
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
          };
        })
    );

    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});

/**
 * Gets pending invites for a guild (owner only)
 */
export const getGuildPendingInvites = query({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.array(
    v.object({
      _id: v.id("guildInvites"),
      invitedUserId: v.id("users"),
      invitedUsername: v.optional(v.string()),
      invitedByUsername: v.optional(v.string()),
      createdAt: v.number(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const auth = await requireAuthQuery(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, auth.userId, args.guildId);

    // Get pending invites
    const invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId).eq("status", "pending"))
      .collect();

    const now = Date.now();

    // Filter out expired and resolve details
    const results = await Promise.all(
      invites
        .filter((invite) => invite.expiresAt > now)
        .map(async (invite) => {
          const [invitedUser, inviter] = await Promise.all([
            ctx.db.get(invite.invitedUserId),
            ctx.db.get(invite.invitedBy),
          ]);

          return {
            _id: invite._id,
            invitedUserId: invite.invitedUserId,
            invitedUsername: invitedUser?.username,
            invitedByUsername: inviter?.username,
            createdAt: invite.createdAt,
            expiresAt: invite.expiresAt,
          };
        })
    );

    return results;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Sends an invite to a user
 * - Only owner can send invites
 * - Cannot invite self
 * - Cannot invite someone already in a guild
 * - Cannot invite someone who already has a pending invite
 */
export const sendInvite = mutation({
  args: {
    guildId: v.id("guilds"),
    username: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Verify ownership
    await requireGuildOwnership(ctx, userId, args.guildId);
    const guild = await getGuildById(ctx, args.guildId);

    // Check if guild is full
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Find target user by username
    const targetUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username))
      .first();

    if (!targetUser) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Cannot invite self
    if (targetUser._id === userId) {
      throw createError(ErrorCode.GUILD_CANNOT_INVITE_SELF);
    }

    // Check if target is already in a guild
    const targetMembership = await getUserGuildMembership(ctx, targetUser._id);
    if (targetMembership) {
      if (targetMembership.guildId === args.guildId) {
        throw createError(ErrorCode.GUILD_ALREADY_MEMBER);
      }
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD, {
        reason: "This user is already in another guild",
      });
    }

    // Check for existing pending invite
    const existingInvite = await ctx.db
      .query("guildInvites")
      .withIndex("by_guild_invited", (q) =>
        q.eq("guildId", args.guildId).eq("invitedUserId", targetUser._id)
      )
      .first();

    if (existingInvite && existingInvite.status === "pending") {
      throw createError(ErrorCode.GUILD_INVITE_ALREADY_PENDING);
    }

    const now = Date.now();

    // Create invite
    await ctx.db.insert("guildInvites", {
      guildId: args.guildId,
      invitedUserId: targetUser._id,
      invitedBy: userId,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVITE_EXPIRY_MS,
    });

    // TODO: Send inbox notification to target user

    return { success: true };
  },
});

/**
 * Accepts a guild invite
 * - User must not already be in a guild
 * - Invite must be valid and not expired
 */
export const acceptInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Get invite
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw createError(ErrorCode.GUILD_INVITE_NOT_FOUND);
    }

    // Verify invite is for this user
    if (invite.invitedUserId !== userId) {
      throw createError(ErrorCode.GUILD_INVITE_NOT_FOUND);
    }

    // Check if expired
    const now = Date.now();
    if (invite.expiresAt < now) {
      // Mark as expired
      await ctx.db.patch(args.inviteId, { status: "expired" });
      throw createError(ErrorCode.GUILD_INVITE_EXPIRED);
    }

    // Check if user is already in a guild
    const existingMembership = await getUserGuildMembership(ctx, userId);
    if (existingMembership) {
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD);
    }

    // Get guild
    const guild = await getGuildById(ctx, invite.guildId);

    // Check if guild is full
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Accept invite
    await ctx.db.patch(args.inviteId, {
      status: "accepted",
      respondedAt: now,
    });

    // Add as member
    await ctx.db.insert("guildMembers", {
      guildId: invite.guildId,
      userId,
      role: "member",
      joinedAt: now,
    });

    // Update member count
    await ctx.db.patch(invite.guildId, {
      memberCount: guild.memberCount + 1,
      updatedAt: now,
    });

    // Send system message
    await ctx.db.insert("guildMessages", {
      guildId: invite.guildId,
      userId,
      username: username || "Unknown",
      message: `${username || "A new member"} has joined the guild!`,
      createdAt: now,
      isSystem: true,
    });

    return { success: true };
  },
});

/**
 * Declines a guild invite
 */
export const declineInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get invite
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw createError(ErrorCode.GUILD_INVITE_NOT_FOUND);
    }

    // Verify invite is for this user
    if (invite.invitedUserId !== userId) {
      throw createError(ErrorCode.GUILD_INVITE_NOT_FOUND);
    }

    // Decline invite
    await ctx.db.patch(args.inviteId, {
      status: "declined",
      respondedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cancels a sent invite (owner only)
 */
export const cancelInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get invite
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.status !== "pending") {
      throw createError(ErrorCode.GUILD_INVITE_NOT_FOUND);
    }

    // Verify ownership of guild
    await requireGuildOwnership(ctx, userId, invite.guildId);

    // Delete invite
    await ctx.db.delete(args.inviteId);

    return { success: true };
  },
});
