/**
 * Game Engine - Turns Module
 *
 * Handles turn management:
 * - End Turn
 */

import { v } from "convex/values";
import { internalMutation, mutation } from "../../_generated/server";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { clearTemporaryModifiers, drawCards } from "../../lib/gameHelpers";
import { validateGameActive } from "../../lib/gameValidation";
import { resetOPTEffects } from "../effectSystem/optTracker";
import { runBoardTriggers } from "../agentTriggers";
import { recordEventHelper } from "../gameEvents";
import { checkDeckOutCondition, checkStateBasedActions } from "./stateBasedActions";

/**
 * End Turn
 *
 * Ends the current player's turn and starts the next turn.
 * Must be in End Phase to call this.
 *
 * Records: turn_end, hand_limit_enforced, turn_start, phase_changed
 */
export const endTurn = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 4. Get game state (source of truth for turn state)
    // Note: We validate turn ownership after loading gameState
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 4. Validate it's the current player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate in Main Phase 2 or End Phase (can end turn from either)
    if (gameState.currentPhase !== "main2" && gameState.currentPhase !== "end") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Must be in Main Phase 2 or End Phase to end turn",
      });
    }

    // If still in Main Phase 2, advance to End Phase first
    if (gameState.currentPhase === "main2") {
      await ctx.db.patch(gameState._id, {
        currentPhase: "end",
      });
    }

    const isHost = user.userId === gameState.hostId;

    // 6. Trigger end-of-turn effects (agents/auto-triggers)
    await runBoardTriggers(ctx, gameState, args.lobbyId, "on_turn_end");

    // If a trigger ended the game, stop here (don't advance turns/phases).
    const lobbyAfterTurnEndTriggers = await ctx.db.get(args.lobbyId);
    if (lobbyAfterTurnEndTriggers && lobbyAfterTurnEndTriggers.status !== "active") {
      return {
        success: true,
        gameEnded: true,
        winnerId: lobbyAfterTurnEndTriggers.winnerId,
        newTurnPlayer: undefined,
        newTurnNumber: undefined,
      };
    }

    // 7. Enforce hand size limit via state-based actions (6 cards max)
    // SBA will handle discarding excess cards
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false, // Enforce hand limit at end of turn
      turnNumber: gameState.turnNumber,
    });

    // Check if game ended during SBA (unlikely at end of turn, but possible)
    if (sbaResult.gameEnded) {
      return {
        success: true,
        gameEnded: true,
        winnerId: sbaResult.winnerId,
        newTurnPlayer: undefined,
        newTurnNumber: undefined,
      };
    }

    // 7.5. Clear temporary modifiers (ATK/DEF bonuses "until end of turn")
    await clearTemporaryModifiers(ctx, gameState, "end");

    // 7.6. OPT/HOPT tracking now resets at turn START for the turn player
    // (This is more accurate to Yu-Gi-Oh rules where "once per turn" means once during your turn)
    // The resetOPTEffects is called after switching to the next player

    // 8. Clear "this turn" flags
    const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    // Reset hasAttacked and hasChangedPosition for all monsters
    const resetPlayerBoard = playerBoard.map((card) => ({
      ...card,
      hasAttacked: false,
      hasChangedPosition: false,
    }));

    const resetOpponentBoard = opponentBoard.map((card) => ({
      ...card,
      hasAttacked: false,
      hasChangedPosition: false,
    }));

    // 9. Record turn_end event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "turn_end",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username}'s turn ended`,
      metadata: {
        turnNumber: gameState.turnNumber ?? 0,
      },
    });

    // 10. Switch to next player
    const nextPlayerId = isHost ? gameState.opponentId : gameState.hostId;
    const nextTurnNumber = (gameState.turnNumber ?? 0) + 1;

    // Update turn state in gameState (source of truth)
    await ctx.db.patch(gameState._id, {
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
    });

    // Update lastMoveAt in lobby (for timeout tracking only)
    await ctx.db.patch(args.lobbyId, {
      lastMoveAt: Date.now(),
    });

    // 11. Reset normal summon flags and prepare for next turn
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: resetPlayerBoard,
      [isHost ? "opponentBoard" : "hostBoard"]: resetOpponentBoard,
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
    });

    // 12. Record turn_start event for new turn
    const nextPlayer = await ctx.db.get(nextPlayerId);
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: nextTurnNumber,
      eventType: "turn_start",
      playerId: nextPlayerId,
      playerUsername: nextPlayer?.username || "Unknown",
      description: `${nextPlayer?.username || "Unknown"}'s turn ${nextTurnNumber}`,
      metadata: {
        turnNumber: nextTurnNumber,
      },
    });

    // 12.5. Reset OPT/HOPT effects for the new turn player
    // OPT resets at the start of the turn player's turn
    // HOPT expires based on the resetOnTurn field (player's next turn)
    // gameState was already updated with new turn state above
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId);

      // Turn-start triggers (agents/auto-triggers) run after OPT reset, before draw.
      await runBoardTriggers(ctx, gameStateForOPT, args.lobbyId, "on_turn_start");

      const lobbyAfterTurnStartTriggers = await ctx.db.get(args.lobbyId);
      if (lobbyAfterTurnStartTriggers && lobbyAfterTurnStartTriggers.status !== "active") {
        return {
          success: true,
          gameEnded: true,
          winnerId: lobbyAfterTurnStartTriggers.winnerId,
          newTurnPlayer: nextPlayer?.username || "Unknown",
          newTurnNumber: nextTurnNumber,
        };
      }
    }

    // 13. Auto-execute Draw Phase and advance to Main Phase 1
    const shouldSkipDraw = nextTurnNumber === 1 && nextPlayerId === lobby.hostId;

    // Refresh game state to get latest data after phase reset
    const refreshedGameState = await ctx.db.get(gameState._id);
    if (!refreshedGameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found after turn transition",
      });
    }

    if (!shouldSkipDraw) {
      // Draw 1 card for the new turn (drawCards already records the event)
      const drawnCards = await drawCards(ctx, refreshedGameState, nextPlayerId, 1);
      console.log(
        `Turn ${nextTurnNumber}: ${nextPlayer?.username} drew ${drawnCards.length} card(s)`
      );

      // Check for deck-out condition (player needs to draw but deck is empty)
      if (drawnCards.length === 0) {
        const deckOutResult = await checkDeckOutCondition(
          ctx,
          args.lobbyId,
          nextPlayerId,
          nextTurnNumber
        );
        if (deckOutResult.gameEnded) {
          return {
            success: true,
            gameEnded: true,
            winnerId: deckOutResult.winnerId,
            newTurnPlayer: nextPlayer?.username || "Unknown",
            newTurnNumber: nextTurnNumber,
            endReason: "deck_out",
          };
        }
      }
    } else {
      console.log(`Turn ${nextTurnNumber}: Skipping draw for first player's first turn`);
    }

    // Auto-advance through Draw Phase → Standby → Main Phase 1
    await ctx.db.patch(refreshedGameState._id, {
      currentPhase: "main1",
    });

    // Record phase change to Main Phase 1
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: nextTurnNumber,
      eventType: "phase_changed",
      playerId: nextPlayerId,
      playerUsername: nextPlayer?.username || "Unknown",
      description: `${nextPlayer?.username || "Unknown"} entered Main Phase 1`,
      metadata: {
        previousPhase: "end",
        newPhase: "main1",
        cardDrawn: !shouldSkipDraw,
      },
    });

    // 15. Return success
    return {
      success: true,
      newTurnPlayer: nextPlayer?.username || "Unknown",
      newTurnNumber: nextTurnNumber,
    };
  },
});

