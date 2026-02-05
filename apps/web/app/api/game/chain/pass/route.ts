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
 * POST /api/game/chain/pass
 *
 * Pass priority - decline to respond to the current chain.
 * If both players pass, the chain will automatically resolve.
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - lobbyId: string - The lobby ID
 *
 * Response on success:
 * - {
 *     success: true,
 *     priorityPassedTo: "opponent" | "none",
 *     chainResolved?: boolean
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
    const { lobbyId } = body;

    // Validate required fields
    if (!lobbyId || typeof lobbyId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "lobbyId is required and must be a string",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call passPriority mutation
    const result = await convex.mutation(api.gameplay.chainResolver.passPriority, {
      lobbyId: lobbyId as Id<"gameLobbies">,
    });

    // Return success response
    const response = {
      success: true,
      priorityPassedTo: result.priorityPassedTo,
      ...(result.chainResolved && { chainResolved: true }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to pass priority:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from passPriority
      if (errorMessage.includes("Lobby not found")) {
        const response = {
          success: false,
          error: {
            code: "NOT_FOUND_LOBBY",
            message: "Lobby not found",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("Game state not found")) {
        const response = {
          success: false,
          error: {
            code: "GAME_STATE_NOT_FOUND",
            message: "Game state not found",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("No chain to respond") || errorMessage.includes("GAME_NO_CHAIN")) {
        const response = {
          success: false,
          error: {
            code: "GAME_NO_CHAIN",
            message: "No chain to respond to",
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
        message: "Failed to pass priority",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
