/**
 * JSON Effect Schema Types
 *
 * Type definitions for JSON-based card effect definitions.
 * This replaces text parsing with structured, type-safe effect configurations
 * that can be easily authored in spreadsheets and validated at runtime.
 *
 * Design Goals:
 * - Support ALL existing effect types (draw, destroy, damage, etc.)
 * - Enable designer-friendly card creation via spreadsheets
 * - Support conditional logic (if/then/else)
 * - Support sequential effects ("do X, then do Y")
 * - Support "for each" patterns
 * - Maintain backwards compatibility with ParsedEffect interface
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { EffectType, ParsedAbility, ParsedEffect, TriggerCondition } from "./types";

// ============================================================================
// EXTENDED EFFECT & TRIGGER TYPES
// ============================================================================

/**
 * Extended effect types (includes base EffectType plus new types)
 */
export type JsonEffectType =
  | EffectType
  | "returnToDeck"
  | "copy"
  | "shuffle"
  | "reveal"
  | "swap"
  | "transform"
  | "skip"
  | "extraNormalSummon"
  | "changePosition"
  | "equip"
  | "counter"
  | "nothing";

/**
 * Extended trigger conditions
 */
export type JsonTriggerCondition =
  | TriggerCondition
  | "on_normal_summon"
  | "on_special_summon"
  | "on_flip_summon"
  | "on_destroy_by_battle"
  | "on_destroy_by_effect"
  | "on_sent_to_gy"
  | "on_banished"
  | "on_returned_to_hand"
  | "on_targeted"
  | "on_opponent_normal_summon"
  | "on_opponent_special_summon"
  | "on_opponent_draws"
  | "on_opponent_activates"
  | "on_opponent_attacks"
  | "on_main_start"
  | "on_battle_end"
  | "on_turn_start"
  | "on_turn_end"
  | "on_opponent_turn_start"
  | "on_opponent_turn_end"
  | "on_chain_start"
  | "on_chain_link"
  | "on_chain_resolve"
  | "on_spell_activated"
  | "on_trap_activated"
  | "on_effect_activated"
  | "on_damage_calculation"
  | "quick"
  | "continuous"
  | "while_in_gy"
  | "while_banished";

// ============================================================================
// CORE CONDITION TYPES
// ============================================================================

/**
 * Compound condition types for logical operators
 */
export type CompoundConditionType = "and" | "or" | "not";

/**
 * Range specification for numeric comparisons
 */
export interface NumericRange {
  min?: number;
  max?: number;
}

/**
 * Field count condition - checks number of cards in a zone
 */
export interface FieldCountCondition {
  zone: "monster" | "spell_trap" | "field" | "all";
  owner: "self" | "opponent" | "both";
  count: number | NumericRange;
  filter?: {
    cardType?: "stereotype" | "spell" | "trap" | "class";
    archetype?: string;
    attribute?: string;
    position?: "attack" | "defense";
    isFaceDown?: boolean;
  };
}

/**
 * Card property filter (used in conditions and targets)
 */
export interface JsonCardPropertyFilter {
  cardType?: "stereotype" | "spell" | "trap" | "class";
  archetype?: CardArchetype | CardArchetype[] | string;
  attribute?: CardAttribute | CardAttribute[];
  level?: number | NumericRange;
  attack?: number | NumericRange;
  defense?: number | NumericRange;
  position?: "attack" | "defense";
  isFaceDown?: boolean;
  name?: string | { contains?: string; startsWith?: string; endsWith?: string };
  rarity?: string | string[];
}

/**
 * Graveyard condition - checks graveyard contents
 */
export interface GraveyardCondition {
  owner: "self" | "opponent" | "both";
  count?: number | NumericRange;
  contains?: JsonCardPropertyFilter;
}

/**
 * Banished pile condition
 */
export interface BanishedCondition {
  owner: "self" | "opponent" | "both";
  count?: number | NumericRange;
  contains?: JsonCardPropertyFilter;
}

/**
 * Card attribute values (element types)
 */
export type CardAttribute =
  | "red"
  | "blue"
  | "yellow"
  | "purple"
  | "green"
  | "white";

/**
 * Card archetype values (matches schema)
 */
export type CardArchetype =
  | "dropout"
  | "prep"
  | "geek"
  | "freak"
  | "nerd"
  | "goodie_two_shoes";

/**
 * Comparison operators for numeric values
 */
export type JsonComparisonOperator = "eq" | "ne" | "lt" | "lte" | "gt" | "gte";

/**
 * JSON Condition - the main condition type for effect evaluation
 *
 * Can be:
 * 1. A compound condition (and/or/not) with nested conditions
 * 2. A simple condition with one or more property checks
 */
export interface JsonCondition {
  // --------------------------------------------------------------------------
  // Compound condition support
  // --------------------------------------------------------------------------

