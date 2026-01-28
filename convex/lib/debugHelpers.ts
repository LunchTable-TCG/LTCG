/**
 * Debug Helper Utilities for Convex Functions
 *
 * Provides decorators and utilities to easily add debugging to mutations, queries, and actions
 */

import type { MutationCtx, QueryCtx, ActionCtx } from "../_generated/server";
import { logger, performance, createTraceContext, type LogContext } from "./debug";

// ============================================================================
// Type Definitions
// ============================================================================

type ConvexCtx = MutationCtx | QueryCtx | ActionCtx;

export interface DebugOptions {
  /** Name of the function for logging */
  functionName: string;
  /** Type of function (mutation, query, action) */
  functionType: "mutation" | "query" | "action";
  /** Whether to log arguments */
  logArgs?: boolean;
  /** Whether to log result */
  logResult?: boolean;
  /** Whether to measure performance */
  measurePerformance?: boolean;
  /** Custom context to include in logs */
  context?: LogContext;
}

// ============================================================================
// Wrapper Functions
// ============================================================================

/**
 * Wrap a Convex mutation with automatic debug logging
 *
 * @example
 * ```ts
 * export const myMutation = mutation({
 *   args: { userId: v.id("users") },
 *   handler: withMutationDebug(
 *     "myMutation",
 *     async (ctx, args) => {
 *       // Your mutation logic
 *       return result;
 *     }
 *   ),
 * });
 * ```
 */
export function withMutationDebug<TArgs extends Record<string, unknown>, TResult>(
  functionName: string,
  handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>,
  options?: Partial<Omit<DebugOptions, "functionName" | "functionType">>
): (ctx: MutationCtx, args: TArgs) => Promise<TResult> {
  return async (ctx: MutationCtx, args: TArgs): Promise<TResult> => {
    const opId = `${functionName}_${Date.now()}`;
    const measurePerf = options?.measurePerformance !== false;
    const logArgs = options?.logArgs !== false;
    const logResult = options?.logResult !== false;

    if (measurePerf) {
      performance.start(opId);
    }

    const userId = args["userId"] as string | undefined;
    logger.mutation(functionName, userId || "unknown", logArgs ? args : undefined);

    const traceCtx = createTraceContext(functionName, { ...options?.context, userId });

    try {
      const result = await handler(ctx, args);

      if (logResult) {
        logger.debug(`${functionName} completed successfully`, { ...traceCtx, resultType: typeof result });
      }

      if (measurePerf) {
        performance.end(opId, traceCtx);
      }

      return result;
    } catch (error) {
      logger.error(`Error in ${functionName}`, error as Error, traceCtx);

      if (measurePerf) {
        performance.end(opId, { ...traceCtx, error: true });
      }

      throw error;
    }
  };
}

/**
 * Wrap a Convex query with automatic debug logging
 *
 * @example
 * ```ts
 * export const myQuery = query({
 *   args: { userId: v.id("users") },
 *   handler: withQueryDebug(
 *     "myQuery",
 *     async (ctx, args) => {
 *       // Your query logic
 *       return result;
 *     }
 *   ),
 * });
 * ```
 */
export function withQueryDebug<TArgs extends Record<string, unknown>, TResult>(
  functionName: string,
  handler: (ctx: QueryCtx, args: TArgs) => Promise<TResult>,
  options?: Partial<Omit<DebugOptions, "functionName" | "functionType">>
): (ctx: QueryCtx, args: TArgs) => Promise<TResult> {
  return async (ctx: QueryCtx, args: TArgs): Promise<TResult> => {
    const opId = `${functionName}_${Date.now()}`;
    const measurePerf = options?.measurePerformance !== false;
    const logArgs = options?.logArgs !== false;
    const logResult = options?.logResult !== false;

    if (measurePerf) {
      performance.start(opId);
    }

    const userId = args["userId"] as string | undefined;
    logger.query(functionName, userId, logArgs ? args : undefined);

    const traceCtx = createTraceContext(functionName, { ...options?.context, userId });

    try {
      const result = await handler(ctx, args);

      if (logResult) {
        logger.debug(`${functionName} completed successfully`, { ...traceCtx, resultType: typeof result });
      }

      if (measurePerf) {
        performance.end(opId, traceCtx);
      }

      return result;
    } catch (error) {
      logger.error(`Error in ${functionName}`, error as Error, traceCtx);

      if (measurePerf) {
        performance.end(opId, { ...traceCtx, error: true });
      }

      throw error;
    }
  };
}

