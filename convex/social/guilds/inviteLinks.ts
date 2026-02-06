import { v } from "convex/values";
import { query } from "../../_generated/server";
import { mutation } from "../../functions";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { MAX_GUILD_MEMBERS, getGuildById, getUserGuildMembership } from "./core";

// ============================================================================
// Constants
// ============================================================================

const INVITE_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CODE_LENGTH = 8;
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// ============================================================================
// Helpers
// ============================================================================

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get public guild info by invite code (no auth required).
 * Used by the invite landing page to show a guild preview before login.
 */
export const getGuildByInviteCode = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      guildId: v.id("guilds"),
      guildName: v.string(),
      guildDescription: v.optional(v.string()),
      guildProfileImageUrl: v.optional(v.string()),
      guildMemberCount: v.number(),
      guildMaxMembers: v.number(),
      inviterUsername: v.optional(v.string()),
      isExpired: v.boolean(),
      isFull: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link || !link.isActive) {
      return null;
    }

    const guild = await ctx.db.get(link.guildId);
    if (!guild) {
      return null;
    }

    const inviter = await ctx.db.get(link.createdBy);

    const profileImageUrl = guild.profileImageId
      ? await ctx.storage.getUrl(guild.profileImageId)
      : null;

    const now = Date.now();
    const isExpired = link.expiresAt < now;
    const isFull = guild.memberCount >= MAX_GUILD_MEMBERS;

    return {
      guildId: guild._id,
      guildName: guild.name,
      guildDescription: guild.description,
      guildProfileImageUrl: profileImageUrl ?? undefined,
      guildMemberCount: guild.memberCount,
      guildMaxMembers: MAX_GUILD_MEMBERS,
      inviterUsername: inviter?.username,
      isExpired,
      isFull,
    };
  },
});

/**
 * Get the current user's active invite link for their guild.
 * Returns null if no active link exists.
 */
export const getMyGuildInviteLink = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      code: v.string(),
      uses: v.number(),
      expiresAt: v.number(),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    // Find user's guild membership
    const membership = await getUserGuildMembership(ctx, auth.userId);
    if (!membership) return null;

    const now = Date.now();

    // Find active, non-expired link created by this user for their guild
    const links = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_creator", (q) => q.eq("createdBy", auth.userId))
      .collect();

    const activeLink = links.find(
      (l) => l.guildId === membership.guildId && l.isActive && l.expiresAt > now
    );

    if (!activeLink) return null;

    return {
      code: activeLink.code,
      uses: activeLink.uses,
      expiresAt: activeLink.expiresAt,
      createdAt: activeLink.createdAt,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Generate a new invite link for the current user's guild.
 * Any guild member can generate a link. Deactivates any existing link first.
 */
export const generateInviteLink = mutation({
  args: {},
  returns: v.object({ code: v.string(), expiresAt: v.number() }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Find user's guild membership
    const membership = await getUserGuildMembership(ctx, userId);
    if (!membership) {
      throw createError(ErrorCode.GUILD_NOT_A_MEMBER);
    }

    const guild = await getGuildById(ctx, membership.guildId);
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Deactivate existing links from this user for this guild
    const existingLinks = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .collect();

    for (const link of existingLinks) {
      if (link.guildId === membership.guildId && link.isActive) {
        await ctx.db.patch(link._id, { isActive: false });
      }
    }

    // Generate unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    // Retry if collision (extremely unlikely with 8-char alphanumeric)
    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("guildInviteLinks")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const now = Date.now();
    const expiresAt = now + INVITE_LINK_EXPIRY_MS;

    await ctx.db.insert("guildInviteLinks", {
      guildId: membership.guildId,
      code,
      createdBy: userId,
      uses: 0,
      expiresAt,
      isActive: true,
      createdAt: now,
    });

    return { code, expiresAt };
  },
});

/**
 * Join a guild via an invite link code.
 * The user must be authenticated and not already in a guild.
 */
export const joinViaInviteLink = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({ success: v.boolean(), guildId: v.id("guilds") }),
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Find the invite link
    const link = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!link || !link.isActive) {
      throw createError(ErrorCode.GUILD_INVITE_LINK_NOT_FOUND);
    }

    // Check expiry
    const now = Date.now();
    if (link.expiresAt < now) {
      await ctx.db.patch(link._id, { isActive: false });
      throw createError(ErrorCode.GUILD_INVITE_LINK_EXPIRED);
    }

    // Check max uses
    if (link.maxUses !== undefined && link.uses >= link.maxUses) {
      throw createError(ErrorCode.GUILD_INVITE_LINK_MAX_USES);
    }

    // Check if user is already in a guild
    const existingMembership = await getUserGuildMembership(ctx, userId);
    if (existingMembership) {
      if (existingMembership.guildId === link.guildId) {
        throw createError(ErrorCode.GUILD_ALREADY_MEMBER);
      }
      throw createError(ErrorCode.GUILD_ALREADY_IN_GUILD);
    }

    // Check if guild is full
    const guild = await getGuildById(ctx, link.guildId);
    if (guild.memberCount >= MAX_GUILD_MEMBERS) {
      throw createError(ErrorCode.GUILD_FULL);
    }

    // Join the guild
    await ctx.db.insert("guildMembers", {
      guildId: link.guildId,
      userId,
      role: "member",
      joinedAt: now,
    });

    // Update member count
    await ctx.db.patch(link.guildId, {
      memberCount: guild.memberCount + 1,
      updatedAt: now,
    });

    // Increment link uses
    await ctx.db.patch(link._id, { uses: link.uses + 1 });

    // Send system message
    await ctx.db.insert("guildMessages", {
      guildId: link.guildId,
      userId,
      username: username || "Unknown",
      message: `${username || "A new member"} has joined the guild via invite link!`,
      createdAt: now,
      isSystem: true,
    });

    return { success: true, guildId: link.guildId };
  },
});
