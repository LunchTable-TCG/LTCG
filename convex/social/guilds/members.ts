import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import {
  MAX_GUILD_MEMBERS,
  getGuildById,
  getUserGuildMembership,
  requireGuildMembership,
  requireGuildOwnership,
} from "./core";

// ============================================================================
// Constants
// ============================================================================

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Queries
// ============================================================================

/**
 * Gets all members of a guild with online status
 */
export const getGuildMembers = query({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      username: v.optional(v.string()),
      role: v.union(v.literal("owner"), v.literal("member")),
      joinedAt: v.number(),
      isOnline: v.boolean(),
      status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
      rankedElo: v.number(),
      level: v.number(),
      isAiAgent: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    // Get all members
    const members = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();

    if (members.length === 0) {
      return [];
    }

    // Get user details and presence for all members
    const now = Date.now();
    const results = await Promise.all(
      members.map(async (member) => {
        const [user, presence] = await Promise.all([
          ctx.db.get(member.userId),
          ctx.db
            .query("userPresence")
            .withIndex("by_user", (q) => q.eq("userId", member.userId))
            .first(),
        ]);

        const isOnline = presence ? now - presence.lastActiveAt < ONLINE_THRESHOLD_MS : false;

        return {
          userId: member.userId,
          username: user?.username,
          role: member.role,
          joinedAt: member.joinedAt,
          isOnline,
          status: (presence?.status ?? "idle") as "online" | "in_game" | "idle",
          rankedElo: user?.rankedElo ?? 1000,
          level: user?.level ?? 1,
          isAiAgent: user?.isAiAgent ?? false,
        };
      })
    );

    // Sort: owner first, then by online status, then by join date
    return results.sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (b.role === "owner" && a.role !== "owner") return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (b.isOnline && !a.isOnline) return 1;
      return a.joinedAt - b.joinedAt;
    });
  },
});

/**
 * Gets count of online members in a guild
 */
export const getOnlineMemberCount = query({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();

    const now = Date.now();
    let onlineCount = 0;

    for (const member of members) {
      const presence = await ctx.db
        .query("userPresence")
        .withIndex("by_user", (q) => q.eq("userId", member.userId))
        .first();

      if (presence && now - presence.lastActiveAt < ONLINE_THRESHOLD_MS) {
        onlineCount++;
      }
    }

    return onlineCount;
  },
});

/**
 * Checks if a specific user is a member of a guild
 */
export const isMember = query({
  args: {
    guildId: v.id("guilds"),
    userId: v.id("users"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) => q.eq("guildId", args.guildId).eq("userId", args.userId))
      .first();

    return membership !== null;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Joins a public guild directly
 * - Guild must be public
 * - User must not already be in a guild
 * - Guild must not be full
 */
export const joinPublicGuild = mutation({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Get guild
    const guild = await getGuildById(ctx, args.guildId);

    // Check if guild is public
    if (guild.visibility !== "public") {
      throw createError(ErrorCode.GUILD_OWNER_REQUIRED, {
        reason: "This guild is private. You must be invited or request to join.",
      });
    }

    // Check if user is already in a guild
    const existingMembership = await getUserGuildMembership(ctx, userId);
    if (existingMembership) {
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD);
    }

    // Check if guild is full
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    const now = Date.now();

    // Add user as member
    await ctx.db.insert("guildMembers", {
      guildId: args.guildId,
      userId,
      role: "member",
      joinedAt: now,
    });

    // Update member count
    await ctx.db.patch(args.guildId, {
      memberCount: guild.memberCount + 1,
      updatedAt: now,
    });

    // Send system message to guild chat
    await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
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
 * Leaves a guild
 * - Owner cannot leave (must transfer ownership or delete guild)
 */
export const leaveGuild = mutation({
  args: {
    guildId: v.id("guilds"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Get membership
    const membership = await requireGuildMembership(ctx, userId, args.guildId);

    // Owner cannot leave
    if (membership.role === "owner") {
      throw createError(ErrorCode.GUILD_CANNOT_LEAVE_AS_OWNER);
    }

    const guild = await getGuildById(ctx, args.guildId);
    const now = Date.now();

    // Remove membership
    await ctx.db.delete(membership._id);

    // Update member count
    await ctx.db.patch(args.guildId, {
      memberCount: Math.max(0, guild.memberCount - 1),
      updatedAt: now,
    });

    // Send system message
    await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
      userId,
      username: username || "Unknown",
      message: `${username || "A member"} has left the guild.`,
      createdAt: now,
      isSystem: true,
    });

    return { success: true };
  },
});

/**
 * Kicks a member from the guild
 * - Only owner can kick
 * - Cannot kick owner or self
 */
export const kickMember = mutation({
  args: {
    guildId: v.id("guilds"),
    userId: v.id("users"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId: kickerId, username: kickerUsername } = await requireAuthMutation(ctx);

    // Verify kicker is owner
    await requireGuildOwnership(ctx, kickerId, args.guildId);

    // Cannot kick self
    if (args.userId === kickerId) {
      throw createError(ErrorCode.GUILD_CANNOT_KICK_SELF);
    }

    // Get target membership
    const targetMembership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) => q.eq("guildId", args.guildId).eq("userId", args.userId))
      .first();

    if (!targetMembership) {
      throw createError(ErrorCode.GUILD_NOT_A_MEMBER);
    }

    // Cannot kick owner (shouldn't happen, but safety check)
    if (targetMembership.role === "owner") {
      throw createError(ErrorCode.GUILD_CANNOT_KICK_OWNER);
    }

    const [guild, targetUser] = await Promise.all([
      getGuildById(ctx, args.guildId),
      ctx.db.get(args.userId),
    ]);

    const now = Date.now();

    // Remove membership
    await ctx.db.delete(targetMembership._id);

    // Update member count
    await ctx.db.patch(args.guildId, {
      memberCount: Math.max(0, guild.memberCount - 1),
      updatedAt: now,
    });

    // Send system message
    await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
      userId: kickerId,
      username: kickerUsername || "Unknown",
      message: `${targetUser?.username || "A member"} was removed from the guild.`,
      createdAt: now,
      isSystem: true,
    });

    return { success: true };
  },
});
