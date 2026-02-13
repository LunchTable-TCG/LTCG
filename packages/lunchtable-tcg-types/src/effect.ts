export interface ActiveEffect {
  sourceCardId: string;
  effectType: string;
  targets: string[];
  duration: EffectDuration;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type EffectDuration =
  | "permanent"
  | "until_end_of_turn"
  | "until_end_of_next_turn"
  | "until_leaves_field"
  | (string & {});

export interface ChainLink {
  cardId: string;
  effectId: string;
  spellSpeed: number;
  targets: string[];
  chainPosition: number;
}

export interface ChainState {
  links: ChainLink[];
  resolving: boolean;
  priorityPlayerId?: string;
}

export interface BattleState {
  attackerId: string;
  targetId: string | "direct";
  phase: "declare" | "damage_step" | "damage_calc" | "resolve" | "end";
  modifiers: BattleModifier[];
  metadata?: Record<string, unknown>;
}

export interface BattleModifier {
  source: string;
  stat: "attack" | "defense";
  delta: number;
}

export interface CombatConfig {
  damageFormula?: string;
  positionSystem?: boolean;
  directAttackAllowed?: boolean;
  battleReplay?: boolean;
}
