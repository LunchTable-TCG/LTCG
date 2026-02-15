import { migrationsTable } from "convex-helpers/server/migrations";
import { rateLimitTables } from "convex-helpers/server/rateLimit";
import { literals } from "convex-helpers/validators";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { Infer } from "convex/values";

import { GAME_CONFIG } from "@ltcg/core";
import { livekitTables } from "./livekit/schema";

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

// ============================================================================
// GAME COMPONENT VALIDATORS
// ============================================================================

const eventTypeValidator = v.union(
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
  v.literal("replay_triggered"),
  v.literal("replay_target_selected"),
  v.literal("replay_cancelled"),
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
  v.literal("hand_limit_enforced"),
  // Agent Visibility Events (3)
  v.literal("agent_thinking"),
  v.literal("agent_decided"),
  v.literal("agent_error")
);

// Monster zone card object validator (shared between host and opponent boards)
const monsterZoneCardValidator = v.object({
  cardId: v.string(), // cross-component: cardDefinitions
  position: v.number(), // 1 = Attack, -1 = Defense
  attack: v.number(),
  defense: v.number(),
  hasAttacked: v.boolean(),
  isFaceDown: v.boolean(), // For set monsters
  // Vice tracking
  viceCounters: v.optional(v.number()),
  viceType: v.optional(v.string()),
  // Protection flags
  cannotBeDestroyedByBattle: v.optional(v.boolean()),
  cannotBeDestroyedByEffects: v.optional(v.boolean()),
  cannotBeTargeted: v.optional(v.boolean()),
  // Position change tracking
  hasChangedPosition: v.optional(v.boolean()), // Reset each turn
  turnSummoned: v.optional(v.number()), // Turn number when summoned
  // Equip spell tracking
  equippedCards: v.optional(v.array(v.string())), // cross-component: cardDefinitions
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
});

// Spell/Trap zone card object validator
const spellTrapZoneCardValidator = v.object({
  cardId: v.string(), // cross-component: cardDefinitions
  isFaceDown: v.boolean(),
  isActivated: v.boolean(), // Continuous spells/traps remain on field
  turnSet: v.optional(v.number()), // Track when card was set (for trap activation rules)
  equippedTo: v.optional(v.string()), // cross-component: cardDefinitions
});

// Field spell validator
const fieldSpellValidator = v.object({
  cardId: v.string(), // cross-component: cardDefinitions
  isActive: v.boolean(),
});

