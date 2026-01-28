// Story Mode Functions
// Queries and mutations for story mode progression, XP, and badges

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalMutation, mutation, query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { type CardResult, type Rarity, addCardsToInventory, getRandomCard } from "../lib/helpers";
import { checkRateLimitWrapper } from "../lib/rateLimit";
import {
  DIFFICULTY_UNLOCK_LEVELS,
  RETRY_LIMITS,
  REWARD_MULTIPLIERS,
  STAR_BONUS,
  XP_PER_LEVEL,
} from "../lib/storyConstants";
import { addXP, getPlayerXP } from "../lib/xpHelpers";
import { STORY_CHAPTERS } from "../seeds/storyChapters";

// Card reward configuration
type CardRewardConfig = {
  count: number;
  rarity: Rarity;
};

const CARD_REWARDS_BY_STARS: Record<1 | 2 | 3, CardRewardConfig> = {
  1: { count: 1, rarity: "common" },
  2: { count: 2, rarity: "common" },
  3: { count: 3, rarity: "rare" },
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get player's story progress for all chapters
 *
 * Retrieves all story progress records for the authenticated user, grouped by act.
 * Includes total chapters completed and total stars earned across all chapters.
 *
 * @returns Progress data grouped by act number, with totals for completed chapters and stars
 */
export const getPlayerProgress = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const allProgress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group by act
    const progressByAct: Record<number, typeof allProgress> = {};
    for (const progress of allProgress) {
      if (!progressByAct[progress.actNumber]) {
        progressByAct[progress.actNumber] = [];
      }
      progressByAct[progress.actNumber]!.push(progress);
    }

    return {
      progressByAct,
      totalChaptersCompleted: allProgress.filter((p) => p.status === "completed").length,
      totalStarsEarned: allProgress.reduce((sum, p) => sum + p.starsEarned, 0),
    };
  },
});

/**
 * Get specific chapter details with stages
 *
 * Retrieves detailed information about a specific chapter including all its stages
 * and the user's progress on each stage. Stages are sorted by stage number.
 *
 * @param actNumber - The act number (e.g., 1 for Act 1)
 * @param chapterNumber - The chapter number within the act
 * @returns Chapter data with stages and progress, or null if chapter not found
 */
export const getChapterDetails = query({
  args: {
    actNumber: v.number(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", args.actNumber).eq("chapterNumber", args.chapterNumber)
      )
      .first();

    if (!chapter) return null;

    // Get all stages for this chapter
    const stages = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
      .collect();

    // Batch fetch all stage progress for this user and chapter (fix N+1)
    const allStageProgress = await ctx.db
      .query("storyStageProgress")
      .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", chapter._id))
      .collect();

    // Create a Map for O(1) lookup by stageId
    const progressMap = new Map(allStageProgress.map((p) => [p.stageId, p]));

    // Join stages with progress data
    const stagesWithProgress = stages.map((stage) => {
      const progress = progressMap.get(stage._id);
      return {
        ...stage,
        status: progress?.status || "locked",
        starsEarned: progress?.starsEarned || 0,
        bestScore: progress?.bestScore,
        timesCompleted: progress?.timesCompleted || 0,
        firstClearClaimed: progress?.firstClearClaimed || false,
        lastCompletedAt: progress?.lastCompletedAt,
      };
    });

    // Sort stages by stage number
    stagesWithProgress.sort((a, b) => a.stageNumber - b.stageNumber);

    return {
      ...chapter,
      stages: stagesWithProgress,
    };
  },
});

/**
 * Get all available chapters for a player
 *
 * Retrieves all story chapters with the user's progress status for each.
 * Includes stage completion counts and stars earned. Chapter 1-1 is unlocked
 * by default for new players.
 *
 * @returns Array of all chapters with progress status, completion data, and stars earned
 */
