import { v } from "convex/values";
import * as generatedApi from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { adjustPlayerCurrencyHelper } from "../../economy/economy";
import { internalMutation, mutation } from "../../functions";
import { completedGamesCounter } from "../../infrastructure/shardedCounters";
import { type AuthenticatedUser, getAuthForUser, requireAuthMutation } from "../../lib/convexAuth";
import { shuffleArray } from "../../lib/deterministicRandom";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { recordEventHelper, recordGameEndHelper } from "../gameEvents";
import { updateAgentStatsAfterGame, updatePlayerStatsAfterGame } from "./stats";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

// ============================================================================
// WAGER SYSTEM CONSTANTS
// ============================================================================

const WAGER_WINNER_PERCENTAGE = 0.9; // 90% to winner, 10% to treasury

/**
 * Process wager payout after a game ends
 * Winner receives 90% of the total pot, 10% goes to treasury
 *
 * @param ctx - Mutation context
 * @param lobbyId - The lobby ID
 * @param wagerAmount - Amount each player wagered
 * @param winnerId - The winner's user ID
 * @param loserId - The loser's user ID
 */
async function processWagerPayout(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  wagerAmount: number,
  winnerId: Id<"users">,
  loserId: Id<"users">
): Promise<void> {
  if (wagerAmount <= 0) return;

  const totalPot = wagerAmount * 2; // Both players wagered the same amount
  const winnerPayout = Math.floor(totalPot * WAGER_WINNER_PERCENTAGE);
  const treasuryFee = totalPot - winnerPayout; // Remainder goes to treasury (10%)

  // Pay the winner their share (90%)
  await adjustPlayerCurrencyHelper(ctx, {
    userId: winnerId,
    goldDelta: winnerPayout,
    transactionType: "wager_payout",
    description: `Won ${winnerPayout.toLocaleString()} gold from wager match`,
    metadata: {
      lobbyId,
      totalPot,
      treasuryFee,
      opponentId: loserId,
    },
  });

  // Treasury fee is simply not paid out - it stays in the system
  // The loser's wager was already deducted when they accepted the challenge
  // We could optionally track this in a separate transaction for auditing:
  // await recordTransaction(ctx, "treasury", "wager_fee", "gold", treasuryFee, treasuryFee, "Wager platform fee");

  // Mark wager as paid on the lobby
  await ctx.db.patch(lobbyId, {
    wagerPaid: true,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update user presence status
 */
async function updatePresenceInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  username: string,
  status: "online" | "in_game" | "idle"
): Promise<void> {
  const existing = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      status,
      lastActiveAt: Date.now(),
    });
  } else {
    await ctx.db.insert("userPresence", {
      userId,
      username,
      status,
      lastActiveAt: Date.now(),
    });
  }
}

/**
 * Stop agent streams for players in the game
 * Called when game ends to clean up streaming sessions
 */
async function stopAgentStreamsForGame(
  ctx: MutationCtx,
  lobbyId: Id<"gameLobbies">,
  hostId: Id<"users">,
  opponentId: Id<"users"> | undefined
): Promise<void> {
  // Check both players for active agents
  const playerIds = [hostId, opponentId].filter((id): id is Id<"users"> => id !== undefined);

  for (const playerId of playerIds) {
    // Find agent for this player
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", playerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (agent?.streamingEnabled) {
      // Schedule stop for agent stream (async, non-blocking)
      await ctx.scheduler.runAfter(0, internalAny.agents.streaming.autoStopAgentStream, {
        agentId: agent._id,
        lobbyId,
      });
    }
  }
}

/**
 * Helper function to initialize game state without mutation overhead
 *
 * Used by game lifecycle mutations to set up a new game efficiently.
 * Loads and shuffles both players' decks, deals initial hands (5 cards each),
 * initializes empty boards and graveyards, sets starting LP (8000), and configures
 * turn tracking, phases, and AI settings for story mode.
 *
 * @internal
 * @param ctx - Mutation context
 * @param params - Game initialization parameters
 * @param params.lobbyId - Lobby ID for the game
 * @param params.gameId - Unique game ID (used as deterministic shuffle seed)
 * @param params.hostId - User ID of the host player
 * @param params.opponentId - User ID of the opponent player (or AI)
 * @param params.currentTurnPlayerId - User ID of the player who goes first
 * @param params.gameMode - Game mode ("pvp" or "story", defaults to "pvp")
 * @param params.isAIOpponent - Whether opponent is AI (defaults to false)
 * @param params.aiDifficulty - AI difficulty level for story mode
 * @param params.aiDeck - Pre-built deck for AI opponent in story mode
 * @returns Promise that resolves when game state is initialized
 * @throws {ErrorCode.VALIDATION_INVALID_INPUT} If player or deck is invalid
 */