export default defineSchema(
{
  // External component tables
  migrations: migrationsTable,
  ...rateLimitTables,
  ...livekitTables,

  // ============================================================================
  // GAME COMPONENT TABLES
  // ============================================================================

  // Game lobbies for matchmaking and game sessions
  gameLobbies: defineTable({
    hostId: v.string(), // cross-component: users
    hostUsername: v.string(),
    hostRank: v.string(),
    hostRating: v.number(),
    deckArchetype: v.string(), // "dropout", "prep", "geek", "freak", "nerd", "goodie_two_shoes"
    mode: v.string(), // "casual" | "ranked"
    status: v.string(), // "waiting" | "active" | "completed" | "cancelled" | "forfeited"
    isPrivate: v.boolean(), // true for private matches
    joinCode: v.optional(v.string()), // 6-char code for private matches
    maxRatingDiff: v.optional(v.number()), // rating window for ranked (e.g., 200)
    opponentId: v.optional(v.string()), // cross-component: users
    opponentUsername: v.optional(v.string()),
    opponentRank: v.optional(v.string()),
    gameId: v.optional(v.string()),
    turnNumber: v.optional(v.number()),
    currentTurnPlayerId: v.optional(v.string()), // cross-component: users
    turnStartedAt: v.optional(v.number()), // When current turn started
    lastMoveAt: v.optional(v.number()), // Last time a move was made
    winnerId: v.optional(v.string()), // cross-component: users
    createdAt: v.number(),
    startedAt: v.optional(v.number()),

    // Story mode fields
    stageId: v.optional(v.string()), // cross-component: storyStages

    // Spectator system
    spectatorCount: v.optional(v.number()), // default: 0
    allowSpectators: v.optional(v.boolean()), // default: true
    maxSpectators: v.optional(v.number()), // default: 100

    // Wager system (gold bet on challenge matches)
    wagerAmount: v.optional(v.number()), // Amount each player wagers (0 = no wager)
    wagerPaid: v.optional(v.boolean()), // Whether wager payout has been processed

    // Crypto wager system (SOL/USDC)
    cryptoWagerCurrency: v.optional(v.union(v.literal("sol"), v.literal("usdc"))),
    cryptoWagerTier: v.optional(v.number()), // Human-readable amount (e.g., 0.05 SOL or 10 USDC)
    cryptoEscrowPda: v.optional(v.string()), // Onchain MatchEscrow PDA address
    cryptoHostWallet: v.optional(v.string()), // Host's Solana wallet pubkey
    cryptoOpponentWallet: v.optional(v.string()), // Opponent's Solana wallet pubkey
    cryptoHostDeposited: v.optional(v.boolean()), // Host has deposited to escrow
    cryptoOpponentDeposited: v.optional(v.boolean()), // Opponent has deposited to escrow
    cryptoSettled: v.optional(v.boolean()), // Escrow settlement completed
    cryptoSettleTxSig: v.optional(v.string()), // Settlement transaction signature
    cryptoSettlementWinnerId: v.optional(v.string()), // cross-component: users
    cryptoSettlementLoserId: v.optional(v.string()), // cross-component: users
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
    lobbyId: v.id("gameLobbies"), // intra-component
    gameId: v.string(),
    turnNumber: v.number(),
    eventType: eventTypeValidator,
    playerId: v.string(), // cross-component: users
    playerUsername: v.string(),
    description: v.string(), // Human-readable event description
    /**
     * v.any() USAGE: Game event metadata
     *
     * REASON: Different event types have different metadata structures
     * SECURITY: Read-only field, not user-modifiable
     */
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  })
    .index("by_lobby", ["lobbyId", "timestamp"])
    .index("by_game", ["gameId", "timestamp"])
    .index("by_timestamp", ["timestamp"]),

  // Detailed game state for reconnection and gameplay
  gameStates: defineTable({
    lobbyId: v.id("gameLobbies"), // intra-component
    gameId: v.string(),

    // Player identifiers
    hostId: v.string(), // cross-component: users
    opponentId: v.string(), // cross-component: users

    // Game state
    hostHand: v.array(v.string()), // cross-component: cardDefinitions
    opponentHand: v.array(v.string()), // cross-component: cardDefinitions

    // Monster zones (5 slots)
    hostBoard: v.array(monsterZoneCardValidator),
    opponentBoard: v.array(monsterZoneCardValidator),

    // Spell/Trap zones (5 slots each)
    hostSpellTrapZone: v.array(spellTrapZoneCardValidator),
    opponentSpellTrapZone: v.array(spellTrapZoneCardValidator),

    // Field Spell zones (1 slot each, face-up only)
    hostFieldSpell: v.optional(fieldSpellValidator),
    opponentFieldSpell: v.optional(fieldSpellValidator),

    hostDeck: v.array(v.string()), // cross-component: cardDefinitions
    opponentDeck: v.array(v.string()), // cross-component: cardDefinitions
    hostGraveyard: v.array(v.string()), // cross-component: cardDefinitions
    opponentGraveyard: v.array(v.string()), // cross-component: cardDefinitions
    hostBanished: v.array(v.string()), // cross-component: cardDefinitions
    opponentBanished: v.array(v.string()), // cross-component: cardDefinitions

    // Game resources
    hostLifePoints: v.number(),
    opponentLifePoints: v.number(),
    hostClout: v.number(),
    opponentClout: v.number(),
    // Breakdown tracking (3 breakdowns = alt win condition)
    hostBreakdownsCaused: v.number(),
    opponentBreakdownsCaused: v.number(),

    // Turn tracking
    currentTurnPlayerId: v.string(), // cross-component: users
    turnNumber: v.number(),

    // Phase Management (LunchTable turn structure)
    currentPhase: v.optional(literals("draw", "main", "combat", "breakdown_check", "end")),

    // Turn Flags
    hostNormalSummonedThisTurn: v.optional(v.boolean()),
    opponentNormalSummonedThisTurn: v.optional(v.boolean()),

    // Chain State
    currentChain: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          playerId: v.string(), // cross-component: users
          spellSpeed: v.number(), // 1, 2, or 3
          effect: v.any(), // JSON ability format (complex nested validator)
          targets: v.optional(v.array(v.string())), // cross-component: cardDefinitions
          negated: v.optional(v.boolean()), // True if effect was negated
        })
      )
    ),

    // Priority System
    currentPriorityPlayer: v.optional(v.string()), // cross-component: users

    // Pending Action (waiting for response window to resolve)
    pendingAction: v.optional(
      v.object({
        type: literals("attack", "summon"),
        attackerId: v.optional(v.string()), // cross-component: cardDefinitions
        targetId: v.optional(v.string()), // cross-component: cardDefinitions (undefined = direct attack)
        summonedCardId: v.optional(v.string()), // cross-component: cardDefinitions
        // For battle replay detection
        originalMonsterCount: v.optional(v.number()), // Opponent's monster count at attack declaration
      })
    ),

    // Battle Replay State (Yu-Gi-Oh replay mechanic)
    pendingReplay: v.optional(
      v.object({
        attackerId: v.string(), // cross-component: cardDefinitions
        attackerOwnerId: v.string(), // cross-component: users
        originalTargetId: v.optional(v.string()), // cross-component: cardDefinitions
        originalMonsterCount: v.number(), // Opponent's monster count at attack declaration
        currentMonsterCount: v.number(), // Opponent's monster count now (changed)
        triggeredAt: v.number(), // Timestamp when replay was triggered
        availableTargets: v.array(v.string()), // cross-component: cardDefinitions
        canAttackDirectly: v.boolean(), // True if opponent's field is now empty
      })
    ),

    // Temporary Modifiers (cleared at end of turn)
    temporaryModifiers: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          atkBonus: v.number(),
          defBonus: v.number(),
          expiresAtTurn: v.number(), // Turn number when this expires
          expiresAtPhase: v.optional(v.string()), // Phase when this expires
        })
      )
    ),

    // Lingering Effects - effects that last for a duration
    lingeringEffects: v.optional(
      v.array(
        v.object({
          effectType: v.string(), // Type of lingering effect
          value: v.any(), // Effect value
          sourceCardId: v.optional(v.string()), // cross-component: cardDefinitions
          sourceCardName: v.optional(v.string()), // Name of source card for display
          appliedBy: v.string(), // cross-component: users
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
    optUsedThisTurn: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          effectIndex: v.number(), // Which effect on the card (0-indexed)
          playerId: v.string(), // cross-component: users
          turnUsed: v.number(), // Turn number when used
        })
      )
    ),

    // Hard Once Per Turn (HOPT) Tracking
    hoptUsedEffects: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          effectIndex: v.number(), // Which effect on the card (0-indexed)
          playerId: v.string(), // cross-component: users
          turnUsed: v.number(), // Turn number when used
          resetOnTurn: v.number(), // Turn number when this should reset
        })
      )
    ),

    // Optional Trigger Tracking
    pendingOptionalTriggers: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          cardName: v.string(),
          effectIndex: v.number(),
          trigger: v.string(), // TriggerCondition as string
          playerId: v.string(), // cross-component: users
          addedAt: v.number(),
        })
      )
    ),
    skippedOptionalTriggers: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          trigger: v.string(), // TriggerCondition as string
          turnSkipped: v.number(),
        })
      )
    ),

    // SEGOC Queue for simultaneous trigger ordering (Yu-Gi-Oh style)
    segocQueue: v.optional(
      v.array(
        v.object({
          cardId: v.string(), // cross-component: cardDefinitions
          cardName: v.string(),
          playerId: v.string(), // cross-component: users
          trigger: v.string(), // TriggerCondition as string
          effectIndex: v.number(),
          isOptional: v.boolean(),
          isTurnPlayer: v.boolean(),
          addedAt: v.number(),
          segocOrder: v.number(), // 1=turn mandatory, 2=opp mandatory, 3=turn optional, 4=opp optional
        })
      )
    ),

    // Tracks the last resolved effect type for miss-timing logic
    lastResolvedEventType: v.optional(v.string()),

    // AI & Story Mode (for single-player battles)
    gameMode: v.optional(literals("pvp", "story")), // Default: "pvp"
    isAIOpponent: v.optional(v.boolean()), // True if opponent is AI
    aiDifficulty: v.optional(literals("easy", "normal", "medium", "hard", "boss")),

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
        triggerPlayerId: v.string(), // cross-component: users
        activePlayerId: v.string(), // cross-component: users
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
          playerId: v.string(), // cross-component: users
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
          playerId: v.string(), // cross-component: users
          occurredAt: v.number(), // Timestamp of timeout
          action: v.string(), // Action type that timed out
          timeRemainingMs: v.number(), // Time remaining when timeout was recorded
        })
      )
    ),

    // Disconnect detection for crypto wager matches (heartbeat-based)
    hostLastHeartbeat: v.optional(v.number()), // Timestamp of last heartbeat from host
    opponentLastHeartbeat: v.optional(v.number()), // Timestamp of last heartbeat from opponent
    dcTimerStartedAt: v.optional(v.number()), // When disconnect timer started
    dcPlayerId: v.optional(v.string()), // cross-component: users

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
    userId: v.string(), // cross-component: users
    username: v.string(),
    rating: v.number(),
    deckArchetype: v.string(),
    mode: v.string(), // "ranked" or "casual"
    joinedAt: v.number(),
  })
    .index("by_rating", ["rating"])
    .index("by_user", ["userId"])
    .index("by_mode_rating", ["mode", "rating"])
    .index("by_joinedAt", ["joinedAt"]),

  // ============================================================================
  // CARDS COMPONENT TABLES
  // ============================================================================

  cardDefinitions: defineTable({
    name: v.string(),
    rarity: v.string(),
    archetype: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    level: v.optional(v.number()),
    attribute: v.optional(v.string()),
    spellType: v.optional(v.string()),
    trapType: v.optional(v.string()),
    viceType: v.optional(v.string()),
    breakdownEffect: v.optional(v.any()),
    breakdownFlavorText: v.optional(v.string()),
    ability: v.optional(v.any()),
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
    .index("by_name", ["name"])
    .index("by_active_rarity", ["isActive", "rarity"]),

  playerCards: defineTable({
    userId: v.string(),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    variant: v.optional(cardVariantValidator),
    serialNumber: v.optional(v.number()),
    isFavorite: v.boolean(),
    acquiredAt: v.number(),
    lastUpdatedAt: v.number(),
    source: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_card", ["userId", "cardDefinitionId"])
    .index("by_user_card_variant", ["userId", "cardDefinitionId", "variant"])
    .index("by_user_favorite", ["userId", "isFavorite"])
    .index("by_variant", ["variant"]),

  userDecks: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    deckArchetype: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_updated", ["updatedAt"]),

  deckCards: defineTable({
    deckId: v.id("userDecks"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    position: v.optional(v.number()),
  })
    .index("by_deck", ["deckId"])
    .index("by_deck_card", ["deckId", "cardDefinitionId"]),

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

  numberedCardRegistry: defineTable({
    cardDefinitionId: v.id("cardDefinitions"),
    serialNumber: v.number(),
    maxSerial: v.number(),
    mintedAt: v.number(),
    mintedTo: v.optional(v.string()),
    mintMethod: v.string(),
    currentOwner: v.optional(v.string()),
  })
    .index("by_card", ["cardDefinitionId"])
    .index("by_card_serial", ["cardDefinitionId", "serialNumber"])
    .index("by_owner", ["currentOwner"]),

  // ============================================================================
  // AI COMPONENT TABLES
  // ============================================================================

  agents: defineTable({
    userId: v.string(), // external ref
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
    streamingEnabled: v.optional(v.boolean()),
    // Privy wallet fields
    privyUserId: v.optional(v.string()),
    walletIndex: v.optional(v.number()),
    walletId: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletChainType: v.optional(v.string()),
    walletCreatedAt: v.optional(v.number()),
    walletStatus: v.optional(literals("pending", "created", "failed")),
    walletErrorMessage: v.optional(v.string()),
    // Webhook fields
    callbackUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    webhookEnabled: v.optional(v.boolean()),
    lastWebhookAt: v.optional(v.number()),
    webhookFailCount: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_name", ["name"])
    .index("by_wallet", ["walletAddress"])
    .index("by_privy_user", ["privyUserId"])
    .index("by_callback", ["callbackUrl"]),

  agentDecisions: defineTable({
    agentId: v.id("agents"), // intra-component ref
    gameId: v.string(),
    turnNumber: v.number(),
    phase: v.string(),
    action: v.string(),
    reasoning: v.string(),
    parameters: v.optional(v.any()),
    executionTimeMs: v.optional(v.number()),
    result: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_game", ["gameId"])
    .index("by_agent_game", ["agentId", "gameId"])
    .index("by_created", ["createdAt"]),

  aiChatMessages: defineTable({
    userId: v.string(), // external ref
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("agent")),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_session", ["userId", "sessionId"]),

  aiChatSessions: defineTable({
    userId: v.string(), // external ref
    sessionId: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session", ["sessionId"]),

  aiUsage: defineTable({
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    modelId: v.string(),
    modelType: v.union(v.literal("language"), v.literal("embedding"), v.literal("image")),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    estimatedCost: v.number(),
    feature: v.string(),
    userId: v.optional(v.string()), // external ref
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
    createdAt: v.number(),
  })
    .index("by_provider", ["provider", "createdAt"])
    .index("by_model", ["modelId", "createdAt"])
    .index("by_feature", ["feature", "createdAt"])
    .index("by_created", ["createdAt"])
    .index("by_type", ["modelType", "createdAt"]),

  // Webhooks subscription for game events
  webhooks: defineTable({
    agentId: v.id("agents"), // intra-component ref
    url: v.string(),
    secret: v.optional(v.string()),
    events: v.array(v.string()),
    isActive: v.boolean(),
    lastTriggered: v.optional(v.number()),
    failureCount: v.number(),
  })
    .index("by_agent", ["agentId"])
    .index("by_active", ["isActive"]),

  aiUsageDailyStats: defineTable({
    date: v.string(),
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    totalCost: v.number(),
    avgLatencyMs: v.number(),
    languageRequests: v.number(),
    embeddingRequests: v.number(),
    imageRequests: v.number(),
    topModels: v.array(
      v.object({
        modelId: v.string(),
        requests: v.number(),
        tokens: v.number(),
        cost: v.number(),
      })
    ),
    updatedAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_provider_date", ["provider", "date"]),

  // ============================================================================
  // SOCIAL COMPONENT TABLES
  // ============================================================================

  friendships: defineTable({
    userId: v.string(),
    friendId: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("blocked")),
    requestedBy: v.string(),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    lastInteraction: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_friend_status", ["friendId", "status"])
    .index("by_user_friend", ["userId", "friendId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_user_created", ["userId", "createdAt"]),

  dmConversations: defineTable({
    participant1Id: v.string(),
    participant2Id: v.string(),
    createdAt: v.number(),
    lastMessageAt: v.number(),
    messageCount: v.number(),
    participant1LastRead: v.optional(v.number()),
    participant2LastRead: v.optional(v.number()),
    participant1Archived: v.optional(v.boolean()),
    participant2Archived: v.optional(v.boolean()),
  })
    .index("by_participants", ["participant1Id", "participant2Id"])
    .index("by_participant1", ["participant1Id", "lastMessageAt"])
    .index("by_participant2", ["participant2Id", "lastMessageAt"])
    .index("by_last_message", ["lastMessageAt"]),

  directMessages: defineTable({
    conversationId: v.id("dmConversations"),
    senderId: v.string(),
    senderUsername: v.string(),
    message: v.string(),
    createdAt: v.number(),
    isSystem: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_sender", ["senderId"])
    .index("by_created", ["createdAt"]),

  playerNotifications: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("achievement_unlocked"),
      v.literal("level_up"),
      v.literal("quest_completed"),
      v.literal("badge_earned")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_created", ["createdAt"]),

  // Global chat messages
  globalChatMessages: defineTable({
    userId: v.string(),
    username: v.string(),
    message: v.string(),
    createdAt: v.number(),
    isSystem: v.boolean(),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),

  // User presence tracking
  userPresence: defineTable({
    userId: v.string(),
    username: v.string(),
    lastActiveAt: v.number(),
    lastSeen: v.optional(v.number()),
    status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
  })
    .index("by_user", ["userId"])
    .index("by_last_active", ["lastActiveAt"]),

  // User inbox for notifications, rewards, challenges, etc.
  userInbox: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("reward"),
      v.literal("announcement"),
      v.literal("challenge"),
      v.literal("friend_request"),
      v.literal("guild_invite"),
      v.literal("guild_request"),
      v.literal("system"),
      v.literal("achievement")
    ),
    title: v.string(),
    message: v.string(),
    data: v.optional(v.any()),
    senderId: v.optional(v.string()),
    senderUsername: v.optional(v.string()),
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_type", ["userId", "type"])
    .index("by_user_deleted", ["userId", "deletedAt"])
    .index("by_created", ["createdAt"])
    .index("by_expires", ["expiresAt"]),

  // ============================================================================
  // COMPETITIVE COMPONENT TABLES
  // ============================================================================

  // Leaderboard entries (generic board system)
  leaderboardEntries: defineTable({
    boardId: v.string(),
    playerId: v.string(),
    playerName: v.optional(v.string()),
    score: v.number(),
    rank: v.optional(v.number()),
    wins: v.optional(v.number()),
    losses: v.optional(v.number()),
    streak: v.optional(v.number()),
    rating: v.optional(v.number()),
    lastUpdated: v.number(),
  })
    .index("by_board", ["boardId"])
    .index("by_board_score", ["boardId", "score"])
    .index("by_player", ["playerId"])
    .index("by_board_player", ["boardId", "playerId"]),

  leaderboardSnapshots: defineTable({
    leaderboardType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    playerSegment: v.union(v.literal("all"), v.literal("humans"), v.literal("ai")),
    rankings: v.array(
      v.object({
        userId: v.string(),
        username: v.string(),
        rank: v.number(),
        rating: v.number(),
        level: v.optional(v.number()),
        wins: v.number(),
        losses: v.number(),
        winRate: v.number(),
        isAiAgent: v.boolean(),
      })
    ),
    lastUpdated: v.number(),
  }).index("by_leaderboard", ["leaderboardType", "playerSegment"]),

  matchHistory: defineTable({
    winnerId: v.string(),
    loserId: v.string(),
    gameType: v.union(v.literal("ranked"), v.literal("casual"), v.literal("story")),
    winnerRatingBefore: v.number(),
    winnerRatingAfter: v.number(),
    loserRatingBefore: v.number(),
    loserRatingAfter: v.number(),
    xpAwarded: v.optional(v.number()),
    completedAt: v.number(),
  })
    .index("by_winner", ["winnerId"])
    .index("by_loser", ["loserId"])
    .index("by_completed", ["completedAt"])
    .index("by_game_type", ["gameType", "completedAt"]),

  // Tournament definitions
  tournaments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    format: v.literal("single_elimination"),
    maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
    entryFee: v.number(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    prizePool: v.object({
      first: v.number(),
      second: v.number(),
      thirdFourth: v.number(),
    }),
    status: v.union(
      v.literal("registration"),
      v.literal("checkin"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    registrationStartsAt: v.number(),
    registrationEndsAt: v.number(),
    checkInStartsAt: v.number(),
    checkInEndsAt: v.number(),
    scheduledStartAt: v.number(),
    actualStartedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    currentRound: v.number(),
    totalRounds: v.optional(v.number()),
    registeredCount: v.number(),
    checkedInCount: v.number(),
    winnerId: v.optional(v.string()),
    winnerUsername: v.optional(v.string()),
    secondPlaceId: v.optional(v.string()),
    secondPlaceUsername: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    creatorType: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
    joinCode: v.optional(v.string()),
    autoStartOnFull: v.optional(v.boolean()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_scheduled_start", ["scheduledStartAt"])
    .index("by_registration_start", ["registrationStartsAt"])
    .index("by_created", ["createdAt"])
    .index("by_join_code", ["joinCode"])
    .index("by_visibility_status", ["visibility", "status"])
    .index("by_creator", ["createdBy", "status"]),

  tournamentParticipants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.string(),
    username: v.string(),
    registeredAt: v.number(),
    seedRating: v.number(),
    status: v.union(
      v.literal("registered"),
      v.literal("checked_in"),
      v.literal("active"),
      v.literal("eliminated"),
      v.literal("winner"),
      v.literal("forfeit"),
      v.literal("refunded")
    ),
    checkedInAt: v.optional(v.number()),
    currentRound: v.optional(v.number()),
    bracket: v.optional(v.number()),
    eliminatedInRound: v.optional(v.number()),
    finalPlacement: v.optional(v.number()),
    prizeAwarded: v.optional(v.number()),
    prizeAwardedAt: v.optional(v.number()),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_user", ["tournamentId", "userId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_tournament_bracket", ["tournamentId", "bracket"]),

  tournamentMatches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchNumber: v.number(),
    bracketPosition: v.number(),
    player1Id: v.optional(v.string()),
    player1Username: v.optional(v.string()),
    player1ParticipantId: v.optional(v.id("tournamentParticipants")),
    player2Id: v.optional(v.string()),
    player2Username: v.optional(v.string()),
    player2ParticipantId: v.optional(v.id("tournamentParticipants")),
    player1SourceMatchId: v.optional(v.id("tournamentMatches")),
    player2SourceMatchId: v.optional(v.id("tournamentMatches")),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("forfeit")
    ),
    lobbyId: v.optional(v.string()),
    gameId: v.optional(v.string()),
    winnerId: v.optional(v.string()),
    winnerUsername: v.optional(v.string()),
    loserId: v.optional(v.string()),
    loserUsername: v.optional(v.string()),
    winReason: v.optional(
      v.union(
        v.literal("game_win"),
        v.literal("opponent_forfeit"),
        v.literal("opponent_no_show"),
        v.literal("bye")
      )
    ),
    scheduledAt: v.optional(v.number()),
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

  tournamentHistory: defineTable({
    userId: v.string(),
    tournamentId: v.id("tournaments"),
    tournamentName: v.string(),
    maxPlayers: v.number(),
    placement: v.number(),
    prizeWon: v.number(),
    matchesPlayed: v.number(),
    matchesWon: v.number(),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_completed", ["userId", "completedAt"])
    .index("by_tournament", ["tournamentId"]),

  // ============================================================================
  // ECONOMY COMPONENT TABLES
  // ============================================================================

  treasuryWallets: defineTable({
    address: v.string(),
    purpose: v.string(), // "fee_collection", "staking_rewards", etc.
    status: v.string(), // "active", "deprecated"
    label: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_purpose", ["purpose"])
    .index("by_address", ["address"])
    .index("by_status", ["status"]),

  playerCurrency: defineTable({
    userId: v.string(), // cross-component: users
    currencyType: v.string(), // "gold", "gems", "credits"
    amount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_currency", ["userId", "currencyType"]),

  currencyTransactions: defineTable({
    userId: v.string(),
    currencyType: v.string(),
    amount: v.number(), // positive for earnings, negative for spending
    source: v.string(), // "match_reward", "shop_purchase", "daily_login", "quest_reward"
    referenceId: v.optional(v.string()), // ID of match, purchase, etc.
    balanceAfter: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_currency", ["userId", "currencyType"])
    .index("by_created", ["createdAt"]),

  shopProducts: defineTable({
    productId: v.string(),
    name: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    type: v.string(), // "pack", "cosmetic", "currency_bundle"
    category: v.string(),
    price: v.object({
      currency: v.string(),
      amount: v.number(),
    }),
    contents: v.any(), // JSON describing what's in the product
    isActive: v.boolean(),
    isFeatured: v.optional(v.boolean()),
    stock: v.optional(v.number()), // -1 or null for infinite
    limitPerUser: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"])
    .index("by_featured", ["isFeatured"]),

  packOpeningHistory: defineTable({
    userId: v.string(),
    packId: v.string(), // Product ID
    cardsAwarded: v.array(v.string()), // Array of cardDefinitionIds
    rarityDistribution: v.object({
      common: v.number(),
      rare: v.number(),
      epic: v.number(),
      legendary: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_pack", ["packId"])
    .index("by_created", ["createdAt"]),

  packOpeningPityState: defineTable({
    userId: v.string(),
    packType: v.string(),
    packsSinceLastRare: v.number(),
    packsSinceLastEpic: v.number(),
    packsSinceLastLegendary: v.number(),
    lastUpdated: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_pack", ["userId", "packType"]),

  shopSales: defineTable({
    userId: v.string(),
    productId: v.id("shopProducts"), // intra-component
    pricePaid: v.object({
      currency: v.string(),
      amount: v.number(),
    }),
    status: v.string(), // "completed", "refunded", "failed"
    transactionId: v.optional(v.string()), // External payment ID if applicable
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_product", ["productId"])
    .index("by_created", ["createdAt"]),

  saleUsage: defineTable({
    userId: v.string(),
    productId: v.id("shopProducts"), // intra-component
    count: v.number(),
    lastPurchasedAt: v.number(),
  }).index("by_user_product", ["userId", "productId"]),

  dailyRewards: defineTable({
    userId: v.string(),
    lastClaimedAt: v.number(),
    streakDays: v.number(),
    totalClaimed: v.number(),
  }).index("by_user", ["userId"]),

  promoCodes: defineTable({
    code: v.string(),
    type: v.string(),
    rewards: v.any(),
    maxUses: v.optional(v.number()),
    usedCount: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  promoRedemptions: defineTable({
    userId: v.string(),
    codeId: v.id("promoCodes"), // intra-component
    rewards: v.any(),
    redeemedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_code", ["codeId"])
    .index("by_user_code", ["userId", "codeId"]),

  cryptoWagerTransactions: defineTable({
    matchId: v.string(), // Game lobby ID
    hostId: v.string(),
    opponentId: v.string(),
    escrowPda: v.string(),
    amount: v.number(),
    currency: v.string(), // "SOL" or "USDC"
    status: v.string(), // "deposited", "settled", "refunded"
    txSignature: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_match", ["matchId"]),

  // ============================================================================
  // PROGRESSION COMPONENT TABLES
  // ============================================================================

  achievementDefinitions: defineTable({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    category: v.string(),
    iconUrl: v.optional(v.string()),
    isHidden: v.boolean(),
    requirements: v.any(), // Logic for checking completion
    rewards: v.any(), // XP, currency, items, cosmetics
    points: v.number(), // Achievement score
    order: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  userAchievements: defineTable({
    userId: v.string(),
    achievementId: v.id("achievementDefinitions"), // intra-component
    unlockedAt: v.number(),
    progress: v.optional(v.number()), // For tracked achievements (e.g. 50/100 wins)
    isClaimed: v.boolean(), // Check if rewards were claimed
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"])
    .index("by_unlocked", ["unlockedAt"]),

  questDefinitions: defineTable({
    slug: v.string(),
    type: v.union(v.literal("daily"), v.literal("weekly"), v.literal("story"), v.literal("event")),
    name: v.string(),
    description: v.string(),
    requirements: v.any(),
    rewards: v.any(),
    expiresAt: v.optional(v.number()), // For event quests
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_slug", ["slug"]),

  userQuests: defineTable({
    userId: v.string(),
    questId: v.id("questDefinitions"), // intra-component
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("failed")),
    progress: v.any(), // Detailed progress tracking
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_quest", ["userId", "questId"]),

  battlePassSeasons: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    isActive: v.boolean(),
    premiumPrice: v.object({
      currency: v.string(),
      amount: v.number(),
    }),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["isActive"])
    .index("by_date_range", ["startsAt", "endsAt"]),

  battlePassTiers: defineTable({
    seasonId: v.id("battlePassSeasons"), // intra-component
    level: v.number(),
    xpRequired: v.number(),
    freeRewards: v.any(),
    premiumRewards: v.any(),
  })
    .index("by_season", ["seasonId"])
    .index("by_season_level", ["seasonId", "level"]),

  battlePassProgress: defineTable({
    userId: v.string(),
    seasonId: v.id("battlePassSeasons"), // intra-component
    isPremium: v.boolean(),
    level: v.number(),
    totalXp: v.number(),
    claimedFreeRewards: v.array(v.number()), // Array of claimed levels
    claimedPremiumRewards: v.array(v.number()),
    lastUpdatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_season", ["seasonId"])
    .index("by_user_season", ["userId", "seasonId"]),

  playerXP: defineTable({
    userId: v.string(),
    currentLevel: v.number(),
    currentXp: v.number(),
    totalXpEarned: v.number(),
    lastLevelUpAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_level", ["currentLevel"])
    .index("by_total_xp", ["totalXpEarned"]),

  playerBadges: defineTable({
    userId: v.string(),
    badgeSlug: v.string(),
    awardedAt: v.number(),
    isEquipped: v.boolean(),
    metadata: v.optional(v.any()), // e.g., "Rank 1", "Top 100"
  })
    .index("by_user", ["userId"])
    .index("by_user_equipped", ["userId", "isEquipped"]),

  // ============================================================================
  // TOKEN COMPONENT TABLES
  // ============================================================================

  tokenBalanceCache: defineTable({
    userId: v.string(),
    walletAddress: v.string(),
    balance: v.number(), // $LTCG balance
    stakedBalance: v.optional(v.number()), // Staked amount
    lastUpdated: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_wallet", ["walletAddress"]),

  tokenTransactions: defineTable({
    txHash: v.string(),
    sender: v.string(),
    recipient: v.string(),
    amount: v.number(),
    type: v.string(), // "transfer", "purchase", "reward", "stake", "unstake", "game_reward"
    status: v.string(), // "pending", "confirmed", "failed"
    timestamp: v.number(),
    userId: v.optional(v.string()), // Related user if known
    metadata: v.optional(v.any()),
  })
    .index("by_hash", ["txHash"])
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_timestamp", ["timestamp"]),

  pendingTokenPurchases: defineTable({
    userId: v.string(),
    amount: v.number(),
    costUsdc: v.number(),
    status: v.string(), // "pending", "completed", "failed"
    paymentIntentId: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  tokenConfig: defineTable({
    key: v.string(), // "token_mint", "treasury_wallet", "staking_apy", "reward_pool_address"
    value: v.string(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  tokenMetrics: defineTable({
    circulatingSupply: v.number(),
    totalSupply: v.number(),
    holdersCount: v.number(),
    priceUsd: v.number(),
    marketCap: v.number(),
    volume24h: v.number(),
    updatedAt: v.number(),
  }).index("by_updated", ["updatedAt"]),

  tokenHolders: defineTable({
    walletAddress: v.string(),
    balance: v.number(),
    userId: v.optional(v.string()),
    lastUpdated: v.number(),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_balance", ["balance"])
    .index("by_user", ["userId"]),

  tokenTrades: defineTable({
    dex: v.string(), // "uniswap", "raydium", "jupiter"
    market: v.string(), // "LTCG/USDC"
    price: v.number(),
    amount: v.number(),
    side: v.union(v.literal("buy"), v.literal("sell")),
    maker: v.string(),
    txHash: v.string(),
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_dex", ["dex"]),

  tokenStatsRollup: defineTable({
    period: v.string(), // "daily", "weekly"
    date: v.string(), // "2023-10-27"
    volume: v.number(),
    openPrice: v.number(),
    closePrice: v.number(),
    highPrice: v.number(),
    lowPrice: v.number(),
    txCount: v.number(),
  })
    .index("by_period_date", ["period", "date"])
    .index("by_date", ["date"]),

  // ============================================================================
  // REFERRALS COMPONENT TABLES
  // ============================================================================

  referralCodes: defineTable({
    referralCode: v.string(),
    referrerId: v.string(), // User ID
    referralCount: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["referralCode"])
    .index("by_referrer", ["referrerId"]),

  referralUses: defineTable({
    referralCode: v.string(),
    referrerId: v.string(),
    refereeId: v.string(), // New user
    usedAt: v.number(),
    status: v.string(), // "pending", "completed", "rewarded"
  })
    .index("by_code", ["referralCode"])
    .index("by_referrer", ["referrerId"])
    .index("by_referee", ["refereeId"]),

  referralRewards: defineTable({
    referrerId: v.string(),
    refereeId: v.string(),
    rewardType: v.string(), // "currency", "pack", "cosmetic"
    rewardAmount: v.number(),
    claimedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_referrer", ["referrerId"])
    .index("by_referee", ["refereeId"]),

  // ============================================================================
  // WEBHOOKS COMPONENT TABLES
  // ============================================================================

  webhookEndpoints: defineTable({
    url: v.string(),
    description: v.optional(v.string()),
    eventTypes: v.array(v.string()),
    secret: v.string(), // Encrypted or hashed
    isActive: v.boolean(),
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_active", ["isActive"]),

  webhookEvents: defineTable({
    endpointId: v.id("webhookEndpoints"), // intra-component
    eventType: v.string(),
    payload: v.any(),
    status: v.string(), // "pending", "processing", "delivered", "failed"
    attempts: v.number(),
    nextRetryAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_endpoint", ["endpointId"]),

  webhookDeliveryAttempts: defineTable({
    eventId: v.id("webhookEvents"), // intra-component
    endpointId: v.id("webhookEndpoints"), // intra-component
    statusCode: v.number(),
    responseBody: v.optional(v.string()),
    durationMs: v.number(),
    attemptedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // ============================================================================
  // BRANDING COMPONENT TABLES
  // ============================================================================

  brandingTheme: defineTable({
    name: v.string(),
    colors: v.any(), // JSON object of color tokens
    typography: v.any(),
    logoUrl: v.string(),
    faviconUrl: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["isActive"]),

  brandingAssets: defineTable({
    name: v.string(),
    type: v.string(), // "image", "font", "video"
    url: v.string(),
    storageId: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
  }).index("by_type", ["type"]),

  // ============================================================================
  // ADMIN COMPONENT TABLES
  // ============================================================================

  adminRoles: defineTable({
    name: v.string(),
    slug: v.string(),
    permissions: v.array(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  adminAuditLogs: defineTable({
    adminId: v.string(),
    action: v.string(),
    targetType: v.string(), // "user", "card", "match", etc.
    targetId: v.optional(v.string()),
    details: v.any(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    performedAt: v.number(),
  })
    .index("by_admin", ["adminId"])
    .index("by_action", ["action"])
    .index("by_target", ["targetType", "targetId"])
    .index("by_date", ["performedAt"]),

  featureFlags: defineTable({
    key: v.string(),
    description: v.optional(v.string()),
    isEnabled: v.boolean(),
    rules: v.optional(v.any()), // JSON logic for rollout (e.g. strict rollout)
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_enabled", ["isEnabled"]),

  // Game configuration singleton — runtime-overridable config values
  // Stores a JSON-serialized subset of LTCGConfig
  gameConfig: defineTable({
    key: v.literal("active"),
    config: v.string(), // JSON-serialized partial LTCGConfig
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // ============================================================================
  // CONTENT COMPONENT TABLES
  // ============================================================================

  scheduledContent: defineTable({
    contentType: v.string(), // "news", "event", "maintenance"
    title: v.string(),
    body: v.string(),
    imageUrl: v.optional(v.string()),
    scheduledAt: v.number(),
    status: v.string(), // "draft", "scheduled", "published", "archived"
    targetAudience: v.optional(v.any()), // JSON segments
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_schedule", ["scheduledAt"]),

  newsArticles: defineTable({
    title: v.string(),
    slug: v.string(),
    summary: v.string(),
    content: v.string(), // Markdown or HTML
    author: v.string(),
    imageUrl: v.optional(v.string()),
    tags: v.array(v.string()),
    isPublished: v.boolean(),
    publishedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished", "publishedAt"]),

  feedback: defineTable({
    userId: v.string(),
    type: v.string(), // "bug", "suggestion", "complaint"
    category: v.string(),
    subject: v.string(),
    message: v.string(),
    status: v.string(), // "new", "under_review", "resolved", "closed"
    priority: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"]),

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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
},
{ schemaValidation: false }
);
