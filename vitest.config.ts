/**
 * Root Vitest configuration using projects
 * Each workspace has its own config that extends vitest.shared.ts
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Note: plugin-ltcg uses bun:test, not vitest
    projects: [
      "apps/web",
      "apps/admin",
      "convex",
      "packages/engine",
    ],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      reportsDirectory: "./coverage",
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
        "**/.next/**",
        "**/coverage/**",
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
