/**
 * Rate Limiter Configurations
 *
 * Centralized rate limiting for high-frequency endpoints to prevent abuse.
 * Uses @convex-dev/ratelimiter component with token bucket algorithm.
 *
 * Token Bucket Pattern:
 * - rate: Number of tokens replenished per period
 * - period: Time window in milliseconds
 * - capacity: Maximum tokens that can be stored (burst capacity)
 *
 * Features:
 * - Per-user rate limiting (default)
 * - Smooth token replenishment
 * - Configurable burst capacity
 * - Automatic cleanup of expired limits
 */

import { RateLimiter } from "@convex-dev/ratelimiter";
import { components } from "../_generated/api";

/**
 * Chat Rate Limiter
 *
 * Prevents chat spam in global chat
 * Limit: 5 messages per 10 seconds per user
 * No burst capacity (capacity = rate)
 */
export const chatRateLimiter = new RateLimiter(components.ratelimiter, {
  sendMessage: {
    kind: "token bucket",
    rate: 5, // 5 messages
    period: 10000, // per 10 seconds
    capacity: 5, // no burst capacity
  },
});

/**
 * Marketplace Rate Limiter
 *
 * Prevents auction bid spam and sniping abuse
 * Limit: 3 bids per 10 seconds per user
 * Slight burst capacity (5) allows legitimate rapid bidding
 */
export const marketplaceRateLimiter = new RateLimiter(components.ratelimiter, {
  placeBid: {
    kind: "token bucket",
    rate: 3, // 3 bids
    period: 10000, // per 10 seconds
    capacity: 5, // small burst capacity for legitimate rapid bidding
  },
  createListing: {
    kind: "token bucket",
    rate: 5, // 5 listings
    period: 60000, // per minute
    capacity: 5, // no burst capacity
  },
});

/**
 * Tournament Rate Limiter
 *
 * Prevents tournament registration spam
 * Limit: 2 registrations per 30 seconds per user
 * No burst capacity (prevents mass registration abuse)
 */
export const tournamentRateLimiter = new RateLimiter(components.ratelimiter, {
  registerForTournament: {
    kind: "token bucket",
    rate: 2, // 2 registrations
    period: 30000, // per 30 seconds
    capacity: 2, // no burst capacity
  },
  createUserTournament: {
    kind: "token bucket",
    rate: 1, // 1 tournament creation
    period: 60000, // per minute
    capacity: 1, // no burst capacity
  },
});

/**
 * Social Rate Limiter
 *
 * Prevents friend request spam and harassment
 * Limit: 5 friend requests per minute per user
 * Small burst capacity (7) allows adding multiple friends at once
 */
export const socialRateLimiter = new RateLimiter(components.ratelimiter, {
  sendFriendRequest: {
    kind: "token bucket",
    rate: 5, // 5 friend requests
    period: 60000, // per minute
    capacity: 7, // small burst capacity for adding multiple friends
  },
  createGuild: {
    kind: "token bucket",
    rate: 1, // 1 guild creation
    period: 300000, // per 5 minutes
    capacity: 1, // no burst capacity
  },
  sendGuildInvite: {
    kind: "token bucket",
    rate: 10, // 10 invites
    period: 60000, // per minute
    capacity: 15, // burst capacity for inviting multiple members
  },
});

/**
 * Admin Rate Limiter
 *
 * Rate limit admin actions to prevent accidental bulk operations
 * Higher limits than user endpoints but still protected
 */
export const adminRateLimiter = new RateLimiter(components.ratelimiter, {
  banPlayer: {
    kind: "token bucket",
    rate: 5, // 5 bans
    period: 60000, // per minute
    capacity: 10, // burst capacity for mass moderation
  },
  grantCurrency: {
    kind: "token bucket",
    rate: 10, // 10 grants
    period: 60000, // per minute
    capacity: 20, // burst capacity for batch operations
  },
});

/**
 * Helper: Check if rate limit was hit
 * Returns true if rate limit allows the operation, false if limit exceeded
 */
export async function checkRateLimit(
  ctx: any,
  limiter: RateLimiter<any>,
  operation: string,
  userId: string
): Promise<boolean> {
  try {
    await limiter.limit(ctx, operation, { key: userId });
    return true;
  } catch (error) {
    return false;
  }
}
