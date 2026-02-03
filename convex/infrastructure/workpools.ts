/**
 * Workpool Configurations
 *
 * Defines workpool instances for different types of background jobs.
 * Workpools provide parallel execution with configurable concurrency limits
 * and automatic retry behavior for fault-tolerant background processing.
 *
 * Benefits:
 * - Controlled parallelism prevents overwhelming the system
 * - Automatic retries for transient failures
 * - Isolation between different job types
 * - Better observability and monitoring per workload
 */

import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

/**
 * Get the workpool component with runtime validation
 *
 * The workpool component must be properly configured in convex.config.ts
 * before it can be used. This helper provides clear error messages if
 * the component is missing.
 */
function getWorkpoolComponent() {
  // biome-ignore lint/suspicious/noExplicitAny: Convex component type workaround
  const comp = (components as any).workpool;
  if (!comp) {
    throw new Error(
      "Workpool component not found. Ensure @convex-dev/workpool is:\n" +
        "  1. Installed: npm install @convex-dev/workpool\n" +
        "  2. Registered in convex.config.ts: app.use(workpool, { name: 'default' })\n" +
        "  3. Types generated: npx convex codegen"
    );
  }
  return comp;
}

const workpoolComponent = getWorkpoolComponent();

/**
 * Batch Operations Pool
 *
 * Handles admin batch operations like bulk currency grants, card distribution,
 * and player data updates. Limited parallelism prevents overwhelming the database
 * during large batch operations.
 *
 * Parallelism: 5 (handles ~50 concurrent batch operations with 10 items each)
 * Retry: Enabled (transient failures are retried automatically)
 *
 * Use for:
 * - Admin batch currency grants (batchAdmin.grantGoldToPlayers)
 * - Bulk card distribution
 * - Mass player data updates
 */
export const batchOperationsPool = new Workpool(workpoolComponent, {
  maxParallelism: 5,
  retryActionsByDefault: true,
});

/**
 * Migrations Pool
 *
 * Executes database migrations with conservative parallelism to ensure
 * data consistency and prevent migration conflicts. Retries enabled for
 * handling OCC conflicts during large-scale data transformations.
 *
 * Parallelism: 3 (conservative for data safety)
 * Retry: Enabled (handles OCC conflicts during migrations)
 *
 * Use for:
 * - Schema migrations (addLeaderboardFields, updateArchetypes)
 * - Data transformations
 * - Backfill operations
 */
export const migrationsPool = new Workpool(workpoolComponent, {
  maxParallelism: 3,
  retryActionsByDefault: true,
});

/**
 * Background Jobs Pool
 *
 * General-purpose pool for periodic maintenance tasks and background processing.
 * Higher parallelism supports multiple concurrent background operations without
 * blocking user-facing features.
 *
 * Parallelism: 10 (handles diverse background workloads)
 * Retry: Enabled (ensures maintenance tasks complete successfully)
 *
 * Use for:
 * - Token balance refresh
 * - Leaderboard maintenance
 * - Stats aggregation
 * - Cache invalidation
 * - Email notifications
 */
export const backgroundJobsPool = new Workpool(workpoolComponent, {
  maxParallelism: 10,
  retryActionsByDefault: true,
});

/**
 * Tournament Processing Pool
 *
 * Handles tournament-related operations like bracket generation, match scheduling,
 * and results processing. Strict serialization (maxParallelism: 1) ensures tournament
 * operations execute in correct order and prevents race conditions in tournament state.
 *
 * Parallelism: 1 (strict serialization)
 * Retry: Enabled (ensures tournament state consistency)
 *
 * CRITICAL: Tournament operations have strict ordering requirements:
 * - Bracket generation must complete before matches can start
 * - Match results must be processed serially to prevent state inconsistencies
 * - Prize distribution depends on all matches being finalized
 * - Parallel execution would cause race conditions in tournament state
 *
 * Use for:
 * - Tournament bracket generation
 * - Match result processing
 * - Tournament advancement logic
 * - Prize distribution
 */
export const tournamentsPool = new Workpool(workpoolComponent, {
  maxParallelism: 1, // Serialize tournament operations to prevent race conditions
  retryActionsByDefault: true,
});
