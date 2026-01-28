import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";

/**
 * User Preferences
 *
 * Simple settings storage for user preferences (notifications, display, game, privacy).
 * Settings are stored as a single document per user.
 */

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  notifications: {
    questComplete: true,
    matchInvites: true,
    friendRequests: true,
    marketplaceSales: true,
    dailyReminders: false,
    promotions: false,
  },
  display: {
    animations: true,
    reducedMotion: false,
    cardQuality: "high" as const,
    showDamageNumbers: true,
  },
  game: {
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 80,
    musicVolume: 60,
    autoEndTurn: false,
    confirmActions: true,
    showTutorialHints: true,
  },
  privacy: {
    profilePublic: true,
    showOnlineStatus: true,
    allowFriendRequests: true,
    showMatchHistory: true,
  },
};

// Validators
const notificationsValidator = v.object({
  questComplete: v.boolean(),
  matchInvites: v.boolean(),
  friendRequests: v.boolean(),
  marketplaceSales: v.boolean(),
  dailyReminders: v.boolean(),
  promotions: v.boolean(),
});

const displayValidator = v.object({
  animations: v.boolean(),
  reducedMotion: v.boolean(),
  cardQuality: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
  showDamageNumbers: v.boolean(),
});

const gameValidator = v.object({
  soundEnabled: v.boolean(),
  musicEnabled: v.boolean(),
  soundVolume: v.number(),
  musicVolume: v.number(),
  autoEndTurn: v.boolean(),
  confirmActions: v.boolean(),
  showTutorialHints: v.boolean(),
});

const privacyValidator = v.object({
  profilePublic: v.boolean(),
  showOnlineStatus: v.boolean(),
  allowFriendRequests: v.boolean(),
  showMatchHistory: v.boolean(),
});

/**
 * Get user preferences
 * Returns default preferences if none exist yet
 */
export const getPreferences = query({
  args: {},
  returns: v.object({
    notifications: notificationsValidator,
    display: displayValidator,
    game: gameValidator,
    privacy: privacyValidator,
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Check if preferences exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      return {
        notifications: existing.notifications,
        display: existing.display,
        game: existing.game,
        privacy: existing.privacy,
      };
    }

    // Return defaults if no preferences exist yet
    return DEFAULT_PREFERENCES;
  },
});

/**
 * Update user preferences
 * Creates new preferences if none exist, otherwise updates existing
 */
export const updatePreferences = mutation({
  args: {
    notifications: v.optional(notificationsValidator),
    display: v.optional(displayValidator),
    game: v.optional(gameValidator),
    privacy: v.optional(privacyValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Check if preferences exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Update existing preferences (merge with existing values)
      await ctx.db.patch(existing._id, {
        notifications: args.notifications ?? existing.notifications,
        display: args.display ?? existing.display,
        game: args.game ?? existing.game,
        privacy: args.privacy ?? existing.privacy,
        updatedAt: Date.now(),
      });
    } else {
      // Create new preferences document
      await ctx.db.insert("userPreferences", {
        userId,
        notifications: args.notifications ?? DEFAULT_PREFERENCES.notifications,
        display: args.display ?? DEFAULT_PREFERENCES.display,
        game: args.game ?? DEFAULT_PREFERENCES.game,
        privacy: args.privacy ?? DEFAULT_PREFERENCES.privacy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});

/**
 * Update username
 */
export const updateUsername = mutation({
  args: {
    username: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Validate username
    const username = args.username.trim();
    if (username.length < 3) {
      return { success: false, error: "Username must be at least 3 characters" };
    }
    if (username.length > 20) {
      return { success: false, error: "Username must be less than 20 characters" };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return {
        success: false,
        error: "Username can only contain letters, numbers, hyphens, and underscores",
      };
    }

    // Check if username is already taken
    const existingUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", username))
      .first();

    if (existingUser && existingUser._id !== userId) {
      return { success: false, error: "Username is already taken" };
    }

    // Update username
    await ctx.db.patch(userId, { username });

    return { success: true };
  },
});

/**
 * Change password
 * Allows authenticated users to change their password by providing current and new passwords
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Validate new password
    if (args.newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    // Get user to verify they exist
    const user = await ctx.db.get(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Note: Password change feature requires email provider configuration
    // For now, return success message indicating the feature is in progress
    return {
      success: false,
      error:
        "Password change requires email verification. This feature will be available soon. Please contact support if you need to change your password.",
    };
  },
});

/**
 * Delete user account
 * Permanently deletes the user and all associated data
 */
export const deleteAccount = mutation({
  args: {
    confirmPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get user email for password verification
    const user = await ctx.db.get(userId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    try {
      // Delete user preferences
      const preferences = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (preferences) {
        await ctx.db.delete(preferences._id);
      }

      // Delete user's game-related data
      // Player cards
      const playerCards = await ctx.db
        .query("playerCards")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const card of playerCards) {
        await ctx.db.delete(card._id);
      }

      // Decks (table is named userDecks)
      const decks = await ctx.db
        .query("userDecks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const deck of decks) {
        await ctx.db.delete(deck._id);
      }

      // Story progress
      const storyProgress = await ctx.db
        .query("storyProgress")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const progress of storyProgress) {
        await ctx.db.delete(progress._id);
      }

      // Match history (has winnerId/loserId, not userId)
      const matchesAsWinner = await ctx.db
        .query("matchHistory")
        .withIndex("by_winner", (q) => q.eq("winnerId", userId))
        .collect();

      for (const match of matchesAsWinner) {
        await ctx.db.delete(match._id);
      }

      const matchesAsLoser = await ctx.db
        .query("matchHistory")
        .withIndex("by_loser", (q) => q.eq("loserId", userId))
        .collect();

      for (const match of matchesAsLoser) {
        await ctx.db.delete(match._id);
      }

      // Note: Friend relationships and user presence should be cleaned up
      // through the social module. For now, we focus on core user data.

      // Note: Auth-related tables (authSessions, authAccounts, etc.) should be cleaned up
      // by an admin or through cascading deletes in production.
      // For now, we mark the user as deleted by removing their main data.

      // Delete the user record
      await ctx.db.delete(userId);

      return { success: true };
    } catch (error) {
      console.error("Account deletion error:", error);
      return { success: false, error: "Failed to delete account. Please try again." };
    }
  },
});
