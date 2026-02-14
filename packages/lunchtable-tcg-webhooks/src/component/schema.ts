import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  webhookConfig: defineTable({
    provider: v.union(v.literal("helius"), v.literal("shyft"), v.literal("bitquery")),
    webhookId: v.optional(v.string()),
    webhookUrl: v.string(),
    webhookSecret: v.optional(v.string()),
    tokenMint: v.optional(v.string()),
    isActive: v.boolean(),
    lastEventAt: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  webhooks: defineTable({
    agentId: v.string(), // external ref → v.string()
    events: v.array(v.string()),
    url: v.string(),
    secret: v.optional(v.string()),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    failureCount: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_active", ["isActive"]),
});
