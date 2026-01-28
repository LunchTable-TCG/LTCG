/**
 * Shared Validation Functions for Convex
 *
 * Centralized validation logic used across all feature modules.
 * Eliminates duplicate session validation and ownership checks.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ErrorCode, createError } from "./errorCodes";
import type {
  CurrencyType,
  TransactionMetadata,
  TransactionType,
} from "./types";

/**
 * DEPRECATED: Use getCurrentUser or requireAuth from convexAuth.ts instead
 * This function was part of the old token-based auth system and has been removed.
 *
 * Use these instead:
 * - getCurrentUser(ctx) - returns null if not authenticated
 * - requireAuthQuery(ctx) - throws if not authenticated (for queries)
 * - requireAuthMutation(ctx) - throws if not authenticated (for mutations)
 */

/**
 * Check if user owns enough of a specific card
 *
 * Queries playerCards table for ownership record.
 * Returns false if card not found in inventory.
 *
 * @param ctx - Query or mutation context
 * @param userId - Player's user ID
 * @param cardDefinitionId - Card definition ID to check
 * @param requiredQuantity - Minimum quantity required
 * @returns true if user owns at least the required quantity, false otherwise
 * @example
 * await checkCardOwnership(ctx, userId, blueEyesId, 3) // true if owns 3+ Blue-Eyes
 * await checkCardOwnership(ctx, userId, darkMagicianId, 1) // true if owns 1+ Dark Magician
 */
export async function checkCardOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  cardDefinitionId: Id<"cardDefinitions">,
  requiredQuantity: number
): Promise<boolean> {
  const playerCard = await ctx.db
    .query("playerCards")
    .withIndex("by_user_card", (q) =>
      q.eq("userId", userId).eq("cardDefinitionId", cardDefinitionId)
    )
    .first();

  if (!playerCard) {
    return false;
  }

  return playerCard.quantity >= requiredQuantity;
}

/**
 * Get player currency record (read-only, for queries)
 *
 * @throws Error if currency record doesn't exist
 * @returns Player's currency record
 */
export async function getPlayerCurrency(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<Doc<"playerCurrency">> {
  const currency = await ctx.db
    .query("playerCurrency")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!currency) {
    throw createError(ErrorCode.SYSTEM_CURRENCY_NOT_FOUND, { userId });
  }

  return currency;
}

/**
 * Get or create player currency record (mutation only)
 *
 * Queries for existing currency record, creates default one if not found.
 * Creates record with 0 gold/gems and empty lifetime stats.
 * This shouldn't normally happen after signup integration.
 *
 * @param ctx - Mutation context
 * @param userId - Player's user ID
 * @returns Player's currency record
 * @throws Error if creation fails
 * @example
 * const currency = await getOrCreatePlayerCurrency(ctx, userId)
 * console.log(currency.gold) // 0 (if newly created)
 */
export async function getOrCreatePlayerCurrency(
  ctx: MutationCtx,
  userId: Id<"users">
): Promise<Doc<"playerCurrency">> {
  const currency = await ctx.db
    .query("playerCurrency")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (currency) {
    return currency;
  }

  // Create default currency record (shouldn't happen after signup integration)
  const currencyId = await ctx.db.insert("playerCurrency", {
    userId,
    gold: 0,
    gems: 0,
    lifetimeGoldEarned: 0,
    lifetimeGoldSpent: 0,
    lifetimeGemsEarned: 0,
    lifetimeGemsSpent: 0,
    lastUpdatedAt: Date.now(),
  });

  const newCurrency = await ctx.db.get(currencyId);
  if (!newCurrency) {
    throw createError(ErrorCode.SYSTEM_CURRENCY_CREATION_FAILED, { userId });
  }

  return newCurrency as Doc<"playerCurrency">;
}

/**
 * Record a currency transaction to the ledger
 *
 * Creates immutable audit trail entry in currencyTransactions table.
 * Used for tracking all gold/gem changes (earned, spent, awarded).
 *
 * @param ctx - Mutation context
 * @param userId - Player who made the transaction
 * @param transactionType - Type of transaction ("earned" | "spent" | "awarded" | "purchased")
 * @param currencyType - Currency affected ("gold" | "gems")
 * @param amount - Transaction amount (positive or negative)
 * @param balanceAfter - Player's balance after transaction
 * @param description - Human-readable description of transaction
 * @param referenceId - Optional reference ID (e.g., purchase ID, quest ID)
 * @param metadata - Optional additional data for analytics
 * @example
 * await recordTransaction(ctx, userId, "earned", "gold", 100, 1500, "Quest completed")
 * await recordTransaction(ctx, userId, "spent", "gems", -200, 800, "Bought card pack")
 */
export async function recordTransaction(
  ctx: MutationCtx,
  userId: Id<"users">,
  transactionType: TransactionType,
  currencyType: CurrencyType,
  amount: number,
  balanceAfter: number,
  description: string,
  referenceId?: string,
  metadata?: TransactionMetadata
): Promise<void> {
  await ctx.db.insert("currencyTransactions", {
    userId,
    transactionType,
    currencyType,
    amount,
    balanceAfter,
    referenceId,
    description,
    metadata,
    createdAt: Date.now(),
  });
}