/**
 * End Turn (Internal)
 *
 * Internal mutation for API-based end turn.
 * Accepts gameId string instead of lobbyId for story mode support.
 * More permissive - allows ending turn from any main phase.
 */
export const endTurnInternal = internalMutation({
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

    // 2. Get lobby (for timeout tracking)
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn (using gameState as source of truth)
    if (gameState.currentTurnPlayerId !== args.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4. Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // 5. For story mode, allow ending from any main phase
    // Auto-advance to end phase if needed
    if (gameState.currentPhase === "main1" || gameState.currentPhase === "main2") {
      await ctx.db.patch(gameState._id, {
        currentPhase: "end",
      });
    }

    const isHost = args.userId === gameState.hostId;

    // 6. Trigger end-of-turn effects (agents/auto-triggers)
    await runBoardTriggers(ctx, gameState, gameState.lobbyId, "on_turn_end");

    // If a trigger ended the game, stop here (don't advance turns/phases).
    const lobbyAfterTurnEndTriggers = await ctx.db.get(gameState.lobbyId);
    if (lobbyAfterTurnEndTriggers && lobbyAfterTurnEndTriggers.status !== "active") {
      return {
        success: true,
        gameEnded: true,
        winnerId: lobbyAfterTurnEndTriggers.winnerId,
        newTurnPlayer: undefined,
        newTurnNumber: undefined,
      };
    }

    // 6. Enforce hand size limit via state-based actions
    const sbaResult = await checkStateBasedActions(ctx, gameState.lobbyId, {
      skipHandLimit: false,
      turnNumber: gameState.turnNumber,
    });

    if (sbaResult.gameEnded) {
      return {
        success: true,
        gameEnded: true,
        winnerId: sbaResult.winnerId,
        newTurnPlayer: undefined,
        newTurnNumber: undefined,
      };
    }

    // 7. Clear temporary modifiers
    await clearTemporaryModifiers(ctx, gameState, "end");

    // 8. Clear "this turn" flags
    const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
    const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;

    const resetPlayerBoard = playerBoard.map((card) => ({
      ...card,
      hasAttacked: false,
      hasChangedPosition: false,
    }));

    const resetOpponentBoard = opponentBoard.map((card) => ({
      ...card,
      hasAttacked: false,
      hasChangedPosition: false,
    }));

    // 9. Record turn_end event
    const username = user.username ?? user.name ?? "Unknown";
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "turn_end",
      playerId: args.userId,
      playerUsername: username,
      description: `${username}'s turn ended`,
      metadata: {
        turnNumber: gameState.turnNumber ?? 0,
      },
    });

    // 10. Switch to next player
    const nextPlayerId = isHost ? gameState.opponentId : gameState.hostId;
    const nextTurnNumber = (gameState.turnNumber ?? 0) + 1;

    // Update turn state in gameState (source of truth)
    await ctx.db.patch(gameState._id, {
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
    });

    // Update lastMoveAt in lobby (for timeout tracking only)
    await ctx.db.patch(gameState.lobbyId, {
      lastMoveAt: Date.now(),
    });

    // 11. Reset normal summon flags
    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: resetPlayerBoard,
      [isHost ? "opponentBoard" : "hostBoard"]: resetOpponentBoard,
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
    });

    // 12. Record turn_start event for new turn
    const nextPlayer = await ctx.db.get(nextPlayerId);
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: nextTurnNumber,
      eventType: "turn_start",
      playerId: nextPlayerId,
      playerUsername: nextPlayer?.username || "AI Opponent",
      description: `${nextPlayer?.username || "AI Opponent"}'s turn ${nextTurnNumber}`,
      metadata: {
        turnNumber: nextTurnNumber,
      },
    });

    // 12.5. Reset OPT effects
    // gameState was already updated with new turn state above
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId);

      // Turn-start triggers (agents/auto-triggers) run after OPT reset, before draw.
      await runBoardTriggers(ctx, gameStateForOPT, gameState.lobbyId, "on_turn_start");

      const lobbyAfterTurnStartTriggers = await ctx.db.get(gameState.lobbyId);
      if (lobbyAfterTurnStartTriggers && lobbyAfterTurnStartTriggers.status !== "active") {
        return {
          success: true,
          gameEnded: true,
          winnerId: lobbyAfterTurnStartTriggers.winnerId,
          newTurnPlayer: nextPlayer?.username || "AI Opponent",
          newTurnNumber: nextTurnNumber,
        };
      }
    }

    // 13. Auto-execute Draw Phase and advance to Main Phase 1
    const shouldSkipDraw = nextTurnNumber === 1 && nextPlayerId === lobby.hostId;
    const refreshedGameState = await ctx.db.get(gameState._id);
    if (!refreshedGameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND, {
        reason: "Game state not found after turn transition",
      });
    }

    if (!shouldSkipDraw) {
      const drawnCards = await drawCards(ctx, refreshedGameState, nextPlayerId, 1);

      if (drawnCards.length === 0) {
        const deckOutResult = await checkDeckOutCondition(
          ctx,
          gameState.lobbyId,
          nextPlayerId,
          nextTurnNumber
        );
        if (deckOutResult.gameEnded) {
          return {
            success: true,
            gameEnded: true,
            winnerId: deckOutResult.winnerId,
            newTurnPlayer: nextPlayer?.username || "AI Opponent",
            newTurnNumber: nextTurnNumber,
            endReason: "deck_out",
          };
        }
      }
    }

    // Auto-advance to Main Phase 1
    await ctx.db.patch(refreshedGameState._id, {
      currentPhase: "main1",
    });

    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: nextTurnNumber,
      eventType: "phase_changed",
      playerId: nextPlayerId,
      playerUsername: nextPlayer?.username || "AI Opponent",
      description: `${nextPlayer?.username || "AI Opponent"} entered Main Phase 1`,
      metadata: {
        previousPhase: "end",
        newPhase: "main1",
        cardDrawn: !shouldSkipDraw,
      },
    });

    return {
      success: true,
      newTurnPlayer: nextPlayer?.username || "AI Opponent",
      newTurnNumber: nextTurnNumber,
    };
  },
});
