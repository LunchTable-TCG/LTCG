/**
 * Feature Flags Admin Module
 *
 * CRUD operations for managing feature flags.
 * Supports gradual rollout, user targeting, and role-based targeting.
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { getUserRole, requireRole } from "../lib/roles";

// Category validator
const categoryValidator = v.union(
  v.literal("gameplay"),
  v.literal("economy"),
  v.literal("social"),
  v.literal("experimental")
);

// =============================================================================
// Queries
// =============================================================================

/**
 * List all feature flags with optional category filter
 */
export const listFeatureFlags = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const flags = await (async () => {
      if (args.category) {
        return await ctx.db
          .query("featureFlags")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect();
      }
      return await ctx.db.query("featureFlags").collect();
    })();

    type Flag = (typeof flags)[number];

    // Sort by category then name
    flags.sort((a: Flag, b: Flag) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    // Get updater usernames
    const flagsWithUpdater = await Promise.all(
      flags.map(async (flag: Flag) => {
        const updater = await ctx.db.get(flag.updatedBy);
        return {
          ...flag,
          updatedByUsername: (updater as any)?.username || (updater as any)?.name || "Unknown",
        };
      })
    );

    return {
      flags: flagsWithUpdater,
      totalCount: flags.length,
    };
  },
});

/**
 * Get a single feature flag by ID
 */
export const getFeatureFlag = query({
  args: {
    featureFlagId: v.id("featureFlags"),
  },
  handler: async (ctx, { featureFlagId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const flag = await ctx.db.get(featureFlagId);
    if (!flag) return null;

    const updater = await ctx.db.get(flag.updatedBy);

    // Get target user details if any
    let targetUsers: Array<{ _id: string; username: string }> = [];
    if (flag.targetUserIds && flag.targetUserIds.length > 0) {
      const users = await Promise.all(flag.targetUserIds.map((id) => ctx.db.get(id)));
      targetUsers = users
        .filter((u) => u !== null)
        .map((u) => ({
          _id: u?._id,
          username: u?.username || u?.name || "Unknown",
        }));
    }

    return {
      ...flag,
      updatedByUsername: updater?.username || updater?.name || "Unknown",
      targetUsers,
    };
  },
});

/**
 * Get feature flag statistics
 */
export const getFeatureFlagStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const flags = await ctx.db.query("featureFlags").collect();

    const enabledFlags = flags.filter((f) => f.enabled);
    const disabledFlags = flags.filter((f) => !f.enabled);
    const gradualRolloutFlags = flags.filter(
      (f) =>
        f.rolloutPercentage !== undefined && f.rolloutPercentage > 0 && f.rolloutPercentage < 100
    );

    // Count by category
    const byCategory: Record<string, number> = {};
    for (const flag of flags) {
      byCategory[flag.category] = (byCategory[flag.category] || 0) + 1;
    }

    return {
      totalFlags: flags.length,
      enabledFlags: enabledFlags.length,
      disabledFlags: disabledFlags.length,
      gradualRolloutFlags: gradualRolloutFlags.length,
      byCategory,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new feature flag
 */
export const createFeatureFlag = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    enabled: v.boolean(),
    rolloutPercentage: v.optional(v.number()),
    targetUserIds: v.optional(v.array(v.id("users"))),
    targetRoles: v.optional(v.array(v.string())),
    category: categoryValidator,
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Normalize name to snake_case
    const normalizedName = args.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    // Check for duplicate name
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
      .first();

    if (existing) {
      throw new Error(`Feature flag "${normalizedName}" already exists`);
    }

    // Validate rollout percentage
    if (args.rolloutPercentage !== undefined) {
      if (args.rolloutPercentage < 0 || args.rolloutPercentage > 100) {
        throw new Error("Rollout percentage must be between 0 and 100");
      }
    }

    const now = Date.now();
    const featureFlagId = await ctx.db.insert("featureFlags", {
      name: normalizedName,
      displayName: args.displayName.trim(),
      description: args.description.trim(),
      enabled: args.enabled,
      rolloutPercentage: args.rolloutPercentage,
      targetUserIds: args.targetUserIds,
      targetRoles: args.targetRoles,
      category: args.category,
      createdAt: now,
      updatedAt: now,
      updatedBy: adminId,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_feature_flag",
      metadata: {
        featureFlagId,
        name: normalizedName,
        displayName: args.displayName,
        category: args.category,
        enabled: args.enabled,
      },
      success: true,
    });

    return {
      featureFlagId,
      name: normalizedName,
      message: `Created feature flag "${normalizedName}"`,
    };
  },
});

