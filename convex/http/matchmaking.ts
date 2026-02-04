/**
 * Matchmaking API Endpoints
 *
 * Handles lobby creation, joining, leaving, and browsing available games.
 * Used by elizaOS agents to find and join games.
 */

import type { Id } from "../_generated/dataModel";
import type { LobbyInfo, MutationFunction, QueryFunction, User } from "./lib/apiHelpers";
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  getQueryParam,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";

// Type-safe API references to avoid TS2589
const createLobbyInternalMutation = require("../_generated/api").internal.gameplay.games.lobby
  .createLobbyInternal as MutationFunction<
  { userId: Id<"users">; mode: string; isPrivate: boolean },
  LobbyInfo
>;

const getUserQuery = require("../_generated/api").api.core.users.getUser as QueryFunction<
  { userId: Id<"users"> },
  User | null
>;

const listWaitingLobbiesQuery = require("../_generated/api").api.gameplay.games.queries
  .listWaitingLobbies as QueryFunction<{ mode: string; userRating: number }, LobbyInfo[]>;

const joinLobbyInternalMutation = require("../_generated/api").internal.gameplay.games.lobby
  .joinLobbyInternal as MutationFunction<
  { userId: Id<"users">; lobbyId: Id<"gameLobbies">; joinCode?: string },
  {
    gameId: Id<"gameStates">;
    lobbyId: Id<"gameLobbies">;
    opponentUsername: string;
    mode: string;
  }
>;

