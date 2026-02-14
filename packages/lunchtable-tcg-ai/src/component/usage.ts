import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const providerValidator = v.union(v.literal("openrouter"), v.literal("vercel"));
const modelTypeValidator = v.union(
  v.literal("language"),
  v.literal("embedding"),
  v.literal("image")
);

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record AI usage metrics.
 */
export const recordUsage = mutation({
  args: {
    provider: providerValidator,
    modelId: v.string(),
    modelType: modelTypeValidator,
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    estimatedCost: v.number(),
    feature: v.string(),
    userId: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
  },
  returns: v.id("aiUsage"),
  handler: async (ctx, args) => {
    const usageId = await ctx.db.insert("aiUsage", {
      provider: args.provider,
      modelId: args.modelId,
      modelType: args.modelType,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      estimatedCost: args.estimatedCost,
      feature: args.feature,
      userId: args.userId,
      success: args.success,
      errorMessage: args.errorMessage,
      latencyMs: args.latencyMs,
      createdAt: Date.now(),
    });

    return usageId;
  },
});

/**
 * Upsert daily usage statistics.
 */
export const upsertDailyStats = mutation({
  args: {
    date: v.string(),
    provider: providerValidator,
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalTokens: v.number(),
    totalCost: v.number(),
    avgLatencyMs: v.number(),
    languageRequests: v.number(),
    embeddingRequests: v.number(),
    imageRequests: v.number(),
    topModels: v.array(
      v.object({
        modelId: v.string(),
        requests: v.number(),
        tokens: v.number(),
        cost: v.number(),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiUsageDailyStats")
      .withIndex("by_provider_date", (q) =>
        q.eq("provider", args.provider).eq("date", args.date)
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalRequests: args.totalRequests,
        successfulRequests: args.successfulRequests,
        failedRequests: args.failedRequests,
        totalInputTokens: args.totalInputTokens,
        totalOutputTokens: args.totalOutputTokens,
        totalTokens: args.totalTokens,
        totalCost: args.totalCost,
        avgLatencyMs: args.avgLatencyMs,
        languageRequests: args.languageRequests,
        embeddingRequests: args.embeddingRequests,
        imageRequests: args.imageRequests,
        topModels: args.topModels,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("aiUsageDailyStats", {
        date: args.date,
        provider: args.provider,
        totalRequests: args.totalRequests,
        successfulRequests: args.successfulRequests,
        failedRequests: args.failedRequests,
        totalInputTokens: args.totalInputTokens,
        totalOutputTokens: args.totalOutputTokens,
        totalTokens: args.totalTokens,
        totalCost: args.totalCost,
        avgLatencyMs: args.avgLatencyMs,
        languageRequests: args.languageRequests,
        embeddingRequests: args.embeddingRequests,
        imageRequests: args.imageRequests,
        topModels: args.topModels,
        updatedAt: now,
      });
    }

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get usage records with optional filtering.
 */
export const getUsage = query({
  args: {
    feature: v.optional(v.string()),
    provider: v.optional(providerValidator),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.feature !== undefined) {
      return await ctx.db
        .query("aiUsage")
        .withIndex("by_feature", (q) => q.eq("feature", args.feature!))
        .order("desc")
        .take(limit);
    }

    if (args.provider !== undefined) {
      return await ctx.db
        .query("aiUsage")
        .withIndex("by_provider", (q) => q.eq("provider", args.provider!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("aiUsage")
      .withIndex("by_created")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get daily statistics with optional date range.
 */
export const getDailyStats = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    provider: v.optional(providerValidator),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.provider !== undefined) {
      const stats = await ctx.db
        .query("aiUsageDailyStats")
        .withIndex("by_provider_date", (q) => q.eq("provider", args.provider!))
        .collect();

      if (args.startDate || args.endDate) {
        return stats.filter((s) => {
          if (args.startDate && s.date < args.startDate) return false;
          if (args.endDate && s.date > args.endDate) return false;
          return true;
        });
      }

      return stats;
    }

    const stats = await ctx.db.query("aiUsageDailyStats").collect();

    if (args.startDate || args.endDate) {
      return stats.filter((s) => {
        if (args.startDate && s.date < args.startDate) return false;
        if (args.endDate && s.date > args.endDate) return false;
        return true;
      });
    }

    return stats;
  },
});