  /** Compound condition type (for logical operators) */
  type?: CompoundConditionType;

  /** Nested conditions (for compound types) */
  conditions?: JsonCondition[];

  /** Negate this condition */
  negate?: boolean;

  // --------------------------------------------------------------------------
  // Card property conditions
  // --------------------------------------------------------------------------

  /** Card archetype */
  archetype?: CardArchetype | CardArchetype[] | string;

  /** Card attribute */
  attribute?: CardAttribute | CardAttribute[];

  /** Card type */
  cardType?: "stereotype" | "spell" | "trap" | "class";

  /** Monster level */
  level?: number | NumericRange;

  /** Monster ATK */
  attack?: number | NumericRange;

  /** Monster DEF */
  defense?: number | NumericRange;

  /** Card cost */
  cost?: number | NumericRange;

  /** Card rarity */
  rarity?: string | string[];

  /** Monster position */
  position?: "attack" | "defense";

  /** Is face-down */
  isFaceDown?: boolean;

  /** Has attacked this turn */
  hasAttacked?: boolean;

  // --------------------------------------------------------------------------
  // Name-based conditions
  // --------------------------------------------------------------------------

  /** Card name contains this string */
  nameContains?: string;

  /** Card name exactly matches */
  nameEquals?: string;

  // --------------------------------------------------------------------------
  // Player state conditions
  // --------------------------------------------------------------------------

  /** LP below threshold */
  lpBelow?: number;

  /** LP above threshold */
  lpAbove?: number;

  /** LP equal to */
  lpEqual?: number;

  /** LP comparison with opponent */
  lpComparison?: "higher" | "lower" | "equal";

  /** Has normal summoned this turn */
  hasNormalSummoned?: boolean;

  // --------------------------------------------------------------------------
  // Board state conditions
  // --------------------------------------------------------------------------

  /** Field count condition */
  fieldCount?: FieldCountCondition;

  /** Graveyard contents */
  graveyardContains?: GraveyardCondition;

  /** Banished contents */
  banishedContains?: BanishedCondition;

  /** Zone is empty */
  zoneEmpty?: { zone: TargetZone; owner: "self" | "opponent" | "both" };

  // --------------------------------------------------------------------------
  // Game state conditions
  // --------------------------------------------------------------------------

  /** Turn number */
  turnNumber?: number | NumericRange;

  /** Current phase */
  phase?: "draw" | "main" | "combat" | "breakdown_check" | "end";

  /** Whose turn */
  turnOwner?: "self" | "opponent";

  // --------------------------------------------------------------------------
  // Event conditions
  // --------------------------------------------------------------------------

  /** How was card summoned */
  summonedBy?: "normal" | "special" | "flip" | "tribute" | "any";

  /** How was card destroyed */
  destroyedBy?: "battle" | "effect" | "any";

  /** Where was card summoned from */
  summonedFrom?: TargetZone;

  /** Who caused the event */
  eventCausedBy?: "self" | "opponent";

  /** Was flipped */
  wasFlipped?: boolean;

  // --------------------------------------------------------------------------
  // Chain conditions
  // --------------------------------------------------------------------------

  /** Chain length */
  chainLength?: NumericRange;

  // --------------------------------------------------------------------------
  // Ownership
  // --------------------------------------------------------------------------

  /** Who owns/controls the card */
  owner?: "self" | "opponent";

  // --------------------------------------------------------------------------
  // Protection checks
  // --------------------------------------------------------------------------

  /** Can the card be targeted? */
  canBeTargeted?: boolean;

  /** Can be destroyed by battle? */
  canBeDestroyedByBattle?: boolean;

  /** Can be destroyed by effects? */
  canBeDestroyedByEffects?: boolean;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Card on board representation for condition evaluation
 */
export interface CardOnBoard {
  cardId: Id<"cardDefinitions">;
  position: number; // 1 = Attack, -1 = Defense
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
}

/**
 * Extended card info (from cardDefinitions + board state)
 */
export interface CardInfo {
  // From cardDefinitions
  _id: Id<"cardDefinitions">;
  name: string;
  archetype: string;
  cardType: "stereotype" | "spell" | "trap" | "class";
  attack?: number;
  defense?: number;
  cost: number;
  ability?: string;
  jsonAbility?: JsonAbility; // New JSON ability field

  // From board state (if applicable)
  position?: number;
  hasAttacked?: boolean;
  isFaceDown?: boolean;
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
}

/**
 * Condition evaluation context
 *
 * Contains all information needed to evaluate a condition.
 */
export interface ConditionContext {
  // Game state
  gameState: Doc<"gameStates">;

  // Source card (the card whose effect is being evaluated)
  sourceCard: CardOnBoard;
  sourceCardDef?: Doc<"cardDefinitions">;

  // Target card (optional - for effects that target specific cards)
  targetCard?: CardOnBoard;
  targetCardDef?: Doc<"cardDefinitions">;

