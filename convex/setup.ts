/**
 * Master Setup & Seed Functions
 *
 * System bootstrap for LTCG deployment.
 * Most setup logic has moved to component packages.
 * This file handles core user setup only.
 */

import { v } from "convex/values";
import * as generatedApi from "./_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { internalMutation, mutation } from "./functions";

/**
 * Complete system setup - creates system user and bootstraps core data
 * Component-specific seeding should be done via component clients
 */
export const setupComplete = internalMutation({
  handler: async (ctx) => {
    const results = {
      steps: [] as Array<{ name: string; success: boolean; message: string }>,
      startTime: Date.now(),
    };

    try {
      // Step 1: Create system user
      results.steps.push({ name: "System User", success: true, message: "Starting..." });
      await ctx.runMutation(internalAny.setupSystem.createSystemUser, {});
      const step1 = results.steps[results.steps.length - 1];
      if (step1) step1.message = "System user created";

      results.steps.push({
        name: "Complete",
        success: true,
        message: `Core setup completed in ${Date.now() - results.startTime}ms. Run component seeds separately.`,
      });

      console.log("Setup finished. Run component-specific seeds via their client classes.");
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Setup failed:", errorMessage);
      results.steps.push({ name: "Error", success: false, message: errorMessage });
      throw error;
    }
  },
});

/**
 * Setup superadmin (must be run separately with Privy user ID)
 */
export const setupSuperadmin = internalMutation({
  args: {
    privyUserId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internalAny.setupSystem.bootstrapSuperadmin, {
      privyId: args.privyUserId,
    });
    return { success: true, privyUserId: args.privyUserId };
  },
});

/**
 * Check setup status — only checks core tables (users)
 */
export const checkSetupStatus = mutation({
  handler: async (ctx) => {
    const systemUser = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", "system:internal"))
      .first();

    return {
      isSetupComplete: !!systemUser,
      details: { systemUser: !!systemUser },
      recommendations: [!systemUser && "Run: bun convex run setup:setupComplete"].filter(Boolean),
    };
  },
});
