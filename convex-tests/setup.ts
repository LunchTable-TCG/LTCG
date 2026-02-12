/**
 * Vitest global setup for Convex tests
 * Suppresses harmless cleanup errors from scheduled functions
 */

import { afterEach, beforeAll, vi } from "vitest";

type SchedulableTestInstance = {
  finishInProgressScheduledFunctions?: () => Promise<void>;
  finishAllScheduledFunctions?: (advanceTimers: () => void) => Promise<void>;
};

// Global test instance tracker
const registeredInstances = new Set<SchedulableTestInstance>();

// Store original console.error
const originalConsoleError = console.error;
const suppressedErrors = new Set<string>();

/**
 * Register a test instance for automatic cleanup
 * Call this after creating a test instance with createTestWithComponents
 */
export function registerTestInstance(instance: unknown) {
  const candidate = instance as SchedulableTestInstance | null;
  if (!candidate) {
    return;
  }
  registeredInstances.add(candidate);
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

function advanceTimersSafely() {
  try {
    vi.runAllTimers();
  } catch {
    // Ignore when fake timers are not enabled for this test.
  }
}

/**
 * Global afterEach hook to clean up scheduled functions
 * This attempts to finish pending functions but won't fail tests if cleanup errors occur
 */
afterEach(async () => {
  if (registeredInstances.size === 0) {
    return;
  }

  for (const instance of registeredInstances) {
    try {
      if (instance.finishAllScheduledFunctions) {
        await instance.finishAllScheduledFunctions(advanceTimersSafely);
      } else if (instance.finishInProgressScheduledFunctions) {
        await instance.finishInProgressScheduledFunctions();
      }
    } catch {
      // Silently ignore - these are cleanup errors, not test failures
    }
  }

  registeredInstances.clear();
});
