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
  walletChainType?: "solana";
  walletCreatedAt?: number;
}

// ============================================================================
// Wallet Types (Non-custodial HD wallets via Privy)
// ============================================================================

export interface WalletInfo {
  address: string;
  chainType: "solana";
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
  phase: "draw" | "standby" | "main1" | "battle" | "main2" | "end";
  turnNumber: number;
  currentTurnPlayer: string;
  isMyTurn: boolean;
  myPlayerId?: string;
  opponentPlayerId?: string;
  status: "waiting" | "active" | "completed"; // Added for compatibility
  currentTurn: "host" | "opponent"; // Added for compatibility

  // Life points
  myLifePoints: number;
  opponentLifePoints: number;

  // Current player's hand
  hand: CardInHand[];

  // Board state - monsters/cards on field
  myBoard: BoardCard[];
  opponentBoard: BoardCard[];
  mySpellTrapZone?: SpellTrapCard[];
  opponentSpellTrapZone?: SpellTrapCard[];

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
  monsterPositionChanges?: string[]; // Positions that can change

  // Legacy flat fields for compatibility (before normalization)
  hostId?: string;
  hostLifePoints?: number;
  hostDeckCount?: number;
  hostMonsters?: MonsterCard[];
  hostSpellTraps?: SpellTrapCard[];
  hostGraveyard?: CardInGraveyard[];
  hostBanished?: CardInGraveyard[];
  hostExtraDeckCount?: number;
  opponentId?: string;
  opponentMonsters?: MonsterCard[];
  opponentSpellTraps?: SpellTrapCard[];
  opponentGraveyard?: CardInGraveyard[];
  opponentBanished?: CardInGraveyard[];
  opponentExtraDeckCount?: number;
  myHand?: CardInHand[];

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
 *
 * Authoritative fields (use these):
 * - cardType (not type)
 * - attack (not atk)
 * - defense (not def)
 * - cost (not level)
 */
/**
 * Card ability effect structure
 */
export interface CardAbilityEffect {
  type?: string;
  value?: number | string;
  target?: string;
  condition?: string;
  duration?: string;
  [key: string]: number | string | boolean | undefined;
}

/**
 * Card ability structure - covers all ability types in the game
 */
export interface CardAbility {
  name?: string;
  type?: string;
  timing?: string;
  description?: string;
  cost?: Record<string, number | string>;
  effects?: CardAbilityEffect[];
  [key: string]:
    | number
    | string
    | boolean
    | Record<string, number | string>
    | CardAbilityEffect[]
    | undefined;
}

export interface CardInHand {
  /** Unique card instance ID */
  _id: string;
  /** Card name */
  name: string;
  /** Card type - use this over legacy 'type' field */
  cardType: "creature" | "spell" | "trap" | "equipment";
  /** Mana/resource cost */
  cost?: number;
  /** Attack value - use this over legacy 'atk' field */
  attack?: number;
  /** Defense value - use this over legacy 'def' field */
  defense?: number;
  /** Card element (fire, water, etc.) */
  element?: string;
  /** Card archetype for synergies */
  archetype?: string;
  /** Card effect description */
  description?: string;
  /** Card abilities/effects structure */
  abilities?: CardAbility[];
  /** Position in hand (0-indexed) */
  handIndex?: number;
  /** @deprecated Use _id instead */
  cardId?: string;
  /** @deprecated Use cardType instead */
  type?: "creature" | "spell" | "trap" | "equipment";
  /** @deprecated Use cost instead */
  level?: number;
  /** @deprecated Use attack instead */
  atk?: number;
  /** @deprecated Use defense instead */
  def?: number;
}

/**
 * Card on the board (monster zone) - new API format
 *
 * Position values: 1 = attack, 2 = defense (matches server FieldMonster)
 */
export interface BoardCard {
  /** Unique card instance ID */
  _id: string;
  /** Card name */
  name: string;
  /** Card type */
  cardType: "creature" | "spell" | "trap" | "equipment";
  /** Base attack value */
  attack?: number;
  /** Base defense value */
  defense?: number;
  /** Current attack (after modifications) */
  currentAttack?: number;
  /** Current defense (after modifications) */
  currentDefense?: number;
  /** Battle position: 1 = attack, 2 = defense */
  position: 1 | 2;
  /** Whether monster has attacked this turn */
  hasAttacked: boolean;
  /** Whether card is face-down */
  isFaceDown: boolean;
  /** Whether monster has changed position this turn */
  hasChangedPosition?: boolean;
  /** Card element */
  element?: string;
  /** Card cost */
  cost?: number;
}

export interface MonsterCard {
  boardIndex: number;
  cardId: string;
  name: string;
  position: "attack" | "defense" | "facedown";
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
  type: "spell" | "trap";
  cardType?: string; // Alternative field for card type
  description?: string; // Card effect description
}

export interface CardInGraveyard {
  cardId: string;
  name: string;
  type: "creature" | "spell" | "trap" | "equipment";
}

// ============================================================================
// Available Actions
// ============================================================================

/**
 * Action parameters - covers all action types in the game
 * Uses cardId-based params matching the Convex HTTP API
 */
export interface ActionParameters {
  cardId?: string;
  position?: "attack" | "defense";
  tributeCardIds?: string[];
  attackerCardId?: string;
  targetCardId?: string;
  targets?: string[];
  pass?: boolean;
  newPosition?: "attack" | "defense";
  [key: string]: number | number[] | string | string[] | boolean | undefined;
}

/**
 * Available action from /api/agents/games/available-actions
 * Note: Server uses `action` field, not `type`
 */
export interface AvailableAction {
  /** Action identifier (e.g., "summon", "attack", "end_turn") */
  action: string;
  description: string;
  /** Card IDs that can perform this action */
  availableCards?: string[];
  /** Number of available monsters for this action */
  availableMonsters?: number;
  /** Number of attackable monsters */
  attackableMonsters?: number;
  /** Chain link number (for chain responses) */
  chainLink?: number;
  /** Action-specific parameters from the server */
  parameters?: Record<string, unknown>;
}

export interface AvailableActionsResponse {
  phase: string;
  turnNumber: number;
  actions: AvailableAction[];
  /** Present when actions array is empty (e.g. "Not your turn") */
  reason?: string;
}

// ============================================================================
// Game Actions
// ============================================================================

export interface SummonRequest {
  gameId: string;
  cardId: string;
  position: "attack" | "defense";
  tributeCardIds?: string[];
}

export interface SetCardRequest {
  gameId: string;
  cardId: string;
  tributeCardIds?: string[];
}

export interface SetSpellTrapRequest {
  gameId: string;
  cardId: string;
}

export interface ActivateSpellRequest {
  gameId: string;
  cardId: string;
  targets?: string[];
}

export interface ActivateTrapRequest {
  gameId: string;
  cardId: string;
  targets?: string[];
}

export interface AttackRequest {
  gameId: string;
  attackerCardId: string;
  targetCardId?: string; // Omit for direct attack
}

export interface ChangePositionRequest {
  gameId: string;
  cardId: string;
}

export interface FlipSummonRequest {
  gameId: string;
  cardId: string;
  newPosition: "attack" | "defense";
}

export interface ChainResponseRequest {
  gameId: string;
  pass: boolean;
  cardId?: string;
  targets?: string[];
}

export interface EndTurnRequest {
  gameId: string;
}

export interface SurrenderRequest {
  gameId: string;
}

// ============================================================================
// Matchmaking
// ============================================================================

export interface EnterMatchmakingRequest {
  deckId: string;
  mode: "casual" | "ranked";
  isPrivate?: boolean;
}

export interface EnterMatchmakingResponse {
  lobbyId: string;
  joinCode?: string;
  status: "waiting" | "matched";
  gameId?: string;
}

export interface Lobby {
  lobbyId: string;
  mode: "casual" | "ranked";
  hostPlayerId: string;
  hostPlayerName: string;
  isPrivate: boolean;
  joinCode?: string;
  status: "waiting" | "matched";
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
  type: "creature" | "spell" | "trap" | "equipment";
  level?: number;
  atk?: number;
  def?: number;
  attribute?: string;
  race?: string;
  description: string;
  /** Card abilities structure */
  abilities: CardAbility[];
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

/**
 * Game event metadata - covers all event types
 */
export interface GameEventMetadata {
  cardId?: string;
  cardName?: string;
  fromZone?: string;
  toZone?: string;
  damage?: number;
  lifePoints?: number;
  attackerId?: string;
  targetId?: string;
  tributeIds?: string[];
  [key: string]: number | string | string[] | undefined;
}

export interface GameEvent {
  eventId: string;
  gameId: string;
  turnNumber: number;
  phase: string;
  eventType: "summon" | "spell_activation" | "attack" | "damage" | "draw" | "turn_end";
  playerId: string;
  description: string;
  timestamp: number;
  /** Event metadata structure */
  metadata?: GameEventMetadata;
}

// ============================================================================
// Generic API Response Wrappers
// ============================================================================

/**
 * API error details structure
 */
export interface ApiErrorDetails {
  gameId?: string;
  phase?: string;
  turnPlayer?: string;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  resetAt?: number;
  missingFields?: string[];
  invalidFields?: string[];
  [key: string]: number | string | string[] | undefined;
}

/**
 * Generic API success response wrapper.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    /** Error details structure */
    details?: ApiErrorDetails;
  };
  timestamp: number;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Error Codes
// ============================================================================

export enum ApiErrorCode {
  // Authentication
  UNAUTHORIZED = "UNAUTHORIZED",
  INVALID_API_KEY = "INVALID_API_KEY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Game errors
  GAME_NOT_FOUND = "GAME_NOT_FOUND",
  NOT_YOUR_TURN = "NOT_YOUR_TURN",
  INVALID_PHASE = "INVALID_PHASE",
  INVALID_MOVE = "INVALID_MOVE",
  ALREADY_SUMMONED = "ALREADY_SUMMONED",
  INSUFFICIENT_TRIBUTES = "INSUFFICIENT_TRIBUTES",
  CARD_NOT_FOUND = "CARD_NOT_FOUND",
  INVALID_TARGET = "INVALID_TARGET",

