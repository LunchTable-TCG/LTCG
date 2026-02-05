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
 * POST /api/game/set-monster
 *
 * Set a monster from hand face-down in Defense Position
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The card ID to set from hand
 * - tributeCardIds?: string[] - Optional array of card IDs to tribute
 *
 * Response on success:
 * - { success: true, data: { success, cardSet, tributesUsed } }
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
    const { gameId, cardId, tributeCardIds } = body;

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

    // Validate optional tributeCardIds
    if (tributeCardIds !== undefined && !Array.isArray(tributeCardIds)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "tributeCardIds must be an array of strings",
          details: {
            received: typeof tributeCardIds,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate all tribute card IDs are strings
    if (tributeCardIds && !tributeCardIds.every((id: unknown) => typeof id === "string")) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "All tributeCardIds must be strings",
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

    // Call setMonster mutation
    const result = await convex.mutation(api.gameplay.gameEngine.summons.setMonster, {
      lobbyId: gameState.lobbyId,
      cardId,
      tributeCardIds,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        cardSet: result.cardSet,
        tributesUsed: result.tributesUsed,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to set monster:", error);

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

      if (errorMessage.includes("already Normal Summoned")) {
        const response = {
          success: false,
          error: {
            code: "ALREADY_SUMMONED",
            message: "You have already Normal Summoned this turn",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("monster zone")) {
        const response = {
          success: false,
          error: {
            code: "MONSTER_ZONE_FULL",
            message: "Monster zone is full (maximum 5 monsters)",
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
        message: "Failed to set monster",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
