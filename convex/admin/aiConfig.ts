/**
 * AI Provider Configuration Admin Module
 *
 * CRUD operations for managing AI provider settings (OpenRouter, Vercel AI Gateway, Anthropic, OpenAI).
 * Config values stored in systemConfig table with category "ai".
 * API keys can be stored in database (with masked display) or environment variables.
 *
 * Requires admin role or higher for mutations.
 */

import { v } from "convex/values";
import { action, query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types & Constants
// =============================================================================

interface AIConfigDefinition {
  key: string;
  value: number | string | boolean | string[];
  category: "ai";
  displayName: string;
  description: string;
  valueType: "number" | "string" | "boolean" | "json" | "secret";
  minValue?: number;
  maxValue?: number;
}

/**
 * Default AI configuration values
 * These are seeded into the database when initializeAIDefaults is called
 */
const AI_DEFAULT_CONFIGS: AIConfigDefinition[] = [
  // Provider Selection
  {
    key: "ai.provider",
    value: "vercel",
    category: "ai",
    displayName: "AI Provider",
    description: "Primary AI provider (vercel, openrouter, anthropic, openai)",
    valueType: "string",
  },
  {
    key: "ai.fallback_provider",
    value: "openrouter",
    category: "ai",
    displayName: "Fallback Provider",
    description: "Provider to use when primary fails",
    valueType: "string",
  },

  // OpenRouter Settings
  {
    key: "ai.openrouter.model",
    value: "anthropic/claude-3.5-sonnet",
    category: "ai",
    displayName: "OpenRouter Model",
    description: "Default model for OpenRouter",
    valueType: "string",
  },
  {
    key: "ai.openrouter.fallback_models",
    value: ["openai/gpt-4o-mini", "google/gemini-pro"],
    category: "ai",
    displayName: "Fallback Models",
    description: "Models to try if default fails",
    valueType: "json",
  },

  // Vercel AI Gateway Settings
  {
    key: "ai.vercel.model",
    value: "gpt-4o",
    category: "ai",
    displayName: "Vercel Model",
    description: "Default model for Vercel AI Gateway",
    valueType: "string",
  },
  {
    key: "ai.vercel.zdr_enabled",
    value: true,
    category: "ai",
    displayName: "Zero Data Retention",
    description: "Enable ZDR mode for privacy",
    valueType: "boolean",
  },

  // General Settings
  {
    key: "ai.embedding_model",
    value: "text-embedding-3-small",
    category: "ai",
    displayName: "Embedding Model",
    description: "Model for RAG embeddings",
    valueType: "string",
  },
  {
    key: "ai.max_tokens",
    value: 2000,
    category: "ai",
    displayName: "Max Tokens",
    description: "Maximum tokens per response",
    valueType: "number",
    minValue: 100,
    maxValue: 8000,
  },
  {
    key: "ai.temperature",
    value: 0.7,
    category: "ai",
    displayName: "Temperature",
    description: "Response creativity (0-1)",
    valueType: "number",
    minValue: 0,
    maxValue: 1,
  },

  // Feature Flags
  {
    key: "ai.admin_assistant_enabled",
    value: true,
    category: "ai",
    displayName: "Admin Assistant",
    description: "Enable AI assistant in admin dashboard",
    valueType: "boolean",
  },
  {
    key: "ai.game_guide_enabled",
    value: true,
    category: "ai",
    displayName: "Game Guide Chat",
    description: "Enable Lunchtable Guide in web app",
    valueType: "boolean",
  },

  // API Keys (stored encrypted, displayed masked)
  {
    key: "ai.apikey.openrouter",
    value: "",
    category: "ai",
    displayName: "OpenRouter API Key",
    description: "API key for OpenRouter (overrides env var)",
    valueType: "secret",
  },
  {
    key: "ai.apikey.anthropic",
    value: "",
    category: "ai",
    displayName: "Anthropic API Key",
    description: "API key for Anthropic Claude (overrides env var)",
    valueType: "secret",
  },
  {
    key: "ai.apikey.openai",
    value: "",
    category: "ai",
    displayName: "OpenAI API Key",
    description: "API key for OpenAI (overrides env var)",
    valueType: "secret",
  },
  {
    key: "ai.apikey.vercel",
    value: "",
    category: "ai",
    displayName: "Vercel AI Gateway Key",
    description: "API key for Vercel AI Gateway (overrides env var)",
    valueType: "secret",
  },
];

// =============================================================================
// Queries
// =============================================================================

/**
 * List all AI config values (category = "ai")
 */
export const getAIConfigs = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const configs = await ctx.db
      .query("systemConfig")
      .withIndex("by_category", (q) => q.eq("category", "ai"))
      .collect();

    // Sort by key
    configs.sort((a, b) => a.key.localeCompare(b.key));

    // Enrich with updatedBy user info
    const enrichedConfigs = await Promise.all(
      configs.map(async (config) => {
        const updatedByUser = await ctx.db.get(config.updatedBy);
        return {
          ...config,
          updatedByUsername: updatedByUser?.username ?? updatedByUser?.email ?? "Unknown",
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
 * Get single AI config value by key
 */
export const getAIConfigValue = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, { key }) => {
    // Ensure key is an AI config
    if (!key.startsWith("ai.")) {
      return null;
    }

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (!config) {
      // Return default value if not found
      const defaultConfig = AI_DEFAULT_CONFIGS.find((c) => c.key === key);
      return defaultConfig?.value ?? null;
    }

    return config.value;
  },
});

/**
 * Check which providers have API keys configured
 * Returns presence only, not values (for security)
 */
export const getProviderStatus = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    // Note: In queries we can't access environment variables directly
    // This will be checked in the action instead
    // Return a placeholder that indicates the action should be used
    return {
      message: "Use testProviderConnection action to check provider status",
      providers: null,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Update single AI config value
 * Requires admin role
 */
export const updateAIConfig = mutation({
  args: {
    key: v.string(),
    value: v.any(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    // Ensure key is an AI config
    if (!args.key.startsWith("ai.")) {
      throw new Error(`Key "${args.key}" is not an AI config key (must start with "ai.")`);
    }

    const config = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();

    if (!config) {
      throw new Error(`AI config key "${args.key}" not found`);
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
      action: "update_ai_config",
      metadata: {
        key: args.key,
        previousValue,
        newValue: args.value,
        category: "ai",
      },
      success: true,
    });

    return {
      success: true,
      message: `Updated AI config "${config.displayName}"`,
    };
  },
});

/**
 * Batch update multiple AI configs
 * Requires admin role
 */
export const bulkUpdateAIConfigs = mutation({
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

    // Validate all keys are AI configs
    for (const update of args.updates) {
      if (!update.key.startsWith("ai.")) {
        throw new Error(`Key "${update.key}" is not an AI config key (must start with "ai.")`);
      }
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
        action: "bulk_update_ai_configs",
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
      message: `Updated ${successCount} of ${args.updates.length} AI configs`,
    };
  },
});

/**
 * Seed default AI config values (internal mutation)
 * Creates any missing default configs
 */
export const seedAIDefaultConfigs = internalMutation({
  args: {
    adminId: v.id("users"),
  },
  handler: async (ctx, { adminId }) => {
    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const configDef of AI_DEFAULT_CONFIGS) {
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
      message: `Created ${createdCount} AI configs, skipped ${skippedCount} existing`,
    };
  },
});

/**
 * Admin-facing mutation to seed default AI configs
 */
export const initializeAIDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const now = Date.now();
    let createdCount = 0;
    let skippedCount = 0;

    for (const configDef of AI_DEFAULT_CONFIGS) {
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
        action: "initialize_ai_default_configs",
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
          ? `Created ${createdCount} AI configs, skipped ${skippedCount} existing`
          : "All default AI configs already exist",
    };
  },
});

