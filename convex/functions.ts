/**
 * Wrapped Convex Functions with Triggers Support
 *
 * This file provides wrapped mutation functions that enable database triggers
 * for automatic audit logging and other side effects.
 *
 * USAGE:
 * ======
import { mutation } from "./functions";
 *
 * Example (correct - triggers will run):
 * import { mutation } from "./functions";
 *
 * Wrong (triggers won't run):
 *
 * MIGRATION GUIDE:
 * ===============
 * To enable triggers across your codebase:
 *
 * 2. Update each mutation file to import from this file
 * 3. Keep query imports unchanged (queries don't need triggers)
 *
 * NOTES:
 * ======
 * - Only mutation and internalMutation need to be wrapped
 * - query, internalQuery, and action functions remain unchanged
 * - Triggers run atomically within the same transaction as the mutation
 * - See convex/infrastructure/triggers.ts for trigger configuration
 */

import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import {
  internalMutation as rawInternalMutation,
  mutation as rawMutation,
} from "./_generated/server";
import { triggers } from "./infrastructure/triggers";

/**
 * Mutation wrapper with trigger support
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

/**
 * Internal mutation wrapper with trigger support
 */
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));

/**
 * Re-export other function types for convenience (these don't need wrapping)
 */
