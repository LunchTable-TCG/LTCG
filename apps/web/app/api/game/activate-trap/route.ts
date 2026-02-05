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
 * POST /api/game/activate-trap
 *
 * Activate a face-down Trap card from the field
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The face-down Trap card ID to activate
 * - targets?: string[] - Optional array of target card IDs
 * - costTargets?: string[] - Optional array of cards to pay cost
 * - effectIndex?: number - Optional effect index for multi-effect cards
 *
 * Response on success:
 * - { success: true, data: { success, trapName, chainStarted, chainLinkNumber, currentChainLength, priorityPassed } }
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
    const { gameId, cardId, targets, costTargets, effectIndex } = body;

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

    // Validate optional arrays
    if (targets !== undefined && !Array.isArray(targets)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "targets must be an array of strings",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (costTargets !== undefined && !Array.isArray(costTargets)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "costTargets must be an array of strings",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (effectIndex !== undefined && typeof effectIndex !== "number") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "effectIndex must be a number",
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

    // Call activateTrap mutation
    const result = await convex.mutation(api.gameplay.gameEngine.spellsTraps.activateTrap, {
      lobbyId: gameState.lobbyId,
      cardId,
      targets,
      costTargets,
      effectIndex,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        trapName: result.trapName,
        chainStarted: result.chainStarted,
        chainLinkNumber: result.chainLinkNumber,
        currentChainLength: result.currentChainLength,
        priorityPassed: result.priorityPassed,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to activate trap:", error);

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

      if (errorMessage.includes("not set on your field")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_SET",
            message: "Trap card is not set on your field",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("not a trap")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_CARD_TYPE",
            message: "Card is not a trap card",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("wait at least one full turn") || errorMessage.includes("same turn")) {
        const response = {
          success: false,
          error: {
            code: "TRAP_SET_SAME_TURN",
            message: "Trap cards must wait at least one full turn before activation",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("cost")) {
        const response = {
          success: false,
          error: {
            code: "CANNOT_PAY_COST",
            message: "Cannot pay activation cost",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("face-up") || errorMessage.includes("face up")) {
        const response = {
          success: false,
          error: {
            code: "CARD_ALREADY_FACE_UP",
            message: "Trap card is already face-up",
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
        message: "Failed to activate trap card",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
