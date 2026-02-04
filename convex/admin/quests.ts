/**
 * Quest Admin Module
 *
 * CRUD operations for managing quest definitions.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// Validators matching schema
const questTypeValidator = v.union(
  v.literal("daily"),
  v.literal("weekly"),
  v.literal("achievement")
);

const gameModeValidator = v.union(v.literal("ranked"), v.literal("casual"), v.literal("story"));

// =============================================================================
// Queries
// =============================================================================

/**
 * List all quest definitions with optional filtering
 */
export const listQuests = query({
  args: {
    questType: v.optional(questTypeValidator),
    includeInactive: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let quests = await (async () => {
      if (args.questType) {
        const questType = args.questType;
        return await ctx.db
          .query("questDefinitions")
          .withIndex("by_type", (q) => q.eq("questType", questType))
          .collect();
      }
      return await ctx.db.query("questDefinitions").collect();
    })();

    type Quest = (typeof quests)[number];

    // Filter by active status
    if (!args.includeInactive) {
      quests = quests.filter((q: Quest) => q.isActive);
    }

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      quests = quests.filter(
        (q: Quest) =>
          q.name.toLowerCase().includes(searchLower) ||
          q.questId.toLowerCase().includes(searchLower) ||
          q.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by type, then name
    quests.sort((a: Quest, b: Quest) => {
      const typeOrder: Record<string, number> = { daily: 0, weekly: 1, achievement: 2 };
      const typeCompare = (typeOrder[a.questType] ?? 0) - (typeOrder[b.questType] ?? 0);
      if (typeCompare !== 0) return typeCompare;
      return a.name.localeCompare(b.name);
    });

    return {
      quests,
      totalCount: quests.length,
    };
  },
});

/**
 * Get a single quest definition by ID
 */
export const getQuest = query({
  args: {
    questDbId: v.id("questDefinitions"),
  },
  handler: async (ctx, { questDbId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    return await ctx.db.get(questDbId);
  },
});

/**
 * Get quest statistics
 */
export const getQuestStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const quests = await ctx.db.query("questDefinitions").collect();
    const activeQuests = quests.filter((q) => q.isActive);

    // Count by type
    const byType = {
      daily: activeQuests.filter((q) => q.questType === "daily").length,
      weekly: activeQuests.filter((q) => q.questType === "weekly").length,
      achievement: activeQuests.filter((q) => q.questType === "achievement").length,
    };

    // Count active user quests
    const userQuests = await ctx.db.query("userQuests").collect();
    const activeUserQuests = userQuests.filter((uq) => uq.status === "active").length;
    const completedToday = userQuests.filter(
      (uq) =>
        uq.status === "completed" &&
        uq.completedAt &&
        uq.completedAt > Date.now() - 24 * 60 * 60 * 1000
    ).length;

    return {
      totalQuests: quests.length,
      activeQuests: activeQuests.length,
      inactiveQuests: quests.length - activeQuests.length,
      byType,
      activeUserQuests,
      completedToday,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new quest definition
 */
export const createQuest = mutation({
  args: {
    questId: v.string(),
    name: v.string(),
    description: v.string(),
    questType: questTypeValidator,
    requirementType: v.string(),
    targetValue: v.number(),
    rewardGold: v.number(),
    rewardXp: v.number(),
    rewardGems: v.optional(v.number()),
    filterGameMode: v.optional(gameModeValidator),
    filterArchetype: v.optional(v.string()),
    filterCardType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Check for duplicate questId
    const existing = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", args.questId))
      .first();

    if (existing) {
      throw new Error(`Quest with ID "${args.questId}" already exists`);
    }

    // Build filters object
    const filters =
      args.filterGameMode || args.filterArchetype || args.filterCardType
        ? {
            gameMode: args.filterGameMode,
            archetype: args.filterArchetype,
            cardType: args.filterCardType,
          }
        : undefined;

    const questDbId = await ctx.db.insert("questDefinitions", {
      questId: args.questId,
      name: args.name,
      description: args.description,
      questType: args.questType,
      requirementType: args.requirementType,
      targetValue: args.targetValue,
      rewards: {
        gold: args.rewardGold,
        xp: args.rewardXp,
        gems: args.rewardGems,
      },
      filters,
      isActive: args.isActive ?? true,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_quest",
      metadata: {
        questDbId,
        questId: args.questId,
        questType: args.questType,
      },
      success: true,
    });

    return { questDbId, message: `Created quest "${args.name}"` };
  },
});

/**
 * Update an existing quest definition
 */
export const updateQuest = mutation({
  args: {
    questDbId: v.id("questDefinitions"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    requirementType: v.optional(v.string()),
    targetValue: v.optional(v.number()),
    rewardGold: v.optional(v.number()),
    rewardXp: v.optional(v.number()),
    rewardGems: v.optional(v.number()),
    filterGameMode: v.optional(gameModeValidator),
    filterArchetype: v.optional(v.string()),
    filterCardType: v.optional(v.string()),
    clearFilters: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const quest = await ctx.db.get(args.questDbId);
    if (!quest) {
      throw new Error("Quest not found");
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (args.name !== undefined) updates["name"] = args.name;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.requirementType !== undefined) updates["requirementType"] = args.requirementType;
    if (args.targetValue !== undefined) updates["targetValue"] = args.targetValue;
    if (args.isActive !== undefined) updates["isActive"] = args.isActive;

    // Handle rewards
    if (
      args.rewardGold !== undefined ||
      args.rewardXp !== undefined ||
      args.rewardGems !== undefined
    ) {
      updates["rewards"] = {
        gold: args.rewardGold ?? quest.rewards.gold,
        xp: args.rewardXp ?? quest.rewards.xp,
        gems: args.rewardGems ?? quest.rewards.gems,
      };
    }

    // Handle filters
    if (args.clearFilters) {
      updates["filters"] = undefined;
    } else if (
      args.filterGameMode !== undefined ||
      args.filterArchetype !== undefined ||
      args.filterCardType !== undefined
    ) {
      updates["filters"] = {
        gameMode: args.filterGameMode ?? quest.filters?.gameMode,
        archetype: args.filterArchetype ?? quest.filters?.archetype,
        cardType: args.filterCardType ?? quest.filters?.cardType,
      };
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No updates provided");
    }

    await ctx.db.patch(args.questDbId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_quest",
      metadata: {
        questDbId: args.questDbId,
        questId: quest.questId,
        updates: Object.keys(updates).join(", "),
      },
      success: true,
    });

    return { success: true, message: `Updated quest "${quest.name}"` };
  },
});

/**
 * Toggle quest active status
 */
export const toggleQuestActive = mutation({
  args: {
    questDbId: v.id("questDefinitions"),
  },
  handler: async (ctx, { questDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const quest = await ctx.db.get(questDbId);
    if (!quest) {
      throw new Error("Quest not found");
    }

    const newStatus = !quest.isActive;
    await ctx.db.patch(questDbId, { isActive: newStatus });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "activate_quest" : "deactivate_quest",
      metadata: {
        questDbId,
        questId: quest.questId,
        previousStatus: quest.isActive,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      isActive: newStatus,
      message: `Quest "${quest.name}" is now ${newStatus ? "active" : "inactive"}`,
    };
  },
});

/**
 * Delete a quest permanently
 */
export const deleteQuest = mutation({
  args: {
    questDbId: v.id("questDefinitions"),
  },
  handler: async (ctx, { questDbId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const quest = await ctx.db.get(questDbId);
    if (!quest) {
      throw new Error("Quest not found");
    }

    // Check for active user quests
    const activeUserQuests = await ctx.db
      .query("userQuests")
      .withIndex("by_quest", (q) => q.eq("questId", quest.questId))
      .first();

    if (activeUserQuests) {
      throw new Error("Cannot delete quest with active player progress. Deactivate it instead.");
    }

    await ctx.db.delete(questDbId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_quest",
      metadata: {
        questDbId,
        questId: quest.questId,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted quest "${quest.name}"` };
  },
});

/**
 * Duplicate a quest
 */
export const duplicateQuest = mutation({
  args: {
    questDbId: v.id("questDefinitions"),
    newQuestId: v.string(),
    newName: v.string(),
  },
  handler: async (ctx, { questDbId, newQuestId, newName }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const source = await ctx.db.get(questDbId);
    if (!source) {
      throw new Error("Source quest not found");
    }

    // Check for duplicate questId
    const existing = await ctx.db
      .query("questDefinitions")
      .withIndex("by_quest_id", (q) => q.eq("questId", newQuestId))
      .first();

    if (existing) {
      throw new Error(`Quest with ID "${newQuestId}" already exists`);
    }

    const { _id, _creationTime, ...questData } = source;
    const newQuestDbId = await ctx.db.insert("questDefinitions", {
      ...questData,
      questId: newQuestId,
      name: newName,
      isActive: false,
      createdAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "duplicate_quest",
      metadata: {
        sourceQuestDbId: questDbId,
        sourceQuestId: source.questId,
        newQuestDbId,
        newQuestId,
      },
      success: true,
    });

    return {
      questDbId: newQuestDbId,
      message: `Created "${newName}" as a copy of "${source.name}"`,
    };
  },
});
