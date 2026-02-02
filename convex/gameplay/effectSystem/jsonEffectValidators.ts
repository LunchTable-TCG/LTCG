/**
 * JSON Effect Validators
 *
 * Convex validators for JSON-based card effect definitions.
 * These validators enable storing JSON abilities directly in the database schema
 * with full type safety and runtime validation.
 *
 * Usage:
 * - Import validators into schema.ts to add jsonAbility field to cardDefinitions
 * - Import into mutations/queries that handle JSON effects
 * - Use for validating effect definitions from spreadsheet imports
 */

import { v } from "convex/values";
import type { Infer } from "convex/values";

// ============================================================================
// BASIC TYPE VALIDATORS
// ============================================================================

/**
 * Effect type validator (all supported effect types)
 */
export const effectTypeValidator = v.union(
  v.literal("draw"),
  v.literal("destroy"),
  v.literal("damage"),
  v.literal("gainLP"),
  v.literal("modifyATK"),
  v.literal("modifyDEF"),
  v.literal("summon"),
  v.literal("toHand"),
  v.literal("toGraveyard"),
  v.literal("banish"),
  v.literal("search"),
  v.literal("negate"),
  v.literal("directAttack"),
  v.literal("mill"),
  v.literal("discard"),
  v.literal("multipleAttack"),
  v.literal("returnToDeck"),
  v.literal("copy"),
  v.literal("shuffle"),
  v.literal("reveal"),
  v.literal("swap"),
  v.literal("transform"),
  v.literal("skip"),
  v.literal("extraNormalSummon"),
  v.literal("changePosition"),
  v.literal("equip"),
  v.literal("counter"),
  v.literal("nothing")
);
export type EffectTypeInfer = Infer<typeof effectTypeValidator>;

/**
 * Trigger condition validator
 */
export const triggerConditionValidator = v.union(
  // Base triggers
  v.literal("on_summon"),
  v.literal("on_opponent_summon"),
  v.literal("on_destroy"),
  v.literal("on_flip"),
  v.literal("on_battle_damage"),
  v.literal("on_battle_destroy"),
  v.literal("on_battle_attacked"),
  v.literal("on_battle_start"),
  v.literal("on_draw"),
  v.literal("on_end"),
  v.literal("manual"),
  // Extended triggers
  v.literal("on_normal_summon"),
  v.literal("on_special_summon"),
  v.literal("on_flip_summon"),
  v.literal("on_destroy_by_battle"),
  v.literal("on_destroy_by_effect"),
  v.literal("on_sent_to_gy"),
  v.literal("on_banished"),
  v.literal("on_returned_to_hand"),
  v.literal("on_targeted"),
  v.literal("on_opponent_normal_summon"),
  v.literal("on_opponent_special_summon"),
  v.literal("on_opponent_draws"),
  v.literal("on_opponent_activates"),
  v.literal("on_opponent_attacks"),
  v.literal("on_standby"),
  v.literal("on_main1_start"),
  v.literal("on_main2_start"),
  v.literal("on_battle_end"),
  v.literal("on_turn_start"),
  v.literal("on_turn_end"),
  v.literal("on_opponent_turn_start"),
  v.literal("on_opponent_turn_end"),
  v.literal("on_chain_start"),
  v.literal("on_chain_link"),
  v.literal("on_chain_resolve"),
  v.literal("on_spell_activated"),
  v.literal("on_trap_activated"),
  v.literal("on_effect_activated"),
  v.literal("on_damage_calculation"),
  v.literal("quick"),
  v.literal("continuous"),
  v.literal("while_in_gy"),
  v.literal("while_banished")
);
export type TriggerConditionInfer = Infer<typeof triggerConditionValidator>;

/**
 * Target zone validator
 */
export const targetZoneValidator = v.union(
  v.literal("hand"),
  v.literal("deck"),
  v.literal("graveyard"),
  v.literal("banished"),
  v.literal("board"),
  v.literal("spell_trap"),
  v.literal("field_spell"),
  v.literal("extra_deck"),
  v.literal("anywhere"),
  v.literal("monster") // For fieldCount zones
);
export type TargetZoneInfer = Infer<typeof targetZoneValidator>;

