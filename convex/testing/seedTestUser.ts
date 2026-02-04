import { v } from "convex/values";
import { mutation } from "../functions";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * Validate that the caller is in a test environment.
 * Throws an error if not in test mode.
 */
function requireTestEnvironment() {
  const isTestEnv =
    process.env["NODE_ENV"] === "test" || process.env["CONVEX_TEST_MODE"] === "true";
  if (!isTestEnv) {
    throw createError(ErrorCode.AUTH_REQUIRED, {
      reason: "Test mutations are only available in test environment",
    });
  }
}

/**
 * Seed a test user for E2E testing
 *
 * Creates a user with the provided Privy DID and sensible test defaults.
 * Only available in test environments (NODE_ENV=test or CONVEX_TEST_MODE=true).
 */
export const seedTestUser = mutation({
  args: {
    privyDid: v.string(),
    displayName: v.string(),
    gold: v.optional(v.number()),
    gems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireTestEnvironment();
    const now = Date.now();

    // Create user matching the schema structure
    const userId = await ctx.db.insert("users", {
      // Privy authentication
      privyId: args.privyDid,

      // Profile fields
      name: args.displayName,
      username: args.displayName.toLowerCase().replace(/\s+/g, "_"),
      isAnonymous: false,

      // Timestamps
      createdAt: now,

      // Leaderboard: Rating fields (defaults)
      rankedElo: 1000,
      casualRating: 1000,

      // Leaderboard: Stats fields (defaults)
      totalWins: 0,
      totalLosses: 0,
      rankedWins: 0,
      rankedLosses: 0,
      casualWins: 0,
      casualLosses: 0,
      storyWins: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,

      // Leaderboard: Player type
      isAiAgent: false,

      // XP and Level
      xp: 0,
      level: 1,

      // Economy (use provided values or defaults)
      gold: args.gold ?? 1000,

      // Moderation fields (defaults)
      isBanned: false,
      isSuspended: false,
      warningCount: 0,

      // HD Wallet tracking (defaults)
      nextWalletIndex: 1, // 0 is user's main wallet

      // Email tracking
      welcomeEmailSent: false,
    });

    return userId;
  },
});
