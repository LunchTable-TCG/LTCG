import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  escrows: defineTable({
    gameId: v.string(),
    player1Id: v.string(),
    player2Id: v.string(),
    amount: v.number(),
    currency: v.string(), // "token" | "gold" | "gems"
    status: v.string(), // "pending" | "funded" | "settled" | "refunded" | "disputed"
    player1Deposited: v.boolean(),
    player2Deposited: v.boolean(),
    winnerId: v.optional(v.string()),
    settledAt: v.optional(v.number()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
  })
    .index("by_game", ["gameId"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_status", ["status"]),

  wagerTransactions: defineTable({
    escrowId: v.id("escrows"),
    playerId: v.string(),
    type: v.string(), // "deposit" | "payout" | "refund" | "forfeit"
    amount: v.number(),
    currency: v.string(),
    txSignature: v.optional(v.string()),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_escrow", ["escrowId"])
    .index("by_player", ["playerId"]),
});
