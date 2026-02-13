import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  guilds: defineTable({
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
  })
    .index("by_name", ["name"])
    .index("by_owner", ["ownerId"])
    .index("by_public", ["isPublic"]),

  guildMembers: defineTable({
    guildId: v.id("guilds"),
    userId: v.string(),
    role: v.string(), // "owner" | "admin" | "moderator" | "member"
    joinedAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_guild", ["guildId"])
    .index("by_user", ["userId"])
    .index("by_guild_user", ["guildId", "userId"]),

  guildMessages: defineTable({
    guildId: v.id("guilds"),
    senderId: v.string(),
    senderName: v.string(),
    content: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  }).index("by_guild", ["guildId"]),

  guildInvites: defineTable({
    guildId: v.id("guilds"),
    inviterId: v.string(),
    inviteeId: v.string(),
    status: v.string(), // "pending" | "accepted" | "declined" | "cancelled"
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_guild", ["guildId"])
    .index("by_invitee", ["inviteeId"]),

  guildJoinRequests: defineTable({
    guildId: v.id("guilds"),
    requesterId: v.string(),
    status: v.string(), // "pending" | "approved" | "rejected"
    message: v.optional(v.string()),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_guild", ["guildId"])
    .index("by_requester", ["requesterId"]),

  guildInviteLinks: defineTable({
    guildId: v.id("guilds"),
    code: v.string(),
    createdBy: v.string(),
    maxUses: v.optional(v.number()),
    currentUses: v.number(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_guild", ["guildId"])
    .index("by_code", ["code"]),
});
