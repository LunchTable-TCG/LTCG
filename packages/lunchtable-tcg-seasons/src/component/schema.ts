import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  seasons: defineTable({
    name: v.string(),
    number: v.number(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("ended")),
    startDate: v.number(),
    endDate: v.number(),
    description: v.optional(v.string()),
    rankResetType: v.union(v.literal("full"), v.literal("soft"), v.literal("none")),
    softResetPercentage: v.optional(v.number()),
    rewards: v.array(
      v.object({
        tier: v.string(),
        minElo: v.number(),
        goldReward: v.number(),
        gemsReward: v.number(),
        cardPackReward: v.optional(v.number()),
        exclusiveCardId: v.optional(v.string()), // external ref → v.string()
        titleReward: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    createdBy: v.string(), // external ref → v.string()
    updatedAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"]),

  seasonSnapshots: defineTable({
    seasonId: v.id("seasons"), // intra-component ref
    seasonNumber: v.number(),
    userId: v.string(), // external ref → v.string()
    username: v.string(),
    finalElo: v.number(),
    tier: v.string(),
    rank: v.number(),
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    rewardsDistributed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_rank", ["seasonId", "rank"])
    .index("by_user", ["userId"]),
});
