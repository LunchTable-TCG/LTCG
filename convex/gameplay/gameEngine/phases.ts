/**
 * Game Engine - Phases Module
 *
 * Handles phase transitions within a turn.
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { cleanupLingeringEffects } from "../effectSystem/lingeringEffects";
import { recordEventHelper } from "../gameEvents";

/**
 * Advance to Battle Phase (Internal)
 *
 * Internal mutation for API-based phase advancement.
 * Accepts gameId string for story mode support.
 */
export const advanceToBattlePhaseInternal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Find game state by gameId
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // 2. Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4. Validate we're in main1
    if (gameState.currentPhase !== "main1") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Can only enter Battle Phase from Main Phase 1",
        currentPhase: gameState.currentPhase,
      });
    }

    // 5. Get user info
    const user = await ctx.db.get(args.userId);
    const username = user?.username ?? user?.name ?? "Unknown";

    // 6. Clean up lingering effects that expire when leaving main1
    await cleanupLingeringEffects(ctx, gameState, "main1", gameState.turnNumber ?? 0);

    // 7. Update phase to battle
    await ctx.db.patch(gameState._id, {
      currentPhase: "battle",
    });

    // 8. Record phase change event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: username,
      description: `${username} entered Battle Phase`,
      metadata: {
        previousPhase: "main1",
        newPhase: "battle",
      },
    });

    return {
      success: true,
      phase: "battle",
    };
  },
});

/**
 * Advance to Main Phase 2 (Internal)
 *
 * Called after Battle Phase to enter Main Phase 2.
 */
export const advanceToMainPhase2Internal = internalMutation({
  args: {
    gameId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // 1. Find game state by gameId
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_game_id", (q) => q.eq("gameId", args.gameId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game not found",
        gameId: args.gameId,
      });
    }

    // 2. Get lobby
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4. Validate we're in battle phase
    if (gameState.currentPhase !== "battle") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Can only enter Main Phase 2 from Battle Phase",
        currentPhase: gameState.currentPhase,
      });
    }

    // 5. Get user info
    const user = await ctx.db.get(args.userId);
    const username = user?.username ?? user?.name ?? "Unknown";

    // 6. Clean up lingering effects that expire when leaving battle phase
    await cleanupLingeringEffects(ctx, gameState, "battle", gameState.turnNumber ?? 0);

    // 7. Update phase to main2
    await ctx.db.patch(gameState._id, {
      currentPhase: "main2",
    });

    // 8. Record phase change event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: username,
      description: `${username} entered Main Phase 2`,
      metadata: {
        previousPhase: "battle",
        newPhase: "main2",
      },
    });

    return {
      success: true,
      phase: "main2",
    };
  },
});
