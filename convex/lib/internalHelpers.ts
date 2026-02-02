/**
 * Internal API Helpers
 *
 * This module provides typed helpers to avoid TS2589 "Type instantiation is excessively deep"
 * errors when using the internal Convex API references.
 *
 * The internal API type is deeply nested, and TypeScript can hit recursion limits when
 * evaluating it. By extracting the reference to `any` here once, other modules can import
 * and use it without triggering the deep type instantiation.
 */

import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/**
 * Internal API reference cast to any to break deep type instantiation.
 * Use this instead of importing `internal` directly to avoid TS2589 errors.
 *
 * Example usage:
 * ```typescript
 * import { internalAny, auditLogAction } from "../lib/internalHelpers";
 *
 * await ctx.scheduler.runAfter(0, auditLogAction, params);
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: Required to break TS2589 deep type instantiation
// @ts-ignore TS2589: Type instantiation may be excessively deep in some configs
export const internalAny: any = internal;

/**
 * Pre-extracted reference to the admin audit log action.
 * Use this for scheduling audit log writes without TS2589 errors.
 */
export const auditLogAction = internalAny.lib.adminAudit.logAdminAction;

/**
 * Audit log parameters type for admin actions
 */
export interface AuditLogParams {
  adminId: Id<"users">;
  action: string;
  targetUserId?: Id<"users">;
  targetEmail?: string;
  // biome-ignore lint/suspicious/noExplicitAny: Flexible metadata structure for audit logging
  metadata?: any;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
}

/**
 * Schedule an audit log entry for admin actions.
 *
 * This is the single source of truth for audit logging across all admin modules.
 * Use this instead of defining local helpers to avoid code duplication.
 *
 * @example
 * ```typescript
 * import { scheduleAuditLog } from "../lib/internalHelpers";
 *
 * await scheduleAuditLog(ctx, {
 *   adminId: userId,
 *   action: "delete_user",
 *   targetUserId: targetId,
 *   success: true,
 * });
 * ```
 */
export async function scheduleAuditLog(ctx: MutationCtx, params: AuditLogParams) {
  await ctx.scheduler.runAfter(0, auditLogAction, params);
}
