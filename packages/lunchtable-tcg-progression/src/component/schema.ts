import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  achievementDefinitions: defineTable({
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("wins"),
      v.literal("games_played"),
      v.literal("collection"),
      v.literal("social"),
      v.literal("story"),
      v.literal("ranked"),
      v.literal("special")
    ),
    rarity: v.union(
      v.literal("common"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
    icon: v.string(),
    requirementType: v.string(),
    targetValue: v.number(),
    rewards: v.optional(
      v.object({
        gold: v.optional(v.number()),
        xp: v.optional(v.number()),
        gems: v.optional(v.number()),
        badge: v.optional(v.string()),
        cardDefinitionId: v.optional(v.string()),
      })
    ),
    isSecret: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_achievement_id", ["achievementId"])
    .index("by_category", ["category"])
    .index("by_rarity", ["rarity"])
    .index("by_active", ["isActive"]),

  userAchievements: defineTable({
    userId: v.string(),
    achievementId: v.string(),
    currentProgress: v.number(),
    isUnlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unlocked", ["userId", "isUnlocked"])
    .index("by_user_achievement", ["userId", "achievementId"])
    .index("by_achievement", ["achievementId"]),

  questDefinitions: defineTable({
    questId: v.string(),
    name: v.string(),
    description: v.string(),
    questType: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("achievement")
    ),
    requirementType: v.string(),
    targetValue: v.number(),
    rewards: v.object({
      gold: v.number(),
      xp: v.number(),
      gems: v.optional(v.number()),
    }),
    filters: v.optional(
      v.object({
        gameMode: v.optional(
          v.union(
            v.literal("ranked"),
            v.literal("casual"),
            v.literal("story")
          )
        ),
        archetype: v.optional(v.string()),
        cardType: v.optional(v.string()),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_quest_id", ["questId"])
    .index("by_type", ["questType"])
    .index("by_active", ["isActive"]),

  userQuests: defineTable({
    userId: v.string(),
    questId: v.string(),
    currentProgress: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("claimed")
    ),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_quest", ["userId", "questId"])
    .index("by_quest", ["questId"])
    .index("by_expires", ["expiresAt"]),

  battlePassSeasons: defineTable({
    seasonId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("upcoming"),
      v.literal("active"),
      v.literal("ended")
    ),
    totalTiers: v.number(),
    xpPerTier: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_status", ["status"]),

  battlePassTiers: defineTable({
    battlePassId: v.id("battlePassSeasons"),
    tier: v.number(),
    freeReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()),
        cardId: v.optional(v.string()),
        packProductId: v.optional(v.string()),
        titleName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
    premiumReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()),
        cardId: v.optional(v.string()),
        packProductId: v.optional(v.string()),
        titleName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
    isMilestone: v.boolean(),
  })
    .index("by_battlepass", ["battlePassId"])
    .index("by_battlepass_tier", ["battlePassId", "tier"]),

  battlePassProgress: defineTable({
    userId: v.string(),
    battlePassId: v.id("battlePassSeasons"),
    currentXP: v.number(),
    currentTier: v.number(),
    isPremium: v.boolean(),
    premiumPurchasedAt: v.optional(v.number()),
    claimedFreeTiers: v.array(v.number()),
    claimedPremiumTiers: v.array(v.number()),
    lastXPGainAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_battlepass", ["userId", "battlePassId"])
    .index("by_battlepass", ["battlePassId"])
    .index("by_tier", ["currentTier"]),

  playerXP: defineTable({
    userId: v.string(),
    currentXP: v.number(),
    currentLevel: v.number(),
    lifetimeXP: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_level", ["currentLevel"])
    .index("by_lifetime_xp", ["lifetimeXP"]),

  // Player badges earned through gameplay
  playerBadges: defineTable({
    userId: v.string(),
    badgeType: v.union(
      v.literal("archetype_complete"),
      v.literal("act_complete"),
      v.literal("difficulty_complete"),
      v.literal("perfect_chapter"),
      v.literal("speed_run"),
      v.literal("milestone")
    ),
    badgeId: v.string(),
    displayName: v.string(),
    description: v.string(),
    archetype: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "badgeType"])
    .index("by_badge", ["badgeId"]),
});
