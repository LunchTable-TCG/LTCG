/**
 * Plugin Constants
 */

/**
 * Production deployment URLs
 *
 * IMPORTANT: Update these URLs before publishing the plugin to NPM.
 * These are the centralized LTCG game service URLs that all agents connect to.
 *
 * Users can override these in their .env for development/testing:
 * - LTCG_API_URL - Override API base URL
 * - LTCG_CONVEX_URL - Override Convex deployment URL
 */
export const LTCG_PRODUCTION_CONFIG = {
  /**
   * Production API URL
   * TODO: Update this to your deployed LTCG API URL before publishing
   */
  API_URL: process.env.LTCG_PRODUCTION_API_URL || "https://ltcg-production.vercel.app",

  /**
   * Production Convex deployment URL
   * TODO: Update this to your production Convex deployment URL before publishing
   */
  CONVEX_URL: process.env.LTCG_PRODUCTION_CONVEX_URL || "https://calm-pelican-123.convex.cloud",
} as const;

/**
 * HTTP API endpoints
 */
export const API_ENDPOINTS = {
  // Agent management
  REGISTER_AGENT: "/api/agents/register",
  GET_AGENT_PROFILE: "/api/agents/me",
  GET_RATE_LIMIT: "/api/agents/rate-limit",
  GET_WALLET_INFO: "/api/agents/wallet",

  // Game state
  GET_PENDING_TURNS: "/api/agents/pending-turns",
  GET_GAME_STATE: "/api/agents/games/state",
  GET_AVAILABLE_ACTIONS: "/api/agents/games/available-actions",
  GET_GAME_HISTORY: "/api/agents/games/history",

  // Game actions
  ACTION_SUMMON: "/api/agents/games/actions/summon",
  ACTION_SET_CARD: "/api/agents/games/actions/set-card",
  ACTION_SET_SPELL_TRAP: "/api/agents/games/actions/set-spell-trap",
  ACTION_ACTIVATE_SPELL: "/api/agents/games/actions/activate-spell",
  ACTION_ACTIVATE_TRAP: "/api/agents/games/actions/activate-trap",
  ACTION_ATTACK: "/api/agents/games/actions/attack",
  ACTION_CHANGE_POSITION: "/api/agents/games/actions/change-position",
  ACTION_FLIP_SUMMON: "/api/agents/games/actions/flip-summon",
  ACTION_CHAIN_RESPONSE: "/api/agents/games/actions/chain-response",
  ACTION_END_TURN: "/api/agents/games/actions/end-turn",
  ACTION_SURRENDER: "/api/agents/games/actions/surrender",
  ACTION_ENTER_BATTLE: "/api/agents/games/actions/enter-battle",
  ACTION_ENTER_MAIN2: "/api/agents/games/actions/enter-main2",

  // Matchmaking
  MATCHMAKING_ENTER: "/api/agents/matchmaking/enter",
  MATCHMAKING_WAGER_ENTER: "/api/agents/matchmaking/wager-enter",
  MATCHMAKING_LOBBIES: "/api/agents/matchmaking/lobbies",
  MATCHMAKING_JOIN: "/api/agents/matchmaking/join",
  MATCHMAKING_LEAVE: "/api/agents/matchmaking/leave",
  MATCHMAKING_HEARTBEAT: "/api/agents/matchmaking/heartbeat",

  // Story Mode (Instant AI Battles)
  STORY_CHAPTERS: "/api/agents/story/chapters",
  STORY_STAGES: "/api/agents/story/stages",
  STORY_START: "/api/agents/story/start",
  STORY_QUICK_PLAY: "/api/agents/story/quick-play",
  STORY_COMPLETE: "/api/agents/story/complete",
  STORY_AI_TURN: "/api/agents/story/ai-turn",

  // Decks & Cards
  GET_DECKS: "/api/agents/decks",
  GET_DECK: "/api/agents/decks/:id",
  GET_STARTER_DECKS: "/api/agents/starter-decks",
  CREATE_DECK: "/api/agents/decks/create",
  GET_CARDS: "/api/agents/cards",
  GET_CARD: "/api/agents/cards/:id",

  // Global Chat
  CHAT_SEND: "/api/agents/chat/send",
  CHAT_MESSAGES: "/api/agents/chat/messages",
  CHAT_ONLINE_USERS: "/api/agents/chat/online-users",
} as const;

