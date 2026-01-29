/**
 * JSON Effect Parser
 *
 * Converts JSON ability definitions to the existing ParsedEffect format.
 * This enables a structured, type-safe approach to defining card abilities
 * while maintaining compatibility with the existing effect execution system.
 *
 * The parser handles:
 * - Converting JsonAbility to ParsedAbility format
 * - Evaluating conditions at runtime
 * - Flattening effect chains for sequential execution
 * - Converting JSON costs to existing cost format
 */

import type { Doc } from "../../_generated/dataModel";
import type {
  JsonAbility,
  JsonCondition,
  JsonEffect,
  JsonCost,
  NumericRange,
  ParsedAbility,
  ParsedEffect,
  ZoneLocation,
  TargetOwner,
} from "./types";
import type { ConditionContext } from "./jsonEffectSchema";
import {
  isNumericRange,
} from "./jsonEffectSchema";
import { logger } from "../../lib/debug";

// ============================================================================
// MAIN PARSER FUNCTIONS
// ============================================================================

/**
 * Parse a JSON ability definition into ParsedAbility format
 *
 * This is the main entry point for converting JSON abilities.
 *
 * @param ability - The JSON ability definition
 * @returns ParsedAbility compatible with existing effect executors
 */
export function parseJsonAbility(ability: JsonAbility): ParsedAbility {
  const effects: ParsedEffect[] = [];

  // Process each effect in the ability
  for (const jsonEffect of ability.effects) {
    const parsedEffect = parseJsonEffect(jsonEffect, ability.spellSpeed);
    effects.push(parsedEffect);

    // Handle chained "then" effects
    if (jsonEffect.then) {
      const thenEffect = parseJsonEffect(jsonEffect.then, ability.spellSpeed);
      effects.push(thenEffect);
    }
  }

  return {
    effects,
    hasMultiPart: effects.length > 1,
  };
}

/**
 * Parse a single JSON effect into ParsedEffect format
 *
 * @param effect - The JSON effect definition
 * @param spellSpeed - Optional spell speed from parent ability
 * @returns ParsedEffect compatible with existing executors
 */
