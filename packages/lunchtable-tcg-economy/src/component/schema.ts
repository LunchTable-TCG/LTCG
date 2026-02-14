import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const transactionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("reward"),
  v.literal("sale"),
  v.literal("gift"),
  v.literal("refund"),
  v.literal("admin_refund"),
  v.literal("conversion"),
  v.literal("marketplace_fee"),
  v.literal("auction_bid"),
  v.literal("auction_refund"),
  v.literal("wager"),
  v.literal("wager_payout"),
  v.literal("wager_refund"),
  v.literal("tournament_entry"),
  v.literal("tournament_refund"),
  v.literal("tournament_prize")
);

const currencyTypeValidator = v.union(v.literal("gold"), v.literal("gems"));

const currencyUsedValidator = v.union(
  v.literal("gold"),
  v.literal("gems"),
  v.literal("token"),
  v.literal("free")
);

const productTypeValidator = v.union(
  v.literal("pack"),
  v.literal("box"),
  v.literal("currency")
);

const rewardTypeValidator = v.union(
  v.literal("daily_pack"),
  v.literal("weekly_jackpot"),
  v.literal("login_streak"),
  v.literal("season_end"),
  v.literal("event")
);

const rewardItemTypeValidator = v.union(
  v.literal("pack"),
  v.literal("gold"),
  v.literal("gems"),
  v.literal("card"),
  v.literal("lottery_ticket")
);

const saleTypeValidator = v.union(
  v.literal("flash"),
  v.literal("weekend"),
  v.literal("launch"),
  v.literal("holiday"),
  v.literal("anniversary"),
  v.literal("returning")
);

const promoRewardTypeValidator = v.union(
  v.literal("gold"),
  v.literal("gems"),
  v.literal("pack")
);

const applicableProductTypeValidator = v.union(
  v.literal("pack"),
  v.literal("box"),
  v.literal("currency"),
  v.literal("gem_package")
);

