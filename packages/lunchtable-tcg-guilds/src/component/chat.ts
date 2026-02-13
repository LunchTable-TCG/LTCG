import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const messageReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  guildId: v.string(),
  senderId: v.string(),
  senderName: v.string(),
  content: v.string(),
  timestamp: v.number(),
  metadata: v.optional(v.any()),
});

export const sendMessage = mutation({
  args: {
    guildId: v.id("guilds"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Verify sender is a member of the guild
    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", args.guildId).eq("userId", args.senderId)
      )
      .unique();

    if (!membership) {
      throw new Error("You must be a member of this guild to send messages");
    }

    const messageId = await ctx.db.insert("guildMessages", {
      guildId: args.guildId,
      senderId: args.senderId,
      senderName: args.senderName,
      content: args.content,
      timestamp: Date.now(),
      metadata: args.metadata,
    });

    return messageId as string;
  },
});

export const getMessages = query({
  args: {
    guildId: v.id("guilds"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let query = ctx.db
      .query("guildMessages")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId));

    let messages = await query.collect();

    // Filter by timestamp if provided
    if (args.before !== undefined) {
      messages = messages.filter((msg) => msg.timestamp < args.before);
    }

    // Sort by timestamp descending and take limit
    messages.sort((a, b) => b.timestamp - a.timestamp);
    messages = messages.slice(0, limit);

    return messages.map((msg) => ({
      ...msg,
      _id: msg._id as string,
      guildId: msg.guildId as string,
    }));
  },
});

export const getRecentMessages = query({
  args: {
    guildId: v.id("guilds"),
    count: v.optional(v.number()),
  },
  returns: v.array(messageReturnValidator),
  handler: async (ctx, args) => {
    const count = args.count ?? 50;

    const messages = await ctx.db
      .query("guildMessages")
      .withIndex("by_guild", (q) => q.eq("guildId", args.guildId))
      .collect();

    // Sort by timestamp descending and take count
    messages.sort((a, b) => b.timestamp - a.timestamp);
    const recent = messages.slice(0, count);

    return recent.map((msg) => ({
      ...msg,
      _id: msg._id as string,
      guildId: msg.guildId as string,
    }));
  },
});

export const deleteMessage = mutation({
  args: {
    messageId: v.id("guildMessages"),
    deletedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if deleter is the sender
    if (message.senderId === args.deletedBy) {
      await ctx.db.delete(args.messageId);
      return null;
    }

    // Check if deleter is admin or owner
    const membership = await ctx.db
      .query("guildMembers")
      .withIndex("by_guild_user", (q) =>
        q.eq("guildId", message.guildId).eq("userId", args.deletedBy)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this guild");
    }

    if (!["owner", "admin"].includes(membership.role)) {
      throw new Error("Only the message sender, guild owner, or admin can delete messages");
    }

    await ctx.db.delete(args.messageId);
    return null;
  },
});
