/**
 * Vice Counter System
 *
 * Implements the Vice counter mechanic for LunchTable TCG:
 * - Cards accumulate Vice counters from card effects
 * - When viceCounters >= 3 (BREAKDOWN_THRESHOLD), the card breaks down
 * - Breakdowns move cards from board to graveyard and credit the opponent
 * - When a player causes 3 breakdowns (MAX_BREAKDOWNS_WIN), they win
 *
 * This system runs as part of state-based actions and effect resolution.
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { GAME_CONFIG } from "@ltcg/core";
import { logger } from "../../lib/debug";
import { recordEventHelper } from "../gameEvents";

/**
 * Add a Vice counter to a card on the board
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Lobby ID for event recording
 * @param cardId - Card to receive the Vice counter
 * @param ownerId - Owner of the card
 * @param isHost - Whether the owner is the host player
 * @returns Whether a breakdown was triggered (viceCounters >= BREAKDOWN_THRESHOLD)
 */
export async function addViceCounter(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  cardId: Id<"cardDefinitions">,
  ownerId: Id<"users">,
  isHost: boolean
): Promise<boolean> {
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
  const cardIndex = board.findIndex((bc) => bc.cardId === cardId);

  if (cardIndex === -1) {
    logger.warn("Card not found on board when adding Vice counter", { cardId });
    return false;
  }

  const card = board[cardIndex];
  if (!card) {
    return false;
  }

  // Increment Vice counters
  const newViceCount = (card.viceCounters || 0) + 1;
  const updatedCard = {
    ...card,
    viceCounters: newViceCount,
  };

  const updatedBoard = [...board];
  updatedBoard[cardIndex] = updatedCard;

  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: updatedBoard,
  });

  logger.debug("Vice counter added to card", {
    cardId,
    newViceCount,
    breakdownTriggered: newViceCount >= GAME_CONFIG.VICE.BREAKDOWN_THRESHOLD,
  });

  // Return whether breakdown threshold was reached
  return newViceCount >= GAME_CONFIG.VICE.BREAKDOWN_THRESHOLD;
}

/**
 * Check all stereotypes on both boards for breakdown conditions
 *
 * Cards with viceCounters >= BREAKDOWN_THRESHOLD are moved to graveyard.
 * The opponent of the card's owner gets credit for causing the breakdown.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Lobby ID for event recording
 * @param gameId - Game ID for event recording
 * @param turnNumber - Current turn number
 * @returns Result with breakdown count and whether game ended
 */
export async function checkBreakdowns(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ changed: boolean; breakdowns: number; gameEnded: boolean; winnerId?: Id<"users"> }> {
  const result = {
    changed: false,
    breakdowns: 0,
    gameEnded: false,
    winnerId: undefined as Id<"users"> | undefined,
  };

  // Check host board for breakdowns
  const hostBreakdowns: Id<"cardDefinitions">[] = [];
  for (const boardCard of gameState.hostBoard) {
    if ((boardCard.viceCounters || 0) >= GAME_CONFIG.VICE.BREAKDOWN_THRESHOLD) {
      hostBreakdowns.push(boardCard.cardId);
    }
  }

  // Check opponent board for breakdowns
  const opponentBreakdowns: Id<"cardDefinitions">[] = [];
  for (const boardCard of gameState.opponentBoard) {
    if ((boardCard.viceCounters || 0) >= GAME_CONFIG.VICE.BREAKDOWN_THRESHOLD) {
      opponentBreakdowns.push(boardCard.cardId);
    }
  }

  // Process host breakdowns (opponent gets credit)
  if (hostBreakdowns.length > 0) {
    const freshState = await ctx.db.get(gameState._id);
    if (!freshState) {
      return result;
    }

    const newHostBoard = freshState.hostBoard.filter(
      (bc) => !hostBreakdowns.includes(bc.cardId)
    );
    const newHostGraveyard = [...freshState.hostGraveyard, ...hostBreakdowns];
    const newOpponentBreakdownsCaused = freshState.opponentBreakdownsCaused + hostBreakdowns.length;

    await ctx.db.patch(freshState._id, {
      hostBoard: newHostBoard,
      hostGraveyard: newHostGraveyard,
      opponentBreakdownsCaused: newOpponentBreakdownsCaused,
    });

    // Record events for each breakdown
    const host = await ctx.db.get(gameState.hostId);
    const opponent = await ctx.db.get(gameState.opponentId);

    for (const cardId of hostBreakdowns) {
      const card = await ctx.db.get(cardId);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_to_graveyard",
        playerId: gameState.hostId,
        playerUsername: host?.username || "Unknown",
        description: `${card?.name || "Stereotype"} suffered a breakdown!`,
        metadata: {
          cardId,
          cardName: card?.name,
          reason: "vice_breakdown",
          breakdownsCaused: newOpponentBreakdownsCaused,
        },
      });
    }

    logger.info("Host stereotypes broke down", {
      count: hostBreakdowns.length,
      opponentBreakdownsCaused: newOpponentBreakdownsCaused,
    });

    result.changed = true;
    result.breakdowns += hostBreakdowns.length;
  }

  // Process opponent breakdowns (host gets credit)
  if (opponentBreakdowns.length > 0) {
    const freshState = await ctx.db.get(gameState._id);
    if (!freshState) {
      return result;
    }

    const newOpponentBoard = freshState.opponentBoard.filter(
      (bc) => !opponentBreakdowns.includes(bc.cardId)
    );
    const newOpponentGraveyard = [...freshState.opponentGraveyard, ...opponentBreakdowns];
    const newHostBreakdownsCaused = freshState.hostBreakdownsCaused + opponentBreakdowns.length;

    await ctx.db.patch(freshState._id, {
      opponentBoard: newOpponentBoard,
      opponentGraveyard: newOpponentGraveyard,
      hostBreakdownsCaused: newHostBreakdownsCaused,
    });

    // Record events for each breakdown
    const host = await ctx.db.get(gameState.hostId);
    const opponent = await ctx.db.get(gameState.opponentId);

    for (const cardId of opponentBreakdowns) {
      const card = await ctx.db.get(cardId);
      await recordEventHelper(ctx, {
        lobbyId,
        gameId,
        turnNumber,
        eventType: "card_to_graveyard",
        playerId: gameState.opponentId,
        playerUsername: opponent?.username || "Unknown",
        description: `${card?.name || "Stereotype"} suffered a breakdown!`,
        metadata: {
          cardId,
          cardName: card?.name,
          reason: "vice_breakdown",
          breakdownsCaused: newHostBreakdownsCaused,
        },
      });
    }

    logger.info("Opponent stereotypes broke down", {
      count: opponentBreakdowns.length,
      hostBreakdownsCaused: newHostBreakdownsCaused,
    });

    result.changed = true;
    result.breakdowns += opponentBreakdowns.length;
  }

  // Check win condition if any breakdowns occurred
  if (result.breakdowns > 0) {
    const winCheck = await checkBreakdownWinCondition(ctx, gameState, lobbyId, gameId, turnNumber);
    if (winCheck.gameEnded) {
      result.gameEnded = true;
      result.winnerId = winCheck.winnerId;
    }
  }

  return result;
}

