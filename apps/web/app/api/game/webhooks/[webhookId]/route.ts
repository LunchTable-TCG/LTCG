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
 * DELETE /api/game/webhooks/:webhookId
 *
 * Unregister and delete a webhook
 *
 * Required headers:
 * - Authorization: Bearer ltcg_xxxxx...
 *
 * URL parameters:
 * - webhookId: Webhook ID to delete
 *
 * Response on success:
 * - { success: true, data: { deleted: true } }
 *
 * Response on error:
 * - { success: false, error: { code, message, details } }
 */
export async function DELETE(req: NextRequest, { params }: { params: { webhookId: string } }) {
  try {
    // Authenticate request
    const authResult = await authenticateRequest(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const { agentId } = authResult.data;
    const { webhookId } = params;

    // Validate webhookId parameter
    if (!webhookId || typeof webhookId !== "string") {
      const response = {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "webhookId is required and must be a string",
          details: {
            received: typeof webhookId,
            hint: "Provide a valid webhook ID in the URL path",
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Call deleteWebhook mutation
    await convex.mutation(api.gameplay.webhooks.deleteWebhook, {
      webhookId: webhookId as Id<"webhooks">,
      agentId,
    });

    // Return success response
    const response = {
      success: true,
      data: {
        deleted: true,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to delete webhook:", error);

    // Handle Convex errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific error patterns from deleteWebhook
      if (errorMessage.includes("Webhook with ID") && errorMessage.includes("does not exist")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_WEBHOOK_NOT_FOUND",
            message: "Webhook not found",
            details: {
              error: errorMessage,
            },
          },
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (errorMessage.includes("does not belong to the specified agent")) {
        const response = {
          success: false,
          error: {
            code: "VALIDATION_UNAUTHORIZED",
            message: "Webhook does not belong to the specified agent",
            details: {
              error: errorMessage,
              hint: "You can only delete webhooks that belong to your agent",
            },
          },
        };
        return NextResponse.json(response, { status: 403 });
      }
    }

    // Generic error response
    const response = {
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete webhook",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
