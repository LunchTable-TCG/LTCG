/**
 * Story Battle Initialization
 *
 * Creates and initializes a story mode battle against an AI opponent
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { initializeGameStateHelper } from "../gameplay/games/lifecycle";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { DIFFICULTY_UNLOCK_LEVELS } from "../lib/storyConstants";
import { checkRetryLimit, formatTimeUntilReset } from "../lib/storyHelpers";
import { getPlayerXP } from "../lib/xpHelpers";
import { STORY_CHAPTERS } from "../seeds/storyChapters";

// Difficulty type for story mode unlock gates
type StoryDifficulty = "normal" | "hard" | "legendary";

/**
 * Check if a player has access to a difficulty level
 *
 * Validates player level against difficulty unlock requirements.
 * Normal mode is always available (level 1+), Hard requires level 5+,
 * and Legendary requires level 15+.
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check access for
 * @param difficulty - Difficulty level to check
 * @returns Object with allowed status, required level, and current level
 */
async function checkDifficultyAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  difficulty: StoryDifficulty
) {
  const requiredLevel = DIFFICULTY_UNLOCK_LEVELS[difficulty];
  const playerXP = await getPlayerXP(ctx, userId);
  const currentLevel = playerXP?.currentLevel ?? 1;

  return {
    allowed: currentLevel >= requiredLevel,
    requiredLevel,
    currentLevel,
  };
}

// ============================================================================
// CHAPTER UNLOCK VALIDATION
// ============================================================================

/**
 * Result of checking if a chapter is unlocked for a player
 */
export interface ChapterUnlockResult {
  unlocked: boolean;
  reason?: string;
  requirements: {
    /** Previous chapter completion required */
    prevChapter?: {
      required: boolean;
      completed: boolean;
      chapterTitle?: string;
      actNumber?: number;
      chapterNumber?: number;
    };
    /** Minimum player level required */
    level?: {
      required: number;
      current: number;
      met: boolean;
    };
  };
}

/**
 * Check if a chapter is unlocked for a player
 *
 * Validates all unlock conditions for a chapter:
 * - First chapter (Act 1, Chapter 1) is always unlocked
 * - Checks unlockCondition.type for "chapter_complete" or "player_level"
 * - Falls back to legacy unlockRequirements field
 * - Checks if previous chapter is completed (any stage cleared)
 * - Checks if player meets minimum level requirement
 *
 * @param ctx - Query or mutation context
 * @param userId - User ID to check unlock status for
 * @param chapter - Chapter document to check
 * @returns Unlock result with status, reason, and detailed requirements
 */
