import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 *
 * Tests are located in the e2e/ directory and test critical game flows
 * including authentication, deck management, gameplay, economy, story mode, and social features.
 *
 * Prerequisites:
 * - Run `bun run dev` to start the Next.js app on port 3000
 * - Run `bun run dev:convex` to start the Convex backend
 * - Ensure .env.local has required environment variables
 *
 * Usage:
 * - Run all tests: `bun run test:e2e`
 * - Run specific test: `bun run test:e2e e2e/auth.spec.ts`
 * - Run in UI mode: `bun run test:e2e:ui`
 * - Debug mode: `bun run test:e2e:debug`
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Test timeouts
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Run tests sequentially to avoid race conditions in game state
  fullyParallel: false,
  workers: 1,

  // Retry failed tests once in CI
  retries: process.env.CI ? 1 : 0,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Global configuration
  use: {
    baseURL: 'http://localhost:3000',

    // Capture trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on first retry
    video: 'retain-on-failure',

    // Browser viewport
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 15000,
  },

  // Projects - test in different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test in other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'mobile-chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Web server configuration - auto-start dev server if not running
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // Output directories
  outputDir: 'test-results',
});
