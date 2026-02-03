/**
 * System Configuration Admin Module
 *
 * CRUD operations for managing system-wide configuration values.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types & Constants
// =============================================================================

interface ConfigDefinition {
  key: string;
  value: number | string | boolean | object;
  category: string;
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json";
  minValue?: number;
  maxValue?: number;
}

const DEFAULT_CONFIGS: ConfigDefinition[] = [
  // Economy
  {
    key: "economy.gold_per_win",
    value: 50,
    category: "economy",
    displayName: "Gold Per Win",
    description: "Gold awarded for winning a match",
    valueType: "number",
    minValue: 0,
    maxValue: 1000,
  },
  {
    key: "economy.gold_per_loss",
    value: 10,
    category: "economy",
    displayName: "Gold Per Loss",
    description: "Gold awarded for losing a match",
    valueType: "number",
    minValue: 0,
    maxValue: 500,
  },
  {
    key: "economy.daily_login_gold",
    value: 100,
    category: "economy",
    displayName: "Daily Login Gold",
    description: "Gold awarded for daily login",
    valueType: "number",
    minValue: 0,
    maxValue: 1000,
  },
  {
    key: "economy.marketplace_fee_percent",
    value: 5,
    category: "economy",
    displayName: "Marketplace Fee %",
    description: "Fee percentage for marketplace sales",
    valueType: "number",
    minValue: 0,
    maxValue: 50,
  },

  // Matchmaking
  {
    key: "matchmaking.elo_range_initial",
    value: 100,
    category: "matchmaking",
    displayName: "Initial ELO Range",
    description: "Starting ELO range for matchmaking",
    valueType: "number",
    minValue: 50,
    maxValue: 500,
  },
  {
    key: "matchmaking.elo_range_max",
    value: 500,
    category: "matchmaking",
    displayName: "Max ELO Range",
    description: "Maximum ELO range expansion",
    valueType: "number",
    minValue: 100,
    maxValue: 1000,
  },
  {
    key: "matchmaking.queue_timeout_seconds",
    value: 120,
    category: "matchmaking",
    displayName: "Queue Timeout",
    description: "Seconds before queue timeout",
    valueType: "number",
    minValue: 30,
    maxValue: 600,
  },

  // Gameplay
  {
    key: "gameplay.starting_life_points",
    value: 8000,
    category: "gameplay",
    displayName: "Starting LP",
    description: "Starting life points for matches",
    valueType: "number",
    minValue: 1000,
    maxValue: 20000,
  },
  {
    key: "gameplay.starting_hand_size",
    value: 5,
    category: "gameplay",
    displayName: "Starting Hand Size",
    description: "Cards drawn at game start",
    valueType: "number",
    minValue: 3,
    maxValue: 10,
  },
  {
    key: "gameplay.max_deck_size",
    value: 40,
    category: "gameplay",
    displayName: "Max Deck Size",
    description: "Maximum cards in a deck",
    valueType: "number",
    minValue: 20,
    maxValue: 60,
  },

  // Rate Limits
  {
    key: "rates.chat_messages_per_minute",
    value: 10,
    category: "rates",
    displayName: "Chat Rate Limit",
    description: "Max chat messages per minute",
    valueType: "number",
    minValue: 1,
    maxValue: 60,
  },
  {
    key: "rates.api_requests_per_minute",
    value: 100,
    category: "rates",
    displayName: "API Rate Limit",
    description: "Max API requests per minute",
    valueType: "number",
    minValue: 10,
    maxValue: 1000,
  },
];

// =============================================================================
// Queries
// =============================================================================

/**
 * List all system configs with optional category filter
 */
