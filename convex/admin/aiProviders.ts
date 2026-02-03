/**
 * AI Provider Management
 *
 * Actions for fetching models from OpenRouter and Vercel AI Gateway.
 * Supports listing all models with pricing, filtering by type, and testing connections.
 */

import { v } from "convex/values";
import { action, mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types
// =============================================================================

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
}

interface VercelModel {
  id: string;
  name: string;
  description?: string;
  type: "language" | "embedding" | "image";
  context_window: number;
  max_tokens: number;
  owned_by: string;
  tags?: string[];
  pricing?: {
    input?: string;
    output?: string;
    image?: string;
  };
}

interface NormalizedModel {
  id: string;
  name: string;
  description?: string;
  provider: "openrouter" | "vercel";
  type: "language" | "embedding" | "image";
  contextLength: number;
  maxOutputTokens?: number;
  pricing: {
    inputPerToken?: string;
    outputPerToken?: string;
    perImage?: string;
    perRequest?: string;
  };
  tags?: string[];
  capabilities?: string[];
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get current AI provider API key status (not the actual keys)
 */
export const getApiKeyStatus = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    // Check for API keys in system config (encrypted storage)
    const openrouterConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "ai.openrouter.api_key_set"))
      .unique();

    const vercelConfig = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", "ai.vercel.api_key_set"))
      .unique();

    return {
      openrouter: {
        isSet: openrouterConfig?.value === true,
        lastUpdated: openrouterConfig?.updatedAt,
      },
      vercel: {
        isSet: vercelConfig?.value === true,
        lastUpdated: vercelConfig?.updatedAt,
      },
    };
  },
});

/**
 * Get cached models list (if available)
 */
export const getCachedModels = query({
  args: {
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
  },
  handler: async (ctx, { provider }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cacheKey = `ai.${provider}.models_cache`;
    const cached = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", cacheKey))
      .unique();

    if (!cached) return null;

    const cacheAge = Date.now() - (cached.updatedAt || 0);
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (cacheAge > maxAge) return null;

    return {
      models: cached.value as NormalizedModel[],
      cachedAt: cached.updatedAt,
    };
  },
});

// =============================================================================
// Mutations
// =============================================================================

/**
 * Save API key status (actual keys stored in environment variables)
 * This just records that a key has been configured
 */
export const setApiKeyStatus = mutation({
  args: {
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    isSet: v.boolean(),
  },
  handler: async (ctx, { provider, isSet }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "superadmin");

    const key = `ai.${provider}.api_key_set`;
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: isSet,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value: isSet,
        category: "ai",
        displayName: `${provider === "openrouter" ? "OpenRouter" : "Vercel AI Gateway"} API Key`,
        description: `Whether ${provider} API key is configured`,
        valueType: "boolean",
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }

    await scheduleAuditLog(ctx, {
      adminId: userId,
      action: "update_api_key_status",
      metadata: { provider, isSet },
      success: true,
    });

    return { success: true };
  },
});

/**
 * Cache fetched models
 */
export const cacheModels = mutation({
  args: {
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
    models: v.any(),
  },
  handler: async (ctx, { provider, models }) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const key = `ai.${provider}.models_cache`;
    const existing = await ctx.db
      .query("systemConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: models,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("systemConfig", {
        key,
        value: models,
        category: "ai",
        displayName: `${provider === "openrouter" ? "OpenRouter" : "Vercel"} Models Cache`,
        description: `Cached list of available models from ${provider}`,
        valueType: "json",
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    }

    return { success: true, count: (models as unknown[]).length };
  },
});

// =============================================================================
// Actions
// =============================================================================

/**
 * Fetch all models from OpenRouter
 */