/**
 * Wrap a Convex action with automatic debug logging
 *
 * @example
 * ```ts
 * export const myAction = action({
 *   args: { userId: v.id("users") },
 *   handler: withActionDebug(
 *     "myAction",
 *     async (ctx, args) => {
 *       // Your action logic
 *       return result;
 *     }
 *   ),
 * });
 * ```
 */
export function withActionDebug<TArgs extends Record<string, unknown>, TResult>(
  functionName: string,
  handler: (ctx: ActionCtx, args: TArgs) => Promise<TResult>,
  options?: Partial<Omit<DebugOptions, "functionName" | "functionType">>
): (ctx: ActionCtx, args: TArgs) => Promise<TResult> {
  return async (ctx: ActionCtx, args: TArgs): Promise<TResult> => {
    const opId = `${functionName}_${Date.now()}`;
    const measurePerf = options?.measurePerformance !== false;
    const logArgs = options?.logArgs !== false;
    const logResult = options?.logResult !== false;

    if (measurePerf) {
      performance.start(opId);
    }

    const userId = args["userId"] as string | undefined;
    logger.action(functionName, { ...options?.context, userId, args: logArgs ? args : undefined });

    const traceCtx = createTraceContext(functionName, { ...options?.context, userId });

    try {
      const result = await handler(ctx, args);

      if (logResult) {
        logger.debug(`${functionName} completed successfully`, { ...traceCtx, resultType: typeof result });
      }

      if (measurePerf) {
        performance.end(opId, traceCtx);
      }

      return result;
    } catch (error) {
      logger.error(`Error in ${functionName}`, error as Error, traceCtx);

      if (measurePerf) {
        performance.end(opId, { ...traceCtx, error: true });
      }

      throw error;
    }
  };
}

// ============================================================================
// Database Operation Helpers
// ============================================================================

/**
 * Log a database query with performance tracking
 */
export async function withDbQuery<T>(
  _ctx: ConvexCtx,
  operation: string,
  table: string,
  queryFn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const opId = `db_${operation}_${table}_${Date.now()}`;
  performance.start(opId);

  logger.dbOperation(operation, table, context);

  try {
    const result = await queryFn();
    performance.end(opId, context);
    return result;
  } catch (error) {
    logger.error(`Database ${operation} on ${table} failed`, error as Error, context);
    performance.end(opId, { ...context, error: true });
    throw error;
  }
}

// ============================================================================
// Batch Operation Helpers
// ============================================================================

/**
 * Log a batch operation with individual item tracking
 */
export async function withBatchOperation<T, R>(
  operationName: string,
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  context?: LogContext
): Promise<R[]> {
  const opId = `batch_${operationName}_${Date.now()}`;
  const traceCtx = createTraceContext(operationName, { ...context, itemCount: items.length });

  logger.info(`Starting batch operation: ${operationName}`, traceCtx);
  performance.start(opId);

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const result = await processor(items[i]!, i);
      results.push(result);
      logger.debug(`Batch ${operationName} item ${i + 1}/${items.length} succeeded`, traceCtx);
    } catch (error) {
      errors.push({ index: i, error: error as Error });
      logger.error(`Batch ${operationName} item ${i + 1}/${items.length} failed`, error as Error, traceCtx);
    }
  }

  performance.end(opId, { ...traceCtx, successCount: results.length, errorCount: errors.length });

  logger.info(`Batch operation ${operationName} completed`, {
    ...traceCtx,
    successCount: results.length,
    errorCount: errors.length,
    totalItems: items.length,
  });

  return results;
}
