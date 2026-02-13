import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  achievementDefinitions: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    iconUrl: v.optional(v.string()),
    requirement: v.any(),      // { type, target, threshold }
    reward: v.optional(v.any()),
    isHidden: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  userAchievements: defineTable({
    userId: v.string(),
    achievementKey: v.string(),
    progress: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    claimed: v.optional(v.boolean()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementKey"]),

  questDefinitions: defineTable({
    key: v.string(),
    name: v.string(),
    description: v.string(),
    type: v.string(),          // "daily" | "weekly" | "seasonal" | "permanent"
    requirement: v.any(),      // { type, target, threshold }
    reward: v.any(),           // { currency, amount } or { itemId, quantity }
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
  })
    .index("by_key", ["key"])
    .index("by_type", ["type"]),

  userQuests: defineTable({
    userId: v.string(),
    questKey: v.string(),
    progress: v.number(),
    completed: v.boolean(),
    claimed: v.boolean(),
    assignedAt: v.number(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_quest", ["userId", "questKey"]),

  battlePassSeasons: defineTable({
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    isActive: v.boolean(),
    totalTiers: v.number(),
    premiumPrice: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_active", ["isActive"]),

  battlePassTiers: defineTable({
    seasonId: v.id("battlePassSeasons"),
    tier: v.number(),
    xpRequired: v.number(),
    freeReward: v.optional(v.any()),
    premiumReward: v.optional(v.any()),
    metadata: v.optional(v.any()),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_tier", ["seasonId", "tier"]),

  battlePassProgress: defineTable({
    userId: v.string(),
    seasonId: v.id("battlePassSeasons"),
    currentTier: v.number(),
    currentXP: v.number(),
    isPremium: v.boolean(),
    claimedTiers: v.array(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_season", ["userId", "seasonId"]),

  playerXP: defineTable({
    userId: v.string(),
    totalXP: v.number(),
    level: v.number(),
    currentLevelXP: v.number(),
    xpToNextLevel: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"]),
});
