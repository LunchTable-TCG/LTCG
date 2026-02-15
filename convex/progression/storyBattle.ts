/**
 * Story Battle Initialization — Public Mutations
 *
 * Frontend-callable mutations for starting story mode battles.
 * Creates a lobby + game state with an AI opponent.
 *
 * Frontend hooks reference these as: typedApi.progression.storyBattle.*
 */

import { v } from "convex/values";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../functions";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { initializeGameStateHelper } from "../gameplay/games/lifecycle";
import { LTCGStory } from "@lunchtable-tcg/story";

const story = new LTCGStory(components.lunchtable_tcg_story as any);

/**
 * Get or create the system AI user for story mode battles
 */
async function getOrCreateAIUser(ctx: any) {
  // Look for existing AI user
  let aiUser = await ctx.db
    .query("users")
    .withIndex("username", (q: any) => q.eq("username", "CPU"))
    .first();

  if (!aiUser) {
    // Create AI user
    const aiUserId = await ctx.db.insert("users", {
      privyId: "system:ai-opponent",
      username: "CPU",
      email: "ai@localhost",
      name: "CPU Opponent",
      createdAt: Date.now(),
    });
    aiUser = await ctx.db.get(aiUserId);
  }

  return aiUser!;
}

/**
 * Build an AI deck from available card definitions
 */
async function buildAIDeck(
  ctx: any,
  archetype?: string,
): Promise<Id<"cardDefinitions">[]> {
  // Get available card definitions
  let cards = await ctx.db.query("cardDefinitions").collect();

  // Filter to the archetype if specified
  if (archetype && archetype !== "mixed") {
    const archetypeCards = cards.filter((c: any) => c.archetype === archetype);
    if (archetypeCards.length >= 10) {
      cards = archetypeCards;
    }
  }

  // Separate by type
  const stereotypes = cards.filter((c: any) => c.cardType === "stereotype");
  const spells = cards.filter((c: any) => c.cardType === "spell");
  const traps = cards.filter((c: any) => c.cardType === "trap");

  const deck: Id<"cardDefinitions">[] = [];

  // Build a 40-card deck: ~20 stereotypes, ~12 spells, ~8 traps
  const targetStereotypes = 20;
  const targetSpells = 12;
  const targetTraps = 8;

  // Add stereotypes (up to 3 copies each)
  for (const card of stereotypes) {
    if (deck.length >= targetStereotypes) break;
    const copies = Math.min(3, targetStereotypes - deck.length);
    for (let i = 0; i < copies; i++) {
      deck.push(card._id);
    }
  }

  // Add spells
  for (const card of spells) {
    if (deck.length >= targetStereotypes + targetSpells) break;
    const copies = Math.min(2, targetStereotypes + targetSpells - deck.length);
    for (let i = 0; i < copies; i++) {
      deck.push(card._id);
    }
  }

  // Add traps
  for (const card of traps) {
    if (deck.length >= targetStereotypes + targetSpells + targetTraps) break;
    const copies = Math.min(2, targetStereotypes + targetSpells + targetTraps - deck.length);
    for (let i = 0; i < copies; i++) {
      deck.push(card._id);
    }
  }

  // If we still don't have 30 cards, pad with any available cards
  if (deck.length < 30) {
    for (const card of cards) {
      if (deck.length >= 40) break;
      // Don't add more than 3 copies of any card
      const currentCount = deck.filter((id) => id === card._id).length;
      if (currentCount < 3) {
        deck.push(card._id);
      }
    }
  }

  return deck;
}

/**
 * Initialize a story battle (user-authenticated mutation)
 *
 * Called by frontend when player clicks "Start Battle" on a story stage.
 */
