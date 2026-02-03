/**
 * Card Helpers
 *
 * Centralized utility functions for working with card data and JSON abilities
 * in the frontend. These helpers transform backend card data into display-friendly formats.
 */

// ============================================================================
// TYPES - Simplified frontend versions of backend types
// ============================================================================

/**
 * Effect types supported by the game
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
  | string; // Allow unknown types for extensibility

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
  name?: string;
  effects: JsonEffect[];
  trigger?: TriggerCondition;
  cost?: JsonCost;
  isOPT?: boolean;
  isHOPT?: boolean;
  isHardOPT?: boolean;
  isContinuous?: boolean;
  spellSpeed?: 1 | 2 | 3;
  protection?: {
    cannotBeDestroyedByBattle?: boolean;
    cannotBeDestroyedByEffects?: boolean;
    cannotBeTargeted?: boolean;
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Human-readable labels for effect types
 */
const EFFECT_TYPE_LABELS: Record<string, string> = {
  draw: "Draw",
  destroy: "Destroy",
  damage: "Deal Damage",
  gainLP: "Gain LP",
  modifyATK: "Modify ATK",
  modifyDEF: "Modify DEF",
  summon: "Special Summon",
  toHand: "Add to Hand",
  toGraveyard: "Send to GY",
  banish: "Banish",
  search: "Search",
  negate: "Negate",
  directAttack: "Direct Attack",
  mill: "Mill",
  discard: "Discard",
  multipleAttack: "Multiple Attacks",
  returnToDeck: "Return to Deck",
  changePosition: "Change Position",
};

/**
 * Human-readable labels for trigger conditions
 */
const TRIGGER_LABELS: Record<string, string> = {
  on_summon: "When Summoned",
  on_opponent_summon: "When Opponent Summons",
  on_destroy: "When Destroyed",
  on_flip: "When Flipped",
  on_battle_damage: "When Dealing Battle Damage",
  on_battle_destroy: "When Destroying by Battle",
  on_battle_attacked: "When Attacked",
  on_battle_start: "At Battle Start",
  on_draw: "During Draw Phase",
  on_end: "During End Phase",
  manual: "Activate",
  continuous: "Continuous",
  quick: "Quick Effect",
  on_normal_summon: "When Normal Summoned",
  on_special_summon: "When Special Summoned",
  on_flip_summon: "When Flip Summoned",
  on_sent_to_gy: "When Sent to GY",
  on_banished: "When Banished",
  on_opponent_attacks: "When Opponent Attacks",
  on_turn_start: "At Turn Start",
  on_turn_end: "At Turn End",
  on_standby: "During Standby Phase",
};

/**
 * Human-readable labels for cost types
 */
const COST_TYPE_LABELS: Record<string, string> = {
  discard: "Discard",
  pay_lp: "Pay LP",
  tribute: "Tribute",
  banish: "Banish",
  banish_from_gy: "Banish from GY",
  banish_from_hand: "Banish from Hand",
  send_to_gy: "Send to GY",
  return_to_deck: "Return to Deck",
  destroy: "Destroy",
};

/**
 * Get the effect type from various possible property names
 */
function getEffectType(effect: JsonEffect): EffectType | undefined {
  return effect.type ?? effect.effectType;
}

/**
 * Format a cost into a human-readable string
 */
function formatCost(cost: JsonCost): { type: string; value?: number; description: string } {
  const typeLabel = COST_TYPE_LABELS[cost.type] ?? cost.type;
  let description = typeLabel;

  if (cost.value !== undefined) {
    if (cost.type === "pay_lp") {
      description = `Pay ${cost.value} LP`;
    } else {
      description = `${typeLabel} ${cost.value} card${cost.value !== 1 ? "s" : ""}`;
    }
  }

  if (cost.target) {
    const cardType = cost.target.type ?? cost.target.cardType;
    if (cardType && cardType !== "any") {
      description += ` (${cardType})`;
    }
    const location = cost.target.location ?? cost.target.zone;
    if (location && location !== "hand") {
      description += ` from ${location}`;
    }
  }

  if (cost.isOptional || cost.optional) {
    description += " (optional)";
  }

  return {
    type: cost.type,
    value: cost.value,
    description,
  };
}

/**
 * Generate a description for an effect if none is provided
 */
