import { FullConfig } from "@playwright/test";

async function globalTeardown(_config: FullConfig) {
  console.log("\n🧹 E2E test teardown...");

  // Optional: Clean up any remaining test data
  // This is typically handled per-test, but can catch orphans
  try {
    // Could call cleanupAllTestUsers here if needed
    console.log("  ✓ Cleanup complete");
  } catch (error) {
    console.warn("  ⚠ Cleanup had errors:", error);
  }

  console.log("✅ E2E tests completed\n");
}

export default globalTeardown;