/**
 * Target owner validator
 */
export const targetOwnerValidator = v.union(
  v.literal("self"),
  v.literal("opponent"),
  v.literal("both"),
  v.literal("any")
);
export type TargetOwnerInfer = Infer<typeof targetOwnerValidator>;

/**
 * Target type validator
 */
export const targetTypeValidator = v.union(
  v.literal("monster"),
  v.literal("spell"),
  v.literal("trap"),
  v.literal("any"),
  v.literal("card"),
  v.literal("creature")
);
export type TargetTypeInfer = Infer<typeof targetTypeValidator>;

/**
 * Selection mode validator
 */
export const selectionModeValidator = v.union(
  v.literal("choose"),
  v.literal("random"),
  v.literal("all"),
  v.literal("highest_atk"),
  v.literal("lowest_atk"),
  v.literal("highest_def"),
  v.literal("lowest_def"),
  v.literal("first"),
  v.literal("last")
);
export type SelectionModeInfer = Infer<typeof selectionModeValidator>;

/**
 * Cost type validator
 */
export const costTypeValidator = v.union(
  v.literal("discard"),
  v.literal("pay_lp"),
  v.literal("tribute"),
  v.literal("banish"),
  v.literal("banish_from_gy"),
  v.literal("banish_from_hand"),
  v.literal("return_to_deck"),
  v.literal("send_to_gy"),
  v.literal("destroy"),
  v.literal("reduce_atk"),
  v.literal("skip_phase"),
  v.literal("skip_battle"),
  v.literal("no_normal_summon"),
  v.literal("reveal"),
  v.literal("detach")
);
export type CostTypeInfer = Infer<typeof costTypeValidator>;

/**
 * Duration type validator
 */
export const durationTypeValidator = v.union(
  v.literal("instant"),
  v.literal("until_end_of_turn"),
  v.literal("until_end_of_phase"),
  v.literal("until_end_of_battle"),
  v.literal("until_next_turn"),
  v.literal("until_next_standby"),
  v.literal("permanent"),
  v.literal("turns"),
  v.literal("turn"),
  v.literal("phase"),
  v.literal("battle")
);
export type DurationTypeInfer = Infer<typeof durationTypeValidator>;

/**
 * Card attribute validator
 */
export const cardAttributeValidator = v.union(
  v.literal("fire"),
  v.literal("water"),
  v.literal("earth"),
  v.literal("wind"),
  v.literal("light"),
  v.literal("dark"),
  v.literal("divine"),
  v.literal("neutral")
);
export type CardAttributeInfer = Infer<typeof cardAttributeValidator>;

/**
 * Card archetype validator
 */
export const cardArchetypeValidator = v.union(
  v.literal("infernal_dragons"),
  v.literal("abyssal_horrors"),
  v.literal("nature_spirits"),
  v.literal("storm_elementals"),
  v.literal("shadow_assassins"),
  v.literal("celestial_guardians"),
  v.literal("undead_legion"),
  v.literal("divine_knights"),
  v.literal("arcane_mages"),
  v.literal("mechanical_constructs"),
  v.literal("neutral"),
  v.literal("fire"),
  v.literal("water"),
  v.literal("earth"),
  v.literal("wind")
);
export type CardArchetypeInfer = Infer<typeof cardArchetypeValidator>;

/**
 * Monster type validator (industry-standard TCG types)
 */
export const monsterTypeValidator = v.union(
  v.literal("dragon"),
  v.literal("spellcaster"),
  v.literal("warrior"),
  v.literal("beast"),
  v.literal("fiend"),
  v.literal("zombie"),
  v.literal("machine"),
  v.literal("aqua"),
  v.literal("pyro"),
  v.literal("divine_beast")
);
export type MonsterTypeInfer = Infer<typeof monsterTypeValidator>;

/**
 * Spell type validator
 */
export const spellTypeValidator = v.union(
  v.literal("normal"),
  v.literal("quick_play"),
  v.literal("continuous"),
  v.literal("field"),
  v.literal("equip"),
  v.literal("ritual")
);
export type SpellTypeInfer = Infer<typeof spellTypeValidator>;

