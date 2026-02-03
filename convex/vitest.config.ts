/**
 * Vitest configuration for convex backend
 * Backend function tests with edge-runtime environment
 */
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "convex",
    environment: "edge-runtime",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@convex": path.resolve(__dirname, "./"),
      "@convex/_generated": path.resolve(__dirname, "./_generated"),
    },
  },
});
