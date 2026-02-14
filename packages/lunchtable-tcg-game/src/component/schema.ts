import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals } from "convex-helpers/validators";

// ============================================================================
// SHARED VALIDATORS
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

export default defineSchema({
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
    currentPhase: v.optional(
      literals("draw", "main", "combat", "breakdown_check", "end")
    ),

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
    aiDifficulty: v.optional(
      literals("easy", "normal", "medium", "hard", "boss")
    ),

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
    .index("by_rating_joined", ["rating", "joinedAt"])
    .index("by_joinedAt", ["joinedAt"]),
});
