/**
 * Game Engine - Phases Module
 *
 * Handles phase transitions within a turn.
 * LunchTable phases: Draw → Main → Combat → Breakdown Check → End
 */

import { v } from "convex/values";
import * as generatedApi from "../../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { internalMutation } from "../../functions";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { cleanupLingeringEffects } from "../effectSystem/lingeringEffects";
import { recordEventHelper } from "../gameEvents";

/**
 * Advance to Combat Phase (Internal)
 *
 * Internal mutation for API-based phase advancement.
 * Accepts gameId string for story mode support.
 */
export const advanceToCombatPhaseInternal = internalMutation({
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

    // 4. Validate we're in main phase
    if (gameState.currentPhase !== "main") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Can only enter Combat Phase from Main Phase",
        currentPhase: gameState.currentPhase,
      });
    }

    // 5. Get user info
    const user = await ctx.db.get(args.userId);
    const username = user?.username ?? user?.name ?? "Unknown";

    // 6. Clean up lingering effects that expire when leaving main phase
    await cleanupLingeringEffects(ctx, gameState, "main", gameState.turnNumber ?? 0);

    // 7. Update phase to combat
    await ctx.db.patch(gameState._id, {
      currentPhase: "combat",
    });

    // 8. Record phase change event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: username,
      description: `${username} entered Combat Phase`,
      metadata: {
        previousPhase: "main",
        newPhase: "combat",
      },
    });

    // 9. Trigger phase_changed webhooks
    await ctx.runMutation(internalAny.gameplay.webhooks.triggerWebhooks, {
      event: "phase_changed",
      gameId: args.gameId,
      lobbyId: gameState.lobbyId,
      turnNumber: gameState.turnNumber ?? 0,
      playerId: args.userId,
      additionalData: { previousPhase: "main", newPhase: "combat" },
    });

    return {
      success: true,
      phase: "combat",
    };
  },
});

/**
 * Advance to Breakdown Check Phase (Internal)
 *
 * Called after Combat Phase to enter Breakdown Check.
 */
export const advanceToBreakdownCheckInternal = internalMutation({
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

    // 4. Validate we're in combat phase
    if (gameState.currentPhase !== "combat") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Can only enter Breakdown Check from Combat Phase",
        currentPhase: gameState.currentPhase,
      });
    }

    // 5. Get user info
    const user = await ctx.db.get(args.userId);
    const username = user?.username ?? user?.name ?? "Unknown";

    // 6. Clean up lingering effects that expire when leaving combat phase
    await cleanupLingeringEffects(ctx, gameState, "combat", gameState.turnNumber ?? 0);

    // 7. Update phase to breakdown_check
    await ctx.db.patch(gameState._id, {
      currentPhase: "breakdown_check",
    });

    // 8. Record phase change event
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "phase_changed",
      playerId: args.userId,
      playerUsername: username,
      description: `${username} entered Breakdown Check`,
      metadata: {
        previousPhase: "combat",
        newPhase: "breakdown_check",
      },
    });

    // 9. Trigger phase_changed webhooks
    await ctx.runMutation(internalAny.gameplay.webhooks.triggerWebhooks, {
      event: "phase_changed",
      gameId: args.gameId,
      lobbyId: gameState.lobbyId,
      turnNumber: gameState.turnNumber ?? 0,
      playerId: args.userId,
      additionalData: { previousPhase: "combat", newPhase: "breakdown_check" },
    });

    return {
      success: true,
      phase: "breakdown_check",
    };
  },
});
