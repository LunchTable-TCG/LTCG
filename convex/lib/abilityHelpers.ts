/**
 * Ability Helpers
 *
 * Utility functions for working with card abilities in JSON format.
 */

import type { Doc } from "../_generated/dataModel";
import { isJsonAbility, parseJsonAbility } from "../gameplay/effectSystem/jsonParser";
import type { JsonAbility, ParsedAbility } from "../gameplay/effectSystem/types";

/**
 * Get the ability from a card definition.
 * Returns ParsedAbility or null.
 *
 * @param card - The card definition document
 * @returns ParsedAbility compatible with the effect executor, or null if no ability
 *
 * @example
 * ```typescript
 * const card = await ctx.db.get(cardId);
 * const ability = getCardAbility(card);
 * if (ability && ability.effects.length > 0) {
 *   // Process effects
 * }
 * ```
 */
export function getCardAbility(
  card: Doc<"cardDefinitions"> | null | undefined
): ParsedAbility | null {
  if (!card?.ability) {
    return null;
  }

  // The ability field is already validated by the schema,
  // but we still use isJsonAbility for type narrowing
  if (isJsonAbility(card.ability)) {
    return parseJsonAbility(card.ability);
  }

  return null;
}

/**
 * Check if card has an ability defined
 *
 * @param card - The card definition document
 * @returns true if the card has an ability defined
 *
 * @example
 * ```typescript
 * const card = await ctx.db.get(cardId);
 * if (hasAbility(card)) {
 *   // Card has an ability to process
 * }
 * ```
 */
export function hasAbility(card: Doc<"cardDefinitions"> | null | undefined): boolean {
  if (!card) return false;
  return !!card.ability;
}

/**
 * Get the raw JSON ability from a card, if it exists
 *
 * @param card - The card definition document
 * @returns The raw JSON ability object or null
 */
export function getRawJsonAbility(
  card: Doc<"cardDefinitions"> | null | undefined
): JsonAbility | null {
  if (!card) return null;
  return card.ability ?? null;
}

/**
 * Get the first effect from a card's ability
 *
 * Convenience function for cards with single effects.
 * Returns null if the card has no ability or no effects.
 *
 * @param card - Card definition document from the database
 * @returns First ParsedEffect or null
 */
export function getCardFirstEffect(card: Doc<"cardDefinitions"> | null | undefined) {
  const ability = getCardAbility(card);
  if (!ability || ability.effects.length === 0) {
    return null;
  }
  return ability.effects[0] ?? null;
}