export async function initializeGameStateHelper(
  ctx: MutationCtx,
  params: {
    lobbyId: Id<"gameLobbies">;
    gameId: string;
    hostId: Id<"users">;
    opponentId: Id<"users">;
    currentTurnPlayerId: Id<"users">;
    gameMode?: "pvp" | "story";
    isAIOpponent?: boolean;
    aiDifficulty?: "easy" | "normal" | "medium" | "hard" | "boss"; // "normal" for backwards compatibility
    aiDeck?: Id<"cardDefinitions">[];
  }
): Promise<void> {
  const {
    lobbyId,
    gameId,
    hostId,
    opponentId,
    currentTurnPlayerId,
    gameMode = "pvp",
    isAIOpponent = false,
    aiDifficulty,
    aiDeck,
  } = params;

  // Get both players and their decks
  const host = await ctx.db.get(hostId);
  const opponent = await ctx.db.get(opponentId);

  if (!host || !opponent) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Player not found",
    });
  }

  // Build host deck
  if (!host.activeDeckId) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Host must have an active deck",
    });
  }

  const hostActiveDeckId = host.activeDeckId;
  const hostDeckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", hostActiveDeckId))
    .collect();

  const hostFullDeck: Id<"cardDefinitions">[] = [];
  for (const deckCard of hostDeckCards) {
    for (let i = 0; i < deckCard.quantity; i++) {
      hostFullDeck.push(deckCard.cardDefinitionId);
    }
  }

  // Build opponent deck - use AI deck if provided (story mode)
  let opponentFullDeck: Id<"cardDefinitions">[];
  if (isAIOpponent && aiDeck) {
    // Story mode: use pre-built AI deck
    opponentFullDeck = aiDeck;
  } else {
    // PvP mode: load from opponent's active deck
    if (!opponent.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Opponent must have an active deck",
      });
    }

    const opponentActiveDeckId = opponent.activeDeckId;
    const opponentDeckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", opponentActiveDeckId))
      .collect();

    opponentFullDeck = [];
    for (const deckCard of opponentDeckCards) {
      for (let i = 0; i < deckCard.quantity; i++) {
        opponentFullDeck.push(deckCard.cardDefinitionId);
      }
    }
  }

  // Validate deck sizes before starting the game
  const MIN_DECK_SIZE = 30;
  const MAX_DECK_SIZE = 60;

  if (hostFullDeck.length < MIN_DECK_SIZE || hostFullDeck.length > MAX_DECK_SIZE) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Host deck must have between ${MIN_DECK_SIZE} and ${MAX_DECK_SIZE} cards (has ${hostFullDeck.length})`,
    });
  }

  if (opponentFullDeck.length < MIN_DECK_SIZE || opponentFullDeck.length > MAX_DECK_SIZE) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Opponent deck must have between ${MIN_DECK_SIZE} and ${MAX_DECK_SIZE} cards (has ${opponentFullDeck.length})`,
    });
  }

  // Shuffle decks using deterministic randomness
  // Use gameId as seed to ensure consistent shuffles on retry
  const shuffledHostDeck = shuffleArray(hostFullDeck, `${gameId}-host-deck`);
  const shuffledOpponentDeck = shuffleArray(opponentFullDeck, `${gameId}-opponent-deck`);

  // Draw initial hands (5 cards each)
  const INITIAL_HAND_SIZE = 5;
  const hostHand = shuffledHostDeck.slice(0, INITIAL_HAND_SIZE);
  const opponentHand = shuffledOpponentDeck.slice(0, INITIAL_HAND_SIZE);
  const hostDeck = shuffledHostDeck.slice(INITIAL_HAND_SIZE);
  const opponentDeck = shuffledOpponentDeck.slice(INITIAL_HAND_SIZE);

  // Create initial game state
  const now = Date.now();
  await ctx.db.insert("gameStates", {
    lobbyId,
    gameId,
    hostId,
    opponentId,

    // Initial hands
    hostHand,
    opponentHand,

    // Empty monster boards
    hostBoard: [],
    opponentBoard: [],

    // Empty spell/trap zones
    hostSpellTrapZone: [],
    opponentSpellTrapZone: [],

    // Empty field spell zones
    hostFieldSpell: undefined,
    opponentFieldSpell: undefined,

    // Remaining decks
    hostDeck,
    opponentDeck,

    // Empty graveyards
    hostGraveyard: [],
    opponentGraveyard: [],

    // Empty banished zones
    hostBanished: [],
    opponentBanished: [],

    // Initial resources (Yu-Gi-Oh: 8000 LP, no mana system)
    hostLifePoints: 8000,
    opponentLifePoints: 8000,
    hostMana: 0,
    opponentMana: 0,

    // Turn tracking
    currentTurnPlayerId,
    turnNumber: 1,

    // Phase Management (start in Main Phase 1, since starting hand is already dealt)
    currentPhase: "main1",

    // Turn Flags (no normal summons yet)
    hostNormalSummonedThisTurn: false,
    opponentNormalSummonedThisTurn: false,

    // Chain State (empty chain)
    currentChain: [],

    // Priority System (turn player has priority)
    currentPriorityPlayer: currentTurnPlayerId,

    // Temporary Modifiers (none at start)
    temporaryModifiers: [],

    // OPT Tracking (none at start)
    optUsedThisTurn: [],

    // AI & Story Mode
    gameMode,
    isAIOpponent,
    aiDifficulty,

    // Timestamps
    lastMoveAt: now,
    createdAt: now,
  });
}

