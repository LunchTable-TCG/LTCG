/**
 * Database Triggers for Audit Logging
 *
 * NOTE: Most triggers have been disabled because the tables they referenced
 * (tokenTransactions, moderationActions, playerCurrency, auditLog) are now
 * in Convex component packages with their own isolated databases.
 * Triggers for component tables should be implemented within the components.
 *
 * The `users` table remains in the main schema but the auditLog table is
 * in the admin component, so the users trigger is also disabled until
 * we wire up cross-component audit logging.
 */

import { Triggers } from "convex-helpers/server/triggers";
import type { DataModel } from "../_generated/dataModel";

export const triggers = new Triggers<DataModel>();

// No active triggers — all target tables have been moved to components.
// Re-enable once cross-component audit logging is wired up.
