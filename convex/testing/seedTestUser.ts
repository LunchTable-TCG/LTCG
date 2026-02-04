import { v } from "convex/values";
import { internalMutation } from "../functions";

/**
 * Seed a test user for E2E testing
 *
 * Creates a user with the provided Privy DID and sensible test defaults.
 * This mutation is internal-only and not exposed to clients.
 */
export const seedTestUser = internalMutation({
  args: {
    privyDid: v.string(),
    displayName: v.string(),
    gold: v.optional(v.number()),
    gems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
