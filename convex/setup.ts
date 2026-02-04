/**
 * Master Setup & Seed Functions
 *
 * Automated setup for the entire LTCG admin system.
 * Run these functions to bootstrap a fresh deployment.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, internalMutation } from "./functions";

/**
 * Complete system setup - runs all setup functions in correct order
 * This is idempotent and safe to run multiple times
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
      await ctx.runMutation(internal.setupSystem.createSystemUser, {});
      const step1 = results.steps[results.steps.length - 1];
      if (step1) step1.message = "System user created";

      // Get system user ID for seeding functions
      const systemUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("_id"), "system:internal" as any))
        .first();

      if (!systemUser) {
        throw new Error("System user not found after creation");
      }

      // Step 2: Seed default configurations
      results.steps.push({ name: "Default Configs", success: true, message: "Starting..." });
      await ctx.runMutation(internal.admin.config.seedDefaultConfigs, {
        adminId: systemUser._id,
      });
      const step2 = results.steps[results.steps.length - 1];
      if (step2) step2.message = "Default configs seeded";

      // Step 3: Seed AI configurations
      results.steps.push({ name: "AI Configs", success: true, message: "Starting..." });
      await ctx.runMutation(internal.admin.aiConfig.seedAIDefaultConfigs, {
        adminId: systemUser._id,
      });
      const step3 = results.steps[results.steps.length - 1];
      if (step3) step3.message = "AI configs seeded";

      // Step 4: Seed starter cards
      results.steps.push({ name: "Starter Cards", success: true, message: "Starting..." });
      await ctx.runMutation(internal.scripts.seedStarterCards.seedStarterCards, {});
      const lastStep = results.steps[results.steps.length - 1];
      if (lastStep) lastStep.message = "Starter cards seeded";

      // Step 5: Initialize progression system
      results.steps.push({ name: "Progression System", success: true, message: "Starting..." });
      await ctx.runMutation(internal.setupSystem.initializeProgressionSystem, {});
      const lastStep5 = results.steps[results.steps.length - 1];
      if (lastStep5) lastStep5.message = "Quests and achievements seeded";

      // Note: The following must be run separately as public mutations:
      // - bun run seed:story (Story chapters)
      // - npx convex run treasury/policies:setupDefaultPolicies
      // - npx convex run alerts/channels:setupDefaults
      // - npx convex run alerts/rules:setupDefaults

      results.steps.push({
        name: "Complete",
        success: true,
        message: `Setup completed in ${Date.now() - results.startTime}ms`,
      });

      console.log("✅ Complete setup finished successfully");
      console.log("Steps:", results.steps);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Setup failed:", errorMessage);

      results.steps.push({
        name: "Error",
        success: false,
        message: errorMessage,
      });

      throw error;
    }
  },
});

/**
 * Setup superadmin (must be run separately with Privy user ID)
 * Run this AFTER setupComplete to create your first admin user
 */
export const setupSuperadmin = internalMutation({
  args: {
    privyUserId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`🔐 Creating superadmin for Privy user: ${args.privyUserId}`);

    await ctx.runMutation(internal.setupSystem.bootstrapSuperadmin, {
      privyId: args.privyUserId,
    });

    console.log("✅ Superadmin created successfully");
    return { success: true, privyUserId: args.privyUserId };
  },
});

/**
 * Quick seed for development/testing
 * Seeds only essential data for rapid iteration
 */
export const setupQuick = internalMutation({
  handler: async (ctx) => {
    console.log("⚡ Running quick setup (essential data only)...");

    // System user
    await ctx.runMutation(internal.setupSystem.createSystemUser, {});

    // Get system user ID
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), "system:internal" as any))
      .first();

    if (!systemUser) {
      throw new Error("System user not found after creation");
    }

    // Configs
    await ctx.runMutation(internal.admin.config.seedDefaultConfigs, {
      adminId: systemUser._id,
    });
    await ctx.runMutation(internal.admin.aiConfig.seedAIDefaultConfigs, {
      adminId: systemUser._id,
    });

    // Cards (needed for decks)
    await ctx.runMutation(internal.scripts.seedStarterCards.seedStarterCards, {});

    console.log("✅ Quick setup complete");
    return { success: true, mode: "quick" };
  },
});

/**
 * Reset everything (DANGEROUS - dev/test only)
 * This will clear all seeded data (configs, cards, story, etc.)
 * Does NOT clear user data, progress, or wallets
 */
