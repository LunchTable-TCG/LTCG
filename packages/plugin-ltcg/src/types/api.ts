/**
 * API Request and Response Types
 *
 * These types match the HTTP REST API endpoints implemented in PART 1.
 */

import { Id } from './game';

// ============================================================================
// Authentication & Agent Management
// ============================================================================

export interface RegisterAgentRequest {
  name: string;
  starterDeckCode?: string;
}

export interface RegisterAgentResponse {
  success: true;
  data: {
    userId: string;
    agentId: string;
    apiKey: string; // Only shown once
    keyPrefix: string;
    walletAddress?: string; // Solana HD wallet address (non-custodial)
  };
}

export interface AgentProfile {
  agentId: string;
  userId: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  createdAt: number;
  // HD Wallet info (non-custodial, Privy-managed)
  walletAddress?: string;
  walletChainType?: 'solana';
  walletCreatedAt?: number;
}

// ============================================================================
// Wallet Types (Non-custodial HD wallets via Privy)
// ============================================================================

export interface WalletInfo {
  address: string;
  chainType: 'solana';
  walletIndex: number; // HD derivation index
  createdAt: number;
  // Balance info (optional, fetched separately)
  balance?: {
    lamports: number;
    sol: number;
  };
}

export interface WalletStatusResponse {
  success: true;
  data: {
    hasWallet: boolean;
    wallet?: WalletInfo;
  };
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: number;
  dailyRemaining: number;
  dailyLimit: number;
}

// ============================================================================
// Game State
// ============================================================================

/**
 * Game state response from /api/agents/games/state
 * Note: This matches the actual API response format, with legacy fields added by normalization
 */
export interface GameStateResponse {
  gameId: string;
  lobbyId: string;
  phase: 'draw' | 'standby' | 'main1' | 'battle' | 'main2' | 'end';
  turnNumber: number;
  currentTurnPlayer: string;
  isMyTurn: boolean;
  status: 'waiting' | 'active' | 'completed'; // Added for compatibility
  currentTurn: 'host' | 'opponent'; // Added for compatibility

  // Life points
  myLifePoints: number;
  opponentLifePoints: number;

  // Current player's hand
  hand: CardInHand[];

  // Board state - monsters/cards on field
  myBoard: BoardCard[];
  opponentBoard: BoardCard[];

  // Card counts
  myDeckCount: number;
  opponentDeckCount: number;
  myGraveyardCount: number;
  opponentGraveyardCount: number;
  opponentHandCount: number;

  // Turn restrictions
  normalSummonedThisTurn?: boolean;
  hasNormalSummoned?: boolean; // Alias for compatibility
  canChangePosition?: boolean[]; // Array indexed by board position

  // Legacy compatibility - always present after normalization
  hostPlayer: PlayerState;
  opponentPlayer: PlayerState;
}

/**
 * @deprecated Use GameStateResponse directly with myBoard/opponentBoard
 */
export interface PlayerState {
  playerId: string;
  lifePoints: number;
  deckCount: number;

  // Board zones
  monsterZone: MonsterCard[];
  spellTrapZone: SpellTrapCard[];

  // Other zones
  graveyard: CardInGraveyard[];
  banished: CardInGraveyard[];
  extraDeck: number; // Count only
}

/**
 * Card in hand - uses cardType from backend schema
 * Note: cardType values are 'creature', 'spell', 'trap', 'equipment'
 */
export interface CardInHand {
  _id: string;
  name: string;
  cardType: 'creature' | 'spell' | 'trap' | 'equipment';
  cost?: number;
  attack?: number;
  defense?: number;
  element?: string;
  archetype?: string;
  description?: string;
  abilities?: Record<string, any>[];
  // Legacy fields for compatibility
  handIndex?: number;
  cardId?: string;
  type?: 'creature' | 'spell' | 'trap' | 'equipment';
  level?: number;
  atk?: number;
  def?: number;
}

/**
 * Card on the board (monster zone)
 */
export interface BoardCard {
  _id: string;
  name: string;
  cardType: 'creature' | 'spell' | 'trap' | 'equipment';
  attack?: number;
  defense?: number;
  currentAttack?: number;
  currentDefense?: number;
  position: 0 | 1; // 0 = defense, 1 = attack
  hasAttacked: boolean;
  isFaceDown: boolean;
  element?: string;
  cost?: number;
}

export interface MonsterCard {
  boardIndex: number;
  cardId: string;
  name: string;
  position: 'attack' | 'defense' | 'facedown';
  atk: number;
  def: number;
  level: number;
  canAttack: boolean;
  canChangePosition: boolean;
  summonedThisTurn: boolean;
  faceUp?: boolean; // Whether the monster is face-up
}

export interface SpellTrapCard {
  boardIndex: number;
  cardId: string;
  name: string;
  faceUp: boolean;
  type: 'spell' | 'trap';
  cardType?: string; // Alternative field for card type
  description?: string; // Card effect description
}

export interface CardInGraveyard {
  cardId: string;
  name: string;
  type: 'creature' | 'spell' | 'trap' | 'equipment';
}

// ============================================================================
// Available Actions
// ============================================================================

export interface AvailableAction {
  type: 'summon' | 'set' | 'activate_spell' | 'activate_trap' | 'attack' | 'change_position' | 'end_turn' | 'chain_response';
  description: string;
  parameters?: Record<string, any>;
}

