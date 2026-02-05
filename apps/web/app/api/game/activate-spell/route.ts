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
 * POST /api/game/activate-spell
 *
 * Activate a Spell card from hand or field
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The Spell card ID to activate
 * - targets?: string[] - Optional array of target card IDs
 * - costTargets?: string[] - Optional array of cards to pay cost
 * - effectIndex?: number - Optional effect index for multi-effect cards
 *
 * Response on success:
 * - { success: true, data: { success, spellName, chainStarted, chainLinkNumber, currentChainLength, priorityPassed } }
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

    // Call activateSpell mutation
    const result = await convex.mutation(api.gameplay.gameEngine.spellsTraps.activateSpell, {
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
        spellName: result.spellName,
        chainStarted: result.chainStarted,
        chainLinkNumber: result.chainLinkNumber,
        currentChainLength: result.currentChainLength,
        priorityPassed: result.priorityPassed,
        fieldSpellActivated: result.fieldSpellActivated,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to activate spell:", error);

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

      if (errorMessage.includes("not in your hand") || errorMessage.includes("not in zone")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_IN_ZONE",
            message: "Card is not in your hand or spell/trap zone",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("not a spell")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_CARD_TYPE",
            message: "Card is not a spell card",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("phase") || errorMessage.includes("Phase")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_PHASE",
            message: "Cannot activate this spell in the current phase",
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
    }

    // Generic error response
    const response = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to activate spell card",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
