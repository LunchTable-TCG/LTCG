/**
 * @module @ltcg/core/types/card-logic
 *
 * Core domain types for card effects, abilities, and costs.
 */

// ============================================================================
// Core Logic Types
// ============================================================================

/**
 * Effect types supported by the game
 */
/**
 * Supported effect types
 */
export type EffectType =
  | "draw"
  | "destroy"
  | "damage"
  | "gainLP"
  | "modifyATK"
  | "modifyDEF"
  | "summon"
  | "toHand"
  | "toGraveyard"
  | "banish"
  | "search"
  | "negate"
  | "directAttack"
  | "mill"
  | "discard"
  | "multipleAttack"
  | "returnToDeck"
  | "changePosition"
  | "piercing"
  | string; // Allow unknown types for extensibility

/**
 * Condition for activation/targeting
 */
export interface JsonCondition {
  type?: string;
  [key: string]: unknown;
}

/**
 * Summon restriction
 */
export interface JsonSummonRestriction {
  type?: string;
  [key: string]: unknown;
}

/**
 * Continuous effect definition
 */
export interface ContinuousEffectDefinition {
  type?: string;
  [key: string]: unknown;
}

/**
 * Protection definition
 */
export interface JsonProtection {
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  cannotBeAffectedByEffects?: boolean;
  cannotBeTributed?: boolean;
  cannotBeBanished?: boolean;
  cannotBeReturnedToHand?: boolean;
  cannotBeReturnedToDeck?: boolean;
  [key: string]: unknown;
}

/**
 * Trigger conditions for effects
 */
export type TriggerCondition =
  | "on_summon"
  | "on_opponent_summon"
  | "on_destroy"
  | "on_flip"
  | "on_battle_damage"
  | "on_battle_destroy"
  | "on_battle_attacked"
  | "on_battle_start"
  | "on_draw"
  | "on_end"
  | "manual"
  | "continuous"
  | "quick"
  | string; // Allow unknown triggers

/**
 * Cost types for effect activation
 */
export type CostType =
  | "discard"
  | "pay_lp"
  | "tribute"
  | "banish"
  | "banish_from_gy"
  | "send_to_gy"
  | "return_to_deck"
  | string;

/**
 * JSON Cost definition from backend
 */
export interface JsonCost {
  type: CostType;
  value?: number;
  target?: {
    location?: string;
    zone?: string;
    count?: number;
    type?: string;
    cardType?: string;
  };
  isOptional?: boolean;
  optional?: boolean;
}

/**
 * Activation type for effects
 */
export type ActivationType = "trigger" | "ignition" | "quick" | "continuous";

/**
 * JSON Effect definition from backend (simplified for frontend)
 */
export interface JsonEffect {
  type?: EffectType;
  effectType?: EffectType;
  trigger?: TriggerCondition;
  activationType?: ActivationType;
  name?: string;
  description?: string;
  value?: number;
  count?: number;
  cost?: JsonCost;
  isOPT?: boolean;
  isHOPT?: boolean;
  isHardOPT?: boolean;
  isContinuous?: boolean;
  continuous?: boolean;
  spellSpeed?: 1 | 2 | 3;
  target?: {
    count?: number | "all";
    zone?: string;
    location?: string;
    owner?: string;
    cardType?: string;
    type?: string;
  };
  protection?: {
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
  };
  then?: JsonEffect;
  else?: JsonEffect;
}

/**
 * JSON Ability definition from backend (the main ability object on cards)
 */
export interface JsonAbility {
  // Identity
  id?: string;
  name?: string;
  schemaVersion?: number;

  effects: JsonEffect[];
  trigger?: TriggerCondition;
  activationCondition?: JsonCondition;
  cost?: JsonCost;

  // Restrictions
  isOPT?: boolean;
  isHOPT?: boolean;
  isHardOPT?: boolean;
  isContinuous?: boolean;
  spellSpeed?: 1 | 2 | 3;

  protection?: JsonProtection;

  passiveProtection?: JsonProtection;

  continuousModifiers?: ContinuousEffectDefinition[];
  summonRestriction?: JsonSummonRestriction;

  // Restrictions while on field
  restrictions?: {
    cannotAttackDirectly?: boolean;
    mustAttack?: boolean;
    cannotChangePosition?: boolean;
    cannotActivate?: JsonCondition;
    othersCannotAttack?: boolean;
    cannotSpecialSummon?: boolean;
    cannotDraw?: boolean;
  };
}

/**
 * Display-friendly effect format for UI components
 */
export interface DisplayEffect {
  name: string;
  description: string;
  effectType?: string;
  trigger?: string;
  activationType?: ActivationType;
  cost?: {
    type: string;
    value?: number;
    description: string;
  };
  isOPT?: boolean;
  isHOPT?: boolean;
  spellSpeed?: 1 | 2 | 3;
  isContinuous?: boolean;
}
