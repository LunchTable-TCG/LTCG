import type { FullConfig } from "@playwright/test";
import { TEST_ENV, validateTestEnv } from "./env";

async function globalSetup(_config: FullConfig) {
  console.log("🚀 Starting E2E test setup...");
  const skipConvexCheck = process.env.E2E_SKIP_CONVEX_CHECK === "1";

  // Validate environment
  validateTestEnv();

  const maxRetries = 30;

  // Verify Convex backend is running unless explicitly skipped.
  if (skipConvexCheck) {
    console.log("  ⚠ Skipping Convex backend check (E2E_SKIP_CONVEX_CHECK=1)");
  } else {
    console.log("  Checking Convex backend...");
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`${TEST_ENV.CONVEX_URL}/version`);
        if (response.ok) {
          console.log("  ✓ Convex backend is running");
          break;
        }
      } catch {
        if (i === maxRetries - 1) {
          throw new Error(
            `Convex backend not available at ${TEST_ENV.CONVEX_URL}. Run: bunx convex dev`
          );
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Verify web server is running
  console.log("  Checking web server...");
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(TEST_ENV.BASE_URL);
      if (response.ok || response.status === 404) {
        // 404 is OK, means server is running
        console.log("  ✓ Web server is running");
        break;
      }
    } catch {
      if (i === maxRetries - 1) {
        throw new Error(`Web server not available at ${TEST_ENV.BASE_URL}. Run: bun run dev`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log("✅ E2E test setup complete\n");
}

export default globalSetup;
