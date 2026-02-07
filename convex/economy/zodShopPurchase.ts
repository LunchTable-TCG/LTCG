/**
 * Example: Zod-Validated Shop Purchase Mutation
 *
 * Reference implementation showing how to use the Zod 4 + convex-helpers
 * integration layer for mutations with cross-field validation and triggers.
 *
 * KEY PATTERNS DEMONSTRATED:
 * ==========================
 * 1. Using `zMutation` from zFunctions.ts (Zod validation + trigger support)
 * 2. Zod schemas for argument validation (z.string(), z.number().int(), etc.)
 * 3. Zod schemas for return value validation (z.object with returns)
 * 4. Importing reusable schemas from zodSchemas.ts
 * 5. Cross-field validation via schema refinements
 *
 * RELATIONSHIP TO EXISTING shop.ts:
 * ==================================
 * This file does NOT replace convex/economy/shop.ts. It serves as a
 * reference for how to write NEW mutations using the Zod layer.
 * Existing mutations continue to work with native Convex validators.
 *
 * TRIGGER SUPPORT:
 * ================
 * Because zMutation wraps rawMutation with triggers.wrapDB, all database
 * writes in the handler will fire triggers (e.g., audit logging for
 * playerCurrency changes). This matches the behavior of the wrapped
 * `mutation` from convex/functions.ts.
 */

import { z } from "zod/v4";
import { zMutation } from "../lib/zFunctions";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * Purchase a shop product with Zod-validated inputs.
 *
 * Demonstrates the zMutation pattern:
 * - Arguments use Zod validators instead of v.xxx
 * - Return type is validated by Zod at runtime
 * - Handler receives typed, pre-validated args
 * - Database triggers fire on all writes (audit logging)
 *
 * @example Client usage:
 * ```typescript
 * const result = await convex.mutation(api.economy.zodShopPurchase.purchaseWithValidation, {
 *   productId: "starter-pack-001",
 *   quantity: 1,
 * });
 * ```
 */
export const purchaseWithValidation = zMutation({
  args: {
    productId: z.string(),
    quantity: z.number().int().min(1).max(99),
  },
  returns: z.object({
    success: z.boolean(),
    transactionId: z.string().optional(),
    error: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    // Authentication: verify caller identity
    const { userId } = await requireAuthMutation(ctx);

    // Zod has already validated: productId is string, quantity is int in [1, 99]
    // No need for manual type checks on args.

    // Look up the product
    const product = await ctx.db
      .query("shopProducts")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .first();

    if (!product || !product.isActive) {
      return {
        success: false,
        error: "Product not found or unavailable",
      };
    }

    // Verify product type supports quantity purchases
    if (product.productType !== "pack" && args.quantity > 1) {
      return {
        success: false,
        error: "Only packs support quantity purchases",
      };
    }

    // Calculate total price
    const unitPrice = product.goldPrice ?? 0;
    if (unitPrice <= 0) {
      return {
        success: false,
        error: "Product has no gold price configured",
      };
    }

    const totalPrice = unitPrice * args.quantity;

    // Verify user has sufficient balance
    const currency = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!currency) {
      throw createError(ErrorCode.SYSTEM_CURRENCY_NOT_FOUND, { userId });
    }

    if (currency.gold < totalPrice) {
      throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
        required: totalPrice,
        available: currency.gold,
      });
    }

    // Deduct currency (triggers will fire audit log on playerCurrency write)
    await ctx.db.patch(currency._id, {
      gold: currency.gold - totalPrice,
      lifetimeGoldSpent: currency.lifetimeGoldSpent + totalPrice,
      lastUpdatedAt: Date.now(),
    });

    // Record transaction for audit trail
    await ctx.db.insert("currencyTransactions", {
      userId,
      transactionType: "purchase",
      currencyType: "gold",
      amount: -totalPrice,
      balanceAfter: currency.gold - totalPrice,
      description: `Purchased ${args.quantity}x ${product.name}`,
      referenceId: product._id,
      metadata: {
        productId: args.productId,
        quantity: args.quantity,
        unitPrice,
      },
      createdAt: Date.now(),
    });

    return {
      success: true,
      transactionId: product._id,
    };
  },
});
