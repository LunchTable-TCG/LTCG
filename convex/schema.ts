import { rateLimitTables } from "convex-helpers/server/rateLimit";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";
import { jsonAbilityValidator } from "./gameplay/effectSystem/jsonEffectValidators";

// ============================================================================
// SHARED VALIDATORS (Reusable across schema and function args)
// ============================================================================

/** Game mode types for leaderboards and matchmaking */
export const gameModeValidator = v.union(
  v.literal("ranked"),
  v.literal("casual"),
  v.literal("story")
);
export type GameMode = Infer<typeof gameModeValidator>;

/** Player segment filters for leaderboards */
export const playerSegmentValidator = v.union(
  v.literal("all"),
  v.literal("humans"),
  v.literal("ai")
);
export type PlayerSegment = Infer<typeof playerSegmentValidator>;

/** Story mode difficulty levels */
export const difficultyValidator = v.union(
  v.literal("normal"),
  v.literal("hard"),
  v.literal("legendary")
);
export type Difficulty = Infer<typeof difficultyValidator>;

/** Story progress status */
export const progressStatusValidator = v.union(
  v.literal("locked"),
  v.literal("available"),
  v.literal("in_progress"),
  v.literal("completed")
);
export type ProgressStatus = Infer<typeof progressStatusValidator>;

