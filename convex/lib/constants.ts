/**
 * Shared Constants for Convex
 *
 * Centralized configuration values used across feature modules.
 * Modify these values to adjust game economy and behavior.
 */

/**
 * Rarity distribution weights (out of 1000)
 * Used for pack opening and random card generation
 */
export const RARITY_WEIGHTS = {
  common: 650, // 65%
  uncommon: 200, // 20%
  rare: 100, // 10%
  epic: 40, // 4%
  legendary: 10, // 1%
} as const;

/**
 * Marketplace Configuration
 */
export const MARKETPLACE = {
  /** Platform fee percentage (0.05 = 5%) */
  PLATFORM_FEE_PERCENT: 0.05,

  /** Minimum bid increment percentage (0.05 = 5%) */
  MIN_BID_INCREMENT_PERCENT: 0.05,

  /** Minimum listing price in gold */
  MIN_LISTING_PRICE: 10,

  /** Minimum auction duration in hours */
  MIN_AUCTION_DURATION: 1,

  /** Maximum auction duration in hours */
  MAX_AUCTION_DURATION: 168, // 7 days
} as const;

/**
 * Economy Configuration
 */
export const ECONOMY = {
  /** Starting gold for new players */
  WELCOME_BONUS_GOLD: 500,

  /** Starting gems for new players */
  WELCOME_BONUS_GEMS: 100,
} as const;

/**
 * Pagination Configuration
 */
export const PAGINATION = {
  /** Default page size for transaction history */
  TRANSACTION_PAGE_SIZE: 20,

  /** Default page size for marketplace listings */
  MARKETPLACE_PAGE_SIZE: 50,

  /** Default page size for pack opening history */
  PACK_HISTORY_PAGE_SIZE: 20,
} as const;

/**
 * Chat Configuration
 */
export const CHAT = {
  /** Rate limit: max messages per time window (per user) */
  RATE_LIMIT_MAX_MESSAGES: 10,

  /** Rate limit: time window in milliseconds */
  RATE_LIMIT_WINDOW_MS: 60000, // 60 seconds

  /** Presence timeout in milliseconds */
  PRESENCE_TIMEOUT_MS: 300000, // 5 minutes
} as const;

/**
 * Leaderboard Configuration
 */
export const LEADERBOARD = {
  /** Number of top players to cache in snapshots */
  PAGE_SIZE: 100,

  /** How often to refresh leaderboard snapshots (5 minutes) */
  CACHE_REFRESH_INTERVAL_MS: 5 * 60 * 1000,

  /** Number of ranks to display on leaderboards page */
  RANKS_TO_DISPLAY: 100,
} as const;

/**
 * XP and Level Progression System
 */
export const XP_SYSTEM = {
  /** Base XP required for level 2 */
  BASE_XP_PER_LEVEL: 100,

  /** Gentle curve: each level requires 1.2x more XP than previous */
  XP_MULTIPLIER: 1.2,

  /** XP awarded for story mode victory */
  STORY_WIN_XP: 50,

  /** XP awarded for ranked match victory */
  RANKED_WIN_XP: 30,

  /** XP awarded for casual match victory */
  CASUAL_WIN_XP: 20,

  /** XP awarded for story mode loss (no penalty) */
  STORY_LOSS_XP: 0,
} as const;

/**
 * ELO Rating System
 */
export const ELO_SYSTEM = {
  /** Default starting rating for new players */
  DEFAULT_RATING: 1000,

  /** Standard ELO K-factor (rating volatility) */
  K_FACTOR: 32,

  /** Minimum rating floor */
  RATING_FLOOR: 0,
} as const;

/**
 * Spectator System Configuration
 */
export const SPECTATOR = {
  /** Maximum spectators per game */
  MAX_SPECTATORS_PER_GAME: 100,

  /** Default: allow spectators on public games */
  DEFAULT_ALLOW_SPECTATORS: true,

  /** Spectator count update throttle (ms) */
  COUNT_UPDATE_THROTTLE_MS: 5000, // Update every 5 seconds max
} as const;

/**
 * Rate Limiting Configuration
 * SECURITY: Protects against abuse of sensitive operations
 *
 * Uses @convex-dev/ratelimiter configured in convex.config.ts
 */
export const RATELIMIT_CONFIG = {
  /** Enable rate limiting in production */
  ENABLED: true,

  /** Log rate limit violations for monitoring */
  LOG_VIOLATIONS: true,
} as const;
