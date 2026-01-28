/**
 * Admin Audit Helper
 *
 * Provides internal mutation for logging all admin operations.
 * This creates an audit trail for security, compliance, and debugging.
 */

import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";

/**
 * Log an admin action to the audit log
 *
 * This is an internal mutation to avoid auth overhead.
 * Should be called by admin mutations to record all operations.
 */
export const logAdminAction = internalMutation({
  args: {
    adminId: v.id("users"),
    action: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    // NOTE: Using v.any() instead of v.record() to prevent TypeScript
    // "Type instantiation is excessively deep" errors when calling this
    // function via ctx.scheduler.runAfter() with complex metadata objects.
    // The metadata field accepts any serializable value.
    metadata: v.any(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Create audit log entry
      await ctx.db.insert("adminAuditLogs", {
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

      return { success: true };
    } catch (error) {
      // Log error but don't throw - we don't want audit logging to break admin operations
      console.error("Failed to log admin action:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Type-safe wrapper for logging admin actions
 *
 * Usage in admin mutations:
 * ```
 * await ctx.scheduler.runAfter(0, internal.lib.adminAudit.logAdminAction, {
 *   adminId: userId,
 *   action: "delete_user",
 *   targetEmail: args.email,
 *   metadata: { reason: "admin_request" },
 *   success: true,
 * });
 * ```
 */
export interface AdminAuditLogParams {
  adminId: Id<"users">;
  action: string;
  targetUserId?: Id<"users">;
  targetEmail?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
}
