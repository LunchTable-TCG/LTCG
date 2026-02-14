import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  marketplaceListings: defineTable({
    sellerId: v.string(),
    sellerUsername: v.string(),
    listingType: v.union(v.literal("fixed"), v.literal("auction")),
    cardDefinitionId: v.string(),
    quantity: v.number(),
    price: v.number(),
    currentBid: v.optional(v.number()),
    highestBidderId: v.optional(v.string()),
    highestBidderUsername: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    bidCount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("sold"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("suspended")
    ),
    soldTo: v.optional(v.string()),
    soldFor: v.optional(v.number()),
    soldAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
    tokenPrice: v.optional(v.number()),
    claimed: v.optional(v.boolean()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_seller", ["sellerId", "status"])
    .index("by_card", ["cardDefinitionId", "status"])
    .index("by_type", ["listingType", "status"])
    .index("by_ends_at", ["endsAt"])
    .index("by_status_listingType_endsAt", ["status", "listingType", "endsAt"]),

  auctionBids: defineTable({
    listingId: v.id("marketplaceListings"),
    bidderId: v.string(),
    bidderUsername: v.string(),
    bidAmount: v.number(),
    bidStatus: v.union(
      v.literal("active"),
      v.literal("outbid"),
      v.literal("won"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
    refundedAt: v.optional(v.number()),
    refunded: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_bidder", ["bidderId", "bidStatus"]),

  marketplacePriceCaps: defineTable({
    cardDefinitionId: v.string(),
    maxPrice: v.number(),
    reason: v.string(),
    setBy: v.string(),
    setByUsername: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_card", ["cardDefinitionId"])
    .index("by_active", ["isActive", "createdAt"]),

  // Shop product catalog for the marketplace storefront
  shopProducts: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    isActive: v.boolean(),
    saleId: v.optional(v.id("shopSales")),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category", "isActive"])
    .index("by_active", ["isActive", "createdAt"]),

  // Sales/discounts for shop products
  shopSales: defineTable({
    name: v.string(),
    discountPercent: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    productIds: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_active", ["isActive", "startTime"])
    .index("by_time", ["startTime", "endTime"]),

  // Purchase records for shop products
  shopPurchases: defineTable({
    productId: v.id("shopProducts"),
    buyerId: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    totalPrice: v.number(),
    currency: v.string(),
    discountApplied: v.optional(v.number()),
    saleId: v.optional(v.id("shopSales")),
    purchasedAt: v.number(),
  })
    .index("by_buyer", ["buyerId", "purchasedAt"])
    .index("by_product", ["productId", "purchasedAt"]),
});
