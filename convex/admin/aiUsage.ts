/**
 * AI Usage Tracking & Analytics
 *
 * Functions for recording, querying, and analyzing AI provider usage.
 * Tracks token usage, costs, and performance metrics for OpenRouter and Vercel AI Gateway.
 */

import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types
// =============================================================================

const providerValidator = v.union(v.literal("openrouter"), v.literal("vercel"));
const modelTypeValidator = v.union(
  v.literal("language"),
  v.literal("embedding"),
  v.literal("image")
);

// =============================================================================
// Internal Mutations (for recording usage from other functions)
// =============================================================================

/**
 * Record a single AI usage event (called internally by AI functions)
 */
export const recordUsage = internalMutation({
  args: {
    provider: providerValidator,
    modelId: v.string(),
    modelType: modelTypeValidator,
    inputTokens: v.number(),
    outputTokens: v.number(),
    estimatedCost: v.number(),
    feature: v.string(),
    userId: v.optional(v.id("users")),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiUsage", {
      ...args,
      totalTokens: args.inputTokens + args.outputTokens,
      createdAt: Date.now(),
    });

    // Update daily aggregates
    const todayParts = new Date().toISOString().split("T");
    const today = todayParts[0];
    if (!today) throw new Error("Failed to get date string");

    const existing = await ctx.db
      .query("aiUsageDailyStats")
      .withIndex("by_provider_date", (q) => q.eq("provider", args.provider).eq("date", today))
      .unique();

    if (existing) {
      // Update existing record
      const newTotal = existing.totalRequests + 1;
      const newAvgLatency =
        (existing.avgLatencyMs * existing.totalRequests + args.latencyMs) / newTotal;

      // Update top models
      const topModels = [...existing.topModels];
      const modelIndex = topModels.findIndex((m) => m.modelId === args.modelId);
      if (modelIndex >= 0) {
        const existing = topModels[modelIndex]!;
        topModels[modelIndex] = {
          modelId: args.modelId,
          requests: existing.requests + 1,
          tokens: existing.tokens + args.inputTokens + args.outputTokens,
          cost: existing.cost + args.estimatedCost,
        };
      } else if (topModels.length < 10) {
        topModels.push({
          modelId: args.modelId,
          requests: 1,
          tokens: args.inputTokens + args.outputTokens,
          cost: args.estimatedCost,
        });
      }
      // Sort by requests descending
      topModels.sort((a, b) => b.requests - a.requests);

      await ctx.db.patch(existing._id, {
        totalRequests: newTotal,
        successfulRequests: existing.successfulRequests + (args.success ? 1 : 0),
        failedRequests: existing.failedRequests + (args.success ? 0 : 1),
        totalInputTokens: existing.totalInputTokens + args.inputTokens,
        totalOutputTokens: existing.totalOutputTokens + args.outputTokens,
        totalTokens: existing.totalTokens + args.inputTokens + args.outputTokens,
        totalCost: existing.totalCost + args.estimatedCost,
        avgLatencyMs: newAvgLatency,
        languageRequests: existing.languageRequests + (args.modelType === "language" ? 1 : 0),
        embeddingRequests: existing.embeddingRequests + (args.modelType === "embedding" ? 1 : 0),
        imageRequests: existing.imageRequests + (args.modelType === "image" ? 1 : 0),
        topModels,
        updatedAt: Date.now(),
      });
    } else {
      // Create new daily record
      await ctx.db.insert("aiUsageDailyStats", {
        date: today,
        provider: args.provider,
        totalRequests: 1,
        successfulRequests: args.success ? 1 : 0,
        failedRequests: args.success ? 0 : 1,
        totalInputTokens: args.inputTokens,
        totalOutputTokens: args.outputTokens,
        totalTokens: args.inputTokens + args.outputTokens,
        totalCost: args.estimatedCost,
        avgLatencyMs: args.latencyMs,
        languageRequests: args.modelType === "language" ? 1 : 0,
        embeddingRequests: args.modelType === "embedding" ? 1 : 0,
        imageRequests: args.modelType === "image" ? 1 : 0,
        topModels: [
          {
            modelId: args.modelId,
            requests: 1,
            tokens: args.inputTokens + args.outputTokens,
            cost: args.estimatedCost,
          },
        ],
        updatedAt: Date.now(),
      });
    }
  },
});

// =============================================================================
// Admin Queries
// =============================================================================

/**
 * Get usage summary for dashboard
 */
