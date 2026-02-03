/**
 * Cost Payment System
 *
 * Handles the two-step cost payment flow:
 * 1. Query: Check if a cost is required and what options are available
 * 2. Mutation: Execute the cost payment with player's selections
 *
 * Cost Types Supported:
 * - discard: Discard X cards from hand
 * - pay_lp: Pay X life points
 * - tribute: Tribute X monsters from field
 * - banish: Banish X cards from graveyard
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { validateGameActive } from "../../lib/gameValidation";
import { executeCost, validateCost } from "./costValidator";
import type { ParsedEffect } from "./types";

/**
 * Get pending cost requirement for a card activation
 *
 * This query checks if a card has a cost that needs to be paid,
 * and returns the available options for the player to choose from.
 *
 * Frontend should call this before attempting to activate a card with a cost.
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Card being activated
 * @param effectIndex - Which effect on the card (for multi-effect cards)
 * @returns Cost details including type, amount, and available targets for selection
 */
export const getPendingCostRequirement = query({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthQuery(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get game state
    const gameState = await ctx.db
      .query("gameStates")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", args.lobbyId))
      .first();

    if (!gameState) {
      throw createError(ErrorCode.GAME_STATE_NOT_FOUND);
    }

    // 4. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card || !card.ability) {
      return {
        hasCost: false,
        canPay: false,
        reason: "Card not found or has no ability",
      };
    }

    // 5. Parse card ability to get effect with cost
    // For simplicity, we'll parse the JSON ability directly
    let parsedAbility: { effects: ParsedEffect[] };
    try {
      if (typeof card.ability === "string") {
        parsedAbility = JSON.parse(card.ability);
      } else {
        parsedAbility = card.ability as { effects: ParsedEffect[] };
      }
    } catch {
      return {
        hasCost: false,
        canPay: false,
        reason: "Failed to parse card ability",
      };
    }

    // Get the specific effect (default to first effect if not specified)
    const effectIndex = args.effectIndex ?? 0;
    const effect = parsedAbility.effects[effectIndex];

    if (!effect) {
      return {
        hasCost: false,
        canPay: false,
        reason: "Effect not found",
      };
    }

    // 6. Check if effect has a cost
    if (!effect.cost) {
      return {
        hasCost: false,
        canPay: true,
      };
    }

    // 7. Validate cost payment capability
    const validation = await validateCost(ctx, gameState, user.userId, effect);

    if (!validation.canPay) {
      return {
        hasCost: true,
        canPay: false,
        reason: validation.reason,
        costType: effect.cost.type,
        costValue: effect.cost.value || 1,
      };
    }

    // 8. Return cost details with available selections
    return {
      hasCost: true,
      canPay: true,
      costType: effect.cost.type,
      costValue: effect.cost.value || 1,
      requiresSelection: validation.requiresSelection,
      selectionSource: validation.selectionSource,
      availableTargets: validation.availableTargets,
      minSelections: validation.minSelections,
      maxSelections: validation.maxSelections,
      selectionPrompt: validation.selectionPrompt,
      cardName: card.name,
    };
  },
});

/**
 * Pay the cost for a card activation
 *
 * This mutation executes the cost payment after the player has made their selections.
 * It should be called after getPendingCostRequirement confirms the cost can be paid.
 *
 * @param lobbyId - Game lobby ID
 * @param cardId - Card being activated
 * @param effectIndex - Which effect on the card (for multi-effect cards)
 * @param costTargets - Selected cards for costs requiring selection (tribute, discard, banish)
 * @returns Success status and details of the cost paid
 */
export const payCost = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    cardId: v.id("cardDefinitions"),
    effectIndex: v.optional(v.number()),
    costTargets: v.optional(v.array(v.id("cardDefinitions"))),
  },
  handler: async (ctx, args) => {
    // 1. Validate session
    const user = await requireAuthMutation(ctx);

    // 2. Validate game is active
    await validateGameActive(ctx.db, args.lobbyId);

    // 3. Get game state
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

    // 5. Get card details
    const card = await ctx.db.get(args.cardId);
    if (!card || !card.ability) {
      throw createError(ErrorCode.GAME_CARD_NOT_FOUND, {
        reason: "Card not found or has no ability",
      });
    }

    // 6. Parse card ability to get effect with cost
    let parsedAbility: { effects: ParsedEffect[] };
    try {
      if (typeof card.ability === "string") {
        parsedAbility = JSON.parse(card.ability);
      } else {
        parsedAbility = card.ability as { effects: ParsedEffect[] };
      }
    } catch (_error) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Failed to parse card ability",
      });
    }

    // Get the specific effect
    const effectIndex = args.effectIndex ?? 0;
    const effect = parsedAbility.effects[effectIndex];

    if (!effect) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: "Effect not found",
      });
    }

    // 7. Validate cost can still be paid
    const validation = await validateCost(ctx, gameState, user.userId, effect, args.costTargets);

    if (!validation.canPay) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: validation.reason || "Cannot pay cost",
      });
    }

    // 8. Execute cost payment
    const result = await executeCost(ctx, gameState, user.userId, effect, args.costTargets);

    if (!result.success) {
      throw createError(ErrorCode.GAME_INVALID_MOVE, {
        reason: result.message,
      });
    }

    // 9. Return success
    return {
      success: true,
      message: result.message,
      paidCost: result.paidCost,
    };
  },
});