export const getAvailableChapters = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Fetch user progress first (indexed query, most selective)
    const allProgress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Fetch all stage progress for the user (indexed query)
    const allStageProgress = await ctx.db
      .query("storyStageProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get all chapters from database
    const allChapters = await ctx.db.query("storyChapters").collect();

    // Get all stages for all chapters
    const allStages = await ctx.db.query("storyStages").collect();

    // Create Maps for O(1) lookup
    const progressMap = new Map(allProgress.map((p) => [`${p.actNumber}-${p.chapterNumber}`, p]));
    const stageProgressMap = new Map(allStageProgress.map((sp) => [sp.stageId, sp]));

    // Group stages by chapterId for efficient filtering
    const stagesByChapter = new Map<Id<"storyChapters">, typeof allStages>();
    for (const stage of allStages) {
      const existing = stagesByChapter.get(stage.chapterId) || [];
      existing.push(stage);
      stagesByChapter.set(stage.chapterId, existing);
    }

    // Map chapters with progress using efficient lookups
    const chaptersWithProgress = allChapters.map((chapter) => {
      const progress = progressMap.get(`${chapter.actNumber}-${chapter.chapterNumber}`);

      // Get stages for this chapter using Map
      const chapterStages = stagesByChapter.get(chapter._id) || [];

      // Count completed stages using Map lookup
      const stagesCompleted = chapterStages.filter((stage) => {
        const stageProgress = stageProgressMap.get(stage._id);
        return stageProgress?.status === "completed";
      }).length;

      const starsEarned = progress?.starsEarned || 0;

      // Chapter 1 is unlocked by default if no progress exists
      let status = progress?.status || "locked";
      if (!progress && chapter.actNumber === 1 && chapter.chapterNumber === 1) {
        status = "available";
      }

      return {
        ...chapter,
        status,
        stagesCompleted,
        totalStages: chapterStages.length,
        starsEarned,
      };
    });

    return chaptersWithProgress;
  },
});

/**
 * Get player XP and level info
 *
 * Retrieves the authenticated user's current XP, level, and progress toward next level.
 * Returns default level 1 data if user has no XP record yet.
 *
 * @returns Current level, XP totals, XP needed for next level, and level progress percentage
 */
export const getPlayerXPInfo = query({
  args: {},
  returns: v.object({
    currentLevel: v.number(),
    currentXP: v.number(),
    lifetimeXP: v.number(),
    xpForNextLevel: v.number(),
    levelProgress: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    const xpRecord = await getPlayerXP(ctx, userId);

    if (!xpRecord) {
      return {
        currentLevel: 1,
        currentXP: 0,
        lifetimeXP: 0,
        xpForNextLevel: 100,
        levelProgress: 0,
      };
    }

    const xpForNextLevel =
      xpRecord.currentLevel >= 100 ? 0 : (XP_PER_LEVEL[xpRecord.currentLevel] ?? 0);

    const levelStartXP = XP_PER_LEVEL[xpRecord.currentLevel - 1] ?? 0;
    const xpInLevel = xpRecord.currentXP - levelStartXP;
    const xpForLevel = (xpForNextLevel ?? 0) - levelStartXP;
    const levelProgress = xpForLevel > 0 ? Math.min(1, xpInLevel / xpForLevel) : 1;

    return {
      currentLevel: xpRecord.currentLevel,
      currentXP: xpRecord.currentXP,
      lifetimeXP: xpRecord.lifetimeXP,
      xpForNextLevel,
      levelProgress,
    };
  },
});

/**
 * Get all badges earned by player
 *
 * Retrieves all badges earned by the authenticated user, grouped by badge type.
 * Includes archetype mastery, act completion, perfect chapter, and other badge types.
 *
 * @returns All badges, badges grouped by type, and total badge count
 */
export const getPlayerBadges = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const badges = await ctx.db
      .query("playerBadges")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Group by badge type
    const badgesByType: Record<string, typeof badges> = {};
    for (const badge of badges) {
      if (!badgesByType[badge.badgeType]) {
        badgesByType[badge.badgeType] = [];
      }
      badgesByType[badge.badgeType]!.push(badge);
    }

    return {
      badges,
      badgesByType,
      totalBadges: badges.length,
    };
  },
});

/**
 * Get battle history for a specific chapter
 *
 * Retrieves the last 10 battle attempts for a specific chapter by the authenticated user.
 * Results are ordered from most recent to oldest.
 *
 * @param actNumber - The act number
 * @param chapterNumber - The chapter number
 * @returns Last 10 battle attempts with outcomes and rewards
 */
