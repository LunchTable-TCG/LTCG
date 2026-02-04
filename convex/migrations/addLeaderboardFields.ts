/**
 * Migration: Add Leaderboard Fields to Users
 *
 * Adds rating, XP, level, and stats fields to existing users for the leaderboard system.
 *
 * Run this migration once after deploying the schema changes:
 * - npx convex run migrations/addLeaderboardFields
 *
 * REFACTORED to use convex-helpers makeMigration for:
 * - Automatic batch processing and pagination
 * - Built-in progress tracking
 * - Resumability from cursor if interrupted
 * - Better error handling
 */

import { ELO_SYSTEM } from "../lib/constants";
import { migration } from "../migrations";

/**
 * Add leaderboard fields to users
 *
 * This migration uses the convex-helpers migration wrapper which provides:
 * - Automatic pagination (100 users per batch by default)
 * - Progress tracking in migrations table
 * - Resumability if interrupted
 * - Error handling with automatic cursor tracking
 *
 * The migration will:
 * 1. Query users in batches
 * 2. Skip users that already have rankedElo field (idempotent)
 * 3. Add default values for rating, XP, level, and stats
 * 4. Track progress automatically in migrations table
 */
export default migration({
  table: "users",
  migrateOne: async (_ctx, user) => {
    // Skip users that already have the field (idempotent)
    if (user.rankedElo !== undefined) {
      return; // undefined = skip this document
    }

    // Return the fields to patch
    return {
      // Rating fields
      rankedElo: ELO_SYSTEM.DEFAULT_RATING,
      casualRating: ELO_SYSTEM.DEFAULT_RATING,

      // Progression fields
      xp: 0,
      level: 1,

      // Stats fields
      totalWins: 0,
      totalLosses: 0,
      rankedWins: 0,
      rankedLosses: 0,
      casualWins: 0,
      casualLosses: 0,
      storyWins: 0,

      // Player type (default to human; AI agents can be updated separately)
      isAiAgent: false,

      lastStatsUpdate: Date.now(),
    };
  },
});

/**
 * LEGACY IMPLEMENTATION (kept for reference)
 *
 * This is the old workpool-based implementation. The new makeMigration
 * approach above provides better progress tracking and error handling.
 *
 * Old approach issues:
 * - Manual progress tracking
 * - No automatic resumability
 * - Required separate worker mutation
 * - No built-in status monitoring
 * - Manual batch size management
 *
 * New approach benefits:
 * - Automatic batch processing
 * - Built-in progress tracking via migrations table
 * - Resumable from cursor if interrupted
 * - Status monitoring via migrations:status query
 * - Simpler implementation (no separate worker needed)
 */

/*
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../functions";
import { migrationsPool } from "../infrastructure/workpools";
import { ELO_SYSTEM } from "../lib/constants";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: addLeaderboardFields");

    const users = await ctx.db.query("users").collect();
    console.log(`Found ${users.length} users to migrate`);

    // Track progress
    let enqueuedCount = 0;
    let skippedCount = 0;

    // Enqueue update jobs for each user that needs migration
    for (const user of users) {
      // Only enqueue if fields don't exist (idempotent migration)
      if (user.rankedElo === undefined) {
        await migrationsPool.enqueueMutation(
          ctx,
          internal.migrations.addLeaderboardFields.updateUserLeaderboardFields,
          {
            userId: user._id,
          }
        );
        enqueuedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(
      `Migration jobs enqueued: ${enqueuedCount} users to update, ${skippedCount} users skipped`
    );

    return {
      success: true,
      totalUsers: users.length,
      enqueued: enqueuedCount,
      skipped: skippedCount,
      message: `Enqueued ${enqueuedCount} migration jobs. Check workpool status for progress.`,
    };
  },
});

export const updateUserLeaderboardFields = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);

    if (!user) {
      console.error(`[Migration Worker] User not found: ${userId}`);
      return { success: false, error: "User not found" };
    }

    // Double-check idempotency
    if (user.rankedElo !== undefined) {
      console.log(`[Migration Worker] User ${userId} already migrated, skipping`);
      return { success: true, skipped: true };
    }

    await ctx.db.patch(userId, {
      // Rating fields
      rankedElo: ELO_SYSTEM.DEFAULT_RATING,
      casualRating: ELO_SYSTEM.DEFAULT_RATING,

      // Progression fields
      xp: 0,
      level: 1,

      // Stats fields
      totalWins: 0,
      totalLosses: 0,
      rankedWins: 0,
      rankedLosses: 0,
      casualWins: 0,
      casualLosses: 0,
      storyWins: 0,

      // Player type (default to human; AI agents can be updated separately)
      isAiAgent: false,

      lastStatsUpdate: Date.now(),
    });

    console.log(`[Migration Worker] Updated user ${userId}`);
    return { success: true, updated: true };
  },
});
*/
