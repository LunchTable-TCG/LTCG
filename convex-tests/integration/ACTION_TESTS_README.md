# Action Failure Path and Retry Tests

## Overview

The action failure tests (`actions.test.ts`) are comprehensive integration tests that verify the system's resilience to external API failures and ensure data consistency during error conditions.

## Why These Tests Matter

These tests prevent critical production issues:

1. **Financial Loss**: Duplicate charges from failed retries
2. **Data Corruption**: Inconsistent state from partial failures
3. **System Instability**: Unbounded retry loops crashing the system
4. **Poor UX**: Users stuck in broken states

## Test Categories

### 1. Email Action Failures (Graceful Degradation)

Tests that email failures don't break core functionality.

```typescript
// Simulates Resend API being down
✓ should gracefully degrade when Resend API is down
✓ should handle Resend API rate limiting (429)
✓ should handle malformed email addresses (400)
✓ should log email in development mode when API key missing
```

**Key Insight**: Email is nice-to-have, not critical path. System continues working even if emails fail.

### 2. Idempotency (Prevent Duplicate Charges)

Tests that operations can be safely retried without duplicate effects.

```typescript
✓ should NOT charge user twice if pack purchase called twice
✓ should NOT create duplicate transactions for same operation
```

**Key Insight**: Each purchase creates exactly ONE transaction and ONE charge, even if called multiple times.

### 3. Partial Failure Recovery (Rollback)

Tests that failures mid-operation leave no inconsistent state.

```typescript
✓ should rollback if pack purchase fails due to insufficient funds
✓ should maintain data consistency when deck creation fails mid-operation
✓ should prevent inventory corruption on failed card addition
```

**Key Insight**: Either the entire operation succeeds, or it's completely rolled back. No half-finished states.

### 4. Timeout Handling (Long-Running Actions)

Tests that slow external APIs don't hang the system.

```typescript
✓ should handle slow email API responses
✓ should handle action scheduling timeouts
```

**Key Insight**: System handles timeouts gracefully without data corruption.

### 5. Retry Logic (Error Classification)

Tests that transient errors are retried but permanent errors are not.

```typescript
✓ should NOT retry on permanent errors (400 Bad Request)
✓ should distinguish transient errors (503 Service Unavailable)
✓ should handle network errors gracefully
```

**Key Insight**: Don't waste resources retrying errors that will never succeed.

### 6. Concurrent Actions (Race Conditions)

Tests that parallel operations don't corrupt shared state.

```typescript
✓ should handle concurrent pack purchases correctly
✓ should prevent race condition in insufficient funds check
```

**Key Insight**: 10 concurrent purchases = 10 separate charges, not duplicates or lost transactions.

### 7. Action State Consistency (No Orphaned Data)

Tests that failed operations don't leave garbage data.

```typescript
✓ should not leave orphaned records on failed operations
✓ should maintain referential integrity on cascade failures
```

**Key Insight**: Database stays clean even when operations fail.

## Running the Tests

### Current Issue: Bun Compatibility

`convex-test` uses `import.meta.glob` which is not yet supported in Bun's test runner.

**Workaround**: Run tests with vitest instead:

```bash
# Install vitest if not already installed
bun add -d vitest

# Run the action tests
bunx vitest tests/integration/actions.test.ts

# Or run all integration tests
bunx vitest tests/integration/
```

### When Bun Support is Added

Once Bun supports `import.meta.glob`, you can run:

```bash
bun test tests/integration/actions.test.ts
```

## Test Patterns Used

### 1. Mock External APIs

```typescript
const mockFetch = vi.fn().mockRejectedValue(new Error("API down"));
global.fetch = mockFetch as any;

// Execute action that calls fetch
await expect(
  t.action(internal.emailActions.sendWelcomeEmail, { ... })
).rejects.toThrow(/api down/i);
```

### 2. Verify System State Unchanged

```typescript
const goldBefore = await getUserGold(t, userId);

// Attempt failing operation
await expect(operation()).rejects.toThrow();

// Verify no side effects
const goldAfter = await getUserGold(t, userId);
expect(goldAfter).toBe(goldBefore); // No charge occurred
```

### 3. Test Concurrent Operations

```typescript
const purchases = Promise.all([
  t.mutation(api.economy.shop.purchasePack, { ... }),
  t.mutation(api.economy.shop.purchasePack, { ... }),
  t.mutation(api.economy.shop.purchasePack, { ... }),
]);

await expect(purchases).resolves.not.toThrow();

// Verify correct final state (3 charges, not 1 or 6)
```

## Integration with Existing Codebase

### Actions Tested

- `internal.emailActions.sendWelcomeEmail`
- `internal.emailActions.sendSecurityAlert`
- `internal.emailActions.sendCardSoldNotification`
- `api.economy.shop.purchasePack`
- `api.core.decks.createDeck`
- `api.core.decks.deleteDeck`

### Helper Functions

Located in `/tests/integration/actions.test.ts`:

- `createUserWithBalance(t, gold, gems)` - Create test user with currency
- `getUserGold(t, userId)` - Get user's current gold balance
- `getTransactionCount(t, userId)` - Count user's transactions
- `createShopProduct(t, productId, goldPrice)` - Create test shop product

## Maintenance Notes

### Adding New Action Tests

1. Choose appropriate test category (Email, Idempotency, Rollback, etc.)
2. Mock external dependencies (fetch, APIs, etc.)
3. Execute action with test context `t`
4. Verify system state matches expectations
5. Clean up mocks in `afterEach`

### Common Pitfalls

1. **Not mocking external APIs**: Tests will actually call real APIs
2. **Not verifying state**: Tests pass but data is corrupted
3. **Not testing concurrent execution**: Race conditions go unnoticed
4. **Not cleaning up mocks**: Tests interfere with each other

## Related Documentation

- `/convex/emailActions.ts` - Email action implementations
- `/convex/economy/shop.ts` - Shop action implementations
- `/convex/__tests__/helpers/` - Test utilities
- `/tests/fixtures/users.ts` - User test fixtures

## Future Improvements

1. **Add retry logic tests**: Currently system doesn't implement automatic retries
2. **Add circuit breaker tests**: Prevent cascading failures from external APIs
3. **Add metrics/monitoring tests**: Verify failures are logged correctly
4. **Add compensation tests**: Test compensating transactions for partial failures

## Questions?

If tests fail, ask:

1. Is the action actually broken, or is the test wrong?
2. Is the external API being mocked correctly?
3. Is the system state being verified completely?
4. Are concurrent operations handled atomically?
5. Is cleanup happening in afterEach?
