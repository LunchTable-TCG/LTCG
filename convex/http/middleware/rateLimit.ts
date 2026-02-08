/**
 * Rate Limiting Middleware for LTCG HTTP API
 *
 * Implements per-minute and daily rate limits for API keys.
 * Tracks usage in Convex database for distributed rate limiting.
 */

import * as generatedApi from "../../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import type { AuthenticatedRequest } from "./auth";
import type { HttpActionCtx } from "./auth";

export interface RateLimitConfig {
  perMinuteLimit: number;
  dailyLimit: number;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: number;
  dailyRemaining: number;
  dailyLimit: number;
}

// Default rate limits
export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  perMinuteLimit: 60, // 60 requests per minute
  dailyLimit: 10000, // 10,000 requests per day
};

/**
 * Check if API key has exceeded rate limits
 * Returns rate limit status or throws error if exceeded
 *
 * @param ctx - HTTP action context with runQuery/runMutation
 * @param auth - Authenticated request with apiKeyId
 * @param config - Rate limit configuration
 * @param endpoint - Optional endpoint path for tracking
 */
export async function checkRateLimit(
  ctx: HttpActionCtx,
  auth: AuthenticatedRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS,
  endpoint?: string
): Promise<RateLimitStatus> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Query recent API requests for this API key from database
  const minuteUsage = await ctx.runQuery(
    internalAny.http.middleware.rateLimitInternal.getUsageCount,
    {
      apiKeyId: auth.apiKeyId,
      since: oneMinuteAgo,
    }
  );
  const dailyUsage = await ctx.runQuery(
    internalAny.http.middleware.rateLimitInternal.getUsageCount,
    {
      apiKeyId: auth.apiKeyId,
      since: oneDayAgo,
    }
  );

  // Calculate remaining requests
  const minuteRemaining = Math.max(0, config.perMinuteLimit - minuteUsage);
  const dailyRemaining = Math.max(0, config.dailyLimit - dailyUsage);

  // Check if limits exceeded
  if (minuteUsage >= config.perMinuteLimit) {
    const resetAt = Math.ceil((oneMinuteAgo + 60 * 1000) / 1000); // Next minute boundary
    throw new Error(
      JSON.stringify({
        status: 429,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Per-minute rate limit exceeded",
          details: {
            limit: config.perMinuteLimit,
            resetAt,
            retryAfter: Math.ceil((resetAt * 1000 - now) / 1000),
          },
        },
      })
    );
  }

  if (dailyUsage >= config.dailyLimit) {
    const resetAt = Math.ceil((oneDayAgo + 24 * 60 * 60 * 1000) / 1000); // Next day boundary
    throw new Error(
      JSON.stringify({
        status: 429,
        error: {
          code: "DAILY_RATE_LIMIT_EXCEEDED",
          message: "Daily rate limit exceeded",
          details: {
            limit: config.dailyLimit,
            resetAt,
            retryAfter: Math.ceil((resetAt * 1000 - now) / 1000),
          },
        },
      })
    );
  }

  // Record this request in the database
  await ctx.runMutation(internalAny.http.middleware.rateLimitInternal.recordUsage, {
    apiKeyId: auth.apiKeyId,
    timestamp: now,
    endpoint,
  });

  // Return rate limit status
  return {
    remaining: minuteRemaining - 1, // Subtract 1 for the current request
    limit: config.perMinuteLimit,
    resetAt: Math.ceil((oneMinuteAgo + 60 * 1000) / 1000),
    dailyRemaining: dailyRemaining - 1,
    dailyLimit: config.dailyLimit,
  };
}

/**
 * Get current rate limit status without incrementing counter
 * Used for GET /api/agents/rate-limit endpoint
 */
export async function getRateLimitStatus(
  ctx: HttpActionCtx,
  auth: AuthenticatedRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): Promise<RateLimitStatus> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const minuteUsage = await ctx.runQuery(
    internalAny.http.middleware.rateLimitInternal.getUsageCount,
    {
      apiKeyId: auth.apiKeyId,
      since: oneMinuteAgo,
    }
  );
  const dailyUsage = await ctx.runQuery(
    internalAny.http.middleware.rateLimitInternal.getUsageCount,
    {
      apiKeyId: auth.apiKeyId,
      since: oneDayAgo,
    }
  );

  return {
    remaining: Math.max(0, config.perMinuteLimit - minuteUsage),
    limit: config.perMinuteLimit,
    resetAt: Math.ceil((oneMinuteAgo + 60 * 1000) / 1000),
    dailyRemaining: Math.max(0, config.dailyLimit - dailyUsage),
    dailyLimit: config.dailyLimit,
  };
}

/**
 * Record a completed request with response status
 * Call this after the request completes to track response codes
 */
export async function recordRequestComplete(
  _ctx: HttpActionCtx,
  _auth: AuthenticatedRequest,
  _endpoint: string,
  _responseStatus: number,
  _durationMs: number
): Promise<void> {
  // Note: The initial request is already recorded in checkRateLimit
  // This is for updating with response status if needed
  // For now, we just record successful completions separately
  // Future: Could update the existing record instead
}
