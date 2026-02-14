/**
 * Token Generation Executor
 *
 * Handles the generation of monster tokens on the field.
 * Tokens are temporary monsters that only exist on the field and cannot
 * exist in any other zone (hand, deck, graveyard, etc.).
 */

import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import { logger } from "../../../../lib/debug";
import { recordEventHelper } from "../../../gameEvents";
import type { ParsedEffect } from "../../types";

/**
 * Execute token generation effect
 *
 * Creates token monsters on the field based on effect parameters.
 * Tokens are special board cards that don't reference real cardDefinitions.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Game lobby ID
 * @param effect - Effect with token generation parameters
 * @param playerId - Player generating the token
 * @param sourceCardId - Card that generated the token
 * @returns Effect result
 */
export async function executeGenerateToken(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  playerId: Id<"users">,
  sourceCardId: Id<"cardDefinitions">
) {
  const isHost = playerId === gameState.hostId;
  const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

  // Get token parameters from effect
  // @ts-expect-error - tokenData is added to ParsedEffect via JsonEffect extension
  const tokenData = effect.tokenData;

  if (!tokenData) {
    logger.error("generateToken effect missing tokenData", undefined, { sourceCardId });
    return {
      success: false,
      message: "Token generation failed: missing token data",
    };
  }

  const {
    name = "Token",
    atk = 0,
    def = 0,
    level = 1,
    attribute = "red",
    type = "Beast",
    count = 1,
    position = "attack",
  } = tokenData;

  // Check board space (max 3 stereotype zones)
  const availableSpace = 3 - board.length;
  const tokensToGenerate = Math.min(count, availableSpace);

  if (tokensToGenerate === 0) {
    return {
      success: false,
      message: "Cannot generate token: Monster zone is full",
    };
  }

  // Get lobby for event recording
  const lobby = await ctx.db.get(lobbyId);
  if (!lobby?.gameId) {
    return {
      success: false,
      message: "Lobby not found",
    };
  }

  const user = await ctx.db.get(playerId);
  const turnNumber = gameState.turnNumber ?? 0;

  // Generate unique token IDs (use source card ID + timestamp + index for uniqueness)
  const generatedTokens = [];
  const timestamp = Date.now();

  for (let i = 0; i < tokensToGenerate; i++) {
    // Create a fake ID for the token (using source card ID as base)
    const tokenId = `${sourceCardId}_token_${timestamp}_${i}` as Id<"cardDefinitions">;

    // Create token board card
    const tokenCard = {
      cardId: tokenId,
      position: position === "attack" ? 1 : -1,
      attack: atk,
      defense: def,
      hasAttacked: true, // Tokens cannot attack the turn they're summoned
      isFaceDown: false, // Tokens are always face-up
      hasChangedPosition: false,
      turnSummoned: turnNumber,
      isToken: true,
      tokenData: {
        name,
        atk,
        def,
        level,
        attribute,
        type,
      },
    };

    generatedTokens.push(tokenCard);
  }

  // Add tokens to board
  const newBoard = [...board, ...generatedTokens];
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
  });

  // Record token generation event
  const sourceCard = await ctx.db.get(sourceCardId);
  await recordEventHelper(ctx, {
    lobbyId,
    gameId: lobby.gameId,
    turnNumber,
    eventType: "effect_activated",
    playerId,
    playerUsername: user?.username || "Unknown",
    description: `${sourceCard?.name || "Card"} generated ${tokensToGenerate} ${name}(s) (${atk}/${def})`,
    metadata: {
      cardId: sourceCardId,
      effectType: "generateToken",
      tokenName: name,
      tokenCount: tokensToGenerate,
      tokenAtk: atk,
      tokenDef: def,
    },
  });

  // Trigger on_summon effects for each token
  // Note: Tokens don't have cardDefinitions, so they won't have on_summon effects
  // But we still record the summon event for consistency
  for (let i = 0; i < tokensToGenerate; i++) {
    await recordEventHelper(ctx, {
      lobbyId,
      gameId: lobby.gameId,
      turnNumber,
      eventType: "normal_summon",
      playerId,
      playerUsername: user?.username || "Unknown",
      description: `${name} token summoned in ${position} position`,
      metadata: {
        isToken: true,
        tokenName: name,
        position,
        attack: atk,
        defense: def,
      },
    });
  }

  logger.info("Tokens generated", {
    playerId,
    sourceCardId,
    tokenName: name,
    count: tokensToGenerate,
  });

  return {
    success: true,
    message: `Generated ${tokensToGenerate} ${name} token(s) (ATK ${atk}/DEF ${def}) in ${position} position`,
  };
}
