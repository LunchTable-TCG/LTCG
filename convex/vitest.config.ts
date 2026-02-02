/**
 * Vitest configuration for convex backend
 * Backend function tests with edge-runtime environment
 */
import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from "../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "convex",
      environment: "edge-runtime",
      include: ["__tests__/**/*.test.ts"],
    },
  })
);