export async function checkChapterUnlocked(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  chapter: Doc<"storyChapters">
): Promise<ChapterUnlockResult> {
  const requirements: ChapterUnlockResult["requirements"] = {};

  // First chapter (Act 1, Chapter 1) is always unlocked
  if (chapter.actNumber === 1 && chapter.chapterNumber === 1) {
    return {
      unlocked: true,
      requirements,
    };
  }

  // Get player's current level
  const playerXP = await getPlayerXP(ctx, userId);
  const currentLevel = playerXP?.currentLevel ?? 1;

  // Check unlock condition from schema (new format)
  const unlockCondition = chapter.unlockCondition;

  // Check legacy unlock requirements (fallback)
  const legacyRequirements = chapter.unlockRequirements;

  // Determine what unlock conditions apply
  let requiresPrevChapter = false;
  let requiredChapterId: Id<"storyChapters"> | undefined;
  let requiredLevel: number | undefined;

  // New format: unlockCondition
  if (unlockCondition) {
    if (unlockCondition.type === "chapter_complete" && unlockCondition.requiredChapterId) {
      requiresPrevChapter = true;
      requiredChapterId = unlockCondition.requiredChapterId;
    }
    if (unlockCondition.type === "player_level" && unlockCondition.requiredLevel) {
      requiredLevel = unlockCondition.requiredLevel;
    }
    // "none" type means no requirements
  }

  // Legacy format: unlockRequirements (if new format not present)
  if (!unlockCondition && legacyRequirements) {
    if (legacyRequirements.previousChapter) {
      requiresPrevChapter = true;
      // For legacy format, we need to find the previous chapter
    }
    if (legacyRequirements.minimumLevel) {
      requiredLevel = legacyRequirements.minimumLevel;
    }
  }

  // Default behavior: if no unlock conditions specified but not first chapter,
  // require previous chapter to be completed
  if (
    !unlockCondition &&
    !legacyRequirements &&
    chapter.chapterNumber &&
    chapter.chapterNumber > 1
  ) {
    requiresPrevChapter = true;
  }

  // Check previous chapter requirement
  if (requiresPrevChapter) {
    let prevChapterCompleted = false;
    let prevChapterTitle: string | undefined;
    let prevActNumber: number | undefined;
    let prevChapterNumber: number | undefined;

    if (requiredChapterId) {
      // Specific chapter ID required
      const chapterId = requiredChapterId;
      const requiredChapter = await ctx.db.get(chapterId);
      if (requiredChapter) {
        prevChapterTitle = requiredChapter.title;
        prevActNumber = requiredChapter.actNumber;
        prevChapterNumber = requiredChapter.chapterNumber;

        // Check if any stage in that chapter is completed
        const stageProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_chapter", (q) => q.eq("userId", userId).eq("chapterId", chapterId))
          .filter((q) =>
            q.or(q.eq(q.field("status"), "completed"), q.eq(q.field("status"), "starred"))
          )
          .first();

        prevChapterCompleted = !!stageProgress;
      }
    } else {
      // Find the previous chapter in sequence (same act, previous chapter number)
      const prevChapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) =>
          q.eq("actNumber", chapter.actNumber).eq("chapterNumber", (chapter.chapterNumber ?? 1) - 1)
        )
        .first();

      // If no previous chapter in same act, check last chapter of previous act
      let actualPrevChapter = prevChapter;
      if (!prevChapter && chapter.actNumber && chapter.actNumber > 1) {
        // Get all chapters from previous act and find the highest chapter number
        const prevActChapters = await ctx.db
          .query("storyChapters")
          .withIndex("by_act_chapter", (q) => q.eq("actNumber", (chapter.actNumber ?? 1) - 1))
          .collect();

        if (prevActChapters.length > 0) {
          actualPrevChapter = prevActChapters.reduce((max, ch) =>
            (ch.chapterNumber ?? 0) > (max.chapterNumber ?? 0) ? ch : max
          );
        }
      }

      if (actualPrevChapter) {
        prevChapterTitle = actualPrevChapter.title;
        prevActNumber = actualPrevChapter.actNumber;
        prevChapterNumber = actualPrevChapter.chapterNumber;

        // Check if any stage in that chapter is completed
        const stageProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_chapter", (q) =>
            q.eq("userId", userId).eq("chapterId", actualPrevChapter?._id)
          )
          .filter((q) =>
            q.or(q.eq(q.field("status"), "completed"), q.eq(q.field("status"), "starred"))
          )
          .first();

        prevChapterCompleted = !!stageProgress;
      } else {
        // No previous chapter found, consider it met
        prevChapterCompleted = true;
      }
    }

    requirements.prevChapter = {
      required: true,
      completed: prevChapterCompleted,
      chapterTitle: prevChapterTitle,
      actNumber: prevActNumber,
      chapterNumber: prevChapterNumber,
    };

    if (!prevChapterCompleted) {
      const chapterRef = prevChapterTitle
        ? `"${prevChapterTitle}"`
        : prevActNumber && prevChapterNumber
          ? `Chapter ${prevActNumber}-${prevChapterNumber}`
          : "the previous chapter";

      return {
        unlocked: false,
        reason: `Complete ${chapterRef} first`,
        requirements,
      };
    }
  }

  // Check level requirement
  if (requiredLevel && requiredLevel > 1) {
    requirements.level = {
      required: requiredLevel,
      current: currentLevel,
      met: currentLevel >= requiredLevel,
    };

    if (currentLevel < requiredLevel) {
      return {
        unlocked: false,
        reason: `Requires level ${requiredLevel} (current: ${currentLevel})`,
        requirements,
      };
    }
  }

  return {
    unlocked: true,
    requirements,
  };
}

