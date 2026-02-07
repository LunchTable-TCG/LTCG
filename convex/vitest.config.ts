/**
 * Vitest configuration for convex backend
 * Backend function tests with edge-runtime environment
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "convex",
    environment: "edge-runtime",
    include: ["../convex-tests/**/*.test.ts"],
    setupFiles: ["../convex-tests/setup.ts"],
  },
});