export const fetchOpenRouterModels = action({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "OPENROUTER_API_KEY not configured",
        models: [],
      };
    }

    try {
      const url = new URL("https://openrouter.ai/api/v1/models");
      if (args.category) {
        url.searchParams.set("category", args.category);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OpenRouter API error: ${response.status}`,
          models: [],
        };
      }

      const data = await response.json();
      const models: OpenRouterModel[] = data.data || [];

      // Normalize to common format
      const normalized: NormalizedModel[] = models.map((m) => {
        // Determine type from modality or name
        let type: "language" | "embedding" | "image" = "language";
        if (m.id.includes("embed") || m.architecture?.modality?.includes("embed")) {
          type = "embedding";
        } else if (
          m.id.includes("image") ||
          m.id.includes("dall-e") ||
          m.id.includes("stable-diffusion")
        ) {
          type = "image";
        }

        return {
          id: m.id,
          name: m.name,
          description: m.description,
          provider: "openrouter" as const,
          type,
          contextLength: m.context_length || m.top_provider?.context_length || 0,
          maxOutputTokens: m.top_provider?.max_completion_tokens,
          pricing: {
            inputPerToken: m.pricing?.prompt,
            outputPerToken: m.pricing?.completion,
            perImage: m.pricing?.image,
            perRequest: m.pricing?.request,
          },
          capabilities: m.architecture?.modality?.split("+") || [],
        };
      });

      return {
        success: true,
        models: normalized,
        totalCount: normalized.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        models: [],
      };
    }
  },
});

/**
 * Fetch all models from Vercel AI Gateway
 */
export const fetchVercelModels = action({
  args: {},
  handler: async () => {
    try {
      // Vercel AI Gateway models endpoint is public (no auth required)
      const response = await fetch("https://ai-gateway.vercel.sh/v1/models");

      if (!response.ok) {
        return {
          success: false,
          error: `Vercel AI Gateway error: ${response.status}`,
          models: [],
        };
      }

      const data = await response.json();
      const models: VercelModel[] = data.data || [];

      // Normalize to common format
      const normalized: NormalizedModel[] = models.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        provider: "vercel" as const,
        type: m.type || "language",
        contextLength: m.context_window || 0,
        maxOutputTokens: m.max_tokens,
        pricing: {
          inputPerToken: m.pricing?.input,
          outputPerToken: m.pricing?.output,
          perImage: m.pricing?.image,
        },
        tags: m.tags,
        capabilities: m.tags || [],
      }));

      return {
        success: true,
        models: normalized,
        totalCount: normalized.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        models: [],
      };
    }
  },
});

/**
 * Test connection to a provider
 */
export const testProviderConnection = action({
  args: {
    provider: v.union(v.literal("openrouter"), v.literal("vercel")),
  },
  handler: async (_ctx, { provider }) => {
    const startTime = Date.now();

    try {
      if (provider === "openrouter") {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return { success: false, error: "API key not configured", latencyMs: 0 };
        }

        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}`,
            latencyMs,
          };
        }

        const data = await response.json();
        return {
          success: true,
          latencyMs,
          modelCount: data.data?.length || 0,
        };
      }
      // Vercel AI Gateway - public endpoint
      const response = await fetch("https://ai-gateway.vercel.sh/v1/models");
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          latencyMs,
        };
      }

      const data = await response.json();
      return {
        success: true,
        latencyMs,
        modelCount: data.data?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        latencyMs: Date.now() - startTime,
      };
    }
  },
});

/**
 * Fetch models from both providers and combine
 */
export const fetchAllModels = action({
  args: {
    type: v.optional(v.union(v.literal("language"), v.literal("embedding"), v.literal("image"))),
  },
  handler: async (ctx, args) => {
    // Fetch from both providers in parallel
    const [openrouterResult, vercelResult] = await Promise.all([
      ctx.runAction(internal.admin.aiProviders.fetchOpenRouterModels, {}),
      ctx.runAction(internal.admin.aiProviders.fetchVercelModels, {}),
    ]);

    let allModels: NormalizedModel[] = [];

    if (openrouterResult.success) {
      allModels = allModels.concat(openrouterResult.models);
    }

    if (vercelResult.success) {
      allModels = allModels.concat(vercelResult.models);
    }

    // Filter by type if specified
    if (args.type) {
      allModels = allModels.filter((m) => m.type === args.type);
    }

    // Sort by provider, then by name
    allModels.sort((a, b) => {
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });

    return {
      success: true,
      models: allModels,
      totalCount: allModels.length,
      byProvider: {
        openrouter: openrouterResult.success ? openrouterResult.models.length : 0,
        vercel: vercelResult.success ? vercelResult.models.length : 0,
      },
      errors: {
        openrouter: openrouterResult.success ? null : openrouterResult.error,
        vercel: vercelResult.success ? null : vercelResult.error,
      },
    };
  },
});
