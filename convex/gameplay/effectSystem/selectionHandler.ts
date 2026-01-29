/**
 * Selection Handler
 *
 * Generic framework for two-step effect execution that requires player selection.
 * Used for effects like:
 * - Search (select card from deck to add to hand)
 * - ToHand (select card from graveyard to return)
 * - Discard (select specific cards to discard)
 * - Target selection (select monster to destroy, etc.)
 */

import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { EffectResult, ParsedEffect } from "./types";

export type SelectionContext = "cost" | "target" | "search" | "effect";

/**
 * Convert effect target type to actual card type in schema
 * Effects use "monster" but schema uses "creature"
 */
function normalizeCardType(
  effectTargetType?: "monster" | "spell" | "trap" | "any"
): "creature" | "spell" | "trap" | "equipment" | "any" | undefined {
  if (!effectTargetType) return undefined;
  if (effectTargetType === "monster") return "creature";
  if (effectTargetType === "any") return "any";
  return effectTargetType;
}

export interface SelectionRequest {
  effectId: string; // Unique ID to track this selection request
  context: SelectionContext;
  source: "deck" | "graveyard" | "banished" | "hand" | "board";
  playerId: Id<"users">;
  cardId: Id<"cardDefinitions">; // The card initiating the effect
  effect: ParsedEffect;
  minSelections: number;
  maxSelections: number;
  filter?: {
    cardType?: "creature" | "spell" | "trap" | "equipment" | "any";
    archetype?: string;
    levelMin?: number;
    levelMax?: number;
    attackMin?: number;
    attackMax?: number;
  };
}

export interface SelectionResponse {
  effectId: string;
  selectedCards: Id<"cardDefinitions">[];
}

/**
 * Get available cards for selection based on criteria
 */
export async function getAvailableSelections(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  request: SelectionRequest
): Promise<EffectResult> {
  const isHost = request.playerId === gameState.hostId;

  // Get source cards based on location
  let sourceCards: Id<"cardDefinitions">[] = [];

  switch (request.source) {
    case "deck":
      sourceCards = isHost ? gameState.hostDeck : gameState.opponentDeck;
      break;
    case "graveyard":
      sourceCards = isHost ? gameState.hostGraveyard : gameState.opponentGraveyard;
      break;
    case "banished":
      sourceCards = isHost ? gameState.hostBanished || [] : gameState.opponentBanished || [];
      break;
    case "hand":
      sourceCards = isHost ? gameState.hostHand : gameState.opponentHand;
      break;
    case "board": {
      const board = isHost ? gameState.hostBoard : gameState.opponentBoard;
      sourceCards = board.map((bc) => bc.cardId);
      break;
    }
  }

  if (sourceCards.length === 0) {
    return {
      success: false,
      message: `No cards available in ${request.source}`,
    };
  }

  // Fetch card details
  const cards = await Promise.all(sourceCards.map((id) => ctx.db.get(id)));
  const validCards = cards.filter((c): c is NonNullable<typeof c> => c !== null);

  // Apply filters
  let filteredCards = validCards;

  if (request.filter) {
    const { cardType, archetype, levelMin, levelMax, attackMin, attackMax } = request.filter;

    filteredCards = filteredCards.filter((card) => {
      // Card type filter
      if (cardType && cardType !== "any" && card.cardType !== cardType) {
        return false;
      }

      // Archetype filter (check name or archetype field)
      if (archetype) {
        const hasArchetype =
          card.name.toLowerCase().includes(archetype.toLowerCase()) ||
          (card.archetype && card.archetype.toLowerCase() === archetype.toLowerCase());
        if (!hasArchetype) return false;
      }

      // Level filters (for monsters)
      if (card.cardType === "creature") {
        const level = card.cost || 1; // cost field stores level

        if (levelMin !== undefined && level < levelMin) return false;
        if (levelMax !== undefined && level > levelMax) return false;

        // Attack filters
        if (attackMin !== undefined && (card.attack || 0) < attackMin) return false;
        if (attackMax !== undefined && (card.attack || 0) > attackMax) return false;
      }

      return true;
    });
  }

  if (filteredCards.length === 0) {
    return {
      success: false,
      message: "No matching cards found",
    };
  }

  if (filteredCards.length < request.minSelections) {
    return {
      success: false,
      message: `Not enough matching cards (need ${request.minSelections}, found ${filteredCards.length})`,
    };
  }

  // Build selection prompt
  let prompt = `Select ${request.minSelections}`;
  if (request.maxSelections > request.minSelections) {
    prompt += `-${request.maxSelections}`;
  }
  prompt += " card(s)";

  if (request.filter?.cardType && request.filter.cardType !== "any") {
    prompt += ` (${request.filter.cardType})`;
  }

  // Return selection data
  return {
    success: true,
    message: prompt,
    requiresSelection: true,
    selectionType: request.context,
    selectionSource: request.source,
    availableTargets: filteredCards.map((card) => ({
      cardId: card._id,
      name: card.name,
      cardType: card.cardType,
      imageUrl: card.imageUrl,
      monsterStats:
        card.cardType === "creature"
          ? {
              attack: card.attack || 0,
              defense: card.defense || 0,
              level: card.cost || 1,
            }
          : undefined,
    })),
    minSelections: request.minSelections,
    maxSelections: Math.min(request.maxSelections, filteredCards.length),
    selectionPrompt: prompt,
  };
}

