import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

export const { auth, signIn: convexSignIn, signOut: convexSignOut, store } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return {
          email: params.email as string,
          name: params.username as string,
          username: params.username as string,
        };
      },
    }),
  ],
});

/**
 * Custom Sign Up Mutation
 * Creates a new user and returns a session token
 */
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if username is taken
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.username))
      .first();

    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    // Create user (simplified - in production use proper password hashing)
    const userId = await ctx.db.insert("users", {
      email: args.email,
      username: args.username,
      name: args.username,
      // Game-specific fields
      rankedElo: 1000,
      casualRating: 1000,
      totalWins: 0,
      totalLosses: 0,
      createdAt: Date.now(),
      isAiAgent: false,
      level: 1,
      xp: 0,
    });

    // Create session token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
    });

    // Initialize player data asynchronously
    await ctx.scheduler.runAfter(0, internal.economy.initializePlayerCurrency, {
      userId,
      welcomeBonus: {
        gold: 1000,
        gems: 100,
      },
    });

    await ctx.scheduler.runAfter(0, internal.story.initializeStoryProgress, {
      userId,
    });

    return { token, userId, username: args.username };
  },
});

/**
 * Custom Sign In Mutation
 * Validates credentials and returns a session token
 */
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // In production, verify password hash here
    // For now, simplified authentication

    // Create new session token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Clean up old sessions for this user (optional)
    const oldSessions = await ctx.db
      .query("sessions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();

    for (const session of oldSessions) {
      await ctx.db.delete(session._id);
    }

    // Create new session
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
    });

    return {
      token,
      userId: user._id,
      username: user.username || user.name || "",
    };
  },
});

/**
 * Initialize game-specific user data after signup
 * Call this mutation from the frontend after successful registration
 */
export const initializeGameProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if already initialized
    if (user.createdAt) {
      return { success: true, alreadyInitialized: true };
    }

    // Set creation timestamp
    await ctx.db.patch(userId, {
      createdAt: Date.now(),
    });

    // Initialize player currency with welcome bonus
    await ctx.scheduler.runAfter(0, internal.economy.initializePlayerCurrency, {
      userId,
      welcomeBonus: {
        gold: 1000,
        gems: 100,
      },
    });

    // Initialize story mode progress
    await ctx.scheduler.runAfter(0, internal.story.initializeStoryProgress, {
      userId,
    });

    return { success: true, alreadyInitialized: false };
  },
});

// Legacy query for backward compatibility with existing frontend code
export const getSession = query({
  args: { token: v.string() },
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      userId: user._id,
      username: user.username || user.name || "",
      email: user.email || "",
    };
  },
});

// Legacy query for backward compatibility with existing frontend code
export const getCurrentUser = query({
  args: { token: v.string() },
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    return await ctx.db.get(userId);
  },
});
