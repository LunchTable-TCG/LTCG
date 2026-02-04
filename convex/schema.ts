import { migrationsTable } from "convex-helpers/server/migrations";
import { rateLimitTables } from "convex-helpers/server/rateLimit";
import { literals } from "convex-helpers/validators";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { jsonAbilityValidator } from "./gameplay/effectSystem/jsonEffectValidators";

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
export const cardVariantValidator = literals(
  "standard",
  "foil",
  "alt_art",
  "full_art",
  "numbered",
  "first_edition"
);
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

export default defineSchema({
  migrations: migrationsTable,
  ...rateLimitTables,
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
    activeDeckId: v.optional(v.id("userDecks")),
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
    currentWinStreak: v.optional(v.number()), // default: 0, current consecutive wins
    longestWinStreak: v.optional(v.number()), // default: 0, all-time best win streak

    // Leaderboard: Player type
    isAiAgent: v.optional(v.boolean()), // default: false

    // XP and Level (denormalized for quick access)
    xp: v.optional(v.number()), // default: 0
    level: v.optional(v.number()), // default: 1

    // Economy
    gold: v.optional(v.number()), // default: 500

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
    .index("xp", ["xp"])
    // Composite indexes for segmented leaderboards
    .index("rankedElo_byType", ["isAiAgent", "rankedElo"])
    .index("casualRating_byType", ["isAiAgent", "casualRating"])
    .index("xp_byType", ["isAiAgent", "xp"]),

  // Admin roles for protected operations with role hierarchy
  adminRoles: defineTable({
    userId: v.id("users"),
    role: literals("moderator", "admin", "superadmin"),
    grantedBy: v.id("users"), // Required: who granted this role
    grantedAt: v.number(),
    isActive: v.boolean(),
    // Temporal role management
    expiresAt: v.optional(v.number()), // When role expires (null = permanent)
    grantNote: v.optional(v.string()), // Reason/note for granting
    revokedAt: v.optional(v.number()), // When role was revoked
    revokedBy: v.optional(v.id("users")), // Who revoked the role
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role", "isActive"])
    .index("by_expiration", ["isActive", "expiresAt"]),

  // Admin audit logs for tracking all admin operations
  adminAuditLogs: defineTable({
    adminId: v.id("users"),
    action: v.string(), // "delete_user", "delete_test_users", "grant_admin", etc.
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    /**
     * v.any() USAGE: Admin audit metadata
     *
     * REASON: Different admin actions have different metadata structures
     * EXPECTED TYPES:
     * - delete_user: { reason: string, userEmail: string }
     * - delete_test_users: { deletedCount: number }
     * - grant_admin: { role: "admin" | "moderator", targetUserId: string }
     * - get_analytics: { scope: "user" | "platform", userId?: string }
     * - add_gold: { amount: number, targetUserId: string }
     * - force_close_game: { closedLobbies: number }
     *
     * SECURITY: Written only by internal mutations, admin-authenticated
     * ALTERNATIVE: Could use a union of specific metadata types
     */
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  })
    .index("by_admin", ["adminId", "timestamp"])
    .index("by_action", ["action", "timestamp"])
    .index("by_timestamp", ["timestamp"])
    .index("by_success", ["success", "timestamp"])
    .index("by_target_user", ["targetUserId", "timestamp"]),

  // Moderation actions (chat moderation, user warnings, etc.)
  moderationActions: defineTable({
    userId: v.id("users"),
    adminId: v.id("users"),
    actionType: literals("mute", "unmute", "warn", "suspend", "unsuspend", "ban", "unban"),
    reason: v.optional(v.string()),
    duration: v.optional(v.number()), // Duration in ms (for mute/suspend)
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_admin", ["adminId", "createdAt"])
    .index("by_type", ["actionType", "createdAt"]),

  // User preferences/settings
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // AI Agents registered by users
  agents: defineTable({
    userId: v.id("users"),
    name: v.string(),
    profilePictureUrl: v.optional(v.string()),
    socialLink: v.optional(v.string()),
    starterDeckCode: v.string(),
    stats: v.object({
      gamesPlayed: v.number(),
      gamesWon: v.number(),
      totalScore: v.number(),
    }),
    createdAt: v.number(),
    isActive: v.boolean(),
    // Non-custodial HD Wallet fields (Privy embedded wallet)
    // Keys are sharded via Shamir's Secret Sharing - we NEVER have private keys
    // Derivation path (Solana): m/44'/501'/walletIndex/0'
    privyUserId: v.optional(v.string()), // Privy user ID that owns this wallet (did:privy:xxx)
    walletIndex: v.optional(v.number()), // HD wallet index in user's wallet tree
    walletId: v.optional(v.string()), // Privy wallet ID
    walletAddress: v.optional(v.string()), // Solana public address (non-custodial)
    walletChainType: v.optional(v.string()), // 'solana'
    walletCreatedAt: v.optional(v.number()), // Wallet creation timestamp
    walletStatus: v.optional(literals("pending", "created", "failed")), // Wallet creation status
    walletErrorMessage: v.optional(v.string()), // Error message if wallet creation failed

    // Webhook callback configuration for real-time notifications
    callbackUrl: v.optional(v.string()), // Agent's public URL for receiving webhooks
    webhookSecret: v.optional(v.string()), // Shared secret for signing webhooks (hashed)
    webhookEnabled: v.optional(v.boolean()), // Whether to send webhooks (default: true if URL set)
    lastWebhookAt: v.optional(v.number()), // Last successful webhook timestamp
    webhookFailCount: v.optional(v.number()), // Consecutive failures (auto-disable after threshold)
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"])
    .index("by_wallet", ["walletAddress"])
    .index("by_privy_user", ["privyUserId"])
    .index("by_callback", ["callbackUrl"]),

  // API keys for agents (hashed, never store plaintext)
  apiKeys: defineTable({
    agentId: v.id("agents"),
    userId: v.id("users"),
    keyHash: v.string(),
    keyPrefix: v.string(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_key_hash", ["keyHash"])
    .index("by_agent", ["agentId"])
    .index("by_prefix_active", ["keyPrefix", "isActive"])
    .index("by_user", ["userId"]),

  // API key usage tracking for rate limiting
  apiKeyUsage: defineTable({
    apiKeyId: v.id("apiKeys"),
    timestamp: v.number(),
    endpoint: v.optional(v.string()), // API endpoint called
    responseStatus: v.optional(v.number()), // HTTP status code
    durationMs: v.optional(v.number()), // Request duration
  })
    .index("by_key_and_time", ["apiKeyId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Agent decision history for analytics and debugging
  agentDecisions: defineTable({
    agentId: v.id("agents"),
    gameId: v.string(), // Game lobby ID
    turnNumber: v.number(),
    phase: v.string(),
    action: v.string(), // Action type (SUMMON_MONSTER, ATTACK, etc.)
    reasoning: v.string(), // LLM's reasoning for the decision
    parameters: v.optional(v.any()), // Action parameters (card IDs, targets, etc.)
    // REASON: v.any() used because parameters vary by action type and may include
    // dynamic fields like cardId, targetId, position, etc. Runtime validation
    // happens in the TurnOrchestrator before storing.
    executionTimeMs: v.optional(v.number()), // How long the decision took
    result: v.optional(v.string()), // Success, failure, or error message
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_game", ["gameId"])
    .index("by_agent_game", ["agentId", "gameId"])
    .index("by_created", ["createdAt"]),

  // Reference data for the 4 starter decks
  starterDeckDefinitions: defineTable({
    name: v.string(),
    deckCode: v.string(),
    archetype: v.string(),
    description: v.string(),
    playstyle: v.string(),
    cardCount: v.number(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["deckCode"])
    .index("by_available", ["isAvailable"]),

  // Global chat messages
  globalChatMessages: defineTable({
    userId: v.id("users"),
    username: v.string(),
    message: v.string(),
    createdAt: v.number(),
    isSystem: v.boolean(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),

  // User reports for moderation
  userReports: defineTable({
    reporterId: v.id("users"),
    reporterUsername: v.string(),
    reportedUserId: v.id("users"),
    reportedUsername: v.string(),
    reason: v.string(),
    status: literals("pending", "reviewed", "resolved", "dismissed"),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_reported_user", ["reportedUserId"])
    .index("by_reporter", ["reporterId"]),

  // User presence tracking (for online users list)
  userPresence: defineTable({
    userId: v.id("users"),
    username: v.string(),
    lastActiveAt: v.number(),
    status: literals("online", "in_game", "idle"),
  })
    .index("by_user", ["userId"])
    .index("by_last_active", ["lastActiveAt"]),

  // Game lobbies for matchmaking
  gameLobbies: defineTable({
    hostId: v.id("users"),
    hostUsername: v.string(),
    hostRank: v.string(),
    hostRating: v.number(),
    deckArchetype: v.string(), // "fire", "water", "earth", "wind"
    mode: v.string(), // "casual" | "ranked"
    status: v.string(), // "waiting" | "active" | "completed" | "cancelled" | "forfeited"
    isPrivate: v.boolean(), // true for private matches
    joinCode: v.optional(v.string()), // 6-char code for private matches
    maxRatingDiff: v.optional(v.number()), // rating window for ranked (e.g., 200)
    opponentId: v.optional(v.id("users")),
    opponentUsername: v.optional(v.string()),
    opponentRank: v.optional(v.string()),
    gameId: v.optional(v.string()),
    turnNumber: v.optional(v.number()),
    currentTurnPlayerId: v.optional(v.id("users")), // Whose turn it is
    turnStartedAt: v.optional(v.number()), // When current turn started
    lastMoveAt: v.optional(v.number()), // Last time a move was made
    winnerId: v.optional(v.id("users")), // Winner of the game
    createdAt: v.number(),
    startedAt: v.optional(v.number()),

    // Story mode fields
    stageId: v.optional(v.id("storyStages")), // Story stage being played (for completion tracking)

    // Spectator system
    spectatorCount: v.optional(v.number()), // default: 0
    allowSpectators: v.optional(v.boolean()), // default: true
    maxSpectators: v.optional(v.number()), // default: 100
  })
    .index("by_status", ["status"])
    .index("by_mode_status", ["mode", "status"])
    .index("by_host", ["hostId"])
    .index("by_opponent", ["opponentId"])
    .index("by_created", ["createdAt"])
    .index("by_join_code", ["joinCode"])
    .index("by_last_move", ["lastMoveAt"])
    .index("by_status_lastMoveAt", ["status", "lastMoveAt"]),

  // Game event log for spectators and replay
  gameEvents: defineTable({
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    turnNumber: v.number(),
    eventType: literals(
      // Lifecycle Events (5)
      "game_start",
      "game_end",
      "turn_start",
      "turn_end",
      "phase_changed",
      // Summon Events (5)
      "normal_summon",
      "tribute_summon",
      "flip_summon",
      "special_summon",
      "summon_negated",
      // Card Placement Events (3)
      "monster_set",
      "spell_set",
      "trap_set",
      // Activation Events (4)
      "spell_activated",
      "trap_activated",
      "effect_activated",
      "activation_negated",
      // Chain Events (3)
      "chain_link_added",
      "chain_resolving",
      "chain_resolved",
      // Combat Events (8)
      "battle_phase_entered",
      "attack_declared",
      "damage_calculated",
      "damage",
      "card_destroyed_battle",
      "replay_triggered", // Battle replay triggered (monster count changed)
      "replay_target_selected", // Attacker chose new target during replay
      "replay_cancelled", // Attacker cancelled attack during replay
      // Zone Transition Events (6)
      "card_drawn",
      "card_to_hand",
      "card_to_graveyard",
      "card_banished",
      "card_to_deck",
      "position_changed",
      // Resource Events (4)
      "lp_changed",
      "tribute_paid",
      "deck_shuffled",
      "hand_limit_enforced"
    ),
    playerId: v.id("users"),
    playerUsername: v.string(),
    description: v.string(), // Human-readable event description
    /**
     * v.any() USAGE: Game event metadata
     *
     * REASON: Different event types have different metadata structures
     * EXPECTED TYPES:
     * - damage events: { targetPlayerId: Id<"users">, amount: number, cardId: Id<"cardDefinitions"> }
     * - card_drawn events: { cardId: Id<"cardDefinitions">, zone: string }
     * - summon events: { cardId: Id<"cardDefinitions">, position: number, isTribute: boolean }
     * - chain events: { chainLength: number, spellSpeed: number }
     *
     * SECURITY: Read-only field, not user-modifiable
     * ALTERNATIVE: Could use a union of specific metadata types, but would be extremely verbose
     */
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_lobby", ["lobbyId", "timestamp"])
    .index("by_game", ["gameId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Detailed game state for reconnection and gameplay
  gameStates: defineTable({
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),

    // Player identifiers
    hostId: v.id("users"),
    opponentId: v.id("users"),

    // Game state
    hostHand: v.array(v.id("cardDefinitions")), // Card IDs in host's hand
    opponentHand: v.array(v.id("cardDefinitions")), // Card IDs in opponent's hand

    // Monster zones (5 slots)
    hostBoard: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        position: v.number(), // 1 = Attack, -1 = Defense
        attack: v.number(),
        defense: v.number(),
        hasAttacked: v.boolean(),
        isFaceDown: v.boolean(), // For set monsters
        // Protection flags
        cannotBeDestroyedByBattle: v.optional(v.boolean()),
        cannotBeDestroyedByEffects: v.optional(v.boolean()),
        cannotBeTargeted: v.optional(v.boolean()),
        // Position change tracking
        hasChangedPosition: v.optional(v.boolean()), // Reset each turn
        turnSummoned: v.optional(v.number()), // Turn number when summoned
        // Equip spell tracking
        equippedCards: v.optional(v.array(v.id("cardDefinitions"))), // IDs of equip spells attached to this monster
        // Token flags
        isToken: v.optional(v.boolean()), // True if this is a generated token
        tokenData: v.optional(
          v.object({
            name: v.string(),
            atk: v.number(),
            def: v.number(),
            level: v.optional(v.number()),
            attribute: v.optional(v.string()),
            type: v.optional(v.string()),
          })
        ),
      })
    ),
    opponentBoard: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        position: v.number(), // 1 = Attack, -1 = Defense
        attack: v.number(),
        defense: v.number(),
        hasAttacked: v.boolean(),
        isFaceDown: v.boolean(), // For set monsters
        // Protection flags
        cannotBeDestroyedByBattle: v.optional(v.boolean()),
        cannotBeDestroyedByEffects: v.optional(v.boolean()),
        cannotBeTargeted: v.optional(v.boolean()),
        // Position change tracking
        hasChangedPosition: v.optional(v.boolean()), // Reset each turn
        turnSummoned: v.optional(v.number()), // Turn number when summoned
        // Equip spell tracking
        equippedCards: v.optional(v.array(v.id("cardDefinitions"))), // IDs of equip spells attached to this monster
        // Token flags
        isToken: v.optional(v.boolean()), // True if this is a generated token
        tokenData: v.optional(
          v.object({
            name: v.string(),
            atk: v.number(),
            def: v.number(),
            level: v.optional(v.number()),
            attribute: v.optional(v.string()),
            type: v.optional(v.string()),
          })
        ),
      })
    ),

    // Spell/Trap zones (5 slots each)
    hostSpellTrapZone: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        isFaceDown: v.boolean(),
        isActivated: v.boolean(), // Continuous spells/traps remain on field
        turnSet: v.optional(v.number()), // Track when card was set (for trap activation rules)
        equippedTo: v.optional(v.id("cardDefinitions")), // For equip spells - ID of equipped monster
      })
    ),
    opponentSpellTrapZone: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        isFaceDown: v.boolean(),
        isActivated: v.boolean(), // Continuous spells/traps remain on field
        turnSet: v.optional(v.number()), // Track when card was set (for trap activation rules)
        equippedTo: v.optional(v.id("cardDefinitions")), // For equip spells - ID of equipped monster
      })
    ),

    // Field Spell zones (1 slot each, face-up only)
    hostFieldSpell: v.optional(
      v.object({
        cardId: v.id("cardDefinitions"),
        isActive: v.boolean(),
      })
    ),
    opponentFieldSpell: v.optional(
      v.object({
        cardId: v.id("cardDefinitions"),
        isActive: v.boolean(),
      })
    ),

    hostDeck: v.array(v.id("cardDefinitions")), // Remaining cards in deck
    opponentDeck: v.array(v.id("cardDefinitions")),
    hostGraveyard: v.array(v.id("cardDefinitions")),
    opponentGraveyard: v.array(v.id("cardDefinitions")),
    hostBanished: v.array(v.id("cardDefinitions")), // Banished/removed from play
    opponentBanished: v.array(v.id("cardDefinitions")),

    // Game resources
    hostLifePoints: v.number(),
    opponentLifePoints: v.number(),
    hostMana: v.number(),
    opponentMana: v.number(),

    // Turn tracking
    currentTurnPlayerId: v.id("users"),
    turnNumber: v.number(),

    // Phase Management (Yu-Gi-Oh turn structure)
    currentPhase: v.optional(
      literals("draw", "standby", "main1", "battle_start", "battle", "battle_end", "main2", "end")
    ),

    // Turn Flags
    hostNormalSummonedThisTurn: v.optional(v.boolean()),
    opponentNormalSummonedThisTurn: v.optional(v.boolean()),

    // Chain State
    currentChain: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          playerId: v.id("users"),
          spellSpeed: v.number(), // 1, 2, or 3
          effect: jsonAbilityValidator, // JSON format only
          targets: v.optional(v.array(v.id("cardDefinitions"))),
          negated: v.optional(v.boolean()), // True if effect was negated
        })
      )
    ),

    // Priority System
    currentPriorityPlayer: v.optional(v.id("users")),

    // Pending Action (waiting for response window to resolve)
    pendingAction: v.optional(
      v.object({
        type: literals("attack", "summon"),
        attackerId: v.optional(v.id("cardDefinitions")), // For attack actions
        targetId: v.optional(v.id("cardDefinitions")), // For attack actions (undefined = direct attack)
        summonedCardId: v.optional(v.id("cardDefinitions")), // For summon actions
        // For battle replay detection
        originalMonsterCount: v.optional(v.number()), // Opponent's monster count at attack declaration
      })
    ),

    // Battle Replay State (Yu-Gi-Oh replay mechanic)
    // Triggered when opponent's monster count changes after attack declaration but before damage
    pendingReplay: v.optional(
      v.object({
        attackerId: v.id("cardDefinitions"), // The attacking monster
        attackerOwnerId: v.id("users"), // Player who declared the attack
        originalTargetId: v.optional(v.id("cardDefinitions")), // Original target (if any)
        originalMonsterCount: v.number(), // Opponent's monster count at attack declaration
        currentMonsterCount: v.number(), // Opponent's monster count now (changed)
        triggeredAt: v.number(), // Timestamp when replay was triggered
        availableTargets: v.array(v.id("cardDefinitions")), // Valid targets for replay
        canAttackDirectly: v.boolean(), // True if opponent's field is now empty
      })
    ),

    // Temporary Modifiers (cleared at end of turn)
    temporaryModifiers: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"), // Card being modified
          atkBonus: v.number(),
          defBonus: v.number(),
          expiresAtTurn: v.number(), // Turn number when this expires
          expiresAtPhase: v.optional(v.string()), // Phase when this expires ("end", "battle_end", etc.)
        })
      )
    ),

    // Lingering Effects - effects that last for a duration (e.g., stat boosts, restrictions)
    lingeringEffects: v.optional(
      v.array(
        v.object({
          effectType: v.string(), // Type of lingering effect (modifyATK, preventActivation, etc.)
          value: v.any(), // Effect value (number for stat mods, object for complex effects)
          sourceCardId: v.optional(v.id("cardDefinitions")), // Card that created this effect
          sourceCardName: v.optional(v.string()), // Name of source card for display
          appliedBy: v.id("users"), // Player who applied the effect
          appliedTurn: v.number(), // Turn number when applied
          duration: v.object({
            type: literals(
              "until_end_phase",
              "until_turn_end",
              "until_next_turn",
              "permanent",
              "custom"
            ),
            endTurn: v.optional(v.number()), // Specific turn number when effect expires
            endPhase: v.optional(v.string()), // Specific phase when effect expires
          }),
          affectsPlayer: v.optional(literals("host", "opponent", "both")),
          conditions: v.optional(v.any()), // Optional conditions for effect application
        })
      )
    ),

    // Once Per Turn (OPT) Tracking - resets at start of turn player's turn
    // Tracks card instance + effect index (same card can have multiple effects)
    optUsedThisTurn: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          effectIndex: v.number(), // Which effect on the card (0-indexed)
          playerId: v.id("users"), // Who used the effect
          turnUsed: v.number(), // Turn number when used
        })
      )
    ),

    // Hard Once Per Turn (HOPT) Tracking - resets at start of that player's NEXT turn
    // Key distinction: OPT resets when YOUR turn starts, HOPT resets on your NEXT turn
    // (persists through opponent's turn)
    hoptUsedEffects: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          effectIndex: v.number(), // Which effect on the card (0-indexed)
          playerId: v.id("users"), // Who used the effect
          turnUsed: v.number(), // Turn number when used
          resetOnTurn: v.number(), // Turn number when this should reset (player's next turn)
        })
      )
    ),

    // Optional Trigger Tracking
    pendingOptionalTriggers: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          cardName: v.string(),
          effectIndex: v.number(),
          trigger: v.string(), // TriggerCondition as string
          playerId: v.id("users"),
          addedAt: v.number(),
        })
      )
    ),
    skippedOptionalTriggers: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          trigger: v.string(), // TriggerCondition as string
          turnSkipped: v.number(),
        })
      )
    ),

    // SEGOC Queue for simultaneous trigger ordering (Yu-Gi-Oh style)
    // When multiple effects trigger at the same time, they are ordered:
    // 1. Turn player's mandatory effects
    // 2. Opponent's mandatory effects
    // 3. Turn player's optional effects
    // 4. Opponent's optional effects
    // Within each category, ordered by timestamp (first triggered = first in chain)
    segocQueue: v.optional(
      v.array(
        v.object({
          cardId: v.id("cardDefinitions"),
          cardName: v.string(),
          playerId: v.id("users"),
          trigger: v.string(), // TriggerCondition as string
          effectIndex: v.number(),
          isOptional: v.boolean(),
          isTurnPlayer: v.boolean(),
          addedAt: v.number(),
          segocOrder: v.number(), // 1=turn mandatory, 2=opp mandatory, 3=turn optional, 4=opp optional
        })
      )
    ),

    // AI & Story Mode (for single-player battles)
    gameMode: v.optional(literals("pvp", "story")), // Default: "pvp"
    isAIOpponent: v.optional(v.boolean()), // True if opponent is AI
    aiDifficulty: v.optional(
      literals("easy", "normal", "medium", "hard", "boss") // Legacy: "normal" equivalent to "medium"
    ), // AI difficulty level (matches storyStages difficulty)

    // Response Window (for priority/chain system)
    responseWindow: v.optional(
      v.object({
        type: literals(
          "summon",
          "attack_declaration",
          "spell_activation",
          "trap_activation",
          "effect_activation",
          "damage_calculation",
          "end_phase",
          "open"
        ),
        triggerPlayerId: v.id("users"),
        activePlayerId: v.id("users"),
        canRespond: v.boolean(),
        chainOpen: v.boolean(),
        passCount: v.number(),
        createdAt: v.number(),
        expiresAt: v.optional(v.number()),
      })
    ),

    // Priority tracking for debugging/replays
    priorityHistory: v.optional(
      v.array(
        v.object({
          playerId: v.id("users"),
          action: v.string(), // "passed", "responded", "activated"
          timestamp: v.number(),
          chainLength: v.number(),
        })
      )
    ),

    // Timeout Configuration (competitive timing enforcement)
    timeoutConfig: v.optional(
      v.object({
        perActionMs: v.number(), // Milliseconds per action (default: 180000 = 3 min)
        totalMatchMs: v.number(), // Milliseconds for total match (default: 1800000 = 30 min)
        autoPassOnTimeout: v.boolean(), // Auto-pass when action times out
        warningAtMs: v.number(), // Warning threshold in ms (default: 30000 = 30 sec)
      })
    ),

    // Match Timer (tracks overall match duration)
    matchTimerStart: v.optional(v.number()), // Timestamp when match started
    turnTimerStart: v.optional(v.number()), // Timestamp when current action timer started

    // Timeout Tracking (records all timeout occurrences)
    timeoutsUsed: v.optional(
      v.array(
        v.object({
          playerId: v.id("users"), // Player who timed out
          occurredAt: v.number(), // Timestamp of timeout
          action: v.string(), // Action type that timed out
          timeRemainingMs: v.number(), // Time remaining when timeout was recorded
        })
      )
    ),

    // Timestamps
    lastMoveAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_lobby", ["lobbyId"])
    .index("by_game_id", ["gameId"])
    .index("by_host", ["hostId"])
    .index("by_opponent", ["opponentId"])
    .index("by_game_mode", ["gameMode"]),

  // Matchmaking queue for quick match
  matchmakingQueue: defineTable({
    userId: v.id("users"),
    username: v.string(),
    rating: v.number(),
    deckArchetype: v.string(),
    mode: v.string(), // "ranked" or "casual"
    joinedAt: v.number(),
  })
    .index("by_rating", ["rating"])
    .index("by_user", ["userId"])
    .index("by_mode_rating", ["mode", "rating"]) // Optimize mode filtering + rating sort
    .index("by_rating_joined", ["rating", "joinedAt"]) // For wait time analytics
    .index("by_joinedAt", ["joinedAt"]), // For cleanup of expired entries

  // Master card definitions - all cards available in the game
  cardDefinitions: defineTable({
    name: v.string(),
    rarity: literals("common", "uncommon", "rare", "epic", "legendary"),
    archetype: literals(
      // Primary archetypes (from card CSV)
      "infernal_dragons",
      "abyssal_depths",
      "iron_legion",
      "necro_empire",
      // Legacy archetypes (for backwards compatibility)
      "abyssal_horrors",
      "nature_spirits",
      "storm_elementals",
      // Future/placeholder archetypes
      "shadow_assassins",
      "celestial_guardians",
      "undead_legion",
      "divine_knights",
      "arcane_mages",
      "mechanical_constructs",
      "neutral",
      // Old archetypes (deprecated - for backward compatibility)
      "fire",
      "water",
      "earth",
      "wind"
    ),
    cardType: literals("creature", "spell", "trap", "equipment"),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),

    // Industry-standard TCG fields
    level: v.optional(v.number()), // Monster level (1-12), determines tribute requirements
    attribute: v.optional(
      literals("fire", "water", "earth", "wind", "light", "dark", "divine", "neutral")
    ),
    monsterType: v.optional(
      v.union(
        v.literal("dragon"),
        v.literal("spellcaster"),
        v.literal("warrior"),
        v.literal("beast"),
        v.literal("fiend"),
        v.literal("zombie"),
        v.literal("machine"),
        v.literal("aqua"),
        v.literal("pyro"),
        v.literal("divine_beast")
      )
    ),
    spellType: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("quick_play"),
        v.literal("continuous"),
        v.literal("field"),
        v.literal("equip"),
        v.literal("ritual")
      )
    ),
    trapType: v.optional(
      v.union(v.literal("normal"), v.literal("continuous"), v.literal("counter"))
    ),

    ability: v.optional(jsonAbilityValidator), // JSON ability format
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    createdAt: v.number(),
    templateId: v.optional(v.id("cardTemplates")), // Link to visual template
  })
    .index("by_rarity", ["rarity"])
    .index("by_archetype", ["archetype"])
    .index("by_type", ["cardType"])
    .index("by_name", ["name"]),

  // =============================================================================
  // Card Template Designer
  // =============================================================================

  // Card visual templates - defines layout for card rendering
  cardTemplates: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    cardType: literals("creature", "spell", "trap", "equipment", "universal"), // "universal" applies to all types
    // Template mode:
    // - "frame_artwork": Traditional mode with separate frame image + artwork placement
    // - "full_card_image": Card's own image is the full background (frame + art baked in)
    mode: v.optional(literals("frame_artwork", "full_card_image")), // defaults to "frame_artwork" for backwards compatibility
    // Canvas dimensions (standard TCG: 750x1050)
    width: v.number(),
    height: v.number(),
    // Frame images per rarity (different borders for each rarity)
    frameImages: v.object({
      common: v.optional(v.string()),
      uncommon: v.optional(v.string()),
      rare: v.optional(v.string()),
      epic: v.optional(v.string()),
      legendary: v.optional(v.string()),
    }),
    // Fallback frame if rarity-specific not set
    defaultFrameImageUrl: v.optional(v.string()),
    // Artwork area (where card art goes)
    artworkBounds: v.object({
      x: v.number(),
      y: v.number(),
      width: v.number(),
      height: v.number(),
    }),
    // Default text styles
    defaultFontFamily: v.string(),
    defaultFontSize: v.number(),
    defaultFontColor: v.string(),
    // Metadata
    isDefault: v.boolean(),
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_cardType", ["cardType"])
    .index("by_default", ["isDefault", "cardType"])
    .index("by_active", ["isActive"]),

  // Blocks within a template (text, image, icon elements)
  cardTemplateBlocks: defineTable({
    templateId: v.id("cardTemplates"),
    blockType: literals(
      // Text blocks
      "name",
      "level",
      "attribute",
      "attack",
      "defense",
      "cost",
      "cardType",
      "monsterType",
      "effect",
      "flavorText",
      "custom",
      // Image blocks (NEW)
      "image",
      "icon"
    ),
    label: v.string(), // Display label in editor
    // For custom blocks, what field or static text to display
    customContent: v.optional(v.string()),
    // Position (percentage-based 0-100 for responsiveness)
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    // Typography (for text blocks)
    fontFamily: v.string(),
    fontSize: v.number(),
    fontWeight: literals("normal", "bold"),
    fontStyle: literals("normal", "italic"),
    textAlign: literals("left", "center", "right"),
    color: v.string(),
    // Optional styling
    backgroundColor: v.optional(v.string()),
    borderColor: v.optional(v.string()),
    borderWidth: v.optional(v.number()),
    borderRadius: v.optional(v.number()),
    padding: v.optional(v.number()),
    // Image block properties (NEW)
    imageUrl: v.optional(v.string()), // URL to image (Vercel Blob or external)
    imageStorageId: v.optional(v.string()), // Reference to asset storage
    imageFit: v.optional(literals("fill", "contain", "cover", "none")),
    // Transform properties (NEW)
    opacity: v.optional(v.number()), // 0-1
    rotation: v.optional(v.number()), // degrees
    // Visibility rules - which card types should show this block
    showForCardTypes: v.optional(v.array(literals("creature", "spell", "trap", "equipment"))),
    // Z-index for layering
    zIndex: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_template_zIndex", ["templateId", "zIndex"]),

  // Player's card inventory - tracks owned cards and quantities
  // NOTE: Each unique (card + variant) combination is a separate row
  playerCards: defineTable({
    userId: v.id("users"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    variant: v.optional(cardVariantValidator), // defaults to "standard" for legacy data
    serialNumber: v.optional(v.number()), // For numbered variants (#1-500)
    isFavorite: v.boolean(),
    acquiredAt: v.number(),
    lastUpdatedAt: v.number(),
    source: v.optional(
      literals("pack", "marketplace", "reward", "trade", "event", "daily", "jackpot")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_card", ["userId", "cardDefinitionId"])
    .index("by_user_card_variant", ["userId", "cardDefinitionId", "variant"])
    .index("by_user_favorite", ["userId", "isFavorite"])
    .index("by_variant", ["variant"]),

  // User-created decks - custom deck builds
  userDecks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    deckArchetype: v.optional(literals("fire", "water", "earth", "wind", "dark", "neutral")),
    isActive: v.boolean(), // for soft deletes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_updated", ["updatedAt"]),

  // Cards within each user deck
  deckCards: defineTable({
    deckId: v.id("userDecks"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(), // 1-3 copies per card
    position: v.optional(v.number()), // for card ordering
  })
    .index("by_deck", ["deckId"])
    .index("by_deck_card", ["deckId", "cardDefinitionId"]),

  // File Storage: Metadata for uploaded files (images, documents, etc.)
  fileMetadata: defineTable({
    userId: v.id("users"),
    storageId: v.string(), // Reference to Convex storage or Vercel Blob pathname
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    category: literals(
      // User uploads
      "profile_picture",
      "card_image",
      "document",
      "other",
      // Admin-managed assets (Vercel Blob)
      "background",
      "texture",
      "ui_element",
      "shop_asset",
      "story_asset",
      "logo"
    ),
    // Vercel Blob fields (optional for backward compatibility)
    blobUrl: v.optional(v.string()), // Full Vercel Blob URL
    blobPathname: v.optional(v.string()), // Path within blob storage (e.g., "assets/backgrounds/hero.jpg")
    description: v.optional(v.string()), // Admin notes/description
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_uploaded_at", ["uploadedAt"])
    .index("by_storage_id", ["storageId"])
    .index("by_category", ["category"])
    .index("by_blob_pathname", ["blobPathname"]),

  // ============================================================================
  // LEADERBOARDS & MATCH HISTORY
  // ============================================================================

  // Match history - track all completed games for ratings and analytics
  matchHistory: defineTable({
    winnerId: v.id("users"),
    loserId: v.id("users"),
    gameType: literals("ranked", "casual", "story"),

    // Rating changes
    winnerRatingBefore: v.number(),
    winnerRatingAfter: v.number(),
    loserRatingBefore: v.number(),
    loserRatingAfter: v.number(),

    // XP rewards (for story mode and all games)
    xpAwarded: v.optional(v.number()),

    completedAt: v.number(),
  })
    .index("by_winner", ["winnerId"])
    .index("by_loser", ["loserId"])
    .index("by_completed", ["completedAt"])
    .index("by_game_type", ["gameType", "completedAt"]),

  // Leaderboard snapshots - cached rankings to avoid recalculating
  leaderboardSnapshots: defineTable({
    leaderboardType: literals("ranked", "casual", "story"),
    playerSegment: literals("all", "humans", "ai"),

    // Top N players snapshot
    rankings: v.array(
      v.object({
        userId: v.id("users"),
        username: v.string(),
        rank: v.number(),
        rating: v.number(), // ELO, casual rating, or XP
        level: v.optional(v.number()), // for story leaderboard
        wins: v.number(),
        losses: v.number(),
        winRate: v.number(),
        isAiAgent: v.boolean(),
      })
    ),

    lastUpdated: v.number(),
  }).index("by_leaderboard", ["leaderboardType", "playerSegment"]),

  // ============================================================================
  // ECONOMY SYSTEM
  // ============================================================================

  // Player currency balances (Gold/Gems)
  playerCurrency: defineTable({
    userId: v.id("users"),
    gold: v.number(),
    gems: v.number(),
    lifetimeGoldEarned: v.number(),
    lifetimeGoldSpent: v.number(),
    lifetimeGemsEarned: v.number(),
    lifetimeGemsSpent: v.number(),
    lastUpdatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Currency transaction ledger (audit trail)
  currencyTransactions: defineTable({
    userId: v.id("users"),
    transactionType: literals(
      "purchase",
      "reward",
      "sale",
      "gift",
      "refund",
      "admin_refund",
      "conversion",
      "marketplace_fee",
      "auction_bid",
      "auction_refund"
    ),
    currencyType: literals("gold", "gems"),
    amount: v.number(),
    balanceAfter: v.number(),
    referenceId: v.optional(v.string()),
    description: v.string(),
    /**
     * v.any() USAGE: Transaction metadata
     *
     * REASON: Different transaction types have different metadata structures
     * EXPECTED TYPES:
     * - purchase: { productId: string, productName: string }
     * - marketplace_fee: { listingId: Id<"marketplaceListings">, feePercent: number }
     * - quest reward: { questId: string, questType: "daily" | "weekly" | "achievement" }
     * - achievement: { achievementId: string, category: string, rarity: string }
     *
     * SECURITY: Written only by internal mutations with controlled metadata
     * ALTERNATIVE: Define TransactionMetadata union type (recommended for v2)
     */
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_type", ["transactionType", "createdAt"])
    .index("by_reference", ["referenceId"]),

  // Shop product catalog
  shopProducts: defineTable({
    productId: v.string(),
    name: v.string(),
    description: v.string(),
    productType: literals("pack", "box", "currency"),
    goldPrice: v.optional(v.number()),
    gemPrice: v.optional(v.number()),
    packConfig: v.optional(
      v.object({
        cardCount: v.number(),
        guaranteedRarity: v.optional(literals("common", "uncommon", "rare", "epic", "legendary")),
        guaranteedCount: v.optional(v.number()), // How many guaranteed rarity slots
        allRareOrBetter: v.optional(v.boolean()), // For collector packs - all cards Rare+
        archetype: v.optional(
          literals(
            // Primary archetypes (from card CSV)
            "infernal_dragons",
            "abyssal_depths",
            "iron_legion",
            "necro_empire",
            // Legacy archetypes (for backwards compatibility)
            "abyssal_horrors",
            "nature_spirits",
            "storm_elementals",
            // Future/placeholder archetypes
            "shadow_assassins",
            "celestial_guardians",
            "undead_legion",
            "divine_knights",
            "arcane_mages",
            "mechanical_constructs",
            "neutral",
            // Old archetypes (temporary for migration)
            "fire",
            "water",
            "earth",
            "wind"
          )
        ),
        // Variant drop rate multipliers (1.0 = base rate, 2.0 = 2x chance)
        variantMultipliers: v.optional(
          v.object({
            foil: v.number(), // Base: 10% → 1.5 means 15%
            altArt: v.number(), // Base: 2% → 2.0 means 4%
            fullArt: v.number(), // Base: 0.5% → 5.0 means 2.5%
          })
        ),
      })
    ),
    boxConfig: v.optional(
      v.object({
        packProductId: v.string(),
        packCount: v.number(),
        bonusCards: v.optional(v.number()),
      })
    ),
    currencyConfig: v.optional(
      v.object({
        currencyType: literals("gold", "gems"),
        amount: v.number(),
      })
    ),
    isActive: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_type", ["productType", "isActive"])
    .index("by_active", ["isActive", "sortOrder"])
    .index("by_product_id", ["productId"]),

  // Pack opening history (analytics)
  packOpeningHistory: defineTable({
    userId: v.id("users"),
    productId: v.string(),
    packType: v.string(),
    cardsReceived: v.array(
      v.object({
        cardDefinitionId: v.id("cardDefinitions"),
        name: v.string(),
        rarity: v.string(),
        variant: v.optional(v.string()), // "standard", "foil", "alt_art", "full_art", "numbered"
        serialNumber: v.optional(v.number()), // For numbered variants
      })
    ),
    currencyUsed: literals("gold", "gems", "token", "free"),
    amountPaid: v.number(),
    // Pity tracking - whether any pity guarantees were triggered
    pityTriggered: v.optional(
      v.object({
        epic: v.optional(v.boolean()),
        legendary: v.optional(v.boolean()),
        fullArt: v.optional(v.boolean()),
      })
    ),
    openedAt: v.number(),
  })
    .index("by_user_time", ["userId", "openedAt"])
    .index("by_time", ["openedAt"]),

  // ============================================================================
  // MARKETPLACE
  // ============================================================================

  // Player-to-player marketplace listings
  marketplaceListings: defineTable({
    sellerId: v.id("users"),
    sellerUsername: v.string(),
    listingType: literals("fixed", "auction"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    price: v.number(),
    currentBid: v.optional(v.number()),
    highestBidderId: v.optional(v.id("users")),
    highestBidderUsername: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    bidCount: v.number(),
    status: literals("active", "sold", "cancelled", "expired", "suspended"),
    soldTo: v.optional(v.id("users")),
    soldFor: v.optional(v.number()),
    soldAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Token payment support
    currencyType: v.optional(literals("gold", "token")),
    tokenPrice: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_seller", ["sellerId", "status"])
    .index("by_card", ["cardDefinitionId", "status"])
    .index("by_type", ["listingType", "status"])
    .index("by_ends_at", ["endsAt"])
    .index("by_status_listingType_endsAt", ["status", "listingType", "endsAt"]),

  // Auction bid history
  auctionBids: defineTable({
    listingId: v.id("marketplaceListings"),
    bidderId: v.id("users"),
    bidderUsername: v.string(),
    bidAmount: v.number(),
    bidStatus: literals("active", "outbid", "won", "refunded", "cancelled"),
    refundedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_bidder", ["bidderId", "bidStatus"]),

  // Marketplace bids (admin view of auction bids)
  marketplaceBids: defineTable({
    listingId: v.id("marketplaceListings"),
    bidderId: v.id("users"),
    bidderUsername: v.string(),
    bidAmount: v.number(),
    bidStatus: literals("active", "outbid", "won", "refunded", "cancelled"),
    refundedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_listing", ["listingId", "createdAt"])
    .index("by_bidder", ["bidderId", "bidStatus"]),

  // Marketplace price caps (admin-set maximum prices for cards)
  marketplacePriceCaps: defineTable({
    cardDefinitionId: v.id("cardDefinitions"),
    maxPrice: v.number(),
    reason: v.string(),
    setBy: v.id("users"),
    setByUsername: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_card", ["cardDefinitionId"])
    .index("by_active", ["isActive", "createdAt"]),

  // ============================================================================
  // GEM PACKAGES (Token → Gems Purchase)
  // ============================================================================

  // Gem package definitions for purchasing gems with native token
  gemPackages: defineTable({
    packageId: v.string(), // e.g., "gem_starter", "gem_whale"
    name: v.string(),
    description: v.string(),
    gems: v.number(), // Amount of gems received
    usdPrice: v.number(), // Price in cents (299 = $2.99)
    bonusPercent: v.number(), // Bonus percentage (0-400)
    isActive: v.boolean(),
    sortOrder: v.number(),
    // Visual/marketing
    featuredBadge: v.optional(v.string()), // "Best Value", "Most Popular", etc.
    iconUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_package_id", ["packageId"])
    .index("by_active", ["isActive", "sortOrder"]),

  // Token → Gems purchase history
  tokenGemPurchases: defineTable({
    userId: v.id("users"),
    packageId: v.string(),
    gemsReceived: v.number(),
    usdValue: v.number(), // In cents
    tokenAmount: v.number(), // Tokens paid (in smallest unit / lamports)
    tokenPriceUsd: v.number(), // Token price at time of purchase (cents per token)
    solanaSignature: v.string(),
    status: literals("pending", "confirmed", "failed", "expired"),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_signature", ["solanaSignature"])
    .index("by_status", ["status", "createdAt"]),

  // ============================================================================
  // SHOP SALES SYSTEM
  // ============================================================================

  // Sale definitions for shop promotions
  shopSales: defineTable({
    saleId: v.string(), // Unique identifier
    name: v.string(),
    description: v.string(),
    saleType: saleTypeValidator,
    // Discount configuration
    discountPercent: v.optional(v.number()), // 0-50 typically
    bonusCards: v.optional(v.number()), // Extra cards per pack
    bonusGems: v.optional(v.number()), // Extra gems per purchase
    // Applicable products (empty = all products)
    applicableProducts: v.array(v.string()), // Product IDs
    applicableProductTypes: v.optional(v.array(literals("pack", "box", "currency", "gem_package"))),
    // Timing
    startsAt: v.number(),
    endsAt: v.number(),
    isActive: v.boolean(),
    priority: v.number(), // Higher priority overrides lower
    // Conditions/limits
    conditions: v.optional(
      v.object({
        minPurchaseAmount: v.optional(v.number()), // Minimum gems/gold to qualify
        maxUsesTotal: v.optional(v.number()), // Total uses across all users
        maxUsesPerUser: v.optional(v.number()), // Max uses per user
        returningPlayerOnly: v.optional(v.boolean()), // Only for players away 14+ days
        newPlayerOnly: v.optional(v.boolean()), // Only for accounts < 7 days old
        minPlayerLevel: v.optional(v.number()),
      })
    ),
    // Stats
    usageCount: v.number(),
    totalDiscountGiven: v.number(), // Running total of discounts applied
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_sale_id", ["saleId"])
    .index("by_active_time", ["isActive", "startsAt", "endsAt"])
    .index("by_type", ["saleType", "isActive"])
    .index("by_priority", ["isActive", "priority"]),

  // Sale usage tracking per user
  saleUsage: defineTable({
    userId: v.id("users"),
    saleId: v.string(),
    productId: v.string(),
    originalPrice: v.number(),
    discountedPrice: v.number(),
    discountAmount: v.number(),
    usedAt: v.number(),
  })
    .index("by_user_sale", ["userId", "saleId"])
    .index("by_sale", ["saleId", "usedAt"])
    .index("by_user", ["userId", "usedAt"]),

  // ============================================================================
  // DAILY/WEEKLY REWARDS
  // ============================================================================

  // Daily and weekly reward claims
  dailyRewards: defineTable({
    userId: v.id("users"),
    rewardType: literals("daily_pack", "weekly_jackpot", "login_streak", "season_end", "event"),
    claimedAt: v.number(),
    reward: v.object({
      type: literals("pack", "gold", "gems", "card", "lottery_ticket"),
      amount: v.optional(v.number()), // For gold/gems
      packId: v.optional(v.string()), // For pack rewards
      cardId: v.optional(v.id("cardDefinitions")), // For card rewards
      variant: v.optional(v.string()), // If card has specific variant
      serialNumber: v.optional(v.number()), // For numbered cards
    }),
    // Jackpot result tracking
    jackpotResult: v.optional(
      v.object({
        won: v.boolean(),
        prizeType: v.optional(v.string()), // "full_art", "numbered", "foil", etc.
        rollValue: v.optional(v.number()), // Random roll for transparency
      })
    ),
  })
    .index("by_user_type", ["userId", "rewardType"])
    .index("by_user_date", ["userId", "claimedAt"])
    .index("by_type_date", ["rewardType", "claimedAt"]),

  // Numbered card registry (tracks minted numbered editions)
  numberedCardRegistry: defineTable({
    cardDefinitionId: v.id("cardDefinitions"),
    serialNumber: v.number(), // 1-500
    maxSerial: v.number(), // Total minted (typically 500)
    mintedAt: v.number(),
    mintedTo: v.optional(v.id("users")), // Original owner
    mintMethod: literals("event", "tournament", "pack", "admin"), // How it was minted
    currentOwner: v.optional(v.id("users")), // Current owner (updated on trade)
  })
    .index("by_card", ["cardDefinitionId"])
    .index("by_card_serial", ["cardDefinitionId", "serialNumber"])
    .index("by_owner", ["currentOwner"]),

  // ============================================================================
  // TOKEN INTEGRATION
  // ============================================================================

  // Token balance cache for Solana tokens
  tokenBalanceCache: defineTable({
    userId: v.id("users"),
    walletAddress: v.string(),
    tokenMint: v.string(),
    balance: v.number(),
    lastVerifiedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_wallet", ["walletAddress"]),

  // Token transaction history
  tokenTransactions: defineTable({
    userId: v.id("users"),
    transactionType: literals(
      "marketplace_purchase",
      "marketplace_sale",
      "platform_fee",
      "battle_pass_purchase",
      "gem_purchase" // Token → Gems conversion
    ),
    amount: v.number(),
    signature: v.optional(v.string()),
    status: literals("pending", "confirmed", "failed"),
    referenceId: v.optional(v.string()),
    description: v.string(),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_user_time", ["userId", "createdAt"])
    .index("by_signature", ["signature"]),

  // Pending token purchases for marketplace and battle pass
  pendingTokenPurchases: defineTable({
    buyerId: v.id("users"),
    listingId: v.optional(v.id("marketplaceListings")), // Optional for non-marketplace purchases
    battlePassId: v.optional(v.id("battlePassSeasons")), // For battle pass premium purchases
    purchaseType: v.optional(literals("marketplace", "battle_pass")), // Type of purchase
    amount: v.number(),
    buyerWallet: v.string(),
    sellerWallet: v.string(), // Treasury wallet for battle pass purchases
    status: literals("awaiting_signature", "submitted", "confirmed", "failed", "expired"),
    transactionSignature: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_listing", ["listingId"])
    .index("by_battle_pass", ["battlePassId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // x402 PAYMENT PROTOCOL
  // ============================================================================

  /**
   * x402 payment records for audit trail
   * Records all payments made via the x402 protocol (HTTP 402 Payment Required)
   * Used for AI agent purchases and other machine-to-machine payments
   */
  x402Payments: defineTable({
    // Payment identification
    transactionSignature: v.string(), // Solana transaction signature (idempotency key)
    payerWallet: v.string(), // Wallet address that made the payment
    recipientWallet: v.string(), // Wallet address that received the payment

    // Amount and token
    amount: v.number(), // Amount in atomic units (lamports/smallest unit)
    tokenMint: v.string(), // SPL token mint address
    network: v.string(), // CAIP-2 network identifier (e.g., "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp")

    // Resource accessed
    resourcePath: v.string(), // API endpoint path (e.g., "/api/agents/shop/gems")
    resourceDescription: v.string(), // Human-readable description

    // Linked entities
    userId: v.optional(v.id("users")), // User who made the purchase (if known)
    agentId: v.optional(v.id("agents")), // Agent that made the purchase (if applicable)
    purchaseType: v.optional(literals("gems", "pack", "box", "other")), // Type of purchase
    purchaseId: v.optional(v.string()), // Reference to specific purchase record

    // Verification details
    verifiedAt: v.number(), // When payment was verified by facilitator
    facilitatorResponse: v.optional(v.string()), // JSON string of full facilitator response

    // Status
    status: literals("verified", "settled", "failed"),
    errorMessage: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index("by_signature", ["transactionSignature"])
    .index("by_payer", ["payerWallet", "createdAt"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_agent", ["agentId", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_type", ["purchaseType", "createdAt"]),

  // ============================================================================
  // PROMOTIONAL CODES
  // ============================================================================

  // Redeemable promo codes
  promoCodes: defineTable({
    code: v.string(),
    description: v.string(),
    rewardType: literals("gold", "gems", "pack"),
    rewardAmount: v.number(),
    rewardPackId: v.optional(v.string()),
    maxRedemptions: v.optional(v.number()),
    redemptionCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // Promo code redemption history
  promoRedemptions: defineTable({
    userId: v.id("users"),
    promoCodeId: v.id("promoCodes"),
    code: v.string(),
    rewardReceived: v.string(),
    redeemedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["promoCodeId", "redeemedAt"])
    .index("by_user_code", ["userId", "promoCodeId"]),

  // ============================================================================
  // STORY MODE SYSTEM
  // ============================================================================

  // Story mode progress tracking
  storyProgress: defineTable({
    userId: v.id("users"),
    actNumber: v.number(), // 1-4, 5 for epilogue
    chapterNumber: v.number(), // 1-15 depending on act
    difficulty: difficultyValidator,
    status: progressStatusValidator,
    starsEarned: v.number(), // 0-3
    bestScore: v.optional(v.number()), // Highest LP remaining
    timesAttempted: v.number(),
    timesCompleted: v.number(),
    firstCompletedAt: v.optional(v.number()),
    lastAttemptedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_chapter", ["userId", "actNumber", "chapterNumber"])
    .index("by_user_difficulty", ["userId", "difficulty", "status"])
    .index("by_user_status", ["userId", "status"]),

  // Chapter battle history (for retry tracking)
  storyBattleAttempts: defineTable({
    userId: v.id("users"),
    progressId: v.id("storyProgress"),
    actNumber: v.number(),
    chapterNumber: v.number(),
    difficulty: difficultyValidator,
    outcome: literals("won", "lost", "abandoned"),
    starsEarned: v.number(),
    finalLP: v.number(), // Life points remaining
    rewardsEarned: v.object({
      gold: v.number(),
      xp: v.number(),
      cards: v.optional(v.array(v.string())),
    }),
    attemptedAt: v.number(),
  })
    .index("by_user_time", ["userId", "attemptedAt"])
    .index("by_progress", ["progressId", "attemptedAt"])
    .index("by_user_chapter", ["userId", "actNumber", "chapterNumber"])
    .index("by_user_difficulty_time", ["userId", "difficulty", "attemptedAt"]),

  // Player XP and level system
  playerXP: defineTable({
    userId: v.id("users"),
    currentXP: v.number(),
    currentLevel: v.number(),
    lifetimeXP: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_level", ["currentLevel"])
    .index("by_lifetime_xp", ["lifetimeXP"]),

  // Badge/achievement system
  playerBadges: defineTable({
    userId: v.id("users"),
    badgeType: literals(
      "archetype_complete", // Completed all chapters for an archetype
      "act_complete", // Completed entire act
      "difficulty_complete", // Completed all chapters on a difficulty
      "perfect_chapter", // 3 stars on a chapter
      "speed_run", // Special achievements
      "milestone" // XP/level milestones
    ),
    badgeId: v.string(), // e.g., "infernal_dragons_complete", "act_1_hard"
    displayName: v.string(),
    description: v.string(),
    archetype: v.optional(v.string()), // For archetype badges
    iconUrl: v.optional(v.string()),
    earnedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "badgeType"])
    .index("by_badge", ["badgeId"]),

  // Player notifications - real-time notifications for achievements, level ups, etc.
  playerNotifications: defineTable({
    userId: v.id("users"),
    type: literals("achievement_unlocked", "level_up", "quest_completed", "badge_earned"),
    title: v.string(),
    message: v.string(),
    /**
     * v.any() USAGE: Notification data payload
     *
     * REASON: Different notification types have different data structures
     * EXPECTED TYPES by notification type:
     * - achievement_unlocked: { achievementId: string, achievementName: string }
     * - level_up: { newLevel: number, xpGained: number }
     * - quest_completed: { questId: string, reward: { gold?: number, xp?: number } }
     * - badge_earned: { badgeId: string, badgeName: string }
     *
     * ALTERNATIVE: Define NotificationData discriminated union (recommended for v2)
     */
    data: v.optional(v.any()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  // ============================================================================
  // USER INBOX - Unified inbox for rewards, announcements, challenges, messages
  // ============================================================================

  userInbox: defineTable({
    userId: v.id("users"),
    type: literals(
      "reward", // Admin-granted rewards (gold, cards, packs)
      "announcement", // System/admin announcements
      "challenge", // Game challenge invitations
      "friend_request", // Friend request notifications
      "system", // System messages (maintenance, updates)
      "achievement" // Achievement unlocks (synced from playerNotifications)
    ),
    title: v.string(),
    message: v.string(),
    /**
     * v.any() USAGE: Inbox message data payload
     *
     * REASON: Different message types have different data structures
     * EXPECTED TYPES by message type:
     * - reward: { rewardType: "gold"|"cards"|"packs", gold?: number, cardIds?: string[], packCount?: number, claimed: boolean }
     * - announcement: { priority?: "normal"|"important"|"urgent", actionUrl?: string }
     * - challenge: { challengerId: Id<"users">, challengerUsername: string, lobbyId: Id<"gameLobbies">, mode: string }
     * - friend_request: { requesterId: Id<"users">, requesterUsername: string }
     * - system: { category?: string, actionUrl?: string }
     * - achievement: { achievementId: string, achievementName: string }
     */
    data: v.optional(v.any()),
    // Sender info (for admin messages, challenges, friend requests)
    senderId: v.optional(v.id("users")),
    senderUsername: v.optional(v.string()),
    // Status tracking
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    // For rewards that need explicit claiming
    claimedAt: v.optional(v.number()),
    // Optional expiration (e.g., time-limited rewards, challenges)
    expiresAt: v.optional(v.number()),
    // Soft delete
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_deleted", ["userId", "deletedAt"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),

  // Chapter definitions (reference data)
  storyChapters: defineTable({
    number: v.optional(v.number()), // Legacy - chapter number within act (optional for old data)
    actNumber: v.optional(v.number()), // Act 1, 2, 3...
    chapterNumber: v.optional(v.number()), // Chapter within act
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    archetype: v.optional(v.string()), // Chapter archetype (fire, water, etc.)
    storyText: v.optional(v.string()), // Narrative text
    aiOpponentDeckCode: v.optional(v.string()), // AI deck code
    aiDifficulty: v.optional(
      v.union(
        // String literal format (used by storyStages)
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("boss"),
        // Object format (used by storyChapters seeds - difficulty values per mode)
        v.object({
          normal: v.number(),
          hard: v.number(),
          legendary: v.number(),
        })
      )
    ),
    battleCount: v.optional(v.number()), // Number of battles in chapter
    archetypeImageUrl: v.optional(v.string()), // Chapter archetype image
    baseRewards: v.optional(
      v.object({
        gold: v.number(),
        xp: v.number(),
        gems: v.optional(v.number()),
      })
    ),
    unlockCondition: v.optional(
      v.object({
        type: literals("chapter_complete", "player_level", "none"),
        requiredChapterId: v.optional(v.id("storyChapters")),
        requiredLevel: v.optional(v.number()),
      })
    ),
    // Legacy fields from seed data
    loreText: v.optional(v.string()),
    unlockRequirements: v.optional(
      v.object({
        previousChapter: v.optional(v.boolean()),
        minimumLevel: v.optional(v.number()),
      })
    ),
    isActive: v.optional(v.boolean()),
    status: v.optional(literals("draft", "published")), // Optional for old data
    createdAt: v.number(),
    updatedAt: v.optional(v.number()), // Optional for old data
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"])
    .index("by_act_chapter", ["actNumber", "chapterNumber"]),

  // Stage definitions within chapters
  storyStages: defineTable({
    chapterId: v.id("storyChapters"),
    stageNumber: v.number(), // Stage 1, 2, 3 within chapter

    // Legacy name field (code expects this)
    name: v.optional(v.string()),
    title: v.optional(v.string()), // Optional for old data
    description: v.string(),

    // Opponent configuration
    opponentName: v.optional(v.string()), // Optional for old data
    opponentDeckId: v.optional(v.id("decks")), // Pre-built AI deck
    opponentDeckArchetype: v.optional(v.string()), // Or generate from archetype
    difficulty: v.optional(literals("easy", "medium", "hard", "boss")), // Optional for old data
    // Legacy field name for difficulty (code uses both)
    aiDifficulty: v.optional(literals("easy", "medium", "hard", "boss")),

    // Dialogue/narrative
    preMatchDialogue: v.optional(
      v.array(
        v.object({
          speaker: v.string(),
          text: v.string(),
          imageUrl: v.optional(v.string()),
        })
      )
    ),
    postMatchWinDialogue: v.optional(
      v.array(
        v.object({
          speaker: v.string(),
          text: v.string(),
        })
      )
    ),
    postMatchLoseDialogue: v.optional(
      v.array(
        v.object({
          speaker: v.string(),
          text: v.string(),
        })
      )
    ),

    // Rewards (legacy fields that code expects)
    rewardGold: v.optional(v.number()),
    rewardXp: v.optional(v.number()),
    firstClearBonus: v.optional(
      v.union(
        // Object format (new)
        v.object({
          gold: v.optional(v.number()),
          xp: v.optional(v.number()),
          gems: v.optional(v.number()),
        }),
        // Number format (legacy data)
        v.number()
      )
    ),
    // New reward fields
    firstClearGold: v.optional(v.number()), // Optional for old data
    repeatGold: v.optional(v.number()), // Optional for old data
    firstClearGems: v.optional(v.number()),
    cardRewardId: v.optional(v.id("cardDefinitions")), // Guaranteed card on first clear

    status: v.optional(literals("draft", "published")), // Optional for old data
    createdAt: v.optional(v.number()), // Optional for old data
    updatedAt: v.optional(v.number()), // Optional for old data
  })
    .index("by_chapter", ["chapterId", "stageNumber"])
    .index("by_status", ["status"]),

  // Stage progress tracking (per user, per stage)
  storyStageProgress: defineTable({
    userId: v.id("users"),
    stageId: v.id("storyStages"),
    chapterId: v.id("storyChapters"),
    stageNumber: v.number(),
    status: literals("locked", "available", "completed", "starred"), // "starred" = 3 stars
    starsEarned: v.number(), // 0-3
    bestScore: v.optional(v.number()), // Highest LP remaining
    timesCompleted: v.number(),
    firstClearClaimed: v.boolean(),
    lastCompletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_stage", ["userId", "stageId"])
    .index("by_user_chapter", ["userId", "chapterId"]),

  // ============================================================================
  // PROGRESSION SYSTEM - Quests & Achievements
  // ============================================================================

  // Quest definitions - reusable quest templates
  questDefinitions: defineTable({
    questId: v.string(), // Unique identifier (e.g., "daily_win_3")
    name: v.string(),
    description: v.string(),
    questType: literals("daily", "weekly", "achievement"),
    requirementType: v.string(), // "win_games", "play_cards", "deal_damage", etc.
    targetValue: v.number(),
    rewards: v.object({
      gold: v.number(),
      xp: v.number(),
      gems: v.optional(v.number()),
    }),
    // Optional filters for requirements
    filters: v.optional(
      v.object({
        gameMode: v.optional(literals("ranked", "casual", "story")),
        archetype: v.optional(v.string()),
        cardType: v.optional(v.string()),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_quest_id", ["questId"])
    .index("by_type", ["questType"])
    .index("by_active", ["isActive"]),

  // User quest progress - tracks individual player's quest status
  userQuests: defineTable({
    userId: v.id("users"),
    questId: v.string(), // References questDefinitions.questId
    currentProgress: v.number(),
    status: literals("active", "completed", "claimed"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // For daily/weekly quests
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_quest", ["questId"])
    .index("by_expires", ["expiresAt"]),

  // Achievement definitions - permanent unlockable achievements
  achievementDefinitions: defineTable({
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    category: literals(
      "wins",
      "games_played",
      "collection",
      "social",
      "story",
      "ranked",
      "special"
    ),
    rarity: literals("common", "rare", "epic", "legendary"),
    icon: v.string(), // Icon name
    requirementType: v.string(),
    targetValue: v.number(),
    rewards: v.optional(
      v.object({
        gold: v.optional(v.number()),
        xp: v.optional(v.number()),
        gems: v.optional(v.number()),
        badge: v.optional(v.string()),
        cardDefinitionId: v.optional(v.id("cardDefinitions")), // Card reward for special achievements
      })
    ),
    isSecret: v.boolean(), // Hidden until unlocked
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_achievement_id", ["achievementId"])
    .index("by_category", ["category"])
    .index("by_rarity", ["rarity"])
    .index("by_active", ["isActive"]),

  // User achievement progress
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.string(),
    currentProgress: v.number(),
    isUnlocked: v.boolean(),
    unlockedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_unlocked", ["userId", "isUnlocked"])
    .index("by_achievement", ["achievementId"]),

  // ============================================================================
  // NEWS & ANNOUNCEMENTS SYSTEM
  // ============================================================================

  // News articles managed by admins
  newsArticles: defineTable({
    title: v.string(),
    slug: v.string(), // URL-friendly identifier
    excerpt: v.string(), // Short summary for listing
    content: v.string(), // Full article content (markdown supported)
    category: literals(
      "update", // Game updates
      "event", // Events and tournaments
      "patch", // Patch notes
      "announcement", // General announcements
      "maintenance" // Maintenance notices
    ),
    imageUrl: v.optional(v.string()), // Featured image
    authorId: v.id("users"), // Admin who created it
    isPublished: v.boolean(),
    isPinned: v.boolean(), // Show at top of list
    publishedAt: v.optional(v.number()), // When it was published
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished", "publishedAt"])
    .index("by_category", ["category", "isPublished"])
    .index("by_pinned", ["isPinned", "isPublished"])
    .index("by_author", ["authorId"]),

  // ============================================================================
  // SOCIAL SYSTEM - Friends
  // ============================================================================

  // Friendships - tracks friend relationships between users
  friendships: defineTable({
    userId: v.id("users"), // The user who owns this relationship
    friendId: v.id("users"), // The other user in the relationship
    status: v.union(
      v.literal("pending"), // Friend request sent, awaiting response
      v.literal("accepted"), // Both users are friends
      v.literal("blocked") // User has blocked friendId
    ),
    // Who initiated the friend request (for pending status)
    requestedBy: v.id("users"),
    createdAt: v.number(), // When request was sent
    respondedAt: v.optional(v.number()), // When accepted/blocked
    lastInteraction: v.optional(v.number()), // Last message/game together
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_friend_status", ["friendId", "status"])
    .index("by_user_friend", ["userId", "friendId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  // ============================================================================
  // SEASONS SYSTEM
  // ============================================================================

  // Seasons - Competitive ranked seasons with rewards
  seasons: defineTable({
    name: v.string(), // "Season 1: Dawn of Cards"
    number: v.number(), // 1, 2, 3...
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("ended")),
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
    description: v.optional(v.string()),

    // Rank reset configuration
    rankResetType: v.union(v.literal("full"), v.literal("soft"), v.literal("none")),
    softResetPercentage: v.optional(v.number()), // For soft reset, how much ELO to keep (0-100)

    // Rewards configuration
    rewards: v.array(
      v.object({
        tier: v.string(), // "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Legend"
        minElo: v.number(),
        goldReward: v.number(),
        gemsReward: v.number(),
        cardPackReward: v.optional(v.number()), // Number of packs
        exclusiveCardId: v.optional(v.id("cardDefinitions")), // Exclusive card reward
        titleReward: v.optional(v.string()), // Exclusive title
      })
    ),

    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_number", ["number"])
    .index("by_status", ["status"]),

  // Season snapshots - End-of-season data for rewards distribution
  seasonSnapshots: defineTable({
    seasonId: v.id("seasons"),
    seasonNumber: v.number(),
    userId: v.id("users"),
    username: v.string(),
    finalElo: v.number(),
    tier: v.string(),
    rank: v.number(), // Position in leaderboard
    gamesPlayed: v.number(),
    wins: v.number(),
    losses: v.number(),
    rewardsDistributed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_rank", ["seasonId", "rank"])
    .index("by_user", ["userId"]),

  // ============================================================================
  // BATTLE PASS SYSTEM
  // ============================================================================

  // Battle Pass Seasons - Links battle pass to competitive seasons
  battlePassSeasons: defineTable({
    seasonId: v.id("seasons"), // Links to existing season
    name: v.string(), // "Season 1 Battle Pass"
    description: v.optional(v.string()),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("ended")),
    totalTiers: v.number(), // Usually 50
    xpPerTier: v.number(), // XP required per tier (e.g., 1000)
    startDate: v.number(),
    endDate: v.number(),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_season", ["seasonId"])
    .index("by_status", ["status"]),

  // Battle Pass Tier Definitions - Rewards for each tier
  battlePassTiers: defineTable({
    battlePassId: v.id("battlePassSeasons"),
    tier: v.number(), // 1-50
    // Free track reward (available to all)
    freeReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()), // For gold, gems, xp
        cardId: v.optional(v.id("cardDefinitions")), // For card rewards
        packProductId: v.optional(v.string()), // For pack rewards
        titleName: v.optional(v.string()), // For title rewards
        avatarUrl: v.optional(v.string()), // For avatar rewards
      })
    ),
    // Premium track reward (premium pass holders only)
    premiumReward: v.optional(
      v.object({
        type: v.union(
          v.literal("gold"),
          v.literal("gems"),
          v.literal("xp"),
          v.literal("card"),
          v.literal("pack"),
          v.literal("title"),
          v.literal("avatar")
        ),
        amount: v.optional(v.number()),
        cardId: v.optional(v.id("cardDefinitions")),
        packProductId: v.optional(v.string()),
        titleName: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
      })
    ),
    // Milestone tier flag (special tiers like 10, 25, 50)
    isMilestone: v.boolean(),
  })
    .index("by_battlepass", ["battlePassId"])
    .index("by_battlepass_tier", ["battlePassId", "tier"]),

  // Battle Pass Progress - User progress per battle pass
  battlePassProgress: defineTable({
    userId: v.id("users"),
    battlePassId: v.id("battlePassSeasons"),
    currentXP: v.number(), // Total XP earned this season for battle pass
    currentTier: v.number(), // Current unlocked tier (0-50)
    isPremium: v.boolean(), // Has purchased premium pass
    premiumPurchasedAt: v.optional(v.number()),
    // Track which rewards have been claimed
    claimedFreeTiers: v.array(v.number()), // [1, 2, 3, ...]
    claimedPremiumTiers: v.array(v.number()), // [1, 2, 3, ...]
    lastXPGainAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_battlepass", ["userId", "battlePassId"])
    .index("by_battlepass", ["battlePassId"])
    .index("by_tier", ["currentTier"]),

  // ============================================================================
  // SYSTEM CONFIGURATION
  // ============================================================================

  // System-wide configuration values managed by admins
  systemConfig: defineTable({
    key: v.string(), // unique config key like "economy.gold_per_win"
    value: v.any(), // JSON value - different config types have different value structures
    category: v.string(), // "economy", "matchmaking", "gameplay", "rates"
    displayName: v.string(),
    description: v.string(),
    valueType: v.union(
      v.literal("number"),
      v.literal("string"),
      v.literal("boolean"),
      v.literal("json"),
      v.literal("secret")
    ),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_key", ["key"])
    .index("by_category", ["category"]),

  // ============================================================================
  // AI CHAT SYSTEM
  // ============================================================================

  // AI Chat Messages - stores conversation history with elizaOS agent
  aiChatMessages: defineTable({
    userId: v.id("users"),
    sessionId: v.string(), // Groups messages into conversations
    role: v.union(v.literal("user"), v.literal("agent")),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_session", ["userId", "sessionId"]),

  // AI Chat Sessions - tracks conversation context per user
  aiChatSessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session", ["sessionId"]),

  // AI Usage Tracking - tracks token usage and costs for AI providers
  aiUsage: defineTable({
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    modelId: v.string(), // e.g., "anthropic/claude-3.5-sonnet"
    modelType: v.union(v.literal("language"), v.literal("embedding"), v.literal("image")),
    // Token counts
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    // Cost in USD (calculated from pricing)
    estimatedCost: v.number(),
    // Request metadata
    feature: v.string(), // "admin_assistant", "game_guide", "content_moderation", etc.
    userId: v.optional(v.id("users")), // User who triggered the request (if applicable)
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
    // Timestamps
    createdAt: v.number(),
  })
    .index("by_provider", ["provider", "createdAt"])
    .index("by_model", ["modelId", "createdAt"])
    .index("by_feature", ["feature", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_type", ["modelType", "createdAt"]),

  // AI Usage Daily Aggregates - pre-computed daily stats for faster analytics
  aiUsageDailyStats: defineTable({
    date: v.string(), // "2024-01-15" format
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    // Aggregated counts
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    // Token totals
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    // Cost totals
    totalCost: v.number(),
    // Performance
    avgLatencyMs: v.number(),
    // Breakdown by model type
    languageRequests: v.number(),
    embeddingRequests: v.number(),
    imageRequests: v.number(),
    // Top models used (JSON array)
    topModels: v.array(
      v.object({
        modelId: v.string(),
        requests: v.number(),
        tokens: v.number(),
        cost: v.number(),
      })
    ),
    // Updated timestamp
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_provider_date", ["provider", "date"]),

  // ============================================================================
  // FEATURE FLAGS SYSTEM
  // ============================================================================

  // Feature flags for gradual rollout and A/B testing
  featureFlags: defineTable({
    name: v.string(), // Unique identifier like "marketplace_enabled"
    displayName: v.string(), // Human readable name
    description: v.string(),
    enabled: v.boolean(),
    rolloutPercentage: v.optional(v.number()), // 0-100 for gradual rollout
    targetUserIds: v.optional(v.array(v.id("users"))), // Specific users
    targetRoles: v.optional(v.array(v.string())), // Target by role
    category: v.string(), // "gameplay", "economy", "social", "experimental"
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"]),

  // ============================================================================
  // TOURNAMENT SYSTEM
  // ============================================================================

  // Tournament definitions and state
  tournaments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),

    // Tournament configuration
    format: v.literal("single_elimination"), // Future: "double_elimination", "swiss", "round_robin"
    maxPlayers: v.union(v.literal(8), v.literal(16), v.literal(32)),
    entryFee: v.number(), // Gold required to enter (0 for free)
    mode: v.union(v.literal("ranked"), v.literal("casual")), // Game mode for matches

    // Prize pool configuration (gold distribution)
    prizePool: v.object({
      first: v.number(), // 1st place
      second: v.number(), // 2nd place
      thirdFourth: v.number(), // 3rd-4th place (each)
    }),

    // Status lifecycle: registration → checkin → active → completed/cancelled
    status: v.union(
      v.literal("registration"), // Accepting registrations
      v.literal("checkin"), // Registration closed, awaiting check-ins
      v.literal("active"), // Tournament in progress
      v.literal("completed"), // Tournament finished
      v.literal("cancelled") // Tournament cancelled (refunds issued)
    ),

    // Timing
    registrationStartsAt: v.number(), // When registration opens
    registrationEndsAt: v.number(), // When registration closes (check-in starts)
    checkInStartsAt: v.number(), // When check-in opens (usually same as registrationEndsAt)
    checkInEndsAt: v.number(), // When check-in closes (tournament starts)
    scheduledStartAt: v.number(), // When tournament is scheduled to start
    actualStartedAt: v.optional(v.number()), // When tournament actually started
    completedAt: v.optional(v.number()), // When tournament completed

    // Stats
    currentRound: v.number(), // Current round (1-indexed), 0 before start
    totalRounds: v.optional(v.number()), // Calculated when bracket generated
    registeredCount: v.number(), // Number of registered players
    checkedInCount: v.number(), // Number of checked-in players

    // Winner tracking
    winnerId: v.optional(v.id("users")),
    winnerUsername: v.optional(v.string()),
    secondPlaceId: v.optional(v.id("users")),
    secondPlaceUsername: v.optional(v.string()),

    // Admin
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_scheduled_start", ["scheduledStartAt"])
    .index("by_registration_start", ["registrationStartsAt"])
    .index("by_created", ["createdAt"]),

  // Tournament participants (registered players)
  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    username: v.string(),

    // Registration info
    registeredAt: v.number(),
    seedRating: v.number(), // Rating at time of registration (for seeding)

    // Status
    status: v.union(
      v.literal("registered"), // Registered but not checked in
      v.literal("checked_in"), // Checked in, ready to play
      v.literal("active"), // Currently in tournament
      v.literal("eliminated"), // Lost a match
      v.literal("winner"), // Won the tournament
      v.literal("forfeit"), // Forfeited (no-show or manual)
      v.literal("refunded") // Entry fee refunded (tournament cancelled)
    ),

    // Check-in tracking
    checkedInAt: v.optional(v.number()),

    // Tournament progress
    currentRound: v.optional(v.number()), // Current/last round played
    bracket: v.optional(v.number()), // Bracket position (1-based, assigned at start)
    eliminatedInRound: v.optional(v.number()), // Round eliminated (null if still active)
    finalPlacement: v.optional(v.number()), // Final placement (1st, 2nd, 3rd, 4th, etc.)

    // Prize tracking
    prizeAwarded: v.optional(v.number()), // Gold prize awarded
    prizeAwardedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_user", ["tournamentId", "userId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_tournament_bracket", ["tournamentId", "bracket"]),

  // Tournament matches (bracket matches)
  tournamentMatches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(), // Round number (1 = first round, 2 = quarterfinals, etc.)
    matchNumber: v.number(), // Match number within round (1-indexed)

    // Bracket position info (for rendering)
    bracketPosition: v.number(), // Overall position in bracket (for rendering)

    // Players
    player1Id: v.optional(v.id("users")), // null = TBD (waiting for previous match)
    player1Username: v.optional(v.string()),
    player1ParticipantId: v.optional(v.id("tournamentParticipants")),
    player2Id: v.optional(v.id("users")),
    player2Username: v.optional(v.string()),
    player2ParticipantId: v.optional(v.id("tournamentParticipants")),

    // Source matches (for TBD players)
    player1SourceMatchId: v.optional(v.id("tournamentMatches")), // Winner of this match becomes player1
    player2SourceMatchId: v.optional(v.id("tournamentMatches")), // Winner of this match becomes player2

    // Match state
    status: v.union(
      v.literal("pending"), // Waiting for players (TBD)
      v.literal("ready"), // Both players known, ready to start
      v.literal("active"), // Game in progress
      v.literal("completed"), // Match finished
      v.literal("forfeit") // One player forfeited
    ),

    // Linked game
    lobbyId: v.optional(v.id("gameLobbies")),
    gameId: v.optional(v.string()),

    // Result
    winnerId: v.optional(v.id("users")),
    winnerUsername: v.optional(v.string()),
    loserId: v.optional(v.id("users")),
    loserUsername: v.optional(v.string()),
    winReason: v.optional(
      v.union(
        v.literal("game_win"), // Won the game
        v.literal("opponent_forfeit"), // Opponent forfeited
        v.literal("opponent_no_show"), // Opponent didn't show up
        v.literal("bye") // No opponent (odd bracket)
      )
    ),

    // Timestamps
    scheduledAt: v.optional(v.number()), // Scheduled start time
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_round", ["tournamentId", "round"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_lobby", ["lobbyId"]),

  // Tournament history for user stats
  tournamentHistory: defineTable({
    userId: v.id("users"),
    tournamentId: v.id("tournaments"),
    tournamentName: v.string(),
    maxPlayers: v.number(),
    placement: v.number(), // Final placement (1st, 2nd, 3rd, etc.)
    prizeWon: v.number(), // Gold won
    matchesPlayed: v.number(),
    matchesWon: v.number(),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completedAt"])
    .index("by_tournament", ["tournamentId"]),

  // ============================================================================
  // FEEDBACK SYSTEM - Bug reports and feature requests from players
  // ============================================================================

  feedback: defineTable({
    // Submitter
    userId: v.id("users"),
    username: v.string(),

    // Content
    type: v.union(v.literal("bug"), v.literal("feature")),
    title: v.string(),
    description: v.string(),
    screenshotUrl: v.optional(v.string()),
    recordingUrl: v.optional(v.string()),

    // Context (auto-captured)
    pageUrl: v.string(),
    userAgent: v.string(),
    viewport: v.object({ width: v.number(), height: v.number() }),

    // Kanban state
    status: v.union(
      v.literal("new"),
      v.literal("triaged"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"))
    ),

    // Admin fields
    assignedTo: v.optional(v.id("users")),
    adminNotes: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type", "createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_type_status", ["type", "status", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // ============================================================================
  // BRANDING SYSTEM
  // ============================================================================

  // Branding folders - hierarchical organization of brand assets
  brandingFolders: defineTable({
    name: v.string(), // folder name
    parentId: v.optional(v.id("brandingFolders")), // null for root sections
    section: v.string(), // one of predefined sections
    path: v.string(), // full path like "Brand Identity/Logos/Dark Mode"
    description: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.id("users"),
  })
    .index("by_parent", ["parentId"])
    .index("by_section", ["section"])
    .index("by_path", ["path"]),

  // Branding assets - assets with rich metadata for AI consumption
  brandingAssets: defineTable({
    folderId: v.id("brandingFolders"),
    fileMetadataId: v.id("fileMetadata"), // links to existing storage
    name: v.string(), // display name
    tags: v.array(v.string()), // quick filter tags
    usageContext: v.array(v.string()), // ["newsletter", "social", "print", "website", "email", "merch"]
    variants: v.optional(
      v.object({
        theme: v.optional(v.string()),
        orientation: v.optional(v.string()),
        size: v.optional(v.string()),
        custom: v.optional(v.any()), // additional variant fields
      })
    ),
    fileSpecs: v.optional(
      v.object({
        minWidth: v.optional(v.number()),
        minHeight: v.optional(v.number()),
        maxWidth: v.optional(v.number()),
        maxHeight: v.optional(v.number()),
        transparent: v.optional(v.boolean()),
        format: v.optional(v.string()),
        custom: v.optional(v.any()), // additional spec fields
      })
    ),
    aiDescription: v.string(), // guidance for AI usage
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_folder", ["folderId"])
    .index("by_file_metadata", ["fileMetadataId"])
    .searchIndex("search_tags", {
      searchField: "tags",
    })
    .searchIndex("search_ai_description", {
      searchField: "aiDescription",
      filterFields: ["folderId"],
    }),

  // Branding guidelines - structured specs and rich text for AI
  brandingGuidelines: defineTable({
    section: v.string(), // "global" or section name
    structuredData: v.object({
      colors: v.optional(
        v.array(
          v.object({
            name: v.string(),
            hex: v.string(),
            usage: v.optional(v.string()),
          })
        )
      ),
      fonts: v.optional(
        v.array(
          v.object({
            name: v.string(),
            weights: v.array(v.number()),
            usage: v.optional(v.string()),
          })
        )
      ),
      brandVoice: v.optional(
        v.object({
          tone: v.string(),
          formality: v.number(), // 1-10 scale
          keywords: v.optional(v.array(v.string())),
          avoid: v.optional(v.array(v.string())),
        })
      ),
      customFields: v.optional(v.any()),
    }),
    richTextContent: v.string(), // markdown guidelines
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_section", ["section"]),

  // ============================================================================
  // TREASURY MANAGEMENT (Privy Server Wallets)
  // ============================================================================

  // Treasury wallets managed via Privy Server Wallet API
  treasuryWallets: defineTable({
    privyWalletId: v.string(), // Privy wallet ID
    address: v.string(), // Solana public address
    name: v.string(), // Human-readable name ("Fee Collection", "Distribution", etc.)
    purpose: v.union(
      v.literal("fee_collection"), // Collects platform fees
      v.literal("distribution"), // Distributes rewards/airdrops
      v.literal("liquidity"), // LP/bonding curve reserves
      v.literal("reserves") // General reserves
    ),
    balance: v.optional(v.number()), // Cached SOL balance (lamports)
    tokenBalance: v.optional(v.number()), // Cached LTCG balance (raw units)
    lastSyncedAt: v.optional(v.number()), // Last balance sync timestamp
    policyId: v.optional(v.string()), // Privy policy ID
    status: v.union(v.literal("active"), v.literal("frozen"), v.literal("archived")),
    // Wallet creation status tracking
    creationStatus: v.optional(
      v.union(
        v.literal("pending"), // Scheduled, not started
        v.literal("creating"), // Privy API call in progress
        v.literal("active"), // Successfully created
        v.literal("failed") // Creation failed
      )
    ),
    creationErrorMessage: v.optional(v.string()), // Error details if creation failed
    creationAttempts: v.optional(v.number()), // Number of creation attempts
    lastAttemptAt: v.optional(v.number()), // Timestamp of last creation attempt
    createdBy: v.optional(v.id("users")), // Optional for system-created wallets
    createdAt: v.number(),
  })
    .index("by_purpose", ["purpose"])
    .index("by_address", ["address"])
    .index("by_status", ["status"])
    .index("by_creation_status", ["creationStatus"]),

  // Treasury transaction history
  treasuryTransactions: defineTable({
    walletId: v.id("treasuryWallets"),
    type: v.union(
      v.literal("fee_received"), // Platform fees incoming
      v.literal("distribution"), // Rewards/airdrops outgoing
      v.literal("liquidity_add"), // Adding to LP
      v.literal("liquidity_remove"), // Removing from LP
      v.literal("transfer_internal"), // Between treasury wallets
      v.literal("transfer_external") // External transfers
    ),
    amount: v.number(), // Amount in raw units
    tokenMint: v.string(), // SOL or SPL token mint
    signature: v.optional(v.string()), // Solana tx signature
    status: v.union(
      v.literal("pending"),
      v.literal("submitted"),
      v.literal("confirmed"),
      v.literal("failed")
    ),
    metadata: v.optional(v.any()), // Source info (listing ID, user ID, etc.)
    initiatedBy: v.optional(v.id("users")),
    approvedBy: v.optional(v.array(v.id("users"))), // Multi-sig approvals
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_wallet", ["walletId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_signature", ["signature"])
    .index("by_created", ["createdAt"]),

  // Treasury spending policies
  treasuryPolicies: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    privyPolicyId: v.optional(v.string()), // Privy policy ID if synced
    rules: v.object({
      maxTransactionAmount: v.optional(v.number()), // Max single tx (raw units)
      dailyLimit: v.optional(v.number()), // Daily spending limit
      allowedRecipients: v.optional(v.array(v.string())), // Allowlisted addresses
      requiresApproval: v.boolean(),
      minApprovers: v.optional(v.number()), // For multi-sig
    }),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["isActive"]),

  // ============================================================================
  // TOKEN LAUNCH MANAGEMENT
  // ============================================================================

  // Token configuration (singleton-ish, one active config)
  tokenConfig: defineTable({
    name: v.string(), // "LunchTable"
    symbol: v.string(), // "LTCG"
    description: v.string(),
    imageUrl: v.optional(v.string()),
    // Social links (for pump.fun)
    twitter: v.optional(v.string()),
    telegram: v.optional(v.string()),
    website: v.optional(v.string()),
    discord: v.optional(v.string()),
    // Token economics
    initialSupply: v.optional(v.number()),
    decimals: v.optional(v.number()), // Default 6 for Solana
    targetMarketCap: v.optional(v.number()), // Graduation target ($90k default)
    // Mint info (populated after launch)
    mintAddress: v.optional(v.string()),
    bondingCurveAddress: v.optional(v.string()),
    pumpfunUrl: v.optional(v.string()),
    // Lifecycle
    launchedAt: v.optional(v.number()),
    graduatedAt: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("ready"),
      v.literal("launched"),
      v.literal("graduated")
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_mint", ["mintAddress"]),

  // Launch checklist items
  launchChecklist: defineTable({
    category: v.union(
      v.literal("treasury"), // Treasury funded, wallets ready
      v.literal("token"), // Config complete, image uploaded
      v.literal("marketing"), // Socials ready, announcements scheduled
      v.literal("technical"), // Webhooks configured, monitoring ready
      v.literal("team") // Team briefed, roles assigned
    ),
    item: v.string(), // "Treasury wallet funded with 5 SOL"
    description: v.optional(v.string()),
    isRequired: v.boolean(),
    isCompleted: v.boolean(),
    completedBy: v.optional(v.id("users")),
    completedAt: v.optional(v.number()),
    evidence: v.optional(v.string()), // Screenshot URL, tx signature, etc.
    order: v.number(), // Display order within category
  })
    .index("by_category", ["category"])
    .index("by_completed", ["isCompleted"]),

  // Multi-admin launch approvals
  launchApprovals: defineTable({
    adminId: v.id("users"),
    approved: v.boolean(),
    comments: v.optional(v.string()),
    approvedAt: v.number(),
  }).index("by_admin", ["adminId"]),

  // Launch schedule
  launchSchedule: defineTable({
    scheduledAt: v.optional(v.number()), // Target launch time
    timezone: v.string(),
    countdownEnabled: v.boolean(),
    status: v.union(
      v.literal("not_scheduled"),
      v.literal("scheduled"),
      v.literal("countdown"), // Within 24hrs
      v.literal("go"), // All approvals, checklist complete
      v.literal("launched"),
      v.literal("aborted")
    ),
    launchTxSignature: v.optional(v.string()),
    abortReason: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  // ============================================================================
  // TOKEN ANALYTICS (Post-Launch)
  // ============================================================================

  // Real-time token metrics (updated via webhooks)
  tokenMetrics: defineTable({
    timestamp: v.number(), // Bucketed by minute
    price: v.number(), // Current price in SOL
    priceUsd: v.number(), // USD equivalent
    marketCap: v.number(),
    volume24h: v.number(),
    txCount24h: v.number(),
    holderCount: v.number(),
    liquidity: v.number(),
    bondingCurveProgress: v.number(), // 0-100%
    graduationEta: v.optional(v.number()), // Estimated graduation timestamp
  }).index("by_timestamp", ["timestamp"]),

  // Holder snapshots
  tokenHolders: defineTable({
    address: v.string(),
    balance: v.number(), // Raw token units
    percentOwnership: v.number(), // 0-100
    firstPurchaseAt: v.number(),
    lastActivityAt: v.number(),
    totalBought: v.number(),
    totalSold: v.number(),
    isPlatformWallet: v.boolean(), // Flag our treasury wallets
    label: v.optional(v.string()), // "Team", "Whale #1", etc.
  })
    .index("by_balance", ["balance"])
    .index("by_address", ["address"])
    .index("by_platform", ["isPlatformWallet"]),

  // Individual trades (from webhooks)
  tokenTrades: defineTable({
    signature: v.string(), // Solana tx signature
    type: v.union(v.literal("buy"), v.literal("sell")),
    traderAddress: v.string(),
    tokenAmount: v.number(),
    solAmount: v.number(),
    pricePerToken: v.number(),
    timestamp: v.number(),
    isWhale: v.boolean(), // > 1% of supply
    source: v.optional(v.string()), // "pump.fun", "raydium", etc.
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_trader", ["traderAddress"])
    .index("by_type", ["type"])
    .index("by_signature", ["signature"])
    .index("by_whale", ["isWhale", "timestamp"]),

  // Aggregated stats (hourly/daily rollups)
  tokenStatsRollup: defineTable({
    period: v.union(v.literal("hour"), v.literal("day")),
    periodStart: v.number(), // Start timestamp of period
    volume: v.number(),
    buyVolume: v.number(),
    sellVolume: v.number(),
    txCount: v.number(),
    buyCount: v.number(),
    sellCount: v.number(),
    uniqueTraders: v.number(),
    highPrice: v.number(),
    lowPrice: v.number(),
    openPrice: v.number(),
    closePrice: v.number(),
    newHolders: v.number(),
    lostHolders: v.number(),
  }).index("by_period", ["period", "periodStart"]),

  // ============================================================================
  // ALERTING SYSTEM
  // ============================================================================

  // Alert rule definitions
  alertRules: defineTable({
    name: v.string(), // "Whale Buy Alert"
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    triggerType: v.union(
      v.literal("price_change"), // % change in timeframe
      v.literal("price_threshold"), // Above/below price
      v.literal("volume_spike"), // Unusual volume
      v.literal("whale_activity"), // Large holder movement
      v.literal("holder_milestone"), // Holder count threshold
      v.literal("bonding_progress"), // Graduation proximity
      v.literal("treasury_balance"), // Low balance warning
      v.literal("transaction_failed"), // Failed tx alert
      v.literal("graduation") // Token graduated!
    ),
    conditions: v.object({
      threshold: v.optional(v.number()),
      direction: v.optional(v.union(v.literal("above"), v.literal("below"), v.literal("change"))),
      timeframeMinutes: v.optional(v.number()),
      percentChange: v.optional(v.number()),
    }),
    severity: v.union(
      v.literal("info"), // In-app only
      v.literal("warning"), // In-app + push
      v.literal("critical") // All channels
    ),
    cooldownMinutes: v.number(), // Prevent spam
    lastTriggeredAt: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_type", ["triggerType"])
    .index("by_enabled", ["isEnabled"]),

  // Notification channels
  alertChannels: defineTable({
    type: v.union(
      v.literal("in_app"),
      v.literal("push"),
      v.literal("slack"),
      v.literal("discord"),
      v.literal("email")
    ),
    name: v.string(), // "Dev Team Slack"
    isEnabled: v.boolean(),
    config: v.object({
      webhookUrl: v.optional(v.string()), // Slack/Discord webhook
      email: v.optional(v.string()),
      minSeverity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    }),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_enabled", ["isEnabled"]),

  // Alert history
  alertHistory: defineTable({
    ruleId: v.id("alertRules"),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()), // Contextual data (price, tx sig, etc.)
    channelsNotified: v.array(v.string()),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_rule", ["ruleId"])
    .index("by_acknowledged", ["acknowledgedBy"])
    .index("by_created", ["createdAt"]),

  // In-app notifications for admins
  adminNotifications: defineTable({
    adminId: v.id("users"),
    alertHistoryId: v.optional(v.id("alertHistory")),
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("alert"), v.literal("system"), v.literal("action_required")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_admin_read", ["adminId", "isRead"])
    .index("by_created", ["createdAt"]),

  // Webhook configuration for external services (Helius, etc.)
  webhookConfig: defineTable({
    provider: v.union(v.literal("helius"), v.literal("shyft"), v.literal("bitquery")),
    webhookId: v.optional(v.string()), // Provider's webhook ID
    webhookUrl: v.string(), // Our endpoint URL
    webhookSecret: v.optional(v.string()), // For signature verification
    tokenMint: v.optional(v.string()), // Token being monitored
    isActive: v.boolean(),
    lastEventAt: v.optional(v.number()),
    errorCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["provider"])
    .index("by_active", ["isActive"]),

  // Stripe Customers - Maps users to Stripe customer IDs
  stripeCustomers: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(), // "cus_..."
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // Stripe Subscriptions - Active/past subscriptions
  stripeSubscriptions: defineTable({
    userId: v.id("users"),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(), // "sub_..."
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("trialing")
    ),
    planInterval: v.union(v.literal("month"), v.literal("year")),
    planAmount: v.number(), // 420 or 3690 (cents)
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_status", ["status"]),

  // Stripe Webhook Events - Idempotency tracking
  stripeWebhookEvents: defineTable({
    stripeEventId: v.string(), // "evt_..."
    type: v.string(),
    processed: v.boolean(),
    receivedAt: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_stripe_event", ["stripeEventId"])
    .index("by_processed", ["processed"]),

  // ============================================================================
  // CONTENT CALENDAR & EMAIL SYSTEM
  // ============================================================================

  // Scheduled content for the content calendar
  scheduledContent: defineTable({
    type: literals(
      "blog", // Long-form blog posts
      "x_post", // Twitter/X posts
      "reddit", // Reddit posts
      "email", // Email campaigns via Resend
      "announcement", // In-game announcements
      "news", // News articles (links to newsArticles)
      "image" // Image posts with captions
    ),
    title: v.string(),
    content: v.string(), // Main content body (markdown supported)
    scheduledFor: v.number(), // Timestamp when to publish
    status: literals("draft", "scheduled", "published", "failed"),
    // Type-specific metadata
    metadata: v.object({
      // Blog-specific
      slug: v.optional(v.string()),
      excerpt: v.optional(v.string()),
      featuredImage: v.optional(v.string()),
      // X/Twitter-specific
      tweetId: v.optional(v.string()), // After publishing
      // Reddit-specific
      subreddit: v.optional(v.string()),
      redditPostId: v.optional(v.string()), // After publishing
      // Email-specific
      subject: v.optional(v.string()),
      recipientType: v.optional(literals("players", "subscribers", "both", "custom")),
      recipientListId: v.optional(v.id("emailLists")),
      templateId: v.optional(v.id("emailTemplates")),
      // Announcement-specific
      priority: v.optional(literals("normal", "important", "urgent")),
      expiresAt: v.optional(v.number()),
      // News-specific (links to existing news article)
      newsArticleId: v.optional(v.id("newsArticles")),
      // Image-specific
      imageUrl: v.optional(v.string()),
      altText: v.optional(v.string()),
      caption: v.optional(v.string()),
    }),
    // Publishing result
    publishedAt: v.optional(v.number()),
    publishError: v.optional(v.string()),
    // Tracking
    authorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_scheduled", ["scheduledFor", "status"])
    .index("by_status", ["status"])
    .index("by_type", ["type", "status"])
    .index("by_author", ["authorId"])
    .index("by_date_range", ["scheduledFor"]),

  // Email templates for reusable email designs
  emailTemplates: defineTable({
    name: v.string(),
    subject: v.string(),
    body: v.string(), // HTML/markdown with {{variable}} placeholders
    variables: v.array(v.string()), // List of available variables
    category: literals("newsletter", "announcement", "promotional", "transactional", "custom"),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["category", "isActive"])
    .index("by_active", ["isActive"]),

  // Email subscriber lists for external contacts
  emailLists: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    subscriberCount: v.number(), // Denormalized for quick access
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // Email subscribers (external contacts not in users table)
  emailSubscribers: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    listId: v.id("emailLists"),
    tags: v.optional(v.array(v.string())),
    isActive: v.boolean(), // For unsubscribes
    subscribedAt: v.number(),
    unsubscribedAt: v.optional(v.number()),
  })
    .index("by_list", ["listId", "isActive"])
    .index("by_email", ["email"])
    .index("by_email_list", ["email", "listId"]),

  // Email send history for tracking
  emailHistory: defineTable({
    scheduledContentId: v.optional(v.id("scheduledContent")),
    templateId: v.optional(v.id("emailTemplates")),
    subject: v.string(),
    recipientCount: v.number(),
    sentCount: v.number(),
    failedCount: v.number(),
    openCount: v.optional(v.number()), // If tracking opens
    clickCount: v.optional(v.number()), // If tracking clicks
    status: literals("sending", "completed", "partial", "failed"),
    resendBatchId: v.optional(v.string()), // Resend batch ID
    sentBy: v.id("users"),
    sentAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_sent", ["sentAt"])
    .index("by_content", ["scheduledContentId"]),

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  // Audit log for tracking critical data changes
  auditLog: defineTable({
    table: v.string(), // Name of the table that was modified
    operation: v.union(v.literal("insert"), v.literal("patch"), v.literal("delete")),
    documentId: v.string(), // ID of the document that was modified
    userId: v.optional(v.id("users")), // User who made the change (if available)
    timestamp: v.number(), // When the change occurred
    changedFields: v.optional(v.array(v.string())), // For patch operations, which fields changed
    oldValue: v.optional(v.any()), // Previous value (for patch/delete operations)
    newValue: v.optional(v.any()), // New value (for insert/patch operations)
  })
    .index("by_table", ["table", "timestamp"])
    .index("by_document", ["table", "documentId", "timestamp"])
    .index("by_user", ["userId", "timestamp"])
    .index("by_operation", ["operation", "timestamp"])
    .index("by_timestamp", ["timestamp"]),
});