  // Player context
  playerIs: "host" | "guest"; // Which player is activating the effect

  // Additional card definitions cache (to avoid repeated DB lookups)
  cardDefsCache?: Map<string, Doc<"cardDefinitions">>;
}

// ============================================================================
// CONTINUOUS EFFECT TYPES
// ============================================================================

/**
 * Continuous effect definition using JSON conditions
 */
export interface ContinuousEffectDefinition {
  // Effect type
  effectType: "modifyATK" | "modifyDEF" | "protection" | "restriction";

  // Value for stat modifications
  value?: number;

  // Condition that must be met for the effect to apply
  condition?: JsonCondition;

  // Target specification
  target: {
    // Who the effect applies to
    owner: "self" | "opponent" | "both";
    // Additional filter for which cards are affected
    filter?: JsonCondition;
  };

  // Protection flags
  protection?: {
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
  };
}

// ============================================================================
// HELPER TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a condition is a compound condition
 */
export function isCompoundCondition(condition: JsonCondition): boolean {
  return condition.type === "and" || condition.type === "or" || condition.type === "not";
}

/**
 * Type guard to check if a value is a NumericRange
 */
export function isNumericRange(value: number | NumericRange | undefined): value is NumericRange {
  return typeof value === "object" && value !== null && ("min" in value || "max" in value);
}

/**
 * Check if a string condition (legacy format) or JSON condition
 */
export function isJsonCondition(
  condition: string | JsonCondition | undefined
): condition is JsonCondition {
  return typeof condition === "object" && condition !== null;
}

// ============================================================================
// LEGACY CONDITION CONVERSION
// ============================================================================

/**
 * Convert a legacy string condition to JSON condition
 *
 * Supports patterns like:
 * - "archetype_dragons" -> { archetype: "dragons" }
 * - "all_monsters" -> { cardType: "stereotype" }
 * - "level_4_or_lower" -> { level: { max: 4 } }
 * - "atk_1500_or_less" -> { attack: { max: 1500 } }
 */
export function convertLegacyCondition(stringCondition: string): JsonCondition | null {
  if (!stringCondition || stringCondition === "") {
    return null;
  }

  const condition = stringCondition.toLowerCase().trim();

  // "all_monsters" -> affects all monsters
  if (condition === "all_monsters") {
    return { cardType: "stereotype" };
  }

  // "opponent_monsters" -> opponent's monsters
  if (condition === "opponent_monsters") {
    return { cardType: "stereotype", owner: "opponent" };
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
    if (!["all", "opponent"].includes(archetype)) {
      return { archetype };
    }
  }

  // Couldn't convert - return null
  return null;
}

// ============================================================================
// JSON EFFECT TYPES
// ============================================================================

/** Target zone types */
export type TargetZone =
  | "hand"
  | "deck"
  | "graveyard"
  | "banished"
  | "board"
  | "spell_trap"
  | "field_spell"
  | "extra_deck"
  | "anywhere";

/** Who to target */
export type TargetOwner = "self" | "opponent" | "both" | "any";

/** Card type filter */
export type JsonTargetType = "monster" | "stereotype" | "spell" | "trap" | "class" | "any" | "card";

/** How targets are selected */
export type SelectionMode =
  | "choose" // Player chooses
  | "random" // Randomly selected
  | "all" // All matching cards
  | "highest_atk" // Card with highest ATK
  | "lowest_atk" // Card with lowest ATK
  | "highest_def" // Card with highest DEF
  | "lowest_def" // Card with lowest DEF
  | "first" // First in zone
  | "last"; // Last in zone

/** Target specification for effects */
export interface JsonTarget {
  zone: TargetZone;
  location?: TargetZone; // Alias for zone
  owner: TargetOwner;
  cardType?: JsonTargetType;
  type?: JsonTargetType; // Alias for cardType
  archetype?: CardArchetype | CardArchetype[] | string;
  attribute?: CardAttribute | CardAttribute[];
  position?: "attack" | "defense" | "facedown" | "any";
  level?: number | NumericRange;
  attack?: number | NumericRange;
  defense?: number | NumericRange;
  rarity?: string | string[];
  count: number | "all";
  minCount?: number;
  maxCount?: number;
  selectionMode: SelectionMode;
  optional?: boolean;
  excludeSelf?: boolean;
  excludeFaceDown?: boolean;
  nameContains?: string;
  nameEquals?: string;
  condition?: JsonCondition;
  filter?: JsonCondition;
  forEachMultiplier?: number;
}

/** Cost types for effect activation */
export type JsonCostType =
  | "discard"
  | "pay_lp"
  | "tribute"
  | "banish"
  | "banish_from_gy"
  | "banish_from_hand"
  | "return_to_deck"
  | "send_to_gy"
  | "destroy"
  | "reduce_atk"
  | "skip_phase"
  | "skip_battle"
  | "no_normal_summon"
  | "reveal"
  | "detach";

/** Cost target specification */
export interface JsonCostTarget {
  location?: TargetZone;
  zone?: TargetZone; // Alias
  count: number;
  type?: JsonTargetType;
  cardType?: JsonTargetType; // Alias
  filter?: JsonCondition;
  selection?: "player_choice" | "specific" | "random";
}

/** Cost specification */
export interface JsonCost {
  type: JsonCostType;
  value?: number;
  target?: Partial<JsonTarget> | JsonCostTarget;
  isOptional?: boolean;
  optional?: boolean; // Alias
  alternative?: JsonCost;
}

// ============================================================================
// PROTECTION FLAGS
// ============================================================================

/**
 * Protection abilities that prevent certain interactions
 */
export interface JsonProtection {
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  cannotBeAttacked?: boolean;
  immuneTo?: JsonEffectType[];
  cannotChangeStats?: boolean;
  cannotChangePosition?: boolean;
  cannotBeTributed?: boolean;
  cannotBeBanished?: boolean;
  cannotBeReturned?: boolean;
  condition?: JsonCondition;
}

// ============================================================================
// DURATION SYSTEM
// ============================================================================

export type JsonDurationType =
  | "instant"
  | "until_end_of_turn"
  | "until_end_of_phase"
  | "until_end_of_battle"
  | "until_next_turn"
  | "until_next_standby"
  | "permanent"
  | "turns"
  | "turn"
  | "phase"
  | "battle";

export interface JsonDuration {
  type: JsonDurationType;
  turnCount?: number;
  countOwner?: "self" | "opponent" | "both";
  expirePhase?:
    | "draw"
    | "main"
    | "combat"
    | "breakdown_check"
    | "end";
}

// ============================================================================
// VALUE CALCULATION
// ============================================================================

/**
 * Dynamic value calculation for "for each" and formula-based effects
 */
export interface JsonValueCalculation {
  base?: number;