export default defineSchema({
  // Player currency balances
  playerCurrency: defineTable({
    userId: v.string(),
    gold: v.number(),
    gems: v.number(),
    lifetimeGoldEarned: v.number(),
    lifetimeGoldSpent: v.number(),
    lifetimeGemsEarned: v.number(),
    lifetimeGemsSpent: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Currency transaction ledger (audit trail)
  currencyTransactions: defineTable({
    userId: v.string(),
    transactionType: transactionTypeValidator,
    currencyType: currencyTypeValidator,
    amount: v.number(),
    balanceAfter: v.number(),
    referenceId: v.optional(v.string()),
    description: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_type", ["transactionType", "createdAt"])
    .index("by_reference", ["referenceId"]),

  // Shop product catalog
  shopProducts: defineTable({
    productId: v.string(),
    name: v.string(),
    description: v.string(),
    productType: productTypeValidator,
    goldPrice: v.optional(v.number()),
    gemPrice: v.optional(v.number()),
    packConfig: v.optional(
      v.object({
        cardCount: v.number(),
        guaranteedRarity: v.optional(v.string()),
        guaranteedCount: v.optional(v.number()),
        allRareOrBetter: v.optional(v.boolean()),
        archetype: v.optional(v.string()),
        variantMultipliers: v.optional(
          v.object({
            foil: v.number(),
            altArt: v.number(),
            fullArt: v.number(),
          })
        ),
      })
    ),
    boxConfig: v.optional(
      v.object({
        packProductId: v.string(),
        packCount: v.number(),
        bonusCards: v.optional(v.number()),
      })
    ),
    currencyConfig: v.optional(
      v.object({
        currencyType: currencyTypeValidator,
        amount: v.number(),
      })
    ),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_type", ["productType", "isActive"])
    .index("by_active", ["isActive", "sortOrder"])
    .index("by_product_id", ["productId"]),

  // Pack opening history (analytics)
  packOpeningHistory: defineTable({
    userId: v.string(),
    productId: v.string(),
    packType: v.string(),
    cardsReceived: v.array(
      v.object({
        cardDefinitionId: v.string(),
        name: v.string(),
        rarity: v.string(),
        variant: v.optional(v.string()),
        serialNumber: v.optional(v.number()),
      })
    ),
    currencyUsed: currencyUsedValidator,
    amountPaid: v.number(),
    pityTriggered: v.optional(
      v.object({
        epic: v.optional(v.boolean()),
        legendary: v.optional(v.boolean()),
        fullArt: v.optional(v.boolean()),
      })
    ),
    openedAt: v.number(),
  })
    .index("by_user_time", ["userId", "openedAt"])
    .index("by_time", ["openedAt"]),

  // Pack opening pity state (per user)
  packOpeningPityState: defineTable({
    userId: v.string(),
    packsSinceLastLegendary: v.number(),
    lastLegendaryAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Sale definitions for shop promotions
  shopSales: defineTable({
    saleId: v.string(),
    name: v.string(),
    description: v.string(),
    saleType: saleTypeValidator,
    discountPercent: v.optional(v.number()),
    bonusCards: v.optional(v.number()),
    bonusGems: v.optional(v.number()),
    applicableProducts: v.array(v.string()),
    applicableProductTypes: v.optional(v.array(applicableProductTypeValidator)),
    startsAt: v.number(),
    endsAt: v.number(),
    isActive: v.boolean(),
    priority: v.number(),
    conditions: v.optional(
      v.object({
        minPurchaseAmount: v.optional(v.number()),
        maxUsesTotal: v.optional(v.number()),
        maxUsesPerUser: v.optional(v.number()),
        returningPlayerOnly: v.optional(v.boolean()),
        newPlayerOnly: v.optional(v.boolean()),
        minPlayerLevel: v.optional(v.number()),
      })
    ),
    usageCount: v.number(),
    totalDiscountGiven: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_sale_id", ["saleId"])
    .index("by_active_time", ["isActive", "startsAt", "endsAt"])
    .index("by_type", ["saleType", "isActive"])
    .index("by_priority", ["isActive", "priority"]),

  // Sale usage tracking per user
  saleUsage: defineTable({
    userId: v.string(),
    saleId: v.string(),
    productId: v.string(),
    originalPrice: v.number(),
    discountedPrice: v.number(),
    discountAmount: v.number(),
    usedAt: v.number(),
  })
    .index("by_user_sale", ["userId", "saleId"])
    .index("by_sale", ["saleId", "usedAt"])
    .index("by_user", ["userId", "usedAt"]),

  // Daily and weekly reward claims
  dailyRewards: defineTable({
    userId: v.string(),
    rewardType: rewardTypeValidator,
    claimedAt: v.number(),
    reward: v.object({
      type: rewardItemTypeValidator,
      amount: v.optional(v.number()),
      packId: v.optional(v.string()),
      cardId: v.optional(v.string()),
      variant: v.optional(v.string()),
      serialNumber: v.optional(v.number()),
    }),
    jackpotResult: v.optional(
      v.object({
        won: v.boolean(),
        prizeType: v.optional(v.string()),
        rollValue: v.optional(v.number()),
      })
    ),
  })
    .index("by_user_type", ["userId", "rewardType"])
    .index("by_user_date", ["userId", "claimedAt"])
    .index("by_type_date", ["rewardType", "claimedAt"]),

  // Redeemable promo codes
  promoCodes: defineTable({
    code: v.string(),
    description: v.string(),
    rewardType: promoRewardTypeValidator,
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    redemptionCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Promo code redemption history
  promoRedemptions: defineTable({
    userId: v.string(),
    promoCodeId: v.id("promoCodes"),
    code: v.string(),
    rewardReceived: v.string(),
    redeemedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["promoCodeId", "redeemedAt"])
    .index("by_user_code", ["userId", "promoCodeId"]),

  // Dynamic RNG configuration (rarity weights, variant rates, pity thresholds)
  rngConfig: defineTable({
    key: v.literal("active"),
    rarityWeights: v.object({
      common: v.number(),
      uncommon: v.number(),
      rare: v.number(),
      epic: v.number(),
      legendary: v.number(),
    }),
    variantRates: v.object({
      standard: v.number(),
      foil: v.number(),
      altArt: v.number(),
      fullArt: v.number(),
    }),
    pityThresholds: v.object({
      epic: v.number(),
      legendary: v.number(),
      fullArt: v.number(),
    }),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Crypto wager transactions (merged from wager component)
  cryptoWagerTransactions: defineTable({
    lobbyId: v.string(),
    userId: v.string(),
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
