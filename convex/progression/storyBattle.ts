/**
 * Story Battle Initialization
 *
 * Creates and initializes a story mode battle against an AI opponent
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "../_generated/server";
import { initializeGameStateHelper } from "../gameplay/games/lifecycle";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { STORY_CHAPTERS } from "../seeds/storyChapters";

/**
 * Initialize a story mode battle
 *
 * Creates a game lobby and game state for a single-player story battle
 * against an AI opponent using the chapter's designated deck.
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
      .withIndex("by_chapter", (q) =>
        q.eq("chapterId", chapter._id).eq("stageNumber", stageNumber)
      )
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
    const aiDeck = await buildAIDeck(ctx, chapter.archetype ?? "neutral");

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
          isUnlocked:
            (chapter.actNumber === 1 && chapter.chapterNumber === 1) || completedStages > 0,
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
 */
export const initializeStoryBattleInternal = internalMutation({
  args: {
    userId: v.id("users"),
    chapterId: v.string(), // e.g., "1-1", "1-2", etc.
    stageNumber: v.optional(v.number()), // 1-10, defaults to 1 if not provided
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        reason: "User not found",
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

    // Get the specific stage for this battle
    const stageNumber = args.stageNumber || 1;
    const stage = await ctx.db
      .query("storyStages")
      .withIndex("by_chapter", (q) =>
        q.eq("chapterId", chapter._id).eq("stageNumber", stageNumber)
      )
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
    const aiDeck = await buildAIDeck(ctx, chapter.archetype ?? "neutral");

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
            _id: "" as any,
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
    const aiDeck = await buildAIDeck(ctx, chapter.archetype ?? "neutral");

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
