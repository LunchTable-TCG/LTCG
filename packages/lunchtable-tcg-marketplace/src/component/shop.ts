import { v } from "convex/values";
import { query } from "./_generated/server";

// TODO: shopProducts and shopSales tables were removed from schema.
// Shop functionality should be reimplemented using the main schema tables
// or a different approach. The following functions are commented out until
// a new implementation is designed.

const priceCapsReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  cardDefinitionId: v.string(),
  maxPrice: v.number(),
  reason: v.string(),
  setBy: v.string(),
  setByUsername: v.string(),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

// Get price caps for marketplace listings
export const getPriceCaps = query({
  args: {
    cardDefinitionId: v.optional(v.id("cardDefinitions")),
    isActive: v.optional(v.boolean()),
  },
  returns: v.array(priceCapsReturnValidator),
  handler: async (ctx, args) => {
    let caps;

    if (args.cardDefinitionId !== undefined) {
      caps = await ctx.db
        .query("marketplacePriceCaps")
        .withIndex("by_card", (q) => q.eq("cardDefinitionId", args.cardDefinitionId!))
        .collect();
    } else if (args.isActive !== undefined) {
      caps = await ctx.db
        .query("marketplacePriceCaps")
        .withIndex("by_active", (q) => q.eq("isActive", args.isActive!))
        .collect();
    } else {
      caps = await ctx.db.query("marketplacePriceCaps").collect();
    }

    return caps.map((cap) => ({
      ...cap,
      _id: cap._id as string,
      cardDefinitionId: cap.cardDefinitionId as string,
      setBy: cap.setBy as string,
    }));
  },
});

/*
// TODO: Reimplementation needed - shopProducts table removed

export const getProducts = query({
  args: { category: v.optional(v.string()) },
  returns: v.array(productReturnValidator),
  handler: async (ctx, args) => {
    // Implementation removed - shopProducts table no longer exists
    throw new Error("Shop products feature needs reimplementation");
  },
});

export const getProductById = query({
  args: { id: v.id("shopProducts") },
  returns: v.union(productReturnValidator, v.null()),
  handler: async (ctx, args) => {
    // Implementation removed - shopProducts table no longer exists
    throw new Error("Shop products feature needs reimplementation");
  },
});

export const purchaseProduct = mutation({
  args: {
    productId: v.id("shopProducts"),
    buyerId: v.string(),
    quantity: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Implementation removed - shopProducts table no longer exists
    throw new Error("Shop products feature needs reimplementation");
  },
});

export const createProduct = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    stock: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Implementation removed - shopProducts table no longer exists
    throw new Error("Shop products feature needs reimplementation");
  },
});

export const updateProduct = mutation({
  args: {
    id: v.id("shopProducts"),
    fields: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      category: v.optional(v.string()),
      price: v.optional(v.number()),
      currency: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      stock: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      saleId: v.optional(v.id("shopSales")),
      metadata: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Implementation removed - shopProducts table no longer exists
    throw new Error("Shop products feature needs reimplementation");
  },
});

export const createSale = mutation({
  args: {
    name: v.string(),
    discountPercent: v.number(),
    startTime: v.number(),
    endTime: v.number(),
    productIds: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Implementation removed - shopSales table no longer exists
    throw new Error("Shop sales feature needs reimplementation");
  },
});

export const getActiveSales = query({
  args: {},
  returns: v.array(saleReturnValidator),
  handler: async (ctx) => {
    // Implementation removed - shopSales table no longer exists
    throw new Error("Shop sales feature needs reimplementation");
  },
});
*/
