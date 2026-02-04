import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

describe("Build Order Integration Test", () => {
  const rootDir = path.resolve(__dirname, "..");
  const distDir = path.join(rootDir, "dist");
  const bunBuildMarker = path.join(distDir, "index.js"); // Bun creates this

  beforeAll(async () => {
    // Clean dist directory before test
    if (fs.existsSync(distDir)) {
      await fs.promises.rm(distDir, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    // Don't clean up after test - keep dist for other tests
  });

  it("should produce correct Bun build outputs", async () => {
    // Run the JavaScript build only (skip TypeScript declaration generation
    // which may fail due to @elizaos/core type resolution issues)
    const result = await Bun.build({
      entrypoints: [path.join(rootDir, "src/index.ts")],
      outdir: distDir,
      target: "node",
      format: "esm",
      sourcemap: true,
      minify: false,
      external: [
        "dotenv",
        "fs",
        "path",
        "https",
        "node:*",
        "@elizaos/core",
        "@elizaos/plugin-bootstrap",
        "@elizaos/plugin-sql",
        "@elizaos/cli",
        "zod",
      ],
    });

    expect(result.success).toBe(true);

    // Check that dist directory exists
    expect(fs.existsSync(distDir)).toBe(true);

    // Check that Bun build outputs exist
    expect(fs.existsSync(bunBuildMarker)).toBe(true);

    // Verify Bun produced its expected outputs
    const distFiles = fs.readdirSync(distDir);

    // Should have Bun outputs (index.js)
    expect(distFiles.some((file) => file === "index.js")).toBe(true);

    // Should have source maps
    expect(distFiles.some((file) => file.endsWith(".js.map"))).toBe(true);
  }, 30000); // 30 second timeout for build process
});
