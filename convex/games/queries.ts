import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { validateSession } from "../lib/validators";

// ============================================================================
// CONSTANTS
// ============================================================================

const RATING_DEFAULTS = {
  DEFAULT_RATING: 1000,
  RANKED_RATING_WINDOW: 200,
} as const;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List waiting lobbies (public lobbies only)
 */
export const listWaitingLobbies = query({
  args: {
    mode: v.optional(v.union(v.literal("casual"), v.literal("ranked"), v.literal("all"))),
    userRating: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const mode = args.mode || "all";
    const userRating = args.userRating || RATING_DEFAULTS.DEFAULT_RATING;

    // Query waiting lobbies
    const allLobbies = await (mode === "all"
      ? ctx.db
          .query("gameLobbies")
          .withIndex("by_status", (q) => q.eq("status", "waiting"))
          .collect()
      : ctx.db
          .query("gameLobbies")
          .withIndex("by_mode_status", (q) => q.eq("mode", mode).eq("status", "waiting"))
          .collect());

    // Filter out private lobbies
    let publicLobbies = allLobbies.filter((lobby) => !lobby.isPrivate);

    // For ranked mode, filter by rating window
    if (mode === "ranked" || mode === "all") {
      publicLobbies = publicLobbies.filter((lobby) => {
        if (lobby.mode !== "ranked") return true;
        const ratingDiff = Math.abs(lobby.hostRating - userRating);
        return ratingDiff <= RATING_DEFAULTS.RANKED_RATING_WINDOW;
      });
    }

    // Sort by newest first
    publicLobbies.sort((a, b) => b.createdAt - a.createdAt);

    // Limit to 50 results
    publicLobbies = publicLobbies.slice(0, 50);

    // Return without joinCode (security)
    return publicLobbies.map((lobby) => ({
      id: lobby._id,
      hostUsername: lobby.hostUsername,
      hostRank: lobby.hostRank,
      hostRating: lobby.hostRating,
      deckArchetype: lobby.deckArchetype,
      mode: lobby.mode,
      createdAt: lobby.createdAt,
      isPrivate: lobby.isPrivate,
    }));
  },
});

/**
 * Get user's active lobby (as host)
 */
export const getActiveLobby = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Find user's lobby where they are the host
    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active"))
      )
      .first();

    return lobby;
  },
});

/**
 * Get detailed lobby information
 */
export const getLobbyDetails = query({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await validateSession(ctx, args.token);

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found");
    }

    if (lobby.status === "cancelled") {
      throw new Error("This lobby has been cancelled");
    }

    return lobby;
  },
});

/**
 * Get user's private lobby (to show join code)
 */
export const getMyPrivateLobby = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isPrivate"), true),
          q.eq(q.field("status"), "waiting")
        )
      )
      .first();

    if (!lobby) {
      return null;
    }

    return {
      lobbyId: lobby._id,
      joinCode: lobby.joinCode,
      mode: lobby.mode,
    };
  },
});

/**
 * Get list of active PUBLIC games for spectating
 *
 * Features:
 * - Only returns public games (isPrivate: false)
 * - Only games in "active" status
 * - Sorted by createdAt (desc) for most recent matches first
 * - Includes spectator count
 */
export const listActiveGames = query({
  args: {
    mode: v.optional(v.union(v.literal("casual"), v.literal("ranked"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { mode, limit = 50 }) => {
    let baseQuery = ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) =>
        q.and(
          q.eq(q.field("isPrivate"), false),
          q.or(
            q.eq(q.field("allowSpectators"), true),
            q.eq(q.field("allowSpectators"), undefined) // default is true
          )
        )
      );

    const games = await baseQuery.collect();

    // Filter by mode if specified
    const filteredGames = mode && mode !== "all"
      ? games.filter((game) => game.mode === mode)
      : games;

    // Sort by createdAt desc and take limit
    const sortedGames = filteredGames
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, limit);

    return sortedGames.map((game) => ({
      lobbyId: game._id,
      hostUsername: game.hostUsername,
      opponentUsername: game.opponentUsername || "Waiting...",
      mode: game.mode,
      turnNumber: game.turnNumber || 0,
      spectatorCount: game.spectatorCount || 0,
      deckArchetype: game.deckArchetype,
      startedAt: game.startedAt,
    }));
  },
});