export const initializeStoryBattle = mutation({
  args: {
    chapterId: v.string(),
    stageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Parse chapterId format: "1-1" → actNumber=1, chapterNumber=1
    const parts = args.chapterId.split("-");
    if (parts.length !== 2) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid chapter ID format. Expected format: '1-1'",
      });
    }
    const actNumber = Number.parseInt(parts[0]!, 10);
    const chapterNumber = Number.parseInt(parts[1]!, 10);

    if (Number.isNaN(actNumber) || Number.isNaN(chapterNumber)) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid chapter ID format. Expected format: '1-1'",
      });
    }

    // Get chapter from story component
    const chapter = await story.chapters.getChapterByNumber(ctx, actNumber, chapterNumber);
    if (!chapter) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Chapter not found",
      });
    }

    // Get stage
    const stages = await story.stages.getStages(ctx, chapter._id);
    const stageNumber = args.stageNumber ?? 1;
    const stage = stages?.find((s: any) => s.stageNumber === stageNumber);
    if (!stage) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Stage ${stageNumber} not found for this chapter`,
      });
    }

    // Verify user has an active deck
    const user = await ctx.db.get(auth.userId);
    if (!user?.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to start a story battle",
      });
    }

    // Get or create AI user
    const aiUser = await getOrCreateAIUser(ctx);

    // Build AI deck
    const aiDifficulty = (stage as any).aiDifficulty ?? (stage as any).difficulty ?? "easy";
    const aiDeck = await buildAIDeck(ctx, chapter.archetype);

    // Create lobby
    const gameId = crypto.randomUUID();
    const lobbyId = await ctx.db.insert("gameLobbies", {
      hostId: auth.userId,
      hostUsername: auth.username,
      hostRank: "Unranked",
      hostRating: 1000,
      deckArchetype: "mixed",
      mode: "story",
      status: "active",
      isPrivate: true,
      opponentId: aiUser._id,
      opponentUsername: (stage as any).opponentName ?? "CPU Opponent",
      opponentRank: "CPU",
      gameId,
      turnNumber: 1,
      currentTurnPlayerId: auth.userId,
      stageId: stage._id,
      createdAt: Date.now(),
      startedAt: Date.now(),
    });

    // Initialize game state
    await initializeGameStateHelper(ctx, {
      lobbyId,
      gameId,
      hostId: auth.userId,
      opponentId: aiUser._id as Id<"users">,
      currentTurnPlayerId: auth.userId,
      gameMode: "story",
      isAIOpponent: true,
      aiDifficulty: aiDifficulty as "easy" | "normal" | "medium" | "hard" | "boss",
      aiDeck,
    });

    return {
      lobbyId,
      gameId,
      stageId: stage._id,
      chapterTitle: chapter.title,
      stageName: (stage as any).name ?? (stage as any).title ?? `Stage ${stageNumber}`,
      stageNumber,
      aiOpponentName: (stage as any).opponentName ?? "CPU Opponent",
      aiDifficulty,
      rewards: {
        gold: (stage as any).rewardGold ?? 50,
        xp: (stage as any).rewardXp ?? 25,
      },
    };
  },
});

/**
 * Quick play — start a story battle without chapter context
 *
 * Called by frontend for "Play vs CPU" from the lunchtable page.
 */
export const quickPlayStoryBattle = mutation({
  args: {
    difficulty: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthMutation(ctx);

    // Verify user has an active deck
    const user = await ctx.db.get(auth.userId);
    if (!user?.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to start a story battle",
      });
    }

    const difficulty = args.difficulty ?? "easy";

    // Get or create AI user
    const aiUser = await getOrCreateAIUser(ctx);

    // Build AI deck (no specific archetype for quick play)
    const aiDeck = await buildAIDeck(ctx);

    // Create lobby
    const gameId = crypto.randomUUID();
    const lobbyId = await ctx.db.insert("gameLobbies", {
      hostId: auth.userId,
      hostUsername: auth.username,
      hostRank: "Unranked",
      hostRating: 1000,
      deckArchetype: "mixed",
      mode: "story",
      status: "active",
      isPrivate: true,
      opponentId: aiUser._id,
      opponentUsername: "CPU Opponent",
      opponentRank: "CPU",
      gameId,
      turnNumber: 1,
      currentTurnPlayerId: auth.userId,
      createdAt: Date.now(),
      startedAt: Date.now(),
    });

    // Initialize game state
    await initializeGameStateHelper(ctx, {
      lobbyId,
      gameId,
      hostId: auth.userId,
      opponentId: aiUser._id as Id<"users">,
      currentTurnPlayerId: auth.userId,
      gameMode: "story",
      isAIOpponent: true,
      aiDifficulty: difficulty as "easy" | "normal" | "medium" | "hard" | "boss",
      aiDeck,
    });

    return {
      lobbyId,
      gameId,
    };
  },
});
