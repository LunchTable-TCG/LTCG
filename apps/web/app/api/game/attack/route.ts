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
 * POST /api/game/attack
 *
 * Declare an attack with a monster card
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID (e.g., from story mode)
 * - attackerCardId: string - The attacker monster card ID
 * - targetCardId?: string - Optional target monster card ID (undefined for direct attack)
 *
 * Response on success:
 * - { success: true, damage, destroyed, gameEnded?, winnerId? }
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
    const { gameId, attackerCardId, targetCardId } = body;

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

    if (!attackerCardId || typeof attackerCardId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "attackerCardId is required and must be a string",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // targetCardId is optional, but if provided must be a string
    if (targetCardId !== undefined && typeof targetCardId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "targetCardId must be a string if provided",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call declareAttackInternal mutation
    const result = await convex.mutation(api.gameplay.combatSystem.declareAttackInternal, {
      gameId,
      userId: userId as Id<"users">,
      attackerCardId,
      targetCardId,
    });

    // Return success response
    const response = {
      success: true,
      damage: result.damage,
      destroyed: result.destroyed,
      gameEnded: result.gameEnded,
      winnerId: result.winnerId,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to declare attack:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from declareAttackInternal
      if (
        errorMessage.includes("Game not found") ||
        errorMessage.includes("Game state not found")
      ) {
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
            code: "GAME_NOT_YOUR_TURN",
            message: "It is not your turn",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (
        errorMessage.includes("Battle Phase") ||
        errorMessage.includes("not on your field") ||
        errorMessage.includes("already attacked") ||
        errorMessage.includes("Attack Position") ||
        errorMessage.includes("Face-down") ||
        errorMessage.includes("Cannot direct attack")
      ) {
        const response = {
          success: false,
          error: {
            code: "GAME_INVALID_MOVE",
            message: "Invalid attack action",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (
        errorMessage.includes("Attacker not found") ||
        errorMessage.includes("Target not found")
      ) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_FOUND",
            message: "Attacker or target card not found",
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
        message: "Failed to declare attack",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
