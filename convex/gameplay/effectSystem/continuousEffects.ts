/**
 * Continuous Effect Evaluation
 *
 * Handles dynamic evaluation of continuous effects from field spells and continuous traps.
 * These effects modify stats based on conditions (card type, archetype, etc.)
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { parseAbility } from "./parser";

/**
 * Calculate continuous stat modifiers for a specific card
 *
 * Checks active field spells and continuous traps for stat-modifying effects
 * that apply to this card.
 */
export async function calculateContinuousModifiers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  isHost: boolean
): Promise<{ atkBonus: number; defBonus: number }> {
  let atkBonus = 0;
  let defBonus = 0;

  // Get the card being modified
  const card = await ctx.db.get(cardId);
  if (!card) return { atkBonus: 0, defBonus: 0 };

  // Check field spell (affects both players)
  const fieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (fieldSpell && fieldSpell.isActive) {
    const fieldCard = await ctx.db.get(fieldSpell.cardId);
    if (fieldCard?.ability) {
      const parsedAbility = parseAbility(fieldCard.ability);
      if (parsedAbility?.continuous) {
        if (matchesCondition(card, parsedAbility.condition)) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  // Check opponent's field spell (some field spells affect opponent's monsters)
  const opponentFieldSpell = isHost ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
  if (opponentFieldSpell && opponentFieldSpell.isActive) {
    const fieldCard = await ctx.db.get(opponentFieldSpell.cardId);
    if (fieldCard?.ability) {
      const parsedAbility = parseAbility(fieldCard.ability);
      if (parsedAbility?.continuous) {
        // Check if it affects opponent's monsters
        if (parsedAbility.condition?.includes("opponent_monsters")) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  // Check continuous traps (only affect owner's side unless specified)
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

  // Batch fetch all face-up backrow cards
  const faceUpBackrowCards = backrow.filter((bc) => bc && !bc.isFaceDown);
  const backrowCardDefs = await Promise.all(faceUpBackrowCards.map((bc) => ctx.db.get(bc.cardId)));
  const backrowCardMap = new Map(
    backrowCardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  for (const backrowCard of faceUpBackrowCards) {
    const backrowCardDef = backrowCardMap.get(backrowCard.cardId);
    if (backrowCardDef?.cardType === "trap" && backrowCardDef.ability) {
      const parsedAbility = parseAbility(backrowCardDef.ability);
      if (parsedAbility?.continuous) {
        if (matchesCondition(card, parsedAbility.condition)) {
          if (parsedAbility.type === "modifyATK") {
            atkBonus += parsedAbility.value || 0;
          } else if (parsedAbility.type === "modifyDEF") {
            defBonus += parsedAbility.value || 0;
          }
        }
      }
    }
  }

  return { atkBonus, defBonus };
}

/**
 * Check if a card matches a continuous effect condition
 *
 * Conditions can be:
 * - archetype name (e.g., "Warrior_monsters", "Dragon_monsters")
 * - "all_monsters"
 * - "opponent_monsters"
 * - card type (e.g., "DARK_monsters", "Fiend_monsters")
 * - level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
 * - ATK/DEF thresholds (e.g., "atk_1500_or_less", "def_2000_or_more")
 */
function matchesCondition(card: Doc<"cardDefinitions">, condition?: string): boolean {
  if (!condition) return true; // No condition = affects all

  // Only affect monsters (continuous stat modifiers don't apply to spells/traps)
  if (card.cardType !== "creature") return false;

  // "all_monsters" or no specific condition
  if (condition === "all_monsters" || condition === "") return true;

  // Level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
  const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
  if (levelMatch && levelMatch[1] && levelMatch[2]) {
    const threshold = Number.parseInt(levelMatch[1]);
    const comparison = levelMatch[2].toLowerCase();
    const cardLevel = card.cost || 0; // Level is derived from cost

    if (comparison === "lower") {
      return cardLevel <= threshold;
    } else if (comparison === "higher") {
      return cardLevel >= threshold;
    }
  }

  // ATK threshold conditions (e.g., "atk_1500_or_less", "atk_2000_or_more")
  const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
  if (atkMatch && atkMatch[1] && atkMatch[2]) {
    const threshold = Number.parseInt(atkMatch[1]);
    const comparison = atkMatch[2].toLowerCase();
    const cardAtk = card.attack || 0;

    if (comparison === "less") {
      return cardAtk <= threshold;
    } else if (comparison === "more") {
      return cardAtk >= threshold;
    }
  }

  // DEF threshold conditions (e.g., "def_1500_or_less", "def_2000_or_more")
  const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
  if (defMatch && defMatch[1] && defMatch[2]) {
    const threshold = Number.parseInt(defMatch[1]);
    const comparison = defMatch[2].toLowerCase();
    const cardDef = card.defense || 0;

    if (comparison === "less") {
      return cardDef <= threshold;
    } else if (comparison === "more") {
      return cardDef >= threshold;
    }
  }

  // Extract archetype from condition (e.g., "Warrior_monsters" → "warrior")
  const archetypeMatch = condition.match(/^(.+)_monsters$/i);
  if (archetypeMatch && archetypeMatch[1]) {
    const requiredArchetype = archetypeMatch[1].toLowerCase();

    // Check card's archetype field
    if (card.archetype?.toLowerCase().includes(requiredArchetype)) {
      return true;
    }

    // Check card name (some cards have archetype in name)
    if (card.name.toLowerCase().includes(requiredArchetype)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all active continuous effects on the field
 *
 * Useful for displaying to the player what effects are active.
 */
export async function getActiveContinuousEffects(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  isHost: boolean
): Promise<
  Array<{
    cardName: string;
    effect: string;
    source: "field_spell" | "continuous_trap";
  }>
> {
  const effects: Array<{
    cardName: string;
    effect: string;
    source: "field_spell" | "continuous_trap";
  }> = [];

  // Check field spell
  const fieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (fieldSpell && fieldSpell.isActive) {
    const fieldCard = await ctx.db.get(fieldSpell.cardId);
    if (fieldCard?.ability) {
      const parsedAbility = parseAbility(fieldCard.ability);
      if (parsedAbility?.continuous) {
        effects.push({
          cardName: fieldCard.name,
          effect: fieldCard.ability,
          source: "field_spell",
        });
      }
    }
  }

  // Check continuous traps
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

  // Batch fetch all face-up backrow cards
  const faceUpBackrowCards = backrow.filter((bc) => bc && !bc.isFaceDown);
  const backrowCardDefs = await Promise.all(faceUpBackrowCards.map((bc) => ctx.db.get(bc.cardId)));
  const backrowCardMap = new Map(
    backrowCardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  for (const backrowCard of faceUpBackrowCards) {
    const backrowCardDef = backrowCardMap.get(backrowCard.cardId);
    if (backrowCardDef?.cardType === "trap" && backrowCardDef.ability) {
      const parsedAbility = parseAbility(backrowCardDef.ability);
      if (parsedAbility?.continuous) {
        effects.push({
          cardName: backrowCardDef.name,
          effect: backrowCardDef.ability,
          source: "continuous_trap",
        });
      }
    }
  }

  return effects;
}
