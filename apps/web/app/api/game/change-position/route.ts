import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side mutations
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * POST /api/game/change-position
 *
 * Change a monster's battle position (Attack ↔ Defense)
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The card ID to change position
 *
 * Response on success:
 * - { success: true, data: { success, cardName, newPosition } }
 *
 * Response on error:
 * - { success: false, error: { code, message, details } }
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const { userId } = authResult.data;

    // Parse request body
    const body = await req.json();
    const { gameId, cardId } = body;

    // Validate required fields
    if (!gameId || typeof gameId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "gameId is required and must be a string",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!cardId || typeof cardId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "cardId is required and must be a string",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Find game state by gameId
    const gameState = await convex.query(api.gameplay.games.queries.getGameStateByGameId, {
      gameId,
    });

    if (!gameState) {
      const response = {
        success: false,
        error: {
          code: "GAME_NOT_FOUND",
          message: "The specified game does not exist",
          details: { gameId },
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Call changePosition mutation
    const result = await convex.mutation(api.gameplay.gameEngine.positions.changePosition, {
      lobbyId: gameState.lobbyId,
      cardId,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        cardName: result.cardName,
        newPosition: result.newPosition,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to change position:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns
      if (errorMessage.includes("Game not found")) {
        const response = {
          success: false,
          error: {
            code: "GAME_NOT_FOUND",
            message: "The specified game does not exist",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("not your turn")) {
        const response = {
          success: false,
          error: {
            code: "NOT_YOUR_TURN",
            message: "It is not your turn to act",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("face-down") || errorMessage.includes("face down")) {
        const response = {
          success: false,
          error: {
            code: "CARD_FACE_DOWN",
            message: "Cannot change position of face-down monsters",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("already changed position") || errorMessage.includes("this turn")) {
        const response = {
          success: false,
          error: {
            code: "ALREADY_CHANGED_POSITION",
            message: "This monster has already changed position this turn",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("not on board")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_ON_BOARD",
            message: "Card is not on the board",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Generic error response
    const response = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to change monster position",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
