import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getGameConfig, setGameConfig } from "../lib/gameConfig";

/**
 * Get the current active game configuration.
 * Returns the merged config (DB overrides + package defaults).
 */
export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await getGameConfig(ctx);
  },
});

/**
 * Update game configuration at runtime.
 * Accepts a JSON-serialized Partial<LTCGConfig> and merges it with existing overrides.
 */
export const updateConfig = mutation({
  args: {
    updates: v.string(), // JSON-serialized Partial<LTCGConfig>
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin role check via admin component
    const updates = JSON.parse(args.updates);
    await setGameConfig(ctx, updates, args.updatedBy);
  },
});

/**
 * Reset game configuration to package defaults.
 * Deletes the override row, reverting to DEFAULT_LTCG_CONFIG.
 */
export const resetConfig = mutation({
  args: {},
  handler: async (ctx) => {
    // TODO: Add admin role check
    const row = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});
