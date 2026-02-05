// Debug script to check card archetypes
import { query } from "../_generated/server";

export const getCardArchetypes = query({
  args: {},
  handler: async (ctx) => {
    const cards = await ctx.db.query("cardDefinitions").collect();
    const archetypes = [...new Set(cards.map((c) => c.archetype).filter(Boolean))];
    return {
      totalCards: cards.length,
      archetypes,
      sampleByArchetype: archetypes.slice(0, 10).map((arch) => ({
        archetype: arch,
        count: cards.filter((c) => c.archetype === arch).length,
      })),
    };
  },
});