/**
 * Trap type validator
 */
export const trapTypeValidator = v.union(
  v.literal("normal"),
  v.literal("continuous"),
  v.literal("counter")
);
export type TrapTypeInfer = Infer<typeof trapTypeValidator>;

/**
 * Position validator
 */
export const positionValidator = v.union(
  v.literal("attack"),
  v.literal("defense"),
  v.literal("facedown"),
  v.literal("any")
);
export type PositionInfer = Infer<typeof positionValidator>;

/**
 * Game phase validator
 */
export const phaseValidator = v.union(
  v.literal("draw"),
  v.literal("standby"),
  v.literal("main1"),
  v.literal("battle_start"),
  v.literal("battle"),
  v.literal("battle_end"),
  v.literal("main2"),
  v.literal("end")
);
export type PhaseInfer = Infer<typeof phaseValidator>;

/**
 * Comparison operator validator
 */
export const comparisonOperatorValidator = v.union(
  v.literal("eq"),
  v.literal("ne"),
  v.literal("lt"),
  v.literal("lte"),
  v.literal("gt"),
  v.literal("gte")
);
export type ComparisonOperatorInfer = Infer<typeof comparisonOperatorValidator>;

// ============================================================================
// COMPLEX TYPE VALIDATORS
// ============================================================================

/**
 * Numeric range validator
 */
export const numericRangeValidator = v.object({
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  operator: v.optional(comparisonOperatorValidator),
});
export type NumericRangeInfer = Infer<typeof numericRangeValidator>;

/**
 * Numeric value or range validator
 */
export const numericOrRangeValidator = v.union(v.number(), numericRangeValidator);

/**
 * Field count condition validator
 */
export const fieldCountConditionValidator = v.object({
  zone: v.union(
    v.literal("monster"),
    v.literal("spell_trap"),
    v.literal("field"),
    v.literal("all"),
    targetZoneValidator
  ),
  owner: targetOwnerValidator,
  count: numericOrRangeValidator,
  filter: v.optional(v.any()), // Recursive - will be JsonCondition
});
export type FieldCountConditionInfer = Infer<typeof fieldCountConditionValidator>;

/**
 * Graveyard condition validator
 */
export const graveyardConditionValidator = v.object({
  owner: targetOwnerValidator,
  count: v.optional(numericOrRangeValidator),
  contains: v.optional(v.any()), // Card property filter
});
export type GraveyardConditionInfer = Infer<typeof graveyardConditionValidator>;

/**
 * Banished condition validator
 */
export const banishedConditionValidator = v.object({
  owner: targetOwnerValidator,
  count: v.optional(numericOrRangeValidator),
  contains: v.optional(v.any()), // Card property filter
});
export type BanishedConditionInfer = Infer<typeof banishedConditionValidator>;

/**
 * JSON Condition validator
 *
 * Note: Uses v.any() for nested conditions due to recursive type limitations
 * in Convex validators. Runtime type checking should be performed in application code.
 */
