import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { PAGINATION } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { addCardsToInventory, getRandomCard, openPack, weightedRandomRarity } from "../lib/helpers";
import { checkRateLimitWrapper } from "../lib/rateLimit";
import { cardResultValidator } from "../lib/returnValidators";
import { packPurchaseValidator } from "../lib/returnValidators";
import type { CardResult } from "../lib/types";
import { validateCurrency, validateCurrencyBalance, validatePositive } from "../lib/validation";
import { adjustPlayerCurrencyHelper } from "./economy";

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all active shop products
 * Returns packs, boxes, and currency bundles sorted by display order
 *
 * @returns Array of active shop products
 */
export const getShopProducts = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("shopProducts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(100); // Limit to 100 products (reasonable shop size)

    // Sort by sortOrder
    return products.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

/**
 * Get player's pack opening history
 * Returns paginated list of pack openings with card results
 *
 * @param page - Optional page number (defaults to 1)
 * @returns Paginated pack opening history with cards received
 * @deprecated Use getPackOpeningHistoryPaginated for better performance with cursor-based pagination.
 *             This function uses inefficient offset-based pagination that loads 1000 records into memory.
 */
export const getPackOpeningHistory = query({
  args: {
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const page = args.page ?? 1;
    const pageSize = PAGINATION.PACK_HISTORY_PAGE_SIZE;

    // Limit to 1000 recent pack openings for pagination
    // This prevents unbounded queries while still supporting history
    const allHistory = await ctx.db
      .query("packOpeningHistory")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1000);

    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginated = allHistory.slice(startIdx, endIdx);

    return {
      history: paginated,
      page,
      pageSize,
      total: allHistory.length,
      hasMore: endIdx < allHistory.length,
    };
  },
});

/**
 * Get player's pack opening history (cursor-based pagination)
 * Uses Convex's built-in pagination for better performance and scalability
 *
 * @param paginationOpts - Convex pagination options (cursor-based)
 * @returns Paginated pack opening history results
 */
export const getPackOpeningHistoryPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    return await ctx.db
      .query("packOpeningHistory")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Purchase a card pack and open it immediately
 * Deducts currency, generates random cards, and adds them to inventory
 * SECURITY: Rate limited to prevent pack opening spam
 *
 * @param productId - The shop product ID (must be a pack type)
 * @param useGems - Whether to use gems (true) or gold (false) for purchase
 * @returns Pack purchase result with cards received
 */
export const purchasePack = mutation({
  args: {
    productId: v.string(),
    useGems: v.boolean(),
  },
  returns: packPurchaseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit pack purchases to prevent spam/abuse
    // Max 30 purchases per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "PACK_PURCHASE", userId);

    // Get product
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product || !product.isActive) {
      throw createError(ErrorCode.NOT_FOUND_PRODUCT);
    }

    if (product.productType !== "pack") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is only for pack purchases",
      });
    }

    if (!product.packConfig) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Invalid pack configuration",
      });
    }

    // Determine price
    const price = args.useGems ? product.gemPrice : product.goldPrice;
    const currencyType: "gold" | "gems" = args.useGems ? "gems" : "gold";

    if (!price || price <= 0) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: `This pack cannot be purchased with ${currencyType}`,
      });
    }

    // Validate currency amount
    validateCurrency(price, 1);
    validatePositive(price, "Price");

    // Validate user has sufficient balance
    await validateCurrencyBalance(ctx, userId, args.useGems ? 0 : price, args.useGems ? price : 0);

    // Deduct currency
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: args.useGems ? 0 : -price,
      gemsDelta: args.useGems ? -price : 0,
      transactionType: "purchase",
      description: `Purchased ${product.name}`,
      referenceId: product._id,
      metadata: { productId: args.productId },
    });

    // Open pack and generate cards
    const cards = await openPack(ctx, product.packConfig, userId);

    // Record pack opening
    await ctx.db.insert("packOpeningHistory", {
      userId,
      productId: args.productId,
      packType: product.name,
      cardsReceived: cards.map((c) => ({
        cardDefinitionId: c.cardDefinitionId,
        name: c.name,
        rarity: c.rarity,
      })),
      currencyUsed: currencyType,
      amountPaid: price,
      openedAt: Date.now(),
    });

    return {
      success: true,
      productName: product.name,
      cardsReceived: cards,
      currencyUsed: currencyType,
      amountPaid: price,
    };
  },
});

/**
 * Purchase a box (multiple packs) and open all packs
 * Opens multiple packs at once and may include bonus cards
 *
 * @param productId - The shop product ID (must be a box type)
 * @param useGems - Whether to use gems (true) or gold (false) for purchase
 * @returns Box purchase result with all cards received from all packs
 */
