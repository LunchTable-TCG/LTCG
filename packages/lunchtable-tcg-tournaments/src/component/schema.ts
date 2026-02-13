import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tournaments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    organizerId: v.string(),
    format: v.string(), // "single_elimination" | "double_elimination" | "swiss" | "round_robin"
    maxPlayers: v.number(),
    currentPlayers: v.number(),
    entryFee: v.optional(v.number()),
    entryCurrency: v.optional(v.string()),
    prizePool: v.optional(v.any()),
    status: v.string(), // "registration" | "check_in" | "in_progress" | "finished" | "cancelled"
    startTime: v.number(),
    checkInDeadline: v.optional(v.number()),
    currentRound: v.optional(v.number()),
    totalRounds: v.optional(v.number()),
    rules: v.optional(v.any()),
    metadata: v.optional(v.any()),
  })
    .index("by_status", ["status"])
    .index("by_organizer", ["organizerId"]),

  participants: defineTable({
    tournamentId: v.id("tournaments"),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    deckId: v.optional(v.string()),
    seed: v.optional(v.number()),
    checkedIn: v.boolean(),
    eliminated: v.boolean(),
    wins: v.number(),
    losses: v.number(),
    tiebreaker: v.optional(v.number()),
    registeredAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_player", ["playerId"])
    .index("by_tournament_player", ["tournamentId", "playerId"]),

  matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    player1Id: v.optional(v.string()),
    player2Id: v.optional(v.string()),
    winnerId: v.optional(v.string()),
    loserId: v.optional(v.string()),
    gameId: v.optional(v.string()),
    status: v.string(), // "pending" | "in_progress" | "completed" | "bye" | "forfeit"
    score: v.optional(v.string()),
    scheduledTime: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    nextMatchId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_round", ["tournamentId", "round"]),

  history: defineTable({
    tournamentId: v.string(),
    tournamentName: v.string(),
    playerId: v.string(),
    placement: v.number(),
    wins: v.number(),
    losses: v.number(),
    prizeWon: v.optional(v.any()),
    completedAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_player", ["playerId"])
    .index("by_tournament", ["tournamentId"]),
});
