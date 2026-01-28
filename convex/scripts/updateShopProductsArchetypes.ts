/**
 * One-time mutation to update shop products archetypes
 */

import { mutation } from "../_generated/server";

export const updateShopProductsArchetypes = mutation({
  handler: async (ctx) => {
    const archetypeMap: Record<string, string> = {
      fire: "infernal_dragons",
      water: "abyssal_horrors",
      earth: "nature_spirits",
      wind: "storm_elementals",
    };

    let updatedCount = 0;

    const allProducts = await ctx.db.query("shopProducts").collect();

    for (const product of allProducts) {
      if (product.packConfig?.archetype) {
        const oldArchetype = product.packConfig.archetype;
        const newArchetype = archetypeMap[oldArchetype];

        if (newArchetype) {
          await ctx.db.patch(product._id, {
            packConfig: {
              ...product.packConfig,
              archetype: newArchetype as any,
            },
          });
          updatedCount++;
          console.log(`Updated ${product.name}: ${oldArchetype} → ${newArchetype}`);
        }
      }
    }

    return {
      success: true,
      message: `Updated ${updatedCount} shop products`,
      updatedCount,
    };
  },
});
