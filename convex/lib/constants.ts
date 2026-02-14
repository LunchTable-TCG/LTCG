/**
 * Shared Constants for Convex
 *
 * Centralized configuration values used across feature modules.
 * Modify these values to adjust game economy and behavior.
 *
 * NOTE: Values below are being migrated to @lunchtable-tcg/config defaults.
 * New constants should go to the config package.
 * See packages/config/src/defaults.ts for config-driven equivalents.
 */

/**
 * Rarity distribution weights (out of 1000)
 * Used for pack opening and random card generation
 * → config.economy.rarityWeights
 * @deprecated Use getGameConfig(ctx).economy.rarityWeights instead
 */
export const RARITY_WEIGHTS = {
  common: 550, // 55%
  uncommon: 280, // 28%
  rare: 120, // 12%
  epic: 40, // 4%
  legendary: 10, // 1%
} as const;

/**
 * Card Variant System
 * Variants are cosmetic versions with different drop rates
 * Applied as multipliers on top of base rarity rates
 * @deprecated Use getGameConfig(ctx).economy.variantBaseRates for base rates
 */
export const VARIANT_CONFIG = {
  /** Base variant drop rates (out of 10,000 for precision) */
  BASE_RATES: {
    standard: 8800, // 88% - default, always get at least this
    foil: 1000, // 10% base chance
    alt_art: 200, // 2% base chance
    full_art: 50, // 0.5% base chance
    // numbered and first_edition are special - never random drops
  },

  /** Variant multipliers by pack type (multiply BASE_RATES) */
  PACK_MULTIPLIERS: {
    basic: { foil: 1.0, altArt: 1.0, fullArt: 1.0 },
    standard: { foil: 1.5, altArt: 1.0, fullArt: 1.0 },
    premium: { foil: 2.0, altArt: 1.5, fullArt: 1.0 },
    legendary: { foil: 3.0, altArt: 2.0, fullArt: 1.0 },
    collector: { foil: 5.0, altArt: 5.0, fullArt: 5.0 },
    ultimate: { foil: 10.0, altArt: 5.0, fullArt: 2.0 },
  },

  /** Gold pack multipliers (lower than gem packs) */
  GOLD_PACK_MULTIPLIERS: {
    basic: { foil: 0.5, altArt: 0.5, fullArt: 0.5 },
    standard: { foil: 1.0, altArt: 0.5, fullArt: 0.5 },
    premium: { foil: 1.5, altArt: 1.0, fullArt: 1.0 },
  },

  /** Maximum numbered cards per card definition */
  NUMBERED_MAX_SERIAL: 500,
} as const;

/**
 * Pity System Configuration
 * Guarantees rare drops after X packs without one
 * Resets counter when target is pulled
 * @deprecated Use getGameConfig(ctx).economy.pityThresholds instead
 */
export const PITY_THRESHOLDS = {
  /** Guaranteed Epic after this many packs without one */
  epic: 150,

  /** Guaranteed Legendary after this many packs without one */
  legendary: 500,

  /** Guaranteed Full Art variant after this many packs without one */
  fullArt: 1000,
} as const;

/**
 * Marketplace Configuration
 * @deprecated Use getGameConfig(ctx).marketplace instead
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
 * → config.economy.startingCurrency (WELCOME_BONUS_GOLD)
 * @deprecated Use getGameConfig(ctx).economy.startingGold / startingGems instead
 */
