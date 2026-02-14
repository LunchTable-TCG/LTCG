import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

export default defineSchema({
  emailTemplates: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(),
    variables: v.array(v.string()),
    category: literals("newsletter", "announcement", "promotional", "transactional", "custom"),
    isActive: v.boolean(),
    createdBy: v.string(), // external ref → v.string()
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category", "isActive"])
    .index("by_active", ["isActive"]),

  emailLists: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.number(),
    createdBy: v.string(), // external ref → v.string()
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  emailSubscribers: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    listId: v.id("emailLists"), // intra-component ref
    tags: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    subscribedAt: v.number(),
    unsubscribedAt: v.optional(v.number()),
  })
    .index("by_list", ["listId", "isActive"])
    .index("by_email", ["email"])
    .index("by_email_list", ["email", "listId"]),

  emailHistory: defineTable({
    scheduledContentId: v.optional(v.string()), // cross-component → v.string()
    templateId: v.optional(v.id("emailTemplates")), // intra-component ref
    subject: v.string(),
    recipientCount: v.number(),
    sentCount: v.number(),
    failedCount: v.number(),
    openCount: v.optional(v.number()),
    clickCount: v.optional(v.number()),
    status: literals("sending", "completed", "partial", "failed"),
    resendBatchId: v.optional(v.string()),
    sentBy: v.string(), // external ref → v.string()
    sentAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_sent", ["sentAt"])
    .index("by_content", ["scheduledContentId"]),
});
