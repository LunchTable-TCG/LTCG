/**
 * Migration: Add Leaderboard Fields to Users
 *
 * Adds rating, XP, level, and stats fields to existing users for the leaderboard system.
 *
 * Run this migration after deploying the schema changes:
 * - npx convex run migrations/index:run '{fn: "migrations/addLeaderboardFields"}'
 */

import { ELO_SYSTEM } from "../lib/constants";
import { migrations } from "./index";

/**
 * Add leaderboard fields to users
 *
 * The migration will:
 * 1. Query users in batches
 * 2. Skip users that already have rankedElo field (idempotent)
 * 3. Add default values for rating, XP, level, and stats
 * 4. Track progress automatically
 */
export default migrations.define({
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