export const getBattleHistory = query({
  args: {
    actNumber: v.number(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    const attempts = await ctx.db
      .query("storyBattleAttempts")
      .withIndex("by_user_chapter", (q) =>
        q
          .eq("userId", userId)
          .eq("actNumber", args.actNumber)
          .eq("chapterNumber", args.chapterNumber)
      )
      .order("desc")
      .take(10); // Last 10 attempts

    return attempts;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start a story chapter (begin battle)
 *
 * Initiates a battle attempt for a story chapter. Validates chapter is unlocked,
 * user meets level requirements for difficulty, and retry limits are not exceeded.
 * Creates a battle attempt record and updates progress to in_progress.
 *
 * @param actNumber - The act number
 * @param chapterNumber - The chapter number
 * @param difficulty - Difficulty level: "normal", "hard", or "legendary"
 * @returns Attempt ID and chapter info including AI opponent deck and difficulty settings
 */
export const startChapter = mutation({
  args: {
    actNumber: v.number(),
    chapterNumber: v.number(),
    difficulty: v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get chapter definition
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", args.actNumber).eq("chapterNumber", args.chapterNumber)
      )
      .first();

    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Get player progress for this chapter/difficulty
    const progress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user_chapter", (q) =>
        q
          .eq("userId", userId)
          .eq("actNumber", args.actNumber)
          .eq("chapterNumber", args.chapterNumber)
      )
      .filter((q) => q.eq(q.field("difficulty"), args.difficulty))
      .first();

    if (!progress) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter progress not found",
      });
    }

    // Check if chapter is available
    if (progress.status === "locked") {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: "This chapter is locked",
      });
    }

    // Check difficulty unlock requirement
    const playerXP = await getPlayerXP(ctx, userId);
    const requiredLevel = DIFFICULTY_UNLOCK_LEVELS[args.difficulty];
    if (playerXP && playerXP.currentLevel < requiredLevel) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: `Level ${requiredLevel} required for ${args.difficulty} difficulty`,
        requiredLevel,
        currentLevel: playerXP.currentLevel,
      });
    }

    // Check retry limits
    if (args.difficulty === "hard") {
      const today = new Date().setHours(0, 0, 0, 0);
      const attemptsToday = await ctx.db
        .query("storyBattleAttempts")
        .withIndex("by_user_chapter", (q) =>
          q
            .eq("userId", userId)
            .eq("actNumber", args.actNumber)
            .eq("chapterNumber", args.chapterNumber)
        )
        .filter((q) =>
          q.and(q.eq(q.field("difficulty"), "hard"), q.gte(q.field("attemptedAt"), today))
        )
        .collect();

      if (attemptsToday.length >= RETRY_LIMITS.hard) {
        throw createError(ErrorCode.RATE_LIMIT_EXCEEDED, {
          reason: "Daily retry limit reached for Hard mode",
          limit: RETRY_LIMITS.hard,
        });
      }
    }

    if (args.difficulty === "legendary") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const attemptsThisWeek = await ctx.db
        .query("storyBattleAttempts")
        .withIndex("by_user_chapter", (q) =>
          q
            .eq("userId", userId)
            .eq("actNumber", args.actNumber)
            .eq("chapterNumber", args.chapterNumber)
        )
        .filter((q) =>
          q.and(q.eq(q.field("difficulty"), "legendary"), q.gte(q.field("attemptedAt"), weekAgo))
        )
        .collect();

      if (attemptsThisWeek.length >= RETRY_LIMITS.legendary) {
        throw createError(ErrorCode.RATE_LIMIT_EXCEEDED, {
          reason: "Weekly retry limit reached for Legendary mode",
          limit: RETRY_LIMITS.legendary,
        });
      }
    }

    // Create battle attempt record
    const attemptId = await ctx.db.insert("storyBattleAttempts", {
      userId,
      progressId: progress._id,
      actNumber: args.actNumber,
      chapterNumber: args.chapterNumber,
      difficulty: args.difficulty,
      outcome: "won", // Will be updated on completion
      starsEarned: 0,
      finalLP: 0,
      rewardsEarned: { gold: 0, xp: 0 },
      attemptedAt: Date.now(),
    });

    // Update progress to in_progress
    await ctx.db.patch(progress._id, {
      status: "in_progress",
      timesAttempted: progress.timesAttempted + 1,
      lastAttemptedAt: Date.now(),
    });

    return {
      attemptId,
      chapterInfo: {
        title: chapter.title,
        description: chapter.description,
        storyText: chapter.storyText,
        aiOpponentDeckCode: chapter.aiOpponentDeckCode,
        aiDifficulty: chapter.aiDifficulty[args.difficulty],
        battleCount: chapter.battleCount,
        archetypeImageUrl: chapter.archetypeImageUrl,
      },
    };
  },
});

