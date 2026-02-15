/**
 * Standardized HTTP Response Utilities
 *
 * Ensures consistent response format across all API endpoints.
 */

import type { ApiErrorResponse, ApiSuccessResponse } from "@ltcg/core";
export type { ApiSuccessResponse, ApiErrorResponse } from "@ltcg/core";

/**
 * CORS Configuration
 * Allowed origins are read from environment variables for security
 */
const CONVEX_SITE_URL = process.env["CONVEX_SITE_URL"];
const FRONTEND_URL = process.env["FRONTEND_URL"];
const ADMIN_DASHBOARD_URL = process.env["ADMIN_DASHBOARD_URL"];
const IS_PRODUCTION = process.env["CONVEX_CLOUD_URL"] !== undefined;

/**
 * Build list of allowed origins
 * - Production: Only explicitly configured URLs
 * - Development: Include localhost variants for local testing
 */
const ALLOWED_ORIGINS = [
  CONVEX_SITE_URL,
  FRONTEND_URL,
  ADMIN_DASHBOARD_URL,
  // Development fallbacks for local testing
  ...(!IS_PRODUCTION
    ? [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
      ]
    : []),
].filter((url): url is string => Boolean(url));

/**
 * Validate and get appropriate CORS origin
 * @param requestOrigin - The Origin header from the request
 * @returns The validated origin to use in CORS headers
 */
function validateOrigin(requestOrigin: string | null): string {
  // No origin provided (e.g., same-origin request or non-browser client)
  if (!requestOrigin) {
    return ALLOWED_ORIGINS[0] || "*";
  }

  // Check if origin is in allowed list
  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Development mode: Allow all localhost/127.0.0.1 origins
  if (!IS_PRODUCTION) {
    if (
      requestOrigin.startsWith("http://localhost:") ||
      requestOrigin.startsWith("http://127.0.0.1:")
    ) {
      return requestOrigin;
    }
  }

  // Origin not allowed - return first allowed origin or wildcard as fallback
  return ALLOWED_ORIGINS[0] || "*";
}

/**
 * Get CORS headers for a request
 * @param request - The incoming HTTP request (optional, for origin validation)
 * @returns Headers object with CORS configuration
 */
function getCorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("Origin") || null;
  const allowedOrigin = validateOrigin(origin);

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Create a successful JSON response
 * @param data - The response data
 * @param status - HTTP status code (default: 200)
 * @param request - Optional request object for CORS origin validation
 */
export function successResponse<T>(data: T, status = 200, request?: Request): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}

/**
 * Create an error JSON response
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code (default: 400)
 * @param details - Optional error details
 * @param request - Optional request object for CORS origin validation
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  request?: Request
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request),
    },
  });
}

/**
 * Handle CORS preflight requests
 * @param request - Optional request object for CORS origin validation
 */
export function corsPreflightResponse(request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}

/**
 * JSON object type for request bodies
 * Uses Record<string, unknown> for flexibility with nested objects
 */
export type JsonObject = Record<string, unknown>;

/**
 * Parse JSON body from request
 * Returns error response if invalid
 * @param request - The HTTP request to parse
 * @returns The parsed body or an error response
 */
export async function parseJsonBody<T extends JsonObject = JsonObject>(
  request: Request
): Promise<T | Response> {
  try {
    const contentType = request.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      return errorResponse(
        "INVALID_CONTENT_TYPE",
        "Content-Type must be application/json",
        400,
        undefined,
        request
      );
    }

    const body = await request.json();
    return body as T;
  } catch (error) {
    return errorResponse(
      "INVALID_JSON",
      "Request body must be valid JSON",
      400,
      {
        error: error instanceof Error ? error.message : String(error),
      },
      request
    );
  }
}

/**
 * Extract query parameter from URL
 */
export function getQueryParam(request: Request, paramName: string): string | null {
  const url = new URL(request.url);
  return url.searchParams.get(paramName);
}

/**
 * Validate required fields in request body
 * @param body - The request body to validate
 * @param requiredFields - Array of required field names
 * @param request - Optional request object for CORS origin validation
 * @returns Error response if validation fails, null if valid
 */
export function validateRequiredFields(
  body: JsonObject,
  requiredFields: string[],
  request?: Request
): Response | null {
  const missing: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    return errorResponse(
      "MISSING_REQUIRED_FIELDS",
      `Missing required fields: ${missing.join(", ")}`,
      400,
      { missingFields: missing },
      request
    );
  }

  return null;
}