export const jsonConditionValidator = v.object({
  // Compound conditions
  type: v.optional(v.union(v.literal("and"), v.literal("or"), v.literal("not"))),
  conditions: v.optional(v.array(v.any())), // Recursive JsonCondition[]
  negate: v.optional(v.boolean()),

  // Card properties
  archetype: v.optional(v.union(v.string(), v.array(v.string()))),
  attribute: v.optional(v.union(cardAttributeValidator, v.array(cardAttributeValidator))),
  cardType: v.optional(
    v.union(v.literal("creature"), v.literal("spell"), v.literal("trap"), v.literal("equipment"))
  ),
  monsterType: v.optional(v.union(monsterTypeValidator, v.array(monsterTypeValidator))),
  spellType: v.optional(v.union(spellTypeValidator, v.array(spellTypeValidator))),
  trapType: v.optional(v.union(trapTypeValidator, v.array(trapTypeValidator))),
  level: v.optional(numericOrRangeValidator),
  attack: v.optional(numericOrRangeValidator),
  defense: v.optional(numericOrRangeValidator),
  cost: v.optional(numericOrRangeValidator),
  rarity: v.optional(v.union(v.string(), v.array(v.string()))),
  position: v.optional(v.union(v.literal("attack"), v.literal("defense"))),
  isFaceDown: v.optional(v.boolean()),
  hasAttacked: v.optional(v.boolean()),

  // Name conditions
  nameContains: v.optional(v.string()),
  nameEquals: v.optional(v.string()),

  // Player state
  lpBelow: v.optional(v.number()),
  lpAbove: v.optional(v.number()),
  lpEqual: v.optional(v.number()),
  lpComparison: v.optional(v.union(v.literal("higher"), v.literal("lower"), v.literal("equal"))),
  hasNormalSummoned: v.optional(v.boolean()),

  // Board state
  fieldCount: v.optional(fieldCountConditionValidator),
  graveyardContains: v.optional(graveyardConditionValidator),
  banishedContains: v.optional(banishedConditionValidator),
  zoneEmpty: v.optional(
    v.object({
      zone: targetZoneValidator,
      owner: targetOwnerValidator,
    })
  ),

  // Game state
  turnNumber: v.optional(numericOrRangeValidator),
  phase: v.optional(phaseValidator),
  turnOwner: v.optional(v.union(v.literal("self"), v.literal("opponent"))),

  // Event conditions
  summonedBy: v.optional(
    v.union(
      v.literal("normal"),
      v.literal("special"),
      v.literal("flip"),
      v.literal("tribute"),
      v.literal("any")
    )
  ),
  destroyedBy: v.optional(v.union(v.literal("battle"), v.literal("effect"), v.literal("any"))),
  summonedFrom: v.optional(targetZoneValidator),
  eventCausedBy: v.optional(v.union(v.literal("self"), v.literal("opponent"))),
  wasFlipped: v.optional(v.boolean()),

  // Chain conditions
  chainLength: v.optional(numericRangeValidator),

  // Ownership
  owner: v.optional(v.union(v.literal("self"), v.literal("opponent"))),

  // Protection checks
  canBeTargeted: v.optional(v.boolean()),
  canBeDestroyedByBattle: v.optional(v.boolean()),
  canBeDestroyedByEffects: v.optional(v.boolean()),
});
export type JsonConditionInfer = Infer<typeof jsonConditionValidator>;

/**
 * JSON Target validator
 */
export const jsonTargetValidator = v.object({
  zone: v.optional(targetZoneValidator),
  location: v.optional(targetZoneValidator),
  owner: v.optional(targetOwnerValidator),
  cardType: v.optional(targetTypeValidator),
  type: v.optional(targetTypeValidator),
  archetype: v.optional(v.union(v.string(), v.array(v.string()))),
  attribute: v.optional(v.union(cardAttributeValidator, v.array(cardAttributeValidator))),
  monsterType: v.optional(v.union(monsterTypeValidator, v.array(monsterTypeValidator))),
  spellType: v.optional(v.union(spellTypeValidator, v.array(spellTypeValidator))),
  trapType: v.optional(v.union(trapTypeValidator, v.array(trapTypeValidator))),
  position: v.optional(v.union(positionValidator, v.literal("facedown"))),
  level: v.optional(numericOrRangeValidator),
  attack: v.optional(numericOrRangeValidator),
  defense: v.optional(numericOrRangeValidator),
  rarity: v.optional(v.union(v.string(), v.array(v.string()))),
  count: v.optional(v.union(v.number(), v.literal("all"))),
  minCount: v.optional(v.number()),
  maxCount: v.optional(v.number()),
  selectionMode: v.optional(selectionModeValidator),
  optional: v.optional(v.boolean()),
  excludeSelf: v.optional(v.boolean()),
  excludeFaceDown: v.optional(v.boolean()),
  nameContains: v.optional(v.string()),
  nameEquals: v.optional(v.string()),
  condition: v.optional(jsonConditionValidator),
  filter: v.optional(jsonConditionValidator),
  forEachMultiplier: v.optional(v.number()),
});
export type JsonTargetInfer = Infer<typeof jsonTargetValidator>;

/**
 * JSON Cost validator
 */
