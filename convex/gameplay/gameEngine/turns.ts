/**
 * Game Engine - Turns Module
 *
 * Handles turn management:
 * - End Turn
 */

import { v } from "convex/values";
import * as generatedApi from "../../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
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

    // 5. Validate in Main Phase or End Phase (can end turn from either)
    if (gameState.currentPhase !== "main" && gameState.currentPhase !== "end") {
      throw createError(ErrorCode.GAME_INVALID_PHASE, {
        reason: "Must be in Main Phase or End Phase to end turn",
      });
    }

    // 5.5. Cannot end turn during an active chain or response window
    if (gameState.currentChain && gameState.currentChain.length > 0) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot end turn while a chain is resolving",
      });
    }
    if (gameState.responseWindow) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot end turn while a response window is active",
      });
    }

    // If still in Main Phase, advance to End Phase first
    if (gameState.currentPhase === "main") {
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
        ...playerBoard.map((bc) => ({ cardId: bc.cardId as Id<"cardDefinitions">, ownerId: user.userId })),
        ...opponentBoard.map((bc) => ({ cardId: bc.cardId as Id<"cardDefinitions">, ownerId: opponentId as Id<"users"> })),
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
      // Clear SEGOC queue and optional trigger state from previous turn
      segocQueue: [],
      pendingOptionalTriggers: [],
      skippedOptionalTriggers: [],
      // Defensive cleanup: clear any stale response/chain/pending state
      responseWindow: undefined,
      currentPriorityPlayer: undefined,
      currentChain: undefined,
      pendingAction: undefined,
    });

    // Update lastMoveAt in lobby (for timeout tracking only - separate document, safe)
    await ctx.db.patch(args.lobbyId, {
      lastMoveAt: Date.now(),
    });

    // 12. Record turn_start event for new turn
    const nextPlayer = await ctx.db.get(nextPlayerId as Id<"users">);
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: nextTurnNumber,
      eventType: "turn_start",
      playerId: nextPlayerId as Id<"users">,
      playerUsername: nextPlayer?.username || "Unknown",
      description: `${nextPlayer?.username || "Unknown"}'s turn ${nextTurnNumber}`,
      metadata: {
        turnNumber: nextTurnNumber,
      },
    });

    // Trigger turn_start webhooks
    await ctx.runMutation(internalAny.gameplay.webhooks.triggerWebhooks, {
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
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId as Id<"users">);
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
      const drawnCards = await drawCards(ctx, refreshedGameState, nextPlayerId as Id<"users">, 1);
      console.log(
        `Turn ${nextTurnNumber}: ${nextPlayer?.username} drew ${drawnCards.length} card(s)`
      );

      // Check for deck-out condition (player needs to draw but deck is empty)
      if (drawnCards.length === 0) {
        const deckOutResult = await checkDeckOutCondition(
          ctx,
          args.lobbyId,
          nextPlayerId as Id<"users">,
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

    // Auto-advance through Draw Phase → Main Phase
    await ctx.db.patch(refreshedGameState._id, {
      currentPhase: "main",
    });

    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: nextTurnNumber,
      eventType: "phase_changed",
      playerId: nextPlayerId as Id<"users">,
      playerUsername: nextPlayer?.username || "Unknown",
      description: `${nextPlayer?.username || "Unknown"} entered Main Phase`,
      metadata: {
        previousPhase: "draw",
        newPhase: "main",
        cardDrawn: !shouldSkipDraw,
      },
    });

    // 15. Auto-trigger AI turn in story mode
    if (lobby.mode === "story" && nextPlayerId === gameState.opponentId && lobby.gameId) {
      await ctx.scheduler.runAfter(500, internalAny.gameplay.ai.aiTurn.executeAITurnInternal, {
        gameId: lobby.gameId,
      });
    }

    // 16. Return success
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
      // Soft return — game may have ended between scheduling and execution
      console.warn("endTurnInternal: game state not found, skipping", { gameId: args.gameId });
      return { success: false, message: "Game not found" };
    }

    // 2. Get lobby (for timeout tracking)
    const lobby = await ctx.db.get(gameState.lobbyId);
    if (!lobby) {
      console.warn("endTurnInternal: lobby not found, skipping");
      return { success: false, message: "Lobby not found" };
    }

    // 3. Validate it's the current player's turn (using gameState as source of truth)
    // Soft return — turn may have already been ended by watchdog or duplicate scheduling
    if (gameState.currentTurnPlayerId !== args.userId) {
      console.warn("endTurnInternal: not this player's turn, skipping (likely duplicate call)");
      return { success: false, message: "Not this player's turn" };
    }

    // 4. Get user info
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.warn("endTurnInternal: user not found, skipping");
      return { success: false, message: "User not found" };
    }

    // 5. For story mode, allow ending from main phase
    // Auto-advance to end phase if needed
    if (gameState.currentPhase === "main") {
      await ctx.db.patch(gameState._id, {
        currentPhase: "end",
      });
    }

    const isHost = args.userId === gameState.hostId;

    // 5.5. Trigger end-of-turn effects (on_turn_end / on_end_phase)
    // Mirror of endTurn step 6 — required for story mode AI turns
    {
      const playerBoard = isHost ? gameState.hostBoard : gameState.opponentBoard;
      const opponentBoard = isHost ? gameState.opponentBoard : gameState.hostBoard;
      const opponentId = isHost ? gameState.opponentId : gameState.hostId;

      interface BoardCardWithOwner {
        cardId: Id<"cardDefinitions">;
        ownerId: Id<"users">;
      }

      const allBoards: BoardCardWithOwner[] = [
        ...playerBoard.map((bc) => ({ cardId: bc.cardId as Id<"cardDefinitions">, ownerId: args.userId })),
        ...opponentBoard.map((bc) => ({ cardId: bc.cardId as Id<"cardDefinitions">, ownerId: opponentId as Id<"users"> })),
      ];

      for (const boardCard of allBoards) {
        const card = await ctx.db.get(boardCard.cardId);
        if (!card) continue;

        const cardAbility = getCardAbility(card);
        if (!cardAbility) continue;

        for (const parsedEffect of cardAbility.effects) {
          if (parsedEffect.trigger !== "on_turn_end") continue;

          const refreshedState = await ctx.db
            .query("gameStates")
            .withIndex("by_lobby", (q) => q.eq("lobbyId", gameState.lobbyId))
            .first();

          if (!refreshedState) continue;

          const effectResult = await executeEffect(
            ctx,
            refreshedState,
            gameState.lobbyId,
            parsedEffect,
            boardCard.ownerId,
            boardCard.cardId,
            []
          );

          if (effectResult.success && gameState.gameId && gameState.turnNumber !== undefined) {
            const owner = await ctx.db.get(boardCard.ownerId);
            await recordEventHelper(ctx, {
              lobbyId: gameState.lobbyId,
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

    // 7.5. Clean up lingering effects that expire at end phase
    await cleanupLingeringEffects(ctx, gameState, "end", gameState.turnNumber);

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

    // ATOMIC: Combine all gameState updates into single patch (mirrors endTurn)
    await ctx.db.patch(gameState._id, {
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
      [isHost ? "hostBoard" : "opponentBoard"]: resetPlayerBoard,
      [isHost ? "opponentBoard" : "hostBoard"]: resetOpponentBoard,
      hostNormalSummonedThisTurn: false,
      opponentNormalSummonedThisTurn: false,
      segocQueue: [],
      pendingOptionalTriggers: [],
      skippedOptionalTriggers: [],
    });

    // Update lastMoveAt in lobby (for timeout tracking only — separate document, safe)
    await ctx.db.patch(gameState.lobbyId, {
      lastMoveAt: Date.now(),
    });

    // 12. Record turn_start event for new turn
    const nextPlayer = await ctx.db.get(nextPlayerId as Id<"users">);
    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: nextTurnNumber,
      eventType: "turn_start",
      playerId: nextPlayerId as Id<"users">,
      playerUsername: nextPlayer?.username || "AI Opponent",
      description: `${nextPlayer?.username || "AI Opponent"}'s turn ${nextTurnNumber}`,
      metadata: {
        turnNumber: nextTurnNumber,
      },
    });

    // Trigger turn_start webhooks
    await ctx.runMutation(internalAny.gameplay.webhooks.triggerWebhooks, {
      event: "turn_start",
      gameId: args.gameId,
      lobbyId: gameState.lobbyId,
      turnNumber: nextTurnNumber,
      playerId: nextPlayerId as Id<"users">,
      additionalData: {
        playerUsername: nextPlayer?.username || "AI Opponent",
      },
    });

    // 12.5. Reset OPT effects
    // gameState was already updated with new turn state above
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      await resetOPTEffects(ctx, gameStateForOPT, nextPlayerId as Id<"users">);
    }

    // 13. Auto-execute Draw Phase and advance to Main Phase 1
    const shouldSkipDraw = nextTurnNumber === 1 && nextPlayerId === lobby.hostId;
    const refreshedGameState = await ctx.db.get(gameState._id);
    if (!refreshedGameState) {
      console.warn("endTurnInternal: game state disappeared after turn transition");
      return { success: false, message: "Game state lost after turn transition" };
    }

    if (!shouldSkipDraw) {
      const drawnCards = await drawCards(ctx, refreshedGameState, nextPlayerId as Id<"users">, 1);

      if (drawnCards.length === 0) {
        const deckOutResult = await checkDeckOutCondition(
          ctx,
          gameState.lobbyId,
          nextPlayerId as Id<"users">,
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

    // Auto-advance through Draw Phase → Main Phase
    await ctx.db.patch(refreshedGameState._id, {
      currentPhase: "main",
    });

    await recordEventHelper(ctx, {
      lobbyId: gameState.lobbyId,
      gameId: args.gameId,
      turnNumber: nextTurnNumber,
      eventType: "phase_changed",
      playerId: nextPlayerId as Id<"users">,
      playerUsername: nextPlayer?.username || "AI Opponent",
      description: `${nextPlayer?.username || "AI Opponent"} entered Main Phase`,
      metadata: {
        previousPhase: "draw",
        newPhase: "main",
        cardDrawn: !shouldSkipDraw,
      },
    });

    // Auto-trigger AI turn in story mode
    if (lobby.mode === "story" && nextPlayerId === gameState.opponentId && args.gameId) {
      await ctx.scheduler.runAfter(500, internalAny.gameplay.ai.aiTurn.executeAITurnInternal, {
        gameId: args.gameId,
      });
    }

    return {
      success: true,
      newTurnPlayer: nextPlayer?.username || "AI Opponent",
      newTurnNumber: nextTurnNumber,
    };
  },
});
