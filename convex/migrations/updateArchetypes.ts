/**
 * Migration: Update card archetypes to match story system
 *
 * Maps old archetypes to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 */

import { internalMutation } from "../_generated/server";
import type { Archetype } from "../lib/types";

export default internalMutation({
  handler: async (ctx) => {
    const archetypeMap: Record<string, Archetype> = {
      fire: "infernal_dragons",
      water: "abyssal_horrors",
      earth: "nature_spirits",
      wind: "storm_elementals",
    };

    let updatedCount = 0;

    // Get all cards
    const allCards = await ctx.db
      .query("cardDefinitions")
      .collect();

    for (const card of allCards) {
      const newArchetype = archetypeMap[card.archetype as keyof typeof archetypeMap];

      if (newArchetype && newArchetype !== card.archetype) {
        await ctx.db.patch(card._id, {
          archetype: newArchetype as Archetype,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} cards to new archetype system`,
      updatedCount,
      mapping: archetypeMap,
    };
  },
});
