/**
 * Game Engine - Turns Module
 *
 * Handles turn management:
 * - End Turn
 */

import { v } from "convex/values";
import { api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../functions";
import { getCardAbility } from "../../lib/abilityHelpers";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { clearTemporaryModifiers, drawCards } from "../../lib/gameHelpers";
import { validateGameActive } from "../../lib/gameValidation";
import { executeEffect } from "../effectSystem/index";
import { cleanupLingeringEffects } from "../effectSystem/lingeringEffects";
import { resetOPTEffects } from "../effectSystem/optTracker";
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

    // 6. Trigger end-of-turn effects
    // Check all cards on the field for "on_turn_end" or "on_end_phase" triggers
    {
      const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
      const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
      const opponentId = isHost ? gameState.opponentId : gameState.hostId;

      interface BoardCardWithOwner {
        cardId: Id<"cardDefinitions">;
        ownerId: Id<"users">;
      }

      const allBoards: BoardCardWithOwner[] = [
        ...playerBoard.map((bc) => ({ cardId: bc.cardId, ownerId: user.userId })),
        ...opponentBoard.map((bc) => ({ cardId: bc.cardId, ownerId: opponentId })),
      ];

      for (const boardCard of allBoards) {
        const card = await ctx.db.get(boardCard.cardId);
        if (!card) continue;

        const cardAbility = getCardAbility(card);
        if (!cardAbility) continue;

        for (const parsedEffect of cardAbility.effects) {
          // Check for "on_turn_end" trigger
          if (parsedEffect.trigger !== "on_turn_end") continue;

          const refreshedState = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
            .first();

          if (!refreshedState) continue;

          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            args.lobbyId,
            parsedEffect,
            boardCard.ownerId,
            boardCard.cardId,
            []
          );

          if (effectResult.success && gameState.gameId && gameState.turnNumber !== undefined) {
            const owner = await ctx.db.get(boardCard.ownerId);
            await recordEventHelper(ctx, {
              lobbyId: args.lobbyId,
              gameId: gameState.gameId,
              turnNumber: gameState.turnNumber,
              eventType: "effect_activated",
              playerId: boardCard.ownerId,
              playerUsername: owner?.username || "Unknown",
              description: `${card.name} end phase effect: ${effectResult.message}`,
              metadata: {
                cardId: boardCard.cardId,
                trigger: parsedEffect.trigger,
              },
            });
          }
        }
      }
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

    // 7.5.1. Clean up lingering effects that expire at end phase
    await cleanupLingeringEffects(ctx, gameState, "end", gameState.turnNumber);

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

    // ATOMIC: Combine all gameState updates into single patch to prevent race conditions
    // This ensures turn transition and board reset happen atomically
    await ctx.db.patch(gameState._id, {
      // Turn state updates
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
      // Board resets - clear attack/position flags for next turn
      [isHost ? "hostBoard" : "opponentBoard"]: resetPlayerBoard,
      [isHost ? "opponentBoard" : "hostBoard"]: resetOpponentBoard,
      // Reset normal summon flags
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
    });

    // Update lastMoveAt in lobby (for timeout tracking only - separate document, safe)
    await ctx.db.patch(args.lobbyId, {
      lastMoveAt: Date.now(),
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

    // Trigger turn_start webhooks
    await ctx.runMutation(api.gameplay.webhooks.triggerWebhooks, {
      event: "turn_start",
      gameId: lobby.gameId ?? "",
      lobbyId: args.lobbyId,
      turnNumber: nextTurnNumber,
      playerId: nextPlayerId,
      additionalData: {
        playerUsername: nextPlayer?.username || "Unknown",
      },
    });

    // 12.5. Reset OPT/HOPT effects for the new turn player
    // OPT resets at the start of the turn player's turn
    // HOPT expires based on the resetOnTurn field (player's next turn)
    // gameState was already updated with new turn state above
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId);
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

      // Check for "on_draw" trigger effects after drawing
      // Note: This is handled automatically by phaseManager's executePhaseTriggeredEffects
      // But for endTurn flow, we need to explicitly handle it here if needed
      // Currently this is already handled in phaseManager during the draw phase
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

    // Trigger turn_start webhooks
    await ctx.runMutation(api.gameplay.webhooks.triggerWebhooks, {
      event: "turn_start",
      gameId: args.gameId,
      lobbyId: gameState.lobbyId,
      turnNumber: nextTurnNumber,
      playerId: nextPlayerId,
      additionalData: {
        playerUsername: nextPlayer?.username || "AI Opponent",
      },
    });

    // 12.5. Reset OPT effects
    // gameState was already updated with new turn state above
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId);
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
