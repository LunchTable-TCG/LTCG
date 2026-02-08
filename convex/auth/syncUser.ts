import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";

/**
 * Create or get a user based on their Privy ID.
 * Called automatically by AuthGuard when a new user authenticates.
 * Now also accepts wallet info for auto-connection during onboarding.
 */
export const createOrGetUser = mutation({
  args: {
    email: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletType: v.optional(v.union(v.literal("privy_embedded"), v.literal("external"))),
    // Referral tracking
    referralSource: v.optional(v.string()),
    referralGuildInviteCode: v.optional(v.string()),
    referralCode: v.optional(v.string()), // User referral code
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const privyId = identity.subject; // did:privy:xxx

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

    if (existingUser) {
      // Sync any missing data (email, wallet) for existing users
      const updates: Record<string, unknown> = {
        lastActiveAt: Date.now(),
      };

      // Backfill email if not stored but now available
      if (args.email && !existingUser.email) {
        updates["email"] = args.email;
      }

      // Sync wallet if not yet connected
      if (args.walletAddress && !existingUser.walletAddress) {
        updates["walletAddress"] = args.walletAddress;
        updates["walletType"] = args.walletType;
        updates["walletConnectedAt"] = Date.now();
      }

      await ctx.db.patch(existingUser._id, updates);

      return {
        userId: existingUser._id,
        isNewUser: false,
        hasUsername: !!existingUser.username,
        hasStarterDeck: !!existingUser.activeDeckId,
        hasWallet: !!(args.walletAddress || existingUser.walletAddress),
      };
    }

    // Create new user with game defaults + wallet if provided
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      privyId,
      email: args.email,
      createdAt: now,
      // Auto-connect wallet if provided
      walletAddress: args.walletAddress,
      walletType: args.walletType,
      walletConnectedAt: args.walletAddress ? now : undefined,
      // Referral tracking - resolve guild ID from invite code if provided
      referralSource: args.referralCode ? "user_referral" : args.referralSource,
      referralGuildInviteCode: args.referralGuildInviteCode,
      referralCode: args.referralCode,
      referralGuildId: await (async () => {
        const code = args.referralGuildInviteCode;
        if (!code) return undefined;
        const link = await ctx.db
          .query("guildInviteLinks")
          .withIndex("by_code", (q) => q.eq("code", code))
          .first();
        return link?.guildId;
      })(),
      // Activity tracking
      lastActiveAt: now,
      // Game defaults
      rankedElo: 1000,
      casualRating: 1000,
      totalWins: 0,
      totalLosses: 0,
      rankedWins: 0,
      rankedLosses: 0,
      casualWins: 0,
      casualLosses: 0,
      storyWins: 0,
      currentWinStreak: 0,
      longestWinStreak: 0,
      isAiAgent: false,
      isBanned: false,
      isSuspended: false,
      warningCount: 0,
    });

    // Create playerCurrency record (source of truth for gold/gems)
    await ctx.db.insert("playerCurrency", {
      userId,
      gold: 500,
      gems: 0,
      lifetimeGoldEarned: 500,
      lifetimeGoldSpent: 0,
      lifetimeGemsEarned: 0,
      lifetimeGemsSpent: 0,
      lastUpdatedAt: now,
    });

    // Create playerXP record (source of truth for XP/level)
    await ctx.db.insert("playerXP", {
      userId,
      currentXP: 0,
      currentLevel: 1,
      lifetimeXP: 0,
      lastUpdatedAt: now,
    });

    // Record user referral if a referral code was provided
    const refCode = args.referralCode;
    if (refCode) {
      const referralLink = await ctx.db
        .query("userReferralLinks")
        .withIndex("by_code", (q) => q.eq("code", refCode))
        .first();

      if (referralLink?.isActive && referralLink.userId !== userId) {
        // Check not already referred
        const existing = await ctx.db
          .query("referrals")
          .withIndex("by_referred", (q) => q.eq("referredUserId", userId))
          .first();

        if (!existing) {
          await ctx.db.insert("referrals", {
            referrerId: referralLink.userId,
            referredUserId: userId,
            referralCode: refCode,
            createdAt: now,
          });
          await ctx.db.patch(referralLink._id, { uses: referralLink.uses + 1 });
          await ctx.db.patch(userId, { referredBy: referralLink.userId });
        }
      }
    }

    return {
      userId,
      isNewUser: true,
      hasUsername: false,
      hasStarterDeck: false,
      hasWallet: !!args.walletAddress,
    };
  },
});

/**
 * Get the onboarding status for the current user.
 * Used by the onboarding page to determine which steps are complete.
 */
export const getOnboardingStatus = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      hasUsername: v.boolean(),
      hasStarterDeck: v.boolean(),
      hasWallet: v.boolean(),
    })
  ),
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

    if (!user) {
      return null;
    }

    return {
      hasUsername: !!user.username,
      hasStarterDeck: !!user.activeDeckId,
      hasWallet: !!user.walletAddress,
    };
  },
});

/**
 * Set or update the username for the current user.
 * Required before playing the game.
 */
export const setUsername = mutation({
  args: {
    username: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

    if (!user) {
      throw new Error("User not found. Please authenticate first.");
    }

    // Validate username
    const usernameNormalized = args.username.toLowerCase().trim();
    if (usernameNormalized.length < 3 || usernameNormalized.length > 20) {
      throw new Error("Username must be between 3 and 20 characters");
    }

    // Check availability
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", usernameNormalized))
      .first();

    if (existingUsername && existingUsername._id !== user._id) {
      throw new Error("Username is already taken");
    }

    await ctx.db.patch(user._id, {
      username: usernameNormalized,
      name: args.username, // Keep original casing for display
    });

    return { success: true };
  },
});

/**
 * Get the current user's profile.
 * Returns null if not authenticated or user not found.
 *
 * UPDATED: Now reads gold from playerCurrency table (source of truth)
 */
export const getCurrentUserProfile = mutation({
  args: {},
  async handler(ctx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

    if (!user) {
      return null;
    }

    // Get currency from playerCurrency table (source of truth)
    const currency = await ctx.db
      .query("playerCurrency")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get XP/level from playerXP table (source of truth)
    const playerXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return {
      userId: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      gold: currency?.gold ?? 500, // Read from playerCurrency, fallback to default
      xp: playerXP?.currentXP ?? 0, // Read from playerXP, fallback to default
      level: playerXP?.currentLevel ?? 1, // Read from playerXP, fallback to default
      hasUsername: !!user.username,
    };
  },
});
