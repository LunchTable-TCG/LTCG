import { v } from "convex/values";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalQuery, query } from "../../_generated/server";
import { requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { DEFAULT_TIMEOUT_CONFIG } from "../timeoutSystem";

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
 *
 * Retrieves all public game lobbies that are waiting for an opponent.
 * For ranked mode, filters by rating window to ensure balanced matches.
 *
 * @param mode - Optional filter by game mode (casual, ranked, or all)
 * @param userRating - Optional user rating for ranked matchmaking (default: 1000)
 * @returns Array of public lobbies with host info and game details
 */
export const listWaitingLobbies = query({
  args: {
    mode: v.optional(
      v.union(v.literal("casual"), v.literal("ranked"), v.literal("pvp"), v.literal("all"))
    ),
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
 * Get user's active lobby (as host or opponent)
 *
 * Retrieves the authenticated user's current lobby where they are either:
 * - The host (created the lobby)
 * - The opponent (was challenged or joined)
 *
 * Returns null if user has no active lobby.
 *
 * @returns The user's active lobby or null
 */
export const getActiveLobby = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Use provided userId or get from auth context
    const userId = args.userId ?? (await requireAuthQuery(ctx)).userId;

    // Find user's lobby where they are the host
    const hostLobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
      .first();

    if (hostLobby) return hostLobby;

    // Also check if user is the opponent (was challenged or joined a lobby)
    const opponentLobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_opponent", (q) => q.eq("opponentId", userId))
      .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
      .first();

    return opponentLobby;
  },
});

/**
 * Get incoming challenge for the current user
 *
 * Retrieves any pending challenge where the user is the opponentId
 * and the lobby is still waiting (not yet joined/active).
 *
 * @returns The incoming challenge lobby or null
 */
export const getIncomingChallenge = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Find lobbies where user is pre-assigned as opponent and status is waiting
    const challenge = await ctx.db
      .query("gameLobbies")
      .withIndex("by_opponent", (q) => q.eq("opponentId", userId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (!challenge) return null;

    // Return challenge with host info for display
    return {
      _id: challenge._id,
      hostId: challenge.hostId,
      hostUsername: challenge.hostUsername,
      hostRank: challenge.hostRank,
      mode: challenge.mode,
      createdAt: challenge.createdAt,
    };
  },
});

/**
 * Get detailed lobby information
 *
 * Fetches complete details for a specific game lobby.
 * Throws error if lobby doesn't exist or has been cancelled.
 *
 * @param lobbyId - The game lobby ID to fetch
 * @returns Full lobby details
 */
export const getLobbyDetails = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found",
      });
    }

    if (lobby.status === "cancelled") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This lobby has been cancelled",
      });
    }

    return lobby;
  },
});

/**
 * Get user's private lobby (to show join code)
 *
 * Retrieves the authenticated user's private lobby with join code.
 * Used to display the join code for sharing with friends.
 *
 * @returns Private lobby details with join code, or null if no private lobby exists
 */
export const getMyPrivateLobby = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) => q.and(q.eq(q.field("isPrivate"), true), q.eq(q.field("status"), "waiting")))
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
 *
 * @param mode - Optional filter by game mode (casual, ranked, or all)
 * @param limit - Maximum number of games to return (default: 50)
 * @returns Array of active public games with player info and spectator counts
 */