/**
 * Complete a story chapter (record results)
 *
 * Records the outcome of a chapter battle attempt. If won, calculates stars (1-3 based on LP),
 * awards gold/XP/cards, unlocks next chapter, and grants badges for achievements
 * (perfect chapter, archetype mastery, act completion). Updates quest and achievement progress.
 *
 * @param attemptId - ID of the battle attempt to complete
 * @param won - Whether the player won the battle
 * @param finalLP - Player's remaining LP at battle end
 * @returns Success status, rewards earned, stars, level up info, new badges, and cards received
 */
export const completeChapter = mutation({
  args: {
    attemptId: v.id("storyBattleAttempts"),
    won: v.boolean(),
    finalLP: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get battle attempt
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Battle attempt not found or not owned by user",
      });
    }

    // Get chapter definition
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", attempt.actNumber).eq("chapterNumber", attempt.chapterNumber)
      )
      .first();

    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Calculate stars (0-3)
    let starsEarned: 0 | 1 | 2 | 3 = 0;
    if (args.won) {
      starsEarned = 1; // Base: completed
      if (args.finalLP >= 50) starsEarned = 2; // 50%+ LP remaining
      if (args.finalLP >= 100) starsEarned = 3; // No damage taken (perfect)
    }

    // Calculate rewards (0 if lost)
    let goldReward = 0;
    let xpReward = 0;

    if (args.won) {
      const difficultyMultiplier = REWARD_MULTIPLIERS[attempt.difficulty];
      const starBonusGold = 1 + starsEarned * STAR_BONUS.gold;
      const starBonusXP = 1 + starsEarned * STAR_BONUS.xp;

      goldReward = Math.floor(chapter.baseRewards.gold * difficultyMultiplier * starBonusGold);
      xpReward = Math.floor(chapter.baseRewards.xp * difficultyMultiplier * starBonusXP);
    }

    // Update attempt record
    await ctx.db.patch(args.attemptId, {
      outcome: args.won ? "won" : "lost",
      starsEarned,
      finalLP: args.finalLP,
      rewardsEarned: {
        gold: goldReward,
        xp: xpReward,
        cards: chapter.baseRewards.guaranteedCards,
      },
    });

    // Get progress record
    const progress = await ctx.db.get(attempt.progressId);
    if (!progress) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Progress record not found",
      });
    }

    const newBadges: Array<{ badgeId: string; displayName: string; description: string }> = [];
    let leveledUp = false;
    let newLevel = 1;
    const rewardedCards: CardResult[] = [];

    if (args.won) {
      // Update progress
      const newStars = Math.max(progress.starsEarned, starsEarned);
      const newBestScore = Math.max(progress.bestScore || 0, args.finalLP);

      await ctx.db.patch(progress._id, {
        status: "completed",
        starsEarned: newStars,
        bestScore: newBestScore,
        timesCompleted: progress.timesCompleted + 1,
        firstCompletedAt: progress.firstCompletedAt || Date.now(),
      });

      // Award gold (via economy system)
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: goldReward,
        transactionType: "reward",
        description: `Story Chapter ${attempt.actNumber}-${attempt.chapterNumber} (${attempt.difficulty})`,
        referenceId: `story_${args.attemptId}`,
      });

      // Award XP
      const xpResult = await addXP(ctx, userId, xpReward);
      leveledUp = xpResult.leveledUp;
      newLevel = xpResult.newLevel;
      newBadges.push(...xpResult.badgesAwarded);

      // Award cards based on stars earned (only if stars were earned)
      if (starsEarned > 0) {
        const cardRewardConfig = CARD_REWARDS_BY_STARS[starsEarned as 1 | 2 | 3];

        for (let i = 0; i < cardRewardConfig.count; i++) {
          const card = await getRandomCard(ctx, cardRewardConfig.rarity);

          await addCardsToInventory(ctx, userId, card._id, 1);

          rewardedCards.push({
            cardDefinitionId: card._id,
            name: card.name,
            rarity: card.rarity,
            archetype: card.archetype,
            cardType: card.cardType,
            attack: card.attack,
            defense: card.defense,
            cost: card.cost,
            imageUrl: card.imageUrl,
          });
        }
      }

      // Check for perfect chapter badge (3 stars)
      if (starsEarned === 3) {
        const perfectBadgeId = `perfect_${attempt.actNumber}_${attempt.chapterNumber}`;
        const existingBadge = await ctx.db
          .query("playerBadges")
          .withIndex("by_badge", (q) => q.eq("badgeId", perfectBadgeId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (!existingBadge) {
          await ctx.db.insert("playerBadges", {
            userId,
            badgeType: "perfect_chapter",
            badgeId: perfectBadgeId,
            displayName: `Flawless - ${chapter.title}`,
            description: `Earned 3 stars on ${chapter.title}`,
            earnedAt: Date.now(),
          });

          newBadges.push({
            badgeId: perfectBadgeId,
            displayName: `Flawless - ${chapter.title}`,
            description: `Earned 3 stars on ${chapter.title}`,
          });
        }
      }

      // Update quest progress (story stage completion)
      // @ts-ignore - Type instantiation depth limitation with Convex internal API
      await ctx.scheduler.runAfter(0, internal.progression.quests.updateQuestProgress, {
        userId,
        event: {
          type: "complete_stage",
          value: 1,
          gameMode: "story",
        },
      });

      // Update achievement progress (story stage completion)
      await ctx.scheduler.runAfter(0, internal.progression.achievements.updateAchievementProgress, {
        userId,
        event: {
          type: "complete_stage",
          value: 1,
        },
      });

      // Unlock next chapter (if exists)
      const nextChapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) =>
          q.eq("actNumber", attempt.actNumber).eq("chapterNumber", attempt.chapterNumber + 1)
        )
        .first();

      if (nextChapter) {
        const nextProgress = await ctx.db
          .query("storyProgress")
          .withIndex("by_user_chapter", (q) =>
            q
              .eq("userId", userId)
              .eq("actNumber", attempt.actNumber)
              .eq("chapterNumber", attempt.chapterNumber + 1)
          )
          .filter((q) => q.eq(q.field("difficulty"), attempt.difficulty))
          .first();

        if (nextProgress && nextProgress.status === "locked") {
          await ctx.db.patch(nextProgress._id, {
            status: "available",
          });
        }
      }

      // Update chapter completion achievement
      await ctx.scheduler.runAfter(0, internal.progression.achievements.updateAchievementProgress, {
        userId,
        event: {
          type: "complete_chapter",
          value: 1,
        },
      });

      // Check for archetype completion badge
      const archetypeChapters = STORY_CHAPTERS.filter((ch) => ch.archetype === chapter.archetype);

      const completedArchetypeChapters = await ctx.db
        .query("storyProgress")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      const archetypeComplete = archetypeChapters.every((ch) =>
        completedArchetypeChapters.some(
          (p) => p.actNumber === ch.actNumber && p.chapterNumber === ch.chapterNumber
        )
      );

      if (archetypeComplete) {
        const archetype = chapter.archetype;
        const archetypeBadgeId = `archetype_master_${archetype}`;

        const existingArchetypeBadge = await ctx.db
          .query("playerBadges")
          .withIndex("by_badge", (q) => q.eq("badgeId", archetypeBadgeId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (!existingArchetypeBadge) {
          await ctx.db.insert("playerBadges", {
            userId,
            badgeId: archetypeBadgeId,
            badgeType: "archetype_complete",
            displayName: `${archetype.charAt(0).toUpperCase() + archetype.slice(1).replace(/_/g, " ")} Master`,
            description: `Completed all ${archetype.replace(/_/g, " ")} archetype chapters`,
            archetype,
            earnedAt: Date.now(),
          });

          newBadges.push({
            badgeId: archetypeBadgeId,
            displayName: `${archetype.charAt(0).toUpperCase() + archetype.slice(1).replace(/_/g, " ")} Master`,
            description: `Completed all ${archetype.replace(/_/g, " ")} archetype chapters`,
          });
        }
      }

      // Check for act completion badge
      const actChapters = STORY_CHAPTERS.filter((ch) => ch.actNumber === attempt.actNumber);

      const actComplete = actChapters.every((ch) =>
        completedArchetypeChapters.some(
          (p) => p.actNumber === ch.actNumber && p.chapterNumber === ch.chapterNumber
        )
      );

      if (actComplete) {
        const actBadgeId = `act_${attempt.actNumber}_complete`;

        const existingActBadge = await ctx.db
          .query("playerBadges")
          .withIndex("by_badge", (q) => q.eq("badgeId", actBadgeId))
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (!existingActBadge) {
          const actNames = ["Prologue", "Act I", "Act II", "Act III", "Act IV", "Epilogue"];
          const actName = actNames[attempt.actNumber] || `Act ${attempt.actNumber}`;

          await ctx.db.insert("playerBadges", {
            userId,
            badgeId: actBadgeId,
            badgeType: "act_complete",
            displayName: `${actName} Champion`,
            description: `Completed all chapters in ${actName}`,
            earnedAt: Date.now(),
          });

          newBadges.push({
            badgeId: actBadgeId,
            displayName: `${actName} Champion`,
            description: `Completed all chapters in ${actName}`,
          });
        }
      }
    } else {
      // Lost - update progress back to available
      await ctx.db.patch(progress._id, {
        status: "available",
      });
    }

    return {
      success: args.won,
      rewards: {
        gold: goldReward,
        xp: xpReward,
        cards: chapter.baseRewards.guaranteedCards || [],
      },
      starsEarned,
      levelUp: leveledUp ? { newLevel, oldLevel: newLevel - (leveledUp ? 1 : 0) } : null,
      newBadges,
      cardsReceived: rewardedCards,
    };
  },
});

