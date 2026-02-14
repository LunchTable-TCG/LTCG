import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leaderboardEntries: defineTable({
    boardId: v.string(),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    score: v.number(),
    rank: v.optional(v.number()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    streak: v.optional(v.number()),
    rating: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_score", ["boardId", "score"])
    .index("by_player", ["playerId"])
    .index("by_board_player", ["boardId", "playerId"]),

  leaderboardSnapshots: defineTable({
    leaderboardType: v.union(
      v.literal("ranked"),
      v.literal("casual"),
      v.literal("story")
    ),
    playerSegment: v.union(
      v.literal("all"),
      v.literal("humans"),
      v.literal("ai")
    ),
    rankings: v.array(
      v.object({
        userId: v.string(),
        username: v.string(),
        rank: v.number(),
        rating: v.number(),
        level: v.optional(v.number()),
        wins: v.number(),
        losses: v.number(),
        winRate: v.number(),
        isAiAgent: v.boolean(),
      })
    ),
    lastUpdated: v.number(),
  }).index("by_leaderboard", ["leaderboardType", "playerSegment"]),

  matchHistory: defineTable({
    winnerId: v.string(),
    loserId: v.string(),
    gameType: v.union(
      v.literal("ranked"),
      v.literal("casual"),
      v.literal("story")
    ),
    winnerRatingBefore: v.number(),
    winnerRatingAfter: v.number(),
    loserRatingBefore: v.number(),
    loserRatingAfter: v.number(),
    xpAwarded: v.optional(v.number()),
    completedAt: v.number(),
  })
    .index("by_winner", ["winnerId"])
    .index("by_loser", ["loserId"])
    .index("by_completed", ["completedAt"])
    .index("by_game_type", ["gameType", "completedAt"]),
});
