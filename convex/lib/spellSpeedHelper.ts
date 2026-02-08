/**
 * Spell Speed Helper
 *
 * Derives spell speed from card type and JSON ability structure.
 *
 * Yu-Gi-Oh Spell Speed Rules:
 * - Spell Speed 1: Normal Spell, Field Spell, Continuous Spell, Equip Spell, creature effects (ignition)
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
 * - Speed 1: Normal Spells, Field Spells, Continuous Spells, Equip Spells, Monster effects
 * - Speed 2: Quick-Play Spells, Normal Traps, Continuous Traps
 * - Speed 3: Counter Traps
 *
 * @param card - Card definition
 * @returns Spell speed (1, 2, or 3)
 * @example
 * getSpellSpeed(darkHole) // 1 (Normal Spell)
 * getSpellSpeed(mysticalSpaceTyphoon) // 2 (Quick-Play Spell)
 * getSpellSpeed(solemJudgment) // 3 (Counter Trap)
 */
export function getSpellSpeed(card: Doc<"cardDefinitions">): 1 | 2 | 3 {
  const cardType = card.cardType;
  const ability = card.ability;

  // If ability has explicit spellSpeed, use it
  if (ability?.spellSpeed) {
    return ability.spellSpeed;
  }

  // Creatures (monsters): Spell Speed 1
  if (cardType === "creature") {
    return 1;
  }

  // Equipment: Spell Speed 1
  if (cardType === "equipment") {
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
