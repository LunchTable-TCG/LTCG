/**
 * Zod 4 Function Builders with Trigger Integration
 *
 * Provides zMutation, zQuery, zAction (and internal variants) that combine:
 * 1. Zod 4 argument/return validation (via convex-helpers/server/zod4)
 * 2. Database trigger support (via convex/infrastructure/triggers)
 *
 * This mirrors the existing convex/functions.ts pattern but adds Zod validation.
 * Use these builders when you need cross-field validation or Zod-specific features
 * (refinements, transforms, .email(), .regex(), etc.) that native Convex validators
 * cannot express.
 *
 * USAGE:
 * ======
 * ```typescript
 * import { z } from "zod/v4";
 * import { zMutation } from "../lib/zFunctions";
 *
 * export const createListing = zMutation({
 *   args: {
 *     cardId: z.string(),
 *     price: z.number().int().positive(),
 *   },
 *   returns: z.object({
 *     success: z.boolean(),
 *     listingId: z.string().optional(),
 *   }),
 *   handler: async (ctx, args) => {
 *     // ctx.db is trigger-wrapped (audit logging runs automatically)
 *     // args are already Zod-validated
 *     return { success: true };
 *   },
 * });
 * ```
 *
 * RELATIONSHIP TO EXISTING BUILDERS:
 * ===================================
 * - convex/functions.ts          -> mutation/internalMutation (triggers, no Zod)
 * - convex/lib/customFunctions.ts -> authedMutation/adminMutation (auth + triggers, no Zod)
 * - convex/lib/zFunctions.ts     -> zMutation/zQuery/zAction (Zod + triggers)
 *
 * For endpoints that need BOTH Zod validation AND auth context,
 * compose them: use zCustomMutation with a customCtx that adds auth.
 *
 * NOTE: Uses `convex-helpers/server/zod4` which imports from `zod/v4`.
 */

import {
  zCustomQuery,
  zCustomMutation,
  zCustomAction,
} from "convex-helpers/server/zod4";
import { customCtx, NoOp } from "convex-helpers/server/customFunctions";
import {
  query as rawQuery,
  internalQuery as rawInternalQuery,
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
  action as rawAction,
  internalAction as rawInternalAction,
} from "../_generated/server";
import { triggers } from "../infrastructure/triggers";

// ============================================================================
// ZOD-VALIDATED QUERIES (no triggers needed)
// ============================================================================

/**
 * Zod-validated public query builder.
 *
 * Adds Zod 4 argument and return-value validation on top of the base query.
 * Queries are read-only and do not need trigger wrapping.
 *
 * @example
 * ```typescript
 * export const getPlayer = zQuery({
 *   args: { username: z.string().min(3).max(20) },
 *   returns: z.object({ name: z.string(), level: z.number() }).nullable(),
 *   handler: async (ctx, args) => {
 *     return await ctx.db.query("users")
 *       .filter(q => q.eq(q.field("username"), args.username))
 *       .first();
 *   },
 * });
 * ```
 */
export const zQuery = zCustomQuery(rawQuery, NoOp);

/**
 * Zod-validated internal query builder.
 *
 * Same as zQuery but only callable from other Convex functions (not from client).
 */
export const zInternalQuery = zCustomQuery(rawInternalQuery, NoOp);

// ============================================================================
// ZOD-VALIDATED MUTATIONS (with trigger support)
// ============================================================================

/**
 * Zod-validated public mutation builder WITH trigger support.
 *
 * Combines Zod 4 validation with the database trigger system from
 * convex/infrastructure/triggers.ts. This means:
 * - Arguments are validated by Zod before the handler runs
 * - Return values are validated by Zod after the handler runs (if `returns` specified)
 * - All database writes go through triggers (audit logging, etc.)
 *
 * This is the Zod equivalent of `mutation` from `convex/functions.ts`.
 *
 * @example
 * ```typescript
 * export const updateDeck = zMutation({
 *   args: {
 *     name: z.string().min(1).max(50).trim(),
 *     cardIds: z.array(z.string()).min(30).max(60),
 *   },
 *   handler: async (ctx, args) => {
 *     // triggers.wrapDB ensures audit log triggers fire on writes
 *     await ctx.db.patch(deckId, { name: args.name, cardIds: args.cardIds });
 *   },
 * });
 * ```
 */
export const zMutation = zCustomMutation(rawMutation, customCtx(triggers.wrapDB));

/**
 * Zod-validated internal mutation builder WITH trigger support.
 *
 * Same as zMutation but only callable from other Convex functions.
 * Triggers still run on all database writes.
 */
export const zInternalMutation = zCustomMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB)
);

// ============================================================================
// ZOD-VALIDATED ACTIONS (no triggers for actions)
// ============================================================================

/**
 * Zod-validated public action builder.
 *
 * Actions run outside the database transaction and cannot use triggers.
 * Zod validation still applies to arguments and return values.
 *
 * @example
 * ```typescript
 * export const sendNotification = zAction({
 *   args: {
 *     userId: z.string(),
 *     message: z.string().min(1).max(500),
 *   },
 *   handler: async (ctx, args) => {
 *     await ctx.runMutation(api.notifications.create, {
 *       userId: args.userId,
 *       message: args.message,
 *     });
 *   },
 * });
 * ```
 */
export const zAction = zCustomAction(rawAction, NoOp);

/**
 * Zod-validated internal action builder.
 *
 * Same as zAction but only callable from other Convex functions.
 */
export const zInternalAction = zCustomAction(rawInternalAction, NoOp);