  perCard?: {
    location: TargetZone;
    owner: TargetOwner;
    filter?: JsonCondition;
    multiplier: number;
  };

  fromStat?: {
    source: "this" | "target" | "highest_on_field" | "lowest_on_field";
    stat: "attack" | "defense" | "level" | "original_attack" | "original_defense";
    modifier?: number;
    multiplier?: number;
  };

  fromLPDifference?: {
    multiplier: number;
    max?: number;
  };

  fromGraveyardCount?: {
    owner: TargetOwner;
    filter?: JsonCondition;
    multiplier: number;
    max?: number;
  };

  fromBanishedCount?: {
    owner: TargetOwner;
    filter?: JsonCondition;
    multiplier: number;
    max?: number;
  };

  min?: number;
  max?: number;
}

/** Base effect interface */
interface JsonEffectBase {
  effectType: EffectType | JsonEffectType;
  condition?: JsonCondition;
  isOptional?: boolean;
  valueCalculation?: JsonValueCalculation;
}

/** Draw effect */
export interface JsonDrawEffect extends JsonEffectBase {
  effectType: "draw";
  count: number;
  value?: number; // Alias for count
}

/** Destroy effect */
export interface JsonDestroyEffect extends JsonEffectBase {
  effectType: "destroy";
  target: JsonTarget;
}

/** Damage effect */
export interface JsonDamageEffect extends JsonEffectBase {
  effectType: "damage";
  value: number;
  targetOwner?: TargetOwner;
}

/** Gain LP effect */
export interface JsonGainLPEffect extends JsonEffectBase {
  effectType: "gainLP";
  value: number;
  targetOwner?: TargetOwner;
}

/** Modify ATK effect */
export interface JsonModifyATKEffect extends JsonEffectBase {
  effectType: "modifyATK";
  target: JsonTarget;
  value: number;
  duration?: JsonDurationType | JsonDuration;
}

/** Modify DEF effect */
export interface JsonModifyDEFEffect extends JsonEffectBase {
  effectType: "modifyDEF";
  target: JsonTarget;
  value: number;
  duration?: JsonDurationType | JsonDuration;
}

/** Summon effect */
export interface JsonSummonEffect extends JsonEffectBase {
  effectType: "summon";
  target: JsonTarget;
  position?: "attack" | "defense";
}

/** Add to hand effect */
export interface JsonToHandEffect extends JsonEffectBase {
  effectType: "toHand";
  target: JsonTarget;
}

/** Send to graveyard effect */
export interface JsonToGraveyardEffect extends JsonEffectBase {
  effectType: "toGraveyard";
  target: JsonTarget;
}

/** Banish effect */
export interface JsonBanishEffect extends JsonEffectBase {
  effectType: "banish";
  target: JsonTarget;
  faceDown?: boolean;
}

/** Search effect */
export interface JsonSearchEffect extends JsonEffectBase {
  effectType: "search";
  target: JsonTarget;
  reveal?: boolean;
}

/** Negate effect */
export interface JsonNegateEffect extends JsonEffectBase {
  effectType: "negate";
  target: JsonTarget;
  destroyAfter?: boolean;
}

/** Mill effect */
export interface JsonMillEffect extends JsonEffectBase {
  effectType: "mill";
  count: number;
  value?: number; // Alias for count
  targetOwner?: TargetOwner;
}

/** Discard effect */
export interface JsonDiscardEffect extends JsonEffectBase {
  effectType: "discard";
  target: JsonTarget;
}

/** Direct attack ability */
export interface JsonDirectAttackEffect extends JsonEffectBase {
  effectType: "directAttack";
}

/** Multiple attack ability */
export interface JsonMultipleAttackEffect extends JsonEffectBase {
  effectType: "multipleAttack";
  count: number;
}

/** Return to deck effect */
export interface JsonReturnToDeckEffect extends JsonEffectBase {
  effectType: "returnToDeck";
  target: JsonTarget;
  position?: "top" | "bottom" | "shuffle";
}

/** Change position effect */
export interface JsonChangePositionEffect extends JsonEffectBase {
  effectType: "changePosition";
  target: JsonTarget;
  newPosition: "attack" | "defense";
}

/** Union of all typed JSON effect definitions */
export type JsonTypedEffect =
  | JsonDrawEffect
  | JsonDestroyEffect
  | JsonDamageEffect
  | JsonGainLPEffect
  | JsonModifyATKEffect
  | JsonModifyDEFEffect
  | JsonSummonEffect
  | JsonToHandEffect
  | JsonToGraveyardEffect
  | JsonBanishEffect
  | JsonSearchEffect
  | JsonNegateEffect
  | JsonMillEffect
  | JsonDiscardEffect
  | JsonDirectAttackEffect
  | JsonMultipleAttackEffect
  | JsonReturnToDeckEffect
  | JsonChangePositionEffect;

/**
 * Activation type for effects
 */
export type JsonActivationType =
  | "trigger" // Automatic trigger when conditions are met (mandatory/optional)
  | "ignition" // Can only activate manually during Main Phase with priority
  | "quick" // Can activate manually any time with priority (Quick Effects)
  | "continuous"; // Passive effect, always active while on field

/**
 * Generic JSON Effect (for maximum flexibility)
 * This is the primary type used in JsonAbility for designer flexibility
 */
export interface JsonGenericEffect {
  // Effect identity
  type?: JsonEffectType;
  effectType?: JsonEffectType; // Alias
  effectId?: string;
  name?: string;
  description?: string;