/**
 * Update an existing feature flag
 */
export const updateFeatureFlag = mutation({
  args: {
    featureFlagId: v.id("featureFlags"),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    rolloutPercentage: v.optional(v.number()),
    targetUserIds: v.optional(v.array(v.id("users"))),
    targetRoles: v.optional(v.array(v.string())),
    category: v.optional(categoryValidator),
    // Clear optional fields
    clearRolloutPercentage: v.optional(v.boolean()),
    clearTargetUserIds: v.optional(v.boolean()),
    clearTargetRoles: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const flag = await ctx.db.get(args.featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }

    // Validate rollout percentage
    if (args.rolloutPercentage !== undefined) {
      if (args.rolloutPercentage < 0 || args.rolloutPercentage > 100) {
        throw new Error("Rollout percentage must be between 0 and 100");
      }
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
      updatedBy: adminId,
    };

    if (args.displayName !== undefined) updates["displayName"] = args.displayName.trim();
    if (args.description !== undefined) updates["description"] = args.description.trim();
    if (args.enabled !== undefined) updates["enabled"] = args.enabled;
    if (args.category !== undefined) updates["category"] = args.category;

    // Handle clearing optional fields
    if (args.clearRolloutPercentage) {
      updates["rolloutPercentage"] = undefined;
    } else if (args.rolloutPercentage !== undefined) {
      updates["rolloutPercentage"] = args.rolloutPercentage;
    }

    if (args.clearTargetUserIds) {
      updates["targetUserIds"] = undefined;
    } else if (args.targetUserIds !== undefined) {
      updates["targetUserIds"] = args.targetUserIds;
    }

    if (args.clearTargetRoles) {
      updates["targetRoles"] = undefined;
    } else if (args.targetRoles !== undefined) {
      updates["targetRoles"] = args.targetRoles;
    }

    await ctx.db.patch(args.featureFlagId, updates);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_feature_flag",
      metadata: {
        featureFlagId: args.featureFlagId,
        name: flag.name,
        updates: Object.keys(updates).filter((k) => k !== "updatedAt" && k !== "updatedBy"),
      },
      success: true,
    });

    return { success: true, message: `Updated feature flag "${flag.name}"` };
  },
});

/**
 * Quick enable/disable toggle for a feature flag
 */
export const toggleFeatureFlag = mutation({
  args: {
    featureFlagId: v.id("featureFlags"),
  },
  handler: async (ctx, { featureFlagId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const flag = await ctx.db.get(featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }

    const newStatus = !flag.enabled;
    await ctx.db.patch(featureFlagId, {
      enabled: newStatus,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: newStatus ? "enable_feature_flag" : "disable_feature_flag",
      metadata: {
        featureFlagId,
        name: flag.name,
        previousStatus: flag.enabled,
        newStatus,
      },
      success: true,
    });

    return {
      success: true,
      enabled: newStatus,
      message: `Feature flag "${flag.name}" is now ${newStatus ? "enabled" : "disabled"}`,
    };
  },
});

/**
 * Delete a feature flag permanently (superadmin only)
 */
export const deleteFeatureFlag = mutation({
  args: {
    featureFlagId: v.id("featureFlags"),
  },
  handler: async (ctx, { featureFlagId }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "superadmin");

    const flag = await ctx.db.get(featureFlagId);
    if (!flag) {
      throw new Error("Feature flag not found");
    }

    await ctx.db.delete(featureFlagId);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "delete_feature_flag",
      metadata: {
        featureFlagId,
        name: flag.name,
        displayName: flag.displayName,
        category: flag.category,
      },
      success: true,
    });

    return { success: true, message: `Permanently deleted feature flag "${flag.name}"` };
  },
});

