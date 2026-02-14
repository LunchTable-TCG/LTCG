import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

export default defineSchema({
  gemPackages: defineTable({
    packageId: v.string(),
    name: v.string(),
    description: v.string(),
    gems: v.number(),
    usdPrice: v.number(),
    bonusPercent: v.number(),
    isActive: v.boolean(),
    sortOrder: v.number(),
    featuredBadge: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_package_id", ["packageId"])
    .index("by_active", ["isActive", "sortOrder"]),

  tokenGemPurchases: defineTable({
    userId: v.string(), // external ref
    packageId: v.string(),
    gemsReceived: v.number(),
    usdValue: v.number(),
    tokenAmount: v.number(),
    tokenPriceUsd: v.number(),
    solanaSignature: v.string(),
    status: literals("pending", "confirmed", "failed", "expired"),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_signature", ["solanaSignature"])
    .index("by_status", ["status", "createdAt"]),

  x402Payments: defineTable({
    transactionSignature: v.string(),
    payerWallet: v.string(),
    recipientWallet: v.string(),
    amount: v.number(),
    tokenMint: v.string(),
    network: v.string(),
    resourcePath: v.string(),
    resourceDescription: v.string(),
    userId: v.optional(v.string()), // external ref
    agentId: v.optional(v.string()), // external ref
    purchaseType: v.optional(literals("gems", "pack", "box", "other")),
    purchaseId: v.optional(v.string()),
    verifiedAt: v.number(),
    facilitatorResponse: v.optional(v.string()),
    status: literals("verified", "settled", "failed"),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_signature", ["transactionSignature"])
    .index("by_payer", ["payerWallet", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_agent", ["agentId", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_type", ["purchaseType", "createdAt"]),

  stripeCustomers: defineTable({
    userId: v.string(), // external ref
    stripeCustomerId: v.string(),
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  stripeSubscriptions: defineTable({
    userId: v.string(), // external ref
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("trialing")
    ),
    planInterval: v.union(v.literal("month"), v.literal("year")),
    planAmount: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_sub", ["stripeSubscriptionId"]),

  stripeWebhookEvents: defineTable({
    stripeEventId: v.string(),
    type: v.string(),
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_id", ["stripeEventId"])
    .index("by_processed", ["processed"]),
});
