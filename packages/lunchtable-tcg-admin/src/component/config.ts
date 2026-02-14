import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const valueTypeValidator = v.union(
  v.literal("number"),
  v.literal("string"),
  v.literal("boolean"),
  v.literal("json"),
  v.literal("secret")
);

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single config value by key.
 */
export const getConfig = query({
  args: { key: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

/**
 * Get all configs in a category.
 */
export const getConfigsByCategory = query({
  args: { category: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("systemConfig")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update a single config value.
 */
export const updateConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    updatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!existing) {
      throw new Error(`Config key "${args.key}" not found`);
    }

    await ctx.db.patch(existing._id, {
      value: args.value,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });

    return null;
  },
});

/**
 * Bulk update multiple configs.
 */
export const bulkUpdateConfigs = mutation({
  args: {
    configs: v.array(
      v.object({
        key: v.string(),
        value: v.any(),
      })
    ),
    updatedBy: v.string(),
  },
  returns: v.object({
    updated: v.number(),
    notFound: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    let updated = 0;
    const notFound: string[] = [];

    for (const config of args.configs) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (!existing) {
        notFound.push(config.key);
        continue;
      }

      await ctx.db.patch(existing._id, {
        value: config.value,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
      updated++;
    }

    return { updated, notFound };
  },
});

/**
 * Seed default configs, skipping existing keys.
 */
export const seedDefaultConfigs = mutation({
  args: {
    configs: v.array(
      v.object({
        key: v.string(),
        value: v.any(),
        category: v.string(),
        displayName: v.string(),
        description: v.string(),
        valueType: valueTypeValidator,
        minValue: v.optional(v.number()),
        maxValue: v.optional(v.number()),
      })
    ),
    updatedBy: v.string(),
  },
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let skipped = 0;

    for (const config of args.configs) {
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", config.key))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("systemConfig", {
        ...config,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
      inserted++;
    }

    return { inserted, skipped };
  },
});
