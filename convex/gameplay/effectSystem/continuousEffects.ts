/**
 * Continuous Effect Evaluation
 *
 * Handles dynamic evaluation of continuous effects from field spells and continuous traps.
 * These effects modify stats based on conditions (card type, archetype, etc.)
 *
 * Supports both legacy string conditions and new JSON conditions.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { getCardAbility } from "../../lib/abilityHelpers";
import {
  type CardOnBoard,
  type ConditionContext,
  type FieldCountCondition,
  type GraveyardCondition,
  type JsonCondition,
  type NumericRange,
  isCompoundCondition,
  isJsonCondition,
  isNumericRange,
} from "./jsonEffectSchema";

// ============================================================================
// MAIN API FUNCTIONS
// ============================================================================

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
  if (fieldSpell?.isActive) {
    const fieldCard = await ctx.db.get(fieldSpell.cardId);
    const parsedAbility = getCardAbility(fieldCard);
    if (parsedAbility) {
      for (const effect of parsedAbility.effects) {
        if (effect.continuous) {
          if (matchesCondition(card, effect.condition)) {
            if (effect.type === "modifyATK") {
              atkBonus += effect.value || 0;
            } else if (effect.type === "modifyDEF") {
              defBonus += effect.value || 0;
            }
          }
        }
      }
    }
  }

  // Check opponent's field spell (some field spells affect opponent's monsters)
  const opponentFieldSpell = isHost ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
  if (opponentFieldSpell?.isActive) {
    const fieldCard = await ctx.db.get(opponentFieldSpell.cardId);
    const parsedAbility = getCardAbility(fieldCard);
    if (parsedAbility) {
      for (const effect of parsedAbility.effects) {
        if (effect.continuous) {
          // Check if it affects opponent's monsters
          if (effect.condition?.includes("opponent_monsters")) {
            if (effect.type === "modifyATK") {
              atkBonus += effect.value || 0;
            } else if (effect.type === "modifyDEF") {
              defBonus += effect.value || 0;
            }
          }
        }
      }
    }
  }

  // Check continuous spells/traps (only affect owner's side unless specified)
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

  // Batch fetch all face-up backrow cards
  const faceUpBackrowCards = backrow.filter((bc) => bc && !bc.isFaceDown);
  const backrowCardDefs = await Promise.all(faceUpBackrowCards.map((bc) => ctx.db.get(bc.cardId)));
  const backrowCardMap = new Map(
    backrowCardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  for (const backrowCard of faceUpBackrowCards) {
    const backrowCardDef = backrowCardMap.get(backrowCard.cardId);
    // Check both continuous spells and continuous traps
    if (
      backrowCardDef &&
      ((backrowCardDef.cardType === "spell" && backrowCardDef.spellType === "continuous") ||
        (backrowCardDef.cardType === "trap" && backrowCardDef.trapType === "continuous"))
    ) {
      const parsedAbility = getCardAbility(backrowCardDef);
      if (parsedAbility) {
        for (const effect of parsedAbility.effects) {
          if (effect.continuous) {
            if (matchesCondition(card, effect.condition)) {
              if (effect.type === "modifyATK") {
                atkBonus += effect.value || 0;
              } else if (effect.type === "modifyDEF") {
                defBonus += effect.value || 0;
              }
            }
          }
        }
      }
    }
  }

  return { atkBonus, defBonus };
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
    source: "field_spell" | "continuous_spell" | "continuous_trap";
  }>
> {
  const effects: Array<{
    cardName: string;
    effect: string;
    source: "field_spell" | "continuous_spell" | "continuous_trap";
  }> = [];

  // Check field spell
  const fieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (fieldSpell?.isActive) {
    const fieldCard = await ctx.db.get(fieldSpell.cardId);
    const parsedAbility = getCardAbility(fieldCard);
    if (parsedAbility && fieldCard) {
      const hasContinuousEffect = parsedAbility.effects.some((effect) => effect.continuous);
      if (hasContinuousEffect) {
        effects.push({
          cardName: fieldCard.name,
          effect: fieldCard.ability?.name || "Continuous effect",
          source: "field_spell",
        });
      }
    }
  }

  // Check continuous spells/traps
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

  // Batch fetch all face-up backrow cards
  const faceUpBackrowCards = backrow.filter((bc) => bc && !bc.isFaceDown);
  const backrowCardDefs = await Promise.all(faceUpBackrowCards.map((bc) => ctx.db.get(bc.cardId)));
  const backrowCardMap = new Map(
    backrowCardDefs.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  for (const backrowCard of faceUpBackrowCards) {
    const backrowCardDef = backrowCardMap.get(backrowCard.cardId);
    if (
      backrowCardDef &&
      ((backrowCardDef.cardType === "spell" && backrowCardDef.spellType === "continuous") ||
        (backrowCardDef.cardType === "trap" && backrowCardDef.trapType === "continuous"))
    ) {
      const parsedAbility = getCardAbility(backrowCardDef);
      if (parsedAbility) {
        const hasContinuousEffect = parsedAbility.effects.some((effect) => effect.continuous);
        if (hasContinuousEffect) {
          effects.push({
            cardName: backrowCardDef.name,
            effect: backrowCardDef.ability?.name || "Continuous effect",
            source: backrowCardDef.cardType === "spell" ? "continuous_spell" : "continuous_trap",
          });
        }
      }
    }
  }

  return effects;
}

// ============================================================================
// JSON CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a JSON condition against a context
 *
 * This is the main entry point for JSON condition evaluation.
 * Handles compound conditions (and/or/not) and simple conditions.
 */