/**
 * Get difficulty requirements and unlock status for a player
 *
 * Returns the level requirements for each difficulty mode and whether
 * the authenticated player has unlocked each one based on their current level.
 */
export const getDifficultyRequirements = query({
  args: {},
  returns: v.object({
    normal: v.object({
      requiredLevel: v.number(),
      unlocked: v.boolean(),
    }),
    hard: v.object({
      requiredLevel: v.number(),
      unlocked: v.boolean(),
    }),
    legendary: v.object({
      requiredLevel: v.number(),
      unlocked: v.boolean(),
    }),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    const playerXP = await getPlayerXP(ctx, userId);
    const playerLevel = playerXP?.currentLevel ?? 1;

    return {
      normal: {
        requiredLevel: DIFFICULTY_UNLOCK_LEVELS.normal,
        unlocked: playerLevel >= DIFFICULTY_UNLOCK_LEVELS.normal,
      },
      hard: {
        requiredLevel: DIFFICULTY_UNLOCK_LEVELS.hard,
        unlocked: playerLevel >= DIFFICULTY_UNLOCK_LEVELS.hard,
      },
      legendary: {
        requiredLevel: DIFFICULTY_UNLOCK_LEVELS.legendary,
        unlocked: playerLevel >= DIFFICULTY_UNLOCK_LEVELS.legendary,
      },
    };
  },
});

/**
 * Check if a specific chapter is unlocked for the current player
 *
 * Returns detailed unlock status including:
 * - Whether the chapter is unlocked
 * - Reason if locked (e.g., "Complete Chapter 1-1 first" or "Requires level 5")
 * - Detailed requirements with progress info
 *
 * @param chapterId - Chapter identifier (e.g., "1-1", "1-2")
 * @returns Unlock status with detailed requirements
 */
export const getChapterUnlockStatus = query({
  args: {
    chapterId: v.string(), // e.g., "1-1", "1-2", etc.
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Parse chapter ID (e.g., "1-1" -> act 1, chapter 1)
    const [actNum, chapNum] = args.chapterId.split("-").map(Number);

    if (!actNum || !chapNum || actNum < 1 || chapNum < 1 || chapNum > 10) {
      return {
        unlocked: false,
        reason: "Invalid chapter ID format",
        requirements: {},
      };
    }

    // Get chapter from database
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNum).eq("chapterNumber", chapNum))
      .first();

    if (!chapter) {
      return {
        unlocked: false,
        reason: "Chapter not found",
        requirements: {},
      };
    }

    // Check unlock status
    return await checkChapterUnlocked(ctx, userId, chapter);
  },
});

/**
 * Initialize a story mode battle
 *
 * Creates a game lobby and game state for a single-player story battle
 * against an AI opponent using the chapter's designated deck.
 *
 * @param chapterId - Chapter identifier (e.g., "1-1", "1-2")
 * @param stageNumber - Stage number within chapter (1-10), defaults to 1
 * @param difficulty - Difficulty mode: "normal" (level 1+), "hard" (level 5+), or "legendary" (level 15+)
 */
