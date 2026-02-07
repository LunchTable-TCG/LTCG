/**
 * Migration: Update Shop Products Archetypes
 *
 * Maps old archetypes in shop product packConfig to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 *
 * Run with: npx convex run migrations/index:run '{fn: "migrations/updateShopProducts"}'
 */

import { migrations } from "./index";

const ARCHETYPE_MAP: Record<string, string> = {
  fire: "infernal_dragons",
  water: "abyssal_horrors",
  earth: "nature_spirits",
  wind: "storm_elementals",
};

export default migrations.define({
  table: "shopProducts",
  migrateOne: async (_ctx, product) => {
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic packConfig schema
    const packConfig = (product as any).packConfig;
    if (!packConfig?.archetype) return;

    const newArchetype = ARCHETYPE_MAP[packConfig.archetype];
    if (!newArchetype || newArchetype === packConfig.archetype) return;

    console.log(
      `[Migration] Updating product ${product.name}: ${packConfig.archetype} → ${newArchetype}`
    );

    return {
      packConfig: { ...packConfig, archetype: newArchetype },
    };
  },
});
