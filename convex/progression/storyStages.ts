/**
 * Story Stages - Queries and Mutations
 *
 * Handles individual stage progression within chapters
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { addXP } from "../lib/xpHelpers";

/**
 * Get stages for a specific chapter with user progress
 *
 * Retrieves all stages for a chapter with the authenticated user's progress on each stage.
 * Includes completion status, stars earned, best score, and first clear status.
 * Stages are sorted by stage number.
 *
 * @param chapterId - ID of the chapter to get stages for
 * @returns Array of stages with progress data, sorted by stage number
 */
export const getChapterStages = query({
  args: {
    chapterId: v.id("storyChapters"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get all stages for this chapter
    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    // Get user's progress for each stage
    const stagesWithProgress = await Promise.all(
      stages.map(async (stage) => {
        const progress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_stage", (q) => q.eq("userId", userId).eq("stageId", stage._id))
          .first();

        return {
          _id: stage._id,
          stageNumber: stage.stageNumber,
          name: stage.name,
          description: stage.description,
          aiDifficulty: stage.aiDifficulty,
          rewardGold: stage.rewardGold,
          rewardXp: stage.rewardXp,
          firstClearBonus: stage.firstClearBonus,
          status: progress?.status || "locked",
          starsEarned: progress?.starsEarned || 0,
          bestScore: progress?.bestScore,
          timesCompleted: progress?.timesCompleted || 0,
          firstClearClaimed: progress?.firstClearClaimed || false,
        };
      })
    );

    // Sort by stage number
    stagesWithProgress.sort((a, b) => a.stageNumber - b.stageNumber);

    return stagesWithProgress;
  },
});

/**
 * Initialize stage progress for a chapter
 *
 * Creates progress records for all stages in a chapter. Only stage 1 is unlocked,
 * remaining stages are locked until the previous stage is completed.
 * Called when user first views a chapter. Safe to call multiple times.
 *
 * @param chapterId - ID of the chapter to initialize progress for
 * @returns Success status
 */
export const initializeChapterStageProgress = mutation({
  args: {
    chapterId: v.id("storyChapters"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get all stages for this chapter
    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", args.chapterId))
      .collect();

    // Create progress records for all stages
    // Only stage 1 is unlocked, rest are locked
    for (const stage of stages) {
      const existing = await ctx.db
        .query("storyStageProgress")
        .withIndex("by_user_stage", (q) => q.eq("userId", userId).eq("stageId", stage._id))
        .first();

      if (!existing) {
        await ctx.db.insert("storyStageProgress", {
          userId: userId,
          stageId: stage._id,
          chapterId: args.chapterId,
          stageNumber: stage.stageNumber,
          status: stage.stageNumber === 1 ? "available" : "locked",
          starsEarned: 0,
          timesCompleted: 0,
          firstClearClaimed: false,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Complete a stage and unlock the next one
 *
 * Records stage completion, calculates stars based on remaining LP (1-3 stars),
 * awards gold and XP with bonuses for stars and first clear. Updates progress
 * to completed/starred status and unlocks the next stage if this was the first completion.
 * Returns no rewards if the player lost.
 *
 * @param stageId - ID of the stage being completed
 * @param won - Whether the player won the battle
 * @param finalLP - Player's remaining LP at battle end
 * @returns Win status, rewards, stars earned, best score, unlock status, level up info, and new badges
 */
export const completeStage = mutation({
  args: {
    stageId: v.id("storyStages"),
    won: v.boolean(),
    finalLP: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get stage
    const stage = await ctx.db.get(args.stageId);
    if (!stage) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Stage not found",
      });
    }

    // Get progress
    const progress = await ctx.db
      .query("storyStageProgress")
      .withIndex("by_user_stage", (q) => q.eq("userId", userId).eq("stageId", args.stageId))
      .first();

    if (!progress) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Stage progress not found",
      });
    }

    if (!args.won) {
      // Lost - no rewards, just return
      return {
        won: false,
        rewards: { gold: 0, xp: 0 },
        starsEarned: 0,
      };
    }

    // Calculate stars based on LP remaining
    let starsEarned: 0 | 1 | 2 | 3 = 1; // Base: completed
    if (args.finalLP >= 6000) starsEarned = 2; // 75%+ LP
    if (args.finalLP >= 7500) starsEarned = 3; // 93.75%+ LP (nearly perfect)

    // Calculate rewards
    let goldReward = stage.rewardGold;
    let xpReward = stage.rewardXp;

    // First clear bonus
    if (!progress.firstClearClaimed) {
      goldReward += stage.firstClearBonus;
    }

    // Star bonus (20% per star)
    const starMultiplier = 1 + (starsEarned - 1) * 0.2;
    goldReward = Math.floor(goldReward * starMultiplier);
    xpReward = Math.floor(xpReward * starMultiplier);

    // Award gold
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      goldDelta: goldReward,
      transactionType: "reward",
      description: `Story Stage ${stage.stageNumber} completion`,
      referenceId: `story_stage_${args.stageId}`,
    });

    // Award XP
    const xpResult = await addXP(ctx, userId, xpReward);

    // Update progress
    const newStars = Math.max(progress.starsEarned, starsEarned);
    const newBestScore = Math.max(progress.bestScore || 0, args.finalLP);

    await ctx.db.patch(progress._id, {
      status: newStars === 3 ? "starred" : "completed",
      starsEarned: newStars,
      bestScore: newBestScore,
      timesCompleted: progress.timesCompleted + 1,
      firstClearClaimed: true,
      lastCompletedAt: Date.now(),
    });

    // Unlock next stage if this is the first completion
    if (progress.timesCompleted === 0 && stage.stageNumber < 10) {
      const nextStage = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter_stage", (q) =>
          q.eq("chapterId", stage.chapterId).eq("stageNumber", stage.stageNumber + 1)
        )
        .first();

      if (nextStage) {
        const nextProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_stage", (q) => q.eq("userId", userId).eq("stageId", nextStage._id))
          .first();

        if (nextProgress && nextProgress.status === "locked") {
          await ctx.db.patch(nextProgress._id, {
            status: "available",
          });
        }
      }
    }

    return {
      won: true,
      rewards: {
        gold: goldReward,
        xp: xpReward,
      },
      starsEarned,
      newBestScore,
      unlockedNextStage: progress.timesCompleted === 0 && stage.stageNumber < 10,
      levelUp: xpResult.leveledUp
        ? {
            newLevel: xpResult.newLevel,
            oldLevel: xpResult.newLevel - 1,
          }
        : null,
      newBadges: xpResult.badgesAwarded || [],
    };
  },
});
