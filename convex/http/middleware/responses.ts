/**
 * Standardized HTTP Response Utilities
 *
 * Ensures consistent response format across all API endpoints.
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: number;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: number;
}

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, status = 200): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: Date.now(),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Configure for production
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, any>
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * Handle CORS preflight requests
 */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}

/**
 * Parse JSON body from request
 * Returns error response if invalid
 */
export async function parseJsonBody<T = any>(request: Request): Promise<T | Response> {
  try {
    const contentType = request.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      return errorResponse("INVALID_CONTENT_TYPE", "Content-Type must be application/json", 400);
    }

    const body = await request.json();
    return body as T;
  } catch (error) {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400, {
      error: error instanceof Error ? error.message : String(error),
    });
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
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
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
      { missingFields: missing }
    );
  }

  return null;
}
