import type { Doc, Id } from "../../../../_generated/dataModel";
import type { MutationCtx } from "../../../../_generated/server";
import type { EffectResult, ParsedEffect } from "../../types";

/**
 * Execute Search effect - Search deck for cards matching criteria
 *
 * Two-step process:
 * 1. If no selectedCardId: Return matching cards for player selection
 * 2. If selectedCardId provided: Complete the search by adding card to hand
 *
 * @param ctx - Mutation context
 * @param gameState - Current game state
 * @param playerId - Player searching their deck
 * @param effect - Parsed search effect with targetType, targetCount, condition
 * @param selectedCardId - Optional: Card selected from search results
 * @returns Effect result with selection data or completion status
 */
export async function executeSearch(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedEffect,
  selectedCardId?: Id<"cardDefinitions">
): Promise<EffectResult> {
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
  // Batch fetch all deck cards to avoid N+1 queries
  const deckCards = await Promise.all(deck.map((id) => ctx.db.get(id)));
  const deckCardMap = new Map(
    deckCards.filter((c): c is NonNullable<typeof c> => c !== null).map((c) => [c._id, c])
  );

  const matchingCards: Id<"cardDefinitions">[] = [];

  for (const cardId of deck) {
    const card = deckCardMap.get(cardId);
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
    // Use already-fetched card data for frontend display
    const availableTargets = matchingCards
      .slice(0, 10)
      .map((cardId) => {
        const card = deckCardMap.get(cardId);
        if (!card) return null;

        return {
          cardId,
          name: card.name,
          cardType: card.cardType,
          imageUrl: card.imageUrl,
          monsterStats:
            card.cardType === "creature"
              ? {
                  attack: card.attack || 0,
                  defense: card.defense || 0,
                  level: card.cost, // Level is derived from cost
                }
              : undefined,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    const archetypeText = archetype ? ` ${archetype}` : "";
    const typeText = targetType === "any" ? "card" : targetType;

    return {
      success: true,
      message: `Found ${matchingCards.length} matching card(s)`,
      requiresSelection: true,
      selectionSource: "deck",
      availableTargets,
      minSelections: 1,
      maxSelections: 1,
      selectionPrompt: `Select 1${archetypeText} ${typeText} to add to your hand`,
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
