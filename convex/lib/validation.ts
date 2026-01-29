/**
 * Input Validation Helpers
 *
 * Comprehensive validation functions for critical game operations.
 * These helpers prevent invalid state transitions, data corruption,
 * and exploits by validating all inputs against game rules.
 *
 * SECURITY: All validation functions throw structured errors with ErrorCode
 * to ensure consistent error handling across the application.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ErrorCode, createError } from "./errorCodes";

// ============================================================================
// DECK VALIDATION
// ============================================================================

/**
 * Validate deck size is within allowed range
 *
 * @param cardIds - Array of card definition IDs in the deck
 * @param min - Minimum deck size (default: 30)
 * @param max - Maximum deck size (default: Infinity for no maximum)
 * @throws VALIDATION_INVALID_DECK if deck size is outside allowed range
 *
 * @example
 * validateDeckSize(cardIds, 30, 60) // Valid: 30-60 cards
 * validateDeckSize(cardIds, 30) // Valid: minimum 30 cards, no maximum
 */
export function validateDeckSize(
  cardIds: Id<"cardDefinitions">[],
  min = 30,
  max: number = Number.POSITIVE_INFINITY
) {
  const deckSize = cardIds.length;

  if (deckSize < min) {
    throw createError(ErrorCode.VALIDATION_INVALID_DECK, {
      reason: `Deck must have at least ${min} cards`,
      currentSize: deckSize,
      minSize: min,
    });
  }

  if (deckSize > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_DECK, {
      reason: `Deck cannot exceed ${max} cards`,
      currentSize: deckSize,
      maxSize: max,
    });
  }
}

/**
 * Validate user owns all cards in a deck with sufficient quantity
 *
 * Checks that the player owns all cards they're trying to add to a deck
 * and that they have enough copies to satisfy the requested quantities.
 *
 * @param ctx - Query or mutation context
 * @param userId - Player's user ID
 * @param cards - Array of card IDs and quantities to validate
 * @throws VALIDATION_INVALID_INPUT if cards not owned or insufficient quantity
 *
 * @example
 * await validateCardOwnership(ctx, userId, [
 *   { cardDefinitionId: blueEyesId, quantity: 3 }
 * ])
 */
export async function validateCardOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  cards: Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }>
) {
  // Fetch all player's cards
  const playerCards = await ctx.db
    .query("playerCards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Create ownership map for fast lookups
  const ownedCardMap = new Map<string, number>(
    playerCards.map((pc) => [pc.cardDefinitionId.toString(), pc.quantity])
  );

  // Validate each card
  for (const card of cards) {
    const ownedQuantity = ownedCardMap.get(card.cardDefinitionId.toString()) || 0;

    if (ownedQuantity === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You do not own this card",
        cardId: card.cardDefinitionId,
      });
    }

    if (card.quantity > ownedQuantity) {
      const cardDef = await ctx.db.get(card.cardDefinitionId);
      const cardName = cardDef?.name || "Unknown Card";

      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `You only own ${ownedQuantity} ${ownedQuantity === 1 ? "copy" : "copies"} of ${cardName}, but trying to add ${card.quantity}`,
        cardId: card.cardDefinitionId,
        cardName,
        owned: ownedQuantity,
        requested: card.quantity,
      });
    }
  }
}

// ============================================================================
// GAME STATE VALIDATION
// ============================================================================

/**
 * Validate monster zone has space for new monsters
 *
 * @param zone - Array of board cards (monster zone)
 * @param maxSize - Maximum zone size (default: 5)
 * @throws GAME_ZONE_FULL if zone is at capacity
 *
 * @example
 * validateMonsterZone(gameState.hostBoard) // Default max 5 monsters
 * validateMonsterZone(gameState.hostBoard, 3) // Custom max 3 monsters
 */
export function validateMonsterZone(
  zone: Array<{
    cardId: Id<"cardDefinitions">;
    position: number;
    attack: number;
    defense: number;
    hasAttacked: boolean;
    isFaceDown: boolean;
  }>,
  maxSize = 5
) {
  if (zone.length >= maxSize) {
    throw createError(ErrorCode.GAME_ZONE_FULL, {
      reason: "Monster zone is full",
      currentSize: zone.length,
      maxSize,
    });
  }
}

