// Story Mode Functions
// Queries and mutations for story mode progression, XP, and badges

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { validateSession } from "./lib/validators";
import { addXP, getPlayerXP, hasReachedLevel } from "./lib/xpHelpers";
import { RETRY_LIMITS, REWARD_MULTIPLIERS, STAR_BONUS, DIFFICULTY_UNLOCK_LEVELS, XP_PER_LEVEL } from "./lib/storyConstants";
import {
  getRandomCard,
  addCardsToInventory,
  type CardResult,
  type Rarity,
} from "./lib/helpers";
import { STORY_CHAPTERS } from "./seeds/storyChapters";

// Card reward configuration
const CARD_REWARDS_BY_STARS = {
  1: { count: 1, rarity: "common" as const },
  2: { count: 2, rarity: "common" as const },
  3: { count: 3, rarity: "rare" as const },
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get player's story progress for all chapters
 */
export const getPlayerProgress = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

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
      totalChaptersCompleted: allProgress.filter(p => p.status === "completed").length,
      totalStarsEarned: allProgress.reduce((sum, p) => sum + p.starsEarned, 0),
    };
  },
});

/**
 * Get specific chapter details
 */
export const getChapterDetails = query({
  args: {
    actNumber: v.number(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", args.actNumber).eq("chapterNumber", args.chapterNumber)
      )
      .first();

    return chapter;
  },
});

/**
 * Get all available chapters for a player
 */
export const getAvailableChapters = query({
  args: {
    token: v.string(),
    difficulty: v.optional(v.union(
      v.literal("normal"),
      v.literal("hard"),
      v.literal("legendary")
    )),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const allProgress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by difficulty if specified
    const filtered = args.difficulty
      ? allProgress.filter(p => p.difficulty === args.difficulty)
      : allProgress;

    // Get available and in-progress chapters
    const available = filtered.filter(p =>
      p.status === "available" || p.status === "in_progress"
    );

    return available;
  },
});

/**
 * Get player XP and level info
 */
export const getPlayerXPInfo = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);
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

    const xpForNextLevel = xpRecord.currentLevel >= 100
      ? 0
      : XP_PER_LEVEL[xpRecord.currentLevel];

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
 */
export const getPlayerBadges = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

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
 */
