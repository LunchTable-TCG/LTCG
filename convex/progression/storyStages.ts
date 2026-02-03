/**
 * Story Stages - Queries and Mutations
 *
 * Handles individual stage progression within chapters
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import type { MutationCtx } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { addCardsToInventory } from "../lib/helpers";
import { ACTS } from "../lib/storyConstants";
import { addXP } from "../lib/xpHelpers";

// Badge type for return values
type AwardedBadge = {
  badgeId: string;
  displayName: string;
  description: string;
};

/**
 * Check and award badges after stage completion
 *
 * Checks for:
 * - archetype_complete: All 10 stages of a chapter completed
 * - perfect_chapter: All 10 stages of a chapter have 3 stars
 * - act_complete: All chapters in an act have at least one completed stage
 *
 * Note: milestone badges (L10, L25, L50, L75, L100) are handled by addXP in xpHelpers.ts
 */
async function checkAndAwardBadges(
  ctx: MutationCtx,
  userId: Id<"users">,
  stageId: Id<"storyStages">,
  starsEarned: number
): Promise<AwardedBadge[]> {
  const newBadges: AwardedBadge[] = [];

  // Get the stage and chapter info
  const stage = await ctx.db.get(stageId);
  if (!stage) return newBadges;

  const chapter = await ctx.db.get(stage.chapterId);
  if (!chapter) return newBadges;

  // Get all stages for this chapter
  const allStages = await ctx.db
    .query("storyStages")
    .withIndex("by_chapter", (q) => q.eq("chapterId", stage.chapterId))
    .collect();

  // Get all stage progress for this chapter
  const allStageProgress = await ctx.db
    .query("storyStageProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("chapterId"), stage.chapterId))
    .collect();

  // Build a map of stageId -> progress for quick lookup
  const progressMap = new Map(allStageProgress.map((p) => [p.stageId, p]));

  // Check 1: archetype_complete - All stages completed
  const allStagesCompleted = allStages.every((s) => {
    const progress = progressMap.get(s._id);
    return progress && (progress.status === "completed" || progress.status === "starred");
  });

  if (allStagesCompleted && chapter.archetype) {
    const archetype = chapter.archetype;
    const archetypeBadgeId = `archetype_complete_${chapter._id}`;

    const existingBadge = await ctx.db
      .query("playerBadges")
      .withIndex("by_badge", (q) => q.eq("badgeId", archetypeBadgeId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!existingBadge) {
      const displayName = `${archetype.charAt(0).toUpperCase() + archetype.slice(1).replace(/_/g, " ")} Master`;
      const description = `Completed all stages in ${chapter.title}`;

      await ctx.db.insert("playerBadges", {
        userId,
        badgeType: "archetype_complete",
        badgeId: archetypeBadgeId,
        displayName,
        description,
        archetype,
        earnedAt: Date.now(),
      });

      newBadges.push({ badgeId: archetypeBadgeId, displayName, description });
    }
  }

  // Check 2: perfect_chapter - All stages have 3 stars
  if (starsEarned === 3) {
    const allStagesPerfect = allStages.every((s) => {
      const progress = progressMap.get(s._id);
      return progress && progress.starsEarned === 3;
    });

    if (allStagesPerfect) {
      const perfectBadgeId = `perfect_chapter_${chapter._id}`;

      const existingBadge = await ctx.db
        .query("playerBadges")
        .withIndex("by_badge", (q) => q.eq("badgeId", perfectBadgeId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();

      if (!existingBadge) {
        const displayName = `Flawless - ${chapter.title}`;
        const description = `Earned 3 stars on all stages in ${chapter.title}`;

        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "perfect_chapter",
          badgeId: perfectBadgeId,
          displayName,
          description,
          earnedAt: Date.now(),
        });

        newBadges.push({ badgeId: perfectBadgeId, displayName, description });
      }
    }
  }

  // Check 3: act_complete - All chapters in the act have completed stages
  const actNumber = chapter.actNumber;
  if (actNumber && ACTS[actNumber as keyof typeof ACTS]) {
    // Get all chapters in this act
    const actChapters = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNumber))
      .collect();

    // For each chapter, check if at least one stage is completed
    const allChaptersHaveProgress = await Promise.all(
      actChapters.map(async (ch) => {
        const chapterProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("chapterId"), ch._id),
              q.or(
                q.eq(q.field("status"), "completed"),
                q.eq(q.field("status"), "starred")
              )
            )
          )
          .first();
        return chapterProgress !== null;
      })
    );

    const actComplete = allChaptersHaveProgress.every(Boolean);

    if (actComplete) {
      const actBadgeId = `act_${actNumber}_complete`;

      const existingBadge = await ctx.db
        .query("playerBadges")
        .withIndex("by_badge", (q) => q.eq("badgeId", actBadgeId))
        .filter((q) => q.eq(q.field("userId"), userId))
        .first();

      if (!existingBadge) {
        const actInfo = ACTS[actNumber as keyof typeof ACTS];
        const actName = actInfo?.name || `Act ${actNumber}`;
        const displayName = `${actName} Champion`;
        const description = `Completed all chapters in ${actName}`;

        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "act_complete",
          badgeId: actBadgeId,
          displayName,
          description,
          earnedAt: Date.now(),
        });

        newBadges.push({ badgeId: actBadgeId, displayName, description });
      }
    }
  }

  return newBadges;
}

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
          name: stage.name ?? stage.title,
          description: stage.description,
          aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
          rewardGold: stage.rewardGold ?? stage.firstClearGold,
          rewardXp: stage.rewardXp ?? 0,
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
    let goldReward = stage.rewardGold ?? stage.firstClearGold ?? 0;
    let xpReward = stage.rewardXp ?? 0;

    // First clear bonus
    if (!progress.firstClearClaimed && stage.firstClearBonus) {
      // Handle both object and number formats (legacy data)
      const bonus = typeof stage.firstClearBonus === "number"
        ? stage.firstClearBonus
        : (stage.firstClearBonus.gold ?? 0);
      goldReward += bonus;
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

    // Award gems on first clear if firstClearGems exists
    let gemReward = 0;
    if (!progress.firstClearClaimed && stage.firstClearGems) {
      gemReward = stage.firstClearGems;
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        gemsDelta: gemReward,
        transactionType: "reward",
        description: `Story Stage ${stage.stageNumber} first clear gems`,
        referenceId: `story_stage_gems_${args.stageId}`,
      });
    }

    // Award XP (also grants battle pass XP)
    const xpResult = await addXP(ctx, userId, xpReward, { source: "story_stage_complete" });

    // Award card on first clear if cardRewardId exists
    let cardReward: {
      cardId: string;
      cardName: string;
      rarity: string;
      imageUrl?: string;
    } | null = null;

    if (stage.cardRewardId && !progress.firstClearClaimed) {
      const card = await ctx.db.get(stage.cardRewardId);
      if (card) {
        await addCardsToInventory(ctx, userId, stage.cardRewardId, 1);
        cardReward = {
          cardId: stage.cardRewardId,
          cardName: card.name,
          rarity: card.rarity,
          imageUrl: card.imageUrl,
        };
      }
    }

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
        .withIndex("by_chapter", (q) =>
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

    // Update quest progress for story stage completion
    // @ts-ignore - Type instantiation depth limitation with Convex internal API
    await ctx.scheduler.runAfter(0, internal.progression.quests.updateQuestProgress, {
      userId,
      event: {
        type: "complete_stage",
        value: 1,
        gameMode: "story",
      },
    });

    // Check and award badges based on stage completion
    const stageBadges = await checkAndAwardBadges(ctx, userId, args.stageId, newStars);

    // Combine badges from XP (level milestones) and stage completion
    const allBadges = [...(xpResult.badgesAwarded || []), ...stageBadges];

    return {
      won: true,
      rewards: {
        gold: goldReward,
        xp: xpReward,
        gems: gemReward,
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
      newBadges: allBadges,
      cardReward,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (For API Key Auth)
// ============================================================================

/**
 * Complete a stage (internal mutation for API key auth)
 * Called when an agent finishes a story battle
 */
export const completeStageInternal = internalMutation({
  args: {
    userId: v.id("users"),
    stageId: v.id("storyStages"),
    won: v.boolean(),
    finalLP: v.number(),
  },
  handler: async (ctx, args) => {
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
      .withIndex("by_user_stage", (q) => q.eq("userId", args.userId).eq("stageId", args.stageId))
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
    let goldReward = stage.rewardGold ?? stage.firstClearGold ?? 0;
    let xpReward = stage.rewardXp ?? 0;

    // First clear bonus
    if (!progress.firstClearClaimed && stage.firstClearBonus) {
      // Handle both object and number formats (legacy data)
      const bonus = typeof stage.firstClearBonus === "number"
        ? stage.firstClearBonus
        : (stage.firstClearBonus.gold ?? 0);
      goldReward += bonus;
    }

    // Star bonus (20% per star)
    const starMultiplier = 1 + (starsEarned - 1) * 0.2;
    goldReward = Math.floor(goldReward * starMultiplier);
    xpReward = Math.floor(xpReward * starMultiplier);

    // Award gold
    await adjustPlayerCurrencyHelper(ctx, {
      userId: args.userId,
      goldDelta: goldReward,
      transactionType: "reward",
      description: `Story Stage ${stage.stageNumber} completion`,
      referenceId: `story_stage_${args.stageId}`,
    });

    // Award gems on first clear if firstClearGems exists
    let gemReward = 0;
    if (!progress.firstClearClaimed && stage.firstClearGems) {
      gemReward = stage.firstClearGems;
      await adjustPlayerCurrencyHelper(ctx, {
        userId: args.userId,
        gemsDelta: gemReward,
        transactionType: "reward",
        description: `Story Stage ${stage.stageNumber} first clear gems`,
        referenceId: `story_stage_gems_${args.stageId}`,
      });
    }

    // Award XP (also grants battle pass XP)
    const xpResult = await addXP(ctx, args.userId, xpReward, { source: "story_stage_complete" });

    // Award card on first clear if cardRewardId exists
    let cardReward: {
      cardId: string;
      cardName: string;
      rarity: string;
      imageUrl?: string;
    } | null = null;

    if (stage.cardRewardId && !progress.firstClearClaimed) {
      const card = await ctx.db.get(stage.cardRewardId);
      if (card) {
        await addCardsToInventory(ctx, args.userId, stage.cardRewardId, 1);
        cardReward = {
          cardId: stage.cardRewardId,
          cardName: card.name,
          rarity: card.rarity,
          imageUrl: card.imageUrl,
        };
      }
    }

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
        .withIndex("by_chapter", (q) =>
          q.eq("chapterId", stage.chapterId).eq("stageNumber", stage.stageNumber + 1)
        )
        .first();

      if (nextStage) {
        const nextProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_stage", (q) =>
            q.eq("userId", args.userId).eq("stageId", nextStage._id)
          )
          .first();

        if (nextProgress && nextProgress.status === "locked") {
          await ctx.db.patch(nextProgress._id, {
            status: "available",
          });
        }
      }
    }

    // Update quest progress for story stage completion
    // @ts-ignore - Type instantiation depth limitation with Convex internal API
    await ctx.scheduler.runAfter(0, internal.progression.quests.updateQuestProgress, {
      userId: args.userId,
      event: {
        type: "complete_stage",
        value: 1,
        gameMode: "story",
      },
    });

    // Check and award badges based on stage completion
    const stageBadges = await checkAndAwardBadges(ctx, args.userId, args.stageId, newStars);

    // Combine badges from XP (level milestones) and stage completion
    const allBadges = [...(xpResult.badgesAwarded || []), ...stageBadges];

    return {
      won: true,
      rewards: {
        gold: goldReward,
        xp: xpReward,
        gems: gemReward,
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
      newBadges: allBadges,
      cardReward,
    };
  },
});
