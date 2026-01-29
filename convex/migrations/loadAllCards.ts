/**
 * Load all 180 cards from cardsData.ts into the database
 *
 * ⚠️ ONE-TIME MIGRATION - COMPLETED
 * This script was used to initially load all 178 cards with JSON abilities.
 * All cards are now in the database. This file is kept for reference only.
 */

import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import {
  INFERNAL_DRAGONS_CARDS,
  ABYSSAL_HORRORS_CARDS,
  NATURE_SPIRITS_CARDS,
  STORM_ELEMENTALS_CARDS,
} from "./cardsData";

export const previewLoad = internalQuery({
  args: {},
  handler: async () => {
    return {
      infernalDragons: INFERNAL_DRAGONS_CARDS.length,
      abyssalHorrors: ABYSSAL_HORRORS_CARDS.length,
      natureSpirits: NATURE_SPIRITS_CARDS.length,
      stormElementals: STORM_ELEMENTALS_CARDS.length,
      total:
        INFERNAL_DRAGONS_CARDS.length +
        ABYSSAL_HORRORS_CARDS.length +
        NATURE_SPIRITS_CARDS.length +
        STORM_ELEMENTALS_CARDS.length,
    };
  },
});

export const loadAllCards = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = false, clearExisting = false }) => {
    const allCards: any[] = [
      ...INFERNAL_DRAGONS_CARDS,
      ...ABYSSAL_HORRORS_CARDS,
      ...NATURE_SPIRITS_CARDS,
      ...STORM_ELEMENTALS_CARDS,
    ];

    if (dryRun) {
      return {
        total: allCards.length,
        sample: allCards.slice(0, 3),
        message: "Dry run - no changes made",
      };
    }

    // Clear existing cards if requested
    if (clearExisting) {
      const existing = await ctx.db.query("cardDefinitions").collect();
      for (const card of existing) {
        await ctx.db.delete(card._id);
      }
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Get existing cards by name
    const existingCards = await ctx.db.query("cardDefinitions").collect();
    const cardsByName = new Map(existingCards.map((c) => [c.name, c]));

    for (const rawCard of allCards) {
      try {
        // Convert to proper format
        const card: any = {
          name: rawCard.name,
          rarity: rawCard.rarity,
          archetype: rawCard.archetype,
          cardType: rawCard.cardType,
          cost: 0,
          isActive: true,
          createdAt: Date.now(),
        };

        // Handle monster stats
        if (rawCard.monsterStats) {
          card.attack = rawCard.monsterStats.attack;
          card.defense = rawCard.monsterStats.defense;
          card.cost = rawCard.monsterStats.level;
        }

        // Handle flavor text
        if (rawCard.flavorText) {
          card.flavorText = rawCard.flavorText;
        }

        // Note: Effect conversion was done during initial load
        // Cards with abilities are already in the database
        // This migration is for reference only

        // Check if card exists
        const existing = cardsByName.get(card.name);
        if (existing) {
          await ctx.db.patch(existing._id, card);
          updated++;
        } else {
          await ctx.db.insert("cardDefinitions", card);
          created++;
        }
      } catch (error) {
        errors.push(`${rawCard.name}: ${error}`);
      }
    }

    return {
      total: allCards.length,
      created,
      updated,
      errors,
      message: `Loaded ${allCards.length} cards. Created: ${created}, Updated: ${updated}`,
    };
  },
});