/**
 * HTTP request timeouts (milliseconds)
 */
export const TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  LONG: 30000, // 30 seconds for slow operations
  MATCHMAKING: 60000, // 1 minute for matchmaking
} as const;

/**
 * Rate limiting
 */
export const RATE_LIMITS = {
  PER_MINUTE: 60,
  DAILY: 10000,
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRIES: 3,
} as const;

/**
 * Game constants
 */
export const GAME_CONSTANTS = {
  MAX_HAND_SIZE: 7,
  MAX_MONSTERS: 5,
  MAX_SPELL_TRAPS: 5,
  STARTING_LIFE_POINTS: 8000,
  STARTING_HAND_SIZE: 5,
  TURN_TIME_LIMIT: 60000, // 1 minute per turn
  CHAIN_RESPONSE_TIME: 10000, // 10 seconds to respond to chain
} as const;

/**
 * Card levels and tribute requirements
 */
export const TRIBUTE_REQUIREMENTS = {
  LEVEL_1_4: 0, // No tributes needed
  LEVEL_5_6: 1, // 1 tribute required
  LEVEL_7_PLUS: 2, // 2 tributes required
} as const;

/**
 * Game phases
 */
export const GAME_PHASES = {
  DRAW: "draw",
  STANDBY: "standby",
  MAIN1: "main1",
  BATTLE: "battle",
  MAIN2: "main2",
  END: "end",
} as const;

/**
 * Action validation messages
 */
export const VALIDATION_MESSAGES = {
  NOT_YOUR_TURN: "It is not your turn",
  WRONG_PHASE: "This action cannot be performed in the current phase",
  ALREADY_SUMMONED: "You have already summoned this turn",
  INSUFFICIENT_TRIBUTES: "Not enough monsters to tribute",
  NO_MONSTERS: "No monsters available",
  CANNOT_ATTACK: "This monster cannot attack",
  INVALID_TARGET: "Invalid target selected",
  HAND_EMPTY: "Your hand is empty",
  BOARD_FULL: "Your board is full",
} as const;

/**
 * Strategy priorities
 */
export const STRATEGY_PRIORITIES = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
  MINIMAL: 10,
} as const;

/**
 * Personality traits mapping to playstyle
 */
export const PERSONALITY_TRAITS = {
  aggressive: {
    attackFrequency: 0.9,
    defensePreference: 0.2,
    riskTolerance: 0.8,
    trashTalkChance: 0.6,
  },
  defensive: {
    attackFrequency: 0.4,
    defensePreference: 0.9,
    riskTolerance: 0.3,
    trashTalkChance: 0.2,
  },
  control: {
    attackFrequency: 0.5,
    defensePreference: 0.7,
    riskTolerance: 0.5,
    trashTalkChance: 0.4,
  },
  balanced: {
    attackFrequency: 0.6,
    defensePreference: 0.6,
    riskTolerance: 0.5,
    trashTalkChance: 0.4,
  },
} as const;

/**
 * Error codes from API
 */
export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_API_KEY: "INVALID_API_KEY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  GAME_NOT_FOUND: "GAME_NOT_FOUND",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  INVALID_PHASE: "INVALID_PHASE",
  INVALID_MOVE: "INVALID_MOVE",
  ALREADY_SUMMONED: "ALREADY_SUMMONED",
  INSUFFICIENT_TRIBUTES: "INSUFFICIENT_TRIBUTES",
  CARD_NOT_FOUND: "CARD_NOT_FOUND",
  INVALID_TARGET: "INVALID_TARGET",
  LOBBY_NOT_FOUND: "LOBBY_NOT_FOUND",
  LOBBY_FULL: "LOBBY_FULL",
  INVALID_DECK: "INVALID_DECK",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  exponentialBackoff: true,
} as const;

/**
 * Connection configuration
 */
export const CONNECTION_CONFIG = {
  reconnectInterval: 5000, // 5 seconds
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000, // 30 seconds
} as const;
