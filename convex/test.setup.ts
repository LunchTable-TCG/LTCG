/**
 * Test setup for convex-test
 *
 * Provides module loader for convex-test when running with Vitest
 */

import type { ImportGlobOptions } from "vite";

// Load all Convex modules for testing
// This works with Vite/Vitest but not with Bun's test runner
export const modules = (import.meta as { glob: (pattern: string, options?: ImportGlobOptions) => Record<string, unknown> }).glob("./**/*.ts");
