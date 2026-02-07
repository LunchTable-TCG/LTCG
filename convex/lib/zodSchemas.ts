/**
 * Reusable Zod 4 Schemas for Cross-Field Validation
 *
 * These schemas handle validation patterns that native Convex validators (v.xxx)
 * cannot express, specifically cross-field refinements and complex constraints.
 *
 * USAGE:
 * ======
 * Import individual schemas and use them with zMutation/zQuery from zFunctions.ts,
 * or use them standalone for validation within handler logic.
 *
 * ```typescript
 * import { z } from "zod/v4";
 * import { zMutation } from "../lib/zFunctions";
 * import { shopPurchaseSchema } from "../lib/zodSchemas";
 *
 * export const purchase = zMutation({
 *   args: shopPurchaseSchema.shape,  // Spread into args
 *   handler: async (ctx, args) => { ... },
 * });
 * ```
 *
 * Or validate inside a handler:
 * ```typescript
 * const validated = tradeOfferSchema.parse(rawData);
 * ```
 *
 * NOTE: Uses `zod/v4` import path (Zod 4 via convex-helpers convention).
 */

import { z } from "zod/v4";

// ============================================================================
// CURRENCY & ECONOMY SCHEMAS
// ============================================================================

/**
 * Currency transaction validation.
 *
 * Validates that:
 * - Amount is a positive integer (no fractional currency)
 * - Currency type is one of the supported types
 * - Reason is provided and within length bounds
 */
export const currencyTransactionSchema = z.object({
  currencyType: z.enum(["gold", "gems"]),
  amount: z.number().int().positive(),
  reason: z.string().min(1).max(200),
});

/**
 * Shop purchase validation.
 *
 * Validates purchase inputs with optional expected price for
 * optimistic concurrency (client sends expected price, server
 * confirms it hasn't changed).
 */
export const shopPurchaseSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
  expectedPrice: z.number().int().nonnegative().optional(),
});

// ============================================================================
// DECK COMPOSITION SCHEMAS
// ============================================================================

/**
 * Deck update validation with cross-field refinement.
 *
 * Validates:
 * - Name: 1-50 characters, trimmed
 * - Description: optional, max 500 characters
 * - Card count: 30-60 cards (standard TCG limits)
 * - Max 3 copies of any single card (cross-field refinement)
 *
 * The copy-limit refinement catches duplicates that flat validators
 * cannot express. For rarity-based limits (e.g., max 1 legendary),
 * use the imperative validateDeckCards() in lib/validation.ts which
 * has access to card definition lookups.
 */
export const deckUpdateSchema = z
  .object({
    name: z.string().min(1).max(50).trim(),
    description: z.string().max(500).optional(),
    cardIds: z.array(z.string()).min(30).max(60),
  })
  .refine(
    (data) => {
      const counts = new Map<string, number>();
      for (const id of data.cardIds) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
        if ((counts.get(id) ?? 0) > 3) return false;
      }
      return true;
    },
    { message: "Maximum 3 copies of any card allowed" }
  );

// ============================================================================
// MARKETPLACE SCHEMAS
// ============================================================================

/** Minimum auction duration: 24 hours in milliseconds */
const MIN_AUCTION_DURATION_MS = 86_400_000;

/** Minimum listing duration: 1 hour in milliseconds */
const MIN_LISTING_DURATION_MS = 3_600_000;

/** Maximum listing duration: 7 days in milliseconds */
const MAX_LISTING_DURATION_MS = 604_800_000;

/**
 * Marketplace listing validation with cross-field refinement.
 *
 * Validates:
 * - Card ID is provided
 * - Listing type is "fixed" or "auction"
 * - Price is a positive integer
 * - Duration is within 1 hour to 7 days
 * - Cross-field: auctions must run for at least 24 hours
 */
export const marketplaceListingSchema = z
  .object({
    cardId: z.string(),
    listingType: z.enum(["fixed", "auction"]),
    price: z.number().int().positive(),
    duration: z
      .number()
      .int()
      .min(MIN_LISTING_DURATION_MS)
      .max(MAX_LISTING_DURATION_MS),
  })
  .refine(
    (data) => {
      if (data.listingType === "auction") {
        return data.duration >= MIN_AUCTION_DURATION_MS;
      }
      return true;
    },
    { message: "Auctions must run for at least 24 hours" }
  );

// ============================================================================
// SOCIAL SCHEMAS
// ============================================================================

/**
 * Username format validation.
 *
 * Validates:
 * - 3-20 characters
 * - Only alphanumeric, underscores, and hyphens
 *
 * Matches the existing username constraints in the codebase
 * (see ErrorCode.AUTH_USERNAME_TAKEN and agent name validation).
 */
export const usernameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  );

// ============================================================================
// TRADE SCHEMAS
// ============================================================================

/**
 * Trade offer validation with cross-field refinements.
 *
 * Validates:
 * - Both offered and requested card arrays are present
 * - Gold amounts default to 0 and are non-negative integers
 * - Cross-field: must offer at least one item or gold
 * - Cross-field: must request at least one item or gold
 *
 * These refinements prevent empty/meaningless trades that would
 * waste database transactions and confuse the counterparty.
 */
export const tradeOfferSchema = z
  .object({
    offeredCardIds: z.array(z.string()),
    requestedCardIds: z.array(z.string()),
    offeredGold: z.number().int().nonnegative().default(0),
    requestedGold: z.number().int().nonnegative().default(0),
  })
  .refine((data) => data.offeredCardIds.length > 0 || data.offeredGold > 0, {
    message: "Must offer at least one item or gold",
  })
  .refine(
    (data) => data.requestedCardIds.length > 0 || data.requestedGold > 0,
    {
      message: "Must request at least one item or gold",
    }
  );

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/** Inferred type for a validated currency transaction */
export type CurrencyTransactionInput = z.infer<typeof currencyTransactionSchema>;

/** Inferred type for a validated shop purchase */
export type ShopPurchaseInput = z.infer<typeof shopPurchaseSchema>;

/** Inferred type for a validated deck update */
export type DeckUpdateInput = z.infer<typeof deckUpdateSchema>;

/** Inferred type for a validated marketplace listing */
export type MarketplaceListingInput = z.infer<typeof marketplaceListingSchema>;

/** Inferred type for a validated trade offer */
export type TradeOfferInput = z.infer<typeof tradeOfferSchema>;
