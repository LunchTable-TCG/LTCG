/**
 * E2E Test Environment Configuration
 *
 * Centralizes environment configuration for E2E tests.
 * Provides defaults for local development while allowing override via environment variables.
 *
 * Usage:
 *   import { TEST_ENV, validateTestEnv } from './env';
 *
 *   // Access configuration
 *   const client = new ConvexHttpClient(TEST_ENV.CONVEX_URL);
 *
 *   // Validate on test startup
 *   validateTestEnv();
 */

/**
 * Test environment configuration object.
 *
 * All values have sensible defaults for local development.
 * Override via environment variables for CI/CD.
 */
export const TEST_ENV = {
  /** Convex backend URL */
  CONVEX_URL: process.env["CONVEX_URL"] || "http://127.0.0.1:3210",

  /** Base URL for the web application */
  BASE_URL: process.env["BASE_URL"] || "http://localhost:3000",

  /** Privy application ID */
  PRIVY_APP_ID: process.env["NEXT_PUBLIC_PRIVY_APP_ID"] || "cml0fnzn501t7lc0buoz8kt74",

  /** Whether tests are running in test mode */
  TEST_MODE: true,

  /** Timeout for network operations (ms) */
  NETWORK_TIMEOUT: Number.parseInt(process.env["TEST_NETWORK_TIMEOUT"] || "30000", 10),

  /** Timeout for page loads (ms) */
  PAGE_LOAD_TIMEOUT: Number.parseInt(process.env["TEST_PAGE_LOAD_TIMEOUT"] || "60000", 10),

  /** Whether to run tests in headless mode */
  HEADLESS: process.env["CI"] === "true" || process.env["HEADLESS"] === "true",

  /** Whether running in CI environment */
  IS_CI: process.env["CI"] === "true",
} as const;

/**
 * Required environment variables for tests to run properly.
 */
const REQUIRED_ENV_VARS = ["NEXT_PUBLIC_PRIVY_APP_ID"] as const;

/**
 * Optional environment variables with their purposes.
 * Exported for documentation purposes.
 */
export const OPTIONAL_ENV_VARS = {
  CONVEX_URL: "Convex backend URL (default: http://127.0.0.1:3210)",
  BASE_URL: "Application base URL (default: http://localhost:3000)",
  TEST_NETWORK_TIMEOUT: "Network timeout in ms (default: 30000)",
  TEST_PAGE_LOAD_TIMEOUT: "Page load timeout in ms (default: 60000)",
} as const;

/**
 * Validate that required environment variables are set.
 *
 * Logs warnings for missing variables but uses defaults.
 * Call this during test setup to catch configuration issues early.
 */
export function validateTestEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`[E2E Test Setup] Missing env vars (using defaults): ${missing.join(", ")}`);
  }

  // Log current configuration in CI for debugging
  if (TEST_ENV.IS_CI) {
    console.log("[E2E Test Setup] Configuration:");
    console.log(`  CONVEX_URL: ${TEST_ENV.CONVEX_URL}`);
    console.log(`  BASE_URL: ${TEST_ENV.BASE_URL}`);
    console.log(`  PRIVY_APP_ID: ${TEST_ENV.PRIVY_APP_ID}`);
    console.log(`  HEADLESS: ${TEST_ENV.HEADLESS}`);
  }
}

/**
 * Get the full URL for a given path.
 *
 * @param path - Path to append to base URL (should start with /)
 * @returns Full URL string
 */
export function getTestUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${TEST_ENV.BASE_URL}${normalizedPath}`;
}

/**
 * Check if the test environment is properly configured for E2E tests.
 *
 * @returns true if all required configuration is present
 */
export function isTestEnvReady() {
  return (
    TEST_ENV.TEST_MODE &&
    TEST_ENV.CONVEX_URL.length > 0 &&
    TEST_ENV.BASE_URL.length > 0 &&
    TEST_ENV.PRIVY_APP_ID.length > 0
  );
}
