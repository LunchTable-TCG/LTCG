import type { MutationCtx } from "../../_generated/server";
import type { Id, Doc } from "../../_generated/dataModel";
// Import the ParsedEffect type from the parent module
import type { ParsedEffect } from "../types";

/**
 * Execute Search effect - Search deck for cards matching criteria
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param playerId - Player searching their deck
 * @param effect - Parsed search effect with targetType, targetCount, condition
 * @param selectedCardId - Optional: Card selected from search results
 * @returns Success status, message, and matching cards if no selection made yet
 */
export async function executeSearch(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedEffect,
  selectedCardId?: Id<"cardDefinitions">
): Promise<{ success: boolean; message: string; matchingCards?: Id<"cardDefinitions">[] }> {
  const isHost = gameState.hostId === playerId;
  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;

  if (deck.length === 0) {
    return { success: false, message: "Deck is empty" };
  }

  // Get target type and count from effect
  const targetType = effect.targetType || "any";
  const targetCount = effect.targetCount || 1;
  const archetype = effect.condition?.replace("_search", "");

  // Filter deck by target type and archetype
  const matchingCards: Id<"cardDefinitions">[] = [];

  for (const cardId of deck) {
    const card = await ctx.db.get(cardId);
    if (!card) continue;

    // Check type filter
    let typeMatch = false;
    if (targetType === "any") {
      typeMatch = true;
    } else if (targetType === "monster") {
      typeMatch = card.cardType === "creature"; // "creature" in schema = "monster" in game
    } else if (targetType === "spell") {
      typeMatch = card.cardType === "spell";
    } else if (targetType === "trap") {
      typeMatch = card.cardType === "trap";
    }

    if (!typeMatch) continue;

    // Check archetype filter (if specified)
    if (archetype) {
      const cardArchetype = card.archetype?.toLowerCase() || "";
      const cardName = card.name.toLowerCase();

      // Match if archetype matches card's archetype field OR is in the card name
      if (cardArchetype.includes(archetype) || cardName.includes(archetype)) {
        matchingCards.push(cardId);
      }
    } else {
      // No archetype filter, just type match
      matchingCards.push(cardId);
    }

    // Stop if we've found enough matches
    if (matchingCards.length >= targetCount * 3) break; // Get 3x target for selection pool
  }

  // If no matches found
  if (matchingCards.length === 0) {
    const archetypeText = archetype ? ` ${archetype}` : "";
    const typeText = targetType === "any" ? "card" : targetType;
    return { success: false, message: `No${archetypeText} ${typeText}s found in deck` };
  }

  // If no card selected yet, return matching cards for selection
  if (!selectedCardId) {
    return {
      success: true,
      message: `Found ${matchingCards.length} matching card(s)`,
      matchingCards: matchingCards.slice(0, 10), // Return up to 10 for selection
    };
  }

  // Validate selected card is in matching cards
  if (!matchingCards.includes(selectedCardId)) {
    return { success: false, message: "Selected card does not match search criteria" };
  }

  // Move selected card from deck to hand
  const newDeck = deck.filter((c) => c !== selectedCardId);
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;
  const newHand = [...hand, selectedCardId];

  // Shuffle deck (simplified - just update the deck without actual shuffle for now)
  await ctx.db.patch(gameState._id, {
    [isHost ? "hostDeck" : "opponentDeck"]: newDeck,
    [isHost ? "hostHand" : "opponentHand"]: newHand,
  });

  const card = await ctx.db.get(selectedCardId);
  const cardName = card?.name || "Unknown card";

  return { success: true, message: `Added ${cardName} from deck to hand` };
}
