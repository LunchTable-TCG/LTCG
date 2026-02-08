/**
 * Migration Framework
 *
 * Uses @convex-dev/migrations for stateful, batched, resumable migrations.
 * Run: npx convex run migrations/index:run
 * Status: npx convex run --component migrations lib:getStatus --watch
 */

import { Migrations } from "@convex-dev/migrations";
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import { internalMutation } from "../functions";

type MigrationsComponent = ConstructorParameters<typeof Migrations>[0];
const migrationsComponent = (components as { migrations: MigrationsComponent }).migrations;

export const migrations = new Migrations<DataModel>(migrationsComponent, {
  internalMutation,
});

// Single migration runner: npx convex run migrations/index:run '{fn: "migrations/<name>"}'
export const run = migrations.runner();

// Run all table migrations in order
// Note: loadAllCards is a data import, not a table migration. Run separately:
// npx convex run migrations/loadAllCards:loadAllCards
export const runAll = migrations.runner([
  internalAny.migrations.addLeaderboardFields,
  internalAny.migrations.updateArchetypes,
  internalAny.migrations.updateShopProducts,
  internalAny.migrations.migrateAdminRoles,
  internalAny.migrations.manualAbilities,
  internalAny.migrations.mergeMarketplaceBids,
]);
