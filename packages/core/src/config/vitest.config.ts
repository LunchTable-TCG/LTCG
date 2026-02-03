/**
 * @module @ltcg/core/config/vitest
 *
 * Shared Vitest configuration for the LTCG monorepo.
 *
 * Provides a standardized test setup with code coverage thresholds,
 * Happy DOM environment, and sensible defaults for test file patterns.
 *
 * @example Basic usage
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 *
 * export default createVitestConfig({
 *   testDir: "src",
 *   setupFiles: ["./test/setup.ts"],
 * });
 * ```
 *
 * @example With custom overrides
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 * import { mergeConfig } from "vitest/config";
 *
 * export default mergeConfig(
 *   createVitestConfig({ testDir: "src" }),
 *   {
 *     test: {
 *       globals: true,
 *       environment: "jsdom", // Override to jsdom
 *     },
 *   }
 * );
 * ```
 *
 * @see {@link https://vitest.dev/config/ Vitest Documentation}
 */

import { defineConfig } from "vitest/config";

/**
 * Configuration options for creating a Vitest config.
 *
 * @interface VitestConfigOptions
 */
export interface VitestConfigOptions {
  /**
   * Test directory relative to project root.
   *
   * All test file patterns will be relative to this directory.
   *
   * @default "src"
   *
   * @example
   * ```typescript
   * createVitestConfig({ testDir: "tests" });
   * // Will look for tests in ./tests/**\/*.test.ts
   * ```
   */
  testDir?: string;

  /**
   * Setup files to run before tests.
   *
   * Use this to configure global test utilities, mocks, or setup logic
   * that should run before your test suite.
   *
   * @example
   * ```typescript
   * createVitestConfig({
   *   setupFiles: ["./test/setup.ts", "./test/mocks.ts"],
   * });
   * ```
   */
  setupFiles?: string[];

  /**
   * Include patterns for test files.
   *
   * Override the default test file patterns. By default, looks for:
   * - `**\/*.test.{ts,tsx}`
   * - `**\/*.spec.{ts,tsx}`
   *
   * @example
   * ```typescript
   * createVitestConfig({
   *   include: ["**\/*.integration.test.ts"],
   * });
   * ```
   */
  include?: string[];
}

/**
 * Create a Vitest configuration with optional overrides.
 *
 * Returns a complete Vitest configuration with:
 * - Happy DOM environment for DOM testing
 * - Global test utilities enabled
 * - Code coverage with v8 provider
 * - 70% coverage thresholds for all metrics
 * - Standard test file patterns
 *
 * @param options - Configuration options
 * @returns A Vitest configuration object
 *
 * @example React component testing
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 * import react from "@vitejs/plugin-react";
 * import { mergeConfig } from "vitest/config";
 *
 * export default mergeConfig(
 *   createVitestConfig({
 *     testDir: "src",
 *     setupFiles: ["./test/setup.ts"],
 *   }),
 *   {
 *     plugins: [react()],
 *   }
 * );
 * ```
 *
 * @example Integration tests
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 *
 * export default createVitestConfig({
 *   testDir: "tests",
 *   include: ["**\/*.integration.test.ts"],
 * });
 * ```
 *
 * @example With custom coverage thresholds
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 * import { mergeConfig } from "vitest/config";
 *
 * export default mergeConfig(
 *   createVitestConfig({ testDir: "src" }),
 *   {
 *     test: {
 *       coverage: {
 *         thresholds: {
 *           lines: 80,
 *           functions: 80,
 *           branches: 75,
 *           statements: 80,
 *         },
 *       },
 *     },
 *   }
 * );
 * ```
 */
export function createVitestConfig(options?: VitestConfigOptions) {
  const testDir = options?.testDir || "src";
  const include = options?.include || [
    `${testDir}/**/*.test.ts`,
    `${testDir}/**/*.test.tsx`,
    `${testDir}/**/*.spec.ts`,
    `${testDir}/**/*.spec.tsx`,
  ];

  return defineConfig({
    test: {
      globals: true,
      environment: "happy-dom",
      setupFiles: options?.setupFiles || [],
      include,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        exclude: [
          "node_modules/",
          "dist/",
          "build/",
          ".next/",
          "**/*.test.ts",
          "**/*.test.tsx",
          "**/*.spec.ts",
          "**/*.spec.tsx",
          "**/*.config.ts",
          "**/*.config.js",
          "**/*.d.ts",
          "**/types/**",
        ],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
      },
    },
  });
}
