/**
 * Game Engine Types
 * These are placeholder types for the game UI components.
 * They will be replaced with actual Convex types when the backend is implemented.
 */

// Temporary ID types until Convex schema is updated
export type GameId = string & { __brand: "GameId" };
export type PlayerId = string & { __brand: "PlayerId" };
export type CardInstanceId = string & { __brand: "CardInstanceId" };
export type CardDefinitionId = string & { __brand: "CardDefinitionId" };

// Card types
export type CardRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type CardElement = "fire" | "water" | "earth" | "wind" | "neutral";
export type CardType = "creature" | "agent" | "spell" | "trap" | "equipment";
export type CardPosition = "attack" | "defense" | "facedown";

// Card instance in a game
export interface CardInstance {
  _id: CardInstanceId;
  gameId: GameId;
  ownerId: PlayerId;
  cardDefinitionId: CardDefinitionId;
  position: CardPosition;
  zone: CardZone;
  zoneIndex: number;
  isFaceDown: boolean;
  hasAttacked: boolean;
  canChangePosition: boolean;
  counters: number;
  attachedCards: CardInstanceId[];
  currentAttack: number;
  currentDefense: number;
  turnPlayed: number;
}

// Card definition
export interface CardDefinition {
  _id: CardDefinitionId;
  name: string;
  rarity: CardRarity;
  element: CardElement;
  cardType: CardType;
  attack?: number;
  defense?: number;
  cost: number;
  ability?: string;
  flavorText?: string;
  imageUrl?: string;
}

// Game zones
export type CardZone =
  | "hand"
  | "deck"
  | "monsterZone"
  | "spellTrapZone"
  | "graveyard"
  | "banished"
  | "fieldSpell"
  | "extraDeck";

// Game phases
export type GamePhase =
  | "draw"
  | "standby"
  | "main1"
  | "battle_start"
  | "battle"
  | "battle_end"
  | "main2"
  | "end";

// Player state
export interface PlayerState {
  _id: PlayerId;
  gameId: GameId;
  userId: string;
  username: string;
  lifePoints: number;
  deckCount: number;
  handCount: number;
  graveyardCount: number;
  normalSummonedThisTurn: boolean;
  hasDrawnThisTurn: boolean;
}

// Game state
export interface GameState {
  _id: GameId;
  player1Id: PlayerId;
  player2Id: PlayerId;
  currentTurn: PlayerId;
  phase: GamePhase;
  turnNumber: number;
  winner?: PlayerId;
  endReason?: "forfeit" | "lifepoints" | "deckout" | "timeout";
  chainStack: ChainLink[];
  startedAt: number;
  endedAt?: number;
}

// Chain resolution
export interface ChainLink {
  cardInstanceId: CardInstanceId;
  playerId: PlayerId;
  effectIndex: number;
  targets: CardInstanceId[];
}

// Actions
export interface ValidAction {
  type:
    | "normalSummon"
    | "setMonster"
    | "setSpellTrap"
    | "activateSpell"
    | "activateTrap"
    | "flipSummon"
    | "attack"
    | "directAttack"
    | "changePosition"
    | "endPhase"
    | "endTurn";
  cardInstanceId?: CardInstanceId;
  targetIds?: CardInstanceId[];
}

export interface AttackOption {
  attackerId: CardInstanceId;
  targetId?: CardInstanceId; // undefined for direct attack
}

export interface PendingAction {
  type: string;
  cardInstanceId: CardInstanceId;
  requiresResponse: boolean;
}

export interface ChainResponse {
  playerId: PlayerId;
  availableCards: CardInstanceId[];
  timeRemaining: number;
}

// Card in zone for UI rendering
export interface CardInZone {
  instance: CardInstance;
  definition: CardDefinition;
  isPlayable: boolean;
  isActivatable: boolean;
  canAttack: boolean;
  canBeTargeted: boolean;
}
