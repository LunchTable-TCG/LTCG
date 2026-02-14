/**
 * Effect System Types
 *
 * Type definitions for card effects, triggers, and abilities.
 * Supports both legacy text-parsed effects and new JSON-based effect definitions.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

// ============================================================================
// CORE EFFECT TYPES
// ============================================================================

/**
 * Lingering effect value types
 */
export type LingeringEffectValue =
  | number // For stat modifications (ATK/DEF changes)
  | {
      // For complex effects like preventActivation
      targetType?: "spell" | "trap" | "stereotype" | "class" | "any";
      condition?: JsonCondition;
    };

/**
 * Lingering effect that persists for a duration
 */
export interface LingeringEffect {
  effectType: string; // Type of lingering effect (modifyATK, preventActivation, etc.)
  value: LingeringEffectValue; // Effect value (number for stat mods, object for complex effects)
  sourceCardId?: Id<"cardDefinitions">; // Card that created this effect
  sourceCardName?: string; // Name of source card for display
  appliedBy: Id<"users">; // Player who applied the effect
  appliedTurn: number; // Turn number when applied
  duration: {
    type: "until_end_phase" | "until_turn_end" | "until_next_turn" | "permanent" | "custom";
    endTurn?: number; // Specific turn number when effect expires
    endPhase?: string; // Specific phase when effect expires
  };
  affectsPlayer?: "host" | "opponent" | "both"; // Which player(s) are affected
  conditions?: JsonCondition; // Optional conditions for effect application
}

export type EffectType =
  | "draw" // Draw X cards
  | "destroy" // Destroy target card(s)
  | "damage" // Deal X damage to player
  | "gainLP" // Gain X LP
  | "modifyATK" // Modify ATK
  | "modifyDEF" // Modify DEF
  | "summon" // Special summon
  | "toHand" // Add card to hand
  | "toGraveyard" // Send card to GY
  | "banish" // Banish card
  | "search" // Search deck
  | "negate" // Negate activation/effect (effect negation)
  | "negateActivation" // Negate activation and optionally destroy
  | "directAttack" // Allows direct attack under condition (passive, checked in combatSystem)
  | "mill" // Send cards from top of deck to GY
  | "discard" // Discard cards from hand to GY
  | "multipleAttack" // Allow multiple attacks per turn (passive)
  | "generateToken" // Generate monster token(s) on field
  | "piercing"; // Piercing damage

export type TriggerCondition =
  | "on_summon" // When this card is summoned
  | "on_opponent_summon" // When opponent summons a monster
  | "on_destroy" // When this card is destroyed
  | "on_destroy_by_battle" // When destroyed by battle specifically
  | "on_destroy_by_effect" // When destroyed by card effect specifically
  | "on_flip" // When this card is flipped
  | "on_battle_damage" // When this card inflicts battle damage
  | "on_battle_destroy" // When this card destroys a monster by battle
  | "on_battle_attacked" // When this card is attacked
  | "on_combat_start" // At the start of the Combat Phase
  | "on_attack" // When this card declares an attack
  | "on_enter_combat_phase" // When Combat Phase begins
  | "on_draw" // During draw phase
  | "on_end" // During end phase
  | "on_opponent_attacks" // When opponent declares an attack
  | "on_opponent_activates" // When opponent activates a card
  | "on_main_start" // At start of Main Phase
  | "on_combat_start" // At start of Combat Phase
  | "on_combat_end" // At end of Combat Phase
  | "on_breakdown_check" // During Breakdown Check Phase
  | "on_turn_start" // At start of turn
  | "on_turn_end" // At end of turn
  | "on_opponent_turn_start" // At start of opponent's turn
  | "on_opponent_turn_end" // At end of opponent's turn
  | "on_chain_start" // When a chain starts
  | "on_chain_link" // When added to chain
  | "on_chain_resolve" // When chain resolves
  | "on_spell_activated" // When a spell is activated
  | "on_trap_activated" // When a trap is activated
  | "on_effect_activated" // When an effect is activated
  | "on_damage_calculation" // During damage calculation
  | "quick" // Quick effect (can be activated during opponent's turn)
  | "continuous" // Continuous effect (always active)
  | "while_in_gy" // While in graveyard
  | "while_banished" // While banished
  | "manual"; // Manual activation (spells/traps)