/**
 * Check if a player has won by causing 3 breakdowns
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Lobby ID for event recording
 * @param gameId - Game ID for event recording
 * @param turnNumber - Current turn number
 * @returns Whether game ended and winner ID
 */
export async function checkBreakdownWinCondition(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  gameId: string,
  turnNumber: number
): Promise<{ gameEnded: boolean; winnerId?: Id<"users"> }> {
  // Refresh game state to get latest breakdown counts
  const freshState = await ctx.db.get(gameState._id);
  if (!freshState) {
    return { gameEnded: false };
  }

  const lobby = await ctx.db.get(lobbyId);
  if (!lobby) {
    return { gameEnded: false };
  }

  // Check if host caused 3 breakdowns (host wins)
  if (freshState.hostBreakdownsCaused >= GAME_CONFIG.VICE.MAX_BREAKDOWNS_WIN) {
    const winner = await ctx.db.get(freshState.hostId);
    const loser = await ctx.db.get(freshState.opponentId);

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "game_end",
      playerId: freshState.hostId,
      playerUsername: "System",
      description: `${winner?.username || "Host"} wins by causing ${GAME_CONFIG.VICE.MAX_BREAKDOWNS_WIN} breakdowns!`,
      metadata: {
        winnerId: freshState.hostId,
        winnerUsername: winner?.username,
        loserId: freshState.opponentId,
        loserUsername: loser?.username,
        winCondition: "breakdown",
        breakdownsCaused: freshState.hostBreakdownsCaused,
      },
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: freshState.hostId,
    });

    logger.info("Game ended by breakdown win condition (host wins)", {
      lobbyId,
      winnerId: freshState.hostId,
      breakdownsCaused: freshState.hostBreakdownsCaused,
    });

    return { gameEnded: true, winnerId: freshState.hostId };
  }

  // Check if opponent caused 3 breakdowns (opponent wins)
  if (freshState.opponentBreakdownsCaused >= GAME_CONFIG.VICE.MAX_BREAKDOWNS_WIN) {
    const winner = await ctx.db.get(freshState.opponentId);
    const loser = await ctx.db.get(freshState.hostId);

    await recordEventHelper(ctx, {
      lobbyId,
      gameId,
      turnNumber,
      eventType: "game_end",
      playerId: freshState.opponentId,
      playerUsername: "System",
      description: `${winner?.username || "Opponent"} wins by causing ${GAME_CONFIG.VICE.MAX_BREAKDOWNS_WIN} breakdowns!`,
      metadata: {
        winnerId: freshState.opponentId,
        winnerUsername: winner?.username,
        loserId: freshState.hostId,
        loserUsername: loser?.username,
        winCondition: "breakdown",
        breakdownsCaused: freshState.opponentBreakdownsCaused,
      },
    });

    // Update lobby status
    await ctx.db.patch(lobbyId, {
      status: "completed",
      winnerId: freshState.opponentId,
    });

    logger.info("Game ended by breakdown win condition (opponent wins)", {
      lobbyId,
      winnerId: freshState.opponentId,
      breakdownsCaused: freshState.opponentBreakdownsCaused,
    });

    return { gameEnded: true, winnerId: freshState.opponentId };
  }

  return { gameEnded: false };
}

/**
 * Reset all Vice counters on a board
 *
 * Utility function used when cards enter/leave the field or effects reset counters.
 * Returns a new board array with all viceCounters set to 0.
 *
 * @param board - Board array to reset
 * @returns New board array with all viceCounters = 0
 */
export function resetViceCounters(
  board: Doc<"gameStates">["hostBoard"]
): Doc<"gameStates">["hostBoard"] {
  return board.map((bc) => ({
    ...bc,
    viceCounters: 0,
  }));
}