/**
 * Validate a selection response
 */
export async function validateSelection(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  request: SelectionRequest,
  response: SelectionResponse
): Promise<{ valid: boolean; reason?: string }> {
  // Check selection count
  if (response.selectedCards.length < request.minSelections) {
    return {
      valid: false,
      reason: `Must select at least ${request.minSelections} card(s)`,
    };
  }

  if (response.selectedCards.length > request.maxSelections) {
    return {
      valid: false,
      reason: `Cannot select more than ${request.maxSelections} card(s)`,
    };
  }

  // Verify selected cards exist in the source
  const availableResult = await getAvailableSelections(ctx, gameState, request);

  if (!availableResult.availableTargets) {
    return { valid: false, reason: "No available targets" };
  }

  const availableIds = new Set(availableResult.availableTargets.map((t) => t.cardId.toString()));

  for (const selectedId of response.selectedCards) {
    if (!availableIds.has(selectedId.toString())) {
      return {
        valid: false,
        reason: "Selected card is not available for selection",
      };
    }
  }

  return { valid: true };
}

/**
 * Parse effect to determine selection requirements
 *
 * Returns a SelectionRequest for effects that require player input,
 * or null for effects that don't need selection.
 */
export function getSelectionRequirements(
  effect: ParsedEffect,
  _targetOpponent?: boolean
): SelectionRequest | null {
  const count = effect.targetCount || effect.value || 1;

  // Search effect - select from deck
  if (effect.type === "search") {
    return {
      effectId: `search_${Date.now()}`,
      context: "search",
      source: "deck",
      playerId: "" as Id<"users">, // Will be filled in by caller
      cardId: "" as Id<"cardDefinitions">, // Will be filled in by caller
      effect,
      minSelections: 1,
      maxSelections: effect.targetCount || 1,
      filter: {
        cardType: normalizeCardType(effect.targetType),
        archetype: effect.condition?.replace("_search", ""),
      },
    };
  }

  // ToHand - select from graveyard or banished zone
  if (effect.type === "toHand") {
    const source = effect.targetLocation === "banished" ? "banished" : "graveyard";
    return {
      effectId: `tohand_${Date.now()}`,
      context: "target",
      source,
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: 1,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  // Destroy effect - select from board (opponent's by default)
  if (effect.type === "destroy") {
    return {
      effectId: `destroy_${Date.now()}`,
      context: "target",
      source: "board",
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: count,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  // Discard effect - select from hand
  if (effect.type === "discard") {
    return {
      effectId: `discard_${Date.now()}`,
      context: "effect",
      source: "hand",
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: count,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  // Banish effect - select from specified location
  if (effect.type === "banish") {
    const source = (effect.targetLocation || "board") as
      | "deck"
      | "graveyard"
      | "banished"
      | "hand"
      | "board";
    return {
      effectId: `banish_${Date.now()}`,
      context: "target",
      source,
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: count,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  // Send to graveyard effect - select from board or hand
  if (effect.type === "toGraveyard") {
    const source = (effect.targetLocation || "board") as
      | "deck"
      | "graveyard"
      | "banished"
      | "hand"
      | "board";
    return {
      effectId: `tograve_${Date.now()}`,
      context: "target",
      source,
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: count,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  // Special summon - select from specified location
  if (effect.type === "summon") {
    const source = (effect.targetLocation || "graveyard") as
      | "deck"
      | "graveyard"
      | "banished"
      | "hand"
      | "board";
    return {
      effectId: `summon_${Date.now()}`,
      context: "target",
      source,
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: 1,
      maxSelections: count,
      filter: {
        cardType: normalizeCardType(effect.targetType) || "creature",
      },
    };
  }

  // Modify ATK/DEF - select target monster on board
  if (effect.type === "modifyATK" || effect.type === "modifyDEF") {
    return {
      effectId: `modify_${effect.type}_${Date.now()}`,
      context: "target",
      source: "board",
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: 1,
      maxSelections: count,
      filter: {
        cardType: "creature",
      },
    };
  }

  // Negate - select card/effect to negate (typically from chain or board)
  if (effect.type === "negate") {
    return {
      effectId: `negate_${Date.now()}`,
      context: "target",
      source: "board",
      playerId: "" as Id<"users">,
      cardId: "" as Id<"cardDefinitions">,
      effect,
      minSelections: 1,
      maxSelections: 1,
      filter: {
        cardType: normalizeCardType(effect.targetType),
      },
    };
  }

  return null;
}

/**
 * Get selection requirements for targeting opponent's cards specifically
 */
export function getOpponentSelectionRequirements(
  effect: ParsedEffect,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">
): SelectionRequest | null {
  const baseReq = getSelectionRequirements(effect, true);
  if (!baseReq) return null;

  // For targeting opponent's cards, we need to flip the player perspective
  const isHost = playerId === gameState.hostId;
  const opponentId = isHost ? gameState.opponentId : gameState.hostId;

  return {
    ...baseReq,
    playerId: opponentId, // Target opponent's zone
  };
}
