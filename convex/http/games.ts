/**
 * Game State API Endpoints
 *
 * Provides read-only access to game state, pending turns, available actions, and game history.
 * Game action mutations are in separate files for better organization.
 */

// Import at runtime only (not for type checking) to avoid TS2589
const api: any = require("../_generated/api").api;
const internal: any = require("../_generated/api").internal;
import {
  authHttpAction,
} from "./middleware/auth";
import {
  successResponse,
  errorResponse,
  getQueryParam,
  corsPreflightResponse,
  parseJsonBody,
  validateRequiredFields,
} from "./middleware/responses";

// Query mapping to avoid dynamic code generation (not allowed in Convex runtime)
const queryMap: Record<string, any> = {
  "gameplay.games.queries.getActiveLobby": api.gameplay.games.queries.getActiveLobby,
  "gameplay.games.queries.getGameStateForPlayer": api.gameplay.games.queries.getGameStateForPlayer,
  "gameplay.gameEvents.getGameEvents": api.gameplay.gameEvents.getGameEvents,
  // Internal queries for API key auth
  "gameplay.games.queries.getGameStateForPlayerInternal": internal.gameplay.games.queries.getGameStateForPlayerInternal,
};

// Helper to run queries using the mapping
async function runGameQuery(ctx: any, path: string, args: any): Promise<any> {
  const query = queryMap[path];
  if (!query) {
    throw new Error(`Query not found in mapping: ${path}`);
  }
  return await ctx.runQuery(query, args);
}

/**
 * GET /api/agents/pending-turns
 * Get all games where it's the agent's turn
 * Requires API key authentication
 */
