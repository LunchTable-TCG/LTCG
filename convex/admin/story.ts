/**
 * Story Admin Module
 *
 * CRUD operations for managing story chapters and stages.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Validators
// =============================================================================

const unlockConditionTypeValidator = v.union(
  v.literal("chapter_complete"),
  v.literal("player_level"),
  v.literal("none")
);

const difficultyValidator = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
  v.literal("boss")
);

const dialogueLineValidator = v.object({
  speaker: v.string(),
  text: v.string(),
  imageUrl: v.optional(v.string()),
});

const simpleDialogueLineValidator = v.object({
  speaker: v.string(),
  text: v.string(),
});

// =============================================================================
// CHAPTER QUERIES
// =============================================================================

/**
 * List all chapters ordered by number
 */
export const listChapters = query({
  args: {
    includeUnpublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let chapters = await ctx.db.query("storyChapters").withIndex("by_number").collect();

    // Filter by status
    if (!args.includeUnpublished) {
      chapters = chapters.filter((c) => c.status === "published");
    }

    // Get stage counts for each chapter
    const chaptersWithCounts = await Promise.all(
      chapters.map(async (chapter) => {
        const stages = await ctx.db
          .query("storyStages")
          .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
          .collect();

        const publishedStages = stages.filter((s) => s.status === "published");

        return {
          ...chapter,
          stageCount: stages.length,
          publishedStageCount: publishedStages.length,
        };
      })
    );

    return {
      chapters: chaptersWithCounts,
      totalCount: chaptersWithCounts.length,
    };
  },
});

/**
 * Get chapter with its stages
 */
export const getChapter = query({
  args: {
    chapterId: v.id("storyChapters"),
  },
  handler: async (ctx, { chapterId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const chapter = await ctx.db.get(chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapterId))
      .collect();

    // Sort stages by stageNumber
    stages.sort((a, b) => a.stageNumber - b.stageNumber);

    // Get unlock condition chapter if exists
    let requiredChapter = null;
    if (chapter.unlockCondition?.requiredChapterId) {
      requiredChapter = await ctx.db.get(chapter.unlockCondition.requiredChapterId);
    }

    return {
      chapter,
      stages,
      requiredChapter,
    };
  },
});

/**
 * Get chapter statistics
 */
export const getChapterStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const chapters = await ctx.db.query("storyChapters").collect();
    const stages = await ctx.db.query("storyStages").collect();

    const publishedChapters = chapters.filter((c) => c.status === "published");
    const publishedStages = stages.filter((s) => s.status === "published");

    return {
      totalChapters: chapters.length,
      publishedChapters: publishedChapters.length,
      draftChapters: chapters.length - publishedChapters.length,
      totalStages: stages.length,
      publishedStages: publishedStages.length,
      draftStages: stages.length - publishedStages.length,
    };
  },
});

// =============================================================================
// CHAPTER MUTATIONS
// =============================================================================

/**
 * Create a new chapter
 */
export const createChapter = mutation({
  args: {
    number: v.number(),
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    unlockConditionType: v.optional(unlockConditionTypeValidator),
    requiredChapterId: v.optional(v.id("storyChapters")),
    requiredLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Check for duplicate chapter number
    const existing = await ctx.db
      .query("storyChapters")
      .withIndex("by_number", (q) => q.eq("number", args.number))
      .first();

    if (existing) {
      throw new Error(`Chapter ${args.number} already exists`);
    }

    // Build unlock condition if provided
    const unlockCondition = args.unlockConditionType
      ? {
          type: args.unlockConditionType,
          requiredChapterId: args.requiredChapterId,
          requiredLevel: args.requiredLevel,
        }
      : undefined;

    const now = Date.now();
    const chapterId = await ctx.db.insert("storyChapters", {
      number: args.number,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      unlockCondition,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_story_chapter",
      metadata: {
        chapterId,
        number: args.number,
        title: args.title,
      },
      success: true,
    });

    return { chapterId, message: `Created Chapter ${args.number}: "${args.title}"` };
  },
});