export const initializeStoryBattle = mutation({
  args: {
    chapterId: v.string(), // e.g., "1-1", "1-2", etc.
    stageNumber: v.optional(v.number()), // 1-10, defaults to 1 if not provided
  },
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Parse chapter ID (e.g., "1-1" -> act 1, chapter 1)
    const [actNum, chapNum] = args.chapterId.split("-").map(Number);

    if (!actNum || !chapNum || actNum < 1 || chapNum < 1 || chapNum > 10) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid chapter ID format. Expected format: '1-1'",
      });
    }

    // Get chapter from database
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNum).eq("chapterNumber", chapNum))
      .first();

    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Get the specific stage for this battle
    const stageNumber = args.stageNumber || 1;
    const stage = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id).eq("stageNumber", stageNumber))
      .first();

    if (!stage) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Stage ${stageNumber} not found for this chapter`,
      });
    }

    // Get chapter definition from seeds for AI deck (fallback)
    const chapterDef = STORY_CHAPTERS.find(
      (c) => c.actNumber === actNum && c.chapterNumber === chapNum
    );

    if (!chapterDef) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter definition not found in seeds",
      });
    }

    // Verify user has an active deck
    const user = await ctx.db.get(userId);
    if (!user?.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to start a battle",
      });
    }

    // Build AI deck from archetype cards
    // Use aiOpponentDeckCode (lowercase) which maps to actual card archetypes in DB
    const deckArchetype = (chapter.aiOpponentDeckCode ?? "infernal_dragons").toLowerCase();
    const aiDeck = await buildAIDeck(ctx, deckArchetype);

    // Create or get AI user
    const aiUserId = await getOrCreateAIUser(ctx);

    // Create game lobby for story mode
    const gameId = `story_${userId}_${Date.now()}`;
    const now = Date.now();

    // Create lobby (matchmaking info only - turn state is in gameStates)
    const lobbyId = await ctx.db.insert("gameLobbies", {
      gameId,
      hostId: userId,
      hostUsername: username,
      hostRank: "Unranked", // Story mode doesn't use ranked system
      hostRating: 1000, // Default rating
      deckArchetype: "mixed", // Story mode uses mixed deck
      opponentId: aiUserId,
      opponentUsername: `AI - ${chapter.title}`,
      mode: "story",
      status: "active",
      isPrivate: true, // Story games are private
      joinCode: `story-${gameId}`,
      // Turn state is initialized in gameStates via initializeGameStateHelper
      lastMoveAt: now, // Keep for timeout tracking
      createdAt: now,
      startedAt: now,
      allowSpectators: false,
      spectatorCount: 0,
      maxSpectators: 0,
    });

    // Initialize game state with AI opponent
    await initializeGameStateHelper(ctx, {
      lobbyId,
      gameId,
      hostId: userId,
      opponentId: aiUserId,
      currentTurnPlayerId: userId,
      gameMode: "story",
      isAIOpponent: true,
      aiDifficulty: stage.aiDifficulty ?? stage.difficulty, // Use stage's difficulty (easy, medium, hard, boss)
      aiDeck,
    });

    return {
      gameId,
      lobbyId,
      chapterTitle: chapter.title,
      aiOpponentName: `AI - ${chapter.title}`,
    };
  },
});

/**
 * Build an AI deck from archetype cards
 *
 * For MVP: Queries cards of the given archetype and builds a 45-card deck
 */
// biome-ignore lint/suspicious/noExplicitAny: Convex context type workaround
async function buildAIDeck(ctx: any, archetype: string): Promise<Id<"cardDefinitions">[]> {
  // Query all active cards of this archetype
  const archetypeCards = await ctx.db
    .query("cardDefinitions")
    // biome-ignore lint/suspicious/noExplicitAny: Convex query builder type
    .withIndex("by_archetype", (q: any) => q.eq("archetype", archetype))
    // biome-ignore lint/suspicious/noExplicitAny: Convex filter type
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (archetypeCards.length === 0) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `No cards found for archetype: ${archetype}`,
    });
  }

  // Build deck: 45 cards
  // Strategy: Mix of creatures (60%), spells (25%), traps (15%)
  // biome-ignore lint/suspicious/noExplicitAny: Card type filtering
  const creatures = archetypeCards.filter((c: any) => c.cardType === "creature");
  // biome-ignore lint/suspicious/noExplicitAny: Card type filtering
  const spells = archetypeCards.filter((c: any) => c.cardType === "spell");
  // biome-ignore lint/suspicious/noExplicitAny: Card type filtering
  const traps = archetypeCards.filter((c: any) => c.cardType === "trap");

  const deck: Id<"cardDefinitions">[] = [];

  // Add 27 creatures (60%)
  for (let i = 0; i < 27; i++) {
    if (creatures.length > 0) {
      deck.push(creatures[i % creatures.length]._id);
    }
  }

  // Add 11 spells (25%)
  for (let i = 0; i < 11; i++) {
    if (spells.length > 0) {
      deck.push(spells[i % spells.length]._id);
    }
  }

  // Add 7 traps (15%)
  for (let i = 0; i < 7; i++) {
    if (traps.length > 0) {
      deck.push(traps[i % traps.length]._id);
    }
  }

  // If we don't have enough cards, fill with creatures
  while (deck.length < 45 && archetypeCards.length > 0) {
    deck.push(archetypeCards[deck.length % archetypeCards.length]._id);
  }

  if (deck.length < 45) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `Not enough cards to build deck for archetype: ${archetype}`,
    });
  }

  return deck.slice(0, 45);
}

/**
 * Get or create AI user for story mode
 *
 * For MVP: Creates a single AI user with a dummy deck
 */
// biome-ignore lint/suspicious/noExplicitAny: Convex context type workaround
async function getOrCreateAIUser(ctx: any): Promise<Id<"users">> {
  // Check if AI user already exists
  const existingAI = await ctx.db
    .query("users")
    // biome-ignore lint/suspicious/noExplicitAny: Convex query builder type
    .withIndex("username", (q: any) => q.eq("username", "StoryModeAI"))
    .first();

  if (existingAI) {
    return existingAI._id;
  }

  // Create AI user
  const aiUserId = await ctx.db.insert("users", {
    username: "StoryModeAI",
    email: "ai@storymode.local",
    isAnonymous: false,
    activeDeckId: undefined, // AI doesn't need a stored deck
    createdAt: Date.now(),
  });

  return aiUserId;
}

// ============================================================================
// INTERNAL MUTATIONS (For API Key Auth)
// ============================================================================

/**
 * Get list of chapters for story mode (internal query for API key auth)
 *
 * Returns all chapters with progress, unlock status, and detailed requirements
 * for locked chapters (why they're locked and what's needed to unlock).
 */
export const getChaptersInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all chapters
    const chapters = await ctx.db.query("storyChapters").collect();

    // Get user's progress on each chapter
    const chaptersWithProgress = await Promise.all(
      chapters.map(async (chapter) => {
        // Get all stages for this chapter
        const stages = await ctx.db
          .query("storyStages")
          .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
          .collect();

        // Get user's progress on each stage
        const stageProgress = await Promise.all(
          stages.map(async (stage) => {
            const progress = await ctx.db
              .query("storyStageProgress")
              .withIndex("by_user_stage", (q) =>
                q.eq("userId", args.userId).eq("stageId", stage._id)
              )
              .first();
            return {
              stageNumber: stage.stageNumber,
              status: progress?.status || "locked",
              starsEarned: progress?.starsEarned || 0,
            };
          })
        );

        const completedStages = stageProgress.filter(
          (s) => s.status === "completed" || s.status === "starred"
        ).length;
        const totalStars = stageProgress.reduce((sum, s) => sum + s.starsEarned, 0);

        // Check unlock status with detailed requirements
        const unlockResult = await checkChapterUnlocked(ctx, args.userId, chapter);

        return {
          _id: chapter._id,
          actNumber: chapter.actNumber,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          description: chapter.description,
          archetype: chapter.archetype,
          aiDifficulty: chapter.aiDifficulty,
          stagesCompleted: completedStages,
          totalStages: stages.length,
          totalStars,
          maxStars: stages.length * 3,
          isUnlocked: unlockResult.unlocked,
          lockReason: unlockResult.reason,
          unlockRequirements: unlockResult.requirements,
        };
      })
    );

    // Sort by act and chapter number
    chaptersWithProgress.sort((a, b) => {
      if ((a.actNumber ?? 0) !== (b.actNumber ?? 0)) return (a.actNumber ?? 0) - (b.actNumber ?? 0);
      return (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0);
    });

    return chaptersWithProgress;
  },
});

/**
 * Get stages for a chapter (internal query for API key auth)
 */
export const getChapterStagesInternal = internalQuery({
  args: {
    userId: v.id("users"),
    chapterId: v.id("storyChapters"),
  },
  handler: async (ctx, args) => {
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
          .withIndex("by_user_stage", (q) => q.eq("userId", args.userId).eq("stageId", stage._id))
          .first();

        return {
          _id: stage._id,
          stageNumber: stage.stageNumber,
          name: stage.name ?? stage.title,
          description: stage.description,
          aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
          rewardGold: stage.rewardGold ?? stage.firstClearGold,
          rewardXp: stage.rewardXp ?? 0,
          firstClearBonus: stage.firstClearBonus ?? null,
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
 * Initialize a story battle (internal mutation for API key auth)
 * For agents that want to instantly play against AI without matchmaking
 *
 * @param userId - User ID to start battle for
 * @param chapterId - Chapter identifier (e.g., "1-1", "1-2")
 * @param stageNumber - Stage number within chapter (1-10), defaults to 1
 * @param difficulty - Difficulty mode: "normal" (level 1+), "hard" (level 5+), or "legendary" (level 15+)
 */
export const initializeStoryBattleInternal = internalMutation({
  args: {
    userId: v.id("users"),
    chapterId: v.string(), // e.g., "1-1", "1-2", etc.
    stageNumber: v.optional(v.number()), // 1-10, defaults to 1 if not provided
    difficulty: v.optional(v.union(v.literal("normal"), v.literal("hard"), v.literal("legendary"))), // defaults to "normal"
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        reason: "User not found",
      });
    }

    const difficulty = args.difficulty ?? "normal";

    // Check difficulty access
    const access = await checkDifficultyAccess(ctx, args.userId, difficulty);
    if (!access.allowed) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: `Requires level ${access.requiredLevel} to play on ${difficulty} mode`,
        requiredLevel: access.requiredLevel,
        currentLevel: access.currentLevel,
      });
    }

    // Check retry limits
    const retryLimit = await checkRetryLimit(ctx, args.userId, difficulty);

    if (!retryLimit.allowed) {
      const timeUntilReset = formatTimeUntilReset(retryLimit.timeUntilReset);
      const difficultyName = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      throw createError(ErrorCode.RATE_LIMIT_EXCEEDED, {
        reason: `You've used all ${retryLimit.maxAttempts} attempts for ${difficultyName} mode. Resets in ${timeUntilReset}`,
        limit: retryLimit.maxAttempts,
        attemptsUsed: retryLimit.attemptsUsed,
        resetsAt: retryLimit.resetsAt,
      });
    }

    // Parse chapter ID (e.g., "1-1" -> act 1, chapter 1)
    const [actNum, chapNum] = args.chapterId.split("-").map(Number);

    if (!actNum || !chapNum || actNum < 1 || chapNum < 1 || chapNum > 10) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid chapter ID format. Expected format: '1-1'",
      });
    }

    // Get chapter from database
    const chapter = await ctx.db
      .query("storyChapters")
      .withIndex("by_act_chapter", (q) => q.eq("actNumber", actNum).eq("chapterNumber", chapNum))
      .first();

    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Check if chapter is unlocked for this player
    const unlockResult = await checkChapterUnlocked(ctx, args.userId, chapter);
    if (!unlockResult.unlocked) {
      throw createError(ErrorCode.AUTHZ_INSUFFICIENT_PERMISSIONS, {
        reason: unlockResult.reason ?? "Chapter is locked",
        requirements: unlockResult.requirements,
      });
    }

    // Get the specific stage for this battle
    const stageNumber = args.stageNumber || 1;
    const stage = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id).eq("stageNumber", stageNumber))
      .first();

    if (!stage) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Stage ${stageNumber} not found for this chapter`,
      });
    }

    // Initialize stage progress if it doesn't exist
    const existingProgress = await ctx.db
      .query("storyStageProgress")
      .withIndex("by_user_stage", (q) => q.eq("userId", args.userId).eq("stageId", stage._id))
      .first();

    if (!existingProgress) {
      // Create progress for all stages in this chapter
      const allStages = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
        .collect();

      for (const s of allStages) {
        const existingStageProgress = await ctx.db
          .query("storyStageProgress")
          .withIndex("by_user_stage", (q) => q.eq("userId", args.userId).eq("stageId", s._id))
          .first();

        if (!existingStageProgress) {
          await ctx.db.insert("storyStageProgress", {
            userId: args.userId,
            stageId: s._id,
            chapterId: chapter._id,
            stageNumber: s.stageNumber,
            status: s.stageNumber === 1 ? "available" : "locked",
            starsEarned: 0,
            timesCompleted: 0,
            firstClearClaimed: false,
          });
        }
      }
    }

    // Verify user has an active deck
    if (!user.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to start a battle",
      });
    }

    // Build AI deck from archetype cards
    // Use aiOpponentDeckCode (lowercase) which maps to actual card archetypes
    const deckArchetype = (chapter.aiOpponentDeckCode ?? "infernal_dragons").toLowerCase();
    const aiDeck = await buildAIDeck(ctx, deckArchetype);

    // Create or get AI user
    const aiUserId = await getOrCreateAIUser(ctx);

    // Create game lobby for story mode
    const gameId = `story_${args.userId}_${Date.now()}`;
    const now = Date.now();
    const playerUsername = user.username || "Agent";

    const lobbyId = await ctx.db.insert("gameLobbies", {
      gameId,
      hostId: args.userId,
      hostUsername: playerUsername,
      hostRank: "Unranked",
      hostRating: 1000,
      deckArchetype: "mixed",
      opponentId: aiUserId,
      opponentUsername: `AI - ${chapter.title}`,
      mode: "story",
      status: "active",
      isPrivate: true,
      joinCode: `story-${gameId}`,
      // Turn state is initialized in gameStates via initializeGameStateHelper
      lastMoveAt: now, // Keep for timeout tracking
      createdAt: now,
      startedAt: now,
      allowSpectators: false,
      spectatorCount: 0,
      maxSpectators: 0,
      // Story mode tracking
      stageId: stage._id,
    });

    // Initialize game state with AI opponent (sets turn state)
    await initializeGameStateHelper(ctx, {
      lobbyId,
      gameId,
      hostId: args.userId,
      opponentId: aiUserId,
      currentTurnPlayerId: args.userId,
      gameMode: "story",
      isAIOpponent: true,
      aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
      aiDeck,
    });

    return {
      gameId,
      lobbyId,
      stageId: stage._id,
      chapterTitle: chapter.title,
      stageName: stage.name ?? stage.title,
      stageNumber: stage.stageNumber,
      aiOpponentName: `AI - ${chapter.title}`,
      aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
      rewards: {
        gold: stage.rewardGold ?? stage.firstClearGold,
        xp: stage.rewardXp ?? 0,
        firstClearBonus: stage.firstClearBonus ?? null,
      },
    };
  },
});

/**
 * Quick play story mode - starts a random available stage
 * For agents that just want to instantly play against AI
 */
export const quickPlayStoryInternal = internalMutation({
  args: {
    userId: v.id("users"),
    difficulty: v.optional(
      v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"), v.literal("boss"))
    ),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        reason: "User not found",
      });
    }

    // Find an available stage for the user
    // First try to find any unlocked stage
    const allProgress = await ctx.db
      .query("storyStageProgress")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Find available stages
    let availableStages = allProgress.filter((p) => p.status === "available");

    // If no progress exists, initialize first chapter
    if (allProgress.length === 0) {
      const firstChapter = await ctx.db
        .query("storyChapters")
        .withIndex("by_act_chapter", (q) => q.eq("actNumber", 1).eq("chapterNumber", 1))
        .first();

      if (!firstChapter) {
        throw createError(ErrorCode.NOT_FOUND, {
          reason: "No chapters available",
        });
      }

      // Initialize stages for first chapter
      const stages = await ctx.db
        .query("storyStages")
        .withIndex("by_chapter", (q) => q.eq("chapterId", firstChapter._id))
        .collect();

      for (const stage of stages) {
        await ctx.db.insert("storyStageProgress", {
          userId: args.userId,
          stageId: stage._id,
          chapterId: firstChapter._id,
          stageNumber: stage.stageNumber,
          status: stage.stageNumber === 1 ? "available" : "locked",
          starsEarned: 0,
          timesCompleted: 0,
          firstClearClaimed: false,
        });
      }

      // Get the first stage
      const firstStage = stages.find((s) => s.stageNumber === 1);
      if (firstStage) {
        availableStages = [
          {
            _id: "" as Id<"storyStageProgress">,
            _creationTime: 0,
            userId: args.userId,
            stageId: firstStage._id,
            chapterId: firstChapter._id,
            stageNumber: 1,
            status: "available" as const,
            starsEarned: 0,
            timesCompleted: 0,
            firstClearClaimed: false,
          },
        ];
      }
    }

    // If still no available stages, use the last completed stage
    if (availableStages.length === 0) {
      const completedStages = allProgress.filter(
        (p) => p.status === "completed" || p.status === "starred"
      );
      if (completedStages.length > 0) {
        // Pick a random completed stage to replay
        const randomIndex = Math.floor(Math.random() * completedStages.length);
        const stageProgress = completedStages[randomIndex];
        if (stageProgress) {
          availableStages = [stageProgress];
        }
      }
    }

    if (availableStages.length === 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No available stages. Complete previous stages to unlock more.",
      });
    }

    // Filter by difficulty if specified
    let stageToPlay = availableStages[0];
    if (stageToPlay && args.difficulty) {
      for (const progress of availableStages) {
        const stage = await ctx.db.get(progress.stageId);
        if (stage && (stage.aiDifficulty ?? stage.difficulty) === args.difficulty) {
          stageToPlay = progress;
          break;
        }
      }
    }

    if (!stageToPlay) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No matching stage found",
      });
    }

    // Get the stage and chapter info
    const stage = await ctx.db.get(stageToPlay.stageId);
    if (!stage) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Stage not found",
      });
    }

    const chapter = await ctx.db.get(stage.chapterId);
    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Verify user has an active deck
    if (!user.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to start a battle",
      });
    }

    // Build AI deck from archetype cards
    // Use aiOpponentDeckCode (lowercase) which maps to actual card archetypes
    const deckArchetype = (chapter.aiOpponentDeckCode ?? "infernal_dragons").toLowerCase();
    const aiDeck = await buildAIDeck(ctx, deckArchetype);

    // Create or get AI user
    const aiUserId = await getOrCreateAIUser(ctx);

    // Create game lobby for story mode
    const gameId = `story_${args.userId}_${Date.now()}`;
    const now = Date.now();
    const playerUsername = user.username || "Agent";

    const lobbyId = await ctx.db.insert("gameLobbies", {
      gameId,
      hostId: args.userId,
      hostUsername: playerUsername,
      hostRank: "Unranked",
      hostRating: 1000,
      deckArchetype: "mixed",
      opponentId: aiUserId,
      opponentUsername: `AI - ${chapter.title}`,
      mode: "story",
      status: "active",
      isPrivate: true,
      joinCode: `story-${gameId}`,
      // Turn state is initialized in gameStates via initializeGameStateHelper
      lastMoveAt: now, // Keep for timeout tracking
      createdAt: now,
      startedAt: now,
      allowSpectators: false,
      spectatorCount: 0,
      maxSpectators: 0,
      // Story mode tracking
      stageId: stage._id,
    });

    // Initialize game state with AI opponent (sets turn state)
    await initializeGameStateHelper(ctx, {
      lobbyId,
      gameId,
      hostId: args.userId,
      opponentId: aiUserId,
      currentTurnPlayerId: args.userId,
      gameMode: "story",
      isAIOpponent: true,
      aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
      aiDeck,
    });

    return {
      gameId,
      lobbyId,
      stageId: stage._id,
      chapterTitle: chapter.title,
      stageName: stage.name ?? stage.title,
      stageNumber: stage.stageNumber,
      aiOpponentName: `AI - ${chapter.title}`,
      aiDifficulty: stage.aiDifficulty ?? stage.difficulty,
      rewards: {
        gold: stage.rewardGold ?? stage.firstClearGold,
        xp: stage.rewardXp ?? 0,
        firstClearBonus: stage.firstClearBonus ?? null,
      },
    };
  },
});