/**
 * Get sanitized game state for spectators
 *
 * Security:
 * - Only exposes public information visible to both players
 * - Hides private zones (hands, deck contents)
 * - Verifies game is public and allows spectators
 */
export const getGameSpectatorView = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw new Error("Game not found");
    }

    // Security: Verify game is spectatable
    if (lobby.isPrivate) {
      throw new Error("Cannot spectate private games");
    }

    if (lobby.allowSpectators === false) {
      throw new Error("Spectators not allowed for this game");
    }

    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    // Get player information
    const host = await ctx.db.get(lobby.hostId);
    const opponent = lobby.opponentId ? await ctx.db.get(lobby.opponentId) : null;

    // Return sanitized game state
    return {
      lobbyId: lobby._id,
      gameId: lobby.gameId!,

      // Player info
      host: {
        userId: lobby.hostId,
        username: lobby.hostUsername,
        rank: lobby.hostRank,
        rating: lobby.hostRating,
      },
      opponent: opponent ? {
        userId: lobby.opponentId!,
        username: lobby.opponentUsername!,
        rank: lobby.opponentRank,
      } : null,

      // Game state (public info only)
      mode: lobby.mode,
      deckArchetype: lobby.deckArchetype,
      turnNumber: lobby.turnNumber || 0,
      currentTurnPlayerId: lobby.currentTurnPlayerId,
      turnStartedAt: lobby.turnStartedAt,

      // Metadata
      status: lobby.status,
      startedAt: lobby.startedAt,
      spectatorCount: lobby.spectatorCount || 0,
    };
  },
});

/**
 * Check if user has an active game (for reconnection on login/mount)
 */
export const checkForActiveGame = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Check if user is in an active game
    const activeGames = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("hostId"), userId),
            q.eq(q.field("opponentId"), userId)
          ),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    if (activeGames.length === 0) {
      return null;
    }

    const game = activeGames[0]!; // Safe: checked length > 0

    // Check if game is recent (not stale from cleanup failure)
    const FIVE_MINUTES = 5 * 60 * 1000;
    const lastMove = game.lastMoveAt || game.startedAt || Date.now();
    if (Date.now() - lastMove > FIVE_MINUTES) {
      return null;
    }

    // User has active game - return reconnection info
    return {
      hasActiveGame: true,
      lobbyId: game._id,
      gameId: game.gameId!,
      isHost: game.hostId === userId,
      opponentUsername: game.hostId === userId
        ? game.opponentUsername
        : game.hostUsername,
      turnNumber: game.turnNumber,
      isYourTurn: game.currentTurnPlayerId === userId,
      lastMoveAt: lastMove,
    };
  },
});

/**
 * Get available actions for current player
 *
 * Returns what actions the authenticated player can take right now.
 * Used by agents to determine valid moves.
 */
export const getAvailableActions = query({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      return { error: "Game not found", actions: [] };
    }

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return { error: "Game state not found", actions: [] };
    }

    const isMyTurn = gameState.currentTurnPlayerId === userId;
    const currentPhase = gameState.currentPhase || "draw";
    const isHost = lobby.hostId === userId;
    const myBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const normalSummonedThisTurn = isHost
      ? gameState.hostNormalSummonedThisTurn || false
      : gameState.opponentNormalSummonedThisTurn || false;

    const actions: string[] = [];

    if (!isMyTurn) {
      // Opponent's turn - can only activate traps/quick effects
      actions.push("activateTrap");
      return { currentPhase, isMyTurn, actions };
    }

    // My turn - determine available actions based on phase
    switch (currentPhase) {
      case "draw":
      case "standby":
        actions.push("advancePhase");
        break;

      case "main1":
      case "main2":
        if (!normalSummonedThisTurn) {
          actions.push("normalSummon", "setMonster");
        }
        actions.push("setSpellTrap", "activateSpell", "changePosition", "advancePhase");
        break;

      case "battle_start":
      case "battle":
        // Can attack with monsters that haven't attacked yet
        const canAttack = myBoard.some((card) => !card.hasAttacked && card.position === 1);
        if (canAttack) {
          actions.push("declareAttack");
        }
        actions.push("advancePhase");
        break;

      case "battle_end":
        actions.push("advancePhase");
        break;

      case "end":
        actions.push("endTurn");
        break;
    }

    return {
      currentPhase,
      isMyTurn,
      normalSummonedThisTurn,
      actions,
    };
  },
});

