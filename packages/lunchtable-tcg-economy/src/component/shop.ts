import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all active shop products, sorted by sortOrder.
 */
export const getShopProducts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db
      .query("shopProducts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Get a single product by productId.
 */
export const getProduct = query({
  args: { productId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new shop product.
 */
export const createProduct = mutation({
  args: {
    productId: v.string(),
    name: v.string(),
    description: v.string(),
    productType: v.union(v.literal("pack"), v.literal("box"), v.literal("currency")),
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
        currencyType: v.union(v.literal("gold"), v.literal("gems")),
        amount: v.number(),
      })
    ),
    isActive: v.boolean(),
    sortOrder: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (existing) {
      throw new Error(`Product with productId "${args.productId}" already exists`);
    }

    const id = await ctx.db.insert("shopProducts", {
      ...args,
      createdAt: Date.now(),
    });
    return id;
  },
});

/**
 * Update an existing shop product.
 */
export const updateProduct = mutation({
  args: {
    productId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      goldPrice: v.optional(v.number()),
      gemPrice: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
      sortOrder: v.optional(v.number()),
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
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product) {
      throw new Error(`Product "${args.productId}" not found`);
    }

    await ctx.db.patch(product._id, args.updates);
    return null;
  },
});

/**
 * Record a pack opening event.
 */
export const recordPackOpening = mutation({
  args: {
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
    currencyUsed: v.union(
      v.literal("gold"),
      v.literal("gems"),
      v.literal("token"),
      v.literal("free")
    ),
    amountPaid: v.number(),
    pityTriggered: v.optional(
      v.object({
        epic: v.optional(v.boolean()),
        legendary: v.optional(v.boolean()),
        fullArt: v.optional(v.boolean()),
      })
    ),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("packOpeningHistory", {
      userId: args.userId,
      productId: args.productId,
      packType: args.packType,
      cardsReceived: args.cardsReceived,
      currencyUsed: args.currencyUsed,
      amountPaid: args.amountPaid,
      pityTriggered: args.pityTriggered,
      openedAt: Date.now(),
    });
    return id;
  },
});

/**
 * Get pity state for a user.
 */
export const getPityState = query({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.any(),
      _creationTime: v.number(),
      userId: v.string(),
      packsSinceLastLegendary: v.number(),
      lastLegendaryAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packOpeningPityState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Update pity state for a user (create if not exists).
 */
export const updatePityState = mutation({
  args: {
    userId: v.string(),
    packsSinceLastLegendary: v.number(),
    lastLegendaryAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("packOpeningPityState")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        packsSinceLastLegendary: args.packsSinceLastLegendary,
        lastLegendaryAt: args.lastLegendaryAt,
      });
    } else {
      await ctx.db.insert("packOpeningPityState", {
        userId: args.userId,
        packsSinceLastLegendary: args.packsSinceLastLegendary,
        lastLegendaryAt: args.lastLegendaryAt,
      });
    }

    return null;
  },
});

/**
 * Get pack opening history for a user.
 */
export const getPackOpeningHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    return await ctx.db
      .query("packOpeningHistory")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get pack opening history with cursor-based pagination.
 */
export const getPackOpeningHistoryPaginated = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("packOpeningHistory")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
