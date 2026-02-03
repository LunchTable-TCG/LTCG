/**
 * Shop Product Admin Module
 *
 * CRUD operations for managing shop products.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Product type validators matching schema
const productTypeValidator = v.union(
  v.literal("pack"),
  v.literal("box"),
  v.literal("currency")
);

const rarityValidator = v.union(
  v.literal("common"),
  v.literal("uncommon"),
  v.literal("rare"),
  v.literal("epic"),
  v.literal("legendary")
);

const archetypeValidator = v.union(
  v.literal("infernal_dragons"),
  v.literal("abyssal_horrors"),
  v.literal("nature_spirits"),
  v.literal("storm_elementals"),
  v.literal("shadow_assassins"),
  v.literal("celestial_guardians"),
  v.literal("undead_legion"),
  v.literal("divine_knights"),
  v.literal("arcane_mages"),
  v.literal("mechanical_constructs"),
  v.literal("neutral"),
  v.literal("fire"),
  v.literal("water"),
  v.literal("earth"),
  v.literal("wind")
);

const currencyTypeValidator = v.union(v.literal("gold"), v.literal("gems"));

// =============================================================================
// Queries
// =============================================================================

/**
 * List all shop products with optional filtering
 */
export const listProducts = query({
  args: {
    productType: v.optional(productTypeValidator),
    includeInactive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let products;
    if (args.productType) {
      products = await ctx.db
        .query("shopProducts")
        .withIndex("by_type", (q) =>
          q.eq("productType", args.productType!).eq("isActive", true)
        )
        .collect();

      // If we want inactive too, we need a separate query
      if (args.includeInactive) {
        const inactive = await ctx.db
          .query("shopProducts")
          .withIndex("by_type", (q) =>
            q.eq("productType", args.productType!).eq("isActive", false)
          )
          .collect();
        products = [...products, ...inactive];
      }
    } else {
      products = await ctx.db.query("shopProducts").collect();
    }

    // Filter by active status
    if (!args.includeInactive) {
      products = products.filter((p) => p.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.productId.toLowerCase().includes(searchLower)
      );
    }

    // Sort by sortOrder
    products.sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      products,
      totalCount: products.length,
    };
  },
});

/**
 * Get a single product by ID
 */
