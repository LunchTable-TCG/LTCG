/**
 * Migration: Update card archetypes to match story system
 *
 * Maps old archetypes to new ones:
 * - fire → infernal_dragons
 * - water → abyssal_horrors
 * - earth → nature_spirits
 * - wind → storm_elementals
 *
 * Run with: npx convex run migrations/index:run '{fn: "migrations/updateArchetypes"}'
 */

import type { Archetype } from "../lib/types";
import { migrations } from "./index";

const ARCHETYPE_MAP: Record<string, Archetype> = {
  fire: "infernal_dragons",
  water: "abyssal_horrors",
  earth: "nature_spirits",
  wind: "storm_elementals",
};

export default migrations.define({
  table: "cardDefinitions",
  migrateOne: async (_ctx, card) => {
    const newArchetype = ARCHETYPE_MAP[card.archetype as keyof typeof ARCHETYPE_MAP];

    // Skip cards that don't need migration or already have the new archetype
    if (!newArchetype || newArchetype === card.archetype) {
      return;
    }

    console.log(`[Migration] Updating card ${card.name}: ${card.archetype} → ${newArchetype}`);

    return {
      archetype: newArchetype as Archetype,
    };
  },
});