/**
 * Activation type determines how/when an effect can be activated
 */
export type ActivationType =
  | "trigger" // Automatic trigger when conditions are met (mandatory/optional)
  | "ignition" // Can only activate manually during Main Phase with priority
  | "quick" // Can activate manually any time with priority (Quick Effects)
  | "continuous"; // Passive effect, always active while on field

// ============================================================================
// JSON EFFECT SYSTEM - Type-safe effect definitions
// ============================================================================

/**
 * Target owner specifier for effects
 */
export type TargetOwner = "self" | "opponent" | "both" | "controller";

/**
 * Card type filter for targeting
 */
export type CardTypeFilter = "stereotype" | "spell" | "trap" | "class" | "any";

/**
 * Location zones in the game
 */
export type ZoneLocation = "board" | "hand" | "graveyard" | "deck" | "banished" | "field_spell";

/**
 * Effect duration specifiers
 */
export type EffectDuration = "turn" | "phase" | "permanent" | "until_end_of_battle";

/**
 * Numeric range for conditions (min/max bounds)
 */
export interface NumericRange {
  min?: number;
  max?: number;
  exact?: number;
}

/**
 * Archetype identifiers matching the schema
 */
export type ArchetypeId =
  | "dropout"
  | "prep"
  | "geek"
  | "freak"
  | "nerd"
  | "goodie_two_shoes";

/**
 * Card rarity levels
 */
export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

/**
 * JSON-based condition for targeting and filtering cards
 *
 * Supports complex logical combinations with 'and'/'or' operators
 */
export interface JsonCondition {
  // Logical operators for combining conditions
  type?: "and" | "or";
  conditions?: JsonCondition[];

  // Card attribute filters
  archetype?: ArchetypeId | ArchetypeId[];
  cardType?: CardTypeFilter | CardTypeFilter[];
  rarity?: CardRarity | CardRarity[];

  // Stat-based filters
  attack?: NumericRange;
  defense?: NumericRange;
  level?: NumericRange | number; // Level/cost of the card

  // Ownership filters
  targetOwner?: TargetOwner;
  controller?: TargetOwner;

  // Location filters
  location?: ZoneLocation | ZoneLocation[];

  // Position filters (for monsters on board)
  position?: "attack" | "defense" | "facedown";
  isFaceDown?: boolean;

  // Game state conditions
  lpBelow?: number;
  lpAbove?: number;
  graveyardContains?: {
    count?: NumericRange;
    cardType?: CardTypeFilter;
    archetype?: ArchetypeId;
  };
  handSize?: NumericRange;
  boardCount?: NumericRange;
  deckSize?: NumericRange;

  // Name-based filters
  nameContains?: string;
  nameExact?: string;

  // Battle conditions
  battlePosition?: "attacking" | "defending";
  wasDestroyedBy?: "battle" | "effect" | "any";

  // Turn conditions
  turnCount?: NumericRange;
  isFirstTurn?: boolean;
  isMyTurn?: boolean;

  // Field state conditions
  hasNoMonstersInAttackPosition?: boolean;
  opponentHasNoMonsters?: boolean;
  controlsNoMonsters?: boolean;

  // Specific card targeting (for lingering effects)
  targetCardId?: Id<"cardDefinitions">;
}

/**
 * Cost definition for effect activation
 */
export interface JsonCost {
  type: "discard" | "pay_lp" | "tribute" | "banish" | "send_to_gy" | "return_to_deck";
  value?: number; // Amount (LP or card count)
  condition?: JsonCondition; // Filter for cards that can be used as cost
  from?: ZoneLocation; // Where to take cards from (default: hand for discard, board for tribute)
}

/**
 * Protection flags for cards
 */
export interface JsonProtection {
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  cannotBeBanished?: boolean;
  cannotBeReturned?: boolean;
  immuneToEffects?: JsonCondition; // Only immune to effects matching this condition
}

/**
 * Target specification for effects
 */
