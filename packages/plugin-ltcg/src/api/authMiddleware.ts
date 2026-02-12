/**
 * Authentication middleware for external control API
 *
 * Provides Bearer token validation and rate limiting for control endpoints.
 * Simpler than webhook HMAC validation as it uses static tokens.
 */

import type { RouteRequest } from "@elizaos/core";
import { logger } from "@elizaos/core";

/**
 * Rate limiting tracker (in-memory)
 * Maps IP address to request timestamps
 */
const rateLimitTracker = new Map<string, number[]>();

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: RouteRequest): string | null {
  const authHeader =
    req.headers?.["authorization"] || req.headers?.["Authorization"];

  if (!authHeader) {
    return null;
  }

  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  const match = headerValue.match(/^Bearer\s+(.+)$/i);

  return match ? match[1] : null;
}

/**
 * Get client IP address from request
 */
function getClientIp(req: RouteRequest): string {
  // Try common headers first
  const forwarded =
    req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (forwarded) {
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return forwardedValue.split(",")[0].trim();
  }

  const realIp = req.headers?.["x-real-ip"] || req.headers?.["X-Real-IP"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to remote address
  return "unknown";
}

/**
 * Check rate limit for an IP address
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitTracker.get(ip) || [];

  // Filter out requests outside the time window
  const recentRequests = requests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  // Check if limit exceeded
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Add current request and update tracker
  recentRequests.push(now);
  rateLimitTracker.set(ip, recentRequests);

  // Clean up old entries periodically
  if (rateLimitTracker.size > 1000) {
    cleanupRateLimitTracker();
  }

  return true;
}

/**
 * Clean up old rate limit entries to prevent memory leak
 */
function cleanupRateLimitTracker() {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  // Use Array.from to avoid iterator issues
  const entries = Array.from(rateLimitTracker.entries());

  for (const [ip, timestamps] of entries) {
    const recentRequests = timestamps.filter((ts) => ts > cutoff);

    if (recentRequests.length === 0) {
      rateLimitTracker.delete(ip);
    } else {
      rateLimitTracker.set(ip, recentRequests);
    }
  }
}

/**
 * Validate Bearer token authentication
 * Returns true if authenticated, false otherwise
 */
export function validateControlAuth(
  req: RouteRequest,
  expectedKey: string | undefined,
): boolean {
  // Secure-by-default: require an API key unless explicitly opted out.
  if (!expectedKey) {
    const allowUnsecured = isEnabled(
      process.env.LTCG_ALLOW_UNSECURED_CONTROL_API,
    );
    if (allowUnsecured) {
      logger.warn(
        "LTCG_ALLOW_UNSECURED_CONTROL_API=true — control API authentication is disabled",
      );
      return true;
    }

    logger.error(
      "Control API rejected request because no control key is configured. Set LTCG_CONTROL_API_KEY (or LTCG_API_KEY fallback).",
    );
    return false;
  }

  const token = extractBearerToken(req);

  if (!token) {
    logger.warn("Control API request missing Authorization header");
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedKey.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }

  if (result !== 0) {
    logger.warn("Control API request with invalid token");
    return false;
  }

  return true;
}

/**
 * Combined auth + rate limit check
 * Returns error message if blocked, null if allowed
 */
export function validateControlRequest(
  req: RouteRequest,
  expectedKey: string | undefined,
): string | null {
  // Check authentication first
  if (!validateControlAuth(req, expectedKey)) {
    return "Unauthorized - Invalid or missing API key";
  }

  // Check rate limit
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    logger.warn({ ip }, "Rate limit exceeded for control API");
    return "Rate limit exceeded - Maximum 10 requests per minute";
  }

  return null; // Request is valid
}

/**
 * Clear rate limit tracker (for testing or service restart)
 */
export function clearRateLimitTracker(): void {
  rateLimitTracker.clear();
}
