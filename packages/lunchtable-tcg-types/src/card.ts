/**
 * Base card definition that all TCG games share.
 * Games extend this via the `metadata` field for game-specific properties.
 */
export interface CardDefinition {
  name: string;
  cardType: string;
  attack?: number;
  defense?: number;
  level?: number;
  rarity: string;
  stereotype?: string;
  abilities?: JsonAbility | JsonAbility[];
  description: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface HandCard extends CardDefinition {
  instanceId: string;
  abilityText?: string;
  effectType?: string;
}

export interface BoardCard extends HandCard {
  position?: string;
  isFaceDown: boolean;
  placedOnTurn?: number;
  hasAttacked?: boolean;
  effectUsedThisTurn?: boolean;
}

export interface BackrowCard extends HandCard {
  isFaceDown: boolean;
  setThisTurn?: boolean;
  isActive?: boolean;
}

export interface GraveyardCard extends CardDefinition {
  instanceId: string;
  sentBy?: "destroyed" | "discarded" | "cost" | "effect" | "tribute";
  sentOnTurn?: number;
}

export interface JsonAbility {
  name?: string;
  trigger?: TriggerCondition;
  effects: JsonEffect[];
  cost?: JsonCost;
  opt?: boolean;
  hopt?: boolean;
  spellSpeed?: number;
  continuous?: boolean;
}

export interface JsonEffect {
  type: string;
  params?: Record<string, unknown>;
  targets?: EffectTarget;
  condition?: EffectCondition;
}

export interface JsonCost {
  type: string;
  amount?: number;
  params?: Record<string, unknown>;
}

export type TriggerCondition =
  | "on_summon"
  | "on_destroy"
  | "on_battle"
  | "on_damage"
  | "on_draw"
  | "on_discard"
  | "on_tribute"
  | "on_phase_enter"
  | "on_phase_exit"
  | "on_turn_start"
  | "on_turn_end"
  | "manual"
  | (string & {});

export interface EffectTarget {
  who?: "self" | "opponent" | "any" | "both";
  where?: "hand" | "field" | "graveyard" | "deck" | "backrow" | "any";
  count?: number;
  filter?: Record<string, unknown>;
}

export interface EffectCondition {
  type: string;
  params?: Record<string, unknown>;
}

export interface DeckRules {
  minCards: number;
  maxCards: number;
  maxCopies: number;
  maxLegendaryCopies?: number;
  customValidator?: string;
}
