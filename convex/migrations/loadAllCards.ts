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
import { internal } from "../_generated/api";
import { internalMutation, internalQuery } from "../_generated/server";
import { migrationsPool } from "../infrastructure/workpools";

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

    console.log(`Starting migration: loadAllCards (${ALL_CARDS.length} cards)`);

    // Get existing cards by name
    const existingCards = await ctx.db.query("cardDefinitions").collect();
    const cardsByName = new Map(existingCards.map((c) => [c.name, c]));

    let enqueuedCount = 0;

    // Enqueue upsert jobs for each card
    for (const rawCard of ALL_CARDS) {
      const existingCardId = cardsByName.get(rawCard.name)?._id;

      await migrationsPool.enqueueMutation(ctx, internal.migrations.loadAllCards.upsertCard, {
        cardData: rawCard,
        existingCardId: existingCardId ?? null,
      });

      enqueuedCount++;
    }

    console.log(`Migration jobs enqueued: ${enqueuedCount} cards to upsert`);

    return {
      success: true,
      total: ALL_CARDS.length,
      enqueued: enqueuedCount,
      message: `Enqueued ${enqueuedCount} card upsert jobs. Check workpool status for progress.`,
    };
  },
});

/**
 * Worker mutation: Upsert a single card
 */
export const upsertCard = internalMutation({
  args: {
    cardData: v.any(),
    existingCardId: v.union(v.id("cardDefinitions"), v.null()),
  },
  handler: async (ctx, { cardData, existingCardId }) => {
    try {
      // Convert to database format
      const card: Record<string, unknown> = {
        name: cardData.name,
        rarity: cardData.rarity,
        archetype: cardData.archetype,
        cardType: cardData.cardType,
        cost: cardData.cost,
        isActive: true,
        createdAt: Date.now(),
      };

      // Handle creature stats
      if (cardData.cardType === "creature") {
        card["attack"] = cardData.attack;
        card["defense"] = cardData.defense;
      }

      // Handle flavor text
      if (cardData.flavorText) {
        card["flavorText"] = cardData.flavorText;
      }

      // Handle image URL
      if (cardData.imageUrl) {
        card["imageUrl"] = cardData.imageUrl;
      }

      // Upsert card
      if (existingCardId) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic card schema from external source
        await ctx.db.patch(existingCardId, card as any);
        console.log(`[Migration Worker] Updated card: ${cardData.name}`);
        return { success: true, updated: true };
      }

      // biome-ignore lint/suspicious/noExplicitAny: Dynamic card schema from external source
      await ctx.db.insert("cardDefinitions", card as any);
      console.log(`[Migration Worker] Created card: ${cardData.name}`);
      return { success: true, created: true };
    } catch (error) {
      console.error(`[Migration Worker] Failed to upsert card ${cardData.name}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
