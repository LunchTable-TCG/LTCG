# Testing Quick Start Guide 🚀

## 30-Second Overview

This project has **4 layers of tests** that catch different bug categories:

1. **Unit Tests** (45 tests, 10s) - Component/hook logic
2. **Convex Tests** (~30 tests, 30s) - Backend functions
3. **Integration Tests** (62 tests, 2min) - **Real backend, real bugs**
4. **E2E Tests** (19+ tests, 5min) - Full user journeys

---

## Most Common Commands

```bash
# Run everything (PR validation)
bun run test:ci                    # ~3min

# Run just frontend unit tests
bun run test:unit                  # 10s - Fastest feedback

# Run integration tests (requires Convex dev server)
bunx convex dev                    # Terminal 1
bun run test:integration           # Terminal 2

# Run specific integration test
bunx vitest tests/integration/auth-matrix.test.ts

# Run E2E smoke test (critical path)
bun run test:e2e:smoke             # ~1min

# Run all E2E tests
bun run test:e2e                   # ~5min

# Debug failing E2E test
bun run test:e2e:debug
```

---

## First Time Setup

```bash
# 1. Install dependencies
bun install

# 2. Install Playwright browsers (for E2E)
bunx playwright install

# 3. Copy environment config
cp .env.test.example .env.test

# 4. Start Convex dev server (for integration tests)
bunx convex dev

# 5. Run tests!
bun run test:ci
```

---

## When to Run Which Tests

### Before Committing
```bash
bun run test:unit          # Quick validation (<10s)
```

### Before Creating PR
```bash
bun run test:ci            # Full PR validation (~3min)
```

### Before Merging to Main
```bash
bun run test:integration   # Catch integration issues (~2min)
```

### Before Deploying to Production
```bash
bun run test:all           # Everything (~8min)
```

---

## Test Categories & What They Catch

### Unit Tests (Fast)
**What**: Component rendering, hook logic, utility functions
**Catches**: UI bugs, calculation errors, validation issues
**Example**: Button variants render correctly

### Convex Tests (Medium)
**What**: Backend function logic with mocked runtime
**Catches**: Validation errors, business logic bugs
**Example**: Pack purchase validates sufficient funds

### Integration Tests (Critical) ⚠️
**What**: Real Convex backend, real database operations
**Catches**: **The most dangerous bugs**:
- ✅ Unauthorized data access (User A reading User B's data)
- ✅ Race conditions (double-spend exploits)
- ✅ Missing indexes (production timeouts)
- ✅ Currency exploits (negative gold)
- ✅ Data integrity violations

**Example**: Two users buying packs simultaneously can't overspend

### E2E Tests (Comprehensive)
**What**: Real browser, real user journeys
**Catches**: Real-time bugs, stale data, auth flows
**Example**: Opponent's move appears in UI within 2 seconds

---

## Troubleshooting

### "convex-test import.meta.glob error"
**Solution**: Use Vitest instead of Bun test runner
```bash
bunx vitest tests/integration
```

### "Convex backend not running"
**Solution**: Start dev server first
```bash
bunx convex dev
```

### "Playwright browsers not installed"
**Solution**: Install browsers
```bash
bunx playwright install
```

### "Port 3000 already in use"
**Solution**: Kill existing process
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Understanding Test Files

```
ltcg-monorepo/
├── apps/web/src/
│   └── **/__tests__/           ← Unit tests (45 tests)
├── convex/
│   └── **/*.test.ts            ← Convex tests (~30 tests)
├── tests/integration/          ← Integration tests (62 tests) ⚠️
│   ├── auth-matrix.test.ts     ← Security: Auth checks
│   ├── invariants.test.ts      ← Integrity: Never-violate rules
│   ├── concurrency.test.ts     ← Races: Double-spend prevention
│   ├── indexes.test.ts         ← Performance: Missing index detection
│   └── actions.test.ts         ← Resilience: External API failures
├── e2e/                        ← E2E tests (19+ tests)
│   ├── smoke.spec.ts           ← Fast CI test (<1min)
│   └── realtime.spec.ts        ← Real-time updates
└── tests/fixtures/             ← Test data factories
```

---

## Writing Your First Test

### Unit Test (Frontend)
```typescript
// apps/web/src/hooks/__tests__/useMyHook.test.ts
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

it('should return correct value', () => {
  const { result } = renderHook(() => useMyHook());
  expect(result.current.value).toBe(42);
});
```

### Integration Test (Backend)
```typescript
// tests/integration/my-feature.test.ts
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

it('should enforce authorization', async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    // Test that unauthenticated call fails
    await expect(
      ctx.mutation(api.myFeature.doSomething, {})
    ).rejects.toThrow(/not authenticated/i);
  });
});
```

### E2E Test (Full Journey)
```typescript
// e2e/my-journey.spec.ts
import { test, expect } from './setup/fixtures';

test('user can complete journey', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Critical Tests You Should Know

### 1. Authorization Matrix (`auth-matrix.test.ts`)
**Prevents**: Unauthorized data access (critical security bug)
**Example**: User A cannot view User B's decks

### 2. Currency Invariants (`invariants.test.ts`)
**Prevents**: Negative currency exploits
**Example**: Purchasing with insufficient funds fails

### 3. Double Purchase (`concurrency.test.ts`)
**Prevents**: Race condition allowing overspend
**Example**: Two simultaneous purchases can't exceed balance

### 4. Missing Index (`indexes.test.ts`)
**Prevents**: Production timeout from table scans
**Example**: Leaderboard query completes in <500ms

### 5. Real-time Updates (`realtime.spec.ts`)
**Prevents**: Stale UI data after backend changes
**Example**: Opponent's move appears within 2 seconds

---

## Need Help?

- **Full docs**: [docs/testing.md](docs/testing.md)
- **Implementation summary**: [TESTING_IMPLEMENTATION_SUMMARY.md](TESTING_IMPLEMENTATION_SUMMARY.md)
- **Specific guides**: Check `tests/integration/*.md` files

---

**Last Updated**: 2026-01-28
