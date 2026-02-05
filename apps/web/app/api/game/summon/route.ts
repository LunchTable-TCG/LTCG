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
 * POST /api/game/summon
 *
 * Normal Summon a monster from hand to the field
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID for the summon
 * - cardId: string - The card ID to summon from hand
 * - position: "attack" | "defense" - Attack or Defense Position
 * - tributeCardIds?: string[] - Optional array of card IDs to tribute
 *
 * Response on success:
 * - { success: true, data: { success, cardSummoned, position } }
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
    const { gameId, cardId, position, tributeCardIds } = body;

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

    if (!position || !["attack", "defense"].includes(position)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: 'position is required and must be either "attack" or "defense"',
          details: {
            received: position,
            allowedValues: ["attack", "defense"],
          },
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

    // Call normalSummonInternal mutation
    const result = await convex.mutation(api.gameplay.gameEngine.summons.normalSummonInternal, {
      gameId,
      userId: userId as Id<"users">,
      cardId,
      position,
      tributeCardIds,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        cardSummoned: result.cardSummoned,
        position: result.position,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to summon monster:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from normalSummonInternal
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

      if (errorMessage.includes("not in hand")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_IN_HAND",
            message: "The card is not in your hand",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Card not found") || errorMessage.includes("Invalid card")) {
        const response = {
          success: false,
          error: {
            code: "CARD_NOT_FOUND",
            message: "The specified card does not exist",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
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
        message: "Failed to summon monster",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
