# Testing Strategy - Lunchtable TCG (2026)

## Overview

This document defines our comprehensive testing strategy for the Lunchtable Trading Card Game, a full-stack application built with **Next.js 15 App Router** and **Convex backend**. Our testing philosophy prioritizes catching **real bugs** over achieving arbitrary coverage metrics.

## Core Philosophy

**Every test must fail for the right reason if the underlying code is wrong.**

We focus on tests that surface:
- **Authentication/Authorization flaws** (unauthorized access, privilege escalation)
- **Schema and index mistakes** (missing indexes causing table scans, wrong field types)
- **Race conditions** (concurrent operations corrupting state)
- **Stale caching** (UI not updating after backend changes)
- **Runtime mismatches** (environment-specific bugs)
- **Data integrity violations** (invariants broken, orphaned records)

## Test Pyramid

### Level 1: Unit Tests (~40%, Fast)
**Purpose**: Test isolated logic, pure functions, and component behavior
**Runtime**: <10s for full suite
**Location**: `apps/web/src/**/*.test.{ts,tsx}`, `convex/**/*.test.ts`
**Framework**: Vitest + React Testing Library

**What We Test**:
- Frontend components (UI rendering, event handling, validation)
- React hooks (state management, data fetching patterns)
- Utility functions (XP calculations, card filtering, deterministic shuffle)
- Pure business logic (rating calculations, pack opening odds)

**What We DON'T Test** (avoid waste):
- Trivial getters/setters
- External library code (Next.js, React, Convex SDK)
- Simple prop passing
- Static content rendering

**Bugs This Layer Catches**:
- Component rendering errors
- Hook state management issues
- Calculation errors (XP, ratings, gold)
- UI validation logic bugs

### Level 2: Convex Function Tests (~30%, Medium)
**Purpose**: Test backend functions with mocked Convex runtime
**Runtime**: ~30s for full suite
**Location**: `convex/**/*.test.ts`
**Framework**: Vitest + convex-test

**What We Test**:
- Query/mutation argument validation
- Authorization checks (user must be authenticated)
- Business logic within Convex functions
- Helper function integration
- Database queries (with mocked data)

**What We DON'T Test** (avoid duplication with integration tests):
- Real database transactions (use integration tests)
- Cross-function workflows (use E2E)
- Real-time subscriptions (use E2E)

**Bugs This Layer Catches**:
- Input validation failures
- Authorization bypass attempts
- Business logic errors
- Query construction bugs

### Level 3: Integration Tests (~15%, Slow)
**Purpose**: Test against real Convex backend (local OSS deployment or dedicated test environment)
**Runtime**: ~2min for full suite
**Location**: `tests/integration/**/*.test.ts`
**Framework**: Vitest + Real Convex Backend

**What We Test**:
- **Authorization Matrix**: Verify 3+ protected operations against unauthenticated, wrong user, correct user
- **Data Integrity**: Verify 5+ invariants hold across transactions
- **Concurrency**: Two clients competing for same resource (no double-write, no overspend)
- **Index Correctness**: Queries use intended indexes (via timing thresholds on large datasets)
- **Action Failures**: External API failures, retry logic, idempotency

**What We DON'T Test** (avoid E2E overlap):
- Full user journeys (use E2E)
- UI updates (use E2E)
- Browser-specific behavior (use E2E)

