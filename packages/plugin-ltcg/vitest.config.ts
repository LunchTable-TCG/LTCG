/**
 * Vitest configuration for packages/plugin-ltcg
 * ElizaOS plugin tests with node environment
 */
import { defineConfig, mergeConfig } from "vitest/config";
import sharedConfig from "../../vitest.shared";

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: "plugin-ltcg",
      environment: "node",
      include: ["__tests__/**/*.test.ts"],
    },
  })
);
