import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

export default defineSchema({
  tokenBalanceCache: defineTable({
    userId: v.string(), // external ref
    walletAddress: v.string(),
    tokenMint: v.string(),
    balance: v.number(),
    lastVerifiedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_wallet", ["walletAddress"]),

  tokenTransactions: defineTable({
    userId: v.string(), // external ref
    transactionType: literals("marketplace_purchase", "marketplace_sale", "platform_fee", "battle_pass_purchase", "gem_purchase"),
    amount: v.number(),
    signature: v.optional(v.string()),
    status: literals("pending", "confirmed", "failed"),
    referenceId: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_signature", ["signature"]),

  pendingTokenPurchases: defineTable({
    buyerId: v.string(), // external ref
    listingId: v.optional(v.string()), // external ref
    battlePassId: v.optional(v.string()), // external ref
    purchaseType: v.optional(literals("marketplace", "battle_pass")),
    amount: v.number(),
    buyerWallet: v.string(),
    sellerWallet: v.string(),
    status: literals("awaiting_signature", "submitted", "confirmed", "failed", "expired"),
    transactionSignature: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_listing", ["listingId"])
    .index("by_battle_pass", ["battlePassId"])
    .index("by_status", ["status"]),

  tokenConfig: defineTable({
    name: v.string(),
    symbol: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    twitter: v.optional(v.string()),
    telegram: v.optional(v.string()),
    website: v.optional(v.string()),
    discord: v.optional(v.string()),
    initialSupply: v.optional(v.number()),
    decimals: v.optional(v.number()),
    targetMarketCap: v.optional(v.number()),
    mintAddress: v.optional(v.string()),
    bondingCurveAddress: v.optional(v.string()),
    pumpfunUrl: v.optional(v.string()),
    launchedAt: v.optional(v.number()),
    graduatedAt: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("ready"), v.literal("launched"), v.literal("graduated")),
    createdBy: v.string(), // external ref
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_mint", ["mintAddress"]),

  tokenMetrics: defineTable({
    timestamp: v.number(),
    price: v.number(),
    priceUsd: v.number(),
    marketCap: v.number(),
    volume24h: v.number(),
    txCount24h: v.number(),
    holderCount: v.number(),
    liquidity: v.number(),
    bondingCurveProgress: v.number(),
    graduationEta: v.optional(v.number()),
  }).index("by_timestamp", ["timestamp"]),

  tokenHolders: defineTable({
    address: v.string(),
    balance: v.number(),
    percentOwnership: v.number(),
    firstPurchaseAt: v.number(),
    lastActivityAt: v.number(),
    totalBought: v.number(),
    totalSold: v.number(),
    isPlatformWallet: v.boolean(),
    label: v.optional(v.string()),
  })
    .index("by_balance", ["balance"])
    .index("by_address", ["address"])
    .index("by_platform", ["isPlatformWallet"]),

  tokenTrades: defineTable({
    signature: v.string(),
    type: v.union(v.literal("buy"), v.literal("sell")),
    traderAddress: v.string(),
    tokenAmount: v.number(),
    solAmount: v.number(),
    pricePerToken: v.number(),
    timestamp: v.number(),
    isWhale: v.boolean(),
    source: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_trader", ["traderAddress"])
    .index("by_type", ["type"])
    .index("by_signature", ["signature"])
    .index("by_whale", ["isWhale", "timestamp"]),

  tokenStatsRollup: defineTable({
    period: v.union(v.literal("hour"), v.literal("day")),
    periodStart: v.number(),
    volume: v.number(),
    buyVolume: v.number(),
    sellVolume: v.number(),
    txCount: v.number(),
    buyCount: v.number(),
    sellCount: v.number(),
    uniqueTraders: v.number(),
    highPrice: v.number(),
    lowPrice: v.number(),
    openPrice: v.number(),
    closePrice: v.number(),
    newHolders: v.number(),
    lostHolders: v.number(),
  }).index("by_period", ["period", "periodStart"]),
});