export const pendingTurns = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Query all active game lobbies where user is a player
    const activeLobby: any = await runGameQuery(ctx, "gameplay.games.queries.getActiveLobby", { userId: auth.userId });

    if (!activeLobby) {
      return successResponse([]);
    }

    // Get game state to check whose turn it is
    const getGameStateArgs = { lobbyId: activeLobby._id, userId: auth.userId };
    const gameState: any = await runGameQuery(ctx, "gameplay.games.queries.getGameStateForPlayer", getGameStateArgs);

    if (!gameState) {
      return successResponse([]);
    }

    // Check if it's the agent's turn
    const isMyTurn = gameState.currentTurnPlayerId === auth.userId;

    if (!isMyTurn) {
      return successResponse([]);
    }

    // Return game info with current phase
    return successResponse([
      {
        gameId: gameState.gameId,
        lobbyId: activeLobby._id,
        currentPhase: gameState.currentPhase,
        turnNumber: gameState.turnNumber,
        opponent: {
          username: gameState.isHost
            ? activeLobby.opponentUsername
            : activeLobby.hostUsername,
        },
        timeRemaining: null, // TODO: Calculate from timeout system
      },
    ]);
  } catch (error) {
    return errorResponse(
      "FETCH_PENDING_TURNS_FAILED",
      "Failed to fetch pending turns",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * GET /api/agents/games/state?gameId={id}
 * Get complete game state for a specific game
 * Requires API key authentication
 */
export const gameState = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const gameId = getQueryParam(request, "gameId");

    if (!gameId) {
      return errorResponse(
        "MISSING_GAME_ID",
        "gameId query parameter is required",
        400
      );
    }

    // Get game state using internal query that accepts gameId string
    const getStateArgs = { gameId, userId: auth.userId };
    const state: any = await runGameQuery(ctx, "gameplay.games.queries.getGameStateForPlayerInternal", getStateArgs);

    if (!state) {
      return errorResponse("GAME_NOT_FOUND", "Game not found", 404);
    }

    // Return formatted game state
    return successResponse({
      gameId: state.gameId,
      lobbyId: state.lobbyId,
      phase: state.currentPhase,
      turnNumber: state.turnNumber,
      currentTurnPlayer: state.currentTurnPlayerId,
      isMyTurn: state.currentTurnPlayerId === auth.userId,
      myLifePoints: state.myLifePoints,
      opponentLifePoints: state.opponentLifePoints,
      hand: state.hand,
      myBoard: state.myBoard,
      opponentBoard: state.opponentBoard,
      myDeckCount: state.myDeckCount,
      opponentDeckCount: state.opponentDeckCount,
      myGraveyardCount: state.myGraveyardCount,
      opponentGraveyardCount: state.opponentGraveyardCount,
      opponentHandCount: state.opponentHandCount,
      normalSummonedThisTurn: state.normalSummonedThisTurn,
    });
  } catch (error) {
    return errorResponse(
      "FETCH_GAME_STATE_FAILED",
      "Failed to fetch game state",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * GET /api/agents/games/available-actions?gameId={id}
 * Get array of legal actions the agent can currently take
 * Requires API key authentication
 */
export const availableActions = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const gameId = getQueryParam(request, "gameId");

    if (!gameId) {
      return errorResponse(
        "MISSING_GAME_ID",
        "gameId query parameter is required",
        400
      );
    }

    // Get game state using internal query that accepts gameId string
    const getStateArgs = { gameId, userId: auth.userId };
    const state: any = await runGameQuery(ctx, "gameplay.games.queries.getGameStateForPlayerInternal", getStateArgs);

    if (!state) {
      return errorResponse("GAME_NOT_FOUND", "Game not found", 404);
    }

    // Verify it's agent's turn
    if (state.currentTurnPlayerId !== auth.userId) {
      return successResponse({
        actions: [],
        reason: "Not your turn",
      });
    }

    // Build available actions based on phase and game state
    const actions = [];

    const phase = state.currentPhase;

    // Always can end turn (except draw phase)
    if (phase !== "draw") {
      actions.push({
        action: "END_TURN",
        description: "End your turn",
      });
    }

    // Main phase actions
    // Note: myBoard is an array of monsters on the field (from internal query)
    const myMonsters = state.myBoard || [];
    const mySpellTraps = state.mySpellTrapZone || [];

    if (phase === "main1" || phase === "main2") {
      // Can summon if haven't already
      if (!state.normalSummonedThisTurn) {
        // Use cardType (not type) to match the schema
        const summonableMonsters = state.hand.filter(
          (card: any) => card.cardType === "creature" && (card.cost || 0) <= 4
        );
        if (summonableMonsters.length > 0) {
          actions.push({
            action: "NORMAL_SUMMON",
            description: "Summon a monster from hand",
            availableCards: summonableMonsters.map((c: any) => c._id),
          });
        }
      }

      // Can set cards
      actions.push({
        action: "SET_CARD",
        description: "Set a card face-down",
      });

      // Can activate spells
      const spellsInHand = state.hand.filter((card: any) => card.cardType === "spell");
      if (spellsInHand.length > 0) {
        actions.push({
          action: "ACTIVATE_SPELL",
          description: "Activate a spell card",
          availableCards: spellsInHand.map((c: any) => c._id),
        });
      }

      // Can enter battle phase from main1 if we have monsters
      if (phase === "main1" && myMonsters.length > 0) {
        const attackableMonsters = myMonsters.filter(
          (m: any) => m && !m.isFaceDown && m.position === 1 && !m.hasAttacked
        );
        if (attackableMonsters.length > 0) {
          actions.push({
            action: "ENTER_BATTLE_PHASE",
            description: "Enter Battle Phase to attack",
            attackableMonsters: attackableMonsters.length,
          });
        }
      }

      // Can flip summon face-down monsters
      const faceDownMonsters = myMonsters.filter(
        (monster: any) => monster && monster.isFaceDown
      );
      if (faceDownMonsters.length > 0) {
        actions.push({
          action: "FLIP_SUMMON",
          description: "Flip summon a face-down monster",
        });
      }

      // Can change positions
      const monstersCanChangePosition = myMonsters.filter(
        (monster: any) => monster && !monster.isFaceDown && !monster.hasChangedPosition
      );
      if (monstersCanChangePosition.length > 0) {
        actions.push({
          action: "CHANGE_POSITION",
          description: "Change monster battle position",
        });
      }
    }

    // Battle phase actions
    if (phase === "battle") {
      const monstersCanAttack = myMonsters.filter(
        (monster: any) =>
          monster &&
          !monster.isFaceDown &&
          !monster.hasAttacked &&
          monster.position === 1 // attack position
      );

      if (monstersCanAttack.length > 0) {
        actions.push({
          action: "ATTACK",
          description: "Attack with a monster",
          availableMonsters: monstersCanAttack.length,
        });
      }
    }

    // Can activate traps anytime
    const setTraps = mySpellTraps.filter(
      (card: any) => card && card.isFaceDown && card.cardType === "trap"
    );
    if (setTraps.length > 0) {
      actions.push({
        action: "ACTIVATE_TRAP",
        description: "Activate a trap card",
      });
    }

    // Chain response
    if (state.chainState && state.chainState.waitingForResponse) {
      actions.push({
        action: "CHAIN_RESPONSE",
        description: "Respond to chain",
        chainLink: state.chainState.currentChain.length,
      });
    }

    return successResponse({
      actions,
      phase: state.currentPhase,
      turnNumber: state.turnNumber,
    });
  } catch (error) {
    return errorResponse(
      "FETCH_ACTIONS_FAILED",
      "Failed to fetch available actions",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * GET /api/agents/games/history?gameId={id}
 * Get chronological event log for a game
 * Requires API key authentication
 */
export const gameHistory = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const gameId = getQueryParam(request, "gameId");
    const limitParam = getQueryParam(request, "limit");
    const offsetParam = getQueryParam(request, "offset");

    if (!gameId) {
      return errorResponse(
        "MISSING_GAME_ID",
        "gameId query parameter is required",
        400
      );
    }

    const limit = limitParam ? parseInt(limitParam) : 50;
    const offset = offsetParam ? parseInt(offsetParam) : 0;

    // Get game events
    const getEventsArgs = { lobbyId: gameId as any, limit, offset };
    const events: any = await runGameQuery(ctx, "gameplay.gameEvents.getGameEvents", getEventsArgs);

    return successResponse({
      events,
      count: events.length,
      limit,
      offset,
    });
  } catch (error) {
    return errorResponse(
      "FETCH_HISTORY_FAILED",
      "Failed to fetch game history",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/summon
 * Normal summon a monster from hand to the field
 * Requires API key authentication
 */
export const summonMonster = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
      position: "attack" | "defense";
      tributeCardIds?: string[];
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId", "position"]);
    if (validation) return validation;

    // Validate position value
    if (body.position !== "attack" && body.position !== "defense") {
      return errorResponse(
        "INVALID_POSITION",
        'Position must be "attack" or "defense"',
        400
      );
    }

    // Execute summon via internal mutation that accepts gameId string
    const result: any = await ctx.runMutation(
      internal.gameplay.gameEngine.summons.normalSummonInternal,
      {
        gameId: body.gameId,
        userId: auth.userId,
        cardId: body.cardId,
        position: body.position,
        tributeCardIds: body.tributeCardIds,
      }
    );

    return successResponse({
      success: true,
      cardSummoned: result.cardSummoned,
      position: result.position,
      tributesUsed: result.tributesUsed,
      triggerEffect: result.triggerEffect,
    });
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific game rule errors
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("already summoned")) {
        return errorResponse(
          "ALREADY_SUMMONED",
          "You have already Normal Summoned this turn",
          400
        );
      }
      if (error.message.includes("requires") && error.message.includes("tribute")) {
        return errorResponse(
          "INSUFFICIENT_TRIBUTES",
          "Monster requires tributes to summon",
          400
        );
      }
      if (error.message.includes("INVALID_MOVE")) {
        return errorResponse("INVALID_MOVE", error.message, 400);
      }
    }

    return errorResponse(
      "SUMMON_FAILED",
      "Failed to summon monster",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/set-card
 * Set a monster face-down in Defense Position
 * Requires API key authentication
 */
export const setCard = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
      tributeCardIds?: string[];
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId"]);
    if (validation) return validation;

    // Execute set via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.summons.setMonster,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
        tributeCardIds: body.tributeCardIds as any,
      }
    );

    return successResponse({
      success: true,
      cardSet: result.cardSet,
      tributesUsed: result.tributesUsed,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("already summoned")) {
        return errorResponse(
          "ALREADY_SUMMONED",
          "You have already Normal Summoned/Set this turn",
          400
        );
      }
      if (error.message.includes("requires") && error.message.includes("tribute")) {
        return errorResponse(
          "INSUFFICIENT_TRIBUTES",
          "Monster requires tributes to set",
          400
        );
      }
      if (error.message.includes("INVALID_MOVE")) {
        return errorResponse("INVALID_MOVE", error.message, 400);
      }
    }

    return errorResponse(
      "SET_CARD_FAILED",
      "Failed to set card",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/flip-summon
 * Flip a face-down monster to face-up position
 * Requires API key authentication
 */
export const flipSummonMonster = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
      newPosition: "attack" | "defense";
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId", "newPosition"]);
    if (validation) return validation;

    // Validate position value
    if (body.newPosition !== "attack" && body.newPosition !== "defense") {
      return errorResponse(
        "INVALID_POSITION",
        'Position must be "attack" or "defense"',
        400
      );
    }

    // Execute flip summon via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.summons.flipSummon,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
        newPosition: body.newPosition,
      }
    );

    return successResponse({
      success: true,
      cardFlipped: result.cardFlipped,
      position: result.position,
      flipEffect: result.flipEffect,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("Cannot flip summon") || error.message.includes("just set")) {
        return errorResponse(
          "CANNOT_FLIP_THIS_TURN",
          "Cannot flip summon a monster that was just set this turn",
          400
        );
      }
      if (error.message.includes("INVALID_MOVE")) {
        return errorResponse("INVALID_MOVE", error.message, 400);
      }
    }

    return errorResponse(
      "FLIP_SUMMON_FAILED",
      "Failed to flip summon monster",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/change-position
 * Change monster position (Attack ↔ Defense)
 * Requires API key authentication
 */
export const changeMonsterPosition = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId"]);
    if (validation) return validation;

    // Execute position change via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.positions.changePosition,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
      }
    );

    return successResponse({
      success: true,
      cardName: result.cardName,
      newPosition: result.newPosition,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("Cannot change position") || error.message.includes("Battle Phase")) {
        return errorResponse(
          "CANNOT_CHANGE_POSITION",
          "Cannot change monster position during Battle Phase",
          400
        );
      }
      if (error.message.includes("already changed position")) {
        return errorResponse(
          "ALREADY_CHANGED_POSITION",
          "This monster has already changed position this turn",
          400
        );
      }
      if (error.message.includes("INVALID_MOVE")) {
        return errorResponse("INVALID_MOVE", error.message, 400);
      }
    }

    return errorResponse(
      "CHANGE_POSITION_FAILED",
      "Failed to change monster position",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/set-spell-trap
 * Set a Spell or Trap card face-down
 * Requires API key authentication
 */
export const setSpellTrapCard = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId"]);
    if (validation) return validation;

    // Execute set via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.spellsTraps.setSpellTrap,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
      }
    );

    return successResponse({
      success: true,
      cardType: result.cardType,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("ZONE_FULL") || error.message.includes("full")) {
        return errorResponse(
          "ZONE_FULL",
          "Spell/Trap Zone is full (max 5 cards)",
          400
        );
      }
      if (error.message.includes("INVALID_CARD_TYPE")) {
        return errorResponse(
          "INVALID_CARD_TYPE",
          "Card must be a spell or trap",
          400
        );
      }
    }

    return errorResponse(
      "SET_SPELL_TRAP_FAILED",
      "Failed to set spell/trap card",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/activate-spell
 * Activate a Spell card from hand or field
 * Requires API key authentication
 */
export const activateSpellCard = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
      targets?: string[];
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId"]);
    if (validation) return validation;

    // Execute spell activation via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.spellsTraps.activateSpell,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
        targets: body.targets as any,
      }
    );

    return successResponse({
      success: true,
      spellName: result.spellName,
      chainStarted: result.chainStarted,
      chainLinkNumber: result.chainLinkNumber,
      currentChainLength: result.currentChainLength,
      priorityPassed: result.priorityPassed,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("INVALID_PHASE") || error.message.includes("Main Phase")) {
        return errorResponse(
          "INVALID_PHASE",
          "Can only activate Normal Spells during Main Phase",
          400
        );
      }
      if (error.message.includes("INVALID_CARD_TYPE") || error.message.includes("not a spell")) {
        return errorResponse(
          "INVALID_CARD_TYPE",
          "Card is not a spell card",
          400
        );
      }
      if (error.message.includes("CARD_NOT_IN_ZONE")) {
        return errorResponse(
          "CARD_NOT_IN_ZONE",
          "Card is not in your hand or spell/trap zone",
          400
        );
      }
    }

    return errorResponse(
      "ACTIVATE_SPELL_FAILED",
      "Failed to activate spell",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/activate-trap
 * Activate a face-down Trap card from field
 * Requires API key authentication
 */
export const activateTrapCard = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      cardId: string;
      targets?: string[];
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "cardId"]);
    if (validation) return validation;

    // Execute trap activation via game engine
    const result: any = await ctx.runMutation(
      (api as any).gameplay.gameEngine.spellsTraps.activateTrap,
      {
        lobbyId: body.gameId as any,
        cardId: body.cardId as any,
        targets: body.targets as any,
      }
    );

    return successResponse({
      success: true,
      trapName: result.trapName,
      chainStarted: result.chainStarted,
      chainLinkNumber: result.chainLinkNumber,
      currentChainLength: result.currentChainLength,
      priorityPassed: result.priorityPassed,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("TRAP_SAME_TURN") || error.message.includes("at least 1 turn")) {
        return errorResponse(
          "TRAP_NOT_READY",
          "Trap must be set for at least 1 full turn before activation",
          400
        );
      }
      if (error.message.includes("INVALID_CARD_TYPE") || error.message.includes("not a trap")) {
        return errorResponse(
          "INVALID_CARD_TYPE",
          "Card is not a trap card",
          400
        );
      }
      if (error.message.includes("CARD_NOT_IN_ZONE") || error.message.includes("not set on your field")) {
        return errorResponse(
          "CARD_NOT_IN_ZONE",
          "Trap card is not set on your field",
          400
        );
      }
      if (error.message.includes("CARD_ALREADY_FACE_UP")) {
        return errorResponse(
          "CARD_ALREADY_FACE_UP",
          "Trap card is already face-up",
          400
        );
      }
    }

    return errorResponse(
      "ACTIVATE_TRAP_FAILED",
      "Failed to activate trap",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/chain-response
 * Respond to chain by passing priority or adding a card
 * Requires API key authentication
 */
export const chainResponse = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      pass: boolean; // If true, pass priority. If false, must provide cardId
      cardId?: string;
      targets?: string[];
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "pass"]);
    if (validation) return validation;

    if (body.pass) {
      // Pass priority - decline to respond to chain
      const result: any = await ctx.runMutation(
        (api as any).gameplay.chainResolver.passPriority,
        {
          lobbyId: body.gameId as any,
        }
      );

      return successResponse({
        success: true,
        action: "passed_priority",
        priorityHolder: result.priorityHolder,
        chainResolved: result.chainResolved || false,
      });
    } else {
      // Respond with a card (Quick-Play Spell or Trap)
      if (!body.cardId) {
        return errorResponse(
          "MISSING_CARD_ID",
          "cardId is required when pass is false",
          400
        );
      }

      // For simplicity, agents should use activate-spell or activate-trap endpoints
      // This is just a pass-through for chain responses
      return errorResponse(
        "USE_ACTIVATE_ENDPOINT",
        "Use activate-spell or activate-trap endpoint to respond to chain",
        400,
        {
          hint: "Set pass=true to decline response, or use activate-trap endpoint",
        }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NO_CHAIN")) {
        return errorResponse(
          "NO_CHAIN",
          "No chain to respond to",
          400
        );
      }
      if (error.message.includes("NOT_YOUR_TURN") || error.message.includes("priority")) {
        return errorResponse(
          "NOT_YOUR_PRIORITY",
          "You don't have priority to respond",
          403
        );
      }
    }

    return errorResponse(
      "CHAIN_RESPONSE_FAILED",
      "Failed to respond to chain",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/attack
 * Declare an attack with a monster
 * Requires API key authentication
 */
export const attackMonster = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
      attackerCardId: string;
      targetCardId?: string; // undefined = direct attack
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId", "attackerCardId"]);
    if (validation) return validation;

    // Execute attack via internal mutation
    const result: any = await ctx.runMutation(
      internal.gameplay.combatSystem.declareAttackInternal,
      {
        gameId: body.gameId,
        userId: auth.userId,
        attackerCardId: body.attackerCardId,
        targetCardId: body.targetCardId,
      }
    );

    return successResponse({
      success: true,
      attackType: result.attackType,
      attackerName: result.attackerName,
      targetName: result.targetName,
      damage: result.damage,
      destroyed: result.destroyed,
      newLifePoints: result.newLifePoints,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("INVALID_PHASE") || error.message.includes("Battle Phase")) {
        return errorResponse(
          "INVALID_PHASE",
          "Can only attack during Battle Phase",
          400
        );
      }
      if (error.message.includes("already attacked")) {
        return errorResponse(
          "ALREADY_ATTACKED",
          "This monster has already attacked this turn",
          400
        );
      }
      if (error.message.includes("Attack Position")) {
        return errorResponse(
          "WRONG_POSITION",
          "Monster must be in Attack Position to attack",
          400
        );
      }
      if (error.message.includes("not found on your field")) {
        return errorResponse(
          "CARD_NOT_FOUND",
          "Attacker not found on your field",
          400
        );
      }
    }

    return errorResponse(
      "ATTACK_FAILED",
      "Failed to declare attack",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/enter-battle
 * Enter Battle Phase from Main Phase 1
 * Requires API key authentication
 */
export const enterBattlePhase = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId"]);
    if (validation) return validation;

    // Look up game state
    const getStateArgs = { gameId: body.gameId, userId: auth.userId };
    const state: any = await runGameQuery(ctx, "gameplay.games.queries.getGameStateForPlayerInternal", getStateArgs);

    if (!state) {
      return errorResponse("GAME_NOT_FOUND", "Game not found", 404);
    }

    // Verify it's the player's turn
    if (state.currentTurnPlayerId !== auth.userId) {
      return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
    }

    // Verify we're in main1
    if (state.currentPhase !== "main1") {
      return errorResponse(
        "INVALID_PHASE",
        "Can only enter Battle Phase from Main Phase 1",
        400
      );
    }

    // Update phase to battle
    await ctx.runMutation(
      internal.gameplay.gameEngine.phases.advanceToBattlePhaseInternal,
      {
        gameId: body.gameId,
        userId: auth.userId,
      }
    );

    return successResponse({
      success: true,
      phase: "battle",
      message: "Entered Battle Phase",
    });
  } catch (error) {
    return errorResponse(
      "PHASE_CHANGE_FAILED",
      "Failed to enter Battle Phase",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/enter-main2
 * Enter Main Phase 2 from Battle Phase
 * Requires API key authentication
 */
export const enterMain2 = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId"]);
    if (validation) return validation;

    // Look up game state
    const getStateArgs = { gameId: body.gameId, userId: auth.userId };
    const state: any = await runGameQuery(ctx, "gameplay.games.queries.getGameStateForPlayerInternal", getStateArgs);

    if (!state) {
      return errorResponse("GAME_NOT_FOUND", "Game not found", 404);
    }

    // Verify it's the player's turn
    if (state.currentTurnPlayerId !== auth.userId) {
      return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
    }

    // Verify we're in battle phase
    if (state.currentPhase !== "battle") {
      return errorResponse(
        "INVALID_PHASE",
        "Can only enter Main Phase 2 from Battle Phase",
        400
      );
    }

    // Update phase to main2
    await ctx.runMutation(
      internal.gameplay.gameEngine.phases.advanceToMainPhase2Internal,
      {
        gameId: body.gameId,
        userId: auth.userId,
      }
    );

    return successResponse({
      success: true,
      phase: "main2",
      message: "Entered Main Phase 2",
    });
  } catch (error) {
    return errorResponse(
      "PHASE_CHANGE_FAILED",
      "Failed to enter Main Phase 2",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/end-turn
 * End your turn and pass to opponent
 * Requires API key authentication
 */
export const endPlayerTurn = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId"]);
    if (validation) return validation;

    // Execute end turn via internal mutation that accepts gameId string
    const result: any = await ctx.runMutation(
      internal.gameplay.gameEngine.turns.endTurnInternal,
      {
        gameId: body.gameId,
        userId: auth.userId,
      }
    );

    return successResponse({
      success: true,
      gameEnded: result.gameEnded || false,
      winnerId: result.winnerId,
      newTurnPlayer: result.newTurnPlayer,
      newTurnNumber: result.newTurnNumber,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("NOT_YOUR_TURN")) {
        return errorResponse("NOT_YOUR_TURN", "It's not your turn", 403);
      }
      if (error.message.includes("INVALID_PHASE") || error.message.includes("Main Phase 2 or End Phase")) {
        return errorResponse(
          "INVALID_PHASE",
          "Must be in Main Phase 2 or End Phase to end turn",
          400
        );
      }
    }

    return errorResponse(
      "END_TURN_FAILED",
      "Failed to end turn",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/games/actions/surrender
 * Surrender the game (forfeit)
 * Requires API key authentication
 */
export const surrenderGame = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["gameId"]);
    if (validation) return validation;

    // Execute surrender via game lifecycle
    await ctx.runMutation(
      (api as any).gameplay.games.lifecycle.surrenderGame,
      {
        lobbyId: body.gameId as any,
      }
    );

    return successResponse({
      success: true,
      gameEnded: true,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Game is not active")) {
        return errorResponse(
          "GAME_NOT_ACTIVE",
          "Game is not active",
          400
        );
      }
      if (error.message.includes("You are not in this game")) {
        return errorResponse(
          "NOT_IN_GAME",
          "You are not in this game",
          403
        );
      }
    }

    return errorResponse(
      "SURRENDER_FAILED",
      "Failed to surrender game",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});