export const jsonCostValidator = v.object({
  type: costTypeValidator,
  value: v.optional(v.number()),
  target: v.optional(
    v.object({
      location: v.optional(targetZoneValidator),
      zone: v.optional(targetZoneValidator),
      count: v.optional(v.number()),
      type: v.optional(targetTypeValidator),
      cardType: v.optional(targetTypeValidator),
      filter: v.optional(jsonConditionValidator),
      selection: v.optional(
        v.union(v.literal("player_choice"), v.literal("specific"), v.literal("random"))
      ),
    })
  ),
  isOptional: v.optional(v.boolean()),
  optional: v.optional(v.boolean()),
  alternative: v.optional(v.any()), // Recursive JsonCost
});
export type JsonCostInfer = Infer<typeof jsonCostValidator>;

/**
 * JSON Protection validator
 */
export const jsonProtectionValidator = v.object({
  cannotBeDestroyedByBattle: v.optional(v.boolean()),
  cannotBeDestroyedByEffects: v.optional(v.boolean()),
  cannotBeTargeted: v.optional(v.boolean()),
  cannotBeAttacked: v.optional(v.boolean()),
  immuneTo: v.optional(v.array(effectTypeValidator)),
  cannotChangeStats: v.optional(v.boolean()),
  cannotChangePosition: v.optional(v.boolean()),
  cannotBeTributed: v.optional(v.boolean()),
  cannotBeBanished: v.optional(v.boolean()),
  cannotBeReturned: v.optional(v.boolean()),
  condition: v.optional(jsonConditionValidator),
});
export type JsonProtectionInfer = Infer<typeof jsonProtectionValidator>;

/**
 * JSON Duration validator
 */
export const jsonDurationValidator = v.object({
  type: durationTypeValidator,
  turnCount: v.optional(v.number()),
  countOwner: v.optional(v.union(v.literal("self"), v.literal("opponent"), v.literal("both"))),
  expirePhase: v.optional(phaseValidator),
});
export type JsonDurationInfer = Infer<typeof jsonDurationValidator>;

/**
 * JSON Value Calculation validator
 */
export const jsonValueCalculationValidator = v.object({
  base: v.optional(v.number()),
  perCard: v.optional(
    v.object({
      location: targetZoneValidator,
      owner: targetOwnerValidator,
      filter: v.optional(jsonConditionValidator),
      multiplier: v.number(),
    })
  ),
  fromStat: v.optional(
    v.object({
      source: v.union(
        v.literal("this"),
        v.literal("target"),
        v.literal("highest_on_field"),
        v.literal("lowest_on_field")
      ),
      stat: v.union(
        v.literal("attack"),
        v.literal("defense"),
        v.literal("level"),
        v.literal("original_attack"),
        v.literal("original_defense")
      ),
      modifier: v.optional(v.number()),
      multiplier: v.optional(v.number()),
    })
  ),
  fromLPDifference: v.optional(
    v.object({
      multiplier: v.number(),
      max: v.optional(v.number()),
    })
  ),
  fromGraveyardCount: v.optional(
    v.object({
      owner: targetOwnerValidator,
      filter: v.optional(jsonConditionValidator),
      multiplier: v.number(),
      max: v.optional(v.number()),
    })
  ),
  fromBanishedCount: v.optional(
    v.object({
      owner: targetOwnerValidator,
      filter: v.optional(jsonConditionValidator),
      multiplier: v.number(),
      max: v.optional(v.number()),
    })
  ),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
});
export type JsonValueCalculationInfer = Infer<typeof jsonValueCalculationValidator>;

/**
 * JSON Generic Effect validator
 *
 * This is the most flexible effect format, supporting all effect types
 * with optional fields for maximum designer flexibility.
 */
