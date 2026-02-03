/**
 * Game-Specific Types
 *
 * Types related to game logic, not directly tied to API structure.
 */

// Re-export Id type from Convex for compatibility
// Note: This should match the Id type from @convex/_generated/dataModel
export type Id<T extends string = string> = string & { __tableName: T };

// ============================================================================
// Game Phases
// ============================================================================

export type GamePhase = "draw" | "standby" | "main1" | "battle" | "main2" | "end";

export type TurnPlayer = "host" | "opponent";

export type GameStatus = "waiting" | "active" | "completed";

// ============================================================================
// Card Types
// ============================================================================

/**
 * Card types matching Convex schema
 * Note: Use 'creature' not 'monster' to match database schema
 */
export type CardType = "creature" | "spell" | "trap" | "equipment";

export type MonsterPosition = "attack" | "defense" | "facedown";

export type SpellType = "normal" | "quick-play" | "continuous" | "field" | "equip" | "ritual";

export type TrapType = "normal" | "continuous" | "counter";

export type MonsterAttribute = "DARK" | "LIGHT" | "EARTH" | "WIND" | "WATER" | "FIRE" | "DIVINE";

export type MonsterRace =
  | "Dragon"
  | "Spellcaster"
  | "Zombie"
  | "Warrior"
  | "Beast-Warrior"
  | "Beast"
  | "Winged Beast"
  | "Fiend"
  | "Fairy"
  | "Insect"
  | "Dinosaur"
  | "Reptile"
  | "Fish"
  | "Sea Serpent"
  | "Machine"
  | "Thunder"
  | "Aqua"
  | "Pyro"
  | "Rock"
  | "Plant"
  | "Psychic"
  | "Divine-Beast"
  | "Creator God"
  | "Wyrm"
  | "Cyberse";

// ============================================================================
// Game State
// ============================================================================

export interface GameState {
  gameId: string;
  status: GameStatus;
  currentTurnPlayer: TurnPlayer;
  phase: GamePhase;
  turnNumber: number;
  isMyTurn: boolean;

  // Player states
  myState: PlayerGameState;
  opponentState: OpponentGameState;

  // My hand (only I can see)
  myHand: CardInHand[];

  // Turn restrictions
  hasNormalSummoned: boolean;
  monsterPositionChanges: boolean[];
}

export interface PlayerGameState {
  playerId: string;
  lifePoints: number;
  deckCount: number;

  monsters: MonsterOnBoard[];
  spellTraps: SpellTrapOnBoard[];

  graveyard: CardInGraveyard[];
  banished: CardInGraveyard[];
  extraDeckCount: number;
}

export interface OpponentGameState {
  playerId: string;
  lifePoints: number;
  deckCount: number;
  handCount: number;

  monsters: MonsterOnBoard[];
  spellTraps: SpellTrapOnBoard[];

  graveyard: CardInGraveyard[];
  banished: CardInGraveyard[];
  extraDeckCount: number;
}

// ============================================================================
// Cards
// ============================================================================

export interface Card {
  cardId: string;
  name: string;
  type: CardType;
  description: string;
}

export interface MonsterCard extends Card {
  type: "creature";
  level: number;
  atk: number;
  def: number;
  attribute: MonsterAttribute;
  race: MonsterRace;
  abilities: CardAbility[];
}

export interface SpellCard extends Card {
  type: "spell";
  spellType: SpellType;
  abilities: CardAbility[];
}

export interface TrapCard extends Card {
  type: "trap";
  trapType: TrapType;
  abilities: CardAbility[];
}

export interface CardInHand {
  handIndex: number;
  card: Card | MonsterCard | SpellCard | TrapCard;
  canPlay: boolean;
  tributesRequired?: number;
}

export interface MonsterOnBoard {
  boardIndex: number;
  card: MonsterCard;
  position: MonsterPosition;
  currentAtk: number;
  currentDef: number;
  canAttack: boolean;
  canChangePosition: boolean;
  summonedThisTurn: boolean;
  attacksThisTurn: number;
}

export interface SpellTrapOnBoard {
  boardIndex: number;
  card: SpellCard | TrapCard;
  faceUp: boolean;
  canActivate: boolean;
}

export interface CardInGraveyard {
  card: Card | MonsterCard | SpellCard | TrapCard;
  turnSentToGraveyard: number;
}

// ============================================================================
// Card Abilities
// ============================================================================

