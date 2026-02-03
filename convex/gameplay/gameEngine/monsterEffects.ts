/**
 * Game Engine - Monster Effects Module
 *
 * Handles manual activation of monster effects:
 * - Activate Ignition Effect (Main Phase only, with priority)
 * - Activate Quick Effect (Any time with priority)
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { getCardAbility, getRawJsonAbility } from "../../lib/abilityHelpers";
import { requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { validateGameActive } from "../../lib/gameValidation";
import { type ChainEffect, addToChainHelper } from "../chainResolver";
import { checkOPTRestriction } from "../effectSystem/optTracker";
import { recordEventHelper } from "../gameEvents";

/**
 * Get the effect to use for chain resolution.
 * Returns the JSON ability from the card.
 */
function getChainEffect(card: { ability?: unknown }): ChainEffect {
  const jsonAbility = getRawJsonAbility(card as any);
  return jsonAbility ?? { effects: [] };
}

/**
 * Activate a monster effect manually
 *
 * Allows players to manually activate ignition or quick effects from monsters on their field.
 * The effect is added to the chain and opponent can respond before resolution.
 *
 * Game rules:
 * - Ignition effects can only be activated during your Main Phase with priority
 * - Quick effects can be activated any time you have priority
 * - Must check OPT/HOPT restrictions
 * - Costs must be paid before activation
 * - Targets must be declared at activation
 * - Continuous effects cannot be manually activated (they're always on)
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Monster card on field to activate effect
 * @param effectIndex - Index of which effect to activate (if monster has multiple)
 * @param targets - Optional array of card IDs targeted by the effect
 * @returns Success status with effect name, chain link number, and priority status
 */
export const activateMonsterEffect = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.optional(v.number()),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
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

    // 4. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    const isHost = user.userId === gameState.hostId;
    const board = isHost ? gameState.hostBoard : gameState.opponentBoard;

    // 5. Validate monster is on field
    const monsterOnBoard = board.find((m) => m.cardId === args.cardId);
    if (!monsterOnBoard) {
      throw createError(ErrorCode.GAME_CARD_NOT_IN_ZONE, {
        reason: "Monster card is not on your field",
      });
    }

    // 6. Cannot activate face-down monster effects
    if (monsterOnBoard.isFaceDown) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cannot activate effects of face-down monsters",
      });
    }

    // 7. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND);
    }

    if (card.cardType !== "creature" && card.cardType !== "monster") {
      throw createError(ErrorCode.GAME_INVALID_CARD_TYPE, {
        reason: "Card is not a monster card",
      });
    }

    // 8. Parse ability to get effects
    const parsedAbility = getCardAbility(card);
    if (!parsedAbility || parsedAbility.effects.length === 0) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Monster has no effects",
      });
    }

    // 9. Get the specific effect to activate
    const effectIndex = args.effectIndex ?? 0;
    const effect = parsedAbility.effects[effectIndex];
    if (!effect) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: `Effect index ${effectIndex} does not exist`,
      });
    }

    // 10. Validate effect can be manually activated
    const activationType = effect.activationType ?? "trigger";

    // Continuous effects cannot be manually activated
    if (activationType === "continuous" || effect.continuous) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Continuous effects cannot be manually activated",
      });
    }

    // Auto-trigger effects (non-manual) cannot be manually activated
    if (effect.trigger !== "manual" && activationType === "trigger") {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "This effect can only be triggered automatically",
      });
    }

    // 11. Validate timing based on activation type
    const currentPhase = gameState.currentPhase;
    const isPlayerTurn = gameState.currentTurnPlayerId === user.userId;

    if (activationType === "ignition") {
      // Ignition effects: Only during your Main Phase with priority
      if (!isPlayerTurn) {
        throw createError(ErrorCode.GAME_NOT_YOUR_TURN, {
          reason: "Ignition effects can only be activated on your turn",
        });
      }
      if (currentPhase !== "main1" && currentPhase !== "main2") {
        throw createError(ErrorCode.GAME_INVALID_PHASE, {
          reason: "Ignition effects can only be activated during Main Phase",
        });
      }
    } else if (activationType === "quick") {
      // Quick effects: Any time with priority (for MVP, check if player has priority)
      // For MVP, we'll allow quick effects during any phase when you have priority
      // Full implementation would check chain state and priority windows
    }

    // 12. Check OPT/HOPT restrictions
    if (effect.isOPT || effect.isHOPT) {
      const canActivate = await checkOPTRestriction(
        ctx,
        gameState,
        args.cardId,
        card.name,
        effect.isHOPT ?? false
      );

      if (!canActivate.canActivate) {
        throw createError(ErrorCode.GAME_EFFECT_OPT_USED, {
          reason: canActivate.reason ?? "Effect already used this turn",
        });
      }
    }

    // 13. Record monster_effect_activated event
    await recordEventHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId: lobby.gameId ?? "",
      turnNumber: gameState.turnNumber ?? 0,
      eventType: "monster_effect_activated",
      playerId: user.userId,
      playerUsername: user.username,
      description: `${user.username} activated ${card.name}'s effect`,
      metadata: {
        cardId: args.cardId,
        cardName: card.name,
        effectIndex,
        targets: args.targets,
        activationType,
      },
    });

    // 14. Determine spell speed
    // Ignition effects are Spell Speed 1
    // Quick effects are Spell Speed 2
    const spellSpeed = activationType === "quick" ? 2 : 1;

    // 15. Get effect for chain
    const chainEffect = getChainEffect(card);

    // 16. Add to chain system
    const chainResult = await addToChainHelper(ctx, {
      lobbyId: args.lobbyId,
      cardId: args.cardId,
      playerId: user.userId,
      playerUsername: user.username,
      spellSpeed,
      effect: chainEffect,
      targets: args.targets,
      effectIndex,
    });

    // 17. Return success with chain status
    return {
      success: true,
      effectName: `${card.name}'s Effect`,
      activationType,
      chainStarted: true,
      chainLinkNumber: chainResult.chainLinkNumber,
      currentChainLength: chainResult.currentChainLength,
      priorityPassed: true,
    };
  },
});
