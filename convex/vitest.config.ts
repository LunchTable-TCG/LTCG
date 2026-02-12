/**
 * Vitest configuration for convex backend
 * Backend function tests with edge-runtime environment
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@data": path.resolve(__dirname, "../data"),
    },
  },
  test: {
    name: "convex",
    environment: "edge-runtime",
    include: ["../convex-tests/**/*.test.ts"],
    setupFiles: ["../convex-tests/setup.ts"],
  },
});
