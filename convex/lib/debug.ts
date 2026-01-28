/**
 * Centralized Debug and Logging Utilities for Convex Backend
 *
 * Usage:
 * - Use logger.info() for important business events
 * - Use logger.debug() for detailed debugging (only in dev)
 * - Use logger.error() for errors with full context
 * - Use logger.warn() for potential issues
 * - Use performance.start/end() to measure operation times
 * - Use trace() to track request flows across functions
 */

// ============================================================================
// Types
// ============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  userId?: string;
  lobbyId?: string;
  gameId?: string;
  playerId?: string;
  cardId?: string;
  operationId?: string;
  traceId?: string;
  [key: string]: unknown;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  context?: LogContext;
}

// ============================================================================
// Environment Configuration
// ============================================================================

const IS_PRODUCTION = process.env["CONVEX_CLOUD_URL"] !== undefined;
const LOG_LEVEL: LogLevel = (process.env["LOG_LEVEL"] as LogLevel) || (IS_PRODUCTION ? "info" : "debug");

// Log level hierarchy
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============================================================================
// Core Logger
// ============================================================================

class ConvexLogger {
  private minLevel: number;

  constructor(minLevel: LogLevel = LOG_LEVEL) {
    this.minLevel = LOG_LEVELS[minLevel];
  }

  /**
   * Check if a log level should be emitted
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= this.minLevel;
  }

  /**
   * Format log message with context
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
    const errorStr = error ? ` | Error: ${error.message}\nStack: ${error.stack}` : "";

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}${errorStr}`;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage("debug", message, context));
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage("info", message, context));
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  /**
   * Log errors with full context
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, context, error));
    }
  }

  /**
   * Log function entry (debug only)
   */
  functionEntry(functionName: string, args?: Record<string, unknown>): void {
    this.debug(`→ ${functionName}`, { args });
  }

  /**
   * Log function exit (debug only)
   */
  functionExit(functionName: string, result?: unknown): void {
    this.debug(`← ${functionName}`, { result: typeof result });
  }

  /**
   * Log database operation
   */
  dbOperation(operation: string, table: string, context?: LogContext): void {
    this.debug(`DB: ${operation} on ${table}`, context);
  }

  /**
   * Log mutation
   */
  mutation(name: string, userId: string, args?: Record<string, unknown>): void {
    this.info(`Mutation: ${name}`, { userId, args });
  }

  /**
   * Log query
   */
  query(name: string, userId?: string, args?: Record<string, unknown>): void {
    this.debug(`Query: ${name}`, { userId, args });
  }

  /**
   * Log action
   */
  action(name: string, context?: LogContext): void {
    this.info(`Action: ${name}`, context);
  }
}

// ============================================================================
// Performance Monitoring
// ============================================================================

class PerformanceMonitor {
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  start(operationId: string): void {
    this.timers.set(operationId, Date.now());
    logger.debug(`⏱️  Started: ${operationId}`);
  }

  /**
   * End timing and log duration
   */
  end(operationId: string, context?: LogContext): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      logger.warn(`No timer found for operation: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    logger.info(`⏱️  Completed: ${operationId} (${duration}ms)`, { ...context, duration });

    // Warn on slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation detected: ${operationId} took ${duration}ms`, context);
    }

    return duration;
  }

  /**
   * Measure async operation
   */
  async measure<T>(
    operationId: string,
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    this.start(operationId);
    try {
      const result = await operation();
      this.end(operationId, context);
      return result;
    } catch (error) {
      this.end(operationId, { ...context, error: true });
      throw error;
    }
  }
}

// ============================================================================
// Request Tracing
// ============================================================================

/**
 * Generate a unique trace ID for request correlation
 */
export function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a traced operation context
 */
export function createTraceContext(
  operationName: string,
  context?: Omit<LogContext, "traceId">
): LogContext {
  const traceId = generateTraceId();
  logger.info(`🔍 Starting trace: ${operationName}`, { ...context, traceId });
  return { ...context, traceId };
}

// ============================================================================
// Error Logging Helpers
// ============================================================================

/**
 * Log an error with full context and return a sanitized error for the client
 */
export function logAndSanitizeError(
  error: unknown,
  operation: string,
  context?: LogContext
): Error {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  logger.error(`Error in ${operation}`, errorObj, context);

  // In production, return generic error message
  if (IS_PRODUCTION) {
    return new Error("An error occurred. Please try again.");
  }

  return errorObj;
}

/**
 * Wrap a function with error logging
 */
export function withErrorLogging<T extends (...args: any[]) => any>(
  fn: T,
  functionName: string
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      logger.functionEntry(functionName, { argsLength: args.length });
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((value) => {
            logger.functionExit(functionName);
            return value;
          })
          .catch((error) => {
            logger.error(`Error in ${functionName}`, error);
            throw error;
          }) as ReturnType<T>;
      }

      logger.functionExit(functionName);
      return result;
    } catch (error) {
      logger.error(`Error in ${functionName}`, error as Error);
      throw error;
    }
  }) as T;
}

// ============================================================================
// Game-Specific Debug Helpers
// ============================================================================

/**
 * Log game state for debugging
 */
export function logGameState(
  lobbyId: string,
  phase: string,
  context: LogContext
): void {
  logger.debug(`Game State: ${lobbyId}`, { phase, ...context });
}

/**
 * Log card effect execution
 */
export function logCardEffect(
  cardName: string,
  effectType: string,
  success: boolean,
  context?: LogContext
): void {
  const level = success ? "info" : "warn";
  logger[level](`Card Effect: ${cardName} - ${effectType}`, { ...context, success });
}

/**
 * Log matchmaking event
 */
export function logMatchmaking(
  event: string,
  playerId: string,
  context?: LogContext
): void {
  logger.info(`Matchmaking: ${event}`, { playerId, ...context });
}

// ============================================================================
// Exports
// ============================================================================

export const logger = new ConvexLogger();
export const performance = new PerformanceMonitor();

// Export for testing/debugging
export const __testing__ = {
  IS_PRODUCTION,
  LOG_LEVEL,
  LOG_LEVELS,
};