export const listActiveGames = query({
  args: {
    mode: v.optional(
      v.union(v.literal("casual"), v.literal("ranked"), v.literal("pvp"), v.literal("all"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { mode, limit = 50 }) => {
    const baseQuery = ctx.db
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
    const filteredGames =
      mode && mode !== "all" ? games.filter((game) => game.mode === mode) : games;

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
 *
 * @param lobbyId - The game lobby ID to spectate
 * @returns Public game state with visible zones only (board, graveyard, card counts)
 */
export const getGameSpectatorView = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, { lobbyId }) => {
    const lobby = await ctx.db.get(lobbyId);

    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game not found",
      });
    }

    // Security: Verify game is spectatable
    if (lobby.isPrivate) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot spectate private games",
      });
    }

    if (lobby.allowSpectators === false) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Spectators not allowed for this game",
      });
    }

    if (lobby.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game is not active",
      });
    }

    // Get player information
    // const host = await ctx.db.get(lobby.hostId);
    const opponent = lobby.opponentId ? await ctx.db.get(lobby.opponentId) : null;

    // Get game state for spectator view (public zones only)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

    let boardState = null;
    if (gameState) {
      // Collect all unique card IDs from all zones (batch optimization)
      const allCardIds: Id<"cardDefinitions">[] = [
        ...gameState.hostBoard.map((bc) => bc.cardId),
        ...gameState.hostSpellTrapZone.map((st) => st.cardId),
        ...gameState.hostGraveyard,
        ...gameState.opponentBoard.map((bc) => bc.cardId),
        ...gameState.opponentSpellTrapZone.map((st) => st.cardId),
        ...gameState.opponentGraveyard,
      ];
      if (gameState.hostFieldSpell) {
        allCardIds.push(gameState.hostFieldSpell.cardId);
      }
      if (gameState.opponentFieldSpell) {
        allCardIds.push(gameState.opponentFieldSpell.cardId);
      }

      // Deduplicate and batch fetch all cards in parallel
      const uniqueCardIds = [...new Set(allCardIds.map((id) => id.toString()))]
        .map((idStr) => allCardIds.find((id) => id.toString() === idStr))
        .filter((id): id is Id<"cardDefinitions"> => id !== undefined);
      const cards = await Promise.all(uniqueCardIds.map((id) => ctx.db.get(id)));
      const cardMap = new Map(
        cards
          .filter((card): card is NonNullable<typeof card> => card !== null)
          .map((card) => [card._id.toString(), card])
      );

      // Helper to get card from pre-fetched map
      const getCard = (cardId: Id<"cardDefinitions">) => cardMap.get(cardId.toString());

      // Build host board data using pre-fetched cards
      const hostBoardData = gameState.hostBoard
        .map((bc) => {
          const card = getCard(bc.cardId);
          if (!card) return null;
          return {
            ...card,
            currentAttack: bc.attack,
            currentDefense: bc.defense,
            position: bc.position,
            hasAttacked: bc.hasAttacked,
            isFaceDown: bc.isFaceDown,
          };
        })
        .filter(Boolean);

      const hostSpellTrapData = gameState.hostSpellTrapZone
        .map((st) => {
          const card = getCard(st.cardId);
          if (!card) return null;
          return {
            ...card,
            isFaceDown: st.isFaceDown,
          };
        })
        .filter(Boolean);

      const hostGraveyardData = gameState.hostGraveyard
        .map((cardId) => getCard(cardId))
        .filter((c) => c !== undefined);

      // Build opponent board data using pre-fetched cards
      const opponentBoardData = gameState.opponentBoard
        .map((bc) => {
          const card = getCard(bc.cardId);
          if (!card) return null;
          return {
            ...card,
            currentAttack: bc.attack,
            currentDefense: bc.defense,
            position: bc.position,
            hasAttacked: bc.hasAttacked,
            isFaceDown: bc.isFaceDown,
          };
        })
        .filter(Boolean);

      const opponentSpellTrapData = gameState.opponentSpellTrapZone
        .map((st) => {
          const card = getCard(st.cardId);
          if (!card) return null;
          return {
            ...card,
            isFaceDown: st.isFaceDown,
          };
        })
        .filter(Boolean);

      const opponentGraveyardData = gameState.opponentGraveyard
        .map((cardId) => getCard(cardId))
        .filter((c) => c !== undefined);

      // Build field spells using pre-fetched cards
      let hostFieldSpell = null;
      if (gameState.hostFieldSpell) {
        const card = getCard(gameState.hostFieldSpell.cardId);
        if (card) {
          hostFieldSpell = {
            ...card,
            isActive: gameState.hostFieldSpell.isActive,
          };
        }
      }

      let opponentFieldSpell = null;
      if (gameState.opponentFieldSpell) {
        const card = getCard(gameState.opponentFieldSpell.cardId);
        if (card) {
          opponentFieldSpell = {
            ...card,
            isActive: gameState.opponentFieldSpell.isActive,
          };
        }
      }

      boardState = {
        currentPhase: gameState.currentPhase || "draw",

        // Host state (public zones only)
        hostLifePoints: gameState.hostLifePoints,
        hostHandCount: gameState.hostHand.length,
        hostDeckCount: gameState.hostDeck.length,
        hostBoard: hostBoardData,
        hostSpellTrapZone: hostSpellTrapData,
        hostGraveyard: hostGraveyardData,
        hostFieldSpell,

        // Opponent state (public zones only)
        opponentLifePoints: gameState.opponentLifePoints,
        opponentHandCount: gameState.opponentHand.length,
        opponentDeckCount: gameState.opponentDeck.length,
        opponentBoard: opponentBoardData,
        opponentSpellTrapZone: opponentSpellTrapData,
        opponentGraveyard: opponentGraveyardData,
        opponentFieldSpell,
      };
    }

    // Return sanitized game state
    return {
      lobbyId: lobby._id,
      gameId: lobby.gameId ?? "",

      // Player info
      host: {
        userId: lobby.hostId,
        username: lobby.hostUsername,
        rank: lobby.hostRank,
        rating: lobby.hostRating,
      },
      opponent: opponent
        ? {
            userId: lobby.opponentId ?? ("" as Id<"users">),
            username: lobby.opponentUsername ?? "",
            rank: lobby.opponentRank,
          }
        : null,

      // Game state (public info only) - turn state from gameState (single source of truth)
      mode: lobby.mode,
      deckArchetype: lobby.deckArchetype,
      turnNumber: gameState?.turnNumber || 0,
      currentTurnPlayerId: gameState?.currentTurnPlayerId,
      turnStartedAt: lobby.turnStartedAt, // Keep from lobby for now (not in gameState)

      // Board state (visible zones only)
      boardState,

      // Metadata
      status: lobby.status,
      startedAt: lobby.startedAt,
      spectatorCount: lobby.spectatorCount || 0,
    };
  },
});