  // Trigger
  trigger?: JsonTriggerCondition;
  activationType?: JsonActivationType; // How the effect is activated

  // Activation
  activationCondition?: JsonCondition;
  condition?: JsonCondition; // Also used for effect condition

  // Value
  value?: number;
  count?: number; // Alias for draw/mill
  valueCalculation?: JsonValueCalculation;

  // Target
  target?: JsonTarget | Partial<JsonTarget>;
  targetCount?: number;
  targetType?: JsonTargetType;
  targetLocation?: TargetZone;
  targetOwner?: TargetOwner;

  // Cost
  cost?: JsonCost;

  // Restrictions
  isOPT?: boolean;
  isHardOPT?: boolean;
  isHOPT?: boolean; // Alias
  spellSpeed?: 1 | 2 | 3;

  // Duration
  duration?: JsonDurationType | JsonDuration;
  isContinuous?: boolean;
  continuous?: boolean; // Legacy alias
  isQuickEffect?: boolean;

  // Protection
  protection?: JsonProtection;

  // Chaining
  then?: JsonGenericEffect | JsonGenericEffect[];
  else?: JsonGenericEffect | JsonGenericEffect[];
  immediately?: JsonGenericEffect | JsonGenericEffect[];

  // Special flags
  canMissTiming?: boolean;
  isMandatory?: boolean;
  isOptional?: boolean;
  doesTarget?: boolean;
  doesDestroy?: boolean;
  canBeNegated?: boolean;

