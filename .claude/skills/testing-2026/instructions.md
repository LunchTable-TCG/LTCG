---
name: testing-2026
description: "Modern testing practices for 2026 - Vitest 4 for unit/integration tests and Playwright for E2E testing with best practices"
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, mcp__context7__query-docs]
---

# Testing Best Practices (2026)

Based on Vitest 4.0.7 and Playwright v1.51.0 official documentation (January 2026).

## Testing Philosophy

1. **Test Pyramid**: Unit → Integration → E2E (many → some → few)
2. **Test Behavior, Not Implementation**: Focus on observable outcomes
3. **Isolated Tests**: Each test should be independent
4. **Fast Feedback**: Unit tests should run in milliseconds
5. **Reliable E2E**: Use stable selectors and proper waits

---

## Vitest 4 - Unit & Integration Testing

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test file patterns
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],

    // Environment
    environment: 'node', // 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime'
    globals: true, // inject test APIs globally

    // Execution
    pool: 'forks', // 'threads' | 'forks' | 'vmThreads' | 'vmForks'
    fileParallelism: true,
    maxWorkers: 4,
    testTimeout: 5000,
    hookTimeout: 10000,

    // Reporters
    reporters: ['default'],
    outputFile: {
      json: './test-results.json',
      html: './test-results/index.html'
    },

    // Coverage
    coverage: {
      provider: 'v8', // 'v8' | 'istanbul'
      enabled: false,
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'convex/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/_generated/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },

    // Setup files
    setupFiles: ['./test-utils/setup.ts'],

    // Mocking behavior
    clearMocks: true,
    restoreMocks: true,

    // Sequencing
    sequence: {
      shuffle: false,
      concurrent: false,
    }
  }
})
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something', () => {
    // Arrange
    const input = { value: 42 }

    // Act
    const result = myFunction(input)

    // Assert
    expect(result).toBe(84)
  })

  it('should handle edge cases', () => {
    expect(() => myFunction(null)).toThrow('Invalid input')
  })
})
```

### Mocking Strategies

**1. Mock Functions**

```typescript
import { vi } from 'vitest'

it('calls callback with result', () => {
  const mockCallback = vi.fn()

  processData('input', mockCallback)

  expect(mockCallback).toHaveBeenCalledWith({ result: 'processed' })
  expect(mockCallback).toHaveBeenCalledTimes(1)
})
```

**2. Mock Modules**

```typescript
// Mock external module
vi.mock('./api/userService', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'John' })
}))

it('fetches user data', async () => {
  const user = await getUserProfile('123')
  expect(user.name).toBe('John')
})
```

**3. Mock Service Worker (MSW) for API Mocking**

```typescript
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    if (id === '123') {
      return HttpResponse.json({ name: 'John Doe', email: 'john@example.com' })
    }
    return HttpResponse.json({ error: 'User not found' }, { status: 404 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('handles API success', async () => {
  const user = await fetchUser('123')
  expect(user.name).toBe('John Doe')
})

it('handles API error', async () => {
  await expect(fetchUser('999')).rejects.toThrow('User not found')
})
```

### Testing React Components with Vitest

```typescript
import { render } from 'vitest-browser-react'
import { expect, test } from 'vitest'
import { Fetch } from './Fetch'

test('loads and displays greeting', async () => {
  // Render a React element
  const screen = render(<Fetch url="/greeting" />)

  await screen.getByText('Load Greeting').click()

  // Wait for element to appear
  const heading = screen.getByRole('heading')

  // Assert content
  await expect.element(heading).toHaveTextContent('hello there')
  await expect.element(screen.getByRole('button')).toBeDisabled()
})
```

### Component Isolation with Mocking

```typescript
// Mock child components to focus on parent logic
vi.mock(import('../components/UserCard'), () => ({
  default: vi.fn(({ user }) => `<div>User: ${user.name}</div>`)
}))

test('UserProfile handles loading and data states', async () => {
  const { getByText } = render(<UserProfile userId="123" />)

  // Test loading state
  await expect.element(getByText('Loading...')).toBeInTheDocument()

  // Test for data to load (expect.element auto-retries)
  await expect.element(getByText('User: John')).toBeInTheDocument()
})
```

### Async Testing

```typescript
it('handles async operations', async () => {
  const promise = fetchData()

  // Wait for promise to resolve
  const result = await promise

  expect(result).toEqual({ data: 'value' })
})

it('handles async with timeout', async () => {
  // Use vi.useFakeTimers for time-based tests
  vi.useFakeTimers()

  const callback = vi.fn()
  scheduleTask(callback, 1000)

  // Fast-forward time
  vi.advanceTimersByTime(1000)

  expect(callback).toHaveBeenCalled()

  vi.useRealTimers()
})
```

---

## Playwright - E2E Testing

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Test Organization

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can sign in', async ({ page }) => {
    // Arrange
    await expect(page.getByTestId('login-button')).toBeVisible()

    // Act
    await page.getByTestId('login-button').click()
    await page.getByLabel('Email').fill('test@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Assert
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByTestId('user-menu')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.getByTestId('login-button').click()
    await page.getByLabel('Email').fill('invalid@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  })
})
```

### Selector Strategies (Best to Worst)

**1. ✅ Best: Role-based selectors with accessible name**

```typescript
// ✅ BEST: Semantic, resilient, accessible
await page.getByRole('button', { name: 'Submit' })
await page.getByRole('heading', { name: 'Dashboard' })
await page.getByRole('textbox', { name: 'Email' })
await page.getByLabel('Username')
```

**2. ✅ Good: data-testid attributes**

```typescript
// ✅ GOOD: Explicit test selectors, stable
await page.getByTestId('login-form')
await page.getByTestId('user-menu')
await page.getByTestId('submit-button')
```

**3. ⚠️ OK: Text content (if stable)**

```typescript
// ⚠️ OK: Works but breaks with text changes
await page.getByText('Sign In')
await page.getByText('Welcome back')
```

**4. ❌ Bad: CSS classes or IDs**

```typescript
// ❌ BAD: Fragile, breaks with styling changes
await page.locator('.btn-primary')
await page.locator('#submit-btn')
```

### Chain and Filter Locators

```typescript
// ✅ Narrow down selection with filters
const product = page.getByRole('listitem').filter({ hasText: 'Product 2' })

await product.getByRole('button', { name: 'Add to cart' }).click()

// ✅ Find within specific container
const sidebar = page.getByRole('complementary')
await sidebar.getByRole('link', { name: 'Settings' }).click()
```

### Authentication & Session Management

**Pattern: Reuse authentication state**

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test'

const authFile = '.auth/user.json'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.waitForURL('/dashboard')

  // Save signed-in state
  await page.context().storageState({ path: authFile })
})
```

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'authenticated',
      use: {
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
})
```