/**
 * Check if user has an active game (for reconnection on login/mount)
 *
 * Checks if the authenticated user is currently in an active game.
 * Used on login or page mount to enable reconnection to in-progress games.
 * Returns null if no active game or if game is stale (>5 minutes since last move).
 *
 * @returns Active game reconnection info or null
 */
export const checkForActiveGame = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Check if user is in an active game
    const activeGames = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("hostId"), userId), q.eq(q.field("opponentId"), userId)),
          q.eq(q.field("status"), "active")
        )
      )
      .collect();

    if (activeGames.length === 0) {
      return null;
    }

    const game = activeGames[0];
    if (!game) {
      return null;
    }

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
      gameId: game.gameId ?? "",
      isHost: game.hostId === userId,
      opponentUsername: game.hostId === userId ? game.opponentUsername : game.hostUsername,
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
 * Used by agents to determine valid moves and by UI to enable/disable action buttons.
 *
 * @param lobbyId - The game lobby ID
 * @returns Current phase, turn status, and array of available action names
 */
export const getAvailableActions = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

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
      case "battle": {
        // Can attack with monsters that haven't attacked yet
        const canAttack = myBoard.some((card) => !card.hasAttacked && card.position === 1);
        if (canAttack) {
          actions.push("declareAttack");
        }
        actions.push("advancePhase");
        break;
      }

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
 *
 * Retrieves full game state for the authenticated player including their hand and deck count.
 * Opponent's hand and deck contents are hidden for security.
 * Returns null if game is not active (e.g., after forfeit/completion).
 *
 * @param lobbyId - The game lobby ID
 * @returns Complete game state with player's private zones and opponent's public zones
 */