export const listConfigs = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let configs = await (async () => {
      if (args.category) {
        return await ctx.db
          .query("systemConfig")
          .withIndex("by_category", (q) => q.eq("category", args.category!))
          .collect();
      } else {
        return await ctx.db.query("systemConfig").collect();
      }
    })();

    type Config = typeof configs[number];

    // Sort by category then key
    configs.sort((a: Config, b: Config) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.key.localeCompare(b.key);
    });

    // Enrich with updatedBy user info
    const enrichedConfigs = await Promise.all(
      configs.map(async (config: Config) => {
        const updatedByUser = await ctx.db.get(config.updatedBy);
        return {
          ...config,
          updatedByUsername: (updatedByUser as any)?.username ?? (updatedByUser as any)?.email ?? "Unknown",
        };
      })
    );

    return {
      configs: enrichedConfigs,
      totalCount: configs.length,
    };
  },
});

/**
 * Get a single config by key
 */
export const getConfig = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, { key }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!config) return null;

    const updatedByUser = await ctx.db.get(config.updatedBy);

    return {
      ...config,
      updatedByUsername: updatedByUser?.username ?? updatedByUser?.email ?? "Unknown",
    };
  },
});

/**
 * Get just the value for a config key (for client use)
 * This is a lighter-weight query for fetching config values in game code
 */
export const getConfigValue = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, { key }) => {
    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!config) {
      // Return default value if not found
      const defaultConfig = DEFAULT_CONFIGS.find((c) => c.key === key);
      return defaultConfig?.value ?? null;
    }

    return config.value;
  },
});

/**
 * Get config statistics
 */
export const getConfigStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const configs = await ctx.db.query("systemConfig").collect();

    // Group by category
    const byCategory: Record<string, number> = {};
    for (const config of configs) {
      byCategory[config.category] = (byCategory[config.category] || 0) + 1;
    }

    return {
      totalConfigs: configs.length,
      byCategory,
      defaultCount: DEFAULT_CONFIGS.length,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update a single config value
 */
export const updateConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!config) {
      throw new Error(`Config key "${args.key}" not found`);
    }

    // Validate value based on type
    if (config.valueType === "number") {
      if (typeof args.value !== "number") {
        throw new Error(`Config "${args.key}" requires a number value`);
      }
      if (config.minValue !== undefined && args.value < config.minValue) {
        throw new Error(`Config "${args.key}" value must be at least ${config.minValue}`);
      }
      if (config.maxValue !== undefined && args.value > config.maxValue) {
        throw new Error(`Config "${args.key}" value must be at most ${config.maxValue}`);
      }
    } else if (config.valueType === "boolean") {
      if (typeof args.value !== "boolean") {
        throw new Error(`Config "${args.key}" requires a boolean value`);
      }
    } else if (config.valueType === "string") {
      if (typeof args.value !== "string") {
        throw new Error(`Config "${args.key}" requires a string value`);
      }
    }
    // JSON type accepts any value

    const previousValue = config.value;

    await ctx.db.patch(config._id, {
      value: args.value,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_config",
      metadata: {
        key: args.key,
        previousValue,
        newValue: args.value,
        category: config.category,
      },
      success: true,
    });

    return {
      success: true,
      message: `Updated config "${config.displayName}"`,
    };
  },
});

/**
 * Update multiple configs at once
 */
