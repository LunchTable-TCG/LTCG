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
 * POST /api/game/phase/skip-battle
 *
 * Skip the Battle Phase entirely, moving directly from Main Phase 1 to Main Phase 2.
 * Can be called from Main Phase 1 or any Battle Phase step (battle_start, battle, battle_end).
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
 *     newPhase: "main2",
 *     skippedPhases: string[]
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

    // Call skipBattlePhaseInternal mutation
    const result = await convex.mutation(api.gameplay.phaseManager.skipBattlePhaseInternal, {
      gameId,
      userId: userId as Id<"users">,
    });

    // Return success response
    const response = {
      success: true,
      newPhase: result.newPhase,
      skippedPhases: result.skippedPhases,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to skip battle phase:", error);

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

      if (errorMessage.includes("Can only skip Battle Phase")) {
        const response = {
          success: false,
          error: {
            code: "INVALID_PHASE",
            message: "Can only skip Battle Phase from Main Phase 1 or during Battle Phase",
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
        message: "Failed to skip battle phase",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
