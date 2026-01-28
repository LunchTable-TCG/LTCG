# Running Action Failure Tests

## Quick Start

### Using Vitest (Recommended)

```bash
# Run action failure tests
bunx vitest tests/integration/actions.test.ts

# Run in watch mode
bunx vitest tests/integration/actions.test.ts --watch

# Run with coverage
bunx vitest tests/integration/actions.test.ts --coverage
```

### Using Bun Test (Not Working Yet)

```bash
# This will fail with import.meta.glob error
bun test tests/integration/actions.test.ts
```

**Status**: Waiting for Bun to support `import.meta.glob` in test runner.

## Environment Setup

### Required Environment Variables

For email tests to actually send emails (usually not needed):
```bash
RESEND_API_KEY=re_...
AUTH_EMAIL="Your App <noreply@yourdomain.com>"
```

**Note**: Tests work without these. They'll log to console instead of sending real emails.

### Optional Configuration

```bash
# Set custom test timeout
VITE_TEST_TIMEOUT=10000
```

## Test Output Examples

### All Passing ✅

```
 ✓ tests/integration/actions.test.ts (19)
   ✓ Email Action Failures - Graceful Degradation (4)
     ✓ should gracefully degrade when Resend API is down
     ✓ should handle Resend API rate limiting
     ✓ should handle malformed email addresses
     ✓ should log email in development mode when API key missing
   ✓ Idempotency - Prevent Duplicate Effects (2)
     ✓ should NOT charge user twice if pack purchase called twice
     ✓ should NOT create duplicate transactions for same operation
   [... more suites ...]

Test Files  1 passed (1)
     Tests  19 passed (19)
  Start at  12:00:00
  Duration  1.85s
```

### Failure Example ❌

```
 FAIL  tests/integration/actions.test.ts > Idempotency > should NOT charge user twice
AssertionError: expected 200 to be 300
  Expected: 300
  Actual: 200

  at tests/integration/actions.test.ts:275:25

This means: User was charged twice (400 deducted instead of 200)
```

## Debugging Failed Tests

### Check Test Output

```bash
# Run specific test
bunx vitest tests/integration/actions.test.ts -t "should NOT charge user twice"

# Run with verbose output
bunx vitest tests/integration/actions.test.ts --reporter=verbose
```

### Common Failure Patterns

#### 1. Gold Balance Mismatch

```
Expected: 900 (1000 - 100 for one pack)
Actual: 800 (1000 - 200 for two packs)
```

**Cause**: Duplicate charge or idempotency bug
**Fix**: Check mutation implementation for duplicate operations

#### 2. Transaction Count Wrong

```
Expected: 1 transaction
Actual: 2 transactions
```

**Cause**: Transaction recorded twice for same operation
**Fix**: Check recordTransaction call placement

#### 3. State Not Rolled Back

```
Expected: 1000 gold (no charge on failure)
Actual: 900 gold (charge happened despite failure)
```

**Cause**: Rollback not working
**Fix**: Ensure mutation throws error before deducting currency

#### 4. Orphaned Records

```
Expected: 0 deck cards after deletion
Actual: 5 deck cards still exist
```

**Cause**: Cascade deletion not working
**Fix**: Delete related records before parent record

### Check Convex Logs

If tests interact with real backend:
```bash
# Terminal 1: Run Convex dev
bun convex dev

# Terminal 2: Run tests
bunx vitest tests/integration/actions.test.ts

# Watch Convex logs in Terminal 1 for errors
```

## Running Specific Test Suites

```bash
# Only email tests
bunx vitest tests/integration/actions.test.ts -t "Email Action Failures"

# Only idempotency tests
bunx vitest tests/integration/actions.test.ts -t "Idempotency"

# Only rollback tests
bunx vitest tests/integration/actions.test.ts -t "Partial Failure Recovery"

# Only concurrent tests
bunx vitest tests/integration/actions.test.ts -t "Concurrent Actions"
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install Dependencies
        run: bun install

      - name: Run Action Tests
        run: bunx vitest tests/integration/actions.test.ts --run
        env:
          NODE_ENV: test
```

### Local Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Running action failure tests..."
bunx vitest tests/integration/actions.test.ts --run

if [ $? -ne 0 ]; then
  echo "❌ Action tests failed. Commit aborted."
  exit 1
fi

echo "✅ All tests passed!"
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Troubleshooting

### Problem: Tests hang indefinitely

**Cause**: Timeout too short for operation
**Solution**:
```bash
bunx vitest tests/integration/actions.test.ts --testTimeout=30000
```

### Problem: "Cannot read properties of null"

**Cause**: Database record not found
**Solution**: Check test setup creates all required records

### Problem: "Rate limit exceeded"

**Cause**: Too many test runs hitting rate limiter
**Solution**: Wait 60 seconds or increase rate limits in test env

### Problem: "Network error" in non-email tests

**Cause**: Mock not properly restored
**Solution**: Check `afterEach` restores original fetch

### Problem: Tests pass locally but fail in CI

**Cause**: Race condition or timing issue
**Solution**: Add proper async/await, use deterministic test data

## Performance Tips

### Speed Up Tests

1. **Run in parallel** (default):
   ```bash
   bunx vitest tests/integration/ --threads
   ```

2. **Skip slow tests during development**:
   ```typescript
   it.skip("slow test", async () => { ... });
   ```

3. **Use test.only for focused testing**:
   ```typescript
   it.only("focus on this test", async () => { ... });
   ```

### Memory Optimization

If tests run out of memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" bunx vitest
```

## Next Steps

1. ✅ Tests are written and documented
2. ⏳ Waiting for Bun import.meta.glob support OR use vitest
3. 🔄 Once running, integrate into CI/CD
4. 🎯 Expand to cover more action failure scenarios

## Support

- **Test Issues**: Check test output and this guide
- **Convex Issues**: Check `bun convex dev` logs
- **API Issues**: Verify mocks are properly configured
- **CI Issues**: Check GitHub Actions logs

---

**Last Updated**: 2026-01-28
**Test Count**: 19 tests across 7 suites
**Estimated Runtime**: 1-2 seconds