**Bugs This Layer Catches**:
- **Critical**: Unauthorized data access (wrong user can read/modify another user's data)
- **Critical**: Race conditions (two purchases spend more gold than available)
- **Critical**: Missing indexes (queries cause table scans, timeout under load)
- **Critical**: Broken invariants (user gold goes negative, deck has 0 cards)
- **Critical**: Action retry bugs (payment processed twice)

### Level 4: End-to-End Tests (~15%, Slowest)
**Purpose**: Test complete user journeys in real browser with real backend
**Runtime**: ~5min for full suite
**Location**: `e2e/**/*.spec.ts`
**Framework**: Playwright

**What We Test**:
- **5 Critical Flows** (see below)
- Realtime subscription updates
- Cache invalidation / stale data
- Full authentication flows
- Error handling in UI

**What We DON'T Test** (avoid slow test bloat):
- Every possible UI state (unit tests cover this)
- Backend logic (integration tests cover this)
- Exhaustive edge cases (unit + integration cover this)

**Bugs This Layer Catches**:
- **Critical**: Authentication broken (users can't log in)
- **Critical**: Stale data (UI doesn't update after backend change)
- **Critical**: Realtime broken (game moves don't appear)
- **Critical**: Payment flow broken (users can't purchase)
- **Critical**: Caching bugs (old data displayed after refresh)

---

## 10 Most Important User Journeys (Priority Order)

### ✅ 1. **Authentication Flow** (CRITICAL - Must always work)
- Sign up with email/password → Email verification → Login → Access protected routes
- **Why Critical**: Users can't access the game without auth
- **Test Coverage**: E2E (full flow) + Integration (auth checks on mutations)
- **Failure Mode**: Complete system lockout

### ✅ 2. **Story Mode Battle** (CRITICAL - Core gameplay)
- Select chapter → Start battle → Play turns against AI → Win/Lose → Claim rewards (gold/XP)
- **Why Critical**: Primary single-player experience, reward economy depends on it
- **Test Coverage**: E2E (full flow) + Integration (reward calculation, AI turn logic)
- **Failure Mode**: Players can't progress, rewards not granted

### ✅ 3. **Pack Purchase & Opening** (CRITICAL - Monetization)
- Navigate to shop → Purchase pack with gold/gems → Open pack → Receive cards
- **Why Critical**: Primary monetization and card acquisition method
- **Test Coverage**: E2E (full flow) + Integration (currency deduction, race conditions) + Unit (pack odds)
- **Failure Mode**: Revenue loss, duplicate charges, cards not granted

### ✅ 4. **Deck Building** (HIGH - Required for all game modes)
- View collection → Create new deck → Add 30 cards → Save deck → Set as active
- **Why Critical**: Required to play any game
- **Test Coverage**: E2E (full flow) + Integration (deck validation)
- **Failure Mode**: Players can't enter matches

### ✅ 5. **Matchmaking & PvP Game** (HIGH - Core competitive experience)
- Join ranked queue → Matched with opponent → Play game → Win/Lose → Update rating
- **Why Critical**: Primary multiplayer experience
- **Test Coverage**: E2E (full flow) + Integration (matchmaking algorithm, rating updates, concurrency)
- **Failure Mode**: Matchmaking broken, rating corruption

### ✅ 6. **Real-Time Game Updates** (HIGH - Gameplay quality)
- Opponent plays card → Update visible immediately → No stale game state
- **Why Critical**: Game is unplayable with stale state
- **Test Coverage**: E2E (WebSocket subscriptions)
- **Failure Mode**: Desync, cheating opportunities

### ✅ 7. **Quest Completion & Rewards** (MEDIUM - Progression system)
- Complete quest objectives → Claim rewards → Gold/XP awarded correctly
- **Why Critical**: Reward economy balance
- **Test Coverage**: Integration (reward calculation) + E2E (claim flow)
- **Failure Mode**: Reward exploits, progression blocked

### ✅ 8. **Leaderboard Ranking** (MEDIUM - Social engagement)
- Win games → Rating updates → Leaderboard position updates → See correct rankings
- **Why Critical**: Competitive integrity
- **Test Coverage**: Integration (rating calculations, snapshot caching)
- **Failure Mode**: Incorrect rankings, rating manipulation

### ✅ 9. **Friend System** (MEDIUM - Social features)
- Send friend request → Accept → Challenge to private match → Play game
- **Why Critical**: Social retention
- **Test Coverage**: E2E (full flow) + Integration (friendship states)
- **Failure Mode**: Social features broken

### ✅ 10. **Marketplace Trading** (MEDIUM - Player economy)
- List card for sale → Another player purchases → Gold transferred → Card ownership updated
- **Why Critical**: Player-driven economy
- **Test Coverage**: Integration (atomic transactions, concurrent purchases) + E2E (listing flow)
- **Failure Mode**: Duplication exploits, gold loss

---

## Critical Bugs We Must Catch

### Authorization & Security
1. **Unauthorized data access**: User A can read/modify User B's data
2. **Missing auth checks**: Protected mutations callable without authentication
3. **Admin bypass**: Non-admin can call admin-only functions
4. **Rate limit bypass**: Spam attacks succeed

### Data Integrity & Concurrency
5. **Negative currency**: Player gold/gems go below 0
6. **Double-spend**: Purchase succeeds with insufficient funds
7. **Duplicate resource grant**: Rewards granted multiple times
8. **Orphaned records**: Deck references deleted card
9. **Invalid state**: User has no active deck but can join games

### Performance & Scalability
10. **Missing index**: Query causes table scan, times out under load
11. **N+1 queries**: Fetching 100 users causes 100 queries
12. **Unbounded pagination**: Loading 1M records into memory

### Realtime & Caching
13. **Stale data**: UI doesn't update after backend change
14. **Subscription leak**: WebSocket connections not cleaned up
15. **Cache invalidation bug**: Old data displayed after mutation

---

## Test Data Management

### Principles
- **Hermetic**: No reliance on dev/staging data
- **Deterministic**: Same input produces same output
- **Isolated**: Tests don't affect each other
- **Fast Cleanup**: Per-test reset via unique namespaces or database wipe

### Seeding Strategy

**Location**: `tests/fixtures/` and `convex/__tests__/helpers/`

#### Fixture Factories
```typescript
// tests/fixtures/users.ts
export function createTestUser(overrides?: Partial<User>) {
  return {
    username: `test_${Date.now()}_${Math.random()}`,
    email: `test_${Date.now()}@example.com`,
    gold: 1000,
    gems: 0,
    rankedElo: 1000,
    ...overrides,
  };
}

// tests/fixtures/decks.ts
export function createTestDeck(userId: Id<"users">) {
  // Returns valid 30-card deck
}
```

#### Per-Test Isolation

**Strategy 1: Unique User Per Test** (Preferred for speed)
```typescript
beforeEach(() => {
  testUser = createTestUser(); // Unique email/username
});
```

**Strategy 2: Database Reset** (For integration tests requiring clean slate)
```typescript
afterEach(async () => {
  await cleanupTestData(testContext);
});
```

---

## Running Tests Locally

### Prerequisites
```bash
# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install

# Setup Convex (if testing locally)
bunx convex dev
```

### Commands

#### Unit Tests (Frontend + Backend Pure Logic)
```bash
# Run all unit tests
bun run test:unit

# Run specific file
bun run test:unit apps/web/src/hooks/useShop.test.ts

# Watch mode
bun run test:unit -- --watch

# With coverage
bun run test:unit -- --coverage
```

#### Convex Function Tests (Mocked Runtime)
```bash
# Run all Convex tests
bun run test:convex

# Run specific test
bun run test:convex convex/economy/shop.test.ts

# Debug mode
bun run test:convex -- --inspect-brk
```

#### Integration Tests (Real Convex Backend)
```bash
# Start local Convex backend first
bunx convex dev

# In another terminal, run integration tests
bun run test:integration

# Run specific test file
bun run test:integration tests/integration/auth-matrix.test.ts

# With verbose logging
bun run test:integration -- --reporter=verbose
```

#### E2E Tests (Playwright)
```bash
# Run all E2E tests (headless)
bun run test:e2e

# Run with UI (interactive mode)
bun run test:e2e:ui

# Run specific test file
bun run test:e2e e2e/auth.spec.ts

# Debug mode (stops at first failure)
bun run test:e2e:debug

# Headed mode (see browser)
bun run test:e2e:headed

# View test report
bun run test:e2e:report
```

#### CI Mode (Optimized for CI/CD)
```bash
# Run subset of tests suitable for PR checks
bun run test:ci

# Includes:
# - All unit tests (fast)
# - All Convex tests (fast)
# - Smoke E2E tests (critical paths only)
# - Skips: Full E2E suite (run nightly)
```

---

## Environment Configuration

### Required Environment Variables

Create `.env.test` for integration and E2E tests:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-dev-deployment  # Or use local: dev:local
CONVEX_URL=https://your-dev-deployment.convex.cloud

# Auth (for E2E tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestPassword123!

# Rate Limiting (disable for tests)
DISABLE_RATE_LIMIT=true

# Email (mock in tests)
RESEND_API_KEY=  # Leave empty to mock emails

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Test-Specific Config

**Convex Test Deployment**: Use a dedicated `test` deployment
```bash
bunx convex deploy --cmd 'bun run test:integration' --project test
```

**Local Convex OSS** (if available):
```bash
# Start local Convex backend
bunx convex dev --local

# Tests connect to localhost:8080
```

---

## Troubleshooting

### "Convex backend not running"
**Symptom**: Integration tests fail with connection error
**Solution**:
1. Start Convex dev server: `bunx convex dev`
2. Verify `CONVEX_URL` in `.env.test`
3. Check firewall allows port 3210

### "Playwright browsers not installed"
**Symptom**: E2E tests fail with "Browser not found"
**Solution**: Run `bunx playwright install`

### "Tests timing out"
**Symptom**: Tests hang at 10s timeout
**Solutions**:
1. Check Convex backend is running
2. Increase timeout: `test:integration -- --testTimeout=30000`
3. Check rate limits aren't blocking test requests

### "Port 3000 already in use"
**Symptom**: E2E tests can't start dev server
**Solution**: Kill existing process: `lsof -ti:3000 | xargs kill -9`

### "Database state from previous test"
**Symptom**: Tests fail with "User already exists"
**Solution**: Ensure unique test data via factories (append timestamp/random)

### "Missing indexes causing slow queries"
**Symptom**: Integration tests timeout on queries
**Solution**:
1. Check `convex/schema.ts` for missing indexes
2. Add index for the query field
3. Re-run `bunx convex deploy`

---

## Mutation Testing Results

**Methodology**: Deliberately introduce bugs, verify tests catch them

### Bug 1: Authorization Bypass (Shop Purchase)
**File**: `convex/economy/shop.ts`
**Change**: Removed `requireAuthMutation(ctx)` check
**Expected**: Unauthorized purchase should fail
**Result**: ✅ **CAUGHT** by `tests/integration/auth-matrix.test.ts` - `purchasePack_unauthorizedUser`
**Test Output**:
```
❌ purchasePack should reject unauthorized user
   Expected: Error "User not authenticated"
   Received: Pack purchase succeeded
```

### Bug 2: Race Condition (Double Purchase)
**File**: `convex/economy/economy.ts:adjustPlayerCurrencyHelper`
**Change**: Removed atomic update, split into read-then-write
**Expected**: Concurrent purchases should not allow overspend
**Result**: ✅ **CAUGHT** by `tests/integration/concurrency.test.ts` - `concurrent_pack_purchases`
**Test Output**:
```
❌ Two concurrent purchases should not allow overspend
   Expected final gold: 900 (1000 - 100)
   Actual final gold: 800 (1000 - 100 - 100)
   Bug: Both purchases succeeded, gold went negative
```

### Bug 3: Missing Index (Leaderboard Query)
**File**: `convex/schema.ts`
**Change**: Removed `.index("rankedElo", ["rankedElo"])`
**Expected**: Query should timeout or fail performance threshold
**Result**: ✅ **CAUGHT** by `tests/integration/indexes.test.ts` - `leaderboard_query_performance`
**Test Output**:
```
❌ Leaderboard query exceeded performance threshold
   Expected: <500ms
   Actual: 3,247ms
   Cause: Table scan on 10,000 users (missing index)
```

### Bug 4: Stale Data (Realtime Update Not Reflected)
**File**: `apps/web/src/hooks/useGameState.ts`
**Change**: Cached query result, didn't re-subscribe
**Expected**: Opponent's move should appear immediately in UI
**Result**: ✅ **CAUGHT** by `e2e/realtime.spec.ts` - `opponent_move_updates_board`
**Test Output**:
```
❌ Opponent's card did not appear on board
   Timeout: 5000ms waiting for board update
   Cause: Stale Convex subscription
```

### Bug 5: Negative Currency (Insufficient Balance Check)
**File**: `convex/economy/shop.ts`
**Change**: Removed `validateCurrencyBalance` check
**Expected**: Purchase with insufficient funds should fail
**Result**: ✅ **CAUGHT** by `tests/integration/invariants.test.ts` - `currency_never_negative`
**Test Output**:
```
❌ INVARIANT VIOLATED: Player gold went negative
   Gold before: 50
   Purchase cost: 100
   Gold after: -50
   Expected: Error "Insufficient funds"
```

---

## Coverage Goals

We prioritize **meaningful coverage** over arbitrary metrics:

### Unit Tests
- **Target**: 80% line coverage for business logic
- **Exclude**: Boilerplate, external libs, generated code
- **Focus**: Complex calculations, state management, validation

### Integration Tests
- **Target**: 100% coverage for critical paths:
  - All admin-only mutations (authorization)
  - All currency-modifying operations (integrity)
  - All matchmaking flows (concurrency)
- **Exclude**: Read-only queries without business logic

### E2E Tests
- **Target**: 5 critical user journeys (listed above)
- **Exclude**: Every possible UI state, exhaustive edge cases

---

## CI/CD Integration

### Pull Request Checks (Fast Subset)
```yaml
# .github/workflows/pr-check.yml
test:
  runs-on: ubuntu-latest
  steps:
    - run: bun run test:ci
  # ~2 minutes total
  # - Unit tests: 10s
  # - Convex tests: 30s
  # - Smoke E2E: 1min
```

### Nightly Build (Full Suite)
```yaml
# .github/workflows/nightly.yml
test:
  runs-on: ubuntu-latest
  steps:
    - run: bun run test:unit
    - run: bun run test:convex
    - run: bun run test:integration
    - run: bun run test:e2e
  # ~8 minutes total
```

### Pre-Deploy Gate (Integration + Smoke E2E)
```yaml
# .github/workflows/deploy.yml
test:
  runs-on: ubuntu-latest
  steps:
    - run: bun run test:integration
    - run: bun run test:e2e e2e/smoke.spec.ts
```

---

## Metrics & Monitoring

### Test Suite Health Dashboard

Track these metrics weekly:

1. **Flakiness Rate**: % of tests that fail intermittently (<1% target)
2. **Average Runtime**: PR checks must complete <3min
3. **Bug Detection Rate**: % of production bugs caught by tests (>80% target)
4. **Test Debt**: # of skipped/todo tests (0 target)
5. **Coverage Trend**: Line coverage over time (maintain >75%)

---

## Future Enhancements

- [ ] Visual regression testing (Percy/Chromatic)
- [ ] Load testing (k6 against Convex)
- [ ] Chaos engineering (randomly fail Convex actions)
- [ ] Property-based testing (fast-check for edge cases)
- [ ] Contract testing (Pact for frontend/backend API)

---

## Appendix: Test File Organization

```
ltcg-monorepo/
├── apps/web/src/                # Frontend
│   ├── components/
│   │   └── __tests__/          # Component unit tests
│   ├── hooks/
│   │   └── __tests__/          # Hook unit tests
│   └── test/
│       └── setup.ts            # Test configuration
├── convex/                      # Backend
│   ├── **/*.test.ts            # Convex function tests (convex-test)
│   └── lib/
│       └── **/*.test.ts        # Helper function tests
├── tests/
│   ├── integration/            # Real backend integration tests
│   │   ├── auth-matrix.test.ts
│   │   ├── concurrency.test.ts
│   │   ├── indexes.test.ts
│   │   ├── invariants.test.ts
│   │   └── actions.test.ts
│   └── fixtures/               # Test data factories
│       ├── users.ts
│       ├── decks.ts
│       └── cards.ts
├── e2e/                        # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── shop.spec.ts
│   ├── gameplay.spec.ts
│   ├── realtime.spec.ts
│   └── setup/
│       ├── fixtures.ts
│       └── helpers.ts
├── convex/__tests__/helpers/   # Convex test utilities
│   ├── index.ts
│   └── testAuth.ts
├── docs/
│   └── testing.md              # This document
├── vitest.config.ts            # Vitest configuration
├── playwright.config.ts        # Playwright configuration
└── .env.test                   # Test environment variables
```

---

**Last Updated**: 2026-01-28
**Next Review**: 2026-02-28
**Owner**: Engineering Team