/**
 * Validate life points are within allowed range
 *
 * @param lp - Life points value to validate
 * @param min - Minimum allowed life points (default: 0)
 * @param max - Maximum allowed life points (default: 8000)
 * @throws VALIDATION_INVALID_INPUT if life points out of range
 *
 * @example
 * validateLifePoints(2000) // Valid: 0-8000 default range
 * validateLifePoints(-100) // Throws: below minimum
 * validateLifePoints(10000) // Throws: above maximum
 */
export function validateLifePoints(lp: number, min = 0, max = 8000) {
  if (lp < min) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Life points cannot be below ${min}`,
      value: lp,
      min,
    });
  }

  if (lp > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Life points cannot exceed ${max}`,
      value: lp,
      max,
    });
  }
}

// ============================================================================
// ECONOMY VALIDATION
// ============================================================================

/**
 * Validate currency amount is within allowed range
 *
 * Used for transactions, purchases, and currency operations.
 * Prevents negative transactions and overflow exploits.
 *
 * @param amount - Currency amount to validate
 * @param min - Minimum allowed amount (default: 0)
 * @param max - Maximum allowed amount (default: 1,000,000,000)
 * @throws VALIDATION_INVALID_INPUT if amount out of range
 *
 * @example
 * validateCurrency(500) // Valid: 0-1B default range
 * validateCurrency(-100) // Throws: negative amount not allowed
 * validateCurrency(2000000000) // Throws: exceeds maximum
 */
export function validateCurrency(amount: number, min = 0, max = 1_000_000_000) {
  if (!Number.isInteger(amount)) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Currency amount must be an integer",
      value: amount,
    });
  }

  if (amount < min) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Amount cannot be less than ${min}`,
      value: amount,
      min,
    });
  }

  if (amount > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Amount cannot exceed ${max}`,
      value: amount,
      max,
    });
  }
}

/**
 * Validate user has sufficient currency balance
 *
 * Checks user's currency record and validates they can afford a transaction.
 *
 * @param ctx - Query or mutation context
 * @param userId - Player's user ID
 * @param requiredGold - Required gold amount (default: 0)
 * @param requiredGems - Required gems amount (default: 0)
 * @throws ECONOMY_INSUFFICIENT_GOLD if not enough gold
 * @throws ECONOMY_INSUFFICIENT_GEMS if not enough gems
 * @throws SYSTEM_CURRENCY_NOT_FOUND if currency record doesn't exist
 *
 * @example
 * await validateCurrencyBalance(ctx, userId, 100, 0) // Need 100 gold
 * await validateCurrencyBalance(ctx, userId, 0, 50) // Need 50 gems
 * await validateCurrencyBalance(ctx, userId, 100, 50) // Need both
 */
export async function validateCurrencyBalance(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  requiredGold = 0,
  requiredGems = 0
) {
  // Get user's currency
  const currency = await ctx.db
    .query("playerCurrency")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (!currency) {
    throw createError(ErrorCode.SYSTEM_CURRENCY_NOT_FOUND, {
      userId,
    });
  }

  // Validate gold
  if (requiredGold > 0 && currency.gold < requiredGold) {
    throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD, {
      required: requiredGold,
      available: currency.gold,
      deficit: requiredGold - currency.gold,
    });
  }

  // Validate gems
  if (requiredGems > 0 && currency.gems < requiredGems) {
    throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GEMS, {
      required: requiredGems,
      available: currency.gems,
      deficit: requiredGems - currency.gems,
    });
  }
}

// ============================================================================
// LOBBY VALIDATION
// ============================================================================

/**
 * Validate lobby has space for additional players
 *
 * @param lobby - Game lobby document
 * @param maxPlayers - Maximum players allowed (default: 2)
 * @throws GAME_LOBBY_FULL if lobby is at capacity
 *
 * @example
 * validateLobbyCapacity(lobby) // Default 2 players
 * validateLobbyCapacity(lobby, 4) // Custom 4 players
 */
export function validateLobbyCapacity(lobby: Doc<"gameLobbies">, maxPlayers = 2) {
  const currentPlayers = lobby.opponentId ? 2 : 1;

  if (currentPlayers >= maxPlayers) {
    throw createError(ErrorCode.GAME_LOBBY_FULL, {
      currentPlayers,
      maxPlayers,
    });
  }
}

/**
 * Validate lobby is in correct state for action
 *
 * @param lobby - Game lobby document
 * @param allowedStatuses - Array of allowed lobby statuses
 * @throws VALIDATION_INVALID_INPUT if lobby status not allowed
 *
 * @example
 * validateLobbyStatus(lobby, ["waiting"]) // Must be waiting for players
 * validateLobbyStatus(lobby, ["active"]) // Must be in active game
 * validateLobbyStatus(lobby, ["waiting", "active"]) // Either is valid
 */
