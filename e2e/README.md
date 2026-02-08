# E2E Test Suite

End-to-End tests for LTCG (Lunch Table Card Game) using Playwright.

## Quick Start

```bash
# Run all tests
bun run test:e2e

# Run streaming overlay visual snapshots (explicit opt-in)
bun run test:e2e:overlay-visual

# Update streaming overlay visual baselines
bun run test:e2e:overlay-visual:update

# Run specific suite
bun run test:e2e:auth

# Interactive UI mode
bun run test:e2e:ui

# Debug mode
bun run test:e2e:debug
```

## Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `auth.spec.ts` | 17 | Authentication flow |
| `deck.spec.ts` | 14 | Deck management |
| `lobby.spec.ts` | 16 | Game lobby |
| `gameplay.spec.ts` | 25 | Core gameplay |
| `effects.spec.ts` | 17 | Effect system |
| `economy.spec.ts` | 19 | Shop & economy |
| `story.spec.ts` | 24 | Story mode |
| `social.spec.ts` | 22 | Social features |
| `streaming-overlay.smoke.spec.ts` | 3 | Overlay visual regression (preview states) |
| **`realtime.spec.ts`** | **20+** | **Real-time updates & stale data** ⚡ |

**Total**: 174+ tests

### Critical: Real-time Tests ⚡

The `realtime.spec.ts` file contains critical regression tests for catching:
- WebSocket subscription bugs
- Stale cached data
- Missing optimistic updates
- Cache invalidation failures

**Run these tests when**:
- Changing Convex queries/mutations
- Modifying cache strategies
- Updating WebSocket logic
- Implementing real-time features

```bash
bun run test:e2e:realtime
```

## Setup Files

- `setup/fixtures.ts` - Custom Playwright fixtures
- `setup/helpers.ts` - Test helper classes
- `setup/test-data.ts` - Test data factories

## Writing Tests

```typescript
import { test, expect } from "./setup/fixtures";

test("feature test", async ({ authenticatedPage }) => {
  await authenticatedPage.goto("/feature");
  await authenticatedPage.click('button:has-text("Action")');
  await expect(authenticatedPage.locator('[data-testid="result"]')).toBeVisible();
});
```

## Documentation

See [E2E_TESTING.md](../E2E_TESTING.md) for complete documentation.

## Coverage Goals

- Critical user paths: 100% ✅
- Game mechanics: 80% ✅
- Edge cases: 60% ✅
