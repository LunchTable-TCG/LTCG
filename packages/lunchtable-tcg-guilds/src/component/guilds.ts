import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const guildReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  ownerId: v.string(),
  tag: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  bannerUrl: v.optional(v.string()),
  isPublic: v.boolean(),
  maxMembers: v.number(),
  memberCount: v.number(),
  level: v.optional(v.number()),
  xp: v.optional(v.number()),
  metadata: v.optional(v.any()),
});

export const create = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    tag: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    maxMembers: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if user already owns a guild
    const existingGuild = await ctx.db
      .query("guilds")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (existingGuild) {
      throw new Error("User already owns a guild");
    }

    // Check if guild name is taken
    const nameExists = await ctx.db
      .query("guilds")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (nameExists) {
      throw new Error("Guild name already exists");
    }

    const guildId = await ctx.db.insert("guilds", {
      name: args.name,
      description: args.description,
      ownerId: args.ownerId,
      tag: args.tag,
      imageUrl: args.imageUrl,
      bannerUrl: args.bannerUrl,
      isPublic: args.isPublic ?? true,
      maxMembers: args.maxMembers ?? 50,
      memberCount: 1,
      level: 1,
      xp: 0,
      metadata: args.metadata,
    });

    // Add owner as first member
    await ctx.db.insert("guildMembers", {
      guildId,
      userId: args.ownerId,
      role: "owner",
      joinedAt: Date.now(),
    });

    return guildId as string;
  },
});

export const getById = query({
  args: { id: v.id("guilds") },
  returns: v.union(guildReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.id);
    if (!guild) return null;
    return { ...guild, _id: guild._id as string };
  },
});

export const getByOwner = query({
  args: { ownerId: v.string() },
  returns: v.array(guildReturnValidator),
  handler: async (ctx, args) => {
    const guilds = await ctx.db
      .query("guilds")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    return guilds.map((guild) => ({
      ...guild,
      _id: guild._id as string,
    }));
  },
});

export const getPublicGuilds = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(guildReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const guilds = await ctx.db
      .query("guilds")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .take(limit);
    return guilds.map((guild) => ({
      ...guild,
      _id: guild._id as string,
    }));
  },
});

export const update = mutation({
  args: {
    id: v.id("guilds"),
    ownerId: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tag: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
    maxMembers: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.id);
    if (!guild) {
      throw new Error("Guild not found");
    }

    if (guild.ownerId !== args.ownerId) {
      throw new Error("Only the guild owner can update guild settings");
    }

    // If changing name, check if new name is available
    if (args.name && args.name !== guild.name) {
      const nameExists = await ctx.db
        .query("guilds")
        .withIndex("by_name", (q) => q.eq("name", args.name))
        .first();

      if (nameExists) {
        throw new Error("Guild name already exists");
      }
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.tag !== undefined) updates.tag = args.tag;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.bannerUrl !== undefined) updates.bannerUrl = args.bannerUrl;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;
    if (args.maxMembers !== undefined) updates.maxMembers = args.maxMembers;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.id, updates);
    return null;
  },
});

export const disband = mutation({
  args: {
    id: v.id("guilds"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const guild = await ctx.db.get(args.id);
    if (!guild) {
      throw new Error("Guild not found");
    }

    if (guild.ownerId !== args.ownerId) {
      throw new Error("Only the guild owner can disband the guild");
    }

    // Delete all guild members
    const members = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild", (q) => q.eq("guildId", args.id))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    // Delete all guild messages
    const messages = await ctx.db
      .query("guildMessages")
      .withIndex("by_guild", (q) => q.eq("guildId", args.id))
      .collect();
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all guild invites
    const invites = await ctx.db
      .query("guildInvites")
      .withIndex("by_guild", (q) => q.eq("guildId", args.id))
      .collect();
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
    }

    // Delete all join requests
    const requests = await ctx.db
      .query("guildJoinRequests")
      .withIndex("by_guild", (q) => q.eq("guildId", args.id))
      .collect();
    for (const request of requests) {
      await ctx.db.delete(request._id);
    }

    // Delete all invite links
    const inviteLinks = await ctx.db
      .query("guildInviteLinks")
      .withIndex("by_guild", (q) => q.eq("guildId", args.id))
      .collect();
    for (const link of inviteLinks) {
      await ctx.db.delete(link._id);
    }

    // Finally, delete the guild itself
    await ctx.db.delete(args.id);
    return null;
  },
});
