/**
 * Wrapped Convex Functions with Triggers Support
 *
 * This file provides wrapped mutation functions that enable database triggers
 * for automatic audit logging and other side effects.
 *
 * USAGE:
 * ======
 * Import mutation and internalMutation from this file instead of _generated/server:
 *
 * Example (correct - triggers will run):
 * import { mutation } from "./functions";
 *
 * Wrong (triggers won't run):
 * import { mutation } from "./_generated/server";
 *
 * MIGRATION GUIDE:
 * ===============
 * To enable triggers across your codebase:
 *
 * 1. Find all files importing from "_generated/server"
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

import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "./_generated/server";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";
import { triggers } from "./infrastructure/triggers";

/**
 * Mutation wrapper with trigger support
 * Use this instead of importing mutation from _generated/server
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

/**
 * Internal mutation wrapper with trigger support
 * Use this instead of importing internalMutation from _generated/server
 */
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));

/**
 * Re-export other function types for convenience (these don't need wrapping)
 * You can still import these from _generated/server if preferred
 */
export { query, internalQuery, action, internalAction } from "./_generated/server";
