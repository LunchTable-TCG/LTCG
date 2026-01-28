/**
 * Story Battle Initialization
 *
 * Creates and initializes a story mode battle against an AI opponent
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
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
      .withIndex("by_chapter_stage", (q) =>
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
    const aiDeck = await buildAIDeck(ctx, chapter.archetype, chapter.aiOpponentDeckCode);

    // Create or get AI user
    const aiUserId = await getOrCreateAIUser(ctx, chapter.aiOpponentDeckCode);

    // Create game lobby for story mode
    const gameId = `story_${userId}_${Date.now()}`;
    const now = Date.now();

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
      currentTurnPlayerId: userId, // Player goes first
      turnNumber: 1, // Start at turn 1
      turnStartedAt: now,
      lastMoveAt: now,
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
      aiDifficulty: stage.aiDifficulty, // Use stage's difficulty (easy, medium, hard, boss)
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
async function buildAIDeck(
  ctx: any,
  archetype: string,
  deckCode: string
): Promise<Id<"cardDefinitions">[]> {
  // Query all active cards of this archetype
  const archetypeCards = await ctx.db
    .query("cardDefinitions")
    .withIndex("by_archetype", (q: any) => q.eq("archetype", archetype))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  if (archetypeCards.length === 0) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: `No cards found for archetype: ${archetype}`,
    });
  }

  // Build deck: 45 cards
  // Strategy: Mix of creatures (60%), spells (25%), traps (15%)
  const creatures = archetypeCards.filter((c: any) => c.cardType === "creature");
  const spells = archetypeCards.filter((c: any) => c.cardType === "spell");
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
async function getOrCreateAIUser(ctx: any, deckCode: string): Promise<Id<"users">> {
  // Check if AI user already exists
  const existingAI = await ctx.db
    .query("users")
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