export const getBattleHistory = query({
  args: {
    token: v.string(),
    actNumber: v.number(),
    chapterNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const attempts = await ctx.db
      .query("storyBattleAttempts")
      .withIndex("by_user_chapter", (q) =>
        q.eq("userId", userId)
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
 */
export const startChapter = mutation({
  args: {
    token: v.string(),
    actNumber: v.number(),
    chapterNumber: v.number(),
    difficulty: v.union(
      v.literal("normal"),
      v.literal("hard"),
      v.literal("legendary")
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Get chapter definition
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", args.actNumber).eq("chapterNumber", args.chapterNumber)
      )
      .first();

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Get player progress for this chapter/difficulty
    const progress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user_chapter", (q) =>
        q.eq("userId", userId)
         .eq("actNumber", args.actNumber)
         .eq("chapterNumber", args.chapterNumber)
      )
      .filter((q) => q.eq(q.field("difficulty"), args.difficulty))
      .first();

    if (!progress) {
      throw new Error("Chapter progress not found");
    }

    // Check if chapter is available
    if (progress.status === "locked") {
      throw new Error("This chapter is locked");
    }

    // Check difficulty unlock requirement
    const playerXP = await getPlayerXP(ctx, userId);
    const requiredLevel = DIFFICULTY_UNLOCK_LEVELS[args.difficulty];
    if (playerXP && playerXP.currentLevel < requiredLevel) {
      throw new Error(`Level ${requiredLevel} required for ${args.difficulty} difficulty`);
    }

    // Check retry limits
    if (args.difficulty === "hard") {
      const today = new Date().setHours(0, 0, 0, 0);
      const attemptsToday = await ctx.db
        .query("storyBattleAttempts")
        .withIndex("by_user_chapter", (q) =>
          q.eq("userId", userId)
           .eq("actNumber", args.actNumber)
           .eq("chapterNumber", args.chapterNumber)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("difficulty"), "hard"),
            q.gte(q.field("attemptedAt"), today)
          )
        )
        .collect();

      if (attemptsToday.length >= RETRY_LIMITS.hard) {
        throw new Error("Daily retry limit reached for Hard mode");
      }
    }

    if (args.difficulty === "legendary") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const attemptsThisWeek = await ctx.db
        .query("storyBattleAttempts")
        .withIndex("by_user_chapter", (q) =>
          q.eq("userId", userId)
           .eq("actNumber", args.actNumber)
           .eq("chapterNumber", args.chapterNumber)
        )
        .filter((q) =>
          q.and(
            q.eq(q.field("difficulty"), "legendary"),
            q.gte(q.field("attemptedAt"), weekAgo)
          )
        )
        .collect();

      if (attemptsThisWeek.length >= RETRY_LIMITS.legendary) {
        throw new Error("Weekly retry limit reached for Legendary mode");
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
 */
export const completeChapter = mutation({
  args: {
    token: v.string(),
    attemptId: v.id("storyBattleAttempts"),
    won: v.boolean(),
    finalLP: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    // Get battle attempt
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new Error("Battle attempt not found");
    }

    // Get chapter definition
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) =>
        q.eq("actNumber", attempt.actNumber).eq("chapterNumber", attempt.chapterNumber)
      )
      .first();

    if (!chapter) {
      throw new Error("Chapter not found");
    }

    // Calculate stars (0-3)
    let starsEarned = 0;
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
      const starBonusGold = 1 + (starsEarned * STAR_BONUS.gold);
      const starBonusXP = 1 + (starsEarned * STAR_BONUS.xp);

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
      throw new Error("Progress record not found");
    }

    const newBadges: Array<{ badgeId: string; displayName: string; description: string }> = [];
    let leveledUp = false;
    let newLevel = 1;
    let rewardedCards: CardResult[] = [];

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
      await ctx.runMutation(internal.economy.adjustPlayerCurrency, {
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

      // Award cards based on stars earned
      const cardRewardConfig = CARD_REWARDS_BY_STARS[starsEarned as 1 | 2 | 3];

      for (let i = 0; i < cardRewardConfig.count; i++) {
        const card = await getRandomCard(
          ctx,
          cardRewardConfig.rarity
        );

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
            q.eq("userId", userId)
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

      // Check for archetype completion badge
      const archetypeChapters = STORY_CHAPTERS.filter(
        ch => ch.archetype === chapter.archetype
      );

      const completedArchetypeChapters = await ctx.db
        .query("storyProgress")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("status"), "completed"))
        .collect();

      const archetypeComplete = archetypeChapters.every(ch =>
        completedArchetypeChapters.some(p =>
          p.actNumber === ch.actNumber && p.chapterNumber === ch.chapterNumber
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
            displayName: `${archetype.charAt(0).toUpperCase() + archetype.slice(1).replace(/_/g, ' ')} Master`,
            description: `Completed all ${archetype.replace(/_/g, ' ')} archetype chapters`,
            archetype,
            earnedAt: Date.now(),
          });

          newBadges.push({
            badgeId: archetypeBadgeId,
            displayName: `${archetype.charAt(0).toUpperCase() + archetype.slice(1).replace(/_/g, ' ')} Master`,
            description: `Completed all ${archetype.replace(/_/g, ' ')} archetype chapters`,
          });
        }
      }

      // Check for act completion badge
      const actChapters = STORY_CHAPTERS.filter(
        ch => ch.actNumber === attempt.actNumber
      );

      const actComplete = actChapters.every(ch =>
        completedArchetypeChapters.some(p =>
          p.actNumber === ch.actNumber && p.chapterNumber === ch.chapterNumber
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
 */
export const abandonChapter = mutation({
  args: {
    token: v.string(),
    attemptId: v.id("storyBattleAttempts"),
  },
  handler: async (ctx, args) => {
    const { userId } = await validateSession(ctx, args.token);

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new Error("Battle attempt not found");
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
 * Called on user signup
 */
export const initializeStoryProgress = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Check if XP record already exists
    const existingXP = await ctx.db
      .query("playerXP")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingXP) {
      // Create XP record
      await ctx.db.insert("playerXP", {
        userId: args.userId,
        currentXP: 0,
        currentLevel: 1,
        lifetimeXP: 0,
        lastUpdatedAt: Date.now(),
      });
    }

    // Check if progress already exists
    const existingProgress = await ctx.db
      .query("storyProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingProgress) {
      // Initialize Act 1 Chapter 1 for all difficulties
      const difficulties = ["normal", "hard", "legendary"] as const;

      for (const difficulty of difficulties) {
        await ctx.db.insert("storyProgress", {
          userId: args.userId,
          actNumber: 1,
          chapterNumber: 1,
          difficulty,
          status: difficulty === "normal" ? "available" : "locked",
          starsEarned: 0,
          timesAttempted: 0,
          timesCompleted: 0,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Award a badge to a player
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
