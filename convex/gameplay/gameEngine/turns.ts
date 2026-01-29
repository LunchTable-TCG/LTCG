/**
 * Game Engine - Turns Module
 *
 * Handles turn management:
 * - End Turn
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import {
  clearTemporaryModifiers,
  drawCards,
} from "../../lib/gameHelpers";
import { resetOPTEffects } from "../effectSystem/optTracker";
import { recordEventHelper } from "../gameEvents";
import { checkStateBasedActions, checkDeckOutCondition } from "./stateBasedActions";

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

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Validate it's the current player's turn
    if (lobby.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 4. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
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

    // 6. Trigger end-of-turn effects (future implementation)

    // 7. Enforce hand size limit via state-based actions (6 cards max)
    // SBA will handle discarding excess cards
    const sbaResult = await checkStateBasedActions(ctx, args.lobbyId, {
      skipHandLimit: false, // Enforce hand limit at end of turn
      turnNumber: lobby.turnNumber,
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

    // Reset hasAttacked for all monsters
    const resetPlayerBoard = playerBoard.map((card) => ({
      ...card,
      hasAttacked: false,
    }));

    const resetOpponentBoard = opponentBoard.map((card) => ({
      ...card,
      hasAttacked: false,
    }));

    // 9. Record turn_end event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: lobby.turnNumber ?? 0,
      eventType: "turn_end",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username}'s turn ended`,
      metadata: {
        turnNumber: lobby.turnNumber ?? 0,
      },
    });

    // 10. Switch to next player
    const nextPlayerId = isHost ? gameState.opponentId : gameState.hostId;
    const nextTurnNumber = (lobby.turnNumber ?? 0) + 1;

    await ctx.db.patch(args.lobbyId, {
      currentTurnPlayerId: nextPlayerId,
      turnNumber: nextTurnNumber,
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
    // We need to refresh gameState first since turnNumber was updated in lobby but not gameState yet
    const gameStateForOPT = await ctx.db.get(gameState._id);
    if (gameStateForOPT) {
      // Update the turnNumber in gameState to match lobby before resetting OPT
      await ctx.db.patch(gameStateForOPT._id, {
        currentTurnPlayerId: nextPlayerId,
        turnNumber: nextTurnNumber,
      });
      // Fetch again with updated turnNumber for proper HOPT expiry calculation
      const updatedGameState = await ctx.db.get(gameStateForOPT._id);
      if (updatedGameState) {
        await resetOPTEffects(ctx, updatedGameState, nextPlayerId);
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
