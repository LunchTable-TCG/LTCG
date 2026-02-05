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
 * POST /api/game/flip-summon
 *
 * Flip Summon a face-down monster to face-up position
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - gameId: string - The game ID
 * - cardId: string - The face-down card ID to flip
 * - newPosition: "attack" | "defense" - Position after flip
 *
 * Response on success:
 * - { success: true, data: { success, cardFlipped, position, flipEffect } }
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
    const { gameId, cardId, newPosition } = body;

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

    if (!newPosition || !["attack", "defense"].includes(newPosition)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: 'newPosition is required and must be either "attack" or "defense"',
          details: {
            received: newPosition,
            allowedValues: ["attack", "defense"],
          },
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

    // Call flipSummon mutation
    const result = await convex.mutation(api.gameplay.gameEngine.summons.flipSummon, {
      lobbyId: gameState.lobbyId,
      cardId,
      newPosition,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        success: result.success,
        cardFlipped: result.cardFlipped,
        position: result.position,
        flipEffect: result.flipEffect,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to flip summon:", error);

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
            code: "CARD_NOT_FACE_DOWN",
            message: "Card must be face-down to flip summon",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("same turn") || errorMessage.includes("this turn")) {
        const response = {
          success: false,
          error: {
            code: "CANNOT_FLIP_SAME_TURN",
            message: "Cannot flip summon a monster that was set this turn",
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
        message: "Failed to flip summon monster",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