export const jsonGenericEffectValidator = v.object({
  // Effect identity
  type: v.optional(effectTypeValidator),
  effectType: v.optional(effectTypeValidator),
  effectId: v.optional(v.string()),
  name: v.optional(v.string()),
  description: v.optional(v.string()),

  // Trigger
  trigger: v.optional(triggerConditionValidator),

  // Activation
  activationCondition: v.optional(jsonConditionValidator),
  condition: v.optional(jsonConditionValidator),

  // Value
  value: v.optional(v.number()),
  count: v.optional(v.number()),
  valueCalculation: v.optional(jsonValueCalculationValidator),

  // Target
  target: v.optional(jsonTargetValidator),
  targetCount: v.optional(v.number()),
  targetType: v.optional(targetTypeValidator),
  targetLocation: v.optional(targetZoneValidator),
  targetOwner: v.optional(targetOwnerValidator),

  // Cost
  cost: v.optional(jsonCostValidator),

  // Restrictions
  isOPT: v.optional(v.boolean()),
  isHardOPT: v.optional(v.boolean()),
  isHOPT: v.optional(v.boolean()),
  spellSpeed: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),

  // Duration
  duration: v.optional(v.union(durationTypeValidator, jsonDurationValidator)),
  isContinuous: v.optional(v.boolean()),
  continuous: v.optional(v.boolean()),
  isQuickEffect: v.optional(v.boolean()),

  // Protection
  protection: v.optional(jsonProtectionValidator),

  // Chaining (recursive - use v.any())
  then: v.optional(v.any()),
  else: v.optional(v.any()),
  immediately: v.optional(v.any()),

  // Special flags
  canMissTiming: v.optional(v.boolean()),
  isMandatory: v.optional(v.boolean()),
  isOptional: v.optional(v.boolean()),
  doesTarget: v.optional(v.boolean()),
  doesDestroy: v.optional(v.boolean()),
  canBeNegated: v.optional(v.boolean()),

  // Effect-specific fields
  position: v.optional(
    v.union(positionValidator, v.literal("top"), v.literal("bottom"), v.literal("shuffle"))
  ),
  newPosition: v.optional(v.union(v.literal("attack"), v.literal("defense"))),
  reveal: v.optional(v.boolean()),
  destroyAfter: v.optional(v.boolean()),
  faceDown: v.optional(v.boolean()),

  // Stat modification fields (for modifyATK/modifyDEF)
  statTarget: v.optional(
    v.union(v.literal("self"), v.literal("target"), v.literal("all_matching"))
  ),
  statCondition: v.optional(v.any()), // JsonCondition for filtering which cards get stat mods

  // Negate effect fields
  negateType: v.optional(
    v.union(v.literal("activation"), v.literal("effect"), v.literal("summon"), v.literal("attack"))
  ),
});
export type JsonGenericEffectInfer = Infer<typeof jsonGenericEffectValidator>;

/**
 * JSON Effect Node validator (effect with then/else branches)
 */
export const jsonEffectNodeValidator = v.object({
  effect: jsonGenericEffectValidator,
  then: v.optional(v.array(v.any())), // Recursive JsonEffectNode[]
  else: v.optional(v.array(v.any())), // Recursive JsonEffectNode[]
});
export type JsonEffectNodeInfer = Infer<typeof jsonEffectNodeValidator>;

/**
 * JSON ForEach Effect validator
 */
export const jsonForEachEffectValidator = v.object({
  forEach: jsonTargetValidator,
  do: v.array(v.any()), // JsonEffectNode[]
  limit: v.optional(v.number()),
});
export type JsonForEachEffectInfer = Infer<typeof jsonForEachEffectValidator>;

/**
 * Summon restriction validator
 */
export const jsonSummonRestrictionValidator = v.object({
  cannotNormalSummon: v.optional(v.boolean()),
  cannotSet: v.optional(v.boolean()),
  requiresTribute: v.optional(v.number()),
  specialSummonOnly: v.optional(v.boolean()),
  summonMethod: v.optional(
    v.union(
      v.literal("fusion"),
      v.literal("ritual"),
      v.literal("synchro"),
      v.literal("xyz"),
      v.literal("link"),
      v.literal("pendulum"),
      v.literal("effect")
    )
  ),
  mustBeProperlyFirstSummoned: v.optional(v.boolean()),
  specialSummonCondition: v.optional(jsonConditionValidator),
  materials: v.optional(
    v.object({
      minCount: v.optional(v.number()),
      maxCount: v.optional(v.number()),
      exactCount: v.optional(v.number()),
      filter: v.optional(jsonConditionValidator),
    })
  ),
});
export type JsonSummonRestrictionInfer = Infer<typeof jsonSummonRestrictionValidator>;

