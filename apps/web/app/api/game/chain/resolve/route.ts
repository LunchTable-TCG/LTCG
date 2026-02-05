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
 * POST /api/game/chain/resolve
 *
 * Manually resolve the current chain in reverse order (CL3 → CL2 → CL1).
 * Executes all effects, handles negated effects, and performs state-based actions.
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
 *     resolvedChainLinks: number,
 *     gameEnded?: boolean,
 *     winnerId?: string,
 *     replayTriggered?: boolean
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

    // Call resolveChain mutation
    const result = await convex.mutation(api.gameplay.chainResolver.resolveChain, {
      lobbyId: lobbyId as Id<"gameLobbies">,
    });

    // Return success response
    const response = {
      success: true,
      resolvedChainLinks: result.resolvedChainLinks,
      ...(result.gameEnded && {
        gameEnded: true,
        winnerId: result.winnerId,
      }),
      ...(result.replayTriggered && { replayTriggered: true }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to resolve chain:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from resolveChain
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

      if (errorMessage.includes("No chain to resolve") || errorMessage.includes("GAME_NO_CHAIN")) {
        const response = {
          success: false,
          error: {
            code: "GAME_NO_CHAIN",
            message: "No chain to resolve",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Invalid chain") || errorMessage.includes("GAME_INVALID_CHAIN")) {
        const response = {
          success: false,
          error: {
            code: "GAME_INVALID_CHAIN",
            message: "Invalid chain structure",
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
        message: "Failed to resolve chain",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