// ============================================================================
// GAME LIFECYCLE MUTATIONS
// ============================================================================

/**
 * Initialize game state for a new game (internal mutation)
 *
 * Creates the gameStates document with:
 * - Loaded and shuffled decks from both players
 * - Initial 5-card hands
 * - Empty boards and graveyards
 * - Starting LP and mana
 * - Phase/chain/flag initialization
 */
export const initializeGameState = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    gameId: v.string(),
    hostId: v.id("users"),
    opponentId: v.id("users"),
    currentTurnPlayerId: v.id("users"),
  },
  handler: async (ctx, params) => {
    await initializeGameStateHelper(ctx, params);
  },
});

/**
 * Surrender/forfeit the current game (user-initiated)
 */
async function surrenderGameHandler(
  ctx: MutationCtx,
  args: { lobbyId: Id<"gameLobbies"> },
  user: AuthenticatedUser
) {
  const userId = user.userId;

  // Get lobby
  const lobby = await ctx.db.get(args.lobbyId);
  if (!lobby) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Game not found",
    });
  }

  // Verify game is active
  if (lobby.status !== "active") {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Game is not active",
    });
  }

  // Verify user is in this game
  if (lobby.hostId !== userId && lobby.opponentId !== userId) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "You are not in this game",
    });
  }

  // Determine winner (the player who didn't surrender)
  const winnerId = userId === lobby.hostId ? lobby.opponentId : lobby.hostId;

  if (!winnerId) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Cannot determine winner",
    });
  }

  // Update lobby
  await ctx.db.patch(args.lobbyId, {
    status: "forfeited",
    winnerId,
  });

  // Update both players' presence to online
  await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");

  if (lobby.opponentId && lobby.opponentUsername && lobby.mode !== "story") {
    await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
  }

  // Update player stats and ratings (surrender counts as a loss)
  if (lobby.opponentId) {
    const gameMode = lobby.mode as "ranked" | "casual" | "story";
    await updatePlayerStatsAfterGame(ctx, winnerId, userId, gameMode);

    // Process wager payout if applicable (surrendering player loses their wager)
    if (lobby.wagerAmount && lobby.wagerAmount > 0 && !lobby.wagerPaid) {
      await processWagerPayout(ctx, args.lobbyId, lobby.wagerAmount, winnerId, userId);
    }

    // Crypto wager settlement (schedule onchain settle instruction)
    if (lobby.cryptoWagerCurrency && lobby.cryptoWagerTier && !lobby.cryptoSettled) {
      // Store winner/loser on lobby so the retry cron can re-derive args
      await ctx.db.patch(args.lobbyId, {
        cryptoSettlementWinnerId: winnerId,
        cryptoSettlementLoserId: userId,
      });
      await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
        lobbyId: args.lobbyId,
        winnerId,
        loserId: userId,
      });
    }

    // Check if players are agents and update agent stats
    const winnerAgent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", winnerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    const loserAgent = await ctx.db
      .query("agents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (winnerAgent || loserAgent) {
      await updateAgentStatsAfterGame(ctx, winnerAgent, loserAgent);
    }
  }

  // Stop agent streams if active
  await stopAgentStreamsForGame(ctx, args.lobbyId, lobby.hostId, lobby.opponentId);

  // Handle story mode completion on surrender
  if (lobby.mode === "story" && lobby.stageId) {
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
      userId: lobby.hostId,
      stageId: lobby.stageId,
      won: winnerId === lobby.hostId,
      finalLP: gameState ? (winnerId === lobby.hostId ? gameState.hostLifePoints : 0) : 0,
    });

    // Clean up game state
    if (gameState) {
      await ctx.db.delete(gameState._id);
    }
  } else {
    // Clean up game state (no longer needed after game ends)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (gameState) {
      await ctx.db.delete(gameState._id);
    }
  }

  return { success: true };
}

