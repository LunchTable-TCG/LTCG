/**
 * Vitest configuration for apps/web
 * React component and hook tests with happy-dom environment
 */
import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from "../../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "web",
      environment: "happy-dom",
      include: ["__tests__/**/*.test.{ts,tsx}"],
      setupFiles: ["./src/test/setup.ts"],
    },
  })
);