  // Monster position errors
  CANNOT_FLIP_THIS_TURN = "CANNOT_FLIP_THIS_TURN",
  CANNOT_CHANGE_POSITION = "CANNOT_CHANGE_POSITION",
  ALREADY_CHANGED_POSITION = "ALREADY_CHANGED_POSITION",
  WRONG_POSITION = "WRONG_POSITION",

  // Spell/Trap errors
  TRAP_NOT_READY = "TRAP_NOT_READY",
  CARD_NOT_IN_ZONE = "CARD_NOT_IN_ZONE",
  CARD_ALREADY_FACE_UP = "CARD_ALREADY_FACE_UP",
  ZONE_FULL = "ZONE_FULL",
  INVALID_CARD_TYPE = "INVALID_CARD_TYPE",
  SET_SPELL_TRAP_FAILED = "SET_SPELL_TRAP_FAILED",

  // Attack errors
  ALREADY_ATTACKED = "ALREADY_ATTACKED",

  // Matchmaking errors
  LOBBY_NOT_FOUND = "LOBBY_NOT_FOUND",
  LOBBY_FULL = "LOBBY_FULL",
  INVALID_DECK = "INVALID_DECK",

  // Generic errors
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  NOT_A_PLAYER = "NOT_A_PLAYER",
}