export function validateLobbyStatus(lobby: Doc<"gameLobbies">, allowedStatuses: string[]) {
  if (!allowedStatuses.includes(lobby.status)) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Lobby is ${lobby.status}, must be ${allowedStatuses.join(" or ")}`,
      currentStatus: lobby.status,
      allowedStatuses,
    });
  }
}

// ============================================================================
// GENERIC VALIDATION HELPERS
// ============================================================================

/**
 * Validate number is within allowed range
 *
 * Generic number range validation for any use case.
 *
 * @param value - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param fieldName - Name of field for error messages (default: "Value")
 * @throws VALIDATION_INVALID_INPUT if value out of range
 *
 * @example
 * validateRange(5, 1, 10, "Level") // Valid
 * validateRange(15, 1, 10, "Level") // Throws: Level must be between 1 and 10
 */
export function validateRange(value: number, min: number, max: number, fieldName = "Value") {
  if (value < min || value > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} must be between ${min} and ${max}`,
      value,
      min,
      max,
      field: fieldName,
    });
  }
}

/**
 * Validate string length is within allowed range
 *
 * Used for username, deck names, chat messages, etc.
 *
 * @param value - String to validate
 * @param min - Minimum length (default: 1)
 * @param max - Maximum length (default: 1000)
 * @param fieldName - Name of field for error messages (default: "Text")
 * @throws VALIDATION_INVALID_INPUT if length out of range
 *
 * @example
 * validateStringLength("Hello", 1, 50, "Username") // Valid
 * validateStringLength("", 1, 50, "Username") // Throws: too short
 * validateStringLength(longText, 1, 50, "Username") // Throws: too long
 */
export function validateStringLength(value: string, min = 1, max = 1000, fieldName = "Text") {
  const trimmed = value.trim();

  if (trimmed.length < min) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} must be at least ${min} ${min === 1 ? "character" : "characters"}`,
      value: trimmed,
      min,
      field: fieldName,
    });
  }

  if (trimmed.length > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} cannot exceed ${max} characters`,
      value: `${trimmed.substring(0, 20)}...`,
      max,
      field: fieldName,
    });
  }
}

/**
 * Validate array has items within allowed range
 *
 * @param array - Array to validate
 * @param min - Minimum length (default: 1)
 * @param max - Maximum length (default: Infinity)
 * @param fieldName - Name of field for error messages (default: "Array")
 * @throws VALIDATION_INVALID_INPUT if array length out of range
 *
 * @example
 * validateArrayLength([1, 2, 3], 1, 5, "Cards") // Valid
 * validateArrayLength([], 1, 5, "Cards") // Throws: empty array
 */
export function validateArrayLength<T>(
  array: T[],
  min = 1,
  max: number = Number.POSITIVE_INFINITY,
  fieldName = "Array"
) {
  if (array.length < min) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} must contain at least ${min} ${min === 1 ? "item" : "items"}`,
      currentLength: array.length,
      min,
      field: fieldName,
    });
  }

  if (array.length > max) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} cannot contain more than ${max} items`,
      currentLength: array.length,
      max,
      field: fieldName,
    });
  }
}

/**
 * Validate value is positive number
 *
 * @param value - Number to validate
 * @param fieldName - Name of field for error messages (default: "Value")
 * @throws VALIDATION_INVALID_INPUT if value is not positive
 *
 * @example
 * validatePositive(100, "Price") // Valid
 * validatePositive(0, "Price") // Throws: Price must be positive
 * validatePositive(-10, "Price") // Throws: Price must be positive
 */
export function validatePositive(value: number, fieldName = "Value") {
  if (value <= 0) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} must be positive`,
      value,
      field: fieldName,
    });
  }
}

/**
 * Validate value is non-negative number
 *
 * @param value - Number to validate
 * @param fieldName - Name of field for error messages (default: "Value")
 * @throws VALIDATION_INVALID_INPUT if value is negative
 *
 * @example
 * validateNonNegative(0, "Quantity") // Valid
 * validateNonNegative(5, "Quantity") // Valid
 * validateNonNegative(-1, "Quantity") // Throws: Quantity cannot be negative
 */
export function validateNonNegative(value: number, fieldName = "Value") {
  if (value < 0) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `${fieldName} cannot be negative`,
      value,
      field: fieldName,
    });
  }
}