export const getGameStateForPlayer = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Use provided userId or get from auth context
    const userId = args.userId ?? (await requireAuthQuery(ctx)).userId;

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game not found",
      });
    }

    // Verify user is in this game
    if (lobby.hostId !== userId && lobby.opponentId !== userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are not in this game",
      });
    }

    // Return null if game is not active (e.g., after forfeit/completion)
    // This allows the UI to handle the end-of-game state gracefully
    if (lobby.status !== "active") {
      return null;
    }

    // Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Game state not found - game may be initializing",
      });
    }

    // Determine if user is host
    const isHost = lobby.hostId === userId;

    // Helper: Fetch card definition with all details
    const getCardData = async (
      cardId: Id<"cardDefinitions">
    ): Promise<Doc<"cardDefinitions"> | null> => {
      const card = await ctx.db.get(cardId);
      return card;
    };

    // Fetch card data for player's hand
    const myHandRaw = isHost ? gameState.hostHand : gameState.opponentHand;
    const myHandData = await Promise.all(
      myHandRaw.map(async (cardId) => {
        const cardData = await getCardData(cardId);
        return cardData;
      })
    );
    const myHand = myHandData.filter((c): c is Doc<"cardDefinitions"> => c !== null);

    // Fetch card data for player's board (with current stats)
    const myBoardRaw = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const myBoardData = await Promise.all(
      myBoardRaw.map(async (boardCard) => {
        const cardData = await getCardData(boardCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          // Current battle stats (may differ from base)
          currentAttack: boardCard.attack,
          currentDefense: boardCard.defense,
          position: boardCard.position,
          hasAttacked: boardCard.hasAttacked,
          isFaceDown: boardCard.isFaceDown,
        };
      })
    );
    const myBoard = myBoardData.filter(Boolean);

    // Fetch card data for opponent's board (with current stats)
    const opponentBoardRaw = isHost ? gameState.opponentBoard : gameState.hostBoard;
    const opponentBoardData = await Promise.all(
      opponentBoardRaw.map(async (boardCard) => {
        const cardData = await getCardData(boardCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          currentAttack: boardCard.attack,
          currentDefense: boardCard.defense,
          position: boardCard.position,
          hasAttacked: boardCard.hasAttacked,
          isFaceDown: boardCard.isFaceDown,
        };
      })
    );
    const opponentBoard = opponentBoardData.filter(Boolean);

    // Fetch card data for spell/trap zones
    const mySpellTrapZoneRaw = isHost
      ? gameState.hostSpellTrapZone
      : gameState.opponentSpellTrapZone;
    const mySpellTrapData = await Promise.all(
      mySpellTrapZoneRaw.map(async (stCard) => {
        const cardData = await getCardData(stCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          isFaceDown: stCard.isFaceDown,
          isActivated: stCard.isActivated,
        };
      })
    );
    const mySpellTrapZone = mySpellTrapData.filter(Boolean);

    const opponentSpellTrapZoneRaw = isHost
      ? gameState.opponentSpellTrapZone
      : gameState.hostSpellTrapZone;
    const opponentSpellTrapData = await Promise.all(
      opponentSpellTrapZoneRaw.map(async (stCard) => {
        const cardData = await getCardData(stCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          isFaceDown: stCard.isFaceDown,
          isActivated: stCard.isActivated,
        };
      })
    );
    const opponentSpellTrapZone = opponentSpellTrapData.filter(Boolean);

    // Fetch graveyard card data
    const myGraveyardRaw = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
    const myGraveyardData = await Promise.all(
      myGraveyardRaw.map(async (cardId) => {
        const cardData = await getCardData(cardId);
        return cardData;
      })
    );
    const myGraveyard = myGraveyardData.filter((c): c is Doc<"cardDefinitions"> => c !== null);

    const opponentGraveyardRaw = isHost ? gameState.opponentGraveyard : gameState.hostGraveyard;
    const opponentGraveyardData = await Promise.all(
      opponentGraveyardRaw.map(async (cardId) => {
        const cardData = await getCardData(cardId);
        return cardData;
      })
    );
    const opponentGraveyard = opponentGraveyardData.filter(
      (c): c is Doc<"cardDefinitions"> => c !== null
    );

    // Fetch field spell data
    const myFieldSpellRaw = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
    let myFieldSpell = null;
    if (myFieldSpellRaw) {
      const fieldCard = await getCardData(myFieldSpellRaw.cardId);
      if (fieldCard) {
        myFieldSpell = {
          ...fieldCard,
          isActive: myFieldSpellRaw.isActive,
        };
      }
    }

    const opponentFieldSpellRaw = isHost ? gameState.opponentFieldSpell : gameState.hostFieldSpell;
    let opponentFieldSpell = null;
    if (opponentFieldSpellRaw) {
      const fieldCard = await getCardData(opponentFieldSpellRaw.cardId);
      if (fieldCard) {
        opponentFieldSpell = {
          ...fieldCard,
          isActive: opponentFieldSpellRaw.isActive,
        };
      }
    }

    // Return sanitized state (hide opponent's hand and deck) with full card data
    return {
      gameId: lobby.gameId ?? "",
      lobbyId: args.lobbyId,

      // Player identity
      isHost,
      playerId: userId,
      opponentId: isHost ? (lobby.opponentId ?? ("" as Id<"users">)) : lobby.hostId,
      opponentUsername: isHost ? (lobby.opponentUsername ?? "") : lobby.hostUsername,

      // Turn info
      currentTurnPlayerId: gameState.currentTurnPlayerId,
      turnNumber: gameState.turnNumber,
      isYourTurn: gameState.currentTurnPlayerId === userId,

      // Phase and chain state (for gameplay logic)
      currentPhase: gameState.currentPhase || "draw",
      currentChain: gameState.currentChain || [],
      currentPriorityPlayer: gameState.currentPriorityPlayer,
      pendingAction: gameState.pendingAction, // For attack/summon response windows
      pendingReplay: gameState.pendingReplay, // For battle replay (when monster count changes)
      myNormalSummonedThisTurn: isHost
        ? gameState.hostNormalSummonedThisTurn || false
        : gameState.opponentNormalSummonedThisTurn || false,

      // Player's state (full visibility with card data)
      myHand,
      myBoard,
      mySpellTrapZone,
      myFieldSpell,
      myDeckCount: isHost ? gameState.hostDeck.length : gameState.opponentDeck.length,
      myGraveyard,
      myLifePoints: isHost ? gameState.hostLifePoints : gameState.opponentLifePoints,
      myMana: isHost ? gameState.hostMana : gameState.opponentMana,

      // Opponent's state (limited visibility - no hand/deck contents, but full card data on board)
      opponentHandCount: isHost ? gameState.opponentHand.length : gameState.hostHand.length,
      opponentBoard,
      opponentSpellTrapZone,
      opponentFieldSpell,
      opponentDeckCount: isHost ? gameState.opponentDeck.length : gameState.hostDeck.length,
      opponentGraveyard,
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
  args: {},
  handler: async (ctx) => {
    const lobbies = await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    // Fetch game states in parallel to get turn info from single source of truth
    const results = await Promise.all(
      lobbies.map(async (lobby) => {
        const gameState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
          .first();

        return {
          _id: lobby._id,
          createdAt: lobby.createdAt,
          lastMoveAt: lobby.lastMoveAt, // Keep from lobby for timeout tracking
          currentTurnPlayerId: gameState?.currentTurnPlayerId, // From gameState (single source of truth)
          hostId: lobby.hostId,
          hostUsername: lobby.hostUsername,
        };
      })
    );

    return results;
  },
});