export const resetAll = internalMutation({
  handler: async (ctx) => {
    console.warn("⚠️  RESETTING ALL SEEDED DATA - This cannot be undone!");

    let deletedCount = 0;

    // Clear configs
    const configs = await ctx.db.query("systemConfig").collect();
    for (const config of configs) {
      await ctx.db.delete(config._id);
      deletedCount++;
    }

    // Clear card definitions
    const cards = await ctx.db.query("cardDefinitions").collect();
    for (const card of cards) {
      await ctx.db.delete(card._id);
      deletedCount++;
    }

    // Clear story chapters and stages
    const chapters = await ctx.db.query("storyChapters").collect();
    for (const chapter of chapters) {
      await ctx.db.delete(chapter._id);
      deletedCount++;
    }

    const stages = await ctx.db.query("storyStages").collect();
    for (const stage of stages) {
      await ctx.db.delete(stage._id);
      deletedCount++;
    }

    // Clear quest definitions
    const quests = await ctx.db.query("questDefinitions").collect();
    for (const quest of quests) {
      await ctx.db.delete(quest._id);
      deletedCount++;
    }

    // Clear achievement definitions
    const achievements = await ctx.db.query("achievementDefinitions").collect();
    for (const achievement of achievements) {
      await ctx.db.delete(achievement._id);
      deletedCount++;
    }

    // Clear alert channels and rules
    const channels = await ctx.db.query("alertChannels").collect();
    for (const channel of channels) {
      await ctx.db.delete(channel._id);
      deletedCount++;
    }

    const rules = await ctx.db.query("alertRules").collect();
    for (const rule of rules) {
      await ctx.db.delete(rule._id);
      deletedCount++;
    }

    // Clear treasury policies
    const policies = await ctx.db.query("treasuryPolicies").collect();
    for (const policy of policies) {
      await ctx.db.delete(policy._id);
      deletedCount++;
    }

    console.log(`✅ Reset complete - ${deletedCount} records deleted`);
    return {
      success: true,
      deletedCount,
      warning: "All seeded data has been cleared. User data and progress are preserved.",
    };
  },
});

/**
 * Check setup status
 * Returns what's been seeded and what's missing
 */
export const checkSetupStatus = mutation({
  handler: async (ctx) => {
    const status = {
      systemUser: false,
      configs: 0,
      aiConfigs: 0,
      treasuryPolicies: 0,
      starterCards: 0,
      storyChapters: 0,
      storyStages: 0,
      quests: 0,
      achievements: 0,
      alertChannels: 0,
      alertRules: 0,
      superadmins: 0,
      admins: 0,
    };

    // Check system user
    const systemUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), "system:internal" as any))
      .first();
    status.systemUser = !!systemUser;

    // Count configs
    status.configs = (await ctx.db.query("systemConfig").collect()).length;
    const allConfigs = await ctx.db.query("systemConfig").collect();
    status.aiConfigs = allConfigs.filter((c) => c.category === "ai").length;
    status.treasuryPolicies = (await ctx.db.query("treasuryPolicies").collect()).length;
    status.starterCards = (await ctx.db.query("cardDefinitions").collect()).length;
    status.storyChapters = (await ctx.db.query("storyChapters").collect()).length;
    status.storyStages = (await ctx.db.query("storyStages").collect()).length;
    status.quests = (await ctx.db.query("questDefinitions").collect()).length;
    status.achievements = (await ctx.db.query("achievementDefinitions").collect()).length;
    status.alertChannels = (await ctx.db.query("alertChannels").collect()).length;
    status.alertRules = (await ctx.db.query("alertRules").collect()).length;

    // Count admins
    const adminRoles = await ctx.db.query("adminRoles").collect();
    status.admins = adminRoles.filter((r) => r.isActive).length;
    status.superadmins = adminRoles.filter((r) => r.role === "superadmin" && r.isActive).length;

    const isSetupComplete =
      status.systemUser &&
      status.configs > 0 &&
      status.aiConfigs > 0 &&
      status.starterCards > 0 &&
      status.storyChapters > 0 &&
      status.quests > 0 &&
      status.achievements > 0;

    return {
      isSetupComplete,
      needsSuperadmin: status.superadmins === 0,
      details: status,
      recommendations: [
        !status.systemUser && "Run: bun convex run setup:setupComplete",
        status.superadmins === 0 &&
          "Run: bun convex run setup:setupSuperadmin --privyUserId YOUR_PRIVY_ID",
        status.treasuryPolicies === 0 && "Treasury policies not set up",
        status.alertChannels === 0 && "Alert channels not set up",
      ].filter(Boolean),
    };
  },
});
