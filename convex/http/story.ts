/**
 * Story Mode API Endpoints
 *
 * Handles story mode battles for AI agents.
 * Allows agents to instantly play against AI opponents without matchmaking.
 */

import type { Id } from "../_generated/dataModel";
import type { MutationFunction, QueryFunction, StoryChapter, StoryStage } from "./lib/apiHelpers";
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  getQueryParam,
  parseJsonBody,
  successResponse,
} from "./middleware/responses";

// Type-safe API references to avoid TS2589
const getChaptersInternalQuery = require("../_generated/api").internal.progression.storyBattle
  .getChaptersInternal as QueryFunction<{ userId: Id<"users"> }, StoryChapter[]>;

const getChapterStagesInternalQuery = require("../_generated/api").internal.progression.storyBattle
  .getChapterStagesInternal as QueryFunction<
  { userId: Id<"users">; chapterId: Id<"storyChapters"> },
  StoryStage[]
>;

const initializeStoryBattleInternalMutation = require("../_generated/api").internal.progression
  .storyBattle.initializeStoryBattleInternal as MutationFunction<
  { userId: Id<"users">; chapterId: string; stageNumber?: number },
  {
    gameId: Id<"games">;
    lobbyId: Id<"lobbies">;
    stageId: Id<"storyStages">;
    chapterTitle: string;
    stageName: string;
    stageNumber: number;
    aiOpponentName: string;
    aiDifficulty: string;
    rewards: Record<string, number>;
  }
>;

const quickPlayStoryInternalMutation = require("../_generated/api").internal.progression.storyBattle
  .quickPlayStoryInternal as MutationFunction<
  { userId: Id<"users">; difficulty?: string },
  {
    gameId: Id<"games">;
    lobbyId: Id<"lobbies">;
    stageId: Id<"storyStages">;
    chapterTitle: string;
    stageName: string;
    stageNumber: number;
    aiOpponentName: string;
    aiDifficulty: string;
    rewards: Record<string, number>;
  }
>;

const completeStageInternalMutation = require("../_generated/api").internal.progression.storyStages
  .completeStageInternal as MutationFunction<
  { userId: Id<"users">; stageId: Id<"storyStages">; won: boolean; finalLP: number },
  {
    won: boolean;
    rewards: Record<string, number>;
    starsEarned: number;
    newBestScore: boolean;
    unlockedNextStage: boolean;
    levelUp?: { newLevel: number; rewards: Record<string, number> };
    newBadges?: string[];
  }
>;

const executeAITurnInternalMutation = require("../_generated/api").internal.gameplay.ai.aiTurn
  .executeAITurnInternal as MutationFunction<
  { gameId: string },
  { success: boolean; message: string; actionsTaken: number }
>;

/**
 * GET /api/agents/story/chapters
 * Get all story chapters with progress
 * Requires API key authentication
 */
