/**
 * Vitest configuration for convex backend
 * Backend function tests with edge-runtime environment
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "convex",
    environment: "edge-runtime",
    include: ["__tests__/**/*.test.ts"],
  },
});
