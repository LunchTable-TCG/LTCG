/**
 * Effect System - Public API
 *
 * Exports all public types, parsers, and executors.
 */

// Export all types from main types file
export * from "./types";

// Export JSON schema types (only non-conflicting exports)
export {
  // Type guards and utilities
  isCompoundCondition,
  isNumericRange,
  isJsonCondition,
  convertLegacyCondition,
  isForEachEffect,
  // Types unique to jsonEffectSchema
  type CardOnBoard,
  type CardInfo,
  type ConditionContext,
  type ContinuousEffectDefinition,
  type FieldCountCondition,
  type GraveyardCondition,
  type CardAttribute,
  type CompoundConditionType,
  type TargetZone,
  type SelectionMode,
  type JsonCostType,
  type JsonEffectNode,
  type JsonForEachEffect,
  type JsonDrawEffect,
  type JsonDestroyEffect,
  type JsonDamageEffect,
  type JsonGainLPEffect,
  type JsonModifyATKEffect,
  type JsonModifyDEFEffect,
  type JsonSummonEffect,
  type JsonToHandEffect,
  type JsonToGraveyardEffect,
  type JsonBanishEffect,
  type JsonSearchEffect,
  type JsonNegateEffect,
  type JsonMillEffect,
  type JsonDiscardEffect,
  type JsonDirectAttackEffect,
  type JsonMultipleAttackEffect,
  type GameEvent,
  type CardInHand,
} from "./jsonEffectSchema";

// Export unified parser (JSON-only)
export { parseUnifiedAbility } from "./parser";

// Export JSON parser functions
export {
  parseJsonAbility,
  parseJsonEffect,
  evaluateCondition,
  evaluateFieldCount,
  evaluateArchetypeMatch,
  evaluateLevelRange,
  flattenEffectChain,
  isJsonAbility,
  parseConditionString,
} from "./jsonParser";

// Export executor functions
export { executeEffect, executeMultiPartAbility } from "./executor";

// Export cost validation
export { validateCost, executeCost } from "./costValidator";

// Export continuous effects evaluation
export {
  calculateContinuousModifiers,
  getActiveContinuousEffects,
  evaluateJsonCondition,
  evaluateFieldCount as evaluateContinuousFieldCount,
  evaluateGraveyardContains,
  evaluateAttribute,
  evaluateCardType,
  calculateContinuousModifiersSync,
} from "./continuousEffects";
