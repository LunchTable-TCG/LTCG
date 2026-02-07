/**
 * Vitest global setup for Convex tests
 * Suppresses harmless cleanup errors from scheduled functions
 */

import { afterEach, beforeAll } from "vitest";

// Global test instance tracker
let currentTestInstance: unknown = null;

// Store original console.error
const originalConsoleError = console.error;
const suppressedErrors = new Set<string>();

/**
 * Register a test instance for automatic cleanup
 * Call this after creating a test instance with createTestWithComponents
 */
export function registerTestInstance(instance: unknown) {
  currentTestInstance = instance;
}

/**
 * Suppress specific error patterns that are harmless framework warnings
 */
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const errorMessage = args.join(" ");

    // Suppress "Write outside of transaction" errors for scheduled functions
    // These are harmless cleanup warnings that occur during test teardown
    if (
      errorMessage.includes("Write outside of transaction") &&
      errorMessage.includes("_scheduled_functions")
    ) {
      suppressedErrors.add(errorMessage);
      return; // Silently ignore
    }

    // Suppress "Replace on non-existent document" errors during cleanup
    // These happen when scheduled functions try to update documents that were cleaned up
    if (
      errorMessage.includes("Replace on non-existent document") &&
      errorMessage.includes("runs")
    ) {
      suppressedErrors.add(errorMessage);
      return; // Silently ignore
    }

    // Pass through all other errors
    originalConsoleError(...args);
  };
});

/**
 * Global afterEach hook to clean up scheduled functions
 * This attempts to finish pending functions but won't fail tests if cleanup errors occur
 */
afterEach(async () => {
  if (currentTestInstance) {
    try {
      // Attempt to finish any pending scheduled functions
      await currentTestInstance.finishInProgressScheduledFunctions();
    } catch {
      // Silently ignore - these are cleanup errors, not test failures
    } finally {
      currentTestInstance = null;
    }
  }
});
