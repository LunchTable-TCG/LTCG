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
 * POST /api/game/phase/skip-to-end
 *
 * Skip all remaining phases and proceed directly to the End Phase.
 * Cannot be called from Draw Phase or Standby Phase (mandatory phases).
 * If already in End Phase, returns an error.
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
 *     newPhase: "end",
 *     skippedPhases: string[],
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

    // Call skipToEndPhaseInternal mutation
    const result = await convex.mutation(api.gameplay.phaseManager.skipToEndPhaseInternal, {
      gameId,
      userId: userId as Id<"users">,
    });

    // Return success response
    const response = {
      success: true,
      newPhase: result.newPhase,
      skippedPhases: result.skippedPhases,
      ...(result.gameEnded && {
        gameEnded: true,
        winnerId: result.winnerId,
      }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to skip to end phase:", error);

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

      if (
        errorMessage.includes("Already in End Phase") ||
        errorMessage.includes("Cannot skip Draw Phase") ||
        errorMessage.includes("Cannot skip Standby Phase")
      ) {
        const response = {
          success: false,
          error: {
            code: "INVALID_PHASE",
            message: "Cannot skip from this phase",
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
        message: "Failed to skip to end phase",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
