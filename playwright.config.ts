import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 *
 * Architecture follows 2026 standards with:
 * - Mock JWT authentication (Privy pattern)
 * - Per-test data seeding via Convex
 * - Page Object Model for test organization
 * - Smoke tests for fast PR validation
 * - Full suite with browser matrix for main branch
 *
 * Prerequisites:
 * - Run `bun run dev` to start the Next.js app on port 3333
 * - Run `bun run dev:convex` to start the Convex backend
 * - Ensure NODE_ENV=test for test-specific behaviors
 *
 * Usage:
 * - Smoke tests: `bunx playwright test --project=smoke`
 * - All tests: `bunx playwright test`
 * - Specific browser: `bunx playwright test --project=chromium`
 * - UI mode: `bunx playwright test --ui`
 * - Debug mode: `bunx playwright test --debug`
 */

const isCI = !!process.env["CI"];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html"]],

  // Global setup/teardown
  globalSetup: "./e2e/setup/global-setup.ts",
  globalTeardown: "./e2e/setup/global-teardown.ts",

  use: {
    baseURL: process.env["BASE_URL"] || "http://localhost:3334",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test projects
  projects: [
    // Smoke tests - fast, critical paths only
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Full suite - Chromium
    {
      name: "chromium",
      testIgnore: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Firefox
    {
      name: "firefox",
      testIgnore: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Firefox"] },
    },

    // WebKit (Safari)
    {
      name: "webkit",
      testIgnore: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile Chrome
    {
      name: "mobile-chrome",
      testIgnore: /smoke\.spec\.ts/,
      use: { ...devices["Pixel 5"] },
    },
  ],

  // Dev server (only when not in CI)
  webServer: isCI
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:3334",
        reuseExistingServer: true,
        timeout: 120000,
      },

  // Output directories
  outputDir: "./test-results",
});
