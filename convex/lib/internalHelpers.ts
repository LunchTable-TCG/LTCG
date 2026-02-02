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
// @ts-expect-error TS2589: Type instantiation is excessively deep - this is intentional to break the type chain
export const internalAny: any = internal;

/**
 * Pre-extracted reference to the admin audit log action.
 * Use this for scheduling audit log writes without TS2589 errors.
 */
export const auditLogAction = internalAny.lib.adminAudit.logAdminAction;
