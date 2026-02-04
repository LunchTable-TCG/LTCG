/**
 * Admin RNG Configuration
 *
 * Mutations for admins to update pack opening rates. All changes are
 * audit logged and require admin privileges.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import type {
  GoldPackMultipliers,
  PackMultipliers,
  PityThresholds,
  RarityWeights,
  VariantRates,
} from "../economy/rngConfig";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Insert or update a systemConfig key
 */
async function upsertConfig(
  // biome-ignore lint/suspicious/noExplicitAny: Convex internal type for mutation ctx
  ctx: { db: any },
  key: string,
  value: unknown,
  category: string,
  displayName: string,
  description: string
) {
  const existing = await ctx.db
    .query("systemConfig")
    // biome-ignore lint/suspicious/noExplicitAny: Convex query builder type
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      value,
      updatedAt: Date.now(),
    });
    return existing._id;
  }

  return await ctx.db.insert("systemConfig", {
    key,
    value,
    category,
    displayName,
    description,
    valueType: "json",
    updatedAt: Date.now(),
  });
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get RNG configuration change history from audit log
 */
export const getRngConfigHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 50;

    const logs = await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .filter((q) =>
        q.or(
          q.eq(q.field("action"), "update_rarity_weights"),
          q.eq(q.field("action"), "update_variant_rates"),
          q.eq(q.field("action"), "update_pack_multipliers"),
          q.eq(q.field("action"), "update_gold_pack_multipliers"),
          q.eq(q.field("action"), "update_pity_thresholds"),
          q.eq(q.field("action"), "reset_rng_config")
        )
      )
      .take(limit);

    // Fetch admin usernames
    const adminIds = [...new Set(logs.map((l) => l.adminId))];
    const admins = await Promise.all(adminIds.map((id) => ctx.db.get(id)));
    const adminMap = new Map(
      admins.filter(Boolean).map((a) => [a?._id, a?.username || a?.name || "Unknown"])
    );

    return logs.map((log) => ({
      ...log,
      adminName: adminMap.get(log.adminId) || "Unknown",
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update rarity weights (must sum to 1000)
 */
export const updateRarityWeights = mutation({
  args: {
    weights: v.object({
      common: v.number(),
      uncommon: v.number(),
      rare: v.number(),
      epic: v.number(),
      legendary: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate weights sum to 1000
    const sum = Object.values(args.weights).reduce((a, b) => a + b, 0);
    if (sum !== 1000) {
      throw new Error(`Rarity weights must sum to 1000, got ${sum}`);
    }

    // Validate all weights are positive
    for (const [key, value] of Object.entries(args.weights)) {
      if (value < 0) {
        throw new Error(`${key} weight cannot be negative`);
      }
    }

    await upsertConfig(
      ctx,
      "rng:rarityWeights",
      args.weights as RarityWeights,
      "rng",
      "Rarity Weights",
      "Distribution of card rarities in packs (out of 1000)"
    );

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_rarity_weights",
      success: true,
      metadata: { config: JSON.stringify(args.weights) },
    });

    return { success: true };
  },
});

/**
 * Update variant drop rates (out of 10000)
 */
export const updateVariantRates = mutation({
  args: {
    rates: v.object({
      standard: v.number(),
      foil: v.number(),
      altArt: v.number(),
      fullArt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate rates sum to approximately 10000
    const sum = Object.values(args.rates).reduce((a, b) => a + b, 0);
    if (sum < 9900 || sum > 10100) {
      throw new Error(`Variant rates should sum to ~10000, got ${sum}`);
    }

    // Validate all rates are non-negative
    for (const [key, value] of Object.entries(args.rates)) {
      if (value < 0) {
        throw new Error(`${key} rate cannot be negative`);
      }
    }

    await upsertConfig(
      ctx,
      "rng:variantRates",
      args.rates as VariantRates,
      "rng",
      "Variant Rates",
      "Base drop rates for card variants (out of 10000)"
    );

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_variant_rates",
      success: true,
      metadata: { config: JSON.stringify(args.rates) },
    });

    return { success: true };
  },
});

/**
 * Update pack multipliers for all pack types
 */
export const updatePackMultipliers = mutation({
  args: {
    multipliers: v.object({
      basic: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      standard: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      premium: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      legendary: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      collector: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      ultimate: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate all multipliers are non-negative
    for (const [packType, mults] of Object.entries(args.multipliers)) {
      for (const [variant, value] of Object.entries(mults)) {
        if ((value as number) < 0) {
          throw new Error(`${packType}.${variant} multiplier cannot be negative`);
        }
      }
    }

    await upsertConfig(
      ctx,
      "rng:packMultipliers",
      args.multipliers as PackMultipliers,
      "rng",
      "Pack Multipliers",
      "Variant rate multipliers for each pack type"
    );

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_pack_multipliers",
      success: true,
      metadata: { config: JSON.stringify(args.multipliers) },
    });

    return { success: true };
  },
});

/**
 * Update gold pack multipliers
 */
export const updateGoldPackMultipliers = mutation({
  args: {
    multipliers: v.object({
      basic: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      standard: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
      premium: v.object({ foil: v.number(), altArt: v.number(), fullArt: v.number() }),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate all multipliers are non-negative
    for (const [packType, mults] of Object.entries(args.multipliers)) {
      for (const [variant, value] of Object.entries(mults)) {
        if ((value as number) < 0) {
          throw new Error(`${packType}.${variant} multiplier cannot be negative`);
        }
      }
    }

    await upsertConfig(
      ctx,
      "rng:goldPackMultipliers",
      args.multipliers as GoldPackMultipliers,
      "rng",
      "Gold Pack Multipliers",
      "Variant rate multipliers for gold-purchased packs (lower than gem packs)"
    );

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_gold_pack_multipliers",
      success: true,
      metadata: { config: JSON.stringify(args.multipliers) },
    });

    return { success: true };
  },
});

/**
 * Update pity thresholds
 */
export const updatePityThresholds = mutation({
  args: {
    thresholds: v.object({
      epic: v.number(),
      legendary: v.number(),
      fullArt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Validate thresholds are positive and make sense
    if (args.thresholds.epic < 1) {
      throw new Error("Epic pity threshold must be at least 1");
    }
    if (args.thresholds.legendary < 1) {
      throw new Error("Legendary pity threshold must be at least 1");
    }
    if (args.thresholds.fullArt < 1) {
      throw new Error("Full Art pity threshold must be at least 1");
    }
    if (args.thresholds.epic >= args.thresholds.legendary) {
      throw new Error("Epic threshold should be lower than Legendary threshold");
    }

    await upsertConfig(
      ctx,
      "rng:pityThresholds",
      args.thresholds as PityThresholds,
      "rng",
      "Pity Thresholds",
      "Guaranteed drops after X packs without the rarity"
    );

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_pity_thresholds",
      success: true,
      metadata: { config: JSON.stringify(args.thresholds) },
    });

    return { success: true };
  },
});

/**
 * Reset all RNG config to defaults (deletes from systemConfig)
 */
export const resetRngConfigToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const configKeys = [
      "rng:rarityWeights",
      "rng:variantRates",
      "rng:packMultipliers",
      "rng:goldPackMultipliers",
      "rng:pityThresholds",
    ];

    for (const key of configKeys) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();

      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "reset_rng_config",
      success: true,
      metadata: { keysReset: configKeys.join(", ") },
    });

    return { success: true };
  },
});
