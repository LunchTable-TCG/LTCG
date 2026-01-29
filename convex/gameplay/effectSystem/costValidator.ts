/**
 * Cost Validator & Executor
 *
 * Validates that a player can pay the cost of an effect before execution,
 * and executes the cost payment.
 *
 * Cost Types:
 * - discard: Discard X cards from hand
 * - pay_lp: Pay X life points
 * - tribute: Tribute X monsters from field
 * - banish: Banish X cards from graveyard/field
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { logger } from "../../lib/debug";
import type { ParsedEffect } from "./types";

export interface CostValidationResult {
  canPay: boolean;
  reason?: string;
  // For costs requiring selection (tribute, targeted discard)
  requiresSelection?: boolean;
  selectionSource?: "hand" | "board" | "graveyard";
  availableTargets?: Array<{
    cardId: Id<"cardDefinitions">;
    name: string;
    cardType: string;
  }>;
  minSelections?: number;
  maxSelections?: number;
  selectionPrompt?: string;
}

export interface CostExecutionResult {
  success: boolean;
  message: string;
  paidCost?: {
    type: string;
    value: number;
    cardsUsed?: Id<"cardDefinitions">[];
  };
}

/**
 * Validate if a player can pay the cost of an effect
 *
 * Returns whether the player has sufficient resources to pay,
 * and if selection is needed (e.g., which cards to tribute)
 */
export async function validateCost(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedEffect,
  providedTargets?: Id<"cardDefinitions">[]
): Promise<CostValidationResult> {
  // No cost = always valid
  if (!effect.cost) {
    return { canPay: true };
  }

  const isHost = playerId === gameState.hostId;
  const cost = effect.cost;
  const costValue = cost.value || 1;

  switch (cost.type) {
    case "discard": {
      const hand = isHost ? gameState.hostHand : gameState.opponentHand;

      // Check if player has enough cards in hand
      if (hand.length < costValue) {
        return {
          canPay: false,
          reason: `Not enough cards in hand to discard (need ${costValue}, have ${hand.length})`,
        };
      }

      // If targets provided, validate they're in hand
      if (providedTargets && providedTargets.length > 0) {
        for (const targetId of providedTargets) {
          if (!hand.includes(targetId)) {
            return {
              canPay: false,
              reason: "Selected card is not in your hand",
            };
          }
        }
        // Enough targets provided
        if (providedTargets.length >= costValue) {
          return { canPay: true };
        }
      }

      // Need to select cards to discard
      const handCards = await Promise.all(hand.map((id) => ctx.db.get(id)));
      const validCards = handCards.filter((c): c is NonNullable<typeof c> => c !== null);

      // Filter by target type if specified
      const matchingCards =
        cost.targetType && cost.targetType !== "any"
          ? validCards.filter((c) => c.cardType === cost.targetType)
          : validCards;

      if (matchingCards.length < costValue) {
        return {
          canPay: false,
          reason: `Not enough ${cost.targetType || "cards"} in hand to discard`,
        };
      }

      return {
        canPay: true,
        requiresSelection: true,
        selectionSource: "hand",
        availableTargets: matchingCards.map((c) => ({
          cardId: c._id,
          name: c.name,
          cardType: c.cardType,
        })),
        minSelections: costValue,
        maxSelections: costValue,
        selectionPrompt: `Select ${costValue} card(s) to discard`,
      };
    }

    case "pay_lp": {
      const lp = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;

      if (lp < costValue) {
        return {
          canPay: false,
          reason: `Not enough LP to pay (need ${costValue}, have ${lp})`,
        };
      }

      // LP costs don't require selection
      return { canPay: true };
    }

    case "tribute": {
      const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
      const monsters = board.filter((bc) => !bc.isFaceDown);

      if (monsters.length < costValue) {
        return {
          canPay: false,
          reason: `Not enough monsters to tribute (need ${costValue}, have ${monsters.length})`,
        };
      }

      // If targets provided, validate they're on board
      if (providedTargets && providedTargets.length > 0) {
        for (const targetId of providedTargets) {
          if (!monsters.some((m) => m.cardId === targetId)) {
            return {
              canPay: false,
              reason: "Selected monster is not available for tribute",
            };
          }
        }
        if (providedTargets.length >= costValue) {
          return { canPay: true };
        }
      }

      // Need to select monsters to tribute
      const monsterCards = await Promise.all(monsters.map((m) => ctx.db.get(m.cardId)));
      const validMonsters = monsterCards.filter((c): c is NonNullable<typeof c> => c !== null);

      return {
        canPay: true,
        requiresSelection: true,
        selectionSource: "board",
        availableTargets: validMonsters.map((c) => ({
          cardId: c._id,
          name: c.name,
          cardType: c.cardType,
        })),
        minSelections: costValue,
        maxSelections: costValue,
        selectionPrompt: `Select ${costValue} monster(s) to tribute`,
      };
    }

    case "banish": {
      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

      if (graveyard.length < costValue) {
        return {
          canPay: false,
          reason: `Not enough cards in graveyard to banish (need ${costValue}, have ${graveyard.length})`,
        };
      }

      // If targets provided, validate they're in graveyard
      if (providedTargets && providedTargets.length > 0) {
        for (const targetId of providedTargets) {
          if (!graveyard.includes(targetId)) {
            return {
              canPay: false,
              reason: "Selected card is not in your graveyard",
            };
          }
        }
        if (providedTargets.length >= costValue) {
          return { canPay: true };
        }
      }

      // Need to select cards to banish
      const gyCards = await Promise.all(graveyard.map((id) => ctx.db.get(id)));
      const validCards = gyCards.filter((c): c is NonNullable<typeof c> => c !== null);

      // Filter by target type if specified
      const matchingCards =
        cost.targetType && cost.targetType !== "any"
          ? validCards.filter((c) => c.cardType === cost.targetType)
          : validCards;

      if (matchingCards.length < costValue) {
        return {
          canPay: false,
          reason: `Not enough ${cost.targetType || "cards"} in graveyard to banish`,
        };
      }

      return {
        canPay: true,
        requiresSelection: true,
        selectionSource: "graveyard",
        availableTargets: matchingCards.map((c) => ({
          cardId: c._id,
          name: c.name,
          cardType: c.cardType,
        })),
        minSelections: costValue,
        maxSelections: costValue,
        selectionPrompt: `Select ${costValue} card(s) to banish from graveyard`,
      };
    }

    default:
      logger.warn("Unknown cost type", { costType: cost.type });
      return { canPay: true }; // Allow unknown costs for forward compatibility
  }
}

