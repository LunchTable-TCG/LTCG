/**
 * Migration: Update card archetypes to match story system
 *
 * Maps old archetypes to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../functions";
import { migrationsPool } from "../infrastructure/workpools";
import type { Archetype } from "../lib/types";

const ARCHETYPE_MAP: Record<string, Archetype> = {
  fire: "infernal_dragons",
  water: "abyssal_horrors",
  earth: "nature_spirits",
  wind: "storm_elementals",
};

export default internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: updateArchetypes");

    // Get all cards
    const allCards = await ctx.db.query("cardDefinitions").collect();
    console.log(`Found ${allCards.length} cards to check`);

    let enqueuedCount = 0;
    let skippedCount = 0;

    // Enqueue update jobs for cards that need archetype migration
    for (const card of allCards) {
      const newArchetype = ARCHETYPE_MAP[card.archetype as keyof typeof ARCHETYPE_MAP];

      if (newArchetype && newArchetype !== card.archetype) {
        await migrationsPool.enqueueMutation(
          ctx,
          internal.migrations.updateArchetypes.updateCardArchetype,
          {
            cardId: card._id,
            cardName: card.name,
            oldArchetype: card.archetype,
            newArchetype,
          }
        );
        enqueuedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(
      `Migration jobs enqueued: ${enqueuedCount} cards to update, ${skippedCount} cards skipped`
    );

    return {
      success: true,
      totalCards: allCards.length,
      enqueued: enqueuedCount,
      skipped: skippedCount,
      mapping: ARCHETYPE_MAP,
      message: `Enqueued ${enqueuedCount} archetype update jobs. Check workpool status for progress.`,
    };
  },
});

/**
 * Worker mutation: Update a single card's archetype
 */
export const updateCardArchetype = internalMutation({
  args: {
    cardId: v.id("cardDefinitions"),
    cardName: v.string(),
    oldArchetype: v.string(),
    newArchetype: v.string(),
  },
  handler: async (ctx, { cardId, cardName, oldArchetype, newArchetype }) => {
    try {
      const card = await ctx.db.get(cardId);

      if (!card) {
        console.error(`[Migration Worker] Card not found: ${cardId}`);
        return { success: false, error: "Card not found" };
      }

      // Double-check idempotency
      if (card.archetype === newArchetype) {
        console.log(`[Migration Worker] Card ${cardName} already has new archetype, skipping`);
        return { success: true, skipped: true };
      }

      await ctx.db.patch(cardId, {
        archetype: newArchetype as Archetype,
      });

      console.log(
        `[Migration Worker] Updated card ${cardName}: ${oldArchetype} → ${newArchetype}`
      );
      return { success: true, updated: true };
    } catch (error) {
      console.error(`[Migration Worker] Failed to update card ${cardName}:`, error);
      return { success: false, error: String(error) };
    }
  },
});
