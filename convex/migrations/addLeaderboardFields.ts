/**
 * Migration: Add Leaderboard Fields to Users
 *
 * Adds rating, XP, level, and stats fields to existing users for the leaderboard system.
 *
 * Run this migration once after deploying the schema changes:
 * - convex migrations run addLeaderboardFields
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
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

/**
 * Worker mutation: Update a single user's leaderboard fields
 */
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
