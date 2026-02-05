import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import type { NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side queries
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * Success response structure for legal moves
 */
interface LegalMovesResponse {
  success: true;
  data: {
    canSummon: Array<{
      cardId: Id<"cardDefinitions">;
      cardName: string;
      level: number;
      attack: number;
      defense: number;
      requiresTributes: number;
      validTributes: Array<Id<"cardDefinitions">>;
    }>;
    canAttack: Array<{
      cardId: Id<"cardDefinitions">;
      cardName: string;
      attack: number;
      validTargets: Array<{
        cardId: Id<"cardDefinitions">;
        cardName: string;
        position: number;
      }>;
      canDirectAttack: boolean;
    }>;
    canSetSpellTrap: Array<{
      cardId: Id<"cardDefinitions">;
      cardName: string;
      cardType: string;
    }>;
    canActivateSpell: Array<{
      cardId: Id<"cardDefinitions">;
      cardName: string;
      isQuickPlay: boolean;
    }>;
    canChangePosition: Array<{
      cardId: Id<"cardDefinitions">;
      cardName: string;
      currentPosition: number;
    }>;
    canEndTurn: boolean;
    gameState: {
      isMyTurn: boolean;
      currentPhase: string;
      normalSummonedThisTurn: boolean;
      myHandCount: number;
      myBoardCount: number;
      opponentBoardCount: number;
      myLifePoints: number;
      opponentLifePoints: number;
    };
  };
}

/**
 * GET /api/game/legal-moves
 *
 * Retrieves all legal moves available to the current player in a game.
 *
 * Query Parameters:
 * - gameId (required): The game ID or lobby ID
 *
 * Returns:
 * - Comprehensive object containing all legal actions grouped by type
 * - Includes full game state information
 * - Used by AI agents to determine valid moves
 *
 * Requires:
 * - Valid API key in Authorization header (Bearer token)
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(req);

    if (isAuthError(authResult)) {
      return authResult.error;
    }

    // Extract gameId from query parameters
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    // Validate gameId is provided
    if (!gameId || typeof gameId !== "string") {
      const errorResponse = {
        success: false,
        error: {
          code: "MISSING_GAME_ID",
          message: "Game ID is required. Provide it as a query parameter: ?gameId=xxx",
          details: {
            hint: "The gameId parameter must be a non-empty string",
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

    // Validate gameId format (basic check - should be a valid string ID)
    if (gameId.trim().length === 0) {
      const errorResponse = {
        success: false,
        error: {
          code: "INVALID_GAME_ID",
          message: "Game ID cannot be empty",
          details: {
            receivedGameId: gameId,
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

    // Call the Convex query to get legal moves
    const legalMovesData = await convex.query(api.gameplay.legalMoves.getLegalMoves, {
      gameId,
    });

    const response: LegalMovesResponse = {
      success: true,
      data: legalMovesData,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Legal moves error:", error);

    const errorCode = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    // Handle specific Convex errors
    let statusCode = 500;
    let code = "INTERNAL_ERROR";
    let message = "Failed to fetch legal moves";

    if (errorMessage.includes("not found") || errorMessage.includes("NOT_FOUND")) {
      statusCode = 404;
      code = "GAME_NOT_FOUND";
      message = "Game not found";
    } else if (errorMessage.includes("not in this game") || errorMessage.includes("VALIDATION")) {
      statusCode = 403;
      code = "FORBIDDEN";
      message = "You are not authorized to access this game";
    }

    const errorResponse = {
      success: false,
      error: {
        code,
        message,
        details: {
          error: errorMessage,
        },
      },
    };

    return new Response(JSON.stringify(errorResponse), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