export interface AvailableActionsResponse {
  gameId: string;
  phase: string;
  actions: AvailableAction[];
}

// ============================================================================
// Game Actions
// ============================================================================

export interface SummonRequest {
  gameId: string;
  handIndex: number;
  position: 'attack' | 'defense';
  tributeIndices?: number[];
}

export interface SetCardRequest {
  gameId: string;
  handIndex: number;
  zone: 'monster' | 'spellTrap';
}

export interface SetSpellTrapRequest {
  gameId: string;
  cardId: string;
}

export interface ActivateSpellRequest {
  gameId: string;
  handIndex?: number;
  boardIndex?: number;
  targets?: Target[];
}

export interface ActivateTrapRequest {
  gameId: string;
  boardIndex: number;
  targets?: Target[];
}

export interface AttackRequest {
  gameId: string;
  attackerBoardIndex: number;
  targetBoardIndex?: number; // Omit for direct attack
}

export interface ChangePositionRequest {
  gameId: string;
  boardIndex: number;
  newPosition: 'attack' | 'defense';
}

export interface FlipSummonRequest {
  gameId: string;
  boardIndex: number;
}

export interface ChainResponseRequest {
  gameId: string;
  respond: boolean;
  handIndex?: number;
  boardIndex?: number;
  targets?: Target[];
}

export interface EndTurnRequest {
  gameId: string;
}

export interface SurrenderRequest {
  gameId: string;
}

export interface Target {
  type: 'monster' | 'spell_trap';
  owner: 'self' | 'opponent';
  index: number;
}

// ============================================================================
// Matchmaking
// ============================================================================

export interface EnterMatchmakingRequest {
  deckId: string;
  mode: 'casual' | 'ranked';
  isPrivate?: boolean;
}

export interface EnterMatchmakingResponse {
  lobbyId: string;
  joinCode?: string;
  status: 'waiting' | 'matched';
  gameId?: string;
}

export interface Lobby {
  lobbyId: string;
  mode: 'casual' | 'ranked';
  hostPlayerId: string;
  hostPlayerName: string;
  isPrivate: boolean;
  joinCode?: string;
  status: 'waiting' | 'matched';
  createdAt: number;
}

export interface JoinLobbyRequest {
  lobbyId?: string;
  joinCode?: string;
  deckId: string;
}

export interface JoinLobbyResponse {
  gameId: string;
  opponentName: string;
}

// ============================================================================
// Decks & Cards
// ============================================================================

export interface Deck {
  deckId: string;
  name: string;
  cards: CardDefinition[];
  archetype?: string;
}

export interface CardDefinition {
  cardId: string;
  name: string;
  type: 'creature' | 'spell' | 'trap' | 'equipment';
  level?: number;
  atk?: number;
  def?: number;
  attribute?: string;
  race?: string;
  description: string;
  abilities: Record<string, any>[];
}

export interface StarterDeck {
  code: string;
  name: string;
  description: string;
  archetype: string;
}

export interface CreateDeckRequest {
  name: string;
  cardIds: string[];
  archetype?: string;
}

// ============================================================================
// Game Events (History)
// ============================================================================

export interface GameEvent {
  eventId: string;
  gameId: string;
  turnNumber: number;
  phase: string;
  eventType: 'summon' | 'spell_activation' | 'attack' | 'damage' | 'draw' | 'turn_end';
  playerId: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Generic API Response Wrappers
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Error Codes
// ============================================================================

export enum ApiErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Game errors
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  INVALID_PHASE = 'INVALID_PHASE',
  INVALID_MOVE = 'INVALID_MOVE',
  ALREADY_SUMMONED = 'ALREADY_SUMMONED',
  INSUFFICIENT_TRIBUTES = 'INSUFFICIENT_TRIBUTES',
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  INVALID_TARGET = 'INVALID_TARGET',

  // Monster position errors
  CANNOT_FLIP_THIS_TURN = 'CANNOT_FLIP_THIS_TURN',
  CANNOT_CHANGE_POSITION = 'CANNOT_CHANGE_POSITION',
  ALREADY_CHANGED_POSITION = 'ALREADY_CHANGED_POSITION',
  WRONG_POSITION = 'WRONG_POSITION',

  // Spell/Trap errors
  TRAP_NOT_READY = 'TRAP_NOT_READY',
  CARD_NOT_IN_ZONE = 'CARD_NOT_IN_ZONE',
  CARD_ALREADY_FACE_UP = 'CARD_ALREADY_FACE_UP',
  ZONE_FULL = 'ZONE_FULL',
  INVALID_CARD_TYPE = 'INVALID_CARD_TYPE',
  SET_SPELL_TRAP_FAILED = 'SET_SPELL_TRAP_FAILED',

  // Attack errors
  ALREADY_ATTACKED = 'ALREADY_ATTACKED',

  // Matchmaking errors
  LOBBY_NOT_FOUND = 'LOBBY_NOT_FOUND',
  LOBBY_FULL = 'LOBBY_FULL',
  INVALID_DECK = 'INVALID_DECK',

  // Generic errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  NOT_A_PLAYER = 'NOT_A_PLAYER',
}