/**
 * Update chapter details
 */
export const updateChapter = mutation({
  args: {
    chapterId: v.id("storyChapters"),
    number: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    unlockConditionType: v.optional(unlockConditionTypeValidator),
    requiredChapterId: v.optional(v.id("storyChapters")),
    requiredLevel: v.optional(v.number()),
    clearUnlockCondition: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Check for duplicate chapter number if changing
    if (args.number !== undefined && args.number !== chapter.number) {
      const newNumber = args.number;
      const existing = await ctx.db
        .query("storyChapters")
        .withIndex("by_number", (q) => q.eq("number", newNumber))
        .first();

      if (existing) {
        throw new Error(`Chapter ${newNumber} already exists`);
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.number !== undefined) updates["number"] = args.number;
    if (args.title !== undefined) updates["title"] = args.title;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.imageUrl !== undefined) updates["imageUrl"] = args.imageUrl;

    // Handle unlock condition
    if (args.clearUnlockCondition) {
      updates["unlockCondition"] = undefined;
    } else if (args.unlockConditionType !== undefined) {
      updates["unlockCondition"] = {
        type: args.unlockConditionType,
        requiredChapterId: args.requiredChapterId,
        requiredLevel: args.requiredLevel,
      };
    }

    await ctx.db.patch(args.chapterId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_story_chapter",
      metadata: {
        chapterId: args.chapterId,
        updates: Object.keys(updates).filter((k) => k !== "updatedAt"),
      },
      success: true,
    });

    return { success: true, message: `Updated Chapter ${chapter.number}` };
  },
});

/**
 * Publish or unpublish a chapter
 */
export const publishChapter = mutation({
  args: {
    chapterId: v.id("storyChapters"),
    publish: v.boolean(),
  },
  handler: async (ctx, { chapterId, publish }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const chapter = await ctx.db.get(chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const newStatus = publish ? "published" : "draft";
    await ctx.db.patch(chapterId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: publish ? "publish_story_chapter" : "unpublish_story_chapter",
      metadata: {
        chapterId,
        number: chapter.number,
        title: chapter.title,
      },
      success: true,
    });

    return {
      success: true,
      status: newStatus,
      message: `Chapter ${chapter.number} is now ${newStatus}`,
    };
  },
});

/**
 * Delete a chapter (only if no player progress)
 */
export const deleteChapter = mutation({
  args: {
    chapterId: v.id("storyChapters"),
  },
  handler: async (ctx, { chapterId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const chapter = await ctx.db.get(chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Check for player progress (any user with progress on this chapter)
    const progress = await ctx.db
      .query("storyStageProgress")
      .filter((q) => q.eq(q.field("chapterId"), chapterId))
      .first();

    if (progress) {
      throw new Error(
        "Cannot delete chapter with player progress. Delete player progress first or set to draft."
      );
    }

    // Delete all stages in this chapter
    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapterId))
      .collect();

    for (const stage of stages) {
      await ctx.db.delete(stage._id);
    }

    await ctx.db.delete(chapterId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_story_chapter",
      metadata: {
        chapterId,
        number: chapter.number,
        title: chapter.title,
        stagesDeleted: stages.length,
      },
      success: true,
    });

    return {
      success: true,
      message: `Deleted Chapter ${chapter.number} and ${stages.length} stages`,
    };
  },
});

/**
 * Reorder chapter numbers (swap two chapters)
 */