const cancelLobbyInternalMutation = require("../_generated/api").internal.gameplay.games.lobby
  .cancelLobbyInternal as MutationFunction<{ userId: Id<"users"> }, { lobbyId: Id<"gameLobbies"> }>;

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
      deckId?: string; // Optional - uses active deck if not provided
      mode: "casual" | "ranked";
      maxRatingDiff?: number;
      isPrivate?: boolean;
    }>(request);

    if (body instanceof Response) return body;

    // Validate required fields (deckId is optional - uses active deck)
    const validation = validateRequiredFields(body, ["mode"]);
    if (validation) return validation;

    // Create lobby using internal mutation with userId from API key auth
    const lobby = await ctx.runMutation(createLobbyInternalMutation, {
      userId: auth.userId,
      mode: body.mode,
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
        return errorResponse("ALREADY_IN_LOBBY", "You are already in an active lobby", 409);
      }
      if (error.message.includes("deck not found")) {
        return errorResponse("DECK_NOT_FOUND", "Deck not found", 404);
      }
      if (error.message.includes("invalid deck")) {
        return errorResponse("INVALID_DECK", "Deck is invalid (must be 40-60 cards)", 400);
      }
    }

    return errorResponse("CREATE_LOBBY_FAILED", "Failed to create lobby", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Check if a user is eligible to join a lobby
 * Returns eligibility status and reason if not eligible
 */
interface EligibilityResult {
  canJoin: boolean;
  reason?: string;
}

function checkEligibility(
  user: { rankedElo?: number; isBanned?: boolean; isSuspended?: boolean } | null,
  lobby: { mode: string; hostRating?: number; maxRatingDiff?: number }
): EligibilityResult {
  // Check if user exists
  if (!user) {
    return { canJoin: false, reason: "User not found" };
  }

  // Check if user is banned
  if (user.isBanned) {
    return { canJoin: false, reason: "Account is banned" };
  }

  // Check if user is suspended
  if (user.isSuspended) {
    return { canJoin: false, reason: "Account is suspended" };
  }

  // For ranked mode, check rating difference
  if (lobby.mode === "ranked" && lobby.hostRating !== undefined) {
    const userRating = user.rankedElo || 1000;
    const maxDiff = lobby.maxRatingDiff || 300; // Default 300 rating difference
    const ratingDiff = Math.abs(userRating - lobby.hostRating);

    if (ratingDiff > maxDiff) {
      return {
        canJoin: false,
        reason: `Rating difference too large (${ratingDiff} > ${maxDiff})`,
      };
    }
  }

  return { canJoin: true };
}

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

    // Get user data for eligibility checks
    const user = await ctx.runQuery(getUserQuery, {
      userId: auth.userId,
    });

    // Check if user is banned/suspended (early exit)
    if (user?.isBanned) {
      return errorResponse("ACCOUNT_BANNED", "Your account is banned from matchmaking", 403);
    }
    if (user?.isSuspended) {
      return errorResponse("ACCOUNT_SUSPENDED", "Your account is suspended from matchmaking", 403);
    }

    const userRating = user?.rankedElo || 1000;

    // List waiting lobbies
    const waitingLobbies = await ctx.runQuery(listWaitingLobbiesQuery, {
      mode,
      userRating,
    });

    // Format lobby data with eligibility check
    const formattedLobbies = waitingLobbies.map((lobby) => {
      const eligibility = checkEligibility(user, {
        mode: lobby.mode,
        hostRating: lobby.hostRating,
        maxRatingDiff: lobby.maxRatingDiff,
      });

      return {
        lobbyId: lobby._id,
        host: {
          username: lobby.hostUsername,
          rating: lobby.hostRating,
        },
        mode: lobby.mode,
        deckArchetype: lobby.deckArchetype,
        createdAt: lobby.createdAt,
        ratingWindow: lobby.maxRatingDiff || 300,
        canJoin: eligibility.canJoin,
        eligibilityReason: eligibility.reason || null,
      };
    });

    return successResponse({
      lobbies: formattedLobbies,
      count: formattedLobbies.length,
      eligibleCount: formattedLobbies.filter((l) => l.canJoin).length,
    });
  } catch (error) {
    return errorResponse("FETCH_LOBBIES_FAILED", "Failed to fetch lobbies", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
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

    // Join lobby using internal mutation with userId from API key auth
    // Note: joinCode is not yet supported in internal mutation, need to look up lobby first
    let lobbyId = body.lobbyId;

    if (body.joinCode && !lobbyId) {
      // Look up lobby by join code
      const lobbies = await ctx.runQuery(listWaitingLobbiesQuery, {
        mode: "all" as const,
        userRating: 1000,
      });
      const matchingLobby = lobbies.find((l) => l.joinCode === body.joinCode?.toUpperCase());
      if (!matchingLobby) {
        return errorResponse("LOBBY_NOT_FOUND", "Invalid or expired join code", 404);
      }
      lobbyId = matchingLobby._id;
    }

    if (!lobbyId) {
      return errorResponse("LOBBY_NOT_FOUND", "Lobby ID required", 400);
    }

    const result = await ctx.runMutation(joinLobbyInternalMutation, {
      userId: auth.userId,
      lobbyId: lobbyId as Id<"gameLobbies">,
      joinCode: body.joinCode,
    });

    // Game should be initialized now
    return successResponse({
      gameId: result.gameId,
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
        return errorResponse("ALREADY_IN_LOBBY", "You are already in an active lobby", 409);
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

    return errorResponse("JOIN_LOBBY_FAILED", "Failed to join lobby", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
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
    // Cancel lobby using internal mutation with userId from API key auth
    // Automatically finds the user's active waiting lobby
    const result = await ctx.runMutation(cancelLobbyInternalMutation, {
      userId: auth.userId,
    });

    return successResponse({
      message: "Successfully left lobby",
      lobbyId: result.lobbyId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("lobby not found")) {
        return errorResponse("LOBBY_NOT_FOUND", "Lobby not found", 404);
      }
      if (error.message.includes("not the host")) {
        return errorResponse("NOT_LOBBY_HOST", "Only the lobby host can cancel", 403);
      }
      if (error.message.includes("game already started")) {
        return errorResponse(
          "GAME_STARTED",
          "Cannot leave lobby after game has started. Use surrender endpoint instead.",
          409
        );
      }
    }

    return errorResponse("LEAVE_LOBBY_FAILED", "Failed to leave lobby", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