/**
 * Check if a feature flag is enabled for a specific user
 * This is intended for client-side feature checking
 */
export const checkFeatureFlag = query({
  args: {
    flagName: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Get the flag by name
    const flag = await ctx.db
      .query("featureFlags")
      .withIndex("by_name", (q) => q.eq("name", args.flagName))
      .first();

    if (!flag) {
      // Flag doesn't exist, default to disabled
      return { enabled: false, reason: "flag_not_found" };
    }

    // If flag is globally disabled, return false
    if (!flag.enabled) {
      return { enabled: false, reason: "globally_disabled" };
    }

    // If no user specified, just check global enabled status
    if (!args.userId) {
      return { enabled: true, reason: "globally_enabled" };
    }

    // Check if user is in target user list
    if (flag.targetUserIds && flag.targetUserIds.length > 0) {
      if (flag.targetUserIds.includes(args.userId)) {
        return { enabled: true, reason: "user_targeted" };
      }
    }

    // Check if user has a target role
    if (flag.targetRoles && flag.targetRoles.length > 0) {
      const userRole = await getUserRole(ctx, args.userId);
      if (flag.targetRoles.includes(userRole)) {
        return { enabled: true, reason: "role_targeted" };
      }
    }

    // Check rollout percentage (deterministic based on user ID)
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
      // Create a deterministic hash from user ID and flag name
      const hashInput = `${args.userId}:${flag.name}`;
      let hash = 0;
      for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      // Convert to percentage (0-100)
      const userPercentile = Math.abs(hash % 100);

      if (userPercentile < flag.rolloutPercentage) {
        return { enabled: true, reason: "rollout_percentage" };
      }
    }

    // If we have targeting configured but user doesn't match, disable for them
    const hasTargeting =
      (flag.targetUserIds && flag.targetUserIds.length > 0) ||
      (flag.targetRoles && flag.targetRoles.length > 0) ||
      (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100);

    if (hasTargeting) {
      return { enabled: false, reason: "not_in_target" };
    }

    // No targeting configured, flag is enabled globally
    return { enabled: true, reason: "globally_enabled" };
  },
});

/**
 * Bulk check multiple feature flags for a user
 */
export const checkFeatureFlags = query({
  args: {
    flagNames: v.array(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const results: Record<string, { enabled: boolean; reason: string }> = {};

    for (const flagName of args.flagNames) {
      const flag = await ctx.db
        .query("featureFlags")
        .withIndex("by_name", (q) => q.eq("name", flagName))
        .first();

      if (!flag) {
        results[flagName] = { enabled: false, reason: "flag_not_found" };
        continue;
      }

      if (!flag.enabled) {
        results[flagName] = { enabled: false, reason: "globally_disabled" };
        continue;
      }

      if (!args.userId) {
        results[flagName] = { enabled: true, reason: "globally_enabled" };
        continue;
      }

      // Check targeting
      let isEnabled = false;
      let reason = "not_in_target";

      if (flag.targetUserIds?.includes(args.userId)) {
        isEnabled = true;
        reason = "user_targeted";
      } else if (flag.targetRoles && flag.targetRoles.length > 0) {
        const userRole = await getUserRole(ctx, args.userId);
        if (flag.targetRoles.includes(userRole)) {
          isEnabled = true;
          reason = "role_targeted";
        }
      }

      if (!isEnabled && flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
        const hashInput = `${args.userId}:${flag.name}`;
        let hash = 0;
        for (let i = 0; i < hashInput.length; i++) {
          const char = hashInput.charCodeAt(i);
          hash = (hash << 5) - hash + char;
          hash = hash & hash;
        }
        const userPercentile = Math.abs(hash % 100);
        if (userPercentile < flag.rolloutPercentage) {
          isEnabled = true;
          reason = "rollout_percentage";
        }
      }

      const hasTargeting =
        (flag.targetUserIds && flag.targetUserIds.length > 0) ||
        (flag.targetRoles && flag.targetRoles.length > 0) ||
        (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100);

      if (!isEnabled && !hasTargeting) {
        isEnabled = true;
        reason = "globally_enabled";
      }

      results[flagName] = { enabled: isEnabled, reason };
    }

    return results;
  },
});