export default defineSchema({
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
    accountStatus: v.optional(
      v.union(v.literal("active"), v.literal("suspended"), v.literal("banned"))
    ), // default: "active"
    mutedUntil: v.optional(v.number()), // Chat mute expiry timestamp

    // HD Wallet tracking (non-custodial)
    // User's master wallet is at index 0, agent wallets start at index 1
    // Derivation path (Solana): m/44'/501'/i/0' where i = wallet index
    nextWalletIndex: v.optional(v.number()), // default: 1 (0 is user's main wallet)

    // Token wallet fields
    walletAddress: v.optional(v.string()),
    walletType: v.optional(v.union(v.literal("privy_embedded"), v.literal("external"))),
    walletConnectedAt: v.optional(v.number()),
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
    role: v.union(v.literal("moderator"), v.literal("admin"), v.literal("superadmin")),
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
    actionType: v.union(
      v.literal("mute"),
      v.literal("unmute"),
      v.literal("warn"),
      v.literal("suspend"),
      v.literal("unsuspend"),
      v.literal("ban"),
      v.literal("unban")
    ),
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
    walletStatus: v.optional(
      v.union(v.literal("pending"), v.literal("created"), v.literal("failed"))
    ), // Wallet creation status
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
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
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
    status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
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
    eventType: v.union(
      // Lifecycle Events (5)
      v.literal("game_start"),
      v.literal("game_end"),
      v.literal("turn_start"),
      v.literal("turn_end"),
      v.literal("phase_changed"),

      // Summon Events (5)
      v.literal("normal_summon"),
      v.literal("tribute_summon"),
      v.literal("flip_summon"),
      v.literal("special_summon"),
      v.literal("summon_negated"),

      // Card Placement Events (3)
      v.literal("monster_set"),
      v.literal("spell_set"),
      v.literal("trap_set"),

      // Activation Events (4)
      v.literal("spell_activated"),
      v.literal("trap_activated"),
      v.literal("effect_activated"),
      v.literal("activation_negated"),

      // Chain Events (3)
      v.literal("chain_link_added"),
      v.literal("chain_resolving"),
      v.literal("chain_resolved"),

      // Combat Events (8)
      v.literal("battle_phase_entered"),
      v.literal("attack_declared"),
      v.literal("damage_calculated"),
      v.literal("damage"),
      v.literal("card_destroyed_battle"),
      v.literal("replay_triggered"), // Battle replay triggered (monster count changed)
      v.literal("replay_target_selected"), // Attacker chose new target during replay
      v.literal("replay_cancelled"), // Attacker cancelled attack during replay

      // Zone Transition Events (6)
      v.literal("card_drawn"),
      v.literal("card_to_hand"),
      v.literal("card_to_graveyard"),
      v.literal("card_banished"),
      v.literal("card_to_deck"),
      v.literal("position_changed"),

      // Resource Events (4)
      v.literal("lp_changed"),
      v.literal("tribute_paid"),
      v.literal("deck_shuffled"),
      v.literal("hand_limit_enforced")
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
      })
    ),

    // Spell/Trap zones (5 slots each)
    hostSpellTrapZone: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        isFaceDown: v.boolean(),
        isActivated: v.boolean(), // Continuous spells/traps remain on field
        turnSet: v.optional(v.number()), // Track when card was set (for trap activation rules)
      })
    ),
    opponentSpellTrapZone: v.array(
      v.object({
        cardId: v.id("cardDefinitions"),
        isFaceDown: v.boolean(),
        isActivated: v.boolean(), // Continuous spells/traps remain on field
        turnSet: v.optional(v.number()), // Track when card was set (for trap activation rules)
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
      v.union(
        v.literal("draw"),
        v.literal("standby"),
        v.literal("main1"),
        v.literal("battle_start"),
        v.literal("battle"),
        v.literal("battle_end"),
        v.literal("main2"),
        v.literal("end")
      )
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
        type: v.union(v.literal("attack"), v.literal("summon")),
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
    gameMode: v.optional(v.union(v.literal("pvp"), v.literal("story"))), // Default: "pvp"
    isAIOpponent: v.optional(v.boolean()), // True if opponent is AI
    aiDifficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("normal"), // Legacy: equivalent to "medium"
        v.literal("medium"),
        v.literal("hard"),
        v.literal("boss")
      )
    ), // AI difficulty level (matches storyStages difficulty)

    // Response Window (for priority/chain system)
    responseWindow: v.optional(
      v.object({
        type: v.union(
          v.literal("summon"),
          v.literal("attack_declaration"),
          v.literal("spell_activation"),
          v.literal("trap_activation"),
          v.literal("effect_activation"),
          v.literal("damage_calculation"),
          v.literal("end_phase"),
          v.literal("open")
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
    rarity: v.union(
      v.literal("common"),
      v.literal("uncommon"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
    archetype: v.union(
      v.literal("infernal_dragons"),
      v.literal("abyssal_horrors"),
      v.literal("nature_spirits"),
      v.literal("storm_elementals"),
      v.literal("shadow_assassins"),
      v.literal("celestial_guardians"),
      v.literal("undead_legion"),
      v.literal("divine_knights"),
      v.literal("arcane_mages"),
      v.literal("mechanical_constructs"),
      v.literal("neutral"),
      // Old archetypes (deprecated - for backward compatibility)
      v.literal("fire"),
      v.literal("water"),
      v.literal("earth"),
      v.literal("wind")
    ),
    cardType: v.union(
      v.literal("creature"),
      v.literal("spell"),
      v.literal("trap"),
      v.literal("equipment")
    ),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),

    // Industry-standard TCG fields
    level: v.optional(v.number()), // Monster level (1-12), determines tribute requirements
    attribute: v.optional(
      v.union(
        v.literal("fire"),
        v.literal("water"),
        v.literal("earth"),
        v.literal("wind"),
        v.literal("light"),
        v.literal("dark"),
        v.literal("divine"),
        v.literal("neutral")
      )
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
      v.union(
        v.literal("normal"),
        v.literal("continuous"),
        v.literal("counter")
      )
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
    cardType: v.union(
      v.literal("creature"),
      v.literal("spell"),
      v.literal("trap"),
      v.literal("equipment"),
      v.literal("universal") // applies to all types
    ),
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
    blockType: v.union(
      // Text blocks
      v.literal("name"),
      v.literal("level"),
      v.literal("attribute"),
      v.literal("attack"),
      v.literal("defense"),
      v.literal("cost"),
      v.literal("cardType"),
      v.literal("monsterType"),
      v.literal("effect"),
      v.literal("flavorText"),
      v.literal("custom"),
      // Image blocks (NEW)
      v.literal("image"),
      v.literal("icon")
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
    fontWeight: v.union(v.literal("normal"), v.literal("bold")),
    fontStyle: v.union(v.literal("normal"), v.literal("italic")),
    textAlign: v.union(v.literal("left"), v.literal("center"), v.literal("right")),
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
    imageFit: v.optional(
      v.union(
        v.literal("fill"),
        v.literal("contain"),
        v.literal("cover"),
        v.literal("none")
      )
    ),
    // Transform properties (NEW)
    opacity: v.optional(v.number()), // 0-1
    rotation: v.optional(v.number()), // degrees
    // Visibility rules - which card types should show this block
    showForCardTypes: v.optional(
      v.array(
        v.union(
          v.literal("creature"),
          v.literal("spell"),
          v.literal("trap"),
          v.literal("equipment")
        )
      )
    ),
    // Z-index for layering
    zIndex: v.number(),
  })
    .index("by_template", ["templateId"])
    .index("by_template_zIndex", ["templateId", "zIndex"]),

  // Player's card inventory - tracks owned cards and quantities
  playerCards: defineTable({
    userId: v.id("users"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    isFavorite: v.boolean(),
    acquiredAt: v.number(),
    lastUpdatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_card", ["userId", "cardDefinitionId"])
    .index("by_user_favorite", ["userId", "isFavorite"]),

  // User-created decks - custom deck builds
  userDecks: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    deckArchetype: v.optional(
      v.union(
        v.literal("fire"),
        v.literal("water"),
        v.literal("earth"),
        v.literal("wind"),
        v.literal("neutral")
      )
    ),
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
    category: v.union(
      // User uploads
      v.literal("profile_picture"),
      v.literal("card_image"),
      v.literal("document"),
      v.literal("other"),
      // Admin-managed assets (Vercel Blob)
      v.literal("background"),
      v.literal("texture"),
      v.literal("ui_element"),
      v.literal("shop_asset"),
      v.literal("story_asset"),
      v.literal("logo")
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
    gameType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),

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
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),

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
    transactionType: v.union(
      v.literal("purchase"),
      v.literal("reward"),
      v.literal("sale"),
      v.literal("gift"),
      v.literal("refund"),
      v.literal("admin_refund"),
      v.literal("conversion"),
      v.literal("marketplace_fee"),
      v.literal("auction_bid"),
      v.literal("auction_refund")
    ),
    currencyType: v.union(v.literal("gold"), v.literal("gems")),
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
    productType: v.union(v.literal("pack"), v.literal("box"), v.literal("currency")),
    goldPrice: v.optional(v.number()),
    gemPrice: v.optional(v.number()),
    packConfig: v.optional(
      v.object({
        cardCount: v.number(),
        guaranteedRarity: v.optional(
          v.union(
            v.literal("common"),
            v.literal("uncommon"),
            v.literal("rare"),
            v.literal("epic"),
            v.literal("legendary")
          )
        ),
        archetype: v.optional(
          v.union(
            // New archetypes
            v.literal("infernal_dragons"),
            v.literal("abyssal_horrors"),
            v.literal("nature_spirits"),
            v.literal("storm_elementals"),
            v.literal("shadow_assassins"),
            v.literal("celestial_guardians"),
            v.literal("undead_legion"),
            v.literal("divine_knights"),
            v.literal("arcane_mages"),
            v.literal("mechanical_constructs"),
            v.literal("neutral"),
            // Old archetypes (temporary for migration)
            v.literal("fire"),
            v.literal("water"),
            v.literal("earth"),
            v.literal("wind")
          )
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
        currencyType: v.union(v.literal("gold"), v.literal("gems")),
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
      })
    ),
    currencyUsed: v.union(v.literal("gold"), v.literal("gems")),
    amountPaid: v.number(),
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
    listingType: v.union(v.literal("fixed"), v.literal("auction")),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    price: v.number(),
    currentBid: v.optional(v.number()),
    highestBidderId: v.optional(v.id("users")),
    highestBidderUsername: v.optional(v.string()),
    endsAt: v.optional(v.number()),
    bidCount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("sold"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("suspended")
    ),
    soldTo: v.optional(v.id("users")),
    soldFor: v.optional(v.number()),
    soldAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Token payment support
    currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))),
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
    bidStatus: v.union(
      v.literal("active"),
      v.literal("outbid"),
      v.literal("won"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
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
    bidStatus: v.union(
      v.literal("active"),
      v.literal("outbid"),
      v.literal("won"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
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
    transactionType: v.union(
      v.literal("marketplace_purchase"),
      v.literal("marketplace_sale"),
      v.literal("platform_fee"),
      v.literal("battle_pass_purchase")
    ),
    amount: v.number(),
    signature: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
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
    purchaseType: v.optional(
      v.union(v.literal("marketplace"), v.literal("battle_pass"))
    ), // Type of purchase
    amount: v.number(),
    buyerWallet: v.string(),
    sellerWallet: v.string(), // Treasury wallet for battle pass purchases
    status: v.union(
      v.literal("awaiting_signature"),
      v.literal("submitted"),
      v.literal("confirmed"),
      v.literal("failed"),
      v.literal("expired")
    ),
    transactionSignature: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_buyer", ["buyerId"])
    .index("by_listing", ["listingId"])
    .index("by_battle_pass", ["battlePassId"])
    .index("by_status", ["status"]),

  // ============================================================================
  // PROMOTIONAL CODES
  // ============================================================================

  // Redeemable promo codes
  promoCodes: defineTable({
    code: v.string(),
    description: v.string(),
    rewardType: v.union(v.literal("gold"), v.literal("gems"), v.literal("pack")),
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
    outcome: v.union(v.literal("won"), v.literal("lost"), v.literal("abandoned")),
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
    badgeType: v.union(
      v.literal("archetype_complete"), // Completed all chapters for an archetype
      v.literal("act_complete"), // Completed entire act
      v.literal("difficulty_complete"), // Completed all chapters on a difficulty
      v.literal("perfect_chapter"), // 3 stars on a chapter
      v.literal("speed_run"), // Special achievements
      v.literal("milestone") // XP/level milestones
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
    type: v.union(
      v.literal("achievement_unlocked"),
      v.literal("level_up"),
      v.literal("quest_completed"),
      v.literal("badge_earned")
    ),
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
    type: v.union(
      v.literal("reward"), // Admin-granted rewards (gold, cards, packs)
      v.literal("announcement"), // System/admin announcements
      v.literal("challenge"), // Game challenge invitations
      v.literal("friend_request"), // Friend request notifications
      v.literal("system"), // System messages (maintenance, updates)
      v.literal("achievement") // Achievement unlocks (synced from playerNotifications)
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
        type: v.union(
          v.literal("chapter_complete"),
          v.literal("player_level"),
          v.literal("none")
        ),
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
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))), // Optional for old data
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
    difficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("boss")
      )
    ), // Optional for old data
    // Legacy field name for difficulty (code uses both)
    aiDifficulty: v.optional(
      v.union(
        v.literal("easy"),
        v.literal("medium"),
        v.literal("hard"),
        v.literal("boss")
      )
    ),

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

    status: v.optional(v.union(v.literal("draft"), v.literal("published"))), // Optional for old data
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
    status: v.union(
      v.literal("locked"),
      v.literal("available"),
      v.literal("completed"),
      v.literal("starred") // 3 stars
    ),
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
    questType: v.union(v.literal("daily"), v.literal("weekly"), v.literal("achievement")),
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
        gameMode: v.optional(v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"))),
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
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("claimed")),
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
    category: v.union(
      v.literal("wins"),
      v.literal("games_played"),
      v.literal("collection"),
      v.literal("social"),
      v.literal("story"),
      v.literal("ranked"),
      v.literal("special")
    ),
    rarity: v.union(
      v.literal("common"),
      v.literal("rare"),
      v.literal("epic"),
      v.literal("legendary")
    ),
    icon: v.string(), // Icon name
    requirementType: v.string(),
    targetValue: v.number(),
    rewards: v.optional(
      v.object({
        gold: v.optional(v.number()),
        xp: v.optional(v.number()),
        gems: v.optional(v.number()),
        badge: v.optional(v.string()),
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
    category: v.union(
      v.literal("update"), // Game updates
      v.literal("event"), // Events and tournaments
      v.literal("patch"), // Patch notes
      v.literal("announcement"), // General announcements
      v.literal("maintenance") // Maintenance notices
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
    premiumPrice: v.number(), // Gems price for premium track
    tokenPrice: v.optional(v.number()), // Token price for premium track (raw units, 6 decimals)
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
      v.literal("json")
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

  // AI Chat Messages - stores conversation history with ElizaOS agent
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
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
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
});
