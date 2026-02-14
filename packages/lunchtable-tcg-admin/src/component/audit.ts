import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log an admin action to the audit log.
 */
export const logAdminAction = mutation({
  args: {
    adminId: v.string(),
    action: v.string(),
    targetUserId: v.optional(v.string()),
    targetEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("adminAuditLogs", {
      adminId: args.adminId,
      action: args.action,
      targetUserId: args.targetUserId,
      targetEmail: args.targetEmail,
      metadata: args.metadata,
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
      success: args.success,
      errorMessage: args.errorMessage,
    });
    return id;
  },
});

/**
 * Log a data change to the audit log.
 */
export const logDataChange = mutation({
  args: {
    table: v.string(),
    operation: v.union(v.literal("insert"), v.literal("patch"), v.literal("delete")),
    documentId: v.string(),
    userId: v.optional(v.string()),
    changedFields: v.optional(v.array(v.string())),
    oldValue: v.optional(v.any()),
    newValue: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("auditLog", {
      table: args.table,
      operation: args.operation,
      documentId: args.documentId,
      userId: args.userId,
      timestamp: Date.now(),
      changedFields: args.changedFields,
      oldValue: args.oldValue,
      newValue: args.newValue,
    });
    return id;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get admin audit log with filtering.
 */
export const getAdminAuditLog = query({
  args: {
    adminId: v.optional(v.string()),
    action: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.adminId) {
      return await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_admin", (q) => q.eq("adminId", args.adminId!))
        .order("desc")
        .take(limit);
    }

    if (args.action) {
      return await ctx.db
        .query("adminAuditLogs")
        .withIndex("by_action", (q) => q.eq("action", args.action!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("adminAuditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Get data audit log with filtering.
 */
export const getDataAuditLog = query({
  args: {
    table: v.optional(v.string()),
    documentId: v.optional(v.string()),
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    if (args.table && args.documentId) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_document", (q) =>
          q.eq("table", args.table!).eq("documentId", args.documentId!)
        )
        .order("desc")
        .take(limit);
    }

    if (args.table) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_table", (q) => q.eq("table", args.table!))
        .order("desc")
        .take(limit);
    }

    if (args.userId) {
      return await ctx.db
        .query("auditLog")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});
