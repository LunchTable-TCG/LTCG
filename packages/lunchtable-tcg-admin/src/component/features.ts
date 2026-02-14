import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Check if a feature flag is enabled for a user.
 * Considers: enabled state, rollout percentage, targetUserIds, targetRoles.
 */
export const checkFeatureFlag = query({
  args: {
    name: v.string(),
    userId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!flag) return false;
    if (!flag.enabled) return false;

    // If no targeting, just check enabled
    if (!args.userId) return flag.enabled;

    // Check user targeting
    if (flag.targetUserIds && flag.targetUserIds.length > 0) {
      if (flag.targetUserIds.includes(args.userId)) return true;
      // If targeted users specified but this user isn't in the list, check rollout
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // Simple hash-based rollout
      const hash = simpleHash(args.userId + flag.name);
      return (hash % 100) < flag.rolloutPercentage;
    }

    return true;
  },
});

/**
 * List all feature flags, optionally filtered by category.
 */
export const listFeatureFlags = query({
  args: { category: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("featureFlags")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    }

    return await ctx.db.query("featureFlags").collect();
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new feature flag.
 */
export const createFeatureFlag = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    rolloutPercentage: v.optional(v.number()),
    targetUserIds: v.optional(v.array(v.string())),
    targetRoles: v.optional(v.array(v.string())),
    category: v.string(),
    updatedBy: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      throw new Error(`Feature flag "${args.name}" already exists`);
    }

    const id = await ctx.db.insert("featureFlags", {
      name: args.name,
      displayName: args.displayName,
      description: args.description,
      enabled: args.enabled,
      rolloutPercentage: args.rolloutPercentage,
      targetUserIds: args.targetUserIds,
      targetRoles: args.targetRoles,
      category: args.category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });
    return id;
  },
});

/**
 * Toggle a feature flag on/off.
 */
export const toggleFeatureFlag = mutation({
  args: {
    name: v.string(),
    enabled: v.boolean(),
    updatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!flag) {
      throw new Error(`Feature flag "${args.name}" not found`);
    }

    await ctx.db.patch(flag._id, {
      enabled: args.enabled,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });

    return null;
  },
});

/**
 * Update a feature flag's configuration.
 */
export const updateFeatureFlag = mutation({
  args: {
    name: v.string(),
    updates: v.object({
      displayName: v.optional(v.string()),
      description: v.optional(v.string()),
      enabled: v.optional(v.boolean()),
      rolloutPercentage: v.optional(v.number()),
      targetUserIds: v.optional(v.array(v.string())),
      targetRoles: v.optional(v.array(v.string())),
      category: v.optional(v.string()),
    }),
    updatedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (!flag) {
      throw new Error(`Feature flag "${args.name}" not found`);
    }

    await ctx.db.patch(flag._id, {
      ...args.updates,
      updatedAt: Date.now(),
      updatedBy: args.updatedBy,
    });

    return null;
  },
});

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Simple hash function for rollout percentage calculation.
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