export interface JsonTarget {
  count?: number | "all"; // Number of targets or 'all' matching
  min?: number; // Minimum targets (optional, defaults to count)
  max?: number; // Maximum targets
  condition?: JsonCondition; // Filter for valid targets
  location?: ZoneLocation; // Where targets must be
  owner?: TargetOwner; // Who owns the targets
  selection?: "player_choice" | "random" | "all_matching"; // How targets are selected
}

/**
 * JSON-based effect definition
 *
 * This is the core structure for defining card effects in JSON format.
 * It extends ParsedEffect while providing more structured targeting and conditions.
 */
export interface JsonEffect {
  // Effect identification
  type: EffectType;
  trigger: TriggerCondition;
  activationType?: ActivationType; // How the effect is activated (trigger/ignition/quick/continuous)

  // Effect values
  value?: number; // Primary numeric value (damage, LP, draw count, etc.)
  duration?: EffectDuration; // How long the effect lasts (legacy field)

  // Lingering effect support - more detailed duration tracking
  lingeringDuration?: {
    type: "until_end_phase" | "until_turn_end" | "until_next_turn" | "permanent" | "custom";
    endTurn?: number; // Specific turn number when effect expires
    endPhase?: string; // Specific phase when effect expires
  };
  lingering?: boolean; // Flag that this effect creates a lingering modifier

  // Targeting
  target?: JsonTarget; // For effects that target specific cards
  targetCount?: number; // Simplified target count (shorthand for target.count)
  targetType?: "stereotype" | "spell" | "trap" | "any"; // Simplified target type filter
  targetLocation?: ZoneLocation; // Simplified target location
  targetOwner?: TargetOwner; // Simplified target owner

  // Conditions
  condition?: JsonCondition; // Activation condition
  activationCondition?: JsonCondition; // When this effect can be activated

  // Costs
  cost?: JsonCost;
  costs?: JsonCost[]; // Multiple costs (pay all)

  // Restrictions
  isOPT?: boolean; // Once per turn
  isHOPT?: boolean; // Hard once per turn (card name based)
  isContinuous?: boolean; // Continuous effect (stays active)
  chainable?: boolean; // Can be chained to other effects
  spellSpeed?: 1 | 2 | 3; // Spell speed for chain resolution

  // SEGOC ordering flags
  isOptional?: boolean; // Optional trigger (player can choose not to activate)
  isMandatory?: boolean; // Mandatory trigger (must activate if conditions met)

  // Protection (for monsters)
  protection?: JsonProtection;

  // Effect-specific parameters
  searchCondition?: JsonCondition; // For search effects - what cards can be searched
  summonFrom?: ZoneLocation; // For summon effects - where to summon from
  sendTo?: ZoneLocation; // For movement effects - destination zone

  // Stat modification specifics
  statTarget?: "self" | "target" | "all_matching";
  statCondition?: JsonCondition; // Which cards get the stat modification

  // Negation specifics
  negateType?: "activation" | "effect" | "both";
  negateAndDestroy?: boolean;

  // Activation negation specifics (for negateActivation effect type)
  negateTargetType?: "spell" | "trap" | "stereotype" | "any";
  destroyAfterNegation?: boolean;

  // Token generation specifics (for generateToken effect type)
  tokenData?: {
    name: string;
    atk: number;
    def: number;
    level?: number;
    attribute?: string;
    type?: string;
    count?: number; // How many tokens to generate
    position?: "attack" | "defense"; // Battle position
  };

  // Multi-effect support
  then?: JsonEffect; // Execute this effect after (chained)
  or?: JsonEffect; // Alternative effect (player choice)

  // Metadata
  effectId?: string; // Unique identifier for this effect
  description?: string; // Human-readable description
}

/**
 * Complete JSON ability definition for a card
 *
 * A card can have multiple effects (e.g., ignition + continuous + trigger)
 */
export interface JsonAbility {
  effects: JsonEffect[];
  abilityText?: string; // Original ability text for display
  spellSpeed?: 1 | 2 | 3; // Overall spell speed of the card
}

/**
 * Extended ParsedEffect that includes additional fields not in base definition
 * Used by effect executors that need access to effect-specific parameters
 */
export interface ExtendedParsedEffect extends ParsedEffect {
  // Activation negation specifics (for negateActivation effect type)
  negateTargetType?: "spell" | "trap" | "stereotype" | "any";
  destroyAfterNegation?: boolean;
  negateAndDestroy?: boolean;
}