/**
 * Abandon current chapter attempt
 *
 * Marks a battle attempt as abandoned and resets progress status to available.
 * Used when player exits a battle without completing it.
 *
 * @param attemptId - ID of the battle attempt to abandon
 * @returns Success status
 */
export const abandonChapter = mutation({
  args: {
    attemptId: v.id("storyBattleAttempts"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "Battle attempt not found or not owned by user",
      });
    }

    await ctx.db.patch(args.attemptId, {
      outcome: "abandoned",
    });

    const progress = await ctx.db.get(attempt.progressId);
    if (progress && progress.status === "in_progress") {
      await ctx.db.patch(progress._id, {
        status: "available",
      });
    }

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Initialize story progress for a new user
 *
 * Creates initial playerXP record and unlocks Act 1 Chapter 1 (normal difficulty)
 * for new users. Safe to call multiple times - only creates records if they don't exist.
 * Can be called from frontend or internally.
 *
 * @returns Success status
 */
export const initializeStoryProgress = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit story progress initialization to prevent spam
    // Max 20 calls per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "STORY_PROGRESS", userId);

    // Check if XP record already exists
    const existingXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingXP) {
      // Create XP record
      await ctx.db.insert("playerXP", {
        userId: userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });
    }

    // Check if progress already exists
    const existingProgress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!existingProgress) {
      // Initialize Act 1 Chapter 1 (normal difficulty only for now)
      await ctx.db.insert("storyProgress", {
        userId: userId,
        actNumber: 1,
        chapterNumber: 1,
        difficulty: "normal",
        status: "available",
        starsEarned: 0,
        timesAttempted: 0,
        timesCompleted: 0,
      });
    }

    return { success: true };
  },
});