export const ECONOMY = {
  /** Starting gold for new players → config.economy.startingCurrency */
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
 * @deprecated Use getGameConfig(ctx).social.chat instead
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
 * → config.progression.xp
 * @deprecated Use getGameConfig(ctx).progression.xp instead
 */
export const XP_SYSTEM = {
  /** Base XP required for level 2 */
  BASE_XP_PER_LEVEL: 100,

  /** Gentle curve: each level requires 1.2x more XP than previous */
  XP_MULTIPLIER: 1.2,

  /** XP awarded for story mode victory → config.progression.xp.storyWin */
  STORY_WIN_XP: 50,

  /** XP awarded for ranked match victory → config.progression.xp.rankedWin */
  RANKED_WIN_XP: 30,

  /** XP awarded for casual match victory → config.progression.xp.casualWin */
  CASUAL_WIN_XP: 20,

  /** XP awarded for ranked match loss (participation) → config.progression.xp.rankedLoss */
  RANKED_LOSS_XP: 10,

  /** XP awarded for casual match loss (participation) → config.progression.xp.casualLoss */
  CASUAL_LOSS_XP: 5,

  /** XP awarded for story mode loss (no penalty) → config.progression.xp.storyLoss */
  STORY_LOSS_XP: 0,

  /** XP awarded for daily login, scales with streak day (1-7) */
  DAILY_LOGIN_XP: [25, 30, 30, 35, 35, 40, 50] as const,
} as const;

/**
 * ELO Rating System
 * @deprecated Use getGameConfig(ctx).competitive.elo instead
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
 * Rank Thresholds - ELO boundaries for competitive tiers
 * @deprecated Use getGameConfig(ctx).competitive.rankThresholds instead
 */
export const RANK_THRESHOLDS = {
  Bronze: 0,
  Silver: 1200,
  Gold: 1400,
  Platinum: 1600,
  Diamond: 1800,
  Master: 2000,
  Legend: 2200,
} as const;

/**
 * Spectator System Configuration
 * @deprecated Use getGameConfig(ctx).social.spectator instead
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

/**
 * Token Configuration
 * SPL token integration for real-money marketplace
 */
export const TOKEN = {
  /** SPL token mint address (pump.fun token) - set via env var */
  MINT_ADDRESS: process.env["LTCG_TOKEN_MINT"] || "",

  /** Token decimals (pump.fun tokens typically use 6) */
  DECIMALS: 6,

  /** Treasury wallet for platform fees - set via env var */
  TREASURY_WALLET: process.env["LTCG_TREASURY_WALLET"] || "",

  /** Platform fee percentage (same as gold marketplace) */
  PLATFORM_FEE_PERCENT: 0.05, // 5%

  /** Minimum listing price in token smallest units (1 token = 1,000,000 units) */
  MIN_LISTING_PRICE: 1_000_000,

  /** Balance cache TTL in milliseconds */
  BALANCE_CACHE_TTL_MS: 60_000, // 1 minute

  /** Pending purchase expiry in milliseconds */
  PURCHASE_EXPIRY_MS: 300_000, // 5 minutes

  /** Transaction confirmation timeout in milliseconds */
  CONFIRMATION_TIMEOUT_MS: 120_000, // 2 minutes

  /** Required confirmations for transaction finality */
  REQUIRED_CONFIRMATIONS: 1,

  /** Price oracle cache TTL in milliseconds */
  PRICE_CACHE_TTL_MS: 60_000, // 60 seconds

  /** Slippage tolerance for token purchases (2% = 0.02) */
  SLIPPAGE_TOLERANCE: 0.02,

  /** Gem purchase timeout in milliseconds */
  GEM_PURCHASE_TIMEOUT_MS: 300_000, // 5 minutes
} as const;

/**
 * Daily and Weekly Rewards Configuration
 * @deprecated Use gameConfig table for runtime overrides instead of GAME_ECONOMY_CONFIG env var
 */
export const DAILY_REWARDS = {
  /** Number of cards in daily free pack */
  DAILY_PACK_CARDS: 3,

  /** Daily login streak bonus gold (multiplied by streak day, max 7) */
  LOGIN_STREAK_GOLD: [50, 75, 100, 125, 150, 175, 200], // Day 1-7

  /** Weekly jackpot chances (out of 10,000) */
  WEEKLY_JACKPOT_CHANCES: {
    fullArt: 10, // 0.1%
    numbered: 1, // 0.01%
    foil: 100, // 1%
    altArt: 25, // 0.25%
    nothing: 9864, // ~98.64%
  },

  /** Cooldown between daily pack claims (24 hours) */
  DAILY_PACK_COOLDOWN_MS: 24 * 60 * 60 * 1000,

  /** Weekly jackpot resets on Sunday at midnight UTC */
  WEEKLY_JACKPOT_RESET_DAY: 0, // Sunday

  /** Achievement milestones that grant free packs */
  ACHIEVEMENT_REWARDS: {
    wins_100: { pack: "collector", count: 1 },
    wins_500: { pack: "ultimate", count: 1 },
    wins_1000: { lotteryTicket: true },
  },
} as const;

/**
 * Gem Package Definitions
 * Token → Gems conversion with bonus tiers
 * @deprecated Use gameConfig table for runtime overrides instead of GAME_ECONOMY_CONFIG env var
 */
export const GEM_PACKAGES = [
  { id: "gem_starter", name: "Starter", gems: 300, usdCents: 299, bonus: 0 },
  { id: "gem_basic", name: "Basic", gems: 650, usdCents: 499, bonus: 8 },
  { id: "gem_standard", name: "Standard", gems: 1200, usdCents: 999, bonus: 20 },
  { id: "gem_plus", name: "Plus", gems: 2700, usdCents: 1999, bonus: 35 },
  { id: "gem_premium", name: "Premium", gems: 6500, usdCents: 4999, bonus: 30 },
  { id: "gem_mega", name: "Mega", gems: 14000, usdCents: 9999, bonus: 40 },
  { id: "gem_ultra", name: "Ultra", gems: 40000, usdCents: 24999, bonus: 60 },
  { id: "gem_whale", name: "Whale", gems: 100000, usdCents: 49999, bonus: 100 },
  { id: "gem_titan", name: "Titan", gems: 250000, usdCents: 99999, bonus: 150 },
  { id: "gem_apex", name: "Apex", gems: 800000, usdCents: 249999, bonus: 220 },
  { id: "gem_legendary", name: "Legendary", gems: 2000000, usdCents: 499999, bonus: 300 },
  { id: "gem_ultimate", name: "Ultimate", gems: 5000000, usdCents: 999999, bonus: 400 },
] as const;

/**
 * Gold Earning Rates (F2P economy)
 * @deprecated Use gameConfig table for runtime overrides instead of GAME_ECONOMY_CONFIG env var
 */
export const GOLD_REWARDS = {
  /** Ranked match win (varies by opponent ELO) */
  RANKED_WIN_BASE: 50,
  RANKED_WIN_MAX: 100, // Against higher rated opponent

  /** Casual match win */
  CASUAL_WIN: 25,

  /** Any match loss (participation reward) */
  MATCH_LOSS: 10,

  /** Daily quest rewards by difficulty */
  DAILY_QUEST_EASY: 100,
  DAILY_QUEST_MEDIUM: 200,
  DAILY_QUEST_HARD: 400,

  /** Weekly quest reward */
  WEEKLY_QUEST: 1000,

  /** Season rank rewards (Gold tier example, scales up) */
  SEASON_REWARD_BRONZE: 500,
  SEASON_REWARD_SILVER: 1000,
  SEASON_REWARD_GOLD: 2000,
  SEASON_REWARD_PLATINUM: 4000,
  SEASON_REWARD_DIAMOND: 6000,
  SEASON_REWARD_MASTER: 8000,
  SEASON_REWARD_LEGEND: 10000,
} as const;

/**
 * Gems → Gold Conversion Bundles
 * @deprecated Use gameConfig table for runtime overrides instead of GAME_ECONOMY_CONFIG env var
 */
export const GOLD_BUNDLES = [
  { id: "gold_pouch", name: "Gold Pouch", gems: 100, gold: 400 },
  { id: "gold_sack", name: "Gold Sack", gems: 250, gold: 1100 },
  { id: "gold_chest", name: "Gold Chest", gems: 500, gold: 2500 },
  { id: "gold_vault", name: "Gold Vault", gems: 1000, gold: 5500 },
  { id: "gold_hoard", name: "Gold Hoard", gems: 2500, gold: 15000 },
] as const;

/**
 * Shop Pack Definitions
 * Products available for purchase
 * @deprecated Use gameConfig table for runtime overrides instead of GAME_ECONOMY_CONFIG env var
 */
export const SHOP_PACKS = {
  basic: {
    id: "pack_basic",
    name: "Basic Pack",
    cards: 5,
    gemPrice: 150,
    goldPrice: 500,
    guaranteedRarity: "uncommon" as const,
  },
  standard: {
    id: "pack_standard",
    name: "Standard Pack",
    cards: 5,
    gemPrice: 300,
    goldPrice: 1000,
    guaranteedRarity: "rare" as const,
  },
  premium: {
    id: "pack_premium",
    name: "Premium Pack",
    cards: 5,
    gemPrice: 600,
    goldPrice: 2500,
    guaranteedRarity: "epic" as const,
  },
  legendary: {
    id: "pack_legendary",
    name: "Legendary Pack",
    cards: 5,
    gemPrice: 1500,
    goldPrice: null, // Gems only
    guaranteedRarity: "legendary" as const,
  },
  collector: {
    id: "pack_collector",
    name: "Collector Pack",
    cards: 3,
    gemPrice: 2000,
    goldPrice: null, // Gems only
    allRareOrBetter: true,
  },
  ultimate: {
    id: "pack_ultimate",
    name: "Ultimate Pack",
    cards: 10,
    gemPrice: 5000,
    goldPrice: null, // Gems only
    guaranteedEpic: 2,
    guaranteedLegendary: 1,
  },
} as const;

/**
 * Sales System Configuration
 */
export const SALES_CONFIG = {
  /** Maximum discount percentage allowed */
  MAX_DISCOUNT_PERCENT: 50,

  /** Flash sale duration in hours */
  FLASH_SALE_DURATION_HOURS: 4,

  /** Weekend sale start (Friday 00:00 UTC) */
  WEEKEND_SALE_START_DAY: 5, // Friday

  /** Weekend sale end (Sunday 23:59 UTC) */
  WEEKEND_SALE_END_DAY: 0, // Sunday

  /** Returning player threshold in days */
  RETURNING_PLAYER_DAYS: 14,

  /** Returning player sale duration in hours */
  RETURNING_PLAYER_SALE_HOURS: 48,

  /** New player threshold in days */
  NEW_PLAYER_DAYS: 7,
} as const;

/**
 * ElizaOS Token Configuration
 * Alternate payment token with discount incentive
 * Token holders unlock hidden achievements and rewards
 */
export const ELIZAOS_TOKEN = {
  /** ElizaOS SPL token mint address */
  MINT_ADDRESS: process.env["ELIZAOS_TOKEN_MINT"] || "DuMbhu7mvQvqQHGcnikDgb4XegXJRyhUBfdU22uELiZA",

  /** Token decimals (standard SPL token decimals) */
  DECIMALS: 9,

  /** Discount percentage when paying with ElizaOS token (10% = 0.10) */
  PAYMENT_DISCOUNT_PERCENT: 0.1,

  /** Minimum token balance to unlock hidden achievement (1 token) */
  HOLDER_THRESHOLD: 1_000_000_000, // 1 token with 9 decimals

  /** Hidden achievement ID for ElizaOS holders */
  HOLDER_ACHIEVEMENT_ID: "elizaos_holder",

  /** Agent Card reward card definition slug */
  AGENT_CARD_SLUG: "agent_card",
} as const;

/**
 * Solana RPC Configuration
 * Network settings for blockchain interactions
 */
export const SOLANA = {
  /** RPC URL - prefer Helius for reliability */
  RPC_URL: process.env["SOLANA_RPC_URL"] || "https://api.mainnet-beta.solana.com",

  /** Network: mainnet-beta or devnet */
  NETWORK: (process.env["SOLANA_NETWORK"] || "mainnet-beta") as "mainnet-beta" | "devnet",

  /** Commitment level for transactions */
  COMMITMENT: "confirmed" as const,
} as const;
