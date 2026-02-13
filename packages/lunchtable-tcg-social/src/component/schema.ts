import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  friendships: defineTable({
    userId1: v.string(),
    userId2: v.string(),
    status: v.string(),        // "pending" | "accepted" | "blocked"
    initiatedBy: v.string(),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_pair", ["userId1", "userId2"]),

  directMessages: defineTable({
    conversationId: v.id("dmConversations"),
    senderId: v.string(),
    content: v.string(),
    timestamp: v.number(),
    readBy: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  })
    .index("by_conversation", ["conversationId"]),

  dmConversations: defineTable({
    participantIds: v.array(v.string()),
    lastMessageAt: v.optional(v.number()),
    lastMessagePreview: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_participants", ["participantIds"]),

  userPresence: defineTable({
    userId: v.string(),
    status: v.string(),        // "online" | "offline" | "away" | "in_game"
    lastSeen: v.number(),
    currentActivity: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"]),

  playerNotifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
    data: v.optional(v.any()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"]),
});
