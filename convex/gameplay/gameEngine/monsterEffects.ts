/**
 * Game Engine - Monster Effects Module
 *
 * Handles manual activation of monster effects:
 * - Activate Ignition Effect (Main Phase only, with priority)
 * - Activate Quick Effect (Any time with priority)
 */

import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { internalMutation, mutation } from "../../functions";
import { getCardAbility, getRawJsonAbility } from "../../lib/abilityHelpers";
import { type AuthenticatedUser, getAuthForUser, requireAuthMutation } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { validateGameActive } from "../../lib/gameValidation";
import { type ChainEffect, addToChainHelper } from "../chainResolver";
import { executeCost, validateCost } from "../effectSystem/costValidator";
import { checkCanActivateOPT, markEffectUsed } from "../effectSystem/optTracker";
import type { CardWithAbility } from "../effectSystem/types";
import { recordEventHelper } from "../gameEvents";
import { scanFieldForTriggers } from "../triggerSystem";

/**
 * Get the effect to use for chain resolution.
 * Returns the JSON ability from the card.
 */
function getChainEffect(card: CardWithAbility): ChainEffect {
  const jsonAbility = getRawJsonAbility(card);
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
async function activateMonsterEffectHandler(
  ctx: MutationCtx,
  args: {
    lobbyId: Id<"gameLobbies">;
    cardId: Id<"cardDefinitions">;
    effectIndex?: number;
    targets?: Id<"cardDefinitions">[];
    costTargets?: Id<"cardDefinitions">[];
  },
  user: AuthenticatedUser
) {
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

  if (card.cardType !== "creature") {
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

  // 12. Check OPT/HOPT restrictions (BEFORE cost payment to avoid losing cost resources)
  if (effect.isOPT || effect.isHOPT) {
    const isHOPT = effect.isHOPT ?? false;
    const optCheck = checkCanActivateOPT(gameState, args.cardId, effectIndex, user.userId, isHOPT);

    if (!optCheck.canActivate) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: optCheck.reason ?? "Effect already used this turn",
      });
    }

    // Mark effect as used
    await markEffectUsed(ctx, gameState, args.cardId, effectIndex, user.userId, isHOPT);
  }

  // 13. Check and execute cost payment
  if (effect.cost) {
    // Validate cost can be paid
    const validation = await validateCost(ctx, gameState, user.userId, effect, args.costTargets);

    if (!validation.canPay) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.reason || "Cannot pay activation cost",
      });
    }

    // If cost requires selection but no targets provided, return error
    if (validation.requiresSelection && (!args.costTargets || args.costTargets.length === 0)) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Cost payment requires card selection",
        requiresSelection: true,
        availableTargets: validation.availableTargets,
        selectionPrompt: validation.selectionPrompt,
      });
    }

    // Execute cost payment
    const costResult = await executeCost(ctx, gameState, user.userId, effect, args.costTargets);

    if (!costResult.success) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: costResult.message,
      });
    }
  }

  // 14. Record monster_effect_activated event
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

  // 14b. Execute on_effect_activated triggers
  // Any card on field that has this trigger should activate
  const refreshedStateForEffectTrigger = await ctx.db
    .query("gameStates")
    .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
    .first();

  if (refreshedStateForEffectTrigger) {
    await scanFieldForTriggers(
      ctx,
      args.lobbyId,
      refreshedStateForEffectTrigger,
      "on_effect_activated",
      refreshedStateForEffectTrigger.turnNumber || 1
    );
  }

  // 15. Determine spell speed
  // Ignition effects are Spell Speed 1
  // Quick effects are Spell Speed 2
  const spellSpeed = activationType === "quick" ? 2 : 1;

  // 16. Get effect for chain
  const chainEffect = getChainEffect(card);

  // 17. Add to chain system
  const chainResult = await addToChainHelper(ctx, {
    lobbyId: args.lobbyId,
    cardId: args.cardId,
    playerId: user.userId,
    playerUsername: user.username,
    spellSpeed,
    effect: chainEffect,
    targets: args.targets,
  });

  // 18. Return success with chain status
  return {
    success: true,
    effectName: `${card.name}'s Effect`,
    activationType,
    chainStarted: true,
    chainLinkNumber: chainResult.chainLinkNumber,
    currentChainLength: chainResult.currentChainLength,
    priorityPassed: true,
  };
}

export const activateMonsterEffect = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.optional(v.number()),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
    costTargets: v.optional(v.array(v.id("cardDefinitions"))),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthMutation(ctx);
    return activateMonsterEffectHandler(ctx, args, user);
  },
});

export const activateMonsterEffectInternal = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.optional(v.number()),
    targets: v.optional(v.array(v.id("cardDefinitions"))),
    costTargets: v.optional(v.array(v.id("cardDefinitions"))),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId, ...gameArgs } = args;
    const user = await getAuthForUser(ctx, userId);
    return activateMonsterEffectHandler(ctx, gameArgs, user);
  },
});
