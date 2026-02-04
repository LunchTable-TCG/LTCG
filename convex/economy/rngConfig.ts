/**
 * RNG Configuration System
 *
 * Dynamic configuration for pack opening rates. Stores settings in systemConfig table
 * with fallback to hardcoded defaults from constants.ts. This allows admins to adjust
 * rates without code deployment.
 *
 * Config Keys:
 * - rng:rarityWeights - Rarity distribution percentages
 * - rng:variantRates - Base variant drop rates
 * - rng:packMultipliers - Variant multipliers by pack type
 * - rng:pityThresholds - Pity system thresholds
 */

import type { MutationCtx, QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";
import { PITY_THRESHOLDS, RARITY_WEIGHTS, VARIANT_CONFIG } from "../lib/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface RarityWeights {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface VariantRates {
  standard: number;
  foil: number;
  altArt: number;
  fullArt: number;
}

export interface PackMultipliers {
  basic: { foil: number; altArt: number; fullArt: number };
  standard: { foil: number; altArt: number; fullArt: number };
  premium: { foil: number; altArt: number; fullArt: number };
  legendary: { foil: number; altArt: number; fullArt: number };
  collector: { foil: number; altArt: number; fullArt: number };
  ultimate: { foil: number; altArt: number; fullArt: number };
}

export interface GoldPackMultipliers {
  basic: { foil: number; altArt: number; fullArt: number };
  standard: { foil: number; altArt: number; fullArt: number };
  premium: { foil: number; altArt: number; fullArt: number };
}

export interface PityThresholds {
  epic: number;
  legendary: number;
  fullArt: number;
}

export interface RngConfig {
  rarityWeights: RarityWeights;
  variantRates: VariantRates;
  packMultipliers: PackMultipliers;
  goldPackMultipliers: GoldPackMultipliers;
  pityThresholds: PityThresholds;
}

// ============================================================================
// DEFAULT VALUES (from constants.ts)
// ============================================================================

const DEFAULT_RARITY_WEIGHTS: RarityWeights = {
  common: RARITY_WEIGHTS.common,
  uncommon: RARITY_WEIGHTS.uncommon,
  rare: RARITY_WEIGHTS.rare,
  epic: RARITY_WEIGHTS.epic,
  legendary: RARITY_WEIGHTS.legendary,
};

const DEFAULT_VARIANT_RATES: VariantRates = {
  standard: VARIANT_CONFIG.BASE_RATES.standard,
  foil: VARIANT_CONFIG.BASE_RATES.foil,
  altArt: VARIANT_CONFIG.BASE_RATES.alt_art,
  fullArt: VARIANT_CONFIG.BASE_RATES.full_art,
};

const DEFAULT_PACK_MULTIPLIERS: PackMultipliers = {
  basic: VARIANT_CONFIG.PACK_MULTIPLIERS.basic,
  standard: VARIANT_CONFIG.PACK_MULTIPLIERS.standard,
  premium: VARIANT_CONFIG.PACK_MULTIPLIERS.premium,
  legendary: VARIANT_CONFIG.PACK_MULTIPLIERS.legendary,
  collector: VARIANT_CONFIG.PACK_MULTIPLIERS.collector,
  ultimate: VARIANT_CONFIG.PACK_MULTIPLIERS.ultimate,
};

const DEFAULT_GOLD_PACK_MULTIPLIERS: GoldPackMultipliers = {
  basic: VARIANT_CONFIG.GOLD_PACK_MULTIPLIERS.basic,
  standard: VARIANT_CONFIG.GOLD_PACK_MULTIPLIERS.standard,
  premium: VARIANT_CONFIG.GOLD_PACK_MULTIPLIERS.premium,
};

const DEFAULT_PITY_THRESHOLDS: PityThresholds = {
  epic: PITY_THRESHOLDS.epic,
  legendary: PITY_THRESHOLDS.legendary,
  fullArt: PITY_THRESHOLDS.fullArt,
};

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Get a config value from systemConfig table by key
 * Returns null if not found
 */
async function getConfigValue<T>(ctx: QueryCtx | MutationCtx, key: string): Promise<T | null> {
  const config = await ctx.db
    .query("systemConfig")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!config) return null;
  return config.value as T;
}

/**
 * Get rarity weights with fallback to defaults
 */
export async function getRarityWeightsInternal(
  ctx: QueryCtx | MutationCtx
): Promise<RarityWeights> {
  const stored = await getConfigValue<RarityWeights>(ctx, "rng:rarityWeights");
  return stored ?? DEFAULT_RARITY_WEIGHTS;
}

/**
 * Get variant rates with fallback to defaults
 */
export async function getVariantRatesInternal(ctx: QueryCtx | MutationCtx): Promise<VariantRates> {
  const stored = await getConfigValue<VariantRates>(ctx, "rng:variantRates");
  return stored ?? DEFAULT_VARIANT_RATES;
}

/**
 * Get pack multipliers with fallback to defaults
 */
export async function getPackMultipliersInternal(
  ctx: QueryCtx | MutationCtx
): Promise<PackMultipliers> {
  const stored = await getConfigValue<PackMultipliers>(ctx, "rng:packMultipliers");
  return stored ?? DEFAULT_PACK_MULTIPLIERS;
}

/**
 * Get gold pack multipliers with fallback to defaults
 */
export async function getGoldPackMultipliersInternal(
  ctx: QueryCtx | MutationCtx
): Promise<GoldPackMultipliers> {
  const stored = await getConfigValue<GoldPackMultipliers>(ctx, "rng:goldPackMultipliers");
  return stored ?? DEFAULT_GOLD_PACK_MULTIPLIERS;
}

/**
 * Get pity thresholds with fallback to defaults
 */
export async function getPityThresholdsInternal(
  ctx: QueryCtx | MutationCtx
): Promise<PityThresholds> {
  const stored = await getConfigValue<PityThresholds>(ctx, "rng:pityThresholds");
  return stored ?? DEFAULT_PITY_THRESHOLDS;
}

/**
 * Get full RNG config with all settings
 */
export async function getFullRngConfig(ctx: QueryCtx | MutationCtx): Promise<RngConfig> {
  const [rarityWeights, variantRates, packMultipliers, goldPackMultipliers, pityThresholds] =
    await Promise.all([
      getRarityWeightsInternal(ctx),
      getVariantRatesInternal(ctx),
      getPackMultipliersInternal(ctx),
      getGoldPackMultipliersInternal(ctx),
      getPityThresholdsInternal(ctx),
    ]);

  return {
    rarityWeights,
    variantRates,
    packMultipliers,
    goldPackMultipliers,
    pityThresholds,
  };
}

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all RNG configuration for display in admin panel
 * Includes both current values and default values for reference
 */
export const getRngConfig = query({
  args: {},
  handler: async (ctx) => {
    const current = await getFullRngConfig(ctx);

    return {
      current,
      defaults: {
        rarityWeights: DEFAULT_RARITY_WEIGHTS,
        variantRates: DEFAULT_VARIANT_RATES,
        packMultipliers: DEFAULT_PACK_MULTIPLIERS,
        goldPackMultipliers: DEFAULT_GOLD_PACK_MULTIPLIERS,
        pityThresholds: DEFAULT_PITY_THRESHOLDS,
      },
    };
  },
});
