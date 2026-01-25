/**
 * Shared Validation Functions for Convex
 *
 * Centralized validation logic used across all feature modules.
 * Eliminates duplicate session validation and ownership checks.
 */

import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import type {
  AuthenticatedUser,
  CurrencyType,
  TransactionType,
  TransactionMetadata,
} from "./types";

/**
 * Validate user session and return authenticated user
 *
 * @throws Error if authentication fails or session expired
 * @returns User ID and username
 */
export async function validateSession(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<AuthenticatedUser> {
  if (!token) {
    throw new Error("Authentication required");
  }

  const session = await ctx.db
    .query("sessions")
    .withIndex("token", (q) => q.eq("token", token))
    .first();

  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expired or invalid");
  }

  const user = await ctx.db.get(session.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    userId: session.userId,
    username: user.username || user.name || "",
  };
}

/**
 * Check if user owns enough of a specific card
 *
 * @returns true if user owns at least the required quantity
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
    throw new Error("Currency record not found. User may need to sign up again.");
  }

  return currency;
}

/**
 * Get or create player currency record (mutation only)
 *
 * @returns Player's currency record
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
    throw new Error("Failed to create currency record");
  }

  return newCurrency as Doc<"playerCurrency">;
}

/**
 * Record a currency transaction to the ledger
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
