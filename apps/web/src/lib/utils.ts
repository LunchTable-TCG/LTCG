import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// JSON ABILITY TYPES - Frontend-compatible versions of backend types
// ============================================================================

/**
 * Effect type identifiers matching the backend EffectType
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
  | "multipleAttack";

/**
 * Trigger condition identifiers matching the backend TriggerCondition
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
  | "manual";

/**
 * Target owner specifier
 */
export type TargetOwner = "self" | "opponent" | "both" | "controller";

/**
 * Location zones in the game
 */
export type ZoneLocation = "board" | "hand" | "graveyard" | "deck" | "banished" | "field_spell";

/**
 * Effect duration specifiers
 */
export type EffectDuration = "turn" | "phase" | "permanent" | "until_end_of_battle";

/**
 * Cost definition for effect activation (frontend-compatible)
 */
export interface JsonCost {
  type: "discard" | "pay_lp" | "tribute" | "banish" | "send_to_gy" | "return_to_deck";
  value?: number;
  from?: ZoneLocation;
}

/**
 * Target specification for effects (frontend-compatible)
 */
export interface JsonTarget {
  count?: number | "all";
  min?: number;
  max?: number;
  location?: ZoneLocation;
  owner?: TargetOwner;
  selection?: "player_choice" | "random" | "all_matching";
}

/**
 * JSON-based effect definition (frontend-compatible subset)
 *
 * This is a simplified version of the backend JsonEffect for frontend display.
 */
export interface JsonEffect {
  // Effect identification
  type: EffectType;
  trigger?: TriggerCondition;

  // Effect values
  value?: number;
  duration?: EffectDuration;

  // Targeting
  target?: JsonTarget;
  targetLocation?: ZoneLocation;
  targetOwner?: TargetOwner;

  // Costs
  cost?: JsonCost;
  costs?: JsonCost[];

  // Restrictions
  isOPT?: boolean;
  isHOPT?: boolean;
  isContinuous?: boolean;
  chainable?: boolean;
  spellSpeed?: 1 | 2 | 3;

  // Effect-specific
  summonFrom?: ZoneLocation;
  sendTo?: ZoneLocation;

  // Negation specifics
  negateType?: "activation" | "effect" | "both";
  negateAndDestroy?: boolean;

  // Metadata
  effectId?: string;
  description?: string;
}

/**
 * Complete JSON ability definition for a card (frontend-compatible)
 *
 * A card can have multiple effects (e.g., ignition + continuous + trigger)
 */
export interface JsonAbility {
  effects: JsonEffect[];
  abilityText?: string;
  spellSpeed?: 1 | 2 | 3;
}

/**
 * Get a display string from a JSON ability for UI purposes
 */
export function getAbilityDisplayText(ability: JsonAbility | string | undefined | null): string | undefined {
  if (!ability) return undefined;

  // If it's already a string, return it
  if (typeof ability === "string") return ability;

  // Prefer the abilityText if available
  if (ability.abilityText) return ability.abilityText;

  // Fall back to effect type descriptions
  if (ability.effects && ability.effects.length > 0) {
    const effectDescs = ability.effects
      .map(e => e.description || formatEffectForDisplay(e))
      .filter(Boolean);
    return effectDescs.join("; ");
  }

  return undefined;
}

/**
 * Format a single effect for display when no description is provided
 */
function formatEffectForDisplay(effect: JsonEffect): string {
  const parts: string[] = [];

  // Add trigger prefix if present
  if (effect.trigger && effect.trigger !== "manual") {
    const triggerText = formatTriggerText(effect.trigger);
    if (triggerText) parts.push(triggerText);
  }

  // Add main effect text
  const effectText = formatEffectTypeText(effect.type, effect.value);
  if (effectText) parts.push(effectText);

  return parts.join(": ");
}

/**
 * Format trigger condition for display
 */
function formatTriggerText(trigger: TriggerCondition): string {
  const triggerMap: Record<TriggerCondition, string> = {
    on_summon: "When summoned",
    on_opponent_summon: "When opponent summons",
    on_destroy: "When destroyed",
    on_flip: "When flipped",
    on_battle_damage: "When dealing battle damage",
    on_battle_destroy: "When destroying by battle",
    on_battle_attacked: "When attacked",
    on_battle_start: "At battle start",
    on_draw: "During Draw Phase",
    on_end: "During End Phase",
    manual: "",
  };
  return triggerMap[trigger] || trigger;
}

/**
 * Format effect type and value for display
 */
function formatEffectTypeText(type: EffectType, value?: number): string {
  const valueStr = value !== undefined ? `${value}` : "";

  const effectMap: Record<EffectType, string> = {
    draw: `Draw ${valueStr || "1"} card(s)`,
    damage: `Deal ${valueStr || "?"} damage`,
    gainLP: `Gain ${valueStr || "?"} LP`,
    destroy: valueStr ? `Destroy ${valueStr} card(s)` : "Destroy",
    banish: valueStr ? `Banish ${valueStr} card(s)` : "Banish",
    search: "Add from Deck to hand",
    toHand: "Return to hand",
    toGraveyard: "Send to GY",
    modifyATK: `ATK ${value && value >= 0 ? "+" : ""}${valueStr}`,
    modifyDEF: `DEF ${value && value >= 0 ? "+" : ""}${valueStr}`,
    negate: "Negate",
    summon: "Special Summon",
    mill: `Send ${valueStr || "?"} from Deck to GY`,
    discard: `Discard ${valueStr || "1"} card(s)`,
    directAttack: "Can attack directly",
    multipleAttack: "Can attack multiple times",
  };

  return effectMap[type] || type;
}
