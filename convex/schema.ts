import { migrationsTable } from "convex-helpers/server/migrations";
import { rateLimitTables } from "convex-helpers/server/rateLimit";
import { literals } from "convex-helpers/validators";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { userStreamingPlatformValidator } from "./lib/streamingPlatforms";
import { livekitTables } from "./livekit/schema";
import { GAME_CONFIG } from "@ltcg/core";

// ============================================================================
// SHARED VALIDATORS (Reusable across schema and function args)
// ============================================================================
//
// NOTE: We use `literals()` from convex-helpers for cleaner union validators.
// Instead of verbose: v.union(v.literal("a"), v.literal("b"), v.literal("c"))
// We can write: literals("a", "b", "c")
//
// This pattern is preferred throughout the schema for string literal unions.

/** Game mode types for leaderboards and matchmaking */
export const gameModeValidator = literals("ranked", "casual", "story");
export type GameMode = Infer<typeof gameModeValidator>;

/** Player segment filters for leaderboards */
export const playerSegmentValidator = literals("all", "humans", "ai");
export type PlayerSegment = Infer<typeof playerSegmentValidator>;

/** Story mode difficulty levels */
export const difficultyValidator = literals("normal", "hard", "legendary");
export type Difficulty = Infer<typeof difficultyValidator>;

/** Story progress status */
export const progressStatusValidator = literals("locked", "available", "in_progress", "completed");
export type ProgressStatus = Infer<typeof progressStatusValidator>;

/** Card variant types for collectible scarcity */
export const cardVariantValidator = literals(...GAME_CONFIG.VARIANTS);
export type CardVariant = Infer<typeof cardVariantValidator>;

/** Sale types for shop promotions */
export const saleTypeValidator = literals(
  "flash",
  "weekend",
  "launch",
  "holiday",
  "anniversary",
  "returning"
);
export type SaleType = Infer<typeof saleTypeValidator>;

/** Content types for the content calendar */
export const scheduledContentTypeValidator = literals(
  "blog",
  "x_post",
  "reddit",
  "email",
  "announcement",
  "news",
  "image"
);
export type ScheduledContentType = Infer<typeof scheduledContentTypeValidator>;

/** Content status for scheduled content */
export const contentStatusValidator = literals("draft", "scheduled", "published", "failed");
export type ContentStatus = Infer<typeof contentStatusValidator>;

/** Email template categories */
export const emailCategoryValidator = literals(
  "newsletter",
  "announcement",
  "promotional",
  "transactional",
  "custom"
);
export type EmailCategory = Infer<typeof emailCategoryValidator>;

/** Email recipient types */
export const emailRecipientTypeValidator = literals("players", "subscribers", "both", "custom");
export type EmailRecipientType = Infer<typeof emailRecipientTypeValidator>;

// ============================================================================
// SCHEMA
// ============================================================================
//
// Core tables only. All domain-specific tables have been extracted into
// standalone Convex component packages under packages/lunchtable-tcg-*.
//
// Components: admin, ai, branding, cards, competitive, content, economy,
// email, game, guilds, marketplace, payments, progression, referrals,
// seasons, social, story, streaming, token, treasury, webhooks

