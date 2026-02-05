import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { type ApiErrorResponse, authenticateRequest, isAuthError } from "../../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side queries
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * GET /api/game/chain/state
 *
 * Retrieves the current chain state for a specific game lobby.
 * Returns all chain links with enriched card and player information.
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Query parameters:
 * - ?lobbyId=xxx - The ID of the game lobby (required)
 *
 * Returns:
 * - 200: Chain state with array of chain links and current priority player
 * - 400: Missing or invalid lobbyId parameter
 * - 401: Invalid or missing API key
 * - 404: Lobby not found
 * - 500: Server error
 *
 * Response format on success:
 * {
 *   success: true,
 *   chain: [
 *     {
 *       chainLink: number,
 *       cardId: string,
 *       cardName: string,
 *       playerId: string,
 *       playerName: string,
 *       spellSpeed: number,
 *       effect: string
 *     },
 *     ...
 *   ],
 *   priorityPlayer: string | null
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

    // Fetch chain state from Convex using getCurrentChain query
    const chainState = await convex.query(api.gameplay.chainResolver.getCurrentChain, {
      lobbyId: lobbyId as Id<"gameLobbies">,
    });

    // Return successful response with chain state
    return NextResponse.json({
      success: true,
      chain: chainState.chain,
      priorityPlayer: chainState.priorityPlayer,
    });
  } catch (error) {
    console.error("Failed to fetch chain state:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns
      if (errorMessage.includes("Lobby not found") || errorMessage.includes("NOT_FOUND")) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: {
            code: "NOT_FOUND_LOBBY",
            message: "Lobby not found",
            details: {
              error: errorMessage,
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
    }

    // Generic error response
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An error occurred while fetching the chain state",
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
