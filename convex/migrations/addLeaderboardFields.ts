/**
 * Migration: Add Leaderboard Fields to Users
 *
 * Adds rating, XP, level, and stats fields to existing users for the leaderboard system.
 *
 * Run this migration once after deploying the schema changes:
 * - convex migrations run addLeaderboardFields
 */

import { internalMutation } from "../_generated/server";
import { ELO_SYSTEM } from "../lib/constants";

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: addLeaderboardFields");

    const users = await ctx.db.query("users").collect();
    console.log(`Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      // Only update if fields don't exist (idempotent migration)
      if (user.rankedElo === undefined) {
        await ctx.db.patch(user._id, {
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

        migrated++;
      } else {
        skipped++;
      }
    }

    console.log(`Migration complete: ${migrated} users updated, ${skipped} users skipped`);

    return {
      success: true,
      totalUsers: users.length,
      migrated,
      skipped,
    };
  },
});
