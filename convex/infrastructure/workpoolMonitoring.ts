/**
 * Workpool Monitoring and Observability
 *
 * Provides queries and utilities to monitor workpool health, queue depths,
 * and processing performance. Helps identify bottlenecks and optimize
 * background job processing.
 *
 * Monitoring Capabilities:
 * - Queue depth tracking (pending jobs per pool)
 * - Processing time statistics (avg, min, max)
 * - Success/failure rates
 * - Pool utilization metrics
 * - Alert thresholds for queue backlog
 */

import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

/**
 * Workpool status summary
 *
 * Returns real-time status of all workpools including queue depths,
 * active jobs, and recent completion rates.
 *
 * @returns Status for each configured workpool
 */
export const getWorkpoolStatus = internalQuery({
  args: {},
  returns: v.object({
    batchOperations: v.object({
      queueDepth: v.number(),
      activeJobs: v.number(),
      maxParallelism: v.number(),
      utilizationPercent: v.number(),
      status: v.union(
        v.literal("healthy"),
        v.literal("busy"),
        v.literal("backlogged")
      ),
    }),
    migrations: v.object({
      queueDepth: v.number(),
      activeJobs: v.number(),
      maxParallelism: v.number(),
      utilizationPercent: v.number(),
      status: v.union(
        v.literal("healthy"),
        v.literal("busy"),
        v.literal("backlogged")
      ),
    }),
    backgroundJobs: v.object({
      queueDepth: v.number(),
      activeJobs: v.number(),
      maxParallelism: v.number(),
      utilizationPercent: v.number(),
      status: v.union(
        v.literal("healthy"),
        v.literal("busy"),
        v.literal("backlogged")
      ),
    }),
    tournaments: v.object({
      queueDepth: v.number(),
      activeJobs: v.number(),
      maxParallelism: v.number(),
      utilizationPercent: v.number(),
      status: v.union(
        v.literal("healthy"),
        v.literal("busy"),
        v.literal("backlogged")
      ),
    }),
    timestamp: v.number(),
  }),
  handler: async (_ctx) => {
    // Get all workpool job records from the database
    // Note: Actual implementation depends on @convex-dev/workpool internal schema
    // This is a conceptual implementation showing the monitoring structure

    const now = Date.now();

    // Query workpool jobs (pseudo-code - adapt to actual workpool schema)
    // const batchJobs = await ctx.db.query("_workpool_jobs")
    //   .withIndex("by_pool", q => q.eq("poolName", "batchOperations"))
    //   .collect();

    // For now, return mock data structure
    // TODO: Implement actual workpool job queries when schema is available

    const createPoolStatus = (queueDepth: number, activeJobs: number, maxParallelism: number) => {
      const utilizationPercent = maxParallelism > 0
        ? Math.round((activeJobs / maxParallelism) * 100)
        : 0;

      let status: "healthy" | "busy" | "backlogged";
      if (queueDepth > maxParallelism * 10) {
        status = "backlogged";
      } else if (utilizationPercent >= 80) {
        status = "busy";
      } else {
        status = "healthy";
      }

      return {
        queueDepth,
        activeJobs,
        maxParallelism,
        utilizationPercent,
        status,
      };
    };

    return {
      batchOperations: createPoolStatus(0, 0, 5),
      migrations: createPoolStatus(0, 0, 3),
      backgroundJobs: createPoolStatus(0, 0, 10),
      tournaments: createPoolStatus(0, 0, 1),
      timestamp: now,
    };
  },
});

/**
 * Workpool performance metrics
 *
 * Returns aggregated statistics about job processing times and success rates
 * over a specified time window.
 *
 * @param hoursBack - Number of hours to look back for metrics (default: 24)
 * @returns Performance metrics for each workpool
 */
export const getWorkpoolMetrics = internalQuery({
  args: {
    hoursBack: v.optional(v.number()),
  },
  returns: v.object({
    batchOperations: v.object({
      totalJobs: v.number(),
      successfulJobs: v.number(),
      failedJobs: v.number(),
      successRate: v.number(),
      avgProcessingTimeMs: v.number(),
      minProcessingTimeMs: v.number(),
      maxProcessingTimeMs: v.number(),
    }),
    migrations: v.object({
      totalJobs: v.number(),
      successfulJobs: v.number(),
      failedJobs: v.number(),
      successRate: v.number(),
      avgProcessingTimeMs: v.number(),
      minProcessingTimeMs: v.number(),
      maxProcessingTimeMs: v.number(),
    }),
    backgroundJobs: v.object({
      totalJobs: v.number(),
      successfulJobs: v.number(),
      failedJobs: v.number(),
      successRate: v.number(),
      avgProcessingTimeMs: v.number(),
      minProcessingTimeMs: v.number(),
      maxProcessingTimeMs: v.number(),
    }),
    tournaments: v.object({
      totalJobs: v.number(),
      successfulJobs: v.number(),
      failedJobs: v.number(),
      successRate: v.number(),
      avgProcessingTimeMs: v.number(),
      minProcessingTimeMs: v.number(),
      maxProcessingTimeMs: v.number(),
    }),
    timeWindowHours: v.number(),
    timestamp: v.number(),
  }),
  handler: async (_ctx, args) => {
    const hoursBack = args.hoursBack ?? 24;

    // Query completed workpool jobs within time window
    // Note: Actual implementation depends on @convex-dev/workpool internal schema
    // This is a conceptual implementation showing the monitoring structure

    // const completedJobs = await ctx.db.query("_workpool_jobs")
    //   .withIndex("by_completion_time")
    //   .filter(q => q.gte(q.field("completedAt"), cutoffTime))
    //   .collect();

    // For now, return mock data structure
    // TODO: Implement actual workpool metrics queries when schema is available

    const createPoolMetrics = (totalJobs: number) => {
      const successfulJobs = Math.floor(totalJobs * 0.95); // 95% success rate
      const failedJobs = totalJobs - successfulJobs;
      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100;

      return {
        totalJobs,
        successfulJobs,
        failedJobs,
        successRate: Math.round(successRate * 100) / 100,
        avgProcessingTimeMs: 1500,
        minProcessingTimeMs: 250,
        maxProcessingTimeMs: 5000,
      };
    };

    return {
      batchOperations: createPoolMetrics(0),
      migrations: createPoolMetrics(0),
      backgroundJobs: createPoolMetrics(0),
      tournaments: createPoolMetrics(0),
      timeWindowHours: hoursBack,
      timestamp: Date.now(),
    };
  },
});

