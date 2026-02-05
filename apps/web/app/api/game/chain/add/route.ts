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
 * POST /api/game/chain/add
 *
 * Add a card effect to the current chain
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - lobbyId: string - The lobby ID
 * - cardId: string - The card being activated
 * - spellSpeed: number - Spell speed (1 = Normal, 2 = Quick, 3 = Counter)
 * - effect: object - Effect to execute (JsonAbility format)
 * - targets?: string[] - Optional array of target card IDs
 *
 * Response on success:
 * - {
 *     success: true,
 *     chainLinkNumber: number,
 *     currentChainLength: number
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
    const { lobbyId, cardId, spellSpeed, effect, targets } = body;

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

    if (typeof spellSpeed !== "number" || ![1, 2, 3].includes(spellSpeed)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "spellSpeed is required and must be 1, 2, or 3",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (!effect || typeof effect !== "object") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "effect is required and must be an object",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // targets is optional, but if provided must be an array of strings
    if (targets !== undefined && (!Array.isArray(targets) || !targets.every((t) => typeof t === "string"))) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "targets must be an array of strings if provided",
          details: {},
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call addToChain mutation
    const result = await convex.mutation(api.gameplay.chainResolver.addToChain, {
      lobbyId: lobbyId as Id<"gameLobbies">,
      cardId: cardId as Id<"cardDefinitions">,
      spellSpeed,
      effect,
      targets: targets as Id<"cardDefinitions">[] | undefined,
    });

    // Return success response
    const response = {
      success: true,
      chainLinkNumber: result.chainLinkNumber,
      currentChainLength: result.currentChainLength,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to add to chain:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from addToChain
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

      if (errorMessage.includes("Chain cannot exceed") || errorMessage.includes("CHAIN_LIMIT_EXCEEDED")) {
        const response = {
          success: false,
          error: {
            code: "GAME_CHAIN_LIMIT_EXCEEDED",
            message: "Chain cannot exceed maximum length",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("already in the chain") || errorMessage.includes("CARD_ALREADY_IN_CHAIN")) {
        const response = {
          success: false,
          error: {
            code: "GAME_CARD_ALREADY_IN_CHAIN",
            message: "This card is already in the chain",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (
        errorMessage.includes("spell speed") ||
        errorMessage.includes("INVALID_SPELL_SPEED") ||
        errorMessage.includes("Counter Trap")
      ) {
        const response = {
          success: false,
          error: {
            code: "GAME_INVALID_SPELL_SPEED",
            message: "Invalid spell speed for current chain",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("Invalid chain state") || errorMessage.includes("INVALID_CHAIN_STATE")) {
        const response = {
          success: false,
          error: {
            code: "GAME_INVALID_CHAIN_STATE",
            message: "Invalid chain state",
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
        message: "Failed to add to chain",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