export const getUsageSummary = query({
  args: {
    days: v.optional(v.number()), // Default 30 days
  },
  handler: async (ctx, { days = 30 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffTime).toISOString().split("T")[0]!;

    // Get daily stats for the period
    const dailyStats = await ctx.db
      .query("aiUsageDailyStats")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), cutoffDate))
      .collect();

    // Aggregate by provider
    const byProvider = {
      openrouter: {
        requests: 0,
        tokens: 0,
        cost: 0,
        successRate: 0,
        avgLatency: 0,
      },
      vercel: {
        requests: 0,
        tokens: 0,
        cost: 0,
        successRate: 0,
        avgLatency: 0,
      },
    };

    const totalLatencySum = { openrouter: 0, vercel: 0 };

    for (const stat of dailyStats) {
      const p = byProvider[stat.provider];
      p.requests += stat.totalRequests;
      p.tokens += stat.totalTokens;
      p.cost += stat.totalCost;
      totalLatencySum[stat.provider] += stat.avgLatencyMs * stat.totalRequests;
    }

    // Calculate averages
    for (const provider of ["openrouter", "vercel"] as const) {
      const p = byProvider[provider];
      if (p.requests > 0) {
        p.avgLatency = totalLatencySum[provider] / p.requests;
        const successTotal = dailyStats
          .filter((s) => s.provider === provider)
          .reduce((sum, s) => sum + s.successfulRequests, 0);
        p.successRate = (successTotal / p.requests) * 100;
      }
    }

    // Total across all providers
    const total = {
      requests: byProvider.openrouter.requests + byProvider.vercel.requests,
      tokens: byProvider.openrouter.tokens + byProvider.vercel.tokens,
      cost: byProvider.openrouter.cost + byProvider.vercel.cost,
    };

    // Daily breakdown for charts
    const dailyBreakdown = dailyStats
      .sort((a, b) => a.date.localeCompare(b.date))
      .reduce(
        (acc, stat) => {
          const existing = acc.find((d) => d.date === stat.date);
          if (existing) {
            existing.requests += stat.totalRequests;
            existing.tokens += stat.totalTokens;
            existing.cost += stat.totalCost;
          } else {
            acc.push({
              date: stat.date,
              requests: stat.totalRequests,
              tokens: stat.totalTokens,
              cost: stat.totalCost,
            });
          }
          return acc;
        },
        [] as { date: string; requests: number; tokens: number; cost: number }[]
      );

    return {
      period: { days, startDate: cutoffDate },
      total,
      byProvider,
      dailyBreakdown,
    };
  },
});

/**
 * Get recent usage records
 */
export const getRecentUsage = query({
  args: {
    limit: v.optional(v.number()),
    provider: v.optional(providerValidator),
  },
  handler: async (ctx, { limit = 50, provider }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    let query = ctx.db.query("aiUsage").withIndex("by_created").order("desc");

    if (provider) {
      query = ctx.db
        .query("aiUsage")
        .withIndex("by_provider", (q) => q.eq("provider", provider))
        .order("desc");
    }

    const records = await query.take(limit);

    return records.map((r) => ({
      ...r,
      createdAtFormatted: new Date(r.createdAt).toLocaleString(),
    }));
  },
});

/**
 * Get top models by usage
 */
export const getTopModels = query({
  args: {
    days: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { days = 30, limit = 10 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0]!;

    const dailyStats = await ctx.db
      .query("aiUsageDailyStats")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), cutoffDate))
      .collect();

    // Aggregate top models across all days
    const modelMap = new Map<
      string,
      { modelId: string; requests: number; tokens: number; cost: number; provider: string }
    >();

    for (const stat of dailyStats) {
      for (const model of stat.topModels) {
        const existing = modelMap.get(model.modelId);
        if (existing) {
          existing.requests += model.requests;
          existing.tokens += model.tokens;
          existing.cost += model.cost;
        } else {
          modelMap.set(model.modelId, {
            ...model,
            provider: stat.provider,
          });
        }
      }
    }

    return Array.from(modelMap.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, limit);
  },
});

/**
 * Get usage by feature
 */
export const getUsageByFeature = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, { days = 30 }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    // Get raw usage records for feature breakdown
    const records = await ctx.db
      .query("aiUsage")
      .withIndex("by_created")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    // Aggregate by feature
    const featureMap = new Map<
      string,
      { feature: string; requests: number; tokens: number; cost: number; successRate: number }
    >();

    for (const record of records) {
      const existing = featureMap.get(record.feature);
      if (existing) {
        existing.requests++;
        existing.tokens += record.totalTokens;
        existing.cost += record.estimatedCost;
        if (record.success) {
          existing.successRate =
            (existing.successRate * (existing.requests - 1)) / existing.requests +
            100 / existing.requests;
        } else {
          existing.successRate =
            (existing.successRate * (existing.requests - 1)) / existing.requests;
        }
      } else {
        featureMap.set(record.feature, {
          feature: record.feature,
          requests: 1,
          tokens: record.totalTokens,
          cost: record.estimatedCost,
          successRate: record.success ? 100 : 0,
        });
      }
    }

    return Array.from(featureMap.values()).sort((a, b) => b.requests - a.requests);
  },
});

// =============================================================================
// Admin Mutations
// =============================================================================

/**
 * Clear old usage records (for data retention)
 */
export const clearOldUsageRecords = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, { olderThanDays }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "superadmin");

    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    // Delete old individual records (keep daily aggregates)
    const oldRecords = await ctx.db
      .query("aiUsage")
      .withIndex("by_created")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .take(1000); // Batch delete

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return {
      deletedCount: oldRecords.length,
      hasMore: oldRecords.length === 1000,
    };
  },
});
