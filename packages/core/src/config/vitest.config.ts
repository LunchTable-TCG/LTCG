/**
 * Shared Vitest configuration for LTCG monorepo
 *
 * Provides standard test setup with code coverage thresholds.
 */

import { defineConfig } from "vitest/config";

export interface VitestConfigOptions {
  /** Test directory relative to project root */
  testDir?: string;
  /** Setup files to run before tests */
  setupFiles?: string[];
  /** Include patterns for test files */
  include?: string[];
}

/**
 * Create a Vitest configuration with optional overrides
 *
 * @example
 * ```typescript
 * import { createVitestConfig } from "@ltcg/core/config";
 * import { mergeConfig } from "vitest/config";
 *
 * export default mergeConfig(
 *   createVitestConfig({
 *     testDir: "src",
 *     setupFiles: ["./test/setup.ts"]
 *   }),
 *   {
 *     // Your overrides
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
