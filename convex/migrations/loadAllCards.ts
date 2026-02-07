/**
 * Load all cards from JSON data into the database
 *
 * Cards are defined in data/cards/*.json
 * This is a data import (not a table migration), so it uses a standalone mutation.
 *
 * Run with: npx convex run migrations/loadAllCards:loadAllCards
 * Preview: npx convex run migrations/loadAllCards:previewLoad
 */

import {
  ABYSSAL_HORRORS_CARDS,
  ALL_CARDS,
  INFERNAL_DRAGONS_CARDS,
  NATURE_SPIRITS_CARDS,
  STORM_ELEMENTALS_CARDS,
} from "@data/cards";
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { internalMutation } from "../functions";

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
      console.log(`Cleared ${existing.length} existing cards`);
    }

    console.log(`Starting card import: ${ALL_CARDS.length} cards`);

    // Get existing cards by name for upsert
    const existingCards = await ctx.db.query("cardDefinitions").collect();
    const cardsByName = new Map(existingCards.map((c) => [c.name, c]));

    let created = 0;
    let updated = 0;

    for (const rawCard of ALL_CARDS) {
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic card schema from external source
      const card: Record<string, any> = {
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
        card["attack"] = rawCard.attack;
        card["defense"] = rawCard.defense;
      }

      // Handle optional fields
      if (rawCard.flavorText) card["flavorText"] = rawCard.flavorText;
      if (rawCard.imageUrl) card["imageUrl"] = rawCard.imageUrl;

      const existingCard = cardsByName.get(rawCard.name);
      if (existingCard) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic card data
        await ctx.db.patch(existingCard._id, card as any);
        updated++;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic card data
        await ctx.db.insert("cardDefinitions", card as any);
        created++;
      }
    }

    console.log(`Card import complete: ${created} created, ${updated} updated`);

    return {
      success: true,
      total: ALL_CARDS.length,
      created,
      updated,
    };
  },
});