export const bulkUpdateConfigs = mutation({
  args: {
    updates: v.array(
      v.object({
        key: v.string(),
        value: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    if (args.updates.length === 0) {
      throw new Error("No updates provided");
    }

    if (args.updates.length > 50) {
      throw new Error("Maximum 50 updates per batch");
    }

    const results: { key: string; success: boolean; error?: string }[] = [];
    const auditChanges: {
      key: string;
      previousValue: unknown;
      newValue: unknown;
    }[] = [];

    for (const update of args.updates) {
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", update.key))
        .unique();

      if (!config) {
        results.push({ key: update.key, success: false, error: "Not found" });
        continue;
      }

      // Validate value
      let isValid = true;
      let errorMessage = "";

      if (config.valueType === "number") {
        if (typeof update.value !== "number") {
          isValid = false;
          errorMessage = "Requires number value";
        } else if (config.minValue !== undefined && update.value < config.minValue) {
          isValid = false;
          errorMessage = `Must be at least ${config.minValue}`;
        } else if (config.maxValue !== undefined && update.value > config.maxValue) {
          isValid = false;
          errorMessage = `Must be at most ${config.maxValue}`;
        }
      } else if (config.valueType === "boolean") {
        if (typeof update.value !== "boolean") {
          isValid = false;
          errorMessage = "Requires boolean value";
        }
      } else if (config.valueType === "string") {
        if (typeof update.value !== "string") {
          isValid = false;
          errorMessage = "Requires string value";
        }
      }

      if (!isValid) {
        results.push({ key: update.key, success: false, error: errorMessage });
        continue;
      }

      const previousValue = config.value;

      await ctx.db.patch(config._id, {
        value: update.value,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });

      auditChanges.push({
        key: update.key,
        previousValue,
        newValue: update.value,
      });

      results.push({ key: update.key, success: true });
    }

    const successCount = results.filter((r) => r.success).length;

    if (auditChanges.length > 0) {
      await scheduleAuditLog(ctx, {
        adminId,
        action: "bulk_update_configs",
        metadata: {
          totalRequested: args.updates.length,
          successCount,
          changes: auditChanges,
        },
        success: true,
      });
    }

    return {
      success: successCount > 0,
      results,
      message: `Updated ${successCount} of ${args.updates.length} configs`,
    };
  },
});

/**
 * Reset a config to its default value
 */
export const resetToDefault = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, { key }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!config) {
      throw new Error(`Config key "${key}" not found`);
    }

    const defaultConfig = DEFAULT_CONFIGS.find((c) => c.key === key);
    if (!defaultConfig) {
      throw new Error(`No default value found for config "${key}"`);
    }

    const previousValue = config.value;

    await ctx.db.patch(config._id, {
      value: defaultConfig.value,
      updatedAt: Date.now(),
      updatedBy: adminId,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "reset_config_to_default",
      metadata: {
        key,
        previousValue,
        defaultValue: defaultConfig.value,
      },
      success: true,
    });

    return {
      success: true,
      message: `Reset "${config.displayName}" to default value`,
      defaultValue: defaultConfig.value,
    };
  },
});

/**
 * Seed default configs (internal mutation)
 * Creates any missing default configs
 */
export const seedDefaultConfigs = internalMutation({
  args: {
    adminId: v.id("users"),
  },
  handler: async (ctx, { adminId }) => {
    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const configDef of DEFAULT_CONFIGS) {
      // Check if config already exists
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", configDef.key))
        .unique();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create the config
      await ctx.db.insert("systemConfig", {
        key: configDef.key,
        value: configDef.value,
        category: configDef.category,
        displayName: configDef.displayName,
        description: configDef.description,
        valueType: configDef.valueType,
        minValue: configDef.minValue,
        maxValue: configDef.maxValue,
        updatedAt: now,
        updatedBy: adminId,
      });

      createdCount++;
    }

    return {
      success: true,
      createdCount,
      skippedCount,
      message: `Created ${createdCount} configs, skipped ${skippedCount} existing`,
    };
  },
});

/**
 * Admin-facing mutation to seed default configs
 */
export const initializeDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const configDef of DEFAULT_CONFIGS) {
      // Check if config already exists
      const existing = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", configDef.key))
        .unique();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create the config
      await ctx.db.insert("systemConfig", {
        key: configDef.key,
        value: configDef.value,
        category: configDef.category,
        displayName: configDef.displayName,
        description: configDef.description,
        valueType: configDef.valueType,
        minValue: configDef.minValue,
        maxValue: configDef.maxValue,
        updatedAt: now,
        updatedBy: adminId,
      });

      createdCount++;
    }

    if (createdCount > 0) {
      await scheduleAuditLog(ctx, {
        adminId,
        action: "initialize_default_configs",
        metadata: {
          createdCount,
          skippedCount,
        },
        success: true,
      });
    }

    return {
      success: true,
      createdCount,
      skippedCount,
      message:
        createdCount > 0
          ? `Created ${createdCount} configs, skipped ${skippedCount} existing`
          : "All default configs already exist",
    };
  },
});
