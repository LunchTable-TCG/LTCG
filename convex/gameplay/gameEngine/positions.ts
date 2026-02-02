/**
 * Game Engine - Positions Module
 *
 * Handles monster position changes:
 * - Change Position (Attack ↔ Defense)
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { recordEventHelper } from "../gameEvents";
import { validatePositionChange } from "../summonValidator";

/**
 * Change monster position (Attack ↔ Defense)
 *
 * Switches a face-up monster between Attack and Defense Position.
 * Can only be done once per monster per turn.
 * Cannot be done in Battle Phase.
 * Records: position_changed
 */
export const changePosition = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.NOT_FOUND_LOBBY);
    }

    // 3. Get game state (single source of truth for turn state)
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 4. Validate it's the current player's turn
    if (gameState.currentTurnPlayerId !== user.userId) {
      throw createError(ErrorCode.GAME_NOT_YOUR_TURN);
    }

    // 5. Validate position change
    const validation = await validatePositionChange(ctx, gameState, user.userId, args.cardId);

    if (!validation.valid) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, { reason: validation.error });
    }

    const isHost = user.userId === gameState.hostId;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 6. Find card on board and toggle position
    const cardIndex = board.findIndex((bc) => bc.cardId === args.cardId);
    if (cardIndex === -1) {
      throw createError(ErrorCode.GAME_CARD_NOT_ON_BOARD);
    }

    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }

    const boardCard = board[cardIndex];
    if (!boardCard) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }
    const currentPosition = boardCard.position;
    const newPosition = currentPosition === 1 ? -1 : 1; // Toggle: 1 (ATK) ↔ -1 (DEF)
    const newPositionName = newPosition === 1 ? "attack" : "defense";
    const oldPositionName = currentPosition === 1 ? "attack" : "defense";

    // 7. Update position (maintain face-up status, mark as changed)
    const newBoard = [...board];
    newBoard[cardIndex] = {
      ...boardCard,
      position: newPosition,
      hasChangedPosition: true, // Cannot change position again this turn
    };

    await ctx.db.patch(gameState._id, {
      [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
    });

    // 8. Record position_changed event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: gameState.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "position_changed",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} changed ${card.name} to ${newPositionName} position`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        previousPosition: oldPositionName,
        newPosition: newPositionName,
      },
    });

    // 9. Return success
    return {
      success: true,
      cardName: card.name,
      newPosition: newPositionName,
    };
  },
});