function generateEffectDescription(effect: JsonEffect): string {
  const effectType = getEffectType(effect);
  if (!effectType) return "Unknown effect";

  const typeLabel = EFFECT_TYPE_LABELS[effectType] ?? effectType;
  const value = effect.value ?? effect.count;

  switch (effectType) {
    case "draw":
      return `Draw ${value ?? 1} card${(value ?? 1) !== 1 ? "s" : ""}`;
    case "damage":
      return `Deal ${value ?? 0} damage to opponent`;
    case "gainLP":
      return `Gain ${value ?? 0} LP`;
    case "modifyATK":
      return `${(value ?? 0) >= 0 ? "Increase" : "Decrease"} ATK by ${Math.abs(value ?? 0)}`;
    case "modifyDEF":
      return `${(value ?? 0) >= 0 ? "Increase" : "Decrease"} DEF by ${Math.abs(value ?? 0)}`;
    case "destroy": {
      const targetCount = effect.target?.count;
      return `Destroy ${targetCount === "all" ? "all" : (targetCount ?? 1)} card${targetCount === 1 ? "" : "s"}`;
    }
    case "banish": {
      const targetCount = effect.target?.count;
      return `Banish ${targetCount === "all" ? "all" : (targetCount ?? 1)} card${targetCount === 1 ? "" : "s"}`;
    }
    case "toHand":
      return "Add card(s) to hand";
    case "toGraveyard":
      return "Send card(s) to Graveyard";
    case "summon":
      return "Special Summon a monster";
    case "search":
      return "Search deck for a card";
    case "negate":
      return "Negate an activation or effect";
    case "mill":
      return `Send ${value ?? 1} card${(value ?? 1) !== 1 ? "s" : ""} from deck to GY`;
    case "discard":
      return `Discard ${value ?? 1} card${(value ?? 1) !== 1 ? "s" : ""}`;
    case "directAttack":
      return "This card can attack directly";
    case "multipleAttack":
      return `This card can attack ${value ?? 2} times per turn`;
    case "returnToDeck":
      return "Return card(s) to deck";
    case "changePosition":
      return "Change battle position";
    default:
      return typeLabel;
  }
}

/**
 * Convert a JSON effect to a display-friendly format
 */
function convertEffectToDisplay(effect: JsonEffect, abilityName?: string): DisplayEffect {
  const effectType = getEffectType(effect);
  const trigger = effect.trigger;
  const activationType = effect.activationType;

  // Determine name
  let name = effect.name ?? abilityName ?? EFFECT_TYPE_LABELS[effectType ?? ""] ?? "Effect";

  // If no explicit name but has trigger, prefix with trigger
  if (!effect.name && trigger && trigger !== "manual") {
    const triggerLabel = TRIGGER_LABELS[trigger] ?? trigger;
    name = `${triggerLabel}: ${name}`;
  }

  // Determine description
  const description = effect.description ?? generateEffectDescription(effect);

  // Format cost if present
  const cost = effect.cost ? formatCost(effect.cost) : undefined;

  // Determine OPT status
  const isOPT = effect.isOPT ?? false;
  const isHOPT = effect.isHOPT ?? effect.isHardOPT ?? false;

  // Determine if continuous
  const isContinuous = effect.isContinuous ?? effect.continuous ?? false;

  return {
    name,
    description,
    effectType: effectType ?? undefined,
    trigger: trigger ?? undefined,
    activationType,
    cost,
    isOPT,
    isHOPT,
    spellSpeed: effect.spellSpeed,
    isContinuous,
  };
}

/**
 * Get an array of display-friendly effects from a JSON ability
 *
 * This is the main helper function for transforming card ability data
 * into a format suitable for UI display.
 *
 * @param ability - The JSON ability from the card definition
 * @returns Array of DisplayEffect objects for UI rendering
 *
 * @example
 * ```typescript
 * const card = await getCard(cardId);
 * const effects = getCardEffectsArray(card.ability);
 *
 * // In JSX:
 * {effects.map((effect, i) => (
 *   <div key={i}>
 *     <span>{effect.name}</span>
 *     <p>{effect.description}</p>
 *     {effect.isOPT && <span>(Once per turn)</span>}
 *   </div>
 * ))}
 * ```
 */
export function getCardEffectsArray(
  ability: JsonAbility | string | null | undefined
): DisplayEffect[] {
  // Handle null/undefined
  if (!ability) return [];

  // Handle legacy string abilities (shouldn't happen with new system, but be safe)
  if (typeof ability === "string") {
    return [
      {
        name: "Effect",
        description: ability,
      },
    ];
  }

  // Process each effect in the ability
  const displayEffects: DisplayEffect[] = [];

  for (const effect of ability.effects) {
    // Handle nested effect structures (JsonEffectNode pattern)
    if ("effect" in effect && typeof effect.effect === "object") {
      displayEffects.push(convertEffectToDisplay(effect.effect as JsonEffect, ability.name));
    } else {
      displayEffects.push(convertEffectToDisplay(effect as JsonEffect, ability.name));
    }

    // Handle "then" chains
    if (effect.then) {
      const thenEffects = Array.isArray(effect.then) ? effect.then : [effect.then];
      for (const thenEffect of thenEffects) {
        const display = convertEffectToDisplay(thenEffect, ability.name);
        display.name = `Then: ${display.name}`;
        displayEffects.push(display);
      }
    }
  }

  // If no effects were found but ability has a name, create a single entry
  if (displayEffects.length === 0 && ability.name) {
    displayEffects.push({
      name: ability.name,
      description: ability.name,
      isOPT: ability.isOPT,
      isHOPT: ability.isHOPT ?? ability.isHardOPT,
      isContinuous: ability.isContinuous,
      spellSpeed: ability.spellSpeed,
    });
  }

  // Apply ability-level restrictions to all effects if not set individually
  if (ability.isOPT || ability.isHOPT || ability.isHardOPT) {
    for (const effect of displayEffects) {
      if (ability.isOPT && !effect.isOPT && !effect.isHOPT) {
        effect.isOPT = true;
      }
      if ((ability.isHOPT || ability.isHardOPT) && !effect.isHOPT) {
        effect.isHOPT = true;
      }
    }
  }

  // Apply ability-level cost if effects don't have individual costs
  if (ability.cost && displayEffects.length > 0) {
    const firstEffect = displayEffects[0];
    if (firstEffect && !firstEffect.cost) {
      firstEffect.cost = formatCost(ability.cost);
    }
  }

  return displayEffects;
}