export function evaluateJsonCondition(
  condition: JsonCondition,
  context: ConditionContext
): boolean {
  // Handle null/undefined condition - always true
  if (!condition) {
    return true;
  }

  // Handle compound conditions
  if (isCompoundCondition(condition)) {
    return evaluateCompoundCondition(condition, context);
  }

  // Handle simple conditions
  return evaluateSimpleCondition(condition, context);
}

/**
 * Evaluate a compound condition (and/or/not)
 */
function evaluateCompoundCondition(condition: JsonCondition, context: ConditionContext): boolean {
  const nestedConditions = condition.conditions || [];

  switch (condition.type) {
    case "and":
      // All conditions must be true
      return nestedConditions.every((c) => evaluateJsonCondition(c, context));

    case "or":
      // At least one condition must be true
      return nestedConditions.some((c) => evaluateJsonCondition(c, context));

    case "not": {
      // Negate the first condition
      if (nestedConditions.length === 0) return true;
      const firstCondition = nestedConditions[0];
      if (!firstCondition) return true;
      return !evaluateJsonCondition(firstCondition, context);
    }

    default:
      return true;
  }
}

/**
 * Evaluate a simple (non-compound) condition
 */
function evaluateSimpleCondition(condition: JsonCondition, context: ConditionContext): boolean {
  const targetCard = context.targetCard;
  const targetCardDef = context.targetCardDef;
  const gameState = context.gameState;

  // Card property conditions (require target card)
  if (targetCardDef) {
    // Archetype check
    if (condition.archetype !== undefined) {
      const cardArchetype = targetCardDef.archetype?.toLowerCase() || "";
      // Handle archetype as string or array
      const requiredArchetypes = Array.isArray(condition.archetype)
        ? condition.archetype.map((a) => a.toLowerCase())
        : [condition.archetype.toLowerCase()];

      // Check if archetype matches any required archetype or if card name contains it
      const matches = requiredArchetypes.some(
        (requiredArchetype) =>
          cardArchetype.includes(requiredArchetype) ||
          targetCardDef.name.toLowerCase().includes(requiredArchetype)
      );

      if (!matches) return false;
    }

    // Card type check
    if (condition.cardType !== undefined) {
      if (targetCardDef.cardType !== condition.cardType) {
        return false;
      }
    }

    // Level check (monsters only)
    if (condition.level !== undefined && targetCardDef.cardType === "stereotype") {
      const cardLevel = targetCardDef.cost || 0; // Level is derived from cost
      if (!evaluateNumericCondition(cardLevel, condition.level)) {
        return false;
      }
    }

    // ATK check (monsters only)
    if (condition.attack !== undefined && targetCardDef.cardType === "stereotype") {
      const cardAtk = targetCardDef.attack || 0;
      if (!evaluateNumericCondition(cardAtk, condition.attack)) {
        return false;
      }
    }

    // DEF check (monsters only)
    if (condition.defense !== undefined && targetCardDef.cardType === "stereotype") {
      const cardDef = targetCardDef.defense || 0;
      if (!evaluateNumericCondition(cardDef, condition.defense)) {
        return false;
      }
    }

    // Cost check
    if (condition.cost !== undefined) {
      const cardCost = targetCardDef.cost || 0;
      if (!evaluateNumericCondition(cardCost, condition.cost)) {
        return false;
      }
    }

    // Name checks
    if (condition.nameContains !== undefined) {
      if (!targetCardDef.name.toLowerCase().includes(condition.nameContains.toLowerCase())) {
        return false;
      }
    }

    if (condition.nameEquals !== undefined) {
      if (targetCardDef.name.toLowerCase() !== condition.nameEquals.toLowerCase()) {
        return false;
      }
    }
  }

  // Board state conditions (require target card on board)
  if (targetCard) {
    // Position check
    if (condition.position !== undefined) {
      const expectedPosition = condition.position === "attack" ? 1 : -1;
      if (targetCard.position !== expectedPosition) {
        return false;
      }
    }

    // Face-down check
    if (condition.isFaceDown !== undefined) {
      if (targetCard.isFaceDown !== condition.isFaceDown) {
        return false;
      }
    }

    // Has attacked check
    if (condition.hasAttacked !== undefined) {
      if (targetCard.hasAttacked !== condition.hasAttacked) {
        return false;
      }
    }

    // Protection checks
    if (condition.canBeTargeted !== undefined) {
      const canTarget = !targetCard.cannotBeTargeted;
      if (canTarget !== condition.canBeTargeted) {
        return false;
      }
    }

    if (condition.canBeDestroyedByBattle !== undefined) {
      const canDestroy = !targetCard.cannotBeDestroyedByBattle;
      if (canDestroy !== condition.canBeDestroyedByBattle) {
        return false;
      }
    }

    if (condition.canBeDestroyedByEffects !== undefined) {
      const canDestroy = !targetCard.cannotBeDestroyedByEffects;
      if (canDestroy !== condition.canBeDestroyedByEffects) {
        return false;
      }
    }
  }

  // Ownership check
  if (condition.owner !== undefined) {
    const isTargetHost = isCardOwnedByHost(targetCard, gameState);
    const playerIsHost = context.playerIs === "host";

    if (condition.owner === "self" && isTargetHost !== playerIsHost) {
      return false;
    }
    if (condition.owner === "opponent" && isTargetHost === playerIsHost) {
      return false;
    }
  }

  // Player LP conditions
  const playerLP =
    context.playerIs === "host" ? gameState.hostLifePoints : gameState.opponentLifePoints;

  if (condition.lpBelow !== undefined) {
    if (playerLP >= condition.lpBelow) {
      return false;
    }
  }

  if (condition.lpAbove !== undefined) {
    if (playerLP <= condition.lpAbove) {
      return false;
    }
  }

  if (condition.lpEqual !== undefined) {
    if (playerLP !== condition.lpEqual) {
      return false;
    }
  }

  // Game state conditions
  if (condition.turnNumber !== undefined) {
    if (!evaluateNumericCondition(gameState.turnNumber, condition.turnNumber)) {
      return false;
    }
  }

  if (condition.phase !== undefined) {
    if (gameState.currentPhase !== condition.phase) {
      return false;
    }
  }

  // Field count condition
  if (condition.fieldCount !== undefined) {
    if (!evaluateFieldCount(condition.fieldCount, context)) {
      return false;
    }
  }

  // Graveyard condition
  if (condition.graveyardContains !== undefined) {
    if (!evaluateGraveyardContains(condition.graveyardContains, context)) {
      return false;
    }
  }

  // All checks passed
  return true;
}

