import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  friendships: defineTable({
    userId: v.string(),
    friendId: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("blocked")),
    requestedBy: v.string(),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    lastInteraction: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_friend_status", ["friendId", "status"])
    .index("by_user_friend", ["userId", "friendId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  dmConversations: defineTable({
    participant1Id: v.string(),
    participant2Id: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    participant1LastRead: v.optional(v.number()),
    participant2LastRead: v.optional(v.number()),
    participant1Archived: v.optional(v.boolean()),
    participant2Archived: v.optional(v.boolean()),
  })
    .index("by_participants", ["participant1Id", "participant2Id"])
    .index("by_participant1", ["participant1Id", "lastMessageAt"])
    .index("by_participant2", ["participant2Id", "lastMessageAt"])
    .index("by_last_message", ["lastMessageAt"]),

  directMessages: defineTable({
    conversationId: v.id("dmConversations"),
    senderId: v.string(),
    senderUsername: v.string(),
    message: v.string(),
    createdAt: v.number(),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_sender", ["senderId"])
    .index("by_created", ["createdAt"]),

  playerNotifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("achievement_unlocked"),
      v.literal("level_up"),
      v.literal("quest_completed"),
      v.literal("badge_earned")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  // Global chat messages
  globalChatMessages: defineTable({
    userId: v.string(),
    username: v.string(),
    message: v.string(),
    createdAt: v.number(),
    isSystem: v.boolean(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),

  // User presence tracking
  userPresence: defineTable({
    userId: v.string(),
    username: v.string(),
    lastActiveAt: v.number(),
    status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
  })
    .index("by_user", ["userId"])
    .index("by_last_active", ["lastActiveAt"]),

  // User inbox for notifications, rewards, challenges, etc.
  userInbox: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("reward"),
      v.literal("announcement"),
      v.literal("challenge"),
      v.literal("friend_request"),
      v.literal("guild_invite"),
      v.literal("guild_request"),
      v.literal("system"),
      v.literal("achievement")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    senderId: v.optional(v.string()),
    senderUsername: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_deleted", ["userId", "deletedAt"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),
});
