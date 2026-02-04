/**
 * Migration: Update card archetypes to match story system
 *
 * Maps old archetypes to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 *
 * REFACTORED to use convex-helpers makeMigration for:
 * - Automatic batch processing and pagination
 * - Built-in progress tracking
 * - Resumability from cursor if interrupted
 * - Better error handling
 */

import { migration } from "../migrations";
import type { Archetype } from "../lib/types";

const ARCHETYPE_MAP: Record<string, Archetype> = {
  fire: "infernal_dragons",
  water: "abyssal_horrors",
  earth: "nature_spirits",
  wind: "storm_elementals",
};

/**
 * Update card archetypes
 *
 * This migration uses the convex-helpers migration wrapper which provides:
 * - Automatic pagination (100 cards per batch by default)
 * - Progress tracking in migrations table
 * - Resumability if interrupted
 * - Error handling with automatic cursor tracking
 *
 * The migration will:
 * 1. Query cards in batches
 * 2. Skip cards that already have new archetypes (idempotent)
 * 3. Map old archetypes to new ones
 * 4. Track progress automatically in migrations table
 */
export default migration({
  table: "cardDefinitions",
  migrateOne: async (_ctx, card) => {
    const newArchetype = ARCHETYPE_MAP[card.archetype as keyof typeof ARCHETYPE_MAP];

    // Skip cards that don't need migration or already have the new archetype
    if (!newArchetype || newArchetype === card.archetype) {
      return null; // null = skip this document
    }

    console.log(
      `[Migration] Updating card ${card.name}: ${card.archetype} → ${newArchetype}`
    );

    // Return the fields to patch
    return {
      archetype: newArchetype as Archetype,
    };
  },
});

/**
 * LEGACY IMPLEMENTATION (kept for reference)
 *
 * This is the old workpool-based implementation. The new makeMigration
 * approach above provides better progress tracking and error handling.
 *
 * Old approach issues:
 * - Manual progress tracking
 * - No automatic resumability
 * - Required separate worker mutation
 * - No built-in status monitoring
 * - Manual batch size management
 * - Required passing multiple args (cardId, cardName, oldArchetype, newArchetype)
 *
 * New approach benefits:
 * - Automatic batch processing
 * - Built-in progress tracking via migrations table
 * - Resumable from cursor if interrupted
 * - Status monitoring via migrations:status query
 * - Simpler implementation (no separate worker needed)
 * - Direct access to card object (no need to pass multiple args)
 */

/*
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
*/
