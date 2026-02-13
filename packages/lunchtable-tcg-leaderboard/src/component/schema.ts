import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leaderboardEntries: defineTable({
    boardId: v.string(),       // "ranked" | "casual" | "tournament" | custom
    playerId: v.string(),
    playerName: v.optional(v.string()),
    score: v.number(),
    rank: v.optional(v.number()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    streak: v.optional(v.number()),
    rating: v.optional(v.number()),
    lastUpdated: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_board", ["boardId"])
    .index("by_board_score", ["boardId", "score"])
    .index("by_player", ["playerId"])
    .index("by_board_player", ["boardId", "playerId"]),

  snapshots: defineTable({
    boardId: v.string(),
    entries: v.array(v.object({
      playerId: v.string(),
      playerName: v.optional(v.string()),
      score: v.number(),
      rank: v.number(),
      wins: v.optional(v.number()),
      losses: v.optional(v.number()),
    })),
    takenAt: v.number(),
    period: v.string(),        // "hourly" | "daily" | "weekly" | "season"
    metadata: v.optional(v.any()),
  })
    .index("by_board", ["boardId"])
    .index("by_board_period", ["boardId", "period"]),

  matchHistory: defineTable({
    playerId: v.string(),
    opponentId: v.string(),
    opponentName: v.optional(v.string()),
    result: v.string(),        // "win" | "loss" | "draw"
    ratingChange: v.optional(v.number()),
    gameMode: v.string(),
    gameId: v.optional(v.string()),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_player", ["playerId"])
    .index("by_player_mode", ["playerId", "gameMode"]),
});