/**
 * Award a badge to a player
 *
 * Internal mutation to grant a badge to a player. Checks for duplicate badges before inserting.
 * Supports archetype completion, act completion, difficulty completion, perfect chapter,
 * speed run, and milestone badge types.
 *
 * @param userId - ID of the user to award badge to
 * @param badgeId - Unique identifier for the badge
 * @param badgeType - Type of badge (archetype_complete, act_complete, etc.)
 * @param displayName - Display name for the badge
 * @param description - Description of how the badge was earned
 * @param archetype - Optional archetype identifier for archetype badges
 * @param iconUrl - Optional URL to badge icon
 * @returns Success status and message if badge already exists
 */
export const awardBadge = internalMutation({
  args: {
    userId: v.id("users"),
    badgeId: v.string(),
    badgeType: v.union(
      v.literal("archetype_complete"),
      v.literal("act_complete"),
      v.literal("difficulty_complete"),
      v.literal("perfect_chapter"),
      v.literal("speed_run"),
      v.literal("milestone")
    ),
    displayName: v.string(),
    description: v.string(),
    archetype: v.optional(v.string()),
    iconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if badge already exists
    const existing = await ctx.db
      .query("playerBadges")
      .withIndex("by_badge", (q) => q.eq("badgeId", args.badgeId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      return { success: false, message: "Badge already awarded" };
    }

    await ctx.db.insert("playerBadges", {
      userId: args.userId,
      badgeType: args.badgeType,
      badgeId: args.badgeId,
      displayName: args.displayName,
      description: args.description,
      archetype: args.archetype,
      iconUrl: args.iconUrl,
      earnedAt: Date.now(),
    });

    return { success: true };
  },
});