/**
 * Execute cost payment
 *
 * Actually deducts the cost from the player's resources.
 * Must be called AFTER validateCost returns canPay: true
 */
export async function executeCost(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedEffect,
  costTargets?: Id<"cardDefinitions">[]
): Promise<CostExecutionResult> {
  // No cost = nothing to execute
  if (!effect.cost) {
    return { success: true, message: "No cost required" };
  }

  const isHost = playerId === gameState.hostId;
  const cost = effect.cost;
  const costValue = cost.value || 1;

  switch (cost.type) {
    case "discard": {
      if (!costTargets || costTargets.length < costValue) {
        return {
          success: false,
          message: `Must select ${costValue} card(s) to discard`,
        };
      }

      const hand = isHost ? gameState.hostHand : gameState.opponentHand;
      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

      // Remove selected cards from hand
      const newHand = hand.filter((c) => !costTargets.includes(c));
      // Add to graveyard
      const newGraveyard = [...graveyard, ...costTargets.slice(0, costValue)];

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostHand" : "opponentHand"]: newHand,
        [isHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
      });

      logger.info("Cost paid: discard", { playerId, count: costValue });

      return {
        success: true,
        message: `Discarded ${costValue} card(s)`,
        paidCost: {
          type: "discard",
          value: costValue,
          cardsUsed: costTargets.slice(0, costValue),
        },
      };
    }

    case "pay_lp": {
      const lpField = isHost ? "hostLifePoints" : "opponentLifePoints";
      const currentLP = isHost ? gameState.hostLifePoints : gameState.opponentLifePoints;
      const newLP = currentLP - costValue;

      await ctx.db.patch(gameState._id, {
        [lpField]: newLP,
      });

      logger.info("Cost paid: LP", { playerId, amount: costValue, newLP });

      return {
        success: true,
        message: `Paid ${costValue} LP`,
        paidCost: {
          type: "pay_lp",
          value: costValue,
        },
      };
    }

    case "tribute": {
      if (!costTargets || costTargets.length < costValue) {
        return {
          success: false,
          message: `Must select ${costValue} monster(s) to tribute`,
        };
      }

      const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;

      // Remove tributed monsters from board
      const tributeSet = new Set(costTargets.slice(0, costValue));
      const newBoard = board.filter((bc) => !tributeSet.has(bc.cardId));
      // Add to graveyard
      const newGraveyard = [...graveyard, ...costTargets.slice(0, costValue)];

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostBoard" : "opponentBoard"]: newBoard,
        [isHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
      });

      logger.info("Cost paid: tribute", { playerId, count: costValue });

      return {
        success: true,
        message: `Tributed ${costValue} monster(s)`,
        paidCost: {
          type: "tribute",
          value: costValue,
          cardsUsed: costTargets.slice(0, costValue),
        },
      };
    }

    case "banish": {
      if (!costTargets || costTargets.length < costValue) {
        return {
          success: false,
          message: `Must select ${costValue} card(s) to banish`,
        };
      }

      const graveyard = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
      const banished = isHost ? gameState.hostBanished || [] : gameState.opponentBanished || [];

      // Remove from graveyard
      const banishSet = new Set(costTargets.slice(0, costValue));
      const newGraveyard = graveyard.filter((c) => !banishSet.has(c));
      // Add to banished zone
      const newBanished = [...banished, ...costTargets.slice(0, costValue)];

      await ctx.db.patch(gameState._id, {
        [isHost ? "hostGraveyard" : "opponentGraveyard"]: newGraveyard,
        [isHost ? "hostBanished" : "opponentBanished"]: newBanished,
      });

      logger.info("Cost paid: banish", { playerId, count: costValue });

      return {
        success: true,
        message: `Banished ${costValue} card(s) from graveyard`,
        paidCost: {
          type: "banish",
          value: costValue,
          cardsUsed: costTargets.slice(0, costValue),
        },
      };
    }

    default:
      return { success: false, message: `Unknown cost type: ${cost.type}` };
  }
}
