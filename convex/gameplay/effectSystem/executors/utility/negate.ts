import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
// Import the ParsedEffect type from the parent module
import type { ParsedEffect } from "../../types";

/**
 * Execute Negate effect - Negate activation or effect of a card
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param targetCardId - Card being negated
 * @param effect - Parsed negate effect with condition (activation or effect)
 * @returns Success status and message
 *
 * Note: Full negation requires chain system implementation.
 * For now, this provides basic negation detection and parsing.
 * In a complete implementation:
 * - Negation would be added to the chain
 * - The target activation would be negated before resolving
 * - Negated cards would be sent to GY (for activation negation)
 */
export async function executeNegate(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  targetCardId: Id<"cardDefinitions">,
  effect: ParsedEffect
): Promise<{ success: boolean; message: string }> {
  // Get target card
  const targetCard = await ctx.db.get(targetCardId);
  if (!targetCard) {
    return { success: false, message: "Target card not found" };
  }

  // Validate target type matches effect
  if (effect.targetType && effect.targetType !== "any") {
    const cardTypeMap: Record<string, string> = {
      // Backward compatibility for old card types
      creature: "stereotype",
      monster: "stereotype",
      equipment: "class",
      // Current card types
      stereotype: "stereotype",
      spell: "spell",
      trap: "trap",
      class: "class",
    };
    const cardGameType = cardTypeMap[targetCard.cardType] || "unknown";

    if (cardGameType !== effect.targetType) {
      return {
        success: false,
        message: `Can only negate ${effect.targetType} cards (target is ${cardGameType})`,
      };
    }
  }

  // Determine negation type
  const isActivationNegate = effect.condition === "activation";
  const negationType = isActivationNegate ? "activation" : "effect";

  // Check if target card is on the chain
  const currentChain = gameState.currentChain || [];
  const targetChainIndex = currentChain.findIndex((link) => link.cardId === targetCardId);

  if (targetChainIndex === -1) {
    return {
      success: false,
      message: `${targetCard.name} is not currently on the chain`,
    };
  }

  // Mark the chain link as negated
  const updatedChain = [...currentChain];
  const chainLink = updatedChain[targetChainIndex];
  if (!chainLink) {
    return { success: false, message: "Chain link not found" };
  }
  updatedChain[targetChainIndex] = {
    ...chainLink,
    negated: true,
  };

  // Update game state with negated chain
  await ctx.db.patch(gameState._id, {
    currentChain: updatedChain,
  });

  return {
    success: true,
    message: `Negated ${negationType} of ${targetCard.name}`,
  };
}
