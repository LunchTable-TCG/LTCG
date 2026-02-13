import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const inviteReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  guildId: v.string(),
  inviterId: v.string(),
  inviteeId: v.string(),
  status: v.string(),
  createdAt: v.number(),
  metadata: v.optional(v.any()),
});

const inviteLinkReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  guildId: v.string(),
  code: v.string(),
  createdBy: v.string(),
  maxUses: v.optional(v.number()),
  currentUses: v.number(),
  expiresAt: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

function generateInviteCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createInvite = mutation({
  args: {
    guildId: v.id("guilds"),
    inviterId: v.string(),
    inviteeId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    // Check if inviter is a member with permissions
    const inviter = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", args.guildId).eq("userId", args.inviterId)
      )
      .unique();

    if (!inviter) {
      throw new Error("Inviter is not a member of this guild");
    }

    if (!["owner", "admin", "moderator"].includes(inviter.role)) {
      throw new Error("Only moderators and above can send invites");
    }

    // Check if invitee is already in a guild
    const inviteeMembership = await ctx.db
      .query("guildMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.inviteeId))
      .first();

    if (inviteeMembership) {
      throw new Error("User is already in a guild");
    }

    // Check if there's already a pending invite
    const existingInvite = await ctx.db
      .query("guildInvites")
      .withIndex("by_invitee", (q) => q.eq("inviteeId", args.inviteeId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvite) {
      throw new Error("User already has a pending invite");
    }

    // Create invite
    const inviteId = await ctx.db.insert("guildInvites", {
      guildId: args.guildId,
      inviterId: args.inviterId,
      inviteeId: args.inviteeId,
      status: "pending",
      createdAt: Date.now(),
    });

    return inviteId as string;
  },
});

export const createInviteLink = mutation({
  args: {
    guildId: v.id("guilds"),
    createdBy: v.string(),
    maxUses: v.optional(v.number()),
    expiresIn: v.optional(v.number()), // milliseconds
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    // Check if creator has permissions
    const creator = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", args.guildId).eq("userId", args.createdBy)
      )
      .unique();

    if (!creator) {
      throw new Error("Creator is not a member of this guild");
    }

    if (!["owner", "admin", "moderator"].includes(creator.role)) {
      throw new Error("Only moderators and above can create invite links");
    }

    // Generate unique code
    let code = generateInviteCode();
    let existing = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    // Keep generating until we get a unique code
    while (existing) {
      code = generateInviteCode();
      existing = await ctx.db
        .query("guildInviteLinks")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
    }

    const expiresAt = args.expiresIn ? Date.now() + args.expiresIn : undefined;

    const linkId = await ctx.db.insert("guildInviteLinks", {
      guildId: args.guildId,
      code,
      createdBy: args.createdBy,
      maxUses: args.maxUses,
      currentUses: 0,
      expiresAt,
    });

    return code;
  },
});

export const acceptInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
    userId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.inviteeId !== args.userId) {
      throw new Error("This invite is not for you");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer valid");
    }

    const guild = await ctx.db.get(invite.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    // Check if user is already in a guild
    const existingMembership = await ctx.db
      .query("guildMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingMembership) {
      throw new Error("You are already in a guild");
    }

    // Check if guild is full
    if (guild.memberCount >= guild.maxMembers) {
      throw new Error("Guild is full");
    }

    // Add member
    const memberId = await ctx.db.insert("guildMembers", {
      guildId: invite.guildId,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    // Update invite status
    await ctx.db.patch(args.inviteId, { status: "accepted" });

    // Update member count
    await ctx.db.patch(invite.guildId, {
      memberCount: guild.memberCount + 1,
    });

    return memberId as string;
  },
});

