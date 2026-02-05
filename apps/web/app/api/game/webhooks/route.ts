import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "../middleware/auth";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side mutations
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * POST /api/game/webhooks
 *
 * Register a new webhook for game event notifications
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * Request body:
 * - events: string[] - Non-empty array of event names to subscribe to
 * - url: string - Valid HTTPS webhook URL
 * - secret: string (optional) - Secret for HMAC signature verification
 *
 * Response on success:
 * - { success: true, data: { webhookId } }
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

    const { agentId } = authResult.data;

    // Parse request body
    const body = await req.json();
    const { events, url, secret } = body;

    // Validate events field
    if (!events || !Array.isArray(events)) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "events is required and must be an array",
          details: {
            received: typeof events,
            hint: "Provide a non-empty array of event names",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    if (events.length === 0) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "events array must contain at least one event",
          details: {
            hint: "Subscribe to at least one event (e.g., 'turn_start', 'game_end')",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate all items in events array are strings
    if (!events.every((event: unknown) => typeof event === "string")) {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "All items in events array must be strings",
          details: {
            received: events.map((e: unknown) => typeof e),
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate url field
    if (!url || typeof url !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "url is required and must be a string",
          details: {
            received: typeof url,
            hint: "Provide a valid HTTPS webhook URL",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate URL is HTTPS
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== "https:") {
        const response = {
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Webhook URL must use HTTPS protocol",
            details: {
              received: urlObj.protocol,
              hint: "Use https:// for your webhook URL",
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }
    } catch {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Invalid URL format",
          details: {
            received: url,
            hint: "Provide a valid URL (e.g., https://example.com/webhook)",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate secret if provided (must be string)
    if (secret !== undefined && typeof secret !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "secret must be a string",
          details: {
            received: typeof secret,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call registerWebhook mutation
    const result = await convex.mutation(api.gameplay.webhooks.registerWebhook, {
      agentId,
      events,
      url,
      secret: secret || undefined,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        webhookId: result.webhookId,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Failed to register webhook:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from registerWebhook
      if (errorMessage.includes("Agent with ID") && errorMessage.includes("does not exist")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_AGENT_NOT_FOUND",
            message: "Agent not found",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("HTTPS protocol")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_INVALID_URL",
            message: "Webhook URL must use HTTPS protocol",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }

      if (errorMessage.includes("at least one event")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_INVALID_EVENTS",
            message: "Must specify at least one event to subscribe to",
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
        message: "Failed to register webhook",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
