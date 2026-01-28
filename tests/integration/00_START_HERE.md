# Action Failure Path Tests - Start Here

## What Was Created

Comprehensive action failure and retry tests have been created at:

```
/tests/integration/
├── actions.test.ts              (795 lines) - The actual test suite
├── ACTION_TESTS_README.md       (227 lines) - Test patterns & maintenance
├── ACTIONS_TEST_SUMMARY.md      (303 lines) - Implementation summary
└── RUN_TESTS.md                 (289 lines) - How to run the tests
```

**Total**: 1,614 lines of tests and documentation

## Quick Summary

### Tests Written: 19 tests across 7 categories

1. **Email Action Failures** (4 tests)
   - API down, rate limiting, invalid input, missing API key

2. **Idempotency** (2 tests)
   - Prevent duplicate charges and transactions

3. **Partial Failure Recovery** (3 tests)
   - Rollback on errors, prevent data corruption

4. **Timeout Handling** (2 tests)
   - Handle slow external APIs gracefully

5. **Retry Logic** (3 tests)
   - Smart retry (transient vs permanent errors)

6. **Concurrent Actions** (2 tests)
   - Race condition prevention

7. **State Consistency** (2 tests)
   - No orphaned data on failures

## How to Run

```bash
# Use vitest (convex-test compatibility)
bunx vitest tests/integration/actions.test.ts

# Watch mode for development
bunx vitest tests/integration/actions.test.ts --watch
```

**Note**: `bun test` doesn't work yet due to import.meta.glob limitation.

## What Problems Do These Tests Prevent?

1. **Duplicate Charges** ❌ → User charged twice for one purchase
2. **Partial Failures** ❌ → User charged but cards not delivered
3. **Data Corruption** ❌ → Orphaned records cluttering database
4. **System Instability** ❌ → Unbounded retry loops crashing backend
5. **Race Conditions** ❌ → Concurrent purchases causing duplicate inventory

## Test Pattern Example

```typescript
// 1. Mock external API failure
const mockFetch = vi.fn().mockRejectedValue(new Error("API down"));
global.fetch = mockFetch as any;

// 2. Execute action
await expect(
  t.action(internal.emailActions.sendWelcomeEmail, {
    email: user.email,
    username: user.username,
  })
).rejects.toThrow(/api down/i);

// 3. Verify system state unchanged (no side effects)
const userAfter = await t.run(ctx => ctx.db.get(userId));
expect(userAfter.gold).toBe(1000); // No charge occurred
```

## Read Next

1. **[RUN_TESTS.md](./RUN_TESTS.md)** - How to run and debug tests
2. **[ACTION_TESTS_README.md](./ACTION_TESTS_README.md)** - Test patterns and maintenance
3. **[ACTIONS_TEST_SUMMARY.md](./ACTIONS_TEST_SUMMARY.md)** - Complete implementation details
4. **[actions.test.ts](./actions.test.ts)** - The actual test code

## Actions Tested

### Email Actions
- `sendWelcomeEmail` - New user onboarding
- `sendSecurityAlert` - Password changes
- `sendCardSoldNotification` - Marketplace notifications

### Economy Actions
- `purchasePack` - Pack purchases with currency deduction

### Deck Actions
- `createDeck` - Deck creation with validation
- `deleteDeck` - Deck deletion with cascade
- `setActiveDeck` - Active deck management

## Key Features

✅ **Mock External APIs** - Tests don't call real Resend API
✅ **Verify State** - Check gold balance, transactions, records
✅ **Test Concurrency** - Parallel operations handled correctly
✅ **Rollback Testing** - Failures leave no inconsistent state
✅ **Idempotency** - Operations can be safely retried
✅ **Clean Mocks** - afterEach restores original fetch

## Current Status

- ✅ All tests written (19 tests)
- ✅ All documentation complete
- ✅ Helper functions implemented
- ✅ Test patterns established
- ⏳ Waiting for Bun import.meta.glob support
- ✅ Can run with vitest workaround

## Next Steps

1. Run tests with vitest: `bunx vitest tests/integration/actions.test.ts`
2. Verify all tests pass
3. Integrate into CI/CD pipeline
4. Expand to cover more failure scenarios

## Quick Stats

- **Test File Size**: 795 lines
- **Test Count**: 19 tests
- **Suite Count**: 7 suites
- **Estimated Runtime**: 1-2 seconds
- **Coverage**: Email, Shop, Deck actions

## Support

Having issues? Check these in order:

1. [RUN_TESTS.md](./RUN_TESTS.md) - Running and debugging guide
2. [ACTION_TESTS_README.md](./ACTION_TESTS_README.md) - Test patterns
3. Test output - Read error messages carefully
4. Convex logs - Check backend for errors

---

**Created**: 2026-01-28
**Status**: Ready to run (use vitest)
**Maintainer**: See test files for inline documentation
