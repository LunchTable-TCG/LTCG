/**
 * Matchmaking API Endpoints
 *
 * Handles lobby creation, joining, leaving, and browsing available games.
 * Used by ElizaOS agents to find and join games.
 */

import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";
import {
  authHttpAction,
  type AuthenticatedRequest,
} from "./middleware/auth";
import {
  successResponse,
  errorResponse,
  parseJsonBody,
  validateRequiredFields,
  getQueryParam,
  corsPreflightResponse,
} from "./middleware/responses";

/**
 * POST /api/agents/matchmaking/enter
 * Create a lobby and enter matchmaking
 * Requires API key authentication
 */
export const enter = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      deckId: string;
      mode: "casual" | "ranked";
      maxRatingDiff?: number;
      isPrivate?: boolean;
    }>(request);

    if (body instanceof Response) return body;

    // Validate required fields
    const validation = validateRequiredFields(body, ["deckId", "mode"]);
    if (validation) return validation;

    // Create lobby
    const lobby = await ctx.runMutation(api.gameplay.games.lobby.createLobby, {
      deckId: body.deckId as any, // Cast to Id type
      mode: body.mode,
      maxRatingDiff: body.maxRatingDiff,
      isPrivate: body.isPrivate || false,
    });

    return successResponse(
      {
        lobbyId: lobby._id,
        joinCode: lobby.joinCode || null,
        status: lobby.status,
        mode: lobby.mode,
        createdAt: lobby.createdAt,
      },
      201 // Created
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("already in a lobby")) {
        return errorResponse(
          "ALREADY_IN_LOBBY",
          "You are already in an active lobby",
          409
        );
      }
      if (error.message.includes("deck not found")) {
        return errorResponse("DECK_NOT_FOUND", "Deck not found", 404);
      }
      if (error.message.includes("invalid deck")) {
        return errorResponse(
          "INVALID_DECK",
          "Deck is invalid (must be 40-60 cards)",
          400
        );
      }
    }

    return errorResponse(
      "CREATE_LOBBY_FAILED",
      "Failed to create lobby",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * GET /api/agents/matchmaking/lobbies
 * List available lobbies to join
 * Requires API key authentication
 */
export const lobbies = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const modeParam = getQueryParam(request, "mode");
    const mode = (modeParam || "all") as "casual" | "ranked" | "all";

    // Get user rating for ranked matchmaking
    const user = await ctx.runQuery(api.core.users.getUser, {
      userId: auth.userId,
    });

    const userRating = user?.rankedElo || 1000;

    // List waiting lobbies
    const waitingLobbies = await ctx.runQuery(
      api.gameplay.games.queries.listWaitingLobbies,
      {
        mode,
        userRating,
      }
    );

    // Format lobby data
    const formattedLobbies = waitingLobbies.map((lobby) => ({
      lobbyId: lobby._id,
      host: {
        username: lobby.hostUsername,
        rating: lobby.hostRating,
      },
      mode: lobby.mode,
      deckArchetype: lobby.deckArchetype,
      createdAt: lobby.createdAt,
      ratingWindow: lobby.maxRatingDiff || null,
      canJoin: true, // TODO: Add eligibility check
    }));

    return successResponse({
      lobbies: formattedLobbies,
      count: formattedLobbies.length,
    });
  } catch (error) {
    return errorResponse(
      "FETCH_LOBBIES_FAILED",
      "Failed to fetch lobbies",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/matchmaking/join
 * Join an existing lobby
 * Requires API key authentication
 */
export const join = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      lobbyId?: string;
      joinCode?: string;
      deckId: string;
    }>(request);

    if (body instanceof Response) return body;

    // Must provide either lobbyId or joinCode
    if (!body.lobbyId && !body.joinCode) {
      return errorResponse(
        "MISSING_LOBBY_IDENTIFIER",
        "Either lobbyId or joinCode must be provided",
        400
      );
    }

    // Validate deckId
    const validation = validateRequiredFields(body, ["deckId"]);
    if (validation) return validation;

    // Join lobby
    let result;

    if (body.joinCode) {
      result = await ctx.runMutation(
        api.gameplay.games.lobby.joinLobbyByCode,
        {
          joinCode: body.joinCode,
          deckId: body.deckId as any,
        }
      );
    } else {
      result = await ctx.runMutation(api.gameplay.games.lobby.joinLobby, {
        lobbyId: body.lobbyId as any,
        deckId: body.deckId as any,
      });
    }

    // Game should be initialized now
    return successResponse({
      gameId: result.lobbyId,
      lobbyId: result.lobbyId,
      opponent: {
        username: result.opponentUsername,
      },
      mode: result.mode,
      status: "active",
      message: "Game started!",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("lobby not found")) {
        return errorResponse("LOBBY_NOT_FOUND", "Lobby not found", 404);
      }
      if (error.message.includes("lobby is full")) {
        return errorResponse("LOBBY_FULL", "Lobby is already full", 409);
      }
      if (error.message.includes("already in a lobby")) {
        return errorResponse(
          "ALREADY_IN_LOBBY",
          "You are already in an active lobby",
          409
        );
      }
      if (error.message.includes("deck not found")) {
        return errorResponse("DECK_NOT_FOUND", "Deck not found", 404);
      }
      if (error.message.includes("rating difference")) {
        return errorResponse(
          "RATING_MISMATCH",
          "Your rating is outside the acceptable range for this lobby",
          403
        );
      }
    }

    return errorResponse(
      "JOIN_LOBBY_FAILED",
      "Failed to join lobby",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * POST /api/agents/matchmaking/leave
 * Leave/cancel current lobby
 * Requires API key authentication
 */
export const leave = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      lobbyId: string;
    }>(request);

    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["lobbyId"]);
    if (validation) return validation;

    // Cancel lobby
    await ctx.runMutation(api.gameplay.games.lobby.cancelLobby, {
      lobbyId: body.lobbyId as any,
    });

    return successResponse({
      message: "Successfully left lobby",
      lobbyId: body.lobbyId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("lobby not found")) {
        return errorResponse("LOBBY_NOT_FOUND", "Lobby not found", 404);
      }
      if (error.message.includes("not the host")) {
        return errorResponse(
          "NOT_LOBBY_HOST",
          "Only the lobby host can cancel",
          403
        );
      }
      if (error.message.includes("game already started")) {
        return errorResponse(
          "GAME_STARTED",
          "Cannot leave lobby after game has started. Use surrender endpoint instead.",
          409
        );
      }
    }

    return errorResponse(
      "LEAVE_LOBBY_FAILED",
      "Failed to leave lobby",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});
