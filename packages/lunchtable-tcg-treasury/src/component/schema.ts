import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  treasuryWallets: defineTable({
    privyWalletId: v.string(),
    address: v.string(),
    name: v.string(),
    purpose: v.union(
      v.literal("fee_collection"),
      v.literal("distribution"),
      v.literal("liquidity"),
      v.literal("reserves")
    ),
    balance: v.optional(v.number()),
    tokenBalance: v.optional(v.number()),
    lastSyncedAt: v.optional(v.number()),
    policyId: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("frozen"),
      v.literal("archived")
    ),
    creationStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("creating"),
        v.literal("active"),
        v.literal("failed")
      )
    ),
    creationErrorMessage: v.optional(v.string()),
    creationAttempts: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    createdBy: v.optional(v.string()), // external ref → v.string()
    createdAt: v.number(),
  })
    .index("by_purpose", ["purpose"])
    .index("by_address", ["address"])
    .index("by_status", ["status"])
    .index("by_creation_status", ["creationStatus"]),

  treasuryTransactions: defineTable({
    walletId: v.id("treasuryWallets"), // intra-component ref
    type: v.union(
      v.literal("fee_received"),
      v.literal("distribution"),
      v.literal("liquidity_add"),
      v.literal("liquidity_remove"),
      v.literal("transfer_internal"),
      v.literal("transfer_external")
    ),
    amount: v.number(),
    tokenMint: v.string(),
    signature: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("confirmed"),
      v.literal("failed")
    ),
    metadata: v.optional(v.any()),
    initiatedBy: v.optional(v.string()), // external ref → v.string()
    approvedBy: v.optional(v.array(v.string())), // external ref array → v.array(v.string())
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_wallet", ["walletId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_signature", ["signature"])
    .index("by_created", ["createdAt"]),

  treasuryPolicies: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    privyPolicyId: v.optional(v.string()),
    rules: v.object({
      maxTransactionAmount: v.optional(v.number()),
      dailyLimit: v.optional(v.number()),
      allowedRecipients: v.optional(v.array(v.string())),
      requiresApproval: v.boolean(),
      minApprovers: v.optional(v.number()),
    }),
    isActive: v.boolean(),
    createdBy: v.string(), // external ref → v.string()
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["isActive"]),
});