export interface CardAbility {
  abilityId: string;
  name: string;
  type: "trigger" | "ignition" | "quick" | "continuous" | "flip" | "summon";
  timing: "summon" | "flip" | "onDestroy" | "onDamage" | "standby" | "endPhase" | "any";
  description: string;
  cost?: AbilityCost;
  effects: CardEffect[];
}

export interface AbilityCost {
  type: "discard" | "tribute" | "lifePoints" | "banish";
  amount?: number;
  targets?: string; // Description like "1 monster from hand"
}

export interface CardEffect {
  effectType:
    | "destroy"
    | "modifyATK"
    | "modifyDEF"
    | "draw"
    | "damage"
    | "heal"
    | "specialSummon"
    | "banish"
    | "returnToHand"
    | "negate"
    | "preventDestruction";

  target: "self" | "opponent" | "all" | "select";
  value?: number;
  duration?: "permanent" | "untilEndPhase" | "thisTurn" | "nextTurn";
  condition?: string;
}

// ============================================================================
// Game Actions (Internal representation)
// ============================================================================

export interface GameAction {
  type: string;
  description: string;
  isLegal: boolean;
  reason?: string; // If not legal
  /**
   * Action parameters - flexible structure for various action types.
   * Uses any for maximum flexibility when representing game actions.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Flexible parameters for various action types
  parameters?: Record<string, any>;
}

export interface SummonAction extends GameAction {
  type: "summon";
  handIndex: number;
  position: MonsterPosition;
  tributesRequired: number;
  tributeOptions: number[][];
}

export interface AttackAction extends GameAction {
  type: "attack";
  attackerIndex: number;
  possibleTargets: number[];
  canDirectAttack: boolean;
}

export interface SpellActivationAction extends GameAction {
  type: "activate_spell";
  location: "hand" | "field";
  index: number;
  requiresTarget: boolean;
  validTargets?: Target[];
}

// ============================================================================
// Battle & Damage
// ============================================================================

export interface BattleResult {
  attackerId: string;
  defenderId?: string; // Undefined if direct attack
  attackerDestroyed: boolean;
  defenderDestroyed: boolean;
  damageToAttacker: number;
  damageToDefender: number;
  damageToPlayer?: {
    player: TurnPlayer;
    amount: number;
  };
}

export interface DamageEvent {
  player: TurnPlayer;
  amount: number;
  source: "battle" | "effect";
  cardId?: string;
}

// ============================================================================
// Chain System
// ============================================================================

export interface ChainLink {
  linkNumber: number;
  playerId: string;
  cardId: string;
  cardName: string;
  abilityId: string;
  targets?: Target[];
}

export interface ChainState {
  isChainOpen: boolean;
  currentChain: ChainLink[];
  canRespond: boolean;
  responseWindow: number; // Milliseconds remaining
}

export interface Target {
  type: "monster" | "spell_trap";
  owner: TurnPlayer;
  boardIndex: number;
}

// ============================================================================
// Strategy & Analysis
// ============================================================================

export interface BoardAnalysis {
  advantage:
    | "strong_advantage"
    | "slight_advantage"
    | "even"
    | "slight_disadvantage"
    | "strong_disadvantage";
  myMonsterCount: number;
  opponentMonsterCount: number;
  myBackrowCount: number;
  opponentBackrowCount: number;
  myStrongestMonster?: {
    name: string;
    atk: number;
    boardIndex: number;
  };
  opponentStrongestMonster?: {
    name: string;
    atk: number;
    boardIndex: number;
  };
  threatsToMyMonsters: Threat[];
  opportunitiesForAttack: AttackOpportunity[];
}

export interface Threat {
  type: "stronger_monster" | "unknown_backrow" | "direct_attack_open";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AttackOpportunity {
  attackerIndex: number;
  attackerName: string;
  targetIndex?: number;
  targetName?: string;
  isDirect: boolean;
  guaranteedDamage: number;
  risk: "none" | "low" | "medium" | "high";
  recommendation: string;
}

export interface StrategyRecommendation {
  playStyle: "aggressive" | "defensive" | "control" | "balanced";
  priority: "establish_board" | "clear_opponent" | "protect_life_points" | "finish_game";
  suggestedActions: string[];
  reasoning: string;
}

// ============================================================================
// Decision Context (for LLM)
// ============================================================================

export interface DecisionContext {
  gameState: GameState;
  boardAnalysis: BoardAnalysis;
  legalActions: GameAction[];
  strategyRecommendation: StrategyRecommendation;
  turnHistory: string[];
  personality: {
    playStyle: string;
    riskTolerance: "low" | "medium" | "high";
    trashTalkLevel: "none" | "mild" | "aggressive";
  };
}
