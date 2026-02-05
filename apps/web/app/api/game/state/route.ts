import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { type ApiErrorResponse, authenticateRequest, isAuthError } from "../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side queries
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * GET /api/game/state
 *
 * Retrieves the current game state for a specific game lobby.
 * Requires API key authentication via Authorization header.
 *
 * Query parameters:
 * - ?lobbyId=xxx - The ID of the game lobby (required)
 *
 * Returns:
 * - 200: Complete game state object including player hands, boards, and metadata
 * - 400: Missing or invalid lobbyId parameter
 * - 401: Invalid or missing API key
 * - 404: Game not found or user is not in the game
 * - 500: Server error
 *
 * Response format on success:
 * {
 *   success: true,
 *   gameState: { ... full game state object ... }
 * }
 *
 * Response format on error:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     details: Record<string, unknown>
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate the request using API key
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const { userId } = authResult.data;

    // Extract and validate lobbyId query parameter
    const url = new URL(req.url);
    const lobbyId = url.searchParams.get("lobbyId");

    if (!lobbyId) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "MISSING_LOBBY_ID",
          message: "Missing required query parameter: lobbyId",
          details: {
            hint: "Include ?lobbyId=xxx in the request URL",
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Validate lobbyId format (should be a valid Convex ID)
    if (typeof lobbyId !== "string" || lobbyId.length === 0) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "INVALID_LOBBY_ID",
          message: "Invalid lobbyId format",
          details: {
            receivedLobbyId: lobbyId,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // First, fetch the lobby to get the gameId
    let lobby: { gameId?: string; hostId: Id<"users">; opponentId?: Id<"users">; status: string };
    try {
      lobby = await convex.query(api.gameplay.games.getLobbyDetails, {
        lobbyId: lobbyId as Id<"gameLobbies">,
      });
    } catch (error) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "LOBBY_NOT_FOUND",
          message: "Game lobby not found",
          details: {
            lobbyId,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Verify user is in this game
    if (lobby.hostId !== userId && lobby.opponentId !== userId) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "You are not authorized to access this game",
          details: {
            lobbyId,
            reason: "User is neither host nor opponent",
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Get the gameId from the lobby
    const gameId = lobby.gameId;
    if (!gameId) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "GAME_NOT_STARTED",
          message: "Game has not been started yet",
          details: {
            lobbyId,
            status: lobby.status,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Fetch game state from Convex using internal query (API key auth path)
    const gameState = await convex.query(api.gameplay.games.getGameStateForPlayerInternal, {
      gameId,
      userId: userId as Id<"users">,
    });

    // Handle case where game state not found or user not authorized
    if (!gameState) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: {
          code: "GAME_NOT_FOUND",
          message: "Game state not found or you are not authorized to access this game",
          details: {
            lobbyId,
            gameId,
          },
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Return successful response with game state
    return NextResponse.json({
      success: true,
      gameState,
    });
  } catch (error) {
    console.error("Failed to fetch game state:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An error occurred while fetching the game state",
        details: {
          error: errorMessage,
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