/**
 * Get waiting lobbies for cleanup (internal query)
 */
export const getWaitingLobbiesForCleanup = internalQuery({
  args: {},
  handler: async (ctx) => {
    const lobbies = await ctx.db
      .query("gameLobbies")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();

    // Fetch game states in parallel to get turn info from single source of truth
    const results = await Promise.all(
      lobbies.map(async (lobby) => {
        const gameState = await ctx.db
          .query("gameStates")
          .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
          .first();

        return {
          _id: lobby._id,
          createdAt: lobby.createdAt,
          lastMoveAt: lobby.lastMoveAt, // Keep from lobby for timeout tracking
          currentTurnPlayerId: gameState?.currentTurnPlayerId, // From gameState (single source of truth)
          hostId: lobby.hostId,
          hostUsername: lobby.hostUsername,
        };
      })
    );

    return results;
  },
});

// ============================================================================
// NEW GAME FEATURE QUERIES
// ============================================================================

/**
 * Get pending optional triggers for the authenticated user
 *
 * Returns optional trigger effects that the current player can choose to activate.
 * Filters by the current user's playerId.
 *
 * @param lobbyId - The game lobby ID
 * @returns Array of pending optional triggers for the current user
 */
export const getPendingOptionalTriggers = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return [];
    }

    const pendingTriggers = gameState.pendingOptionalTriggers || [];

    // Filter by current user's playerId
    return pendingTriggers.filter((trigger) => trigger.playerId === userId);
  },
});

