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
    // Detect by ability having negate effect type or explicit spellSpeed 3
    if (ability) {
      const hasNegateEffect = ability.effects?.some(
        (effect: { type?: string; effectType?: string }) =>
          effect.type === "negate" || effect.effectType === "negate"
      );
      if (hasNegateEffect) {
        return 3;
      }
    }

    // Normal/Continuous Trap: Spell Speed 2
    return 2;
  }

  // Default: Spell Speed 1
  return 1;
}

/**
 * Check if a spell/trap can be activated during opponent's turn
 *
 * Rules:
 * - All Traps (Speed 2/3) can activate on opponent's turn
 * - Quick-Play Spells (Speed 2) can activate on opponent's turn IF set
 * - Normal Spells (Speed 1) cannot activate on opponent's turn
 *
 * @param card - Card definition
 * @returns True if can be activated on opponent's turn
 * @example
 * canActivateOnOpponentTurn(mirrorForce) // true (Trap)
 * canActivateOnOpponentTurn(mysticalSpaceTyphoon) // true (Quick-Play)
 * canActivateOnOpponentTurn(darkHole) // false (Normal Spell)
 */
export function canActivateOnOpponentTurn(card: Doc<"cardDefinitions">) {
  const cardType = card.cardType;
  const spellSpeed = getSpellSpeed(card);

  // Traps (Speed 2/3) can always be activated on opponent's turn
  if (cardType === "trap") {
    return true;
  }

  // Quick-Play Spells (Speed 2) can be activated on opponent's turn IF set
  if (cardType === "spell" && spellSpeed === 2) {
    return true;
  }

  // Normal Spells (Speed 1) cannot be activated on opponent's turn
  return false;
}

/**
 * Validate if a card can be chained to another card
 *
 * Chain Rule: Can only chain equal or higher spell speed
 * - Speed 1 can chain to Speed 1
 * - Speed 2 can chain to Speed 1 or 2
 * - Speed 3 can chain to Speed 1, 2, or 3
 *
 * @param chainCard - Card being added to chain
 * @param lastChainCard - Last card in current chain
 * @returns True if chain is valid
 * @example
 * canChainTo(solemJudgment, mysticalSpaceTyphoon) // true (Speed 3 → Speed 2)
 * canChainTo(darkHole, mirrorForce) // false (Speed 1 cannot chain to Speed 2)
 * canChainTo(mirrorForce, mysticalSpaceTyphoon) // true (Speed 2 → Speed 2)
 */
export function canChainTo(
  chainCard: Doc<"cardDefinitions">,
  lastChainCard: Doc<"cardDefinitions">
) {
  const chainSpeed = getSpellSpeed(chainCard);
  const lastSpeed = getSpellSpeed(lastChainCard);

  // Rule: Can only chain equal or higher spell speed
  // Speed 1 can chain to Speed 1
  // Speed 2 can chain to Speed 1 or 2
  // Speed 3 can chain to Speed 1, 2, or 3
  return chainSpeed >= lastSpeed;
}
