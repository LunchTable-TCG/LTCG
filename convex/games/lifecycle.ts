import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, internalMutation } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { validateSession } from "../lib/validators";
import { updatePlayerStatsAfterGame } from "./stats";

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
  handler: async (ctx, { lobbyId, gameId, hostId, opponentId, currentTurnPlayerId }) => {
  // Get both players' active decks
  const host = await ctx.db.get(hostId);
  const opponent = await ctx.db.get(opponentId);

  if (!host?.activeDeckId || !opponent?.activeDeckId) {
    throw new Error("Both players must have active decks");
  }

  // Get deck cards for both players
  const hostDeckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", host.activeDeckId!))
    .collect();

  const opponentDeckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", opponent.activeDeckId!))
    .collect();

  // Build full deck arrays (expanding quantities)
  const hostFullDeck: Id<"cardDefinitions">[] = [];
  for (const deckCard of hostDeckCards) {
    for (let i = 0; i < deckCard.quantity; i++) {
      hostFullDeck.push(deckCard.cardDefinitionId);
    }
  }

  const opponentFullDeck: Id<"cardDefinitions">[] = [];
  for (const deckCard of opponentDeckCards) {
    for (let i = 0; i < deckCard.quantity; i++) {
      opponentFullDeck.push(deckCard.cardDefinitionId);
    }
  }

  // Shuffle decks (Fisher-Yates shuffle)
  const shuffle = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      // TypeScript strict null check: array elements are guaranteed to exist
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  };

  const shuffledHostDeck = shuffle(hostFullDeck);
  const shuffledOpponentDeck = shuffle(opponentFullDeck);

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

      // Phase Management (start in Draw Phase)
      currentPhase: "draw",

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

      // Timestamps
      lastMoveAt: now,
      createdAt: now,
    });
  },
});

/**
 * Surrender/forfeit the current game (user-initiated)
 */
export const surrenderGame = mutation({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Game not found");
    }

    // Verify game is active
    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    // Verify user is in this game
    if (lobby.hostId !== userId && lobby.opponentId !== userId) {
      throw new Error("You are not in this game");
    }

    // Determine winner (the player who didn't surrender)
    const winnerId = userId === lobby.hostId ? lobby.opponentId : lobby.hostId;

    if (!winnerId) {
      throw new Error("Cannot determine winner");
    }

    // Update lobby
    await ctx.db.patch(args.lobbyId, {
      status: "forfeited",
      winnerId,
    });

    // Update both players' presence to online
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");

    if (lobby.opponentId && lobby.opponentUsername) {
      await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
    }

    // Update player stats and ratings (surrender counts as a loss)
    if (lobby.opponentId) {
      const gameMode = lobby.mode as "ranked" | "casual";
      await updatePlayerStatsAfterGame(ctx, winnerId, userId, gameMode);
    }

    // Clean up game state (no longer needed after game ends)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (gameState) {
      await ctx.db.delete(gameState._id);
    }

    return { success: true };
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
      throw new Error("Lobby not found");
    }

    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    const now = Date.now();

    // Update lobby with new turn info
    await ctx.db.patch(args.lobbyId, {
      currentTurnPlayerId: args.newTurnPlayerId,
      turnStartedAt: now,
      lastMoveAt: now,
      turnNumber: args.turnNumber,
    });

    // Record turn start event for spectators
    if (lobby.gameId) {
      const currentPlayer = await ctx.db.get(args.newTurnPlayerId);
      if (currentPlayer) {
        const username = currentPlayer.username || currentPlayer.name || "Unknown";
        await ctx.runMutation(api.gameEvents.recordEvent, {
          lobbyId: args.lobbyId,
          gameId: lobby.gameId!,
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
      throw new Error("Lobby not found");
    }

    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    // Determine winner (the player who didn't forfeit)
    const winnerId =
      args.forfeitingPlayerId === lobby.hostId ? lobby.opponentId : lobby.hostId;

    if (!winnerId) {
      throw new Error("Cannot determine winner");
    }

    // Update lobby
    await ctx.db.patch(args.lobbyId, {
      status: "forfeited",
      winnerId,
    });

    // Update both players' presence to online
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");

    if (lobby.opponentId && lobby.opponentUsername) {
      await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
    }

    // Update player stats and ratings (forfeit counts as a loss)
    if (lobby.opponentId) {
      const gameMode = lobby.mode as "ranked" | "casual";
      await updatePlayerStatsAfterGame(ctx, winnerId, args.forfeitingPlayerId, gameMode);
    }

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
      throw new Error("Lobby not found");
    }

    // Update lobby
    await ctx.db.patch(args.lobbyId, {
      status: "completed",
      turnNumber: args.finalTurnNumber,
      winnerId: args.winnerId,
    });

    // Update both players' presence to online
    const hostUser = await ctx.db.get(lobby.hostId);
    if (hostUser) {
      await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "online");
    }

    if (lobby.opponentId) {
      const opponentUser = await ctx.db.get(lobby.opponentId);
      if (opponentUser && lobby.opponentUsername) {
        await updatePresenceInternal(ctx, lobby.opponentId, lobby.opponentUsername, "online");
      }
    }

    // Update player stats and ratings
    if (lobby.opponentId) {
      const loserId = args.winnerId === lobby.hostId ? lobby.opponentId : lobby.hostId;
      const gameMode = lobby.mode as "ranked" | "casual";
      await updatePlayerStatsAfterGame(ctx, args.winnerId, loserId, gameMode);

      // Record game end event for spectators
      if (lobby.gameId) {
        const winner = await ctx.db.get(args.winnerId);
        const loser = await ctx.db.get(loserId);
        if (winner && loser) {
          await ctx.runMutation(api.gameEvents.recordGameEnd, {
            lobbyId: args.lobbyId,
            gameId: lobby.gameId!,
            turnNumber: args.finalTurnNumber,
            winnerId: args.winnerId,
            winnerUsername: winner.username || winner.name || "Unknown",
            loserId,
            loserUsername: loser.username || loser.name || "Unknown",
          });
        }
      }
    }

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
