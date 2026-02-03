/**
 * Load all cards from JSON data into the database
 *
 * Cards are now defined in data/cards/*.json
 * This migration can be run to sync the database with the JSON source.
 */

import {
  ABYSSAL_HORRORS_CARDS,
  ALL_CARDS,
  INFERNAL_DRAGONS_CARDS,
  NATURE_SPIRITS_CARDS,
  STORM_ELEMENTALS_CARDS,
} from "@data/cards";
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

export const previewLoad = internalQuery({
  args: {},
  handler: async () => {
    return {
      infernalDragons: INFERNAL_DRAGONS_CARDS.length,
      abyssalHorrors: ABYSSAL_HORRORS_CARDS.length,
      natureSpirits: NATURE_SPIRITS_CARDS.length,
      stormElementals: STORM_ELEMENTALS_CARDS.length,
      total: ALL_CARDS.length,
    };
  },
});

export const loadAllCards = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, { dryRun = false, clearExisting = false }) => {
    if (dryRun) {
      return {
        total: ALL_CARDS.length,
        sample: ALL_CARDS.slice(0, 3),
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

    for (const rawCard of ALL_CARDS) {
      try {
        // Convert to database format
        const card: Record<string, unknown> = {
          name: rawCard.name,
          rarity: rawCard.rarity,
          archetype: rawCard.archetype,
          cardType: rawCard.cardType,
          cost: rawCard.cost,
          isActive: true,
          createdAt: Date.now(),
        };

        // Handle creature stats
        if (rawCard.cardType === "creature") {
          card.attack = rawCard.attack;
          card.defense = rawCard.defense;
        }

        // Handle flavor text
        if (rawCard.flavorText) {
          card.flavorText = rawCard.flavorText;
        }

        // Handle image URL
        if (rawCard.imageUrl) {
          card.imageUrl = rawCard.imageUrl;
        }

        // Check if card exists
        const existing = cardsByName.get(rawCard.name);
        if (existing) {
          await ctx.db.patch(existing._id, card as any);
          updated++;
        } else {
          await ctx.db.insert("cardDefinitions", card as any);
          created++;
        }
      } catch (error) {
        errors.push(`${rawCard.name}: ${error}`);
      }
    }

    return {
      total: ALL_CARDS.length,
      created,
      updated,
      errors,
      message: `Loaded ${ALL_CARDS.length} cards. Created: ${created}, Updated: ${updated}`,
    };
  },
});
