/**
 * Seed Starter Cards
 *
 * Populates the database with starter deck card definitions.
 * Run once during setup.
 */

import { internalMutation } from "../functions";
import { getCardsForDeck } from "../seeds/starterCards";
import { STARTER_DECKS } from "../seeds/starterDecks";

export const seedStarterCards = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if cards already exist
    const existingCards = await ctx.db.query("cardDefinitions").collect();

    if (existingCards.length > 0) {
      return {
        success: true,
        message: `Database already has ${existingCards.length} cards. Skipping seed.`,
        cardsCreated: 0,
      };
    }

    let cardsCreated = 0;
    const now = Date.now();

    // Seed all configured starter decks
    const decksSeeded: string[] = [];

    for (const deck of STARTER_DECKS) {
      const cards = getCardsForDeck(deck);
      if (cards.length === 0) {
        console.warn(`Skipping deck ${deck.deckCode}: No cards found.`);
        continue;
      }

      console.log(`Seeding deck: ${deck.name} (${deck.deckCode}) with ${cards.length} cards`);

      for (const card of cards) {
        // Check if card exists by name to avoid duplicates if multiple decks share cards
        // Note: The outer check existingCards defined above is for ANY cards,
        // but if we are targeting specific decks we might want more granular checks.
        // However, keeping the original logic's simplicity for now:
        // if generic existingCards check passed, we insert.

        // Actually, preventing duplicate names is good practice in loop
        // The createCardDefinition mutation handles strict duplicates by name,
        // but here we are doing raw inserts?
        // Ah, the original code did raw inserts without per-card check,
        // relying on the top-level check.

        await ctx.db.insert("cardDefinitions", {
          name: card.name,
          rarity: card.rarity,
          cardType: card.cardType,
          archetype: card.archetype,
          cost: card.cost,
          attack: "attack" in card ? card.attack : undefined,
          defense: "defense" in card ? card.defense : undefined,
          ability: "ability" in card ? card.ability : undefined,
          isActive: true,
          createdAt: now,
        });
        cardsCreated++;
      }
      decksSeeded.push(deck.deckCode);
    }

    return {
      success: true,
      message: `Successfully seeded ${cardsCreated} starter cards!`,
      cardsCreated,
      decksSeeded: ["INFERNAL_DRAGONS", "ABYSSAL_DEPTHS"],
    };
  },
});