export const reorderChapters = mutation({
  args: {
    chapterId: v.id("storyChapters"),
    newNumber: v.number(),
  },
  handler: async (ctx, { chapterId, newNumber }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const chapter = await ctx.db.get(chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    const oldNumber = chapter.number;
    if (oldNumber === newNumber) {
      return { success: true, message: "No change needed" };
    }

    // Find chapter currently at newNumber
    const targetChapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_number", (q) => q.eq("number", newNumber))
      .first();

    const now = Date.now();

    // Swap numbers
    if (targetChapter) {
      await ctx.db.patch(targetChapter._id, {
        number: oldNumber,
        updatedAt: now,
      });
    }

    await ctx.db.patch(chapterId, {
      number: newNumber,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "reorder_story_chapters",
      metadata: {
        chapterId,
        oldNumber,
        newNumber,
        swappedWithChapterId: targetChapter?._id,
      },
      success: true,
    });

    return {
      success: true,
      message: targetChapter
        ? `Swapped Chapter ${oldNumber} with Chapter ${newNumber}`
        : `Moved Chapter ${oldNumber} to position ${newNumber}`,
    };
  },
});

// =============================================================================
// STAGE QUERIES
// =============================================================================

/**
 * List stages for a chapter
 */
export const listStages = query({
  args: {
    chapterId: v.id("storyChapters"),
    includeUnpublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    // Filter by status
    if (!args.includeUnpublished) {
      stages = stages.filter((s) => s.status === "published");
    }

    // Sort by stage number
    stages.sort((a, b) => a.stageNumber - b.stageNumber);

    // Get card reward names
    const stagesWithRewards = await Promise.all(
      stages.map(async (stage) => {
        let cardRewardName = null;
        if (stage.cardRewardId) {
          const card = await ctx.db.get(stage.cardRewardId);
          cardRewardName = card?.name;
        }
        return {
          ...stage,
          cardRewardName,
        };
      })
    );

    return {
      stages: stagesWithRewards,
      totalCount: stagesWithRewards.length,
    };
  },
});

/**
 * Get stage details
 */
export const getStage = query({
  args: {
    stageId: v.id("storyStages"),
  },
  handler: async (ctx, { stageId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const stage = await ctx.db.get(stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    const chapter = await ctx.db.get(stage.chapterId);

    // Get card reward details if exists
    let cardReward = null;
    if (stage.cardRewardId) {
      cardReward = await ctx.db.get(stage.cardRewardId);
    }

    return {
      stage,
      chapter,
      cardReward,
    };
  },
});

// =============================================================================
// STAGE MUTATIONS
// =============================================================================

/**
 * Create a new stage
 */
export const createStage = mutation({
  args: {
    chapterId: v.id("storyChapters"),
    stageNumber: v.number(),
    title: v.string(),
    description: v.string(),
    opponentName: v.string(),
    opponentDeckId: v.optional(v.id("decks")),
    opponentDeckArchetype: v.optional(v.string()),
    difficulty: difficultyValidator,
    preMatchDialogue: v.optional(v.array(dialogueLineValidator)),
    postMatchWinDialogue: v.optional(v.array(simpleDialogueLineValidator)),
    postMatchLoseDialogue: v.optional(v.array(simpleDialogueLineValidator)),
    firstClearGold: v.number(),
    repeatGold: v.number(),
    firstClearGems: v.optional(v.number()),
    cardRewardId: v.optional(v.id("cardDefinitions")),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Verify chapter exists
    const chapter = await ctx.db.get(args.chapterId);
    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Check for duplicate stage number in this chapter
    const existing = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) =>
        q.eq("chapterId", args.chapterId).eq("stageNumber", args.stageNumber)
      )
      .first();

    if (existing) {
      throw new Error(`Stage ${args.stageNumber} already exists in this chapter`);
    }

    const now = Date.now();
    const stageId = await ctx.db.insert("storyStages", {
      chapterId: args.chapterId,
      stageNumber: args.stageNumber,
      title: args.title,
      description: args.description,
      opponentName: args.opponentName,
      opponentDeckId: args.opponentDeckId,
      opponentDeckArchetype: args.opponentDeckArchetype,
      difficulty: args.difficulty,
      preMatchDialogue: args.preMatchDialogue,
      postMatchWinDialogue: args.postMatchWinDialogue,
      postMatchLoseDialogue: args.postMatchLoseDialogue,
      firstClearGold: args.firstClearGold,
      repeatGold: args.repeatGold,
      firstClearGems: args.firstClearGems,
      cardRewardId: args.cardRewardId,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_story_stage",
      metadata: {
        stageId,
        chapterId: args.chapterId,
        stageNumber: args.stageNumber,
        title: args.title,
      },
      success: true,
    });

    return { stageId, message: `Created Stage ${args.stageNumber}: "${args.title}"` };
  },
});

/**
 * Update stage details
 */
export const updateStage = mutation({
  args: {
    stageId: v.id("storyStages"),
    stageNumber: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    opponentName: v.optional(v.string()),
    opponentDeckId: v.optional(v.id("decks")),
    opponentDeckArchetype: v.optional(v.string()),
    difficulty: v.optional(difficultyValidator),
    preMatchDialogue: v.optional(v.array(dialogueLineValidator)),
    postMatchWinDialogue: v.optional(v.array(simpleDialogueLineValidator)),
    postMatchLoseDialogue: v.optional(v.array(simpleDialogueLineValidator)),
    firstClearGold: v.optional(v.number()),
    repeatGold: v.optional(v.number()),
    firstClearGems: v.optional(v.number()),
    cardRewardId: v.optional(v.id("cardDefinitions")),
    clearOpponentDeckId: v.optional(v.boolean()),
    clearOpponentDeckArchetype: v.optional(v.boolean()),
    clearCardRewardId: v.optional(v.boolean()),
    clearDialogue: v.optional(
      v.union(
        v.literal("preMatch"),
        v.literal("postMatchWin"),
        v.literal("postMatchLose"),
        v.literal("all")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    // Check for duplicate stage number if changing
    if (args.stageNumber !== undefined && args.stageNumber !== stage.stageNumber) {
      const newStageNumber = args.stageNumber;
      const existing = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter", (q) =>
          q.eq("chapterId", stage.chapterId).eq("stageNumber", newStageNumber)
        )
        .first();

      if (existing) {
        throw new Error(`Stage ${newStageNumber} already exists in this chapter`);
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.stageNumber !== undefined) updates["stageNumber"] = args.stageNumber;
    if (args.title !== undefined) updates["title"] = args.title;
    if (args.description !== undefined) updates["description"] = args.description;
    if (args.opponentName !== undefined) updates["opponentName"] = args.opponentName;
    if (args.difficulty !== undefined) updates["difficulty"] = args.difficulty;
    if (args.firstClearGold !== undefined) updates["firstClearGold"] = args.firstClearGold;
    if (args.repeatGold !== undefined) updates["repeatGold"] = args.repeatGold;
    if (args.firstClearGems !== undefined) updates["firstClearGems"] = args.firstClearGems;

    // Handle optional field clears
    if (args.clearOpponentDeckId) {
      updates["opponentDeckId"] = undefined;
    } else if (args.opponentDeckId !== undefined) {
      updates["opponentDeckId"] = args.opponentDeckId;
    }

    if (args.clearOpponentDeckArchetype) {
      updates["opponentDeckArchetype"] = undefined;
    } else if (args.opponentDeckArchetype !== undefined) {
      updates["opponentDeckArchetype"] = args.opponentDeckArchetype;
    }

    if (args.clearCardRewardId) {
      updates["cardRewardId"] = undefined;
    } else if (args.cardRewardId !== undefined) {
      updates["cardRewardId"] = args.cardRewardId;
    }

    // Handle dialogue updates/clears
    if (args.clearDialogue === "all") {
      updates["preMatchDialogue"] = undefined;
      updates["postMatchWinDialogue"] = undefined;
      updates["postMatchLoseDialogue"] = undefined;
    } else if (args.clearDialogue === "preMatch") {
      updates["preMatchDialogue"] = undefined;
    } else if (args.clearDialogue === "postMatchWin") {
      updates["postMatchWinDialogue"] = undefined;
    } else if (args.clearDialogue === "postMatchLose") {
      updates["postMatchLoseDialogue"] = undefined;
    } else {
      if (args.preMatchDialogue !== undefined) updates["preMatchDialogue"] = args.preMatchDialogue;
      if (args.postMatchWinDialogue !== undefined)
        updates["postMatchWinDialogue"] = args.postMatchWinDialogue;
      if (args.postMatchLoseDialogue !== undefined)
        updates["postMatchLoseDialogue"] = args.postMatchLoseDialogue;
    }

    await ctx.db.patch(args.stageId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_story_stage",
      metadata: {
        stageId: args.stageId,
        updates: Object.keys(updates).filter((k) => k !== "updatedAt"),
      },
      success: true,
    });

    return { success: true, message: `Updated Stage ${stage.stageNumber}` };
  },
});

/**
 * Publish or unpublish a stage
 */
export const publishStage = mutation({
  args: {
    stageId: v.id("storyStages"),
    publish: v.boolean(),
  },
  handler: async (ctx, { stageId, publish }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const stage = await ctx.db.get(stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    const newStatus = publish ? "published" : "draft";
    await ctx.db.patch(stageId, {
      status: newStatus,
      updatedAt: Date.now(),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: publish ? "publish_story_stage" : "unpublish_story_stage",
      metadata: {
        stageId,
        stageNumber: stage.stageNumber,
        title: stage.title,
      },
      success: true,
    });

    return {
      success: true,
      status: newStatus,
      message: `Stage ${stage.stageNumber} is now ${newStatus}`,
    };
  },
});

/**
 * Delete a stage
 */
export const deleteStage = mutation({
  args: {
    stageId: v.id("storyStages"),
  },
  handler: async (ctx, { stageId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const stage = await ctx.db.get(stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    // Check for player progress (any user with progress on this stage)
    const progress = await ctx.db
      .query("storyStageProgress")
      .filter((q) => q.eq(q.field("stageId"), stageId))
      .first();

    if (progress) {
      throw new Error(
        "Cannot delete stage with player progress. Delete player progress first or set to draft."
      );
    }

    await ctx.db.delete(stageId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_story_stage",
      metadata: {
        stageId,
        chapterId: stage.chapterId,
        stageNumber: stage.stageNumber,
        title: stage.title,
      },
      success: true,
    });

    return {
      success: true,
      message: `Deleted Stage ${stage.stageNumber}: "${stage.title}"`,
    };
  },
});

/**
 * Reorder stages within a chapter
 */
export const reorderStages = mutation({
  args: {
    stageId: v.id("storyStages"),
    newStageNumber: v.number(),
  },
  handler: async (ctx, { stageId, newStageNumber }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const stage = await ctx.db.get(stageId);
    if (!stage) {
      throw new Error("Stage not found");
    }

    const oldNumber = stage.stageNumber;
    if (oldNumber === newStageNumber) {
      return { success: true, message: "No change needed" };
    }

    // Find stage currently at newStageNumber in same chapter
    const targetStage = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) =>
        q.eq("chapterId", stage.chapterId).eq("stageNumber", newStageNumber)
      )
      .first();

    const now = Date.now();

    // Swap numbers
    if (targetStage) {
      await ctx.db.patch(targetStage._id, {
        stageNumber: oldNumber,
        updatedAt: now,
      });
    }

    await ctx.db.patch(stageId, {
      stageNumber: newStageNumber,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "reorder_story_stages",
      metadata: {
        stageId,
        chapterId: stage.chapterId,
        oldNumber,
        newStageNumber,
        swappedWithStageId: targetStage?._id,
      },
      success: true,
    });

    return {
      success: true,
      message: targetStage
        ? `Swapped Stage ${oldNumber} with Stage ${newStageNumber}`
        : `Moved Stage ${oldNumber} to position ${newStageNumber}`,
    };
  },
});
