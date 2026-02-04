/**
 * Achievement Admin Module
 *
 * CRUD operations for managing achievement definitions.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators matching schema
const categoryValidator = v.union(
  v.literal("wins"),
  v.literal("games_played"),
  v.literal("collection"),
  v.literal("social"),
  v.literal("story"),
  v.literal("ranked"),
  v.literal("special")
);

const rarityValidator = v.union(
  v.literal("common"),
  v.literal("rare"),
  v.literal("epic"),
  v.literal("legendary")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all achievement definitions with optional filtering
 */
export const listAchievements = query({
  args: {
    category: v.optional(categoryValidator),
    rarity: v.optional(rarityValidator),
    includeInactive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let achievements = await (async () => {
      if (args.category) {
        return await ctx.db
          .query("achievementDefinitions")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect();
      }
      if (args.rarity) {
        return await ctx.db
          .query("achievementDefinitions")
          .withIndex("by_rarity", (q) => q.eq("rarity", args.rarity!))
          .collect();
      }
      return await ctx.db.query("achievementDefinitions").collect();
    })();

    type Achievement = (typeof achievements)[number];

    // Filter by active status
    if (!args.includeInactive) {
      achievements = achievements.filter((a: Achievement) => a.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      achievements = achievements.filter(
        (a: Achievement) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.achievementId.toLowerCase().includes(searchLower) ||
          a.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by category, then rarity, then name
    const rarityOrder: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };
    achievements.sort((a: Achievement, b: Achievement) => {
      const catCompare = a.category.localeCompare(b.category);
      if (catCompare !== 0) return catCompare;
      const rarCompare = rarityOrder[a.rarity]! - rarityOrder[b.rarity]!;
      if (rarCompare !== 0) return rarCompare;
      return a.name.localeCompare(b.name);
    });

    return {
      achievements,
      totalCount: achievements.length,
    };
  },
});

/**
 * Get a single achievement definition by ID
 */
export const getAchievement = query({
  args: {
    achievementDbId: v.id("achievementDefinitions"),
  },
  handler: async (ctx, { achievementDbId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const achievement = await ctx.db.get(achievementDbId);
    if (!achievement) return null;

    // Get unlock stats
    const unlocks = await ctx.db
      .query("userAchievements")
      .withIndex("by_achievement", (q) => q.eq("achievementId", achievement.achievementId))
      .filter((q) => q.eq(q.field("isUnlocked"), true))
      .collect();

    return {
      ...achievement,
      unlockCount: unlocks.length,
    };
  },
});

/**
 * Get achievement statistics
 */
export const getAchievementStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const achievements = await ctx.db.query("achievementDefinitions").collect();
    const activeAchievements = achievements.filter((a) => a.isActive);

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const a of activeAchievements) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
    }

    // Count by rarity
    const byRarity = {
      common: activeAchievements.filter((a) => a.rarity === "common").length,
      rare: activeAchievements.filter((a) => a.rarity === "rare").length,
      epic: activeAchievements.filter((a) => a.rarity === "epic").length,
      legendary: activeAchievements.filter((a) => a.rarity === "legendary").length,
    };

    // Count total unlocks
    const userAchievements = await ctx.db.query("userAchievements").collect();
    const totalUnlocks = userAchievements.filter((ua) => ua.isUnlocked).length;
    const unlocksToday = userAchievements.filter(
      (ua) => ua.isUnlocked && ua.unlockedAt && ua.unlockedAt > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    // Count secret achievements
    const secretCount = activeAchievements.filter((a) => a.isSecret).length;

    return {
      totalAchievements: achievements.length,
      activeAchievements: activeAchievements.length,
      inactiveAchievements: achievements.length - activeAchievements.length,
      secretCount,
      byCategory,
      byRarity,
      totalUnlocks,
      unlocksToday,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new achievement definition
 */
export const createAchievement = mutation({
  args: {
    achievementId: v.string(),
    name: v.string(),
    description: v.string(),
    category: categoryValidator,
    rarity: rarityValidator,
    icon: v.string(),
    requirementType: v.string(),
    targetValue: v.number(),
    rewardGold: v.optional(v.number()),
    rewardXp: v.optional(v.number()),
    rewardGems: v.optional(v.number()),
    rewardBadge: v.optional(v.string()),
    isSecret: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Check for duplicate achievementId
    const existing = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) => q.eq("achievementId", args.achievementId))
      .first();

    if (existing) {
      throw new Error(`Achievement with ID "${args.achievementId}" already exists`);
    }

    // Build rewards object
    const rewards =
      args.rewardGold || args.rewardXp || args.rewardGems || args.rewardBadge
        ? {
            gold: args.rewardGold,
            xp: args.rewardXp,
            gems: args.rewardGems,
            badge: args.rewardBadge,
          }
        : undefined;

    const achievementDbId = await ctx.db.insert("achievementDefinitions", {
      achievementId: args.achievementId,
      name: args.name,
      description: args.description,
      category: args.category,
      rarity: args.rarity,
      icon: args.icon,
      requirementType: args.requirementType,
      targetValue: args.targetValue,
      rewards,
      isSecret: args.isSecret ?? false,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_achievement",
      metadata: {
        achievementDbId,
        achievementId: args.achievementId,
        category: args.category,
        rarity: args.rarity,
      },
      success: true,
    });

    return { achievementDbId, message: `Created achievement "${args.name}"` };
  },
});

/**
 * Update an existing achievement definition
 */
export const updateAchievement = mutation({
  args: {
    achievementDbId: v.id("achievementDefinitions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(categoryValidator),
    rarity: v.optional(rarityValidator),
    icon: v.optional(v.string()),
    requirementType: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    rewardGold: v.optional(v.number()),
    rewardXp: v.optional(v.number()),
    rewardGems: v.optional(v.number()),
    rewardBadge: v.optional(v.string()),
    clearRewards: v.optional(v.boolean()),
    isSecret: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const achievement = await ctx.db.get(args.achievementDbId);
    if (!achievement) {
      throw new Error("Achievement not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.category !== undefined) updates["category"] = args.category;
    if (args.rarity !== undefined) updates["rarity"] = args.rarity;
    if (args.icon !== undefined) updates["icon"] = args.icon;
    if (args.requirementType !== undefined) updates["requirementType"] = args.requirementType;
    if (args.targetValue !== undefined) updates["targetValue"] = args.targetValue;
    if (args.isSecret !== undefined) updates["isSecret"] = args.isSecret;
    if (args.isActive !== undefined) updates["isActive"] = args.isActive;

    // Handle rewards
    if (args.clearRewards) {
      updates["rewards"] = undefined;
    } else if (
      args.rewardGold !== undefined ||
      args.rewardXp !== undefined ||
      args.rewardGems !== undefined ||
      args.rewardBadge !== undefined
    ) {
      updates["rewards"] = {
        gold: args.rewardGold ?? achievement.rewards?.gold,
        xp: args.rewardXp ?? achievement.rewards?.xp,
        gems: args.rewardGems ?? achievement.rewards?.gems,
        badge: args.rewardBadge ?? achievement.rewards?.badge,
      };
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.achievementDbId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_achievement",
      metadata: {
        achievementDbId: args.achievementDbId,
        achievementId: achievement.achievementId,
        updates: Object.keys(updates),
      },
      success: true,
    });

    return { success: true, message: `Updated achievement "${achievement.name}"` };
  },
});

/**
 * Toggle achievement active status
 */
export const toggleAchievementActive = mutation({
  args: {
    achievementDbId: v.id("achievementDefinitions"),
  },
  handler: async (ctx, { achievementDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const achievement = await ctx.db.get(achievementDbId);
    if (!achievement) {
      throw new Error("Achievement not found");
    }

    const newStatus = !achievement.isActive;
    await ctx.db.patch(achievementDbId, { isActive: newStatus });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_achievement" : "deactivate_achievement",
      metadata: {
        achievementDbId,
        achievementId: achievement.achievementId,
        previousStatus: achievement.isActive,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Achievement "${achievement.name}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete an achievement permanently
 */
export const deleteAchievement = mutation({
  args: {
    achievementDbId: v.id("achievementDefinitions"),
  },
  handler: async (ctx, { achievementDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const achievement = await ctx.db.get(achievementDbId);
    if (!achievement) {
      throw new Error("Achievement not found");
    }

    // Check for user achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_achievement", (q) => q.eq("achievementId", achievement.achievementId))
      .first();

    if (userAchievements) {
      throw new Error("Cannot delete achievement with player progress. Deactivate it instead.");
    }

    await ctx.db.delete(achievementDbId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_achievement",
      metadata: {
        achievementDbId,
        achievementId: achievement.achievementId,
      },
      success: true,
    });

    return {
      success: true,
      message: `Permanently deleted achievement "${achievement.name}"`,
    };
  },
});

/**
 * Duplicate an achievement
 */
export const duplicateAchievement = mutation({
  args: {
    achievementDbId: v.id("achievementDefinitions"),
    newAchievementId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, { achievementDbId, newAchievementId, newName }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const source = await ctx.db.get(achievementDbId);
    if (!source) {
      throw new Error("Source achievement not found");
    }

    // Check for duplicate achievementId
    const existing = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) => q.eq("achievementId", newAchievementId))
      .first();

    if (existing) {
      throw new Error(`Achievement with ID "${newAchievementId}" already exists`);
    }

    const { _id, _creationTime, ...achievementData } = source;
    const newAchievementDbId = await ctx.db.insert("achievementDefinitions", {
      ...achievementData,
      achievementId: newAchievementId,
      name: newName,
      isActive: false,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "duplicate_achievement",
      metadata: {
        sourceAchievementDbId: achievementDbId,
        sourceAchievementId: source.achievementId,
        newAchievementDbId,
        newAchievementId,
      },
      success: true,
    });

    return {
      achievementDbId: newAchievementDbId,
      message: `Created "${newName}" as a copy of "${source.name}"`,
    };
  },
});
