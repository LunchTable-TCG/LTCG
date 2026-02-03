// Story Mode Helpers
// Retry limit checking and time-based calculations

import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Difficulty } from "../schema";
import { RETRY_LIMITS } from "./storyConstants";

/**
 * Time constants for retry limit windows
 */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

/**
 * Result of retry limit check
 */
export type RetryLimitResult = {
  allowed: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  resetsAt: number; // Timestamp when limit resets
  timeUntilReset: number; // Milliseconds until reset
};

/**
 * Get the start of the current day (midnight) in user's local timezone approximation
 * Uses UTC for consistency
 */
function getStartOfDay(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/**
 * Get the timestamp for when hard mode resets (next midnight UTC)
 */
function getHardModeResetTime(): number {
  const startOfToday = getStartOfDay();
  const startOfTomorrow = startOfToday + ONE_DAY_MS;
  return startOfTomorrow;
}

/**
 * Get the timestamp for when legendary mode resets (7 days from oldest attempt)
 */
function getLegendaryModeResetTime(oldestAttemptTime: number | null): number {
  if (!oldestAttemptTime) {
    // No attempts, resets immediately (always allowed)
    return Date.now();
  }
  return oldestAttemptTime + ONE_WEEK_MS;
}

/**
 * Check retry limits for a specific difficulty
 *
 * For hard mode: checks attempts in the last 24 hours (daily reset)
 * For legendary mode: checks attempts in the last 7 days (weekly reset)
 * For normal mode: always allowed (unlimited)
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check
 * @param difficulty - Difficulty level to check
 * @returns RetryLimitResult with allowed status and attempt info
 */
export async function checkRetryLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  difficulty: Difficulty
): Promise<RetryLimitResult> {
  const now = Date.now();

  // Normal mode has unlimited retries
  if (difficulty === "normal") {
    return {
      allowed: true,
      attemptsUsed: 0,
      maxAttempts: -1, // -1 indicates unlimited
      resetsAt: 0,
      timeUntilReset: 0,
    };
  }

  // Hard mode: 3 attempts per day
  if (difficulty === "hard") {
    const startOfToday = getStartOfDay();
    const attempts = await ctx.db
      .query("storyBattleAttempts")
      .withIndex("by_user_difficulty_time", (q) => q.eq("userId", userId).eq("difficulty", "hard"))
      .filter((q) => q.gte(q.field("attemptedAt"), startOfToday))
      .collect();

    const attemptsUsed = attempts.length;
    const maxAttempts = RETRY_LIMITS.hard;
    const resetsAt = getHardModeResetTime();

    return {
      allowed: attemptsUsed < maxAttempts,
      attemptsUsed,
      maxAttempts,
      resetsAt,
      timeUntilReset: Math.max(0, resetsAt - now),
    };
  }

  // Legendary mode: 1 attempt per week
  if (difficulty === "legendary") {
    const weekAgo = now - ONE_WEEK_MS;
    const attempts = await ctx.db
      .query("storyBattleAttempts")
      .withIndex("by_user_difficulty_time", (q) =>
        q.eq("userId", userId).eq("difficulty", "legendary")
      )
      .filter((q) => q.gte(q.field("attemptedAt"), weekAgo))
      .order("asc")
      .collect();

    const attemptsUsed = attempts.length;
    const maxAttempts = RETRY_LIMITS.legendary;
    const oldestAttempt = attempts[0]?.attemptedAt ?? null;
    const resetsAt = getLegendaryModeResetTime(oldestAttempt);

    return {
      allowed: attemptsUsed < maxAttempts,
      attemptsUsed,
      maxAttempts,
      resetsAt,
      timeUntilReset: Math.max(0, resetsAt - now),
    };
  }

  // Fallback (should never reach)
  return {
    allowed: true,
    attemptsUsed: 0,
    maxAttempts: -1,
    resetsAt: 0,
    timeUntilReset: 0,
  };
}

/**
 * Get retry limits for all difficulty modes for a user
 *
 * Returns the current status of retry limits for hard and legendary modes.
 * Used by frontend to display remaining attempts and reset times.
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check
 * @returns Object with retry limit info for each difficulty
 */
export async function getAllRetryLimits(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const [hard, legendary] = await Promise.all([
    checkRetryLimit(ctx, userId, "hard"),
    checkRetryLimit(ctx, userId, "legendary"),
  ]);

  return {
    hard: {
      used: hard.attemptsUsed,
      max: hard.maxAttempts,
      resetsAt: hard.resetsAt,
      remaining: Math.max(0, hard.maxAttempts - hard.attemptsUsed),
      allowed: hard.allowed,
    },
    legendary: {
      used: legendary.attemptsUsed,
      max: legendary.maxAttempts,
      resetsAt: legendary.resetsAt,
      remaining: Math.max(0, legendary.maxAttempts - legendary.attemptsUsed),
      allowed: legendary.allowed,
    },
  };
}

/**
 * Format time until reset for display
 *
 * @param milliseconds - Time in milliseconds until reset
 * @returns Human-readable string (e.g., "5 hours", "2 days")
 */
export function formatTimeUntilReset(milliseconds: number): string {
  if (milliseconds <= 0) return "now";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours > 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minutes > 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return "less than a minute";
}