**Usage in tests:**

```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/user.json' })

test('user can view dashboard', async ({ page }) => {
  await page.goto('/dashboard')
  // Already authenticated!
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
```

### beforeEach Hook for Test Isolation

```typescript
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Navigate and sign in before EACH test
  await page.goto('https://example.com/login')
  await page.getByLabel('Username').fill('testuser')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
})

test('test 1', async ({ page }) => {
  // Page is already signed in
  await expect(page.getByText('Welcome')).toBeVisible()
})

test('test 2', async ({ page }) => {
  // Page is signed in again (isolated)
  await expect(page.getByText('Welcome')).toBeVisible()
})
```

### Network Mocking

```typescript
test('mocks API response', async ({ page }) => {
  // Mock third-party API
  await page.route('**/api/external-data', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: 'mocked value' }),
  }))

  await page.goto('/dashboard')

  await expect(page.getByText('mocked value')).toBeVisible()
})

test('mocks API failure', async ({ page }) => {
  await page.route('**/api/users', route => route.fulfill({
    status: 500,
    body: 'Internal Server Error',
  }))

  await page.goto('/users')

  await expect(page.getByText(/error loading users/i)).toBeVisible()
})
```

### Parallel vs Serial Execution

**Parallel (default): Tests run concurrently**

```typescript
test.describe('parallel tests', () => {
  test('test 1', async ({ page }) => {
    await page.goto('/page1')
  })

  test('test 2', async ({ page }) => {
    await page.goto('/page2')
  })
})
```

**Serial: Tests run in order**

```typescript
test.describe.configure({ mode: 'serial' })

test.describe('serial workflow', () => {
  test('step 1: login', async ({ page }) => {
    await page.goto('/login')
    // ...
  })

  test('step 2: perform action', async ({ page }) => {
    // Assumes step 1 completed
    await page.goto('/dashboard')
    // ...
  })
})
```

### Test Annotations

```typescript
// Skip test
test.skip('skip this test', async ({ page }) => {
  // Won't run
})

// Conditional skip
test('conditional skip', async ({ page, browserName }) => {
  test.skip(browserName === 'firefox', 'Not supported in Firefox')
  await page.goto('https://example.com')
})

// Only run this test
test.only('focus on this test', async ({ page }) => {
  await page.goto('https://example.com')
})

// Mark as slow (3x timeout)
test('slow test', async ({ page }) => {
  test.slow()
  await page.goto('https://slow-site.com')
})

// Custom timeout
test('custom timeout', async ({ page }) => {
  test.setTimeout(60000) // 60 seconds
  await page.goto('https://example.com')
})
```

### Debugging Techniques

**1. Debug mode (pauses execution)**

