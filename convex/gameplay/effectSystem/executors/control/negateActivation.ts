/**
 * Activation Negation Executor
 *
 * Handles the "negateActivation" effect type which negates the activation
 * of a card on the chain (typically used by Counter Traps).
 *
 * Key differences from regular negation:
 * - Activation Negation: Card activation is negated, effect never resolves
 * - Effect Negation: Card activates, but effect is negated
 *
 * This executor marks the target chain link as negated and optionally
 * destroys the card after negation.
 */

import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import type { EffectResult, ParsedEffect } from "../../types";

/**
 * Execute Activation Negation effect
 *
 * Negates the activation of a card on the current chain. The target card's
 * effect will not resolve when the chain resolves in reverse order.
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param lobbyId - Lobby ID for event recording
 * @param effect - Parsed negation effect
 * @param playerId - Player activating the negation
 * @param targetCardId - Optional specific target (defaults to most recent chain link)
 * @returns Effect result with success status and message
 */
export async function executeNegateActivation(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  _lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  _playerId: Id<"users">,
  targetCardId?: Id<"cardDefinitions">
): Promise<EffectResult> {
  // Get current chain
  const currentChain = gameState.currentChain || [];

  if (currentChain.length === 0) {
    return {
      success: false,
      message: "No chain to negate",
    };
  }

  // Determine target chain link
  let targetChainIndex: number;

  if (targetCardId) {
    // Specific target provided
    targetChainIndex = currentChain.findIndex((link) => link.cardId === targetCardId);
    if (targetChainIndex === -1) {
      const targetCard = await ctx.db.get(targetCardId);
      return {
        success: false,
        message: `${targetCard?.name || "Target card"} is not on the chain`,
      };
    }
  } else {
    // No specific target - negate most recent activation (last chain link)
    targetChainIndex = currentChain.length - 1;
  }

  const chainLink = currentChain[targetChainIndex];
  if (!chainLink) {
    return {
      success: false,
      message: "Invalid chain link",
    };
  }

  // Get target card details
  const targetCard = await ctx.db.get(chainLink.cardId);
  if (!targetCard) {
    return {
      success: false,
      message: "Target card not found",
    };
  }

  // Validate target type if specified in effect
  // Access through any type since ParsedEffect may not have this field yet
  const negateTargetType = (effect as any).negateTargetType;
  if (negateTargetType && negateTargetType !== "any") {
    const cardTypeMap: Record<string, string> = {
      creature: "monster",
      spell: "spell",
      trap: "trap",
    };
    const targetGameType = cardTypeMap[targetCard.cardType] || targetCard.cardType;

    if (targetGameType !== negateTargetType) {
      return {
        success: false,
        message: `Can only negate ${negateTargetType} activations (target is ${targetGameType})`,
      };
    }
  }

  // Mark the chain link as negated
  const updatedChain = [...currentChain];
  const negatedLink = {
    ...chainLink,
    negated: true,
  };
  // Add isNegated flag using type assertion
  (negatedLink as any).isNegated = true;
  updatedChain[targetChainIndex] = negatedLink;

  // Update game state with negated chain
  await ctx.db.patch(gameState._id, {
    currentChain: updatedChain,
  });

  // Determine if card should be destroyed after negation
  // Access through any type since ParsedEffect may not have these fields yet
  const shouldDestroy = (effect as any).destroyAfterNegation || (effect as any).negateAndDestroy;

  // Build result message
  let message = `Negated activation of ${targetCard.name}`;
  if (shouldDestroy) {
    message += " and will destroy it";
  }

  return {
    success: true,
    message,
  };
}
