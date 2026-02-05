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
 * POST /api/game/join
 *
 * Join an existing game lobby
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body (one of lobbyId or joinCode is required):
 * - lobbyId: string - The ID of the lobby to join
 * - joinCode: string - The join code for private lobbies
 *
 * Response on success:
 * - { success: true, data: { gameId, lobbyId, opponentUsername } }
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
    const { lobbyId, joinCode } = body;

    // Validate that at least one of lobbyId or joinCode is provided
    if (!lobbyId && !joinCode) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Either lobbyId or joinCode is required",
          details: {
            hint: "Provide either lobbyId (to join a public lobby) or joinCode (to join a private lobby)",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate lobbyId if provided
    if (lobbyId && typeof lobbyId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "lobbyId must be a string",
          details: {
            received: typeof lobbyId,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate joinCode if provided
    if (joinCode && typeof joinCode !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "joinCode must be a string",
          details: {
            received: typeof joinCode,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    let result;

    // Call appropriate mutation based on what was provided
    if (lobbyId) {
      // Join by explicit lobbyId
      result = await convex.mutation(api.gameplay.games.lobby.joinLobbyInternal, {
        userId: userId as Id<"users">,
        lobbyId: lobbyId as Id<"gameLobbies">,
        joinCode,
      });
    } else {
      // Join by joinCode (finds the lobby automatically)
      // We need to use the joinCode to find the lobby first
      // This would be a different internal mutation - for now we'll use joinLobbyInternal
      // which expects a lobbyId. The client should provide lobbyId when they have it.
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message:
            "lobbyId is required (joinCode-only joining is not yet supported via this endpoint)",
          details: {
            hint: "Provide the lobbyId along with the optional joinCode for private lobbies",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Return success response
    const response = {
      success: true,
      data: {
        gameId: result.gameId,
        lobbyId: result.lobbyId,
        opponentUsername: result.opponentUsername,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to join game lobby:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from joinLobbyInternal
      if (errorMessage.includes("Lobby not found")) {
        const response = {
          success: false,
          error: {
            code: "LOBBY_NOT_FOUND",
            message: "The lobby does not exist or is no longer available",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("This lobby is no longer available")) {
        const response = {
          success: false,
          error: {
            code: "GAME_LOBBY_FULL",
            message: "This lobby is no longer available (already full)",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (errorMessage.includes("You cannot join your own lobby")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_CANNOT_JOIN_OWN_LOBBY",
            message: "You cannot join your own lobby",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("No active deck selected")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_NO_DECK",
            message: "You must select an active deck before joining a game",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("You are already in a game")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_IN_GAME",
            message: "You are already in an active game",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 409 });
      }

      if (errorMessage.includes("Invalid join code")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_INVALID_JOIN_CODE",
            message: "The provided join code is invalid",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Join code required for private match")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_JOIN_CODE_REQUIRED",
            message: "A join code is required to join this private lobby",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Your rating is too far")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_RATING_TOO_FAR",
            message: "Your rating is too far from the host's rating for this ranked match",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("must have at least") || errorMessage.includes("cannot exceed")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_INVALID_DECK",
            message: "Your deck does not meet size requirements",
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
        message: "Failed to join game lobby",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
