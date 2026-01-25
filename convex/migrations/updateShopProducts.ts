/**
 * Migration: Update Shop Products Archetypes
 *
 * Maps old archetypes in shop product packConfig to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 */

import { internalMutation } from "../_generated/server";

export default internalMutation({
  handler: async (ctx) => {
    const archetypeMap: Record<string, string> = {
      fire: "infernal_dragons",
      water: "abyssal_horrors",
      earth: "nature_spirits",
      wind: "storm_elementals",
    };

    let updatedCount = 0;

    // Get all shop products
    const allProducts = await ctx.db
      .query("shopProducts")
      .collect();

    for (const product of allProducts) {
      if (product.packConfig?.archetype) {
        const newArchetype = archetypeMap[product.packConfig.archetype];

        if (newArchetype && newArchetype !== product.packConfig.archetype) {
          await ctx.db.patch(product._id, {
            packConfig: {
              ...product.packConfig,
              archetype: newArchetype as any,
            },
          });
          updatedCount++;
        }
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} shop products to new archetype system`,
      updatedCount,
      mapping: archetypeMap,
    };
  },
});
