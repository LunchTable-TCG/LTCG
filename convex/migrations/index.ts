/**
 * Migration Framework
 *
 * Uses @convex-dev/migrations for stateful, batched, resumable migrations.
 * Run: npx convex run migrations/index:run
 * Status: npx convex run --component migrations lib:getStatus --watch
 */

import { Migrations } from "@convex-dev/migrations";
import { internal } from "../_generated/api";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { internalMutation } from "../functions";

export const migrations = new Migrations<DataModel>((components as any).migrations, {
  internalMutation,
});

// Single migration runner: npx convex run migrations/index:run '{fn: "migrations/syncGoldToPlayerCurrency"}'
export const run = migrations.runner();

// Run all table migrations in order
// Note: loadAllCards is a data import, not a table migration. Run separately:
// npx convex run migrations/loadAllCards:loadAllCards
export const runAll = migrations.runner([
  internal.migrations.syncGoldToPlayerCurrency,
  internal.migrations.syncXPToPlayerXP,
  internal.migrations.addLeaderboardFields,
  internal.migrations.updateArchetypes,
  internal.migrations.updateShopProducts,
  internal.migrations.migrateAdminRoles,
  internal.migrations.manualAbilities,
  internal.migrations.mergeMarketplaceBids,
]);
