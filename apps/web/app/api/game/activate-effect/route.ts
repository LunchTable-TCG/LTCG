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
 * POST /api/game/activate-effect
 *
 * Activate a monster's effect manually
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The monster card ID on field
 * - effectIndex?: number - Optional effect index for multi-effect monsters
 * - targets?: string[] - Optional array of target card IDs
 * - costTargets?: string[] - Optional array of cards to pay cost
 *
 * Response on success:
 * - { success: true, data: { success, effectName, activationType, chainStarted, chainLinkNumber, currentChainLength, priorityPassed } }
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
    const { gameId, cardId, effectIndex, targets, costTargets } = body;

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

    // Call activateMonsterEffect mutation
    const result = await convex.mutation(
      api.gameplay.gameEngine.monsterEffects.activateMonsterEffect,
      {
        lobbyId: gameState.lobbyId,
        cardId,
        effectIndex,
        targets,
        costTargets,
      }
    );

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        effectName: result.effectName,
        activationType: result.activationType,
        chainStarted: result.chainStarted,
        chainLinkNumber: result.chainLinkNumber,
        currentChainLength: result.currentChainLength,
        priorityPassed: result.priorityPassed,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to activate monster effect:", error);

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

      if (errorMessage.includes("not on your field")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_ON_FIELD",
            message: "Monster card is not on your field",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("face-down")) {
        const response = {
          success: false,
          error: {
            code: "CARD_FACE_DOWN",
            message: "Cannot activate effects of face-down monsters",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("not a monster")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_CARD_TYPE",
            message: "Card is not a monster card",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("has no effects")) {
        const response = {
          success: false,
          error: {
            code: "NO_EFFECTS",
            message: "Monster has no effects to activate",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Continuous effects cannot be manually activated")) {
        const response = {
          success: false,
          error: {
            code: "CONTINUOUS_EFFECT",
            message: "Continuous effects cannot be manually activated",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Main Phase") || errorMessage.includes("phase")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_PHASE",
            message: "Cannot activate this effect in the current phase",
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

      if (errorMessage.includes("already used") || errorMessage.includes("OPT") || errorMessage.includes("HOPT")) {
        const response = {
          success: false,
          error: {
            code: "EFFECT_ALREADY_USED",
            message: "This effect has already been used this turn",
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
        message: "Failed to activate monster effect",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