export const useInviteLink = mutation({
  args: {
    code: v.string(),
    userId: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const inviteLink = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!inviteLink) {
      throw new Error("Invalid invite code");
    }

    // Check if expired
    if (inviteLink.expiresAt && inviteLink.expiresAt < Date.now()) {
      throw new Error("Invite link has expired");
    }

    // Check if max uses reached
    if (
      inviteLink.maxUses &&
      inviteLink.currentUses >= inviteLink.maxUses
    ) {
      throw new Error("Invite link has reached maximum uses");
    }

    const guild = await ctx.db.get(inviteLink.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }

    // Check if user is already in a guild
    const existingMembership = await ctx.db
      .query("guildMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existingMembership) {
      throw new Error("You are already in a guild");
    }

    // Check if guild is full
    if (guild.memberCount >= guild.maxMembers) {
      throw new Error("Guild is full");
    }

    // Add member
    const memberId = await ctx.db.insert("guildMembers", {
      guildId: inviteLink.guildId,
      userId: args.userId,
      role: "member",
      joinedAt: Date.now(),
    });

    // Increment use count
    await ctx.db.patch(inviteLink._id, {
      currentUses: inviteLink.currentUses + 1,
    });

    // Update member count
    await ctx.db.patch(inviteLink.guildId, {
      memberCount: guild.memberCount + 1,
    });

    return memberId as string;
  },
});

export const declineInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    if (invite.inviteeId !== args.userId) {
      throw new Error("This invite is not for you");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer valid");
    }

    await ctx.db.patch(args.inviteId, { status: "declined" });
    return null;
  },
});

export const cancelInvite = mutation({
  args: {
    inviteId: v.id("guildInvites"),
    cancelledBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invite not found");
    }

    // Check if canceller has permissions
    const canceller = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", invite.guildId).eq("userId", args.cancelledBy)
      )
      .unique();

    if (!canceller) {
      throw new Error("You are not a member of this guild");
    }

    // Must be the inviter or have admin/owner role
    if (
      invite.inviterId !== args.cancelledBy &&
      !["owner", "admin"].includes(canceller.role)
    ) {
      throw new Error("Only the inviter or guild admins can cancel invites");
    }

    if (invite.status !== "pending") {
      throw new Error("Invite is no longer valid");
    }

    await ctx.db.patch(args.inviteId, { status: "cancelled" });
    return null;
  },
});

export const getPendingInvites = query({
  args: { userId: v.string() },
  returns: v.array(inviteReturnValidator),
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_invitee", (q) => q.eq("inviteeId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
    return invites.map((invite) => ({
      ...invite,
      _id: invite._id as string,
      guildId: invite.guildId as string,
    }));
  },
});

export const getGuildInvites = query({
  args: {
    guildId: v.id("guilds"),
    status: v.optional(v.string()),
  },
  returns: v.array(inviteReturnValidator),
  handler: async (ctx, args) => {
    let invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();

    if (args.status) {
      invites = invites.filter((invite) => invite.status === args.status);
    }

    return invites.map((invite) => ({
      ...invite,
      _id: invite._id as string,
      guildId: invite.guildId as string,
    }));
  },
});

export const getGuildInviteLinks = query({
  args: { guildId: v.id("guilds") },
  returns: v.array(inviteLinkReturnValidator),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();
    return links.map((link) => ({
      ...link,
      _id: link._id as string,
      guildId: link.guildId as string,
    }));
  },
});

export const deleteInviteLink = mutation({
  args: {
    linkId: v.id("guildInviteLinks"),
    deletedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Invite link not found");
    }

    // Check if deleter has permissions
    const deleter = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", link.guildId).eq("userId", args.deletedBy)
      )
      .unique();

    if (!deleter) {
      throw new Error("You are not a member of this guild");
    }

    // Must be the creator or have admin/owner role
    if (
      link.createdBy !== args.deletedBy &&
      !["owner", "admin"].includes(deleter.role)
    ) {
      throw new Error("Only the creator or guild admins can delete invite links");
    }

    await ctx.db.delete(args.linkId);
    return null;
  },
});
