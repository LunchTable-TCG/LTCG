/**
 * Rate Limiting Middleware for LTCG HTTP API
 *
 * Implements per-minute and daily rate limits for API keys.
 * Tracks usage in Convex database for distributed rate limiting.
 */

import type { AuthenticatedRequest } from "./auth";

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
 */
export async function checkRateLimit(
  ctx: any,
  auth: AuthenticatedRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): Promise<RateLimitStatus> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  // Query recent API requests for this API key
  // Note: This requires an apiKeyUsage table to be added to schema
  // For now, we'll implement a simple in-memory counter
  // TODO: Implement proper database tracking

  // Get usage counts (placeholder - needs real implementation)
  const minuteUsage = await getMinuteUsage(ctx, auth.apiKeyId, oneMinuteAgo);
  const dailyUsage = await getDailyUsage(ctx, auth.apiKeyId, oneDayAgo);

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

  // Record this request
  await recordApiRequest(ctx, auth.apiKeyId, now);

  // Return rate limit status
  return {
    remaining: minuteRemaining,
    limit: config.perMinuteLimit,
    resetAt: Math.ceil((oneMinuteAgo + 60 * 1000) / 1000),
    dailyRemaining,
    dailyLimit: config.dailyLimit,
  };
}

/**
 * Get request count in last minute
 * TODO: Implement with actual database query
 */
async function getMinuteUsage(
  ctx: any,
  apiKeyId: string,
  since: number
): Promise<number> {
  // Placeholder implementation
  // In production, query apiKeyUsage table:
  // const usage = await ctx.db.query("apiKeyUsage")
  //   .withIndex("by_key_and_time", q => q
  //     .eq("apiKeyId", apiKeyId)
  //     .gte("timestamp", since)
  //   )
  //   .collect();
  // return usage.length;

  return 0; // Temporary - no rate limiting until table is created
}

/**
 * Get request count in last 24 hours
 * TODO: Implement with actual database query
 */
async function getDailyUsage(
  ctx: any,
  apiKeyId: string,
  since: number
): Promise<number> {
  // Placeholder implementation
  // In production, query apiKeyUsage table:
  // const usage = await ctx.db.query("apiKeyUsage")
  //   .withIndex("by_key_and_time", q => q
  //     .eq("apiKeyId", apiKeyId)
  //     .gte("timestamp", since)
  //   )
  //   .collect();
  // return usage.length;

  return 0; // Temporary - no rate limiting until table is created
}

/**
 * Record an API request for rate limiting
 * TODO: Implement with actual database insert
 */
async function recordApiRequest(
  ctx: any,
  apiKeyId: string,
  timestamp: number
): Promise<void> {
  // Placeholder implementation
  // In production, insert into apiKeyUsage table:
  // await ctx.db.insert("apiKeyUsage", {
  //   apiKeyId,
  //   timestamp,
  //   endpoint: request.url, // Add endpoint tracking
  // });

  // Temporary - no-op until table is created
}

/**
 * Get current rate limit status without incrementing counter
 * Used for GET /api/agents/rate-limit endpoint
 */
export async function getRateLimitStatus(
  ctx: any,
  auth: AuthenticatedRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMITS
): Promise<RateLimitStatus> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const minuteUsage = await getMinuteUsage(ctx, auth.apiKeyId, oneMinuteAgo);
  const dailyUsage = await getDailyUsage(ctx, auth.apiKeyId, oneDayAgo);

  return {
    remaining: Math.max(0, config.perMinuteLimit - minuteUsage),
    limit: config.perMinuteLimit,
    resetAt: Math.ceil((oneMinuteAgo + 60 * 1000) / 1000),
    dailyRemaining: Math.max(0, config.dailyLimit - dailyUsage),
    dailyLimit: config.dailyLimit,
  };
}
