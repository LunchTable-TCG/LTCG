import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cryptoWagerTransactions: defineTable({
    lobbyId: v.string(), // Reference to parent gameLobbies table
    userId: v.string(), // Reference to parent users table
    walletAddress: v.string(),
    type: v.union(v.literal("deposit"), v.literal("payout"), v.literal("treasury_fee")),
    currency: v.union(v.literal("sol"), v.literal("usdc")),
    amount: v.number(),
    amountAtomic: v.string(),
    txSignature: v.optional(v.string()),
    escrowPda: v.string(),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
    createdAt: v.number(),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
});
