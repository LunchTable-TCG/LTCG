/**
 * Seed Starter Cards
 *
 * Populates the database with starter deck card definitions.
 * Run once during setup.
 */

import { internalMutation } from "./_generated/server";
import { INFERNAL_DRAGONS_CARDS, ABYSSAL_DEPTHS_CARDS } from "./seeds/starterCards";

export const seedStarterCards = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if cards already exist
    const existingCards = await ctx.db
      .query("cardDefinitions")
      .collect();

    if (existingCards.length > 0) {
      return {
        success: true,
        message: `Database already has ${existingCards.length} cards. Skipping seed.`,
        cardsCreated: 0,
      };
    }

    let cardsCreated = 0;
    const now = Date.now();

    // Seed Infernal Dragons deck
    for (const card of INFERNAL_DRAGONS_CARDS) {
      await ctx.db.insert("cardDefinitions", {
        name: card.name,
        rarity: card.rarity,
        cardType: card.cardType,
        archetype: card.archetype,
        cost: card.cost,
        attack: "attack" in card ? card.attack : undefined,
        defense: "defense" in card ? card.defense : undefined,
        ability: "ability" in card ? (card.ability as string | undefined) : undefined,
        isActive: true,
        createdAt: now,
      });
      cardsCreated++;
    }

    // Seed Abyssal Depths deck
    for (const card of ABYSSAL_DEPTHS_CARDS) {
      await ctx.db.insert("cardDefinitions", {
        name: card.name,
        rarity: card.rarity,
        cardType: card.cardType,
        archetype: card.archetype,
        cost: card.cost,
        attack: "attack" in card ? card.attack : undefined,
        defense: "defense" in card ? card.defense : undefined,
        ability: "ability" in card ? (card.ability as string | undefined) : undefined,
        isActive: true,
        createdAt: now,
      });
      cardsCreated++;
    }

    return {
      success: true,
      message: `Successfully seeded ${cardsCreated} starter cards!`,
      cardsCreated,
      decksSeeded: ["INFERNAL_DRAGONS", "ABYSSAL_DEPTHS"],
    };
  },
});
