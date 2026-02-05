import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import type { NextRequest } from "next/server";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side queries
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

/**
 * Error response structure for API errors
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details: Record<string, unknown>;
  };
}

/**
 * Authenticated agent information returned on successful validation
 */
export interface AuthenticatedAgent {
  userId: Id<"users">;
  agentId: Id<"agents">;
  apiKeyId: Id<"apiKeys">;
}

/**
 * Extract API key from Authorization header
 * Expected format: "Bearer ltcg_xxxxx..."
 */
function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return null;
  }

  // Check for Bearer token format
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return null;
  }

  return bearerMatch[1].trim();
}

/**
 * Create an error response with the standard API error format
 */
function createErrorResponse(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
  status = 401
): Response {
  const errorResponse: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Authenticate API request using API key validation
 *
 * This middleware:
 * 1. Extracts the API key from the Authorization header
 * 2. Validates it using the Convex validateApiKeyInternal function
 * 3. Returns authenticated agent info if valid
 * 4. Returns standardized error responses if invalid
 *
 * @param req - Next.js request object
 * @returns Authenticated agent info or null on error (with error response sent)
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ data: AuthenticatedAgent } | { error: Response }> {
  try {
    // Extract API key from Authorization header
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      return {
        error: createErrorResponse(
          "MISSING_API_KEY",
          "Missing or malformed Authorization header. Expected format: 'Bearer ltcg_xxxxx...'",
          {
            hint: "Include a valid API key in the Authorization header",
          }
        ),
      };
    }

    // Validate API key format
    if (!apiKey.startsWith("ltcg_") || apiKey.length < 37) {
      return {
        error: createErrorResponse(
          "INVALID_API_KEY_FORMAT",
          "Invalid API key format. API keys must start with 'ltcg_' and be at least 37 characters long",
          {
            receivedPrefix: apiKey.substring(0, 5),
          }
        ),
      };
    }

    // Validate API key using Convex internal query
    const validationResult = await convex.query(api.agents.agents.validateApiKeyInternalQuery, {
      apiKey,
    });

    if (!validationResult || !validationResult.isValid) {
      return {
        error: createErrorResponse("INVALID_API_KEY", "Invalid or inactive API key", {
          keyPrefix: `${apiKey.substring(0, 12)}...`,
        }),
      };
    }

    // Return authenticated agent info
    return {
      data: {
        userId: validationResult.userId as Id<"users">,
        agentId: validationResult.agentId as Id<"agents">,
        apiKeyId: validationResult.apiKeyId as Id<"apiKeys">,
      },
    };
  } catch (error) {
    console.error("Authentication error:", error);

    return {
      error: createErrorResponse(
        "AUTHENTICATION_ERROR",
        "An error occurred during authentication",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500
      ),
    };
  }
}

/**
 * Type guard to check if authentication result is an error
 */
export function isAuthError(
  result: { data: AuthenticatedAgent } | { error: Response }
): result is { error: Response } {
  return "error" in result;
}
