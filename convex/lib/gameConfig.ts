import { DEFAULT_LTCG_CONFIG } from "@lunchtable-tcg/config";
import type { LTCGConfig } from "@lunchtable-tcg/config";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Deep merge utility — same as config package but inlined to avoid
 * import complexity in Convex runtime.
 */
function deepMerge<T>(base: T, override: Partial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  const overrideObj = override as Record<string, unknown>;

  for (const key of Object.keys(overrideObj)) {
    const val = overrideObj[key];
    const baseVal = (base as Record<string, unknown>)[key];

    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      baseVal &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, val);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }

  return result as T;
}

/**
 * Get the active game configuration.
 * Reads from gameConfig table, falls back to DEFAULT_LTCG_CONFIG.
 *
 * Usage in any query/mutation:
 *   const config = await getGameConfig(ctx);
 *   const startingGold = config.economy.startingGold;
 */
export async function getGameConfig(ctx: QueryCtx | MutationCtx): Promise<LTCGConfig> {
  try {
    const row = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();

    if (!row) return DEFAULT_LTCG_CONFIG;

    const overrides = JSON.parse(row.config) as Partial<LTCGConfig>;
    return deepMerge(DEFAULT_LTCG_CONFIG, overrides);
  } catch {
    return DEFAULT_LTCG_CONFIG;
  }
}

/**
 * Update game configuration (admin only).
 * Merges partial updates into existing config.
 */
export async function setGameConfig(
  ctx: MutationCtx,
  updates: Partial<LTCGConfig>,
  updatedBy?: string
) {
  const existing = await ctx.db
    .query("gameConfig")
    .withIndex("by_key", (q) => q.eq("key", "active"))
    .first();

  const currentOverrides = existing ? (JSON.parse(existing.config) as Partial<LTCGConfig>) : {};
  const merged = deepMerge(currentOverrides, updates);

  if (existing) {
    await ctx.db.patch(existing._id, {
      config: JSON.stringify(merged),
      updatedAt: Date.now(),
      updatedBy,
    });
  } else {
    await ctx.db.insert("gameConfig", {
      key: "active" as const,
      config: JSON.stringify(merged),
      updatedAt: Date.now(),
      updatedBy,
    });
  }
}
