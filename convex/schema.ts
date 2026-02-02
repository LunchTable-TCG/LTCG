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

    // HD Wallet tracking (non-custodial)
    // User's master wallet is at index 0, agent wallets start at index 1
    // Derivation path (Solana): m/44'/501'/i/0' where i = wallet index
    nextWalletIndex: v.optional(v.number()), // default: 1 (0 is user's main wallet)
  })
    .index("privyId", ["privyId"])
    .index("email", ["email"])
    .index("username", ["username"])
    .index("isBanned", ["isBanned"])
    .index("isSuspended", ["isSuspended"])
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
  })
    .index("by_user", ["userId"])
    .index("by_role", ["role", "isActive"]),

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

    // Spectator system
    spectatorCount: v.optional(v.number()), // default: 0
    allowSpectators: v.optional(v.boolean()), // default: true
    maxSpectators: v.optional(v.number()), // default: 100
  })
    .index("by_status", ["status"])
    .index("by_mode_status", ["mode", "status"])
    .index("by_host", ["hostId"])
    .index("by_created", ["createdAt"])
    .index("by_join_code", ["joinCode"])
    .index("by_last_move", ["lastMoveAt"]),

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
    .index("by_rating_joined", ["rating", "joinedAt"]), // For wait time analytics

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
    ability: v.optional(jsonAbilityValidator), // JSON ability format
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_rarity", ["rarity"])
    .index("by_archetype", ["archetype"])
    .index("by_type", ["cardType"])
    .index("by_name", ["name"]),

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
    storageId: v.string(), // Reference to Convex storage
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    category: v.union(
      v.literal("profile_picture"),
      v.literal("card_image"),
      v.literal("document"),
      v.literal("other")
    ),
    uploadedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_uploaded_at", ["uploadedAt"])
    .index("by_storage_id", ["storageId"]),

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
      v.literal("expired")
    ),
    soldTo: v.optional(v.id("users")),
    soldFor: v.optional(v.number()),
    soldAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
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
    .index("by_user_chapter", ["userId", "actNumber", "chapterNumber"]),

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
    data: v.optional(v.any()), // Flexible data field for type-specific info
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  // Chapter definitions (reference data)
  storyChapters: defineTable({
    actNumber: v.number(),
    chapterNumber: v.number(),
    title: v.string(),
    description: v.string(),
    archetype: v.string(), // Which archetype this chapter focuses on
    archetypeImageUrl: v.string(), // Path to story asset image
    storyText: v.string(), // Narrative cutscene text
    loreText: v.string(), // Lore entry unlocked on completion
    aiOpponentDeckCode: v.string(), // Starter deck code for AI
    aiDifficulty: v.object({
      normal: v.number(), // AI strength 1-10
      hard: v.number(),
      legendary: v.number(),
    }),
    battleCount: v.number(), // 1-3 battles per chapter
    baseRewards: v.object({
      gold: v.number(),
      xp: v.number(),
      guaranteedCards: v.optional(v.array(v.string())), // Specific card IDs
    }),
    unlockRequirements: v.optional(
      v.object({
        previousChapter: v.optional(v.boolean()), // Must complete previous chapter
        minimumLevel: v.optional(v.number()),
      })
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_act_chapter", ["actNumber", "chapterNumber"])
    .index("by_archetype", ["archetype"])
    .index("by_active", ["isActive"]),

  // Stage definitions (10 stages per chapter)
  storyStages: defineTable({
    chapterId: v.id("storyChapters"),
    stageNumber: v.number(), // 1-10
    name: v.string(),
    description: v.string(),
    aiDifficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("boss")
    ),
    rewardGold: v.number(),
    rewardXp: v.number(),
    firstClearBonus: v.number(), // Extra gold for first clear
  })
    .index("by_chapter", ["chapterId"])
    .index("by_chapter_stage", ["chapterId", "stageNumber"]),

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
    .index("by_created", ["createdAt"]),
});
