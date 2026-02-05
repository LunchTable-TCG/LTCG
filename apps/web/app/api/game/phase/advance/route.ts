import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "../../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side mutations
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * POST /api/game/phase/advance
 *
 * Advance to the next game phase. Auto-advances through non-interactive phases
 * and stops at interactive phases (main1, battle, main2, end).
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID (e.g., from story mode)
 *
 * Response on success:
 * - {
 *     success: true,
 *     newPhase: string,
 *     phasesVisited: string[],
 *     availableActions: {...},
 *     gameEnded?: boolean,
 *     winnerId?: string
 *   }
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
    const { gameId } = body;

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

    // Call advancePhaseInternal mutation
    const result = await convex.mutation(api.gameplay.phaseManager.advancePhaseInternal, {
      gameId,
      userId: userId as Id<"users">,
    });

    // Return success response
    const response = {
      success: true,
      newPhase: result.newPhase,
      phasesVisited: result.phasesVisited,
      availableActions: result.availableActions,
      ...(result.gameEnded && {
        gameEnded: true,
        winnerId: result.winnerId,
      }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to advance phase:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns
      if (errorMessage.includes("Game not found")) {
        const response = {
          success: false,
          error: {
            code: "GAME_NOT_FOUND",
            message: "Game not found",
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
            message: "It is not your turn",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (errorMessage.includes("Cannot advance from End Phase")) {
        const response = {
          success: false,
          error: {
            code: "CANNOT_ADVANCE_PHASE",
            message: "Cannot advance from End Phase - use end-turn instead",
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
        message: "Failed to advance phase",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