export interface ParsedEffect {
  type: EffectType;
  trigger: TriggerCondition;
  activationType?: ActivationType; // How the effect is activated
  value?: number; // Numeric value (e.g., "Draw 2" -> value: 2)
  targetCount?: number; // Number of targets required
  targetType?: "stereotype" | "spell" | "trap" | "any";
  targetLocation?: "board" | "hand" | "graveyard" | "deck" | "banished";
  condition?: string; // Additional conditions
  continuous?: boolean; // Is this a continuous effect?
  isOPT?: boolean; // Once per turn restriction (resets at start of turn player's turn)
  isHOPT?: boolean; // Hard once per turn restriction (resets at start of player's NEXT turn)
  // Optional vs Mandatory trigger distinction
  isOptional?: boolean; // Player can choose to activate (optional trigger)
  isMandatory?: boolean; // Must activate if conditions met (default for triggers)
  canMissTiming?: boolean; // Optional "when" effects that miss timing if not the last thing to happen
  // Cost field for effects that require payment
  cost?: {
    type: "discard" | "pay_lp" | "tribute" | "banish";
    value?: number; // Number of cards or LP amount
    targetType?: "stereotype" | "spell" | "trap" | "any";
  };
  // Protection flags
  protection?: {
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
  };
  // Activation condition for triggered effects (game-state requirements)
  // Evaluated before the effect can execute (LP thresholds, board counts, etc.)
  activationCondition?: JsonCondition;
  // Duration support for lingering effects
  duration?: {
    type: "until_end_phase" | "until_turn_end" | "until_next_turn" | "permanent" | "custom";
    endTurn?: number; // Specific turn number when effect expires
    endPhase?: string; // Specific phase when effect expires
  };
  lingering?: boolean; // Flag that this effect creates a lingering modifier
}

// Multi-part ability support
export interface ParsedAbility {
  effects: ParsedEffect[];
  hasMultiPart: boolean;
}

/**
 * Result from executing an effect
 *
 * Some effects require player selection and return available options.
 * The frontend displays these options, and the player's selection is
 * sent back to complete the effect.
 */
export interface EffectResult {
  success: boolean;
  message: string;

  // Selection data for two-step effects
  requiresSelection?: boolean;
  selectionType?: string; // Context type for the selection (e.g., "tribute", "target")
  selectionSource?: "deck" | "graveyard" | "banished" | "hand" | "board";
  availableTargets?: Array<{
    cardId: Id<"cardDefinitions">;
    name: string;
    cardType: string;
    imageUrl?: string;
    monsterStats?: {
      attack: number;
      defense: number;
      level?: number;
    };
  }>;
  minSelections?: number;
  maxSelections?: number;
  selectionPrompt?: string;
}

// Effect executor function signature
export type EffectExecutor = (
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  playerId: string,
  sourceCardId: Id<"cardDefinitions">,
  targets?: Id<"cardDefinitions">[]
) => Promise<EffectResult>;

// ============================================================================
// GAME STATE TYPES (from schema, for type safety)
// ============================================================================

/**
 * Board card representation (monster on field)
 */
export interface BoardCard {
  cardId: Id<"cardDefinitions">;
  position: number; // 1 = Attack, -1 = Defense
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
  // Protection flags
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  // Position change tracking
  hasChangedPosition?: boolean;
  turnSummoned?: number;
  // Equip spell tracking
  equippedCards?: Id<"cardDefinitions">[];
  // Token flags
  isToken?: boolean;
  tokenData?: {
    name: string;
    atk: number;
    def: number;
    level?: number;
    attribute?: string;
    type?: string;
  };
}

/**
 * Chain link in the current chain stack
 */
export interface ChainLink {
  cardId: Id<"cardDefinitions">;
  playerId: Id<"users">;
  spellSpeed: number; // 1, 2, or 3
  effect: JsonAbility;
  targets?: Id<"cardDefinitions">[];
  negated?: boolean;
  isNegated?: boolean; // Alias for negated
}

/**
 * Card with optional ability field (used by various helpers)
 */
export interface CardWithAbility {
  ability?: JsonAbility | string;
  [key: string]: unknown;
}