// ============================================================================
// HELPER EVALUATION FUNCTIONS
// ============================================================================

/**
 * Evaluate a numeric condition (exact value or range)
 */
function evaluateNumericCondition(value: number, condition: number | NumericRange): boolean {
  if (isNumericRange(condition)) {
    const { min, max } = condition;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

  // Exact value comparison
  return value === condition;
}

/**
 * Evaluate a field count condition
 */
export function evaluateFieldCount(
  condition: FieldCountCondition,
  context: ConditionContext
): boolean {
  const { gameState, playerIs } = context;
  const isHost = playerIs === "host";

  // Determine which boards to check
  const boardsToCheck: Array<{ board: CardOnBoard[]; isHostBoard: boolean }> = [];

  if (condition.owner === "self" || condition.owner === "both") {
    boardsToCheck.push({
      board: isHost ? gameState.hostBoard : gameState.opponentBoard,
      isHostBoard: isHost,
    });
  }

  if (condition.owner === "opponent" || condition.owner === "both") {
    boardsToCheck.push({
      board: isHost ? gameState.opponentBoard : gameState.hostBoard,
      isHostBoard: !isHost,
    });
  }

  // Count matching cards
  let count = 0;

  for (const { board } of boardsToCheck) {
    for (const card of board) {
      if (matchesFieldCountFilter(card, condition)) {
        count++;
      }
    }
  }

  // Also check spell/trap zones if requested
  if (condition.zone === "spell_trap" || condition.zone === "all") {
    const spellTrapZonesToCheck: CardOnBoard[][] = [];

    if (condition.owner === "self" || condition.owner === "both") {
      // Map spell/trap zone cards to CardOnBoard format
      const selfZone = (isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone).map(
        (st) => ({
          cardId: st.cardId,
          position: 1,
          attack: 0,
          defense: 0,
          hasAttacked: false,
          isFaceDown: st.isFaceDown,
        })
      );
      spellTrapZonesToCheck.push(selfZone);
    }

    if (condition.owner === "opponent" || condition.owner === "both") {
      const oppZone = (isHost ? gameState.opponentSpellTrapZone : gameState.hostSpellTrapZone).map(
        (st) => ({
          cardId: st.cardId,
          position: 1,
          attack: 0,
          defense: 0,
          hasAttacked: false,
          isFaceDown: st.isFaceDown,
        })
      );
      spellTrapZonesToCheck.push(oppZone);
    }

    for (const zone of spellTrapZonesToCheck) {
      for (const card of zone) {
        if (matchesFieldCountFilter(card, condition)) {
          count++;
        }
      }
    }
  }

  // Evaluate count against condition
  return evaluateNumericCondition(count, condition.count);
}

/**
 * Check if a card matches the field count filter
 */
function matchesFieldCountFilter(card: CardOnBoard, condition: FieldCountCondition): boolean {
  const filter = condition.filter;
  if (!filter) return true;

  // Position filter
  if (filter.position !== undefined) {
    const expectedPosition = filter.position === "attack" ? 1 : -1;
    if (card.position !== expectedPosition) return false;
  }

  // Face-down filter
  if (filter.isFaceDown !== undefined) {
    if (card.isFaceDown !== filter.isFaceDown) return false;
  }

  // Card type, archetype, and attribute filters would require DB lookup
  // For performance, these are handled at a higher level with card definitions cache

  return true;
}

/**
 * Evaluate a graveyard contains condition
 */
export function evaluateGraveyardContains(
  condition: GraveyardCondition,
  context: ConditionContext
): boolean {
  const { gameState, playerIs, cardDefsCache } = context;
  const isHost = playerIs === "host";

  // Determine which graveyards to check
  const graveyardsToCheck: Id<"cardDefinitions">[][] = [];

  if (condition.owner === "self" || condition.owner === "both") {
    graveyardsToCheck.push(isHost ? gameState.hostGraveyard : gameState.opponentGraveyard);
  }

  if (condition.owner === "opponent" || condition.owner === "both") {
    graveyardsToCheck.push(isHost ? gameState.opponentGraveyard : gameState.hostGraveyard);
  }

  // Count matching cards in graveyards
  let matchCount = 0;

  for (const graveyard of graveyardsToCheck) {
    for (const cardId of graveyard) {
      // Use cache if available
      const cardDef = cardDefsCache?.get(cardId.toString());

      if (condition.contains) {
        // Check card type filter
        if (condition.contains.cardType && cardDef) {
          if (cardDef.cardType !== condition.contains.cardType) {
            continue;
          }
        }

        // Check archetype filter
        if (condition.contains.archetype && cardDef) {
          const archetype = cardDef.archetype?.toLowerCase() || "";
          // Handle archetype as string or array
          const requiredArchetypes = Array.isArray(condition.contains.archetype)
            ? condition.contains.archetype.map((a) => a.toLowerCase())
            : [condition.contains.archetype.toLowerCase()];
          if (!requiredArchetypes.some((req) => archetype.includes(req))) {
            continue;
          }
        }

        matchCount++;
      } else {
        // No filter - just count total cards
        matchCount++;
      }
    }
  }

  // Check count condition (count is on GraveyardCondition, not contains)
  if (condition.count !== undefined) {
    return evaluateNumericCondition(matchCount, condition.count);
  }

  // No count specified - just check if any match
  return matchCount > 0;
}

/**
 * Evaluate card attribute condition
 */
export function evaluateAttribute(
  cardArchetype: string | undefined,
  requiredAttribute: string
): boolean {
  if (!cardArchetype) return false;

  // Map archetypes to attributes (elements)
  // In this game, archetype often correlates with element
  const archetypeToAttribute: Record<string, string> = {
    dropout: "red",
    prep: "blue",
    geek: "yellow",
    freak: "purple",
    nerd: "green",
    goodie_two_shoes: "white",
  };

  const attribute = archetypeToAttribute[cardArchetype.toLowerCase()];
  return attribute === requiredAttribute.toLowerCase();
}

/**
 * Evaluate card type condition
 */
export function evaluateCardType(
  cardType: string | undefined,
  requiredType: "stereotype" | "spell" | "trap" | "class"
): boolean {
  if (!cardType) return false;
  return cardType === requiredType;
}

/**
 * Check if a card is owned by the host player
 */
function isCardOwnedByHost(card: CardOnBoard | undefined, gameState: Doc<"gameStates">): boolean {
  if (!card) return false;

  // Check if card is on host's board
  const onHostBoard = gameState.hostBoard.some((c) => c.cardId === card.cardId);
  if (onHostBoard) return true;

  // Check if card is in host's spell/trap zone
  const inHostSpellTrap = gameState.hostSpellTrapZone.some((c) => c.cardId === card.cardId);
  if (inHostSpellTrap) return true;

  // Check field spell
  if (gameState.hostFieldSpell?.cardId === card.cardId) return true;

  return false;
}

// ============================================================================
// LEGACY CONDITION MATCHING (BACKWARDS COMPATIBILITY)
// ============================================================================

/**
 * Check if a card matches a continuous effect condition
 *
 * Supports both legacy string conditions and new JSON conditions.
 *
 * Legacy conditions can be:
 * - archetype name (e.g., "Warrior_monsters", "Dragon_monsters")
 * - "all_monsters"
 * - "opponent_monsters"
 * - card type (e.g., "DARK_monsters", "Fiend_monsters")
 * - level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
 * - ATK/DEF thresholds (e.g., "atk_1500_or_less", "def_2000_or_more")
 */
function matchesCondition(
  card: Doc<"cardDefinitions">,
  condition?: string | JsonCondition
): boolean {
  if (!condition) return true; // No condition = affects all

  // Only affect monsters (continuous stat modifiers don't apply to spells/traps)
  if (card.cardType !== "stereotype") return false;

  // Check if it's a JSON condition (object) or string condition (legacy)
  if (isJsonCondition(condition)) {
    // Create a minimal context for evaluation
    const context: ConditionContext = {
      gameState: {} as Doc<"gameStates">, // Not needed for simple card checks
      sourceCard: {} as CardOnBoard, // Not needed
      targetCardDef: card,
      playerIs: "host", // Default
    };

    return evaluateJsonCondition(condition, context);
  }

  // Legacy string condition handling
  return matchesLegacyCondition(card, condition);
}

/**
 * Match against legacy string conditions
 *
 * Kept for backwards compatibility with existing card definitions.
 */
function matchesLegacyCondition(card: Doc<"cardDefinitions">, condition: string): boolean {
  // "all_monsters" or no specific condition
  if (condition === "all_monsters" || condition === "") return true;

  // Level conditions (e.g., "level_4_or_lower", "level_7_or_higher")
  const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
  if (levelMatch?.[1] && levelMatch[2]) {
    const threshold = Number.parseInt(levelMatch[1]);
    const comparison = levelMatch[2].toLowerCase();
    const cardLevel = card.cost || 0; // Level is derived from cost

    if (comparison === "lower") {
      return cardLevel <= threshold;
    }
    if (comparison === "higher") {
      return cardLevel >= threshold;
    }
  }

  // ATK threshold conditions (e.g., "atk_1500_or_less", "atk_2000_or_more")
  const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
  if (atkMatch?.[1] && atkMatch[2]) {
    const threshold = Number.parseInt(atkMatch[1]);
    const comparison = atkMatch[2].toLowerCase();
    const cardAtk = card.attack || 0;

    if (comparison === "less") {
      return cardAtk <= threshold;
    }
    if (comparison === "more") {
      return cardAtk >= threshold;
    }
  }

  // DEF threshold conditions (e.g., "def_1500_or_less", "def_2000_or_more")
  const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
  if (defMatch?.[1] && defMatch[2]) {
    const threshold = Number.parseInt(defMatch[1]);
    const comparison = defMatch[2].toLowerCase();
    const cardDef = card.defense || 0;

    if (comparison === "less") {
      return cardDef <= threshold;
    }
    if (comparison === "more") {
      return cardDef >= threshold;
    }
  }

  // Extract archetype from condition (e.g., "Warrior_monsters" → "warrior")
  const archetypeMatch = condition.match(/^(.+)_monsters$/i);
  if (archetypeMatch?.[1]) {
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

// ============================================================================
// SYNCHRONOUS CONTINUOUS MODIFIERS (For UI/Display)
// ============================================================================

/**
 * Calculate continuous modifiers synchronously using pre-loaded card data
 *
 * This is useful for UI rendering where async operations aren't ideal.
 * Requires all card definitions to be pre-loaded into the cache.
 */
export function calculateContinuousModifiersSync(
  gameState: Doc<"gameStates">,
  cardOnBoard: CardOnBoard,
  cardDef: Doc<"cardDefinitions">,
  cardDefsCache: Map<string, Doc<"cardDefinitions">>,
  options?: { includeFieldSpells?: boolean }
): { atkBonus: number; defBonus: number } {
  let atkBonus = 0;
  let defBonus = 0;

  const includeFieldSpells = options?.includeFieldSpells ?? true;

  // Determine which player owns this card
  const isHostCard = gameState.hostBoard.some((c) => c.cardId === cardOnBoard.cardId);

  // Check field spells if enabled
  if (includeFieldSpells) {
    // Check own field spell
    const ownFieldSpell = isHostCard ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
    if (ownFieldSpell?.isActive) {
      const fieldCardDef = cardDefsCache.get(ownFieldSpell.cardId.toString());
      const parsedAbility = getCardAbility(fieldCardDef);
      if (parsedAbility) {
        for (const effect of parsedAbility.effects) {
          if (effect.continuous && matchesCondition(cardDef, effect.condition)) {
            if (effect.type === "modifyATK") {
              atkBonus += effect.value || 0;
            } else if (effect.type === "modifyDEF") {
              defBonus += effect.value || 0;
            }
          }
        }
      }
    }

    // Check opponent's field spell (for effects that affect opponent's monsters)
    const oppFieldSpell = isHostCard ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
    if (oppFieldSpell?.isActive) {
      const fieldCardDef = cardDefsCache.get(oppFieldSpell.cardId.toString());
      const parsedAbility = getCardAbility(fieldCardDef);
      if (parsedAbility) {
        for (const effect of parsedAbility.effects) {
          if (effect.continuous && effect.condition?.includes("opponent_monsters")) {
            if (effect.type === "modifyATK") {
              atkBonus += effect.value || 0;
            } else if (effect.type === "modifyDEF") {
              defBonus += effect.value || 0;
            }
          }
        }
      }
    }
  }

  // Check continuous traps from own side
  const backrow = isHostCard ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;

  for (const backrowCard of backrow) {
    if (backrowCard && !backrowCard.isFaceDown) {
      const backrowCardDef = cardDefsCache.get(backrowCard.cardId.toString());
      if (backrowCardDef?.cardType === "trap") {
        const parsedAbility = getCardAbility(backrowCardDef);
        if (parsedAbility) {
          for (const effect of parsedAbility.effects) {
            if (effect.continuous && matchesCondition(cardDef, effect.condition)) {
              if (effect.type === "modifyATK") {
                atkBonus += effect.value || 0;
              } else if (effect.type === "modifyDEF") {
                defBonus += effect.value || 0;
              }
            }
          }
        }
      }
    }
  }

  return { atkBonus, defBonus };
}

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export { matchesCondition as _matchesCondition, matchesLegacyCondition as _matchesLegacyCondition };
