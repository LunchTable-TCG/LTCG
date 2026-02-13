import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  listings: defineTable({
    sellerId: v.string(),
    itemId: v.string(),
    itemType: v.string(), // "card" | "pack" | "bundle" | "cosmetic"
    itemName: v.string(),
    price: v.number(),
    currency: v.string(), // "gold" | "gems" | "token"
    quantity: v.number(),
    isAuction: v.boolean(),
    auctionEndTime: v.optional(v.number()),
    minBid: v.optional(v.number()),
    buyNowPrice: v.optional(v.number()),
    status: v.string(), // "active" | "sold" | "cancelled" | "expired"
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_seller", ["sellerId"])
    .index("by_item_type", ["itemType"])
    .index("by_status", ["status"])
    .index("by_item", ["itemId"]),

  bids: defineTable({
    listingId: v.id("listings"),
    bidderId: v.string(),
    amount: v.number(),
    currency: v.string(),
    isWinning: v.boolean(),
    createdAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_listing", ["listingId"])
    .index("by_bidder", ["bidderId"]),

  transactions: defineTable({
    buyerId: v.string(),
    sellerId: v.string(),
    listingId: v.optional(v.string()),
    itemId: v.string(),
    itemType: v.string(),
    amount: v.number(),
    currency: v.string(),
    type: v.string(), // "purchase" | "auction_win" | "shop_buy" | "trade"
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_seller", ["sellerId"]),

  shopProducts: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(), // "pack" | "bundle" | "currency" | "cosmetic"
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    isActive: v.boolean(),
    saleId: v.optional(v.id("shopSales")),
    metadata: v.optional(v.any()),
  })
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  shopSales: defineTable({
    name: v.string(),
    discountPercent: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    productIds: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_active", ["isActive"]),

  priceHistory: defineTable({
    itemId: v.string(),
    price: v.number(),
    currency: v.string(),
    timestamp: v.number(),
    type: v.string(), // "listing" | "sale" | "auction"
    metadata: v.optional(v.any()),
  }).index("by_item", ["itemId"]),
});