  // Effect-specific fields
  position?: "attack" | "defense" | "top" | "bottom" | "shuffle";
  newPosition?: "attack" | "defense";
  reveal?: boolean;
  destroyAfter?: boolean;
  faceDown?: boolean;
}

/** Union type for all effect formats */
export type JsonEffect = JsonTypedEffect | JsonGenericEffect;

/** Effect node with optional then/else branches */
export interface JsonEffectNode {
  effect: JsonEffect | JsonTypedEffect | JsonGenericEffect;
  then?: JsonEffectNode[];
  else?: JsonEffectNode[];
}

/** For each loop structure */
export interface JsonForEachEffect {
  forEach: JsonTarget | Partial<JsonTarget>;
  do: JsonEffectNode[];
  limit?: number;
}

/** Type guard for forEach effects */
export function isForEachEffect(
  effect: JsonEffectNode | JsonForEachEffect
): effect is JsonForEachEffect {
  return "forEach" in effect;
}

/** Type guard for effect nodes */
export function isEffectNode(
  effect: JsonEffect | JsonEffectNode | JsonForEachEffect
): effect is JsonEffectNode {
  return "effect" in effect && !("forEach" in effect);
}

/** Type guard for generic effects */
export function isGenericEffect(effect: JsonEffect): effect is JsonGenericEffect {
  return !("effectType" in effect) || effect.effectType === undefined;
}

/** Check if effect has sequential/chained effects */
export function hasSequentialEffects(effect: JsonGenericEffect): boolean {
  return !!(effect.then || effect.else || effect.immediately);
}

/** Flatten nested effects into a flat array */
export function flattenEffects(effect: JsonGenericEffect): JsonGenericEffect[] {
  const effects: JsonGenericEffect[] = [effect];
  const addEffects = (e: JsonGenericEffect | JsonGenericEffect[] | undefined) => {
    if (!e) return;
    if (Array.isArray(e)) {
      for (const nested of e) {
        effects.push(...flattenEffects(nested));
      }
    } else {
      effects.push(...flattenEffects(e));
    }
  };
  addEffects(effect.then);
  addEffects(effect.else);
  addEffects(effect.immediately);
  return effects;
}

/** Get effect type from various formats */
export function getEffectType(effect: JsonEffect | JsonGenericEffect): JsonEffectType | undefined {
  if ("effectType" in effect && effect.effectType) {
    return effect.effectType;
  }
  if ("type" in effect && effect.type) {
    return effect.type as JsonEffectType;
  }
  return undefined;
}

// ============================================================================
// JSON ABILITY DEFINITION
// ============================================================================

// ============================================================================
// SUMMONING RESTRICTIONS
// ============================================================================

/**
 * Summoning restriction conditions
 */
export interface JsonSummonRestriction {
  cannotNormalSummon?: boolean;
  cannotSet?: boolean;
  requiresTribute?: number;
  specialSummonOnly?: boolean;
  summonMethod?: "fusion" | "ritual" | "synchro" | "xyz" | "link" | "pendulum" | "effect";
  mustBeProperlyFirstSummoned?: boolean;
  specialSummonCondition?: JsonCondition;
  materials?: {
    minCount?: number;
    maxCount?: number;
    exactCount?: number;
    filter?: JsonCondition;
  };
}

// ============================================================================
// JSON ABILITY DEFINITION
// ============================================================================

/**
 * Complete JSON ability definition
 *
 * This is the main structure for defining card abilities in JSON format.
 * It supports complex abilities with conditions, costs, and multiple effects.
 */
export interface JsonAbility {
  // --------------------------------------------------------------------------
  // Identity
  // --------------------------------------------------------------------------

  /** Unique identifier for the ability */
  id?: string;

  /** Human-readable name */
  name?: string;

  /** Schema version for migration support */
  schemaVersion?: number;

  // --------------------------------------------------------------------------
  // Trigger & Activation
  // --------------------------------------------------------------------------

  /** When this ability triggers */
  trigger?: TriggerCondition | JsonTriggerCondition;

  /** Condition required to activate */
  activationCondition?: JsonCondition;

  /** Cost to activate */
  cost?: JsonCost;

  // --------------------------------------------------------------------------
  // Restrictions
  // --------------------------------------------------------------------------

  /** Once per turn restriction */
  isOPT?: boolean;

  /** Hard once per turn (can't be reset, works across copies) */
  isHOPT?: boolean;

  /** Alias for isHOPT */
  isHardOPT?: boolean;

  /** Spell speed for chain purposes (1 = normal, 2 = quick, 3 = counter) */
  spellSpeed?: 1 | 2 | 3;

  /** Whether this is a continuous effect */
  isContinuous?: boolean;

  // --------------------------------------------------------------------------
  // Effects
  // --------------------------------------------------------------------------

  /** The effects of this ability */
  effects: Array<JsonEffect | JsonEffectNode | JsonForEachEffect | JsonGenericEffect>;

  // --------------------------------------------------------------------------
  // Summoning
  // --------------------------------------------------------------------------

  /** Summoning restrictions for this card */
  summonRestriction?: JsonSummonRestriction;

  // --------------------------------------------------------------------------
  // Restrictions While On Field
  // --------------------------------------------------------------------------

  /** Global restrictions while this card is on field */
  restrictions?: {
    cannotAttackDirectly?: boolean;
    mustAttack?: boolean;
    cannotChangePosition?: boolean;
    cannotActivate?: JsonCondition;
    othersCannotAttack?: boolean;
    cannotSpecialSummon?: boolean;
    cannotDraw?: boolean;
  };

