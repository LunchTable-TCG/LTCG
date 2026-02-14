/**
 * Spell Speed Helper
 *
 * Derives spell speed from card type and JSON ability structure.
 *
 * Spell Speed Rules:
 * - Spell Speed 1: Normal Spell, Field Spell, Continuous Spell, Stereotypes, Classes
 * - Spell Speed 2: Quick-Play Spell, Normal Trap, Continuous Trap
 * - Spell Speed 3: Counter Trap
 */

import type { Doc } from "../_generated/dataModel";

/**
 * Get spell speed for a card
 *
 * Determines spell speed based on card type and JSON ability structure.
 * Used for chain resolution and response validation.
 *
 * Spell Speed Rules:
 * - Speed 1: Normal Spells, Field Spells, Continuous Spells, Stereotypes, Classes
 * - Speed 2: Quick-Play Spells, Normal Traps, Continuous Traps
 * - Speed 3: Counter Traps
 *
 * @param card - Card definition
 * @returns Spell speed (1, 2, or 3)
 */
export function getSpellSpeed(card: Doc<"cardDefinitions">): 1 | 2 | 3 {
  const cardType = card.cardType;
  const ability = card.ability;

  // If ability has explicit spellSpeed, use it
  if (ability?.spellSpeed) {
    return ability.spellSpeed;
  }

  // Stereotypes: Spell Speed 1
  if (cardType === "stereotype") {
    return 1;
  }

  // Classes: Spell Speed 1
  if (cardType === "class") {
    return 1;
  }

  // Spells
  if (cardType === "spell") {
    // Quick-Play Spell: Spell Speed 2
    // Detect by ability trigger being "quick" or having response triggers
    if (ability) {
      const trigger = ability.trigger;
      if (
        trigger === "quick" ||
        trigger === "on_opponent_summon" ||
        trigger === "on_opponent_attacks" ||
        trigger === "on_opponent_activates"
      ) {
        return 2;
      }
    }

    // Normal Spell: Spell Speed 1
    return 1;
  }

  // Traps
  if (cardType === "trap") {
    // Counter Trap: Spell Speed 3
    // Detect by trapType field or ability having negateActivation effect type
    if (card.trapType === "counter") {
      return 3;
    }

    if (ability) {
      const hasNegateActivationEffect = ability.effects?.some(
        (effect: { type?: string; effectType?: string }) =>
          effect.type === "negateActivation" ||
          effect.effectType === "negateActivation" ||
          effect.type === "negate" ||
          effect.effectType === "negate"
      );
      if (hasNegateActivationEffect) {
        return 3;
      }
    }

    // Normal/Continuous Trap: Spell Speed 2
    return 2;
  }

  // Default: Spell Speed 1
  return 1;
}
