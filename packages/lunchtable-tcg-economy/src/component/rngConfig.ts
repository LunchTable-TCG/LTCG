import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the active RNG configuration.
 * Returns null if no config has been set (caller should use hardcoded defaults).
 */
export const getRngConfig = query({
  args: {},
  returns: v.union(
    v.object({
      rarityWeights: v.object({
        common: v.number(),
        uncommon: v.number(),
        rare: v.number(),
        epic: v.number(),
        legendary: v.number(),
      }),
      variantRates: v.object({
        standard: v.number(),
        foil: v.number(),
        altArt: v.number(),
        fullArt: v.number(),
      }),
      pityThresholds: v.object({
        epic: v.number(),
        legendary: v.number(),
        fullArt: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const config = await ctx.db
      .query("rngConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();

    if (!config) return null;

    return {
      rarityWeights: config.rarityWeights,
      variantRates: config.variantRates,
      pityThresholds: config.pityThresholds,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Set or update the active RNG configuration.
 * All fields are optional — only provided fields are updated.
 */
export const setRngConfig = mutation({
  args: {
    rarityWeights: v.optional(
      v.object({
        common: v.number(),
        uncommon: v.number(),
        rare: v.number(),
        epic: v.number(),
        legendary: v.number(),
      })
    ),
    variantRates: v.optional(
      v.object({
        standard: v.number(),
        foil: v.number(),
        altArt: v.number(),
        fullArt: v.number(),
      })
    ),
    pityThresholds: v.optional(
      v.object({
        epic: v.number(),
        legendary: v.number(),
        fullArt: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("rngConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();

    if (existing) {
      const patch: Record<string, unknown> = { updatedAt: Date.now() };
      if (args.rarityWeights) patch.rarityWeights = args.rarityWeights;
      if (args.variantRates) patch.variantRates = args.variantRates;
      if (args.pityThresholds) patch.pityThresholds = args.pityThresholds;
      await ctx.db.patch(existing._id, patch);
    } else {
      // First-time creation requires all fields. Use sensible defaults for
      // any section the caller didn't provide.
      const defaults = {
        rarityWeights: { common: 550, uncommon: 280, rare: 120, epic: 40, legendary: 10 },
        variantRates: { standard: 8800, foil: 1000, altArt: 200, fullArt: 50 },
        pityThresholds: { epic: 150, legendary: 500, fullArt: 1000 },
      };

      await ctx.db.insert("rngConfig", {
        key: "active" as const,
        rarityWeights: args.rarityWeights ?? defaults.rarityWeights,
        variantRates: args.variantRates ?? defaults.variantRates,
        pityThresholds: args.pityThresholds ?? defaults.pityThresholds,
        updatedAt: Date.now(),
      });
    }

    return null;
  },
});
