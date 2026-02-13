import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
});

export const getProducts = query({
  args: { category: v.optional(v.string()) },
  returns: v.array(productReturnValidator),
  handler: async (ctx, args) => {
    let products = await ctx.db
      .query("shopProducts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    if (args.category) {
      products = products.filter((p) => p.category === args.category);
    }

    return products.map((product) => ({
      ...product,
      _id: product._id as string,
      saleId: product.saleId ? (product.saleId as string) : undefined,
    }));
  },
});

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

export const purchaseProduct = mutation({
  args: {
    productId: v.id("shopProducts"),
    buyerId: v.string(),
    quantity: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new Error(`Product not found: ${args.productId}`);
    }
    if (!product.isActive) {
      throw new Error("Product is not available");
    }
    if (product.stock !== undefined && product.stock < args.quantity) {
      throw new Error("Insufficient stock");
    }

    let finalPrice = product.price * args.quantity;

    // Apply sale discount if applicable
    if (product.saleId) {
      const sale = await ctx.db.get(product.saleId);
      if (sale && sale.isActive) {
        const now = Date.now();
        if (now >= sale.startTime && now <= sale.endTime) {
          finalPrice *= 1 - sale.discountPercent / 100;
        }
      }
    }

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      buyerId: args.buyerId,
      sellerId: "shop",
      itemId: product._id as string,
      itemType: product.category,
      amount: finalPrice,
      currency: product.currency,
      type: "shop_buy",
      timestamp: Date.now(),
      metadata: {
        itemName: product.name,
        quantity: args.quantity,
      },
    });

    // Decrement stock if applicable
    if (product.stock !== undefined) {
      await ctx.db.patch(args.productId, {
        stock: product.stock - args.quantity,
      });
    }

    // Record price history
    await ctx.db.insert("priceHistory", {
      itemId: product._id as string,
      price: finalPrice / args.quantity,
      currency: product.currency,
      timestamp: Date.now(),
      type: "listing",
    });

    return transactionId as string;
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
    const productId = await ctx.db.insert("shopProducts", {
      ...args,
      isActive: true,
    });
    return productId as string;
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
    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new Error(`Product not found: ${args.id}`);
    }
    await ctx.db.patch(args.id, args.fields);
    return null;
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
    if (args.discountPercent < 0 || args.discountPercent > 100) {
      throw new Error("Discount percent must be between 0 and 100");
    }
    if (args.startTime >= args.endTime) {
      throw new Error("Start time must be before end time");
    }

    const saleId = await ctx.db.insert("shopSales", {
      ...args,
      isActive: true,
    });
    return saleId as string;
  },
});

export const getActiveSales = query({
  args: {},
  returns: v.array(saleReturnValidator),
  handler: async (ctx) => {
    const now = Date.now();
    const sales = await ctx.db
      .query("shopSales")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by time range
    const activeSales = sales.filter(
      (sale) => now >= sale.startTime && now <= sale.endTime
    );

    return activeSales.map((sale) => ({
      ...sale,
      _id: sale._id as string,
    }));
  },
});