export const purchaseBox = mutation({
  args: {
    productId: v.string(),
    useGems: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
    productName: v.string(),
    packsOpened: v.number(),
    bonusCards: v.number(),
    cardsReceived: v.array(cardResultValidator), // CardResult array
    currencyUsed: v.union(v.literal("gold"), v.literal("gems")),
    amountPaid: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get product
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product || !product.isActive) {
      throw createError(ErrorCode.NOT_FOUND_PRODUCT);
    }

    if (product.productType !== "box") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is only for box purchases",
      });
    }

    if (!product.boxConfig) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Invalid box configuration",
      });
    }

    // Determine price
    const price = args.useGems ? product.gemPrice : product.goldPrice;
    const currencyType: "gold" | "gems" = args.useGems ? "gems" : "gold";

    if (!price || price <= 0) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: `This box cannot be purchased with ${currencyType}`,
      });
    }

    // Get pack definition
    const packProductId = product.boxConfig?.packProductId;
    if (!packProductId) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Box configuration missing pack product ID",
      });
    }
    const packProduct = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", packProductId))
      .first();

    if (!packProduct || !packProduct.packConfig) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Pack configuration not found for this box",
      });
    }

    // Deduct currency
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: args.useGems ? 0 : -price,
      gemsDelta: args.useGems ? -price : 0,
      transactionType: "purchase",
      description: `Purchased ${product.name}`,
      referenceId: product._id,
      metadata: { productId: args.productId },
    });

    // Open all packs
    const allCards: CardResult[] = [];
    const packCount = product.boxConfig.packCount;

    for (let i = 0; i < packCount; i++) {
      const cards = await openPack(ctx, packProduct.packConfig, userId);
      allCards.push(...cards);
    }

    // Add bonus cards if configured
    if (product.boxConfig.bonusCards && product.boxConfig.bonusCards > 0) {
      for (let i = 0; i < product.boxConfig.bonusCards; i++) {
        const rarity = weightedRandomRarity();
        const card = await getRandomCard(ctx, rarity);
        await addCardsToInventory(ctx, userId, card._id, 1);
        allCards.push({
          cardDefinitionId: card._id,
          name: card.name,
          rarity: card.rarity,
          archetype: card.archetype,
          cardType: card.cardType,
          attack: card.attack,
          defense: card.defense,
          cost: card.cost,
          imageUrl: card.imageUrl,
        });
      }
    }

    // Record box opening
    await ctx.db.insert("packOpeningHistory", {
      userId,
      productId: args.productId,
      packType: `${product.name} (${packCount} packs)`,
      cardsReceived: allCards.map((c) => ({
        cardDefinitionId: c.cardDefinitionId,
        name: c.name,
        rarity: c.rarity,
      })),
      currencyUsed: currencyType,
      amountPaid: price,
      openedAt: Date.now(),
    });

    return {
      success: true,
      productName: product.name,
      packsOpened: packCount,
      bonusCards: product.boxConfig.bonusCards ?? 0,
      cardsReceived: allCards,
      currencyUsed: currencyType,
      amountPaid: price,
    };
  },
});

/**
 * Purchase currency bundle (Gems → Gold conversion)
 * Converts gems into gold at a fixed exchange rate
 *
 * @param productId - The shop product ID (must be a currency type)
 * @returns Currency bundle purchase result with gems spent and gold received
 */
export const purchaseCurrencyBundle = mutation({
  args: {
    productId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    productName: v.string(),
    gemsSpent: v.number(),
    goldReceived: v.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get product
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product || !product.isActive) {
      throw createError(ErrorCode.NOT_FOUND_PRODUCT);
    }

    if (product.productType !== "currency") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is only for currency purchases",
      });
    }

    if (!product.currencyConfig) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Invalid currency configuration",
      });
    }

    // Currency bundles always cost gems
    if (!product.gemPrice || product.gemPrice <= 0) {
      throw createError(ErrorCode.ECONOMY_INVALID_PRODUCT, {
        reason: "Invalid currency bundle price",
      });
    }

    // Deduct gems, add gold
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      gemsDelta: -product.gemPrice,
      transactionType: "purchase",
      description: `Purchased ${product.name} (spent gems)`,
      referenceId: product._id,
    });

    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: product.currencyConfig.amount,
      transactionType: "conversion",
      description: `Purchased ${product.name} (received gold)`,
      referenceId: product._id,
    });

    return {
      success: true,
      productName: product.name,
      gemsSpent: product.gemPrice,
      goldReceived: product.currencyConfig.amount,
    };
  },
});
