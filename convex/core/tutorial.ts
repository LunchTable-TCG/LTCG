import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";

/**
 * Tutorial Progress Management
 *
 * Handles tracking of player tutorial completion and help mode preferences.
 */

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get current user's tutorial status
 *
 * Returns tutorial progress and whether to show resume prompt.
 */
export const getTutorialStatus = query({
  args: {},
  returns: v.union(
    v.object({
      needsTutorial: v.boolean(),
      completed: v.boolean(),
      lastMoment: v.number(),
      dismissCount: v.number(),
      shouldShowResumePrompt: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);
    if (!auth) return null;

    const user = await ctx.db.get(auth.userId);
    if (!user) return null;

    const progress = user.tutorialProgress;

    // No progress recorded yet = needs tutorial
    if (!progress) {
      return {
        needsTutorial: true,
        completed: false,
        lastMoment: 0,
        dismissCount: 0,
        shouldShowResumePrompt: false, // First time, just start tutorial
      };
    }

    // Already completed = no prompts needed
    if (progress.completed) {
      return {
        needsTutorial: false,
        completed: true,
        lastMoment: progress.lastMoment,
        dismissCount: progress.dismissCount,
        shouldShowResumePrompt: false,
      };
    }

    // Dismissed 3+ times = respect their choice
    if (progress.dismissCount >= 3) {
      return {
        needsTutorial: false,
        completed: false,
        lastMoment: progress.lastMoment,
        dismissCount: progress.dismissCount,
        shouldShowResumePrompt: false,
      };
    }

    // In progress, not dismissed enough = show resume prompt
    return {
      needsTutorial: true,
      completed: false,
      lastMoment: progress.lastMoment,
      dismissCount: progress.dismissCount,
      shouldShowResumePrompt: progress.lastMoment > 0, // Only if they started
    };
  },
});

/**
 * Get user's help mode preference
 */
export const getHelpModeEnabled = query({
  args: {},
  returns: v.union(v.boolean(), v.null()),
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);
    if (!auth) return null;

    const user = await ctx.db.get(auth.userId);
    if (!user) return null;

    return user.helpModeEnabled ?? false;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Update tutorial progress after completing a moment
 *
 * @param moment - The moment number just completed (1-5)
 */
export const updateTutorialProgress = mutation({
  args: {
    moment: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentProgress = user.tutorialProgress ?? {
      completed: false,
      lastMoment: 0,
      dismissCount: 0,
    };

    // Only update if progressing forward
    if (args.moment > currentProgress.lastMoment) {
      await ctx.db.patch(auth.userId, {
        tutorialProgress: {
          ...currentProgress,
          lastMoment: args.moment,
        },
      });
    }

    return { success: true };
  },
});

/**
 * Mark tutorial as completed
 */
export const completeTutorial = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentProgress = user.tutorialProgress ?? {
      completed: false,
      lastMoment: 0,
      dismissCount: 0,
    };

    await ctx.db.patch(auth.userId, {
      tutorialProgress: {
        ...currentProgress,
        completed: true,
        lastMoment: 5, // All moments completed
        completedAt: Date.now(),
      },
    });

    return { success: true };
  },
});

/**
 * Dismiss tutorial (increment dismiss count)
 *
 * Called when user clicks "Not Now" on resume prompt or exits tutorial early.
 */
export const dismissTutorial = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    dismissCount: v.number(),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentProgress = user.tutorialProgress ?? {
      completed: false,
      lastMoment: 0,
      dismissCount: 0,
    };

    const newDismissCount = currentProgress.dismissCount + 1;

    await ctx.db.patch(auth.userId, {
      tutorialProgress: {
        ...currentProgress,
        dismissCount: newDismissCount,
      },
    });

    return { success: true, dismissCount: newDismissCount };
  },
});

/**
 * Reset tutorial progress (start over)
 *
 * Allows user to restart the tutorial from the beginning.
 */
export const resetTutorial = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    await ctx.db.patch(auth.userId, {
      tutorialProgress: {
        completed: false,
        lastMoment: 0,
        dismissCount: 0,
      },
    });

    return { success: true };
  },
});

/**
 * Set help mode preference
 */
export const setHelpModeEnabled = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    await ctx.db.patch(auth.userId, {
      helpModeEnabled: args.enabled,
    });

    return { success: true };
  },
});

/**
 * Initialize tutorial for new user
 *
 * Called when a new user account is created to set up initial tutorial state.
 */
export const initializeTutorial = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx) => {
    const auth = await requireAuthMutation(ctx);

    const user = await ctx.db.get(auth.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Only initialize if not already set
    if (!user.tutorialProgress) {
      await ctx.db.patch(auth.userId, {
        tutorialProgress: {
          completed: false,
          lastMoment: 0,
          dismissCount: 0,
        },
        helpModeEnabled: true, // Enable help mode by default for new users
      });
    }

    return { success: true };
  },
});