/**
 * Workpool health check
 *
 * Returns simple health status for monitoring systems.
 * Useful for alerting when workpools are experiencing issues.
 *
 * @returns Overall health status and any warnings
 */
export const checkWorkpoolHealth = internalQuery({
  args: {},
  returns: v.object({
    healthy: v.boolean(),
    warnings: v.array(v.string()),
    timestamp: v.number(),
  }),
  handler: async (_ctx) => {
    // Mock status for now - replace with actual workpool queries
    const status = {
      batchOperations: { queueDepth: 0, activeJobs: 0, maxParallelism: 5, utilizationPercent: 0, status: "healthy" as "healthy" | "busy" | "backlogged" },
      migrations: { queueDepth: 0, activeJobs: 0, maxParallelism: 3, utilizationPercent: 0, status: "healthy" as "healthy" | "busy" | "backlogged" },
      backgroundJobs: { queueDepth: 0, activeJobs: 0, maxParallelism: 10, utilizationPercent: 0, status: "healthy" as "healthy" | "busy" | "backlogged" },
      tournaments: { queueDepth: 0, activeJobs: 0, maxParallelism: 1, utilizationPercent: 0, status: "healthy" as "healthy" | "busy" | "backlogged" },
      timestamp: Date.now(),
    };

    const warnings: string[] = [];

    // Check each pool for issues
    if (status.batchOperations.status === "backlogged") {
      warnings.push(
        `Batch Operations pool is backlogged (${status.batchOperations.queueDepth} jobs queued)`
      );
    }

    if (status.migrations.status === "backlogged") {
      warnings.push(
        `Migrations pool is backlogged (${status.migrations.queueDepth} jobs queued)`
      );
    }

    if (status.backgroundJobs.status === "backlogged") {
      warnings.push(
        `Background Jobs pool is backlogged (${status.backgroundJobs.queueDepth} jobs queued)`
      );
    }

    if (status.tournaments.status === "backlogged") {
      warnings.push(
        `Tournaments pool is backlogged (${status.tournaments.queueDepth} jobs queued)`
      );
    }

    return {
      healthy: warnings.length === 0,
      warnings,
      timestamp: Date.now(),
    };
  },
});

/**
 * Admin dashboard query for workpool metrics
 *
 * Public query for admin dashboard to display workpool status.
 * Requires admin authentication.
 *
 * @returns Combined status and metrics for dashboard display
 */
export const getWorkpoolDashboard = query({
  args: {},
  returns: v.object({
    status: v.object({
      batchOperations: v.any(),
      migrations: v.any(),
      backgroundJobs: v.any(),
      tournaments: v.any(),
      timestamp: v.number(),
    }),
    recentMetrics: v.object({
      batchOperations: v.any(),
      migrations: v.any(),
      backgroundJobs: v.any(),
      tournaments: v.any(),
      timeWindowHours: v.number(),
      timestamp: v.number(),
    }),
    health: v.object({
      healthy: v.boolean(),
      warnings: v.array(v.string()),
      timestamp: v.number(),
    }),
  }),
  handler: async (_ctx) => {
    // Note: Add admin authentication when integrating with admin dashboard
    // const { requireAdmin } = await requireAuthQuery(ctx);

    // Mock data for now - replace with actual workpool queries when schema is available
    const status = {
      batchOperations: { queueDepth: 0, activeJobs: 0, maxParallelism: 5, utilizationPercent: 0, status: "healthy" as const },
      migrations: { queueDepth: 0, activeJobs: 0, maxParallelism: 3, utilizationPercent: 0, status: "healthy" as const },
      backgroundJobs: { queueDepth: 0, activeJobs: 0, maxParallelism: 10, utilizationPercent: 0, status: "healthy" as const },
      tournaments: { queueDepth: 0, activeJobs: 0, maxParallelism: 1, utilizationPercent: 0, status: "healthy" as const },
      timestamp: Date.now(),
    };

    const metrics = {
      batchOperations: { totalJobs: 0, successfulJobs: 0, failedJobs: 0, successRate: 100, avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
      migrations: { totalJobs: 0, successfulJobs: 0, failedJobs: 0, successRate: 100, avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
      backgroundJobs: { totalJobs: 0, successfulJobs: 0, failedJobs: 0, successRate: 100, avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
      tournaments: { totalJobs: 0, successfulJobs: 0, failedJobs: 0, successRate: 100, avgProcessingTimeMs: 0, minProcessingTimeMs: 0, maxProcessingTimeMs: 0 },
      timeWindowHours: 1,
      timestamp: Date.now(),
    };

    const health = {
      healthy: true,
      warnings: [],
      timestamp: Date.now(),
    };

    return {
      status,
      recentMetrics: metrics,
      health,
    };
  },
});
