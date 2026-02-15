import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    users: defineTable({
      privyId: v.string(),
      username: v.string(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      activeDeckId: v.optional(v.string()),
      isAnonymous: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_privyId", ["privyId"])
      .index("by_username", ["username"]),
    agents: defineTable({
      name: v.string(),
      apiKeyHash: v.string(),
      apiKeyPrefix: v.string(),
      userId: v.id("users"),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
      .index("by_apiKeyHash", ["apiKeyHash"])
      .index("by_userId", ["userId"]),
  },
  { schemaValidation: false },
);
