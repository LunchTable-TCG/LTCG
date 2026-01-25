import type { MutationCtx } from "../../_generated/server";
import type { Id, Doc } from "../../_generated/dataModel";
// Import the ParsedEffect type from the parent module
import type { ParsedEffect } from "../types";

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
      creature: "monster",
      spell: "spell",
      trap: "trap",
      equipment: "spell", // Treat equipment as spell for negation purposes
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

  // In a full implementation, this would:
  // 1. Check if target card is currently activating (on chain)
  // 2. Remove it from the chain
  // 3. Send to GY if activation negation
  // 4. Record negate event

  // For now, return success with message indicating what was negated
  return {
    success: true,
    message: `Negated ${negationType} of ${targetCard.name}`,
  };
}
