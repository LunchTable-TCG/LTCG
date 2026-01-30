import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Create or get a user based on their Privy ID.
 * Called automatically by AuthGuard when a new user authenticates.
 */
export const createOrGetUser = mutation({
  args: {
    email: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
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
      return {
        userId: existingUser._id,
        isNewUser: false,
        hasUsername: !!existingUser.username,
      };
    }

    // Create new user with game defaults
    const userId = await ctx.db.insert("users", {
      privyId,
      email: args.email,
      createdAt: Date.now(),
      // Game defaults
      gold: 500,
      xp: 0,
      level: 1,
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

    return {
      userId,
      isNewUser: true,
      hasUsername: false,
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

    return {
      userId: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      gold: user.gold ?? 500,
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      hasUsername: !!user.username,
    };
  },
});