/**
 * Get timeout status for the game
 *
 * Returns timeout information including:
 * - actionTimeRemainingMs (calculated from responseWindow.expiresAt)
 * - matchTimeRemainingMs (calculated from matchTimerStart + totalMatchMs - now)
 * - isWarning (< warningAtMs)
 * - isTimedOut
 * - isMatchTimedOut
 *
 * Uses DEFAULT_TIMEOUT_CONFIG if no config set.
 *
 * @param lobbyId - The game lobby ID
 * @returns Timeout status object or null if no game state
 */
export const getTimeoutStatus = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return null;
    }

    const config = gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;
    const now = Date.now();

    // Calculate action time remaining from response window
    let actionTimeRemainingMs = config.perActionMs;
    let isTimedOut = false;

    if (gameState.responseWindow?.expiresAt) {
      actionTimeRemainingMs = Math.max(0, gameState.responseWindow.expiresAt - now);
      isTimedOut = actionTimeRemainingMs === 0;
    }

    // Calculate match time remaining
    let matchTimeRemainingMs = config.totalMatchMs;
    let isMatchTimedOut = false;

    if (gameState.matchTimerStart) {
      const elapsed = now - gameState.matchTimerStart;
      matchTimeRemainingMs = Math.max(0, config.totalMatchMs - elapsed);
      isMatchTimedOut = matchTimeRemainingMs === 0;
    }

    // Check warning threshold
    const isWarning = actionTimeRemainingMs > 0 && actionTimeRemainingMs <= config.warningAtMs;

    return {
      actionTimeRemainingMs,
      matchTimeRemainingMs,
      isWarning,
      isTimedOut,
      isMatchTimedOut,
    };
  },
});

/**
 * Get SEGOC queue status
 *
 * Returns information about the SEGOC (Simultaneous Effects Go On Chain) queue.
 *
 * @param lobbyId - The game lobby ID
 * @returns { hasItems: boolean, itemCount: number, nextItem?: SegocQueueItem }
 */
export const getSegocQueueStatus = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        hasItems: false,
        itemCount: 0,
        nextItem: undefined,
      };
    }

    const segocQueue = gameState.segocQueue || [];
    const hasItems = segocQueue.length > 0;
    const itemCount = segocQueue.length;

    // Get the next item (first in queue, sorted by segocOrder)
    const sortedQueue = [...segocQueue].sort((a, b) => a.segocOrder - b.segocOrder);
    const nextItem = sortedQueue[0];

    return {
      hasItems,
      itemCount,
      nextItem,
    };
  },
});

/**
 * Get current phase information
 *
 * Returns the current phase and available skip actions for the phase.
 *
 * @param lobbyId - The game lobby ID
 * @returns { currentPhase, availableSkips: string[], isInteractivePhase: boolean }
 */
export const getCurrentPhaseInfo = query({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      return {
        currentPhase: null,
        availableSkips: [],
        isInteractivePhase: false,
      };
    }

    const currentPhase = gameState.currentPhase || "draw";

    // Determine available skip actions based on current phase
    const availableSkips: string[] = [];

    switch (currentPhase) {
      case "main1":
        // From Main 1, can skip battle phase or skip to end
        availableSkips.push("skipBattlePhase", "skipToEndPhase");
        break;
      case "battle_start":
      case "battle":
      case "battle_end":
        // During battle, can skip to main2 or end
        availableSkips.push("skipBattlePhase", "skipToEndPhase");
        break;
      case "main2":
        // From Main 2, can skip to end
        availableSkips.push("skipMainPhase2");
        break;
      default:
        // No skips available for draw, standby, end phases
        break;
    }

    // Interactive phases where player makes decisions
    const interactivePhases = ["main1", "battle", "main2"];
    const isInteractivePhase = interactivePhases.includes(currentPhase);

    return {
      currentPhase,
      availableSkips,
      isInteractivePhase,
    };
  },
});

/**
 * Get game state by gameId string (internal - for API key auth)
 * Looks up the game by gameId string instead of lobbyId
 */