export const surrenderGame = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthMutation(ctx);
    return surrenderGameHandler(ctx, args, user);
  },
});

export const surrenderGameInternal = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, ...gameArgs } = args;
    const user = await getAuthForUser(ctx, userId);
    return surrenderGameHandler(ctx, gameArgs, user);
  },
});

/**
 * Update turn (internal mutation, called by game engine when player makes a move)
 */
export const updateTurn = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    newTurnPlayerId: v.id("users"),
    turnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is not active",
      });
    }

    // Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found",
      });
    }

    const now = Date.now();

    // Update gameState with turn info (single source of truth)
    await ctx.db.patch(gameState._id, {
      currentTurnPlayerId: args.newTurnPlayerId,
      turnNumber: args.turnNumber,
    });

    // Update lobby with lastMoveAt only (for timeout tracking)
    await ctx.db.patch(args.lobbyId, {
      lastMoveAt: now,
    });

    // Record turn start event for spectators
    if (lobby.gameId) {
      const currentPlayer = await ctx.db.get(args.newTurnPlayerId);
      if (currentPlayer) {
        const username = currentPlayer.username || currentPlayer.name || "Unknown";
        await recordEventHelper(ctx, {
          lobbyId: args.lobbyId,
          gameId: lobby.gameId,
          turnNumber: args.turnNumber,
          eventType: "turn_start",
          playerId: args.newTurnPlayerId,
          playerUsername: username,
          description: `Turn ${args.turnNumber} - ${username}'s turn`,
        });
      }
    }
  },
});

/**
 * Forfeit a game due to timeout or manual forfeit
 */
export const forfeitGame = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    forfeitingPlayerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is not active",
      });
    }

    // Determine winner (the player who didn't forfeit)
    const winnerId = args.forfeitingPlayerId === lobby.hostId ? lobby.opponentId : lobby.hostId;

    if (!winnerId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot determine winner",
      });
    }

    // Update lobby
    await ctx.db.patch(args.lobbyId, {
      status: "forfeited",
      winnerId,
    });

    // Update both players' presence to online
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");

    if (lobby.opponentId && lobby.opponentUsername && lobby.mode !== "story") {
      await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
    }

    // Update player stats and ratings (forfeit counts as a loss)
    if (lobby.opponentId) {
      const gameMode = lobby.mode as "ranked" | "casual" | "story";
      await updatePlayerStatsAfterGame(ctx, winnerId, args.forfeitingPlayerId, gameMode);

      // Process wager payout if applicable (forfeiting player loses their wager)
      if (lobby.wagerAmount && lobby.wagerAmount > 0 && !lobby.wagerPaid) {
        await processWagerPayout(
          ctx,
          args.lobbyId,
          lobby.wagerAmount,
          winnerId,
          args.forfeitingPlayerId
        );
      }

      // Crypto wager settlement (schedule onchain settle instruction)
      if (lobby.cryptoWagerCurrency && lobby.cryptoWagerTier && !lobby.cryptoSettled) {
        // Store winner/loser on lobby so the retry cron can re-derive args
        await ctx.db.patch(args.lobbyId, {
          cryptoSettlementWinnerId: winnerId,
          cryptoSettlementLoserId: args.forfeitingPlayerId,
        });
        await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
          lobbyId: args.lobbyId,
          winnerId,
          loserId: args.forfeitingPlayerId,
        });
      }

      // Check if players are agents and update agent stats
      const winnerAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", winnerId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const loserAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", args.forfeitingPlayerId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (winnerAgent || loserAgent) {
        await updateAgentStatsAfterGame(ctx, winnerAgent, loserAgent);
      }
    }

    // Stop agent streams if active
    await stopAgentStreamsForGame(ctx, args.lobbyId, lobby.hostId, lobby.opponentId);

    // Handle story mode completion on forfeit
    if (lobby.mode === "story" && lobby.stageId) {
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();

      await ctx.runMutation(internalAny.progression.storyStages.completeStageInternal, {
        userId: lobby.hostId,
        stageId: lobby.stageId,
        won: winnerId === lobby.hostId,
        finalLP: gameState ? (winnerId === lobby.hostId ? gameState.hostLifePoints : 0) : 0,
      });

      if (gameState) {
        await ctx.db.delete(gameState._id);
      }
    } else {
      // Clean up game state (no longer needed after game ends)
      const gameState = await ctx.db
        .query("gameStates")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
        .first();

      if (gameState) {
        await ctx.db.delete(gameState._id);
      }
    }
  },
});

