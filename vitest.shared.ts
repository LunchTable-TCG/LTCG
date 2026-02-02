/**
 * Shared Vitest configuration for all workspaces
 * Each workspace extends this with its own environment and settings
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    testTimeout: 10000,
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web/src"),
      "@convex": path.resolve(__dirname, "./convex"),
      "@convex/_generated": path.resolve(__dirname, "./convex/_generated"),
      "@convex-test-utils": path.resolve(__dirname, "./convex_test_utils"),
    },
  },
});
