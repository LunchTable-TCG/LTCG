/**
 * API Key Authentication Middleware for LTCG HTTP API
 *
 * Extracts and validates API keys from Authorization header.
 * Used by ElizaOS agents and other external clients.
 */

import { httpAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";

// Module-scope helper to avoid TS2589 in function body
// biome-ignore lint/suspicious/noExplicitAny: Required to break TS2589 deep type instantiation
const internalAny: any = internal;

// =============================================================================
// Types
// =============================================================================

/**
 * Authenticated request context with resolved user/agent info
 */
export interface AuthenticatedRequest {
  agentId: Id<"agents">;
  userId: Id<"users">;
  apiKeyId: Id<"apiKeys">;
}

/**
 * Result from API key validation query
 */
interface ApiKeyValidationResult {
  isValid: boolean;
  agentId?: Id<"agents">;
  userId?: Id<"users">;
  apiKeyId?: Id<"apiKeys">;
}

/**
 * HTTP action context type (uses ActionCtx from Convex)
 */
export type HttpActionCtx = ActionCtx;

/**
 * Authenticated handler function signature
 */
export type AuthenticatedHandler = (
  ctx: HttpActionCtx,
  request: Request,
  auth: AuthenticatedRequest
) => Promise<Response>;

// =============================================================================
// Authentication Functions
// =============================================================================

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
 * Throws with JSON error if invalid
 */
export async function authenticateRequest(
  ctx: HttpActionCtx,
  request: Request
): Promise<AuthenticatedRequest> {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    throw new AuthenticationError(
      "MISSING_API_KEY",
      "Authorization header required",
      401,
      { format: "Authorization: Bearer ltcg_..." }
    );
  }

  // Validate API key using existing internal function
  const result: ApiKeyValidationResult = await ctx.runQuery(
    internalAny.agents.validateApiKeyInternalQuery,
    { apiKey }
  );

  if (!result || !result.isValid || !result.agentId || !result.userId || !result.apiKeyId) {
    throw new AuthenticationError(
      "INVALID_API_KEY",
      "API key is invalid or has been revoked",
      401
    );
  }

  return {
    agentId: result.agentId,
    userId: result.userId,
    apiKeyId: result.apiKeyId,
  };
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Authentication error with structured response data
 */
export class AuthenticationError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 401,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "AuthenticationError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
        },
        timestamp: Date.now(),
      }),
      {
        status: this.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

// =============================================================================
// Middleware Wrappers
// =============================================================================

/**
 * Wrapper for httpAction that requires authentication
 *
 * @example
 * export const myEndpoint = authHttpAction(async (ctx, request, auth) => {
 *   // auth.agentId, auth.userId available here
 *   return new Response(JSON.stringify({ success: true }));
 * });
 */
export function authHttpAction(handler: AuthenticatedHandler) {
  return httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateRequest(ctx, request);
      return await handler(ctx, request, auth);
    } catch (error) {
      // Handle AuthenticationError
      if (error instanceof AuthenticationError) {
        return error.toResponse();
      }

      // Handle legacy JSON error format (for backward compatibility)
      if (error instanceof Error && error.message.startsWith("{")) {
        try {
          const errorData = JSON.parse(error.message);
          return new Response(
            JSON.stringify({
              success: false,
              ...errorData.error,
              timestamp: Date.now(),
            }),
            {
              status: errorData.status || 500,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
              },
            }
          );
        } catch {
          // Fall through to generic error
        }
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
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }
  });
}

/**
 * Legacy callback-style authentication wrapper
 * Use authHttpAction instead for new code
 *
 * @deprecated Use authHttpAction instead
 * @example
 * export const myEndpoint = httpAction(async (ctx, request) => {
 *   return withAuth(ctx, request, async (authCtx, agentId) => {
 *     // Handler code
 *   });
 * });
 */
export async function withAuth(
  ctx: HttpActionCtx,
  request: Request,
  handler: (ctx: HttpActionCtx, agentId: Id<"agents">) => Promise<Response>
): Promise<Response> {
  try {
    const auth = await authenticateRequest(ctx, request);
    return await handler(ctx, auth.agentId);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return error.toResponse();
    }

    // Handle legacy JSON error format
    if (error instanceof Error && error.message.startsWith("{")) {
      try {
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
      } catch {
        // Fall through to generic error
      }
    }

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
}
