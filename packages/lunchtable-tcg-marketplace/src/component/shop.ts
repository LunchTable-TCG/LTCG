import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// VALIDATORS
// ============================================================================

const productReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  price: v.number(),
  currency: v.string(),
  imageUrl: v.optional(v.string()),
  stock: v.optional(v.number()),
  isActive: v.boolean(),
  saleId: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

const saleReturnValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  discountPercent: v.number(),
  startTime: v.number(),
  endTime: v.number(),
  productIds: v.optional(v.array(v.string())),
  isActive: v.boolean(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
});

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

// ============================================================================
// QUERIES
// ============================================================================

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

/**
 * Get shop products, optionally filtered by category.
 * Only returns active products by default.
 */
export const getProducts = query({
  args: { category: v.optional(v.string()) },
  returns: v.array(productReturnValidator),
  handler: async (ctx, args) => {
    let products;

    if (args.category) {
      products = await ctx.db
        .query("shopProducts")
        .withIndex("by_category", (q) =>
          q.eq("category", args.category!).eq("isActive", true)
        )
        .collect();
    } else {
      products = await ctx.db
        .query("shopProducts")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();
    }

    return products.map((product) => ({
      ...product,
      _id: product._id as string,
      saleId: product.saleId ? (product.saleId as string) : undefined,
    }));
  },
});

/**
 * Get a single product by its ID.
 */
export const getProductById = query({
  args: { id: v.id("shopProducts") },
  returns: v.union(productReturnValidator, v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) return null;

    return {
      ...product,
      _id: product._id as string,
      saleId: product.saleId ? (product.saleId as string) : undefined,
    };
  },
});

/**
 * Get all currently active sales (within their time window).
 */
export const getActiveSales = query({
  args: {},
  returns: v.array(saleReturnValidator),
  handler: async (ctx) => {
    const now = Date.now();

    const sales = await ctx.db
      .query("shopSales")
      .withIndex("by_active", (q) => q.eq("isActive", true).lte("startTime", now))
      .filter((q) => q.gte(q.field("endTime"), now))
      .collect();

    return sales.map((sale) => ({
      ...sale,
      _id: sale._id as string,
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Purchase a shop product.
 * Validates stock availability, applies sale discounts, and records the purchase.
 * Returns the purchase record ID.
 *
 * Note: Currency deduction and inventory updates should be handled by the
 * caller (e.g., via the economy component) since this component only manages
 * marketplace data.
 */
export const purchaseProduct = mutation({
  args: {
    productId: v.id("shopProducts"),
    buyerId: v.string(),
    quantity: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error(`Product not found: ${args.productId}`);
    }
    if (!product.isActive) {
      throw new Error("Product is not available for purchase");
    }

    // Check stock if limited
    if (product.stock !== undefined) {
      if (product.stock < args.quantity) {
        throw new Error(
          `Insufficient stock: ${product.stock} available, ${args.quantity} requested`
        );
      }
    }

    const now = Date.now();
    let unitPrice = product.price;
    let discountApplied: number | undefined;
    let appliedSaleId: typeof product.saleId | undefined;

    // Apply sale discount if a sale is linked to this product
    if (product.saleId) {
      const sale = await ctx.db.get(product.saleId);
      if (sale && sale.isActive && sale.startTime <= now && sale.endTime >= now) {
        const discountMultiplier = 1 - sale.discountPercent / 100;
        unitPrice = Math.floor(product.price * discountMultiplier);
        discountApplied = sale.discountPercent;
        appliedSaleId = product.saleId;
      }
    }

    const totalPrice = unitPrice * args.quantity;

    // Deduct stock if limited
    if (product.stock !== undefined) {
      await ctx.db.patch(args.productId, {
        stock: product.stock - args.quantity,
        updatedAt: now,
      });
    }

    // Record the purchase
    const purchaseId = await ctx.db.insert("shopPurchases", {
      productId: args.productId,
      buyerId: args.buyerId,
      quantity: args.quantity,
      unitPrice,
      totalPrice,
      currency: product.currency,
      discountApplied,
      saleId: appliedSaleId,
      purchasedAt: now,
    });

    return purchaseId as string;
  },
});

/**
 * Create a new shop product (admin).
 */
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
    if (args.price < 0) {
      throw new Error("Price must be non-negative");
    }
    if (args.stock !== undefined && args.stock < 0) {
      throw new Error("Stock must be non-negative");
    }

    const now = Date.now();
    const id = await ctx.db.insert("shopProducts", {
      name: args.name,
      description: args.description,
      category: args.category,
      price: args.price,
      currency: args.currency,
      imageUrl: args.imageUrl,
      stock: args.stock,
      isActive: true,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });

    return id as string;
  },
});

/**
 * Update an existing shop product (admin).
 */
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
    const product = await ctx.db.get(args.id);
    if (!product) {
      throw new Error(`Product not found: ${args.id}`);
    }

    if (args.fields.price !== undefined && args.fields.price < 0) {
      throw new Error("Price must be non-negative");
    }
    if (args.fields.stock !== undefined && args.fields.stock < 0) {
      throw new Error("Stock must be non-negative");
    }

    // Validate saleId if provided
    if (args.fields.saleId !== undefined) {
      const sale = await ctx.db.get(args.fields.saleId);
      if (!sale) {
        throw new Error(`Sale not found: ${args.fields.saleId}`);
      }
    }

    await ctx.db.patch(args.id, {
      ...args.fields,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Create a new sale/discount (admin).
 */
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
    if (args.discountPercent < 0 || args.discountPercent > 100) {
      throw new Error("Discount percent must be between 0 and 100");
    }
    if (args.endTime <= args.startTime) {
      throw new Error("End time must be after start time");
    }

    const id = await ctx.db.insert("shopSales", {
      name: args.name,
      discountPercent: args.discountPercent,
      startTime: args.startTime,
      endTime: args.endTime,
      productIds: args.productIds,
      isActive: true,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return id as string;
  },
});
