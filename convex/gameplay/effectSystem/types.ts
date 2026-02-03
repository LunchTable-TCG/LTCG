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

export type EffectType =
  | "draw" // Draw X cards
  | "destroy" // Destroy target card(s)
  | "damage" // Deal X damage to player
  | "gainLP" // Gain X LP
  | "randomChoice" // Deterministic RNG: pick 1 effect from choices and execute it
  | "modifyATK" // Modify ATK
  | "modifyDEF" // Modify DEF
  | "summon" // Special summon
  | "toHand" // Add card to hand
  | "toGraveyard" // Send card to GY
  | "banish" // Banish card
  | "search" // Search deck
  | "negate" // Negate activation/effect
  | "directAttack" // Allows direct attack under condition (passive, checked in combatSystem)
  | "mill" // Send cards from top of deck to GY
  | "discard" // Discard cards from hand to GY
  | "multipleAttack"; // Allow multiple attacks per turn (passive)

export type TriggerCondition =
  | "on_summon" // When this card is summoned
  | "on_opponent_summon" // When opponent summons a monster
  | "on_destroy" // When this card is destroyed
  | "on_flip" // When this card is flipped
  | "on_battle_damage" // When this card inflicts battle damage
  | "on_battle_destroy" // When this card destroys a monster by battle
  | "on_battle_attacked" // When this card is attacked
  | "on_battle_start" // At the start of the Battle Phase
  | "on_draw" // During draw phase
  | "on_end" // During end phase
  | "on_turn_start" // At the start of the turn (turn transition hook)
  | "on_turn_end" // At the end of the turn (turn transition hook)
  | "manual"; // Manual activation (spells/traps)

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
export type CardTypeFilter = "monster" | "spell" | "trap" | "any";

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
  | "infernal_dragons"
  | "abyssal_horrors"
  | "nature_spirits"
  | "storm_elementals"
  | "shadow_assassins"
  | "celestial_guardians"
  | "undead_legion"
  | "divine_knights"
  | "arcane_mages"
  | "mechanical_constructs"
  | "neutral"
  // Legacy archetypes for backwards compatibility
  | "fire"
  | "water"
  | "earth"
  | "wind";

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

  // Effect values
  value?: number; // Primary numeric value (damage, LP, draw count, etc.)
  duration?: EffectDuration; // How long the effect lasts

  // Targeting
  target?: JsonTarget; // For effects that target specific cards
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

  // Multi-effect support
  then?: JsonEffect; // Execute this effect after (chained)
  or?: JsonEffect; // Alternative effect (player choice)
  choices?: JsonEffect[]; // For randomChoice effects

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

export interface ParsedEffect {
  type: EffectType;
  trigger: TriggerCondition;
  value?: number; // Numeric value (e.g., "Draw 2" -> value: 2)
  targetOwner?: TargetOwner; // Explicit owner targeting (used for non-targeted effects like damage/mill/discard)
  choices?: JsonEffect[]; // For randomChoice effects (preserved, not flattened)
  targetCount?: number; // Number of targets required
  targetType?: "monster" | "spell" | "trap" | "any";
  targetLocation?: "board" | "hand" | "graveyard" | "deck" | "banished";
  condition?: string; // Additional conditions
  continuous?: boolean; // Is this a continuous effect?
  isOPT?: boolean; // Once per turn restriction (resets at start of turn player's turn)
  isHOPT?: boolean; // Hard once per turn restriction (resets at start of player's NEXT turn)
  // Optional vs Mandatory trigger distinction
  isOptional?: boolean; // Player can choose to activate (optional trigger)
  isMandatory?: boolean; // Must activate if conditions met (default for triggers)
  // Cost field for effects that require payment
  cost?: {
    type: "discard" | "pay_lp" | "tribute" | "banish";
    value?: number; // Number of cards or LP amount
    targetType?: "monster" | "spell" | "trap" | "any";
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