/**
 * Complete a game (internal mutation, called by game engine)
 */
export const completeGame = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    winnerId: v.id("users"),
    finalTurnNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    // Update lobby
    await ctx.db.patch(args.lobbyId, {
      status: "completed",
      turnNumber: args.finalTurnNumber,
      winnerId: args.winnerId,
    });

    // Increment completed games counter
    await completedGamesCounter.add(ctx, "global", 1);

    // Update both players' presence to online
    const hostUser = await ctx.db.get(lobby.hostId);
    if (hostUser) {
      await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");
    }

    if (lobby.opponentId && lobby.mode !== "story") {
      const opponentUser = await ctx.db.get(lobby.opponentId);
      if (opponentUser && lobby.opponentUsername) {
        await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
      }
    }

    // Update player stats and ratings
    if (lobby.opponentId) {
      const loserId = args.winnerId === lobby.hostId ? lobby.opponentId : lobby.hostId;
      const gameMode = lobby.mode as "ranked" | "casual" | "story";
      await updatePlayerStatsAfterGame(ctx, args.winnerId, loserId, gameMode);

      // Process wager payout if applicable
      if (lobby.wagerAmount && lobby.wagerAmount > 0 && !lobby.wagerPaid) {
        await processWagerPayout(ctx, args.lobbyId, lobby.wagerAmount, args.winnerId, loserId);
      }

      // Crypto wager settlement (schedule onchain settle instruction)
      if (lobby.cryptoWagerCurrency && lobby.cryptoWagerTier && !lobby.cryptoSettled) {
        // Store winner/loser on lobby so the retry cron can re-derive args
        await ctx.db.patch(args.lobbyId, {
          cryptoSettlementWinnerId: args.winnerId,
          cryptoSettlementLoserId: loserId,
        });
        await ctx.scheduler.runAfter(0, internalAny.wager.escrow.settleEscrow, {
          lobbyId: args.lobbyId,
          winnerId: args.winnerId,
          loserId,
        });
      }

      // Check if players are agents and update agent stats
      const winnerAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", args.winnerId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      const loserAgent = await ctx.db
        .query("agents")
        .withIndex("by_user", (q) => q.eq("userId", loserId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();

      if (winnerAgent || loserAgent) {
        await updateAgentStatsAfterGame(ctx, winnerAgent, loserAgent);
      }

      // Record game end event for spectators
      if (lobby.gameId) {
        const winner = await ctx.db.get(args.winnerId);
        const loser = await ctx.db.get(loserId);
        if (winner && loser) {
          await recordGameEndHelper(ctx, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId,
            turnNumber: args.finalTurnNumber,
            winnerId: args.winnerId,
            winnerUsername: winner.username || winner.name || "Unknown",
            loserId,
            loserUsername: loser.username || loser.name || "Unknown",
          });
        }
      }
    }

    // Stop agent streams if active
    await stopAgentStreamsForGame(ctx, args.lobbyId, lobby.hostId, lobby.opponentId);

    // Clean up game state (no longer needed after game ends)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (gameState) {
      await ctx.db.delete(gameState._id);
    }
  },
});
