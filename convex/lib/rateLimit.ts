/**
 * Rate Limiting Helpers
 *
 * SECURITY: Protect sensitive mutations from abuse
 *
 * Uses convex-helpers rate limiting
 * See: https://stack.convex.dev/rate-limiting
 */

import { defineRateLimits } from "convex-helpers/server/rateLimit";
import type { MutationCtx } from "../_generated/server";
import { ErrorCode, createError } from "./errorCodes";

const SECOND = 1000; // ms
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

/**
 * Rate limit configurations using convex-helpers defineRateLimits
 *
 * Adjust these based on your security requirements
 */
export const { checkRateLimit, rateLimit, resetRateLimit } = defineRateLimits({
  // Authentication operations
  AUTH_SIGNUP: { kind: "token bucket", rate: 3, period: HOUR, capacity: 3 }, // 3 per hour
  AUTH_SIGNIN: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 10 }, // 10 per 15 min

  // Economy operations
  PACK_PURCHASE: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30 }, // 30 per minute
  PROMO_CODE: { kind: "token bucket", rate: 5, period: HOUR, capacity: 5 }, // 5 per hour
  MARKETPLACE_LIST: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 }, // 20 per minute
  MARKETPLACE_BID: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30 }, // 30 per minute

  // Social operations
  FRIEND_REQUEST: { kind: "token bucket", rate: 10, period: 5 * MINUTE, capacity: 10 }, // 10 per 5 min
  SOCIAL_ACTION: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 }, // 20 per minute
  GLOBAL_CHAT: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 }, // 20 per minute
  TOURNAMENT_ACTION: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 }, // 10 per minute

  // Game operations
  CREATE_LOBBY: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 }, // 10 per minute
  JOIN_LOBBY: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30 }, // 30 per minute
  LOBBY_ACTION: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 }, // 20 per minute

  // Story and progression operations
  STORY_PROGRESS: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 20 }, // 20 per minute
  NOTIFICATION_READ: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 30 }, // 30 per minute

  // Storage operations
  IMAGE_UPLOAD: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 }, // 10 per minute

  // Token operations
  TOKEN_BALANCE_REFRESH: { kind: "token bucket", rate: 6, period: MINUTE, capacity: 6 }, // 6 per minute (once per 10 sec)
});

/**
 * Check rate limit and throw error if exceeded
 *
 * @param ctx - Mutation context
 * @param operation - Operation name (must match a key from defineRateLimits like "AUTH_SIGNUP", "PACK_PURCHASE", etc.)
 * @param key - Unique identifier (userId, IP, etc.)
 * @throws Error if rate limit exceeded
 *
 * @example
 * await checkRateLimitWrapper(ctx, "PACK_PURCHASE", userId);
 */
export async function checkRateLimitWrapper(
  ctx: MutationCtx,
  operation:
    | "AUTH_SIGNUP"
    | "AUTH_SIGNIN"
    | "PACK_PURCHASE"
    | "PROMO_CODE"
    | "MARKETPLACE_LIST"
    | "MARKETPLACE_BID"
    | "FRIEND_REQUEST"
    | "SOCIAL_ACTION"
    | "GLOBAL_CHAT"
    | "TOURNAMENT_ACTION"
    | "CREATE_LOBBY"
    | "JOIN_LOBBY"
    | "LOBBY_ACTION"
    | "STORY_PROGRESS"
    | "NOTIFICATION_READ"
    | "IMAGE_UPLOAD"
    | "TOKEN_BALANCE_REFRESH",
  key?: string
): Promise<void> {
  // In development/testing, rate limiting might be disabled
  if (process.env["CONVEX_CLOUD_URL"] === undefined) {
    // Local development - skip rate limiting
    return;
  }

  try {
    const result = await checkRateLimit(ctx, {
      name: operation,
      ...(key && { key }),
    });

    if (!result.ok && result.retryAt) {
      const retryAfterSeconds = Math.ceil((result.retryAt - Date.now()) / 1000);
      throw createError(ErrorCode.SYSTEM_RATE_LIMIT_CONFIG, {
        operation,
        retryAfterSeconds,
      });
    }
  } catch (error) {
    // Re-throw rate limit errors
    if (error instanceof Error && error.message.includes("Rate limit exceeded")) {
      throw error;
    }
    // Log other errors but don't block
    console.warn(`Rate limiter error for ${operation}:`, error);
  }
}

/**
 * Reset rate limit for a specific key (useful for testing or admin overrides)
 *
 * @param ctx - Mutation context
 * @param operation - Operation name (must match a key from defineRateLimits)
 * @param key - Unique identifier
 */
export async function resetRateLimitWrapper(
  ctx: MutationCtx,
  operation:
    | "AUTH_SIGNUP"
    | "AUTH_SIGNIN"
    | "PACK_PURCHASE"
    | "PROMO_CODE"
    | "MARKETPLACE_LIST"
    | "MARKETPLACE_BID"
    | "FRIEND_REQUEST"
    | "SOCIAL_ACTION"
    | "GLOBAL_CHAT"
    | "TOURNAMENT_ACTION"
    | "CREATE_LOBBY"
    | "JOIN_LOBBY"
    | "LOBBY_ACTION"
    | "STORY_PROGRESS"
    | "NOTIFICATION_READ"
    | "IMAGE_UPLOAD"
    | "TOKEN_BALANCE_REFRESH",
  key?: string
): Promise<void> {
  try {
    await resetRateLimit(ctx, {
      name: operation,
      ...(key && { key }),
    });
  } catch (error) {
    console.warn(`Could not reset rate limit for ${operation}:`, error);
  }
}