export const chapters = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const chaptersWithProgress = await ctx.runQuery(getChaptersInternalQuery, {
      userId: auth.userId,
    });

    return successResponse({
      chapters: chaptersWithProgress,
      count: chaptersWithProgress.length,
    });
  } catch (error) {
    return errorResponse("FETCH_CHAPTERS_FAILED", "Failed to fetch chapters", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/story/stages
 * Get stages for a specific chapter with progress
 * Requires API key authentication
 * Query param: chapterId
 */
export const stages = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const chapterId = getQueryParam(request, "chapterId");
    if (!chapterId) {
      return errorResponse("MISSING_CHAPTER_ID", "chapterId query parameter is required", 400);
    }

    const stagesWithProgress = await ctx.runQuery(getChapterStagesInternalQuery, {
      userId: auth.userId,
      chapterId: chapterId as Id<"storyChapters">,
    });

    return successResponse({
      stages: stagesWithProgress,
      count: stagesWithProgress.length,
    });
  } catch (error) {
    return errorResponse("FETCH_STAGES_FAILED", "Failed to fetch stages", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/story/start
 * Start a story battle against AI
 * Requires API key authentication
 *
 * Body:
 * - chapterId: string (e.g., "1-1") - Required
 * - stageNumber: number (1-10) - Optional, defaults to 1
 */
export const start = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      chapterId: string;
      stageNumber?: number;
    }>(request);

    if (body instanceof Response) return body;

    if (!body.chapterId) {
      return errorResponse("MISSING_CHAPTER_ID", "chapterId is required", 400);
    }

    const result = await ctx.runMutation(initializeStoryBattleInternalMutation, {
      userId: auth.userId,
      chapterId: body.chapterId,
      stageNumber: body.stageNumber,
    });

    return successResponse(
      {
        gameId: result.gameId,
        lobbyId: result.lobbyId,
        stageId: result.stageId,
        chapter: result.chapterTitle,
        stage: {
          name: result.stageName,
          number: result.stageNumber,
        },
        aiOpponent: result.aiOpponentName,
        difficulty: result.aiDifficulty,
        rewards: result.rewards,
        message: "Story battle started! You go first.",
      },
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Invalid chapter ID")) {
        return errorResponse(
          "INVALID_CHAPTER_ID",
          "Invalid chapter ID format. Expected format: '1-1'",
          400
        );
      }
      if (error.message.includes("Chapter not found")) {
        return errorResponse("CHAPTER_NOT_FOUND", "Chapter not found", 404);
      }
      if (error.message.includes("Stage") && error.message.includes("not found")) {
        return errorResponse("STAGE_NOT_FOUND", "Stage not found for this chapter", 404);
      }
      if (error.message.includes("active deck")) {
        return errorResponse(
          "NO_ACTIVE_DECK",
          "You must have an active deck to start a story battle",
          400
        );
      }
    }

    return errorResponse("START_STORY_BATTLE_FAILED", "Failed to start story battle", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/story/quick-play
 * Start a random story battle instantly
 * Finds an available stage and starts a battle immediately
 * Requires API key authentication
 *
 * Body:
 * - difficulty: "easy" | "medium" | "hard" | "boss" - Optional
 */
export const quickPlay = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      difficulty?: "easy" | "medium" | "hard" | "boss";
    }>(request);

    if (body instanceof Response) return body;

    const result = await ctx.runMutation(quickPlayStoryInternalMutation, {
      userId: auth.userId,
      difficulty: body.difficulty,
    });

    return successResponse(
      {
        gameId: result.gameId,
        lobbyId: result.lobbyId,
        stageId: result.stageId,
        chapter: result.chapterTitle,
        stage: {
          name: result.stageName,
          number: result.stageNumber,
        },
        aiOpponent: result.aiOpponentName,
        difficulty: result.aiDifficulty,
        rewards: result.rewards,
        message: "Story battle started! You go first.",
      },
      201
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("No available stages")) {
        return errorResponse(
          "NO_AVAILABLE_STAGES",
          "No available stages. Complete previous stages to unlock more.",
          400
        );
      }
      if (error.message.includes("active deck")) {
        return errorResponse(
          "NO_ACTIVE_DECK",
          "You must have an active deck to start a story battle",
          400
        );
      }
      if (error.message.includes("No chapters")) {
        return errorResponse("NO_CHAPTERS", "No story chapters are available yet", 404);
      }
    }

    return errorResponse("QUICK_PLAY_FAILED", "Failed to start quick play battle", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/story/complete
 * Complete a story stage and get rewards
 * Called when a story battle ends
 * Requires API key authentication
 *
 * Body:
 * - stageId: string - Required
 * - won: boolean - Required
 * - finalLP: number - Required (remaining life points)
 */
export const complete = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      stageId: string;
      won: boolean;
      finalLP: number;
    }>(request);

    if (body instanceof Response) return body;

    if (!body.stageId) {
      return errorResponse("MISSING_STAGE_ID", "stageId is required", 400);
    }
    if (body.won === undefined) {
      return errorResponse("MISSING_WON", "won field is required", 400);
    }
    if (body.finalLP === undefined) {
      return errorResponse("MISSING_FINAL_LP", "finalLP field is required", 400);
    }

    const result = await ctx.runMutation(completeStageInternalMutation, {
      userId: auth.userId,
      stageId: body.stageId as Id<"storyStages">,
      won: body.won,
      finalLP: body.finalLP,
    });

    return successResponse({
      won: result.won,
      rewards: result.rewards,
      starsEarned: result.starsEarned,
      newBestScore: result.newBestScore,
      unlockedNextStage: result.unlockedNextStage,
      levelUp: result.levelUp,
      newBadges: result.newBadges,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Stage not found")) {
        return errorResponse("STAGE_NOT_FOUND", "Stage not found", 404);
      }
      if (error.message.includes("progress not found")) {
        return errorResponse("PROGRESS_NOT_FOUND", "Stage progress not found", 404);
      }
    }

    return errorResponse("COMPLETE_STAGE_FAILED", "Failed to complete stage", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/agents/story/ai-turn
 * Execute AI opponent's turn in a story battle
 * Called after the agent ends their turn
 * Requires API key authentication
 *
 * Body:
 * - gameId: string - Required
 */
export const aiTurn = authHttpAction(async (ctx, request, _auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      gameId: string;
    }>(request);

    if (body instanceof Response) return body;

    if (!body.gameId) {
      return errorResponse("MISSING_GAME_ID", "gameId is required", 400);
    }

    // Execute AI turn using internal mutation
    const result = await ctx.runMutation(executeAITurnInternalMutation, {
      gameId: body.gameId,
    });

    return successResponse({
      success: result.success,
      message: result.message,
      actionsTaken: result.actionsTaken,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Game not found")) {
        return errorResponse("GAME_NOT_FOUND", "Game not found", 404);
      }
      if (error.message.includes("Not AI's turn")) {
        return errorResponse("NOT_AI_TURN", "It is not the AI's turn", 400);
      }
    }

    return errorResponse("AI_TURN_FAILED", "Failed to execute AI turn", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