export default defineSchema({
  // External component tables
  migrations: migrationsTable,
  ...rateLimitTables,
  ...livekitTables,

  // ============================================================================
  // USERS (Core identity — referenced by all components via v.string())
  // ============================================================================
  users: defineTable({
    // Privy authentication (optional during migration from old auth system)
    privyId: v.optional(v.string()), // Privy DID (did:privy:xxx)

    // Profile fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Custom game fields
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    passwordHash: v.optional(v.string()), // Legacy field, may be present in old records
    activeDeckId: v.optional(v.string()), // References cards component userDecks
    createdAt: v.optional(v.number()),

    // Leaderboard: Rating fields
    rankedElo: v.optional(v.number()), // default: 1000
    casualRating: v.optional(v.number()), // default: 1000

    // Leaderboard: Stats fields
    totalWins: v.optional(v.number()), // default: 0
    totalLosses: v.optional(v.number()), // default: 0
    rankedWins: v.optional(v.number()), // default: 0
    rankedLosses: v.optional(v.number()), // default: 0
    casualWins: v.optional(v.number()), // default: 0
    casualLosses: v.optional(v.number()), // default: 0
    storyWins: v.optional(v.number()), // default: 0
    storyLosses: v.optional(v.number()), // default: 0
    currentWinStreak: v.optional(v.number()), // default: 0, current consecutive wins
    longestWinStreak: v.optional(v.number()), // default: 0, all-time best win streak

    // Leaderboard: Player type
    isAiAgent: v.optional(v.boolean()), // default: false

    // @deprecated Use playerXP table - keeping for existing data compatibility
    xp: v.optional(v.number()),
    // @deprecated Use playerXP table - keeping for existing data compatibility
    level: v.optional(v.number()),
    // @deprecated Use playerCurrency table - keeping for existing data compatibility
    gold: v.optional(v.number()),

    lastStatsUpdate: v.optional(v.number()),

    // Email tracking
    welcomeEmailSent: v.optional(v.boolean()), // default: false

    // Moderation fields
    isBanned: v.optional(v.boolean()), // default: false
    banReason: v.optional(v.string()),
    bannedAt: v.optional(v.number()),
    bannedBy: v.optional(v.id("users")),
    isSuspended: v.optional(v.boolean()), // default: false
    suspendedUntil: v.optional(v.number()),
    suspensionReason: v.optional(v.string()),
    suspendedBy: v.optional(v.id("users")),
    warningCount: v.optional(v.number()), // default: 0
    accountStatus: v.optional(literals("active", "suspended", "banned")), // default: "active"
    mutedUntil: v.optional(v.number()), // Chat mute expiry timestamp

    // HD Wallet tracking (non-custodial)
    // User's master wallet is at index 0, agent wallets start at index 1
    // Derivation path (Solana): m/44'/501'/i/0' where i = wallet index
    nextWalletIndex: v.optional(v.number()), // default: 1 (0 is user's main wallet)

    // Token wallet fields
    walletAddress: v.optional(v.string()),
    walletType: v.optional(literals("privy_embedded", "external")),
    walletConnectedAt: v.optional(v.number()),

    // Tutorial and Help system
    tutorialProgress: v.optional(
      v.object({
        completed: v.boolean(), // Finished all 5 tutorial moments
        lastMoment: v.number(), // 0-5, resume point
        dismissCount: v.number(), // Times clicked "Exit Tutorial"
        completedAt: v.optional(v.number()), // Timestamp when completed
      })
    ),
    helpModeEnabled: v.optional(v.boolean()), // User's preference for help mode

    // Pity counter for guaranteed pulls (resets on pull of target rarity/variant)
    pityCounter: v.optional(
      v.object({
        packsSinceEpic: v.number(), // Guaranteed Epic at 150
        packsSinceLegendary: v.number(), // Guaranteed Legendary at 500
        packsSinceFullArt: v.number(), // Guaranteed Full Art variant at 1000
      })
    ),

    // Daily/weekly reward tracking
    lastDailyPackClaim: v.optional(v.number()),
    lastWeeklyJackpotClaim: v.optional(v.number()),
    loginStreak: v.optional(v.number()),
    lastLoginDate: v.optional(v.string()), // "YYYY-MM-DD" format for streak tracking

    // ElizaOS token tracking (for hidden achievement)
    lastElizaOSCheck: v.optional(v.number()), // Last time we checked their wallet
    hasElizaOSToken: v.optional(v.boolean()), // Whether they hold ElizaOS tokens
    elizaOSBalance: v.optional(v.number()), // Their ElizaOS token balance (smallest unit)

    // Referral tracking
    referralSource: v.optional(v.string()), // "guild_invite", "user_referral", "direct", etc.
    referralGuildInviteCode: v.optional(v.string()), // The invite code used
    referralGuildId: v.optional(v.string()), // References guilds component
    referredBy: v.optional(v.id("users")), // User who referred them (user referral system)
    referralCode: v.optional(v.string()), // The referral code used to sign up
    // Activity tracking for optimized queries (e.g., quest generation)
    lastActiveAt: v.optional(v.number()),
  })
    .index("privyId", ["privyId"])
    .index("walletAddress", ["walletAddress"])
    .index("email", ["email"])
    .index("username", ["username"])
    .index("isBanned", ["isBanned"])
    .index("isSuspended", ["isSuspended"])
    .index("mutedUntil", ["mutedUntil"])
    .index("accountStatus", ["accountStatus"])
    // Leaderboard indexes
    .index("rankedElo", ["rankedElo"])
    .index("casualRating", ["casualRating"])
    .index("totalWins", ["totalWins"])
    // Composite indexes for segmented leaderboards
    .index("rankedElo_byType", ["isAiAgent", "rankedElo"])
    .index("casualRating_byType", ["isAiAgent", "casualRating"])
    .index("by_lastActiveAt", ["lastActiveAt"])
    .searchIndex("search_username", { searchField: "username" }),

  // ============================================================================
  // USER PREFERENCES (Core settings — paired with users table)
  // ============================================================================
  userPreferences: defineTable({
    userId: v.id("users"),
    notifications: v.object({
      questComplete: v.boolean(),
      matchInvites: v.boolean(),
      friendRequests: v.boolean(),
      marketplaceSales: v.boolean(),
      dailyReminders: v.boolean(),
      promotions: v.boolean(),
    }),
    display: v.object({
      animations: v.boolean(),
      reducedMotion: v.boolean(),
      cardQuality: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      showDamageNumbers: v.boolean(),
    }),
    game: v.object({
      soundEnabled: v.boolean(),
      musicEnabled: v.boolean(),
      soundVolume: v.number(),
      musicVolume: v.number(),
      autoEndTurn: v.boolean(),
      confirmActions: v.boolean(),
      showTutorialHints: v.boolean(),
    }),
    privacy: v.object({
      profilePublic: v.boolean(),
      showOnlineStatus: v.boolean(),
      allowFriendRequests: v.boolean(),
      showMatchHistory: v.boolean(),
    }),
    streaming: v.optional(
      v.object({
        streamerModeEnabled: v.boolean(),
        platform: v.optional(userStreamingPlatformValidator),
        streamKeyHash: v.optional(v.string()),
        rtmpUrl: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