```bash
npx playwright test --debug
```

**2. Headed mode (see browser)**

```bash
npx playwright test --headed
```

**3. UI mode (interactive)**

```bash
npx playwright test --ui
```

**4. Pause execution**

```typescript
test('debug test', async ({ page }) => {
  await page.goto('/login')

  // Pause here for inspection
  await page.pause()

  await page.getByRole('button', { name: 'Sign in' }).click()
})
```

**5. Screenshots and traces**

```typescript
test('capture screenshot', async ({ page }) => {
  await page.goto('/dashboard')

  // Manual screenshot
  await page.screenshot({ path: 'screenshot.png' })

  // Full page screenshot
  await page.screenshot({ path: 'full-page.png', fullPage: true })
})
```

---

## Testing Patterns

### Test Pyramid Distribution

```
         /\
        /E2E\         ~10-20 tests (critical user journeys)
       /------\
      /  INT   \      ~50-100 tests (API + DB integration)
     /----------\
    /   UNIT     \    ~200-500 tests (business logic)
   /--------------\
```

### What to Test at Each Layer

**Unit Tests (Vitest):**
- Pure functions
- Business logic
- Utilities and helpers
- Input validation
- Edge cases

**Integration Tests (Vitest + Real Services):**
- API endpoints
- Database queries
- Authentication flows
- External service integration
- Component with hooks

**E2E Tests (Playwright):**
- Critical user journeys
- Authentication flows
- CRUD operations
- Multi-step workflows
- Cross-browser compatibility

### Example: Testing a Feature at All Levels

**Feature: User can purchase items from shop**

**Unit Test:**

```typescript
// lib/economy.test.ts
import { describe, it, expect } from 'vitest'
import { calculatePurchase } from './economy'

describe('calculatePurchase', () => {
  it('calculates correct total', () => {
    const result = calculatePurchase({ price: 100, quantity: 3, tax: 0.1 })
    expect(result.total).toBe(330) // 100 * 3 * 1.1
  })

  it('throws for insufficient balance', () => {
    expect(() =>
      calculatePurchase({ price: 100, balance: 50 })
    ).toThrow('Insufficient balance')
  })
})
```

**Integration Test (Convex):**

```typescript
// convex/economy.test.ts
import { convexTest } from 'convex-test'
import { describe, it, expect } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

describe('purchase mutation', () => {
  it('deducts balance and records purchase', async () => {
    const t = convexTest(schema)

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert('users', { balance: 200 })
    })

    t.withIdentity({ subject: userId })

    await t.mutation(api.economy.purchase, { itemId: 'item1', cost: 50 })

    const user = await t.run(async (ctx) => await ctx.db.get(userId))
    expect(user?.balance).toBe(150)

    const purchases = await t.query(api.economy.listPurchases, {})
    expect(purchases).toHaveLength(1)
    expect(purchases[0].cost).toBe(50)
  })
})
```

**E2E Test (Playwright):**

```typescript
// e2e/shop.spec.ts
import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/user.json' })

test('user can purchase item from shop', async ({ page }) => {
  await page.goto('/shop')

  // Check initial balance
  const balance = await page.getByTestId('user-balance').textContent()
  expect(balance).toBe('200')

  // Select item
  await page.getByRole('button', { name: 'Sword - 50 gold' }).click()

  // Confirm purchase
  await page.getByRole('button', { name: 'Confirm Purchase' }).click()

  // Wait for confirmation
  await expect(page.getByText('Purchase successful')).toBeVisible()

  // Verify balance updated
  await expect(page.getByTestId('user-balance')).toHaveText('150')

  // Verify item in inventory
  await page.goto('/inventory')
  await expect(page.getByText('Sword')).toBeVisible()
})
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test:unit

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Quick Reference

### Vitest Assertions

```typescript
expect(value).toBe(42)
expect(value).toEqual({ a: 1 })
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(array).toContain('item')
expect(array).toHaveLength(3)
expect(string).toMatch(/pattern/)
expect(() => fn()).toThrow('error')
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith('arg')
```

### Playwright Assertions

```typescript
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle('Dashboard')
await expect(element).toBeVisible()
await expect(element).toBeHidden()
await expect(element).toBeEnabled()
await expect(element).toBeDisabled()
await expect(element).toHaveText('text')
await expect(element).toContainText('partial')
await expect(element).toHaveAttribute('href', '/link')
```

---

## Resources

- **Vitest Docs**: https://vitest.dev
- **Playwright Docs**: https://playwright.dev
- **Testing Library**: https://testing-library.com
- **MSW**: https://mswjs.io
- **Context7 Vitest**: /vitest-dev/vitest/v4.0.7
- **Context7 Playwright**: /microsoft/playwright/v1.51.0