  // --------------------------------------------------------------------------
  // Protection
  // --------------------------------------------------------------------------

  /** Protection flags */
  protection?: JsonProtection;

  /** Passive protection while on field */
  passiveProtection?: JsonProtection;

  // --------------------------------------------------------------------------
  // Continuous Modifiers (Aura Effects)
  // --------------------------------------------------------------------------

  /** Continuous stat modifiers that affect other cards */
  continuousModifiers?: ContinuousEffectDefinition[];
}

// ============================================================================
// GAME EVENT TYPES
// ============================================================================

/**
 * Game event that triggered an ability
 *
 * Used for condition evaluation when checking trigger events.
 */
export interface GameEvent {
  type: string;
  cardId?: Id<"cardDefinitions">;
  cardName?: string;
  cardType?: "stereotype" | "spell" | "trap" | "class";
  archetype?: string;
  level?: number;
  attack?: number;
  defense?: number;
  owner?: Id<"users">;
  targetId?: Id<"cardDefinitions">;
  value?: number;
  zone?: TargetZone;
  fromZone?: TargetZone;
  toZone?: TargetZone;
}

/**
 * Card in hand representation
 */
export interface CardInHand {
  cardId: Id<"cardDefinitions">;
}

// ============================================================================
// LEGACY CONVERSION UTILITIES
// ============================================================================

/**
 * Convert legacy string condition to JSON condition
 */
export function convertLegacyConditionExtended(stringCondition: string): JsonCondition | null {
  if (!stringCondition || stringCondition === "") return null;

  const condition = stringCondition.toLowerCase().trim();

  if (condition === "all_monsters") return { cardType: "stereotype" };
  if (condition === "opponent_monsters") return { cardType: "stereotype", owner: "opponent" };

  const levelMatch = condition.match(/level_(\d+)_or_(lower|higher)/i);
  if (levelMatch?.[1] && levelMatch[2]) {
    const threshold = Number.parseInt(levelMatch[1]);
    return levelMatch[2].toLowerCase() === "lower"
      ? { level: { max: threshold } }
      : { level: { min: threshold } };
  }

  const atkMatch = condition.match(/atk_(\d+)_or_(less|more)/i);
  if (atkMatch?.[1] && atkMatch[2]) {
    const threshold = Number.parseInt(atkMatch[1]);
    return atkMatch[2].toLowerCase() === "less"
      ? { attack: { max: threshold } }
      : { attack: { min: threshold } };
  }

  const defMatch = condition.match(/def_(\d+)_or_(less|more)/i);
  if (defMatch?.[1] && defMatch[2]) {
    const threshold = Number.parseInt(defMatch[1]);
    return defMatch[2].toLowerCase() === "less"
      ? { defense: { max: threshold } }
      : { defense: { min: threshold } };
  }

  const archetypeMatch = condition.match(/^(.+)_monsters$/i);
  if (archetypeMatch?.[1] && !["all", "opponent"].includes(archetypeMatch[1].toLowerCase())) {
    return { archetype: archetypeMatch[1].toLowerCase() };
  }

  const searchMatch = condition.match(/^(.+)_search$/i);
  if (searchMatch?.[1]) {
    return { archetype: searchMatch[1].toLowerCase() };
  }

  if (condition === "no_opponent_monsters" || condition === "no_opponent_attack_monsters") {
    return { fieldCount: { zone: "monster", owner: "opponent", count: 0 } };
  }

  // Fall back to original function
  return convertLegacyCondition(stringCondition);
}

/**
 * Convert JsonEffect/JsonGenericEffect to ParsedEffect for backwards compatibility
 */
export function jsonEffectToParsedEffect(effect: JsonEffect | JsonGenericEffect): ParsedEffect {
  const effectType = getEffectType(effect);
  const genericEffect = effect as JsonGenericEffect;

  // Get count/value from various sources
  let value: number | undefined;
  if ("value" in effect) value = effect.value;
  else if ("count" in effect) value = (effect as JsonDrawEffect | JsonMillEffect).count;
  if (genericEffect.valueCalculation?.base) value = value ?? genericEffect.valueCalculation.base;

  // Get target info
  let targetCount: number | undefined;
  let targetType: "monster" | "spell" | "trap" | "any" | undefined;
  let targetLocation: "board" | "hand" | "graveyard" | "deck" | "banished" | undefined;

  if ("target" in effect && effect.target) {
    const target = effect.target as JsonTarget;
    if (typeof target.count === "number") targetCount = target.count;
    else if (target.minCount) targetCount = target.minCount;
    else if (target.maxCount) targetCount = target.maxCount;

    const type = target.type ?? target.cardType;
    if (type === "monster" || type === "stereotype") targetType = "monster";
    else if (type === "spell" || type === "trap" || type === "any") targetType = type;

    const zone = target.zone ?? target.location;
    if (
      zone === "board" ||
      zone === "hand" ||
      zone === "graveyard" ||
      zone === "deck" ||
      zone === "banished"
    ) {
      targetLocation = zone;
    }
  }

  // Override with explicit values if present
  if (genericEffect.targetCount !== undefined) targetCount = genericEffect.targetCount;
  if (genericEffect.targetType) {
    const t = genericEffect.targetType;
    if (t === "monster" || t === "stereotype") targetType = "monster";
    else if (t === "spell" || t === "trap" || t === "any") targetType = t;
  }
  if (genericEffect.targetLocation) {
    const loc = genericEffect.targetLocation;
    if (
      loc === "board" ||
      loc === "hand" ||
      loc === "graveyard" ||
      loc === "deck" ||
      loc === "banished"
    ) {
      targetLocation = loc;
    }
  }

  return {
    type: effectType as EffectType,
    trigger: (genericEffect.trigger ?? "manual") as TriggerCondition,
    value,
    targetCount,
    targetType,
    targetLocation,
    condition: typeof genericEffect.condition === "string" ? genericEffect.condition : undefined,
    continuous: genericEffect.isContinuous ?? genericEffect.continuous,
    isOPT: genericEffect.isOPT,
    cost: genericEffect.cost
      ? {
          type: genericEffect.cost.type as "discard" | "pay_lp" | "tribute" | "banish",
          value:
            genericEffect.cost.value ??
            (genericEffect.cost.target as JsonCostTarget | undefined)?.count,
          targetType: ((genericEffect.cost.target as JsonCostTarget | undefined)?.type ??
            (genericEffect.cost.target as JsonCostTarget | undefined)?.cardType) as
            | "monster"
            | "spell"
            | "trap"
            | "any"
            | undefined,
        }
      : undefined,
    protection: genericEffect.protection
      ? {
          cannotBeDestroyedByBattle: genericEffect.protection.cannotBeDestroyedByBattle,
          cannotBeDestroyedByEffects: genericEffect.protection.cannotBeDestroyedByEffects,
          cannotBeTargeted: genericEffect.protection.cannotBeTargeted,
        }
      : undefined,
  };
}

/**
 * Convert JsonAbility to ParsedAbility for backwards compatibility
 */
export function jsonAbilityToParsedAbility(ability: JsonAbility): ParsedAbility {
  const effects: ParsedEffect[] = [];

  for (const effect of ability.effects) {
    // Check for forEach pattern
    if (typeof effect === "object" && "forEach" in effect) {
      // ForEach effects are expanded at runtime
      continue;
    }
    // Check for effect node pattern
    if (typeof effect === "object" && "effect" in effect) {
      const node = effect as JsonEffectNode;
      effects.push(jsonEffectToParsedEffect(node.effect as JsonGenericEffect));
    } else {
      effects.push(jsonEffectToParsedEffect(effect as JsonGenericEffect));
    }
  }

  return {
    effects,
    hasMultiPart: effects.length > 1,
  };
}

/**
 * Convert ParsedEffect to JsonGenericEffect for migration
 */
export function parsedEffectToJsonEffect(effect: ParsedEffect): JsonGenericEffect {
  const jsonEffect: JsonGenericEffect = {
    type: effect.type as JsonEffectType,
    trigger: effect.trigger as JsonTriggerCondition,
  };

  if (effect.value !== undefined) jsonEffect.value = effect.value;

  if (effect.targetCount !== undefined || effect.targetType || effect.targetLocation) {
    jsonEffect.target = {
      count: effect.targetCount ?? 1,
      owner: "opponent",
      selectionMode: "choose",
      zone: (effect.targetLocation as TargetZone) ?? "board",
    };
    if (effect.targetType) {
      (jsonEffect.target as JsonTarget).cardType =
        effect.targetType === "monster" ? "stereotype" : effect.targetType;
    }
  }

  if (effect.condition) {
    const converted = convertLegacyConditionExtended(effect.condition);
    if (converted) jsonEffect.activationCondition = converted;
  }

  if (effect.continuous !== undefined) jsonEffect.isContinuous = effect.continuous;
  if (effect.isOPT !== undefined) jsonEffect.isOPT = effect.isOPT;

  if (effect.cost) {
    jsonEffect.cost = {
      type: effect.cost.type as JsonCostType,
      value: effect.cost.value,
      target: effect.cost.targetType
        ? { location: "hand", count: effect.cost.value ?? 1, type: effect.cost.targetType }
        : undefined,
    };
  }

  if (effect.protection) {
    jsonEffect.protection = {
      cannotBeDestroyedByBattle: effect.protection.cannotBeDestroyedByBattle,
      cannotBeDestroyedByEffects: effect.protection.cannotBeDestroyedByEffects,
      cannotBeTargeted: effect.protection.cannotBeTargeted,
    };
  }

  return jsonEffect;
}