/**
 * Get a simple display text for an ability (for compact views)
 *
 * This provides backwards compatibility with the old getAbilityDisplayText function.
 *
 * @param ability - The JSON ability or legacy string
 * @returns A simple string representation of the ability
 */
export function getAbilityDisplayText(
  ability: JsonAbility | string | null | undefined
): string | undefined {
  if (!ability) return undefined;

  // Handle legacy string abilities
  if (typeof ability === "string") return ability;

  // Prefer the name if available
  if (ability.name) return ability.name;

  // Fall back to first effect description
  const effects = getCardEffectsArray(ability);
  if (effects.length > 0) {
    return effects.map((e) => e.description).join("; ");
  }

  return undefined;
}

/**
 * Check if an ability is type-safe JsonAbility format
 */
export function isJsonAbility(ability: unknown): ability is JsonAbility {
  return (
    typeof ability === "object" &&
    ability !== null &&
    "effects" in ability &&
    Array.isArray((ability as JsonAbility).effects)
  );
}

/**
 * Get the trigger label for an effect
 */
export function getTriggerLabel(trigger: TriggerCondition | undefined): string | undefined {
  if (!trigger) return undefined;
  return TRIGGER_LABELS[trigger] ?? trigger;
}

/**
 * Get the effect type label
 */
export function getEffectTypeLabel(effectType: EffectType | undefined): string | undefined {
  if (!effectType) return undefined;
  return EFFECT_TYPE_LABELS[effectType] ?? effectType;
}

/**
 * Check if an ability has OPT (Once Per Turn) restriction
 */
export function hasOPTRestriction(ability: JsonAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.isOPT) return true;
  return ability.effects.some((e) => e.isOPT);
}

/**
 * Check if an ability has HOPT (Hard Once Per Turn) restriction
 */
export function hasHOPTRestriction(ability: JsonAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.isHOPT || ability.isHardOPT) return true;
  return ability.effects.some((e) => e.isHOPT || e.isHardOPT);
}

/**
 * Check if an ability is a continuous effect
 */
export function isContinuousAbility(ability: JsonAbility | null | undefined): boolean {
  if (!ability) return false;
  if (ability.isContinuous) return true;
  return ability.effects.some((e) => e.isContinuous || e.continuous);
}

/**
 * Get protection flags from an ability
 */
export function getProtectionFlags(ability: JsonAbility | null | undefined): {
  cannotBeDestroyedByBattle: boolean;
  cannotBeDestroyedByEffects: boolean;
  cannotBeTargeted: boolean;
} {
  const flags = {
    cannotBeDestroyedByBattle: false,
    cannotBeDestroyedByEffects: false,
    cannotBeTargeted: false,
  };

  if (!ability) return flags;

  // Check ability-level protection
  if (ability.protection) {
    flags.cannotBeDestroyedByBattle = ability.protection.cannotBeDestroyedByBattle ?? false;
    flags.cannotBeDestroyedByEffects = ability.protection.cannotBeDestroyedByEffects ?? false;
    flags.cannotBeTargeted = ability.protection.cannotBeTargeted ?? false;
  }

  // Check effect-level protection
  for (const effect of ability.effects) {
    if (effect.protection) {
      flags.cannotBeDestroyedByBattle =
        flags.cannotBeDestroyedByBattle || (effect.protection.cannotBeDestroyedByBattle ?? false);
      flags.cannotBeDestroyedByEffects =
        flags.cannotBeDestroyedByEffects || (effect.protection.cannotBeDestroyedByEffects ?? false);
      flags.cannotBeTargeted =
        flags.cannotBeTargeted || (effect.protection.cannotBeTargeted ?? false);
    }
  }

  return flags;
}
