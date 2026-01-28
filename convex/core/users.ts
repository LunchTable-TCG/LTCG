import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getCurrentUser } from "../lib/convexAuth";
import {
  fullUserValidator,
  userInfoValidator,
  userProfileValidator,
} from "../lib/returnValidators";

/**
 * Get current authenticated user
 *
 * Returns the complete user object for the authenticated user.
 * Returns null if not authenticated.
 * Uses Convex Auth's built-in session management (no token parameter needed).
 *
 * @returns Full user object with all fields, or null if not authenticated
 */
export const currentUser = query({
  args: {},
  returns: fullUserValidator, // Full user object with all fields
  handler: async (ctx) => {
    const auth = await getCurrentUser(ctx);
    if (!auth) return null;

    const user = await ctx.db.get(auth.userId);
    return user;
  },
});

/**
 * Get user by ID (public profile info only)
 *
 * Retrieves basic public information for a user by their ID.
 * Does not include sensitive fields like email or private stats.
 *
 * @param userId - The user ID to fetch
 * @returns Public user info (username, bio, createdAt) or null if not found
 */
export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  returns: userInfoValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get user profile by username (public info only)
 *
 * Retrieves basic public information for a user by their username.
 * Username lookup is case-insensitive.
 *
 * @param username - The username to look up
 * @returns Public user info (username, bio, createdAt) or null if not found
 */
export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  returns: userInfoValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  },
});

/**
 * Get comprehensive user profile with stats for profile dialog
 *
 * Retrieves complete public profile including stats, ratings, and progression.
 * Used for displaying detailed player profiles in the UI.
 * Username lookup is case-insensitive.
 *
 * @param username - The username to look up
 * @returns Full profile with stats (wins, losses, ratings, XP, level) or null if not found
 */
export const getUserProfile = query({
  args: {
    username: v.string(),
  },
  returns: userProfileValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt,
      // Stats
      totalWins: user.totalWins ?? 0,
      totalLosses: user.totalLosses ?? 0,
      rankedWins: user.rankedWins ?? 0,
      rankedLosses: user.rankedLosses ?? 0,
      casualWins: user.casualWins ?? 0,
      casualLosses: user.casualLosses ?? 0,
      storyWins: user.storyWins ?? 0,
      // Ratings
      rankedElo: user.rankedElo ?? 1000,
      casualRating: user.casualRating ?? 1000,
      // Progression
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      // Player type
      isAiAgent: user.isAiAgent ?? false,
    };
  },
});

/**
 * Get user stats by ID
 *
 * Returns comprehensive stats for a user's profile page.
 * Similar to getUserProfile but accepts user ID instead of username.
 *
 * @param userId - The user ID to fetch stats for
 * @returns Full profile with stats (wins, losses, ratings, XP, level) or null if not found
 */
export const getUserStats = query({
  args: {
    userId: v.id("users"),
  },
  returns: userProfileValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);

    if (!user) return null;

    return {
      _id: user._id,
      username: user.username,
      bio: user.bio,
      createdAt: user.createdAt,
      // Stats
      totalWins: user.totalWins ?? 0,
      totalLosses: user.totalLosses ?? 0,
      rankedWins: user.rankedWins ?? 0,
      rankedLosses: user.rankedLosses ?? 0,
      casualWins: user.casualWins ?? 0,
      casualLosses: user.casualLosses ?? 0,
      storyWins: user.storyWins ?? 0,
      // Ratings
      rankedElo: user.rankedElo ?? 1000,
      casualRating: user.casualRating ?? 1000,
      // Progression
      xp: user.xp ?? 0,
      level: user.level ?? 1,
      // Player type
      isAiAgent: user.isAiAgent ?? false,
    };
  },
});

/**
 * Update username mutation (Admin only)
 * Allows admins to update any user's username
 */
export const adminUpdateUsername = mutation({
  args: {
    userId: v.id("users"),
    newUsername: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.newUsername))
      .first();

    if (existingUser && existingUser._id !== args.userId) {
      throw new Error("Username already taken");
    }

    // Update username
    await ctx.db.patch(args.userId, {
      username: args.newUsername,
    });

    return { success: true };
  },
});
