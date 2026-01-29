/**
 * API Key Authentication Middleware for LTCG HTTP API
 *
 * Extracts and validates API keys from Authorization header.
 * Used by ElizaOS agents and other external clients.
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

export interface AuthenticatedRequest {
  agentId: Id<"agents">;
  userId: Id<"users">;
  apiKeyId: Id<"apiKeys">;
}

/**
 * Extract API key from Authorization header
 * Supports formats: "Bearer ltcg_..." or "ltcg_..."
 */
export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  // Support "Bearer ltcg_..." format
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Support direct "ltcg_..." format
  if (authHeader.startsWith("ltcg_")) {
    return authHeader;
  }

  return null;
}

/**
 * Validate API key and return agent context
 * Throws with 401 status if invalid
 */
export async function authenticateRequest(
  ctx: any,
  request: Request
): Promise<AuthenticatedRequest> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    throw new Error(
      JSON.stringify({
        status: 401,
        error: {
          code: "MISSING_API_KEY",
          message: "Authorization header required",
          details: {
            format: 'Authorization: Bearer ltcg_...',
          },
        },
      })
    );
  }

  // Validate API key using existing internal function
  const result = await ctx.runQuery(internal.agents.validateApiKeyInternal, {
    apiKey,
  });

  if (!result || !result.isValid) {
    throw new Error(
      JSON.stringify({
        status: 401,
        error: {
          code: "INVALID_API_KEY",
          message: "API key is invalid or has been revoked",
          details: {},
        },
      })
    );
  }

  return {
    agentId: result.agentId,
    userId: result.userId,
    apiKeyId: result.apiKeyId,
  };
}

/**
 * Wrapper for httpAction that requires authentication
 *
 * Usage:
 * export const myEndpoint = authHttpAction(async (ctx, request, auth) => {
 *   // auth.agentId, auth.userId available here
 *   return new Response(JSON.stringify({ success: true }));
 * });
 */
export function authHttpAction(
  handler: (
    ctx: any,
    request: Request,
    auth: AuthenticatedRequest
  ) => Promise<Response>
) {
  return httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateRequest(ctx, request);
      return await handler(ctx, request, auth);
    } catch (error) {
      // Parse error if it's a JSON error from authenticateRequest
      if (error instanceof Error && error.message.startsWith("{")) {
        const errorData = JSON.parse(error.message);
        return new Response(
          JSON.stringify({
            success: false,
            ...errorData.error,
            timestamp: Date.now(),
          }),
          {
            status: errorData.status || 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Generic error
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "AUTHENTICATION_ERROR",
            message: "Authentication failed",
            details: { error: error instanceof Error ? error.message : String(error) },
          },
          timestamp: Date.now(),
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  });
}
