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
});