/**
 * Continuous effect definition validator
 */
export const continuousEffectDefinitionValidator = v.object({
  effectType: v.union(
    v.literal("modifyATK"),
    v.literal("modifyDEF"),
    v.literal("protection"),
    v.literal("restriction")
  ),
  value: v.optional(v.number()),
  valueCalculation: v.optional(jsonValueCalculationValidator),
  condition: v.optional(jsonConditionValidator),
  target: v.object({
    owner: targetOwnerValidator,
    filter: v.optional(jsonConditionValidator),
  }),
  protection: v.optional(jsonProtectionValidator),
});
export type ContinuousEffectDefinitionInfer = Infer<typeof continuousEffectDefinitionValidator>;

// ============================================================================
// MAIN JSON ABILITY VALIDATOR
// ============================================================================

/**
 * Complete JSON Ability validator
 *
 * This is the main validator for storing card abilities in the database.
 * Use this in the cardDefinitions schema to enable JSON-based abilities.
 */
export const jsonAbilityValidator = v.object({
  // Identity
  id: v.optional(v.string()),
  name: v.optional(v.string()),
  schemaVersion: v.optional(v.number()),

  // Trigger & activation
  trigger: v.optional(triggerConditionValidator),
  activationCondition: v.optional(jsonConditionValidator),
  cost: v.optional(jsonCostValidator),

  // Restrictions
  isOPT: v.optional(v.boolean()),
  isHOPT: v.optional(v.boolean()),
  isHardOPT: v.optional(v.boolean()),
  spellSpeed: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
  isContinuous: v.optional(v.boolean()),

  // Effects (using v.any() due to recursive/union complexity)
  effects: v.array(v.any()),

  // Summoning
  summonRestriction: v.optional(jsonSummonRestrictionValidator),

  // Restrictions while on field
  restrictions: v.optional(
    v.object({
      cannotAttackDirectly: v.optional(v.boolean()),
      mustAttack: v.optional(v.boolean()),
      cannotChangePosition: v.optional(v.boolean()),
      cannotActivate: v.optional(jsonConditionValidator),
      othersCannotAttack: v.optional(v.boolean()),
      cannotSpecialSummon: v.optional(v.boolean()),
      cannotDraw: v.optional(v.boolean()),
    })
  ),

  // Protection
  protection: v.optional(jsonProtectionValidator),
  passiveProtection: v.optional(jsonProtectionValidator),

  // Continuous modifiers
  continuousModifiers: v.optional(v.array(continuousEffectDefinitionValidator)),
});
export type JsonAbilityInfer = Infer<typeof jsonAbilityValidator>;

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Simplified validators for common use cases
 */
export const validators = {
  // Basic types
  effectType: effectTypeValidator,
  trigger: triggerConditionValidator,
  zone: targetZoneValidator,
  owner: targetOwnerValidator,
  targetType: targetTypeValidator,
  selection: selectionModeValidator,
  costType: costTypeValidator,
  duration: durationTypeValidator,
  attribute: cardAttributeValidator,
  archetype: cardArchetypeValidator,
  monsterType: monsterTypeValidator,
  spellType: spellTypeValidator,
  trapType: trapTypeValidator,
  position: positionValidator,
  phase: phaseValidator,
  comparison: comparisonOperatorValidator,

  // Complex types
  numericRange: numericRangeValidator,
  condition: jsonConditionValidator,
  target: jsonTargetValidator,
  cost: jsonCostValidator,
  protection: jsonProtectionValidator,
  durationObj: jsonDurationValidator,
  valueCalc: jsonValueCalculationValidator,
  effect: jsonGenericEffectValidator,
  effectNode: jsonEffectNodeValidator,
  forEach: jsonForEachEffectValidator,
  summonRestriction: jsonSummonRestrictionValidator,
  continuousEffect: continuousEffectDefinitionValidator,

  // Main validator
  ability: jsonAbilityValidator,
};

export default validators;