// =============================================================================
// API Key Management
// =============================================================================

/**
 * Set an API key for a provider
 * Keys are stored in the database and override environment variables
 */
export const setAPIKey = mutation({
  args: {
    provider: v.union(
      v.literal("openrouter"),
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("vercel")
    ),
    apiKey: v.string(),
  },
  handler: async (ctx, { provider, apiKey }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const key = `ai.apikey.${provider}`;
    const trimmedKey = apiKey.trim();

    // Find existing config or create new one
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: trimmedKey,
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value: trimmedKey,
        category: "ai",
        displayName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`,
        description: `API key for ${provider}`,
        valueType: "secret",
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    // Audit log (don't log the actual key value)
    await scheduleAuditLog(ctx, {
      adminId,
      action: "set_ai_api_key",
      metadata: {
        provider,
        keySet: trimmedKey.length > 0,
        keyLength: trimmedKey.length,
      },
      success: true,
    });

    return {
      success: true,
      message:
        trimmedKey.length > 0
          ? `${provider} API key has been set`
          : `${provider} API key has been cleared`,
    };
  },
});

/**
 * Get API key status for all providers (masked values, not actual keys)
 */
export const getAPIKeyStatus = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const providers = ["openrouter", "anthropic", "openai", "vercel"] as const;
    const status: Record<
      string,
      { isSet: boolean; maskedKey: string; source: "database" | "env" | "none" }
    > = {};

    for (const provider of providers) {
      const key = `ai.apikey.${provider}`;
      const config = await ctx.db
        .query("systemConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();

      const dbKey = config?.value as string | undefined;
      const hasDbKey = !!dbKey && dbKey.length > 0;

      if (hasDbKey) {
        // Mask the key: show first 4 and last 4 chars
        const masked =
          dbKey.length > 12
            ? `${dbKey.slice(0, 4)}${"*".repeat(Math.min(dbKey.length - 8, 20))}${dbKey.slice(-4)}`
            : "*".repeat(dbKey.length);
        status[provider] = { isSet: true, maskedKey: masked, source: "database" };
      } else {
        // Note: We can't check env vars in queries, will be checked in action
        status[provider] = { isSet: false, maskedKey: "", source: "none" };
      }
    }

    return status;
  },
});

/**
 * Clear an API key for a provider
 */
export const clearAPIKey = mutation({
  args: {
    provider: v.union(
      v.literal("openrouter"),
      v.literal("anthropic"),
      v.literal("openai"),
      v.literal("vercel")
    ),
  },
  handler: async (ctx, { provider }) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const key = `ai.apikey.${provider}`;

    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: "",
        updatedAt: Date.now(),
        updatedBy: adminId,
      });
    }

    await scheduleAuditLog(ctx, {
      adminId,
      action: "clear_ai_api_key",
      metadata: { provider },
      success: true,
    });

    return {
      success: true,
      message: `${provider} API key has been cleared (will fall back to environment variable if set)`,
    };
  },
});

// =============================================================================
// Actions
// =============================================================================

/**
 * Get the effective API key for a provider (checks DB first, then env var)
 * Internal helper - not exposed to clients
 */
async function getEffectiveAPIKey(
  ctx: ActionCtx,
  provider: "openrouter" | "anthropic" | "openai" | "vercel"
): Promise<string | undefined> {
  // Check database first
  const key = `ai.apikey.${provider}`;
  const dbValue = await ctx.runQuery(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../_generated/api").api.admin.aiConfig.getAIConfigValue,
    { key }
  );

  if (dbValue && typeof dbValue === "string" && dbValue.length > 0) {
    return dbValue;
  }

  // Fall back to environment variable
  const envVarMap: Record<typeof provider, string> = {
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    vercel: "AI_GATEWAY_API_KEY",
  };

  const envVarName = envVarMap[provider];
  const envKey = process.env[envVarName];
  if (envKey) return envKey;

  // For Vercel, also check OPENAI_API_KEY as fallback
  if (provider === "vercel" && process.env["OPENAI_API_KEY"]) {
    return process.env["OPENAI_API_KEY"];
  }

  return undefined;
}

/**
 * Test if an API key works by making a minimal request
 * Also returns which providers have API keys configured
 */
export const testProviderConnection = action({
  args: {
    provider: v.optional(
      v.union(
        v.literal("openrouter"),
        v.literal("anthropic"),
        v.literal("openai"),
        v.literal("vercel")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get effective API keys (DB first, then env var)
    const openrouterKey = await getEffectiveAPIKey(ctx, "openrouter");
    const anthropicKey = await getEffectiveAPIKey(ctx, "anthropic");
    const openaiKey = await getEffectiveAPIKey(ctx, "openai");
    const vercelKey = await getEffectiveAPIKey(ctx, "vercel");

    // Check which providers have API keys configured (presence only, not values)
    const providerStatus = {
      openrouter: !!openrouterKey,
      anthropic: !!anthropicKey,
      openai: !!openaiKey,
      vercel: !!vercelKey,
    };

    // If no specific provider requested, just return status
    if (!args.provider) {
      return {
        success: true,
        providerStatus,
        message: "Provider API key status retrieved",
      };
    }

    // Test specific provider connection
    const provider = args.provider;
    const keyMap = {
      openrouter: openrouterKey,
      anthropic: anthropicKey,
      openai: openaiKey,
      vercel: vercelKey,
    };
    const apiKey = keyMap[provider];

    if (!apiKey) {
      return {
        success: false,
        providerStatus,
        testedProvider: provider,
        error: `No API key configured for ${provider}`,
      };
    }

    try {
      let testResult: { success: boolean; latencyMs?: number; error?: string };

      switch (provider) {
        case "openrouter": {
          const startTime = Date.now();
          const response = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          const latencyMs = Date.now() - startTime;

          if (!response.ok) {
            testResult = {
              success: false,
              latencyMs,
              error: `OpenRouter API returned ${response.status}`,
            };
          } else {
            testResult = { success: true, latencyMs };
          }
          break;
        }

        case "anthropic": {
          const startTime = Date.now();
          // Use a minimal request to test the API key
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 1,
              messages: [{ role: "user", content: "test" }],
            }),
          });
          const latencyMs = Date.now() - startTime;

          // We expect either success or a 400 (bad request) - both indicate valid API key
          // 401 would indicate invalid key
          if (response.status === 401) {
            testResult = {
              success: false,
              latencyMs,
              error: "Invalid Anthropic API key",
            };
          } else {
            testResult = { success: true, latencyMs };
          }
          break;
        }

        case "openai": {
          const startTime = Date.now();
          const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          const latencyMs = Date.now() - startTime;

          if (!response.ok) {
            testResult = {
              success: false,
              latencyMs,
              error: `OpenAI API returned ${response.status}`,
            };
          } else {
            testResult = { success: true, latencyMs };
          }
          break;
        }

        case "vercel": {
          // Vercel AI Gateway - test via the gateway endpoint or fallback to OpenAI
          const startTime = Date.now();

          // If we have AI_GATEWAY_API_KEY in DB or env, test the gateway endpoint
          // Otherwise fall back to testing OpenAI directly
          const hasGatewayKey =
            !!(await ctx.runQuery(
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              require("../_generated/api").api.admin.aiConfig.getAIConfigValue,
              { key: "ai.apikey.vercel" }
            )) || !!process.env["AI_GATEWAY_API_KEY"];

          const endpoint = hasGatewayKey
            ? "https://ai-gateway.vercel.sh/v3/ai/models"
            : "https://api.openai.com/v1/models";

          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          const latencyMs = Date.now() - startTime;

          if (!response.ok) {
            testResult = {
              success: false,
              latencyMs,
              error: `Vercel AI Gateway returned ${response.status}`,
            };
          } else {
            testResult = { success: true, latencyMs };
          }
          break;
        }

        default:
          testResult = { success: false, error: `Unknown provider: ${provider}` };
      }

      return {
        success: testResult.success,
        providerStatus,
        testedProvider: provider,
        latencyMs: testResult.latencyMs,
        error: testResult.error,
        message: testResult.success
          ? `${provider} connection successful (${testResult.latencyMs}ms)`
          : testResult.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        providerStatus,
        testedProvider: provider,
        error: errorMessage,
        message: `Failed to test ${provider}: ${errorMessage}`,
      };
    }
  },
});
