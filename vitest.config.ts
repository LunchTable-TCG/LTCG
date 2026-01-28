import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Make describe, it, expect available globally
    globals: true,

    // Default environment for frontend tests
    environment: "happy-dom",

    // Use different environments based on file location
    environmentMatchGlobs: [
      // Convex backend tests use edge-runtime
      ["convex/**/*.test.ts", "edge-runtime"],
      // Convex test utils use edge-runtime
      ["convex_test_utils/**/*.ts", "edge-runtime"],
    ],

    // Setup files for React component tests (only for happy-dom environment)
    setupFiles: ["./apps/web/src/test/setup.ts"],

    // Test file patterns
    include: [
      "**/*.test.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],

    // Exclude node_modules
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],

    // Server configuration for convex-test
    server: {
      deps: {
        inline: ["convex-test"]
      }
    },

    // Global test timeout
    testTimeout: 10000,
  },

  // Path aliases for frontend tests
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@convex": path.resolve(__dirname, "./convex"),
      "@convex/_generated": path.resolve(__dirname, "./convex/_generated"),
    },
  },
});
