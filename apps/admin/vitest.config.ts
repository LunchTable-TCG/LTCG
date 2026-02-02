/**
 * Vitest configuration for apps/admin
 * Admin dashboard tests with happy-dom environment
 */
import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from "../../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "admin",
      environment: "happy-dom",
      include: ["__tests__/**/*.test.{ts,tsx}"],
    },
  })
);