/**
 * Get detailed game state for player (sanitized for security)
 */
export const getGameStateForPlayer = query({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Game not found");
    }

    // Verify user is in this game
    if (lobby.hostId !== userId && lobby.opponentId !== userId) {
      throw new Error("You are not in this game");
    }

    // Verify game is active
    if (lobby.status !== "active") {
      throw new Error("Game is not active");
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw new Error("Game state not found - game may be initializing");
    }

    // Determine if user is host
    const isHost = lobby.hostId === userId;

    // Return sanitized state (hide opponent's hand and deck)
    return {
      gameId: lobby.gameId!,
      lobbyId: args.lobbyId,

      // Player identity
      isHost,
      playerId: userId,
      opponentId: isHost ? lobby.opponentId! : lobby.hostId,
      opponentUsername: isHost ? lobby.opponentUsername! : lobby.hostUsername,

      // Turn info
      currentTurnPlayerId: gameState.currentTurnPlayerId,
      turnNumber: gameState.turnNumber,
      isYourTurn: gameState.currentTurnPlayerId === userId,

      // Phase and chain state (for gameplay logic)
      currentPhase: gameState.currentPhase || "draw",
      currentChain: gameState.currentChain || [],
      currentPriorityPlayer: gameState.currentPriorityPlayer,
      myNormalSummonedThisTurn: isHost ? gameState.hostNormalSummonedThisTurn || false : gameState.opponentNormalSummonedThisTurn || false,

      // Player's state (full visibility)
      myHand: isHost ? gameState.hostHand : gameState.opponentHand,
      myBoard: isHost ? gameState.hostBoard : gameState.opponentBoard,
      mySpellTrapZone: isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone,
      myDeckCount: isHost ? gameState.hostDeck.length : gameState.opponentDeck.length,
      myGraveyard: isHost ? gameState.hostGraveyard : gameState.opponentGraveyard,
      myLifePoints: isHost ? gameState.hostLifePoints : gameState.opponentLifePoints,
      myMana: isHost ? gameState.hostMana : gameState.opponentMana,

      // Opponent's state (limited visibility - no hand/deck contents)
      opponentHandCount: isHost ? gameState.opponentHand.length : gameState.hostHand.length,
      opponentBoard: isHost ? gameState.opponentBoard : gameState.hostBoard,
      opponentSpellTrapZone: isHost ? gameState.opponentSpellTrapZone : gameState.hostSpellTrapZone,
      opponentDeckCount: isHost ? gameState.opponentDeck.length : gameState.hostDeck.length,
      opponentGraveyard: isHost ? gameState.opponentGraveyard : gameState.hostGraveyard,
      opponentLifePoints: isHost ? gameState.opponentLifePoints : gameState.hostLifePoints,
      opponentMana: isHost ? gameState.opponentMana : gameState.hostMana,

      // Metadata
      mode: lobby.mode,
      lastMoveAt: gameState.lastMoveAt,
    };
  },
});

/**
 * Get active lobbies for cleanup (internal query)
 */
export const getActiveLobbiesForCleanup = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

/**
 * Get waiting lobbies for cleanup (internal query)
 */
export const getWaitingLobbiesForCleanup = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
  },
});
