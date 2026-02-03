/**
 * Audit Log Queries
 *
 * Provides read access to the audit log for administrative purposes.
 * Audit logs are automatically created by triggers when critical data changes.
 */

import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

/**
 * Get recent audit log entries
 * Admin only
 */
export const getRecentAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit logs for a specific table
 * Admin only
 */
export const getAuditLogsByTable = query({
  args: {
    table: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_table", (q) => q.eq("table", args.table))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit logs for a specific document
 * Admin only
 */
export const getAuditLogsByDocument = query({
  args: {
    table: v.string(),
    documentId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_document", (q) =>
        q.eq("table", args.table).eq("documentId", args.documentId)
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit logs for a specific user's actions
 * Users can view their own, admins can view all
 */
export const getAuditLogsByUser = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requireAuthQuery(ctx);

    // Users can only view their own audit logs
    // Admins can view any user's audit logs
    if (currentUserId !== args.userId) {
      await requireRole(ctx, currentUserId, "admin");
    }

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit logs by operation type
 * Admin only
 */
export const getAuditLogsByOperation = query({
  args: {
    operation: v.union(v.literal("insert"), v.literal("patch"), v.literal("delete")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_operation", (q) => q.eq("operation", args.operation))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit logs within a time range
 * Admin only
 */
export const getAuditLogsByTimeRange = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startTime),
          q.lte(q.field("timestamp"), args.endTime)
        )
      )
      .order("desc")
      .take(limit);
  },
});

/**
 * Get audit statistics for a time period
 * Admin only
 */
export const getAuditStatistics = query({
  args: {
    startTime: v.number(),
    endTime: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "admin");

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.gte(q.field("timestamp"), args.startTime),
          q.lte(q.field("timestamp"), args.endTime)
        )
      )
      .collect();

    const stats = {
      total: logs.length,
      byTable: {} as Record<string, number>,
      byOperation: {
        insert: 0,
        patch: 0,
        delete: 0,
      },
      byUser: {} as Record<string, number>,
    };

    for (const log of logs) {
      // Count by table
      stats.byTable[log.table] = (stats.byTable[log.table] ?? 0) + 1;

      // Count by operation
      stats.byOperation[log.operation]++;

      // Count by user
      if (log.userId) {
        stats.byUser[log.userId] = (stats.byUser[log.userId] ?? 0) + 1;
      }
    }

    return stats;
  },
});

/**
 * Get current user's own audit logs
 * Allows users to see their own audit trail
 */
export const getMyAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    const limit = args.limit ?? 100;

    return await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});