export const getGameStateForPlayerInternal = internalQuery({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // First, find the game state by gameId string
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      return null;
    }

    // Get the lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      return null;
    }

    // Verify user is in this game
    if (lobby.hostId !== args.userId && lobby.opponentId !== args.userId) {
      return null;
    }

    // Return null if game is not active
    if (lobby.status !== "active") {
      return null;
    }

    // Determine if user is host
    const isHost = lobby.hostId === args.userId;

    // Helper to fetch card data
    const getCardData = async (cardId: Id<"cardDefinitions">) => {
      return await ctx.db.get(cardId);
    };

    // Get player's hand with card data
    const myHandRaw = isHost ? gameState.hostHand : gameState.opponentHand;
    const myHandData = await Promise.all(
      myHandRaw.map(async (cardId) => await getCardData(cardId))
    );
    const myHand = myHandData.filter((c): c is Doc<"cardDefinitions"> => c !== null);

    // Get player's board with card data
    const myBoardRaw = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const myBoardData = await Promise.all(
      myBoardRaw.map(async (boardCard) => {
        const cardData = await getCardData(boardCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          currentAttack: boardCard.attack,
          currentDefense: boardCard.defense,
          position: boardCard.position,
          hasAttacked: boardCard.hasAttacked,
          isFaceDown: boardCard.isFaceDown,
        };
      })
    );
    const myBoard = myBoardData.filter(Boolean);

    // Get opponent's board with card data
    const opponentBoardRaw = isHost ? gameState.opponentBoard : gameState.hostBoard;
    const opponentBoardData = await Promise.all(
      opponentBoardRaw.map(async (boardCard) => {
        const cardData = await getCardData(boardCard.cardId);
        if (!cardData) return null;
        return {
          ...cardData,
          currentAttack: boardCard.attack,
          currentDefense: boardCard.defense,
          position: boardCard.position,
          hasAttacked: boardCard.hasAttacked,
          isFaceDown: boardCard.isFaceDown,
        };
      })
    );
    const opponentBoard = opponentBoardData.filter(Boolean);

    // Calculate timeout status
    const config = gameState.timeoutConfig || DEFAULT_TIMEOUT_CONFIG;
    const now = Date.now();

    let actionTimeRemainingMs = config.perActionMs;
    let isTimedOut = false;

    if (gameState.responseWindow?.expiresAt) {
      actionTimeRemainingMs = Math.max(0, gameState.responseWindow.expiresAt - now);
      isTimedOut = actionTimeRemainingMs === 0;
    }

    let matchTimeRemainingMs = config.totalMatchMs;
    let isMatchTimedOut = false;

    if (gameState.matchTimerStart) {
      const elapsed = now - gameState.matchTimerStart;
      matchTimeRemainingMs = Math.max(0, config.totalMatchMs - elapsed);
      isMatchTimedOut = matchTimeRemainingMs === 0;
    }

    const isWarning = actionTimeRemainingMs > 0 && actionTimeRemainingMs <= config.warningAtMs;

    return {
      lobbyId: lobby._id,
      gameId: gameState.gameId,
      currentPhase: gameState.currentPhase,
      turnNumber: gameState.turnNumber, // From gameState (single source of truth)
      currentTurnPlayerId: gameState.currentTurnPlayerId, // From gameState (single source of truth)
      hostId: lobby.hostId,
      opponentId: lobby.opponentId,
      myLifePoints: isHost ? gameState.hostLifePoints : gameState.opponentLifePoints,
      opponentLifePoints: isHost ? gameState.opponentLifePoints : gameState.hostLifePoints,
      hand: myHand,
      myBoard,
      opponentBoard,
      myDeckCount: isHost ? gameState.hostDeck?.length || 0 : gameState.opponentDeck?.length || 0,
      opponentDeckCount: isHost
        ? gameState.opponentDeck?.length || 0
        : gameState.hostDeck?.length || 0,
      myGraveyardCount: isHost
        ? gameState.hostGraveyard?.length || 0
        : gameState.opponentGraveyard?.length || 0,
      opponentGraveyardCount: isHost
        ? gameState.opponentGraveyard?.length || 0
        : gameState.hostGraveyard?.length || 0,
      opponentHandCount: isHost
        ? gameState.opponentHand?.length || 0
        : gameState.hostHand?.length || 0,
      normalSummonedThisTurn: isHost
        ? gameState.hostNormalSummonedThisTurn
        : gameState.opponentNormalSummonedThisTurn,
      // Timeout status
      timeoutStatus: {
        actionTimeRemainingMs,
        matchTimeRemainingMs,
        isWarning,
        isTimedOut,
        isMatchTimedOut,
      },
    };
  },
});
