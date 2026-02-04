/**
 * Migration Utilities
 *
 * This file provides the migration wrapper configured with convex-helpers.
 * All migrations should use the `migration` wrapper exported from this file
 * for automatic progress tracking, error handling, and resumability.
 *
 * Benefits over manual workpool pattern:
 * - Automatic batch processing with pagination
 * - Built-in progress tracking via migrations table
 * - Resumable from cursor if interrupted
 * - Better error handling with automatic retries
 * - Status monitoring via getStatus query
 * - Dry run support for testing migrations
 *
 * Usage:
 *   import { migration } from "./migrations";
 *
 *   export const myMigration = migration({
 *     table: "users",
 *     migrateOne: async (ctx, doc) => {
 *       if (needsUpdate(doc)) {
 *         return { fieldToUpdate: newValue };
 *       }
 *       return null; // Skip this document
 *     },
 *   });
 *
 * Running migrations:
 *   npx convex run migrations:startMyMigration
 *
 * Checking status:
 *   npx convex run migrations:status
 */

import {
  makeMigration,
  startMigration,
  getStatus,
  cancelMigration,
} from "convex-helpers/server/migrations";
import type { MigrationStatus } from "convex-helpers/server/migrations";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

/**
 * Migration wrapper configured for this project
 *
 * All migrations created with this wrapper will:
 * - Use the "migrations" table for state tracking
 * - Process documents in batches of 100 by default
 * - Be resumable from cursor if interrupted
 * - Track progress automatically
 */
export const migration = makeMigration(internalMutation, {
  migrationTable: "migrations",
});

/**
 * Get the status of all migrations
 *
 * Usage: npx convex run migrations:status
 */
export const status = internalQuery({
  handler: async (ctx): Promise<MigrationStatus<"migrations">[]> => {
    return await getStatus(ctx, { migrationTable: "migrations" });
  },
});

/**
 * Start a single migration
 *
 * This is a helper to manually start a specific migration.
 * Most migrations can be run directly, but this is useful
 * for custom batch sizes or starting from a specific cursor.
 *
 * @example
 *   npx convex run migrations:start \
 *     --migrationName "migrations:addLeaderboardFields" \
 *     --batchSize 50
 */
export const start = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Example: Start the addLeaderboardFields migration
    // Replace with actual migration reference
    await startMigration(ctx, internal.migrations.addLeaderboardFields, {
      startCursor: null,
      batchSize: 100,
    });
  },
});

/**
 * Cancel a running migration
 *
 * @example
 *   npx convex run migrations:cancel \
 *     --migrationName "migrations:addLeaderboardFields"
 */
export const cancel = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get migration ID from migrations table first
    const migrations = await ctx.db.query("migrations").collect();
    const targetMigration = migrations.find((m) => !m.isDone);

    if (targetMigration) {
      await cancelMigration(ctx, targetMigration._id);
      console.log(`Cancelled migration: ${targetMigration.name}`);
    } else {
      console.log("No running migrations found");
    }
  },
});

/**
 * Run multiple migrations in sequence
 *
 * Use this to chain migrations that depend on each other.
 *
 * @example
 *   export const runAll = internalMutation({
 *     handler: async (ctx) => {
 *       await startMigrationsSerially(ctx, [
 *         internal.migrations.addLeaderboardFields,
 *         internal.migrations.updateArchetypes,
 *         internal.migrations.migrateAdminRoles,
 *       ]);
 *     },
 *   });
 */