export const getProduct = query({
  args: {
    productDbId: v.id("shopProducts"),
  },
  handler: async (ctx, { productDbId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.get(productDbId);
  },
});

/**
 * Get shop statistics
 */
export const getShopStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const products = await ctx.db.query("shopProducts").collect();
    const activeProducts = products.filter((p) => p.isActive);

    // Count by type
    const byType = {
      pack: activeProducts.filter((p) => p.productType === "pack").length,
      box: activeProducts.filter((p) => p.productType === "box").length,
      currency: activeProducts.filter((p) => p.productType === "currency").length,
    };

    // Count by pricing
    const goldOnly = activeProducts.filter(
      (p) => p.goldPrice && !p.gemPrice
    ).length;
    const gemOnly = activeProducts.filter(
      (p) => p.gemPrice && !p.goldPrice
    ).length;
    const bothPricing = activeProducts.filter(
      (p) => p.goldPrice && p.gemPrice
    ).length;

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      inactiveProducts: products.length - activeProducts.length,
      byType,
      pricing: { goldOnly, gemOnly, bothPricing },
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new shop product
 */
export const createProduct = mutation({
  args: {
    productId: v.string(),
    name: v.string(),
    description: v.string(),
    productType: productTypeValidator,
    goldPrice: v.optional(v.number()),
    gemPrice: v.optional(v.number()),
    // Pack config
    packCardCount: v.optional(v.number()),
    packGuaranteedRarity: v.optional(rarityValidator),
    packArchetype: v.optional(archetypeValidator),
    // Box config
    boxPackProductId: v.optional(v.string()),
    boxPackCount: v.optional(v.number()),
    boxBonusCards: v.optional(v.number()),
    // Currency config
    currencyType: v.optional(currencyTypeValidator),
    currencyAmount: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Check for duplicate productId
    const existing = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (existing) {
      throw new Error(`Product with ID "${args.productId}" already exists`);
    }

    // Validate pricing - must have at least one price
    if (!args.goldPrice && !args.gemPrice) {
      throw new Error("Product must have at least one price (gold or gems)");
    }

    // Build config objects based on product type
    let packConfig = undefined;
    let boxConfig = undefined;
    let currencyConfig = undefined;

    if (args.productType === "pack") {
      if (!args.packCardCount) {
        throw new Error("Pack products must have a card count");
      }
      packConfig = {
        cardCount: args.packCardCount,
        guaranteedRarity: args.packGuaranteedRarity,
        archetype: args.packArchetype,
      };
    } else if (args.productType === "box") {
      if (!args.boxPackProductId || !args.boxPackCount) {
        throw new Error("Box products must have a pack product ID and count");
      }
      boxConfig = {
        packProductId: args.boxPackProductId,
        packCount: args.boxPackCount,
        bonusCards: args.boxBonusCards,
      };
    } else if (args.productType === "currency") {
      if (!args.currencyType || !args.currencyAmount) {
        throw new Error("Currency products must have a currency type and amount");
      }
      currencyConfig = {
        currencyType: args.currencyType,
        amount: args.currencyAmount,
      };
    }

    // Get max sortOrder if not provided
    let sortOrder = args.sortOrder;
    if (sortOrder === undefined) {
      const allProducts = await ctx.db.query("shopProducts").collect();
      const maxOrder = allProducts.reduce((max, p) => Math.max(max, p.sortOrder), 0);
      sortOrder = maxOrder + 1;
    }

    const productDbId = await ctx.db.insert("shopProducts", {
      productId: args.productId,
      name: args.name,
      description: args.description,
      productType: args.productType,
      goldPrice: args.goldPrice,
      gemPrice: args.gemPrice,
      packConfig,
      boxConfig,
      currencyConfig,
      isActive: args.isActive ?? true,
      sortOrder,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_shop_product",
      metadata: {
        productDbId,
        productId: args.productId,
        productName: args.name,
        productType: args.productType,
      },
      success: true,
    });

    return { productDbId, message: `Created product "${args.name}"` };
  },
});

/**
 * Update an existing shop product
 */
export const updateProduct = mutation({
  args: {
    productDbId: v.id("shopProducts"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    goldPrice: v.optional(v.number()),
    gemPrice: v.optional(v.number()),
    // Pack config
    packCardCount: v.optional(v.number()),
    packGuaranteedRarity: v.optional(rarityValidator),
    packArchetype: v.optional(archetypeValidator),
    // Box config
    boxPackProductId: v.optional(v.string()),
    boxPackCount: v.optional(v.number()),
    boxBonusCards: v.optional(v.number()),
    // Currency config
    currencyType: v.optional(currencyTypeValidator),
    currencyAmount: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    // To explicitly clear a field
    clearGoldPrice: v.optional(v.boolean()),
    clearGemPrice: v.optional(v.boolean()),
    clearGuaranteedRarity: v.optional(v.boolean()),
    clearArchetype: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const product = await ctx.db.get(args.productDbId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    // Handle gold price
    if (args.clearGoldPrice) {
      updates.goldPrice = undefined;
    } else if (args.goldPrice !== undefined) {
      updates.goldPrice = args.goldPrice;
    }

    // Handle gem price
    if (args.clearGemPrice) {
      updates.gemPrice = undefined;
    } else if (args.gemPrice !== undefined) {
      updates.gemPrice = args.gemPrice;
    }

    // Handle pack config updates
    if (product.productType === "pack") {
      const currentConfig = product.packConfig || { cardCount: 5 };
      const newConfig = { ...currentConfig };

      if (args.packCardCount !== undefined) {
        newConfig.cardCount = args.packCardCount;
      }
      if (args.clearGuaranteedRarity) {
        newConfig.guaranteedRarity = undefined;
      } else if (args.packGuaranteedRarity !== undefined) {
        newConfig.guaranteedRarity = args.packGuaranteedRarity;
      }
      if (args.clearArchetype) {
        newConfig.archetype = undefined;
      } else if (args.packArchetype !== undefined) {
        newConfig.archetype = args.packArchetype;
      }

      updates.packConfig = newConfig;
    }

    // Handle box config updates
    if (product.productType === "box") {
      const currentConfig = product.boxConfig || {
        packProductId: "",
        packCount: 1,
      };
      const newConfig = { ...currentConfig };

      if (args.boxPackProductId !== undefined) {
        newConfig.packProductId = args.boxPackProductId;
      }
      if (args.boxPackCount !== undefined) {
        newConfig.packCount = args.boxPackCount;
      }
      if (args.boxBonusCards !== undefined) {
        newConfig.bonusCards = args.boxBonusCards;
      }

      updates.boxConfig = newConfig;
    }

    // Handle currency config updates
    if (product.productType === "currency") {
      const currentConfig = product.currencyConfig || {
        currencyType: "gold" as const,
        amount: 0,
      };
      const newConfig = { ...currentConfig };

      if (args.currencyType !== undefined) {
        newConfig.currencyType = args.currencyType;
      }
      if (args.currencyAmount !== undefined) {
        newConfig.amount = args.currencyAmount;
      }

      updates.currencyConfig = newConfig;
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.productDbId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_shop_product",
      metadata: {
        productDbId: args.productDbId,
        productId: product.productId,
        productName: product.name,
        updates: Object.keys(updates),
      },
      success: true,
    });

    return { success: true, message: `Updated product "${product.name}"` };
  },
});

/**
 * Toggle product active status
 */
export const toggleProductActive = mutation({
  args: {
    productDbId: v.id("shopProducts"),
  },
  handler: async (ctx, { productDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const product = await ctx.db.get(productDbId);
    if (!product) {
      throw new Error("Product not found");
    }

    const newStatus = !product.isActive;
    await ctx.db.patch(productDbId, { isActive: newStatus });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_shop_product" : "deactivate_shop_product",
      metadata: {
        productDbId,
        productId: product.productId,
        productName: product.name,
        previousStatus: product.isActive,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Product "${product.name}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete a product permanently
 */
export const deleteProduct = mutation({
  args: {
    productDbId: v.id("shopProducts"),
  },
  handler: async (ctx, { productDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const product = await ctx.db.get(productDbId);
    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.db.delete(productDbId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_shop_product",
      metadata: {
        productDbId,
        productId: product.productId,
        productName: product.name,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted product "${product.name}"` };
  },
});

/**
 * Duplicate a product
 */
export const duplicateProduct = mutation({
  args: {
    productDbId: v.id("shopProducts"),
    newProductId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, { productDbId, newProductId, newName }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const source = await ctx.db.get(productDbId);
    if (!source) {
      throw new Error("Source product not found");
    }

    // Check for duplicate productId
    const existing = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", newProductId))
      .first();

    if (existing) {
      throw new Error(`Product with ID "${newProductId}" already exists`);
    }

    const { _id, _creationTime, ...productData } = source;
    const newProductDbId = await ctx.db.insert("shopProducts", {
      ...productData,
      productId: newProductId,
      name: newName,
      isActive: false,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "duplicate_shop_product",
      metadata: {
        sourceProductDbId: productDbId,
        sourceProductId: source.productId,
        newProductDbId,
        newProductId,
        newName,
      },
      success: true,
    });

    return {
      productDbId: newProductDbId,
      message: `Created "${newName}" as a copy of "${source.name}"`,
    };
  },
});

/**
 * Reorder products (update sortOrder)
 */
export const reorderProducts = mutation({
  args: {
    productOrders: v.array(
      v.object({
        productDbId: v.id("shopProducts"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, { productOrders }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    for (const { productDbId, sortOrder } of productOrders) {
      await ctx.db.patch(productDbId, { sortOrder });
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "reorder_shop_products",
      metadata: {
        count: productOrders.length,
      },
      success: true,
    });

    return { success: true, message: `Reordered ${productOrders.length} products` };
  },
});
