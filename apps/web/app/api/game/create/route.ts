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
 * POST /api/game/create
 *
 * Create a new game lobby
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - mode: "casual" | "ranked" - Game mode for the lobby
 * - isPrivate: boolean - Whether the lobby is private (requires join code)
 *
 * Response on success:
 * - { success: true, data: { lobbyId, joinCode? } }
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
    const { mode, isPrivate } = body;

    // Validate required fields
    if (!mode || typeof mode !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "mode is required and must be a string",
          details: {
            allowedValues: ["casual", "ranked"],
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!["casual", "ranked"].includes(mode)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "mode must be either 'casual' or 'ranked'",
          details: {
            received: mode,
            allowedValues: ["casual", "ranked"],
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (typeof isPrivate !== "boolean") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "isPrivate must be a boolean",
          details: {
            received: typeof isPrivate,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call createLobbyInternal mutation
    const result = await convex.mutation(api.gameplay.games.lobby.createLobbyInternal, {
      userId: userId as Id<"users">,
      mode,
      isPrivate,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        lobbyId: result.lobbyId,
        joinCode: result.joinCode,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to create game lobby:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from createLobbyInternal
      if (errorMessage.includes("No active deck selected")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_NO_DECK",
            message: "User must select an active deck before creating a lobby",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("You already have an active lobby")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_LOBBY_EXISTS",
            message: "User already has an active lobby",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (errorMessage.includes("You are already in a game")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_IN_GAME",
            message: "User is already in an active game",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (errorMessage.includes("must have at least") || errorMessage.includes("cannot exceed")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_INVALID_DECK",
            message: "User's deck does not meet size requirements",
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
        message: "Failed to create game lobby",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