export function parseJsonEffect(effect: JsonEffect, _spellSpeed?: 1 | 2 | 3): ParsedEffect {
  // Note: spellSpeed is available for future use when spell speed validation is added
  const baseEffect: ParsedEffect = {
    type: effect.type,
    trigger: effect.trigger,
    value: effect.value,
    isOPT: effect.isOPT,
    continuous: effect.isContinuous,
  };

  // Convert cost if present
  if (effect.cost) {
    baseEffect.cost = convertJsonCost(effect.cost);
  }

  // Convert protection if present
  if (effect.protection) {
    baseEffect.protection = {
      cannotBeDestroyedByBattle: effect.protection.cannotBeDestroyedByBattle,
      cannotBeDestroyedByEffects: effect.protection.cannotBeDestroyedByEffects,
      cannotBeTargeted: effect.protection.cannotBeTargeted,
    };
  }

  // Convert targeting information
  if (effect.target) {
    const target = effect.target;
    baseEffect.targetCount = typeof target.count === "number" ? target.count : 1;
    baseEffect.targetLocation = convertZoneLocation(target.location);

    // Extract target type from condition if present
    if (target.condition?.cardType) {
      baseEffect.targetType = normalizeTargetType(target.condition.cardType);
    }
  } else if (effect.targetLocation) {
    baseEffect.targetLocation = convertZoneLocation(effect.targetLocation);
  }

  // Set condition string if present
  if (effect.condition) {
    baseEffect.condition = serializeCondition(effect.condition);
  }

  return baseEffect;
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Evaluate a JSON condition at runtime
 *
 * @param condition - The condition to evaluate
 * @param context - Game context for evaluation
 * @returns Whether the condition is satisfied
 */
export function evaluateCondition(
  condition: JsonCondition,
  context: ConditionContext
): boolean {
  // Handle compound conditions (and/or)
  if (condition.type === "and" && condition.conditions) {
    return condition.conditions.every((c) => evaluateCondition(c, context));
  }

  if (condition.type === "or" && condition.conditions) {
    return condition.conditions.some((c) => evaluateCondition(c, context));
  }

  // Evaluate simple conditions
  return evaluateSimpleCondition(condition, context);
}

/**
 * Evaluate a simple (non-compound) condition
 */
function evaluateSimpleCondition(
  condition: JsonCondition,
  context: ConditionContext
): boolean {
  const { gameState, sourceCardDef, targetCardDef, playerIs } = context;
  const isHost = playerIs === "host";

  // Check archetype condition
  if (condition.archetype) {
    const card = targetCardDef || sourceCardDef;
    if (!card) return false;

    const archetypes = Array.isArray(condition.archetype)
      ? condition.archetype
      : [condition.archetype];

    const matches = archetypes.some(
      (archetype) =>
        card.archetype === archetype ||
        card.name.toLowerCase().includes(archetype.toLowerCase())
    );

    if (!matches) return false;
  }

  // Check card type condition
  if (condition.cardType) {
    const card = targetCardDef || sourceCardDef;
    if (!card) return false;

    const cardTypes = Array.isArray(condition.cardType)
      ? condition.cardType
      : [condition.cardType];

    const typeMap: Record<string, string> = {
      monster: "creature",
      spell: "spell",
      trap: "trap",
      any: card.cardType,
    };

    const matches = cardTypes.some((ct) => {
      const expectedType = typeMap[ct] || ct;
      return card.cardType === expectedType;
    });

    if (!matches) return false;
  }

  // Check level condition
  if (condition.level !== undefined) {
    const card = targetCardDef || sourceCardDef;
    if (!card) return false;

    const level = card.cost || 0;
    if (!matchesNumeric(level, condition.level)) return false;
  }

  // Check attack condition
  if (condition.attack !== undefined) {
    const card = targetCardDef || sourceCardDef;
    if (!card || card.attack === undefined) return false;
    if (!matchesNumeric(card.attack, condition.attack)) return false;
  }

  // Check defense condition
  if (condition.defense !== undefined) {
    const card = targetCardDef || sourceCardDef;
    if (!card || card.defense === undefined) return false;
    if (!matchesNumeric(card.defense, condition.defense)) return false;
  }

  // Check LP conditions
  if (condition.lpBelow !== undefined) {
    const lp = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
    if (lp >= condition.lpBelow) return false;
  }

  if (condition.lpAbove !== undefined) {
    const lp = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
    if (lp <= condition.lpAbove) return false;
  }

  // Check graveyard contains
  if (condition.graveyardContains) {
    if (!evaluateGraveyardCondition(condition.graveyardContains, context)) {
      return false;
    }
  }

  // Check hand size
  if (condition.handSize !== undefined) {
    const hand = isHost ? gameState.hostHand : gameState.opponentHand;
    if (!matchesNumeric(hand.length, condition.handSize)) return false;
  }

  // Check board count
  if (condition.boardCount !== undefined) {
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
    if (!matchesNumeric(board.length, condition.boardCount)) return false;
  }

  // Check turn conditions
  if (condition.turnCount !== undefined) {
    if (!matchesNumeric(gameState.turnNumber, condition.turnCount)) return false;
  }

  if (condition.isFirstTurn === true) {
    if (gameState.turnNumber !== 1) return false;
  }

  if (condition.isMyTurn !== undefined) {
    const isMyTurn = gameState.currentTurnPlayerId === (isHost ? gameState.hostId : gameState.opponentId);
    if (isMyTurn !== condition.isMyTurn) return false;
  }

  // Check field state conditions
  if (condition.opponentHasNoMonsters === true) {
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
    if (opponentBoard.length > 0) return false;
  }

  if (condition.controlsNoMonsters === true) {
    const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    if (myBoard.length > 0) return false;
  }

  if (condition.hasNoMonstersInAttackPosition === true) {
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
    const hasAttackPosition = opponentBoard.some((m) => m.position === 1 && !m.isFaceDown);
    if (hasAttackPosition) return false;
  }

  // Name conditions
  if (condition.nameContains) {
    const card = targetCardDef || sourceCardDef;
    if (!card) return false;
    if (!card.name.toLowerCase().includes(condition.nameContains.toLowerCase())) return false;
  }

  if (condition.nameExact) {
    const card = targetCardDef || sourceCardDef;
    if (!card) return false;
    if (card.name.toLowerCase() !== condition.nameExact.toLowerCase()) return false;
  }

  // Position condition
  if (condition.position) {
    const boardCard = context.sourceCard;
    if (!boardCard) return false;

    if (condition.position === "attack" && boardCard.position !== 1) return false;
    if (condition.position === "defense" && boardCard.position !== -1) return false;
    if (condition.position === "facedown" && !boardCard.isFaceDown) return false;
  }

  if (condition.isFaceDown !== undefined) {
    const boardCard = context.sourceCard;
    if (!boardCard) return false;
    if (boardCard.isFaceDown !== condition.isFaceDown) return false;
  }

  // All conditions passed
  return true;
}

/**
 * Evaluate graveyard condition
 */
function evaluateGraveyardCondition(
  gyCondition: NonNullable<JsonCondition["graveyardContains"]>,
  context: ConditionContext
): boolean {
  const { gameState, playerIs } = context;
  const isHost = playerIs === "host";

  // Get appropriate graveyard
  const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

  // Check count
  if (gyCondition.count !== undefined) {
    if (!matchesNumeric(graveyard.length, gyCondition.count)) return false;
  }

  // For card type/archetype filters, we'd need async DB lookups or a pre-populated cache
  // This is a limitation - would need to pass card definitions cache in context

  return true;
}

/**
 * Evaluate a field count condition
 */
export function evaluateFieldCount(
  zone: "board" | "hand" | "graveyard",
  owner: TargetOwner,
  context: ConditionContext,
  expectedCount: number | NumericRange
): boolean {
  const { gameState, playerIs } = context;
  const isHost = playerIs === "host";

  let count = 0;

  // Determine which zones to count based on owner
  const countHost = owner === "self" ? isHost : owner === "opponent" ? !isHost : true;
  const countOpponent = owner === "self" ? !isHost : owner === "opponent" ? isHost : true;

  switch (zone) {
    case "board":
      if (countHost) count += gameState.hostBoard.length;
      if (countOpponent) count += gameState.opponentBoard.length;
      break;
    case "hand":
      if (countHost) count += gameState.hostHand.length;
      if (countOpponent) count += gameState.opponentHand.length;
      break;
    case "graveyard":
      if (countHost) count += gameState.hostGraveyard.length;
      if (countOpponent) count += gameState.opponentGraveyard.length;
      break;
  }

  return matchesNumeric(count, expectedCount);
}

/**
 * Check if a card matches archetype condition
 */
export function evaluateArchetypeMatch(
  card: Doc<"cardDefinitions"> | undefined,
  archetype: string
): boolean {
  if (!card) return false;

  const normalizedArchetype = archetype.toLowerCase();

  // Check archetype field
  if (card.archetype?.toLowerCase().includes(normalizedArchetype)) {
    return true;
  }

  // Check card name
  if (card.name.toLowerCase().includes(normalizedArchetype)) {
    return true;
  }

  return false;
}

/**
 * Check if a level falls within a range
 */
export function evaluateLevelRange(
  level: number,
  range: number | NumericRange
): boolean {
  return matchesNumeric(level, range);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Flatten an effect chain into an array of ParsedEffects
 *
 * Handles then/or branches by creating a flat array.
 */
export function flattenEffectChain(
  effect: JsonEffect,
  spellSpeed?: 1 | 2 | 3
): ParsedEffect[] {
  const results: ParsedEffect[] = [];

  // Parse the main effect
  results.push(parseJsonEffect(effect, spellSpeed));

  // Process 'then' branch (success case)
  if (effect.then) {
    results.push(...flattenEffectChain(effect.then, spellSpeed));
  }

  // 'or' branches represent player choice - typically handled by UI
  // For now, we don't include them automatically

  return results;
}

/**
 * Convert a JSON cost to the existing cost format
 */
function convertJsonCost(jsonCost: JsonCost): ParsedEffect["cost"] {
  const costTypeMap: Record<string, "discard" | "pay_lp" | "tribute" | "banish"> = {
    discard: "discard",
    pay_lp: "pay_lp",
    tribute: "tribute",
    banish: "banish",
    send_to_gy: "discard",
    return_to_deck: "discard",
  };

  let targetType: "monster" | "spell" | "trap" | "any" | undefined;
  if (jsonCost.condition?.cardType) {
    targetType = normalizeTargetType(jsonCost.condition.cardType);
  }

  return {
    type: costTypeMap[jsonCost.type] || "discard",
    value: jsonCost.value,
    targetType,
  };
}

/**
 * Convert zone location to existing location format
 */
function convertZoneLocation(
  zone?: ZoneLocation
): "board" | "hand" | "graveyard" | "deck" | "banished" | undefined {
  if (!zone) return undefined;

  const zoneMap: Record<string, "board" | "hand" | "graveyard" | "deck" | "banished"> = {
    board: "board",
    hand: "hand",
    graveyard: "graveyard",
    deck: "deck",
    banished: "banished",
    field_spell: "board",
  };

  return zoneMap[zone];
}

/**
 * Normalize target type to standard format
 */
function normalizeTargetType(
  cardType: string | string[] | undefined
): "monster" | "spell" | "trap" | "any" {
  if (!cardType) return "any";

  const type = Array.isArray(cardType) ? cardType[0] : cardType;
  if (!type || type === "any") return "any";

  const typeMap: Record<string, "monster" | "spell" | "trap" | "any"> = {
    monster: "monster",
    creature: "monster",
    spell: "spell",
    trap: "trap",
  };

  return typeMap[type] || "any";
}

/**
 * Serialize a condition to a string format for storage
 */
function serializeCondition(condition: JsonCondition): string {
  // Simple conditions can be converted to legacy format
  if (condition.archetype && !Array.isArray(condition.archetype)) {
    return `${condition.archetype}_monsters`;
  }

  if (condition.cardType) {
    const type = Array.isArray(condition.cardType) ? condition.cardType[0] : condition.cardType;
    if (type === "monster") {
      return condition.targetOwner === "opponent" ? "opponent_monsters" : "all_monsters";
    }
  }

  if (condition.level && typeof condition.level === "object" && !("exact" in condition.level && condition.level.exact !== undefined)) {
    const range = condition.level as NumericRange;
    if (range.max !== undefined) {
      return `level_${range.max}_or_lower`;
    }
    if (range.min !== undefined) {
      return `level_${range.min}_or_higher`;
    }
  }

  if (condition.attack && typeof condition.attack === "object") {
    const range = condition.attack;
    if (range.max !== undefined) {
      return `atk_${range.max}_or_less`;
    }
    if (range.min !== undefined) {
      return `atk_${range.min}_or_more`;
    }
  }

  if (condition.opponentHasNoMonsters) {
    return "no_opponent_monsters";
  }

  if (condition.hasNoMonstersInAttackPosition) {
    return "no_opponent_attack_monsters";
  }

  // For complex conditions, serialize to JSON string
  return `json:${JSON.stringify(condition)}`;
}

/**
 * Check if a numeric value matches a condition (exact or range)
 */
function matchesNumeric(
  value: number,
  condition: number | NumericRange
): boolean {
  if (typeof condition === "number") {
    return value === condition;
  }

  if (isNumericRange(condition)) {
    if (condition.exact !== undefined) {
      return value === condition.exact;
    }
    if (condition.min !== undefined && value < condition.min) return false;
    if (condition.max !== undefined && value > condition.max) return false;
    return true;
  }

  return true;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if an ability definition is in JSON format
 */
export function isJsonAbility(ability: string | JsonAbility | unknown): ability is JsonAbility {
  return (
    typeof ability === "object" &&
    ability !== null &&
    "effects" in ability &&
    Array.isArray((ability as JsonAbility).effects)
  );
}

/**
 * Parse a condition string that may be JSON or legacy format
 */
export function parseConditionString(conditionStr: string): JsonCondition | null {
  // Check if it's a JSON condition
  if (conditionStr.startsWith("json:")) {
    try {
      return JSON.parse(conditionStr.slice(5)) as JsonCondition;
    } catch {
      logger.warn("Failed to parse JSON condition", { conditionStr });
      return null;
    }
  }

  // Try to convert from legacy format
  return convertLegacyCondition(conditionStr);
}

/**
 * Convert a legacy string condition to JSON condition
 *
 * Supports patterns like:
 * - "archetype_dragons" -> { archetype: "dragons" }
 * - "all_monsters" -> { cardType: "monster" }
 * - "level_4_or_lower" -> { level: { max: 4 } }
 * - "atk_1500_or_less" -> { attack: { max: 1500 } }
 */
function convertLegacyCondition(stringCondition: string): JsonCondition | null {
  if (!stringCondition || stringCondition === "") {
    return null;
  }

  const condition = stringCondition.toLowerCase().trim();

  // "all_monsters" -> affects all monsters
  if (condition === "all_monsters") {
    return { cardType: "monster" };
  }

  // "opponent_monsters" -> opponent's monsters
  if (condition === "opponent_monsters") {
    return { cardType: "monster", targetOwner: "opponent" };
  }

  // "no_opponent_monsters"
  if (condition === "no_opponent_monsters") {
    return { opponentHasNoMonsters: true };
  }

  // "no_opponent_attack_monsters"
  if (condition === "no_opponent_attack_monsters") {
    return { hasNoMonstersInAttackPosition: true };
  }

  // Level conditions: "level_4_or_lower", "level_7_or_higher"
  const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
  if (levelMatch?.[1] && levelMatch[2]) {
    const threshold = Number.parseInt(levelMatch[1]);
    const comparison = levelMatch[2].toLowerCase();

    if (comparison === "lower") {
      return { level: { max: threshold } };
    }
    if (comparison === "higher") {
      return { level: { min: threshold } };
    }
  }

  // ATK conditions: "atk_1500_or_less", "atk_2000_or_more"
  const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
  if (atkMatch?.[1] && atkMatch[2]) {
    const threshold = Number.parseInt(atkMatch[1]);
    const comparison = atkMatch[2].toLowerCase();

    if (comparison === "less") {
      return { attack: { max: threshold } };
    }
    if (comparison === "more") {
      return { attack: { min: threshold } };
    }
  }

  // DEF conditions: "def_1500_or_less", "def_2000_or_more"
  const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
  if (defMatch?.[1] && defMatch[2]) {
    const threshold = Number.parseInt(defMatch[1]);
    const comparison = defMatch[2].toLowerCase();

    if (comparison === "less") {
      return { defense: { max: threshold } };
    }
    if (comparison === "more") {
      return { defense: { min: threshold } };
    }
  }

  // Archetype conditions: "dragon_monsters", "warrior_monsters"
  const archetypeMatch = condition.match(/^(.+)_monsters$/i);
  if (archetypeMatch?.[1]) {
    const archetype = archetypeMatch[1].toLowerCase();
    // Filter out non-archetype patterns
    if (!["all", "opponent", "no_opponent", "no_opponent_attack"].includes(archetype)) {
      // Return as a simple string archetype check
      return { nameContains: archetype };
    }
  }

  // Couldn't convert - return null
  return null;
}
