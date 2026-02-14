import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tournaments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    format: v.literal("single_elimination"),
    maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
    entryFee: v.number(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    prizePool: v.object({
      first: v.number(),
      second: v.number(),
      thirdFourth: v.number(),
    }),
    status: v.union(
      v.literal("registration"),
      v.literal("checkin"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    registrationStartsAt: v.number(),
    registrationEndsAt: v.number(),
    checkInStartsAt: v.number(),
    checkInEndsAt: v.number(),
    scheduledStartAt: v.number(),
    actualStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    currentRound: v.number(),
    totalRounds: v.optional(v.number()),
    registeredCount: v.number(),
    checkedInCount: v.number(),
    winnerId: v.optional(v.string()),
    winnerUsername: v.optional(v.string()),
    secondPlaceId: v.optional(v.string()),
    secondPlaceUsername: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    creatorType: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    joinCode: v.optional(v.string()),
    autoStartOnFull: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_scheduled_start", ["scheduledStartAt"])
    .index("by_registration_start", ["registrationStartsAt"])
    .index("by_created", ["createdAt"])
    .index("by_join_code", ["joinCode"])
    .index("by_visibility_status", ["visibility", "status"])
    .index("by_creator", ["createdBy", "status"]),

  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    username: v.string(),
    registeredAt: v.number(),
    seedRating: v.number(),
    status: v.union(
      v.literal("registered"),
      v.literal("checked_in"),
      v.literal("active"),
      v.literal("eliminated"),
      v.literal("winner"),
      v.literal("forfeit"),
      v.literal("refunded")
    ),
    checkedInAt: v.optional(v.number()),
    currentRound: v.optional(v.number()),
    bracket: v.optional(v.number()),
    eliminatedInRound: v.optional(v.number()),
    finalPlacement: v.optional(v.number()),
    prizeAwarded: v.optional(v.number()),
    prizeAwardedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_user", ["tournamentId", "userId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_tournament_bracket", ["tournamentId", "bracket"]),

  tournamentMatches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    bracketPosition: v.number(),
    player1Id: v.optional(v.string()),
    player1Username: v.optional(v.string()),
    player1ParticipantId: v.optional(v.id("tournamentParticipants")),
    player2Id: v.optional(v.string()),
    player2Username: v.optional(v.string()),
    player2ParticipantId: v.optional(v.id("tournamentParticipants")),
    player1SourceMatchId: v.optional(v.id("tournamentMatches")),
    player2SourceMatchId: v.optional(v.id("tournamentMatches")),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("forfeit")
    ),
    lobbyId: v.optional(v.string()),
    gameId: v.optional(v.string()),
    winnerId: v.optional(v.string()),
    winnerUsername: v.optional(v.string()),
    loserId: v.optional(v.string()),
    loserUsername: v.optional(v.string()),
    winReason: v.optional(v.union(
      v.literal("game_win"),
      v.literal("opponent_forfeit"),
      v.literal("opponent_no_show"),
      v.literal("bye")
    )),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_round", ["tournamentId", "round"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_lobby", ["lobbyId"]),

  tournamentHistory: defineTable({
    userId: v.string(),
    tournamentId: v.id("tournaments"),
    tournamentName: v.string(),
    maxPlayers: v.number(),
    placement: v.number(),
    prizeWon: v.number(),
    matchesPlayed: v.number(),
    matchesWon: v.number(),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completedAt"])
    .index("by_tournament", ["tournamentId"]),
});
