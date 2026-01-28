# Testing Guide

## Overview

This project uses **Vitest** for testing Convex backend functions. Bun's test runner is not used because Convex component test helpers require `import.meta.glob()`, which is Vite-specific.

## Running Tests

```bash
# Run all tests
bun run test

# Run tests once (no watch mode)
bun run test:once

# Run specific test file
bun run test:once convex/lib/xpHelpers.test.ts

# Run with coverage
bun run test:coverage
```

## Testing Strategy

### 1. Unit Tests (No Convex Dev Required)

Test pure business logic that doesn't depend on Convex components:

```typescript
// convex/lib/xpHelpers.test.ts
import { describe, it, expect } from "vitest";
import { calculateLevel, getXPForNextLevel } from "./xpHelpers";

describe("XP Calculations", () => {
  it("should calculate level from XP", () => {
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
  });
});
```

### 2. Integration Tests (Requires Convex Dev)

Test features that use Convex components (aggregates, sharded counters):

**Setup:**
1. Start Convex dev server in a separate terminal:
   ```bash
   bunx convex dev
   ```
2. Run tests:
   ```bash
   bun run test
   ```

**Example:**
```typescript
// convex/social/leaderboards.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestInstance } from "../test_utils/setup";

describe("Leaderboards (Integration)", () => {
  let t: ReturnType<typeof createTestInstance>;

  beforeEach(() => {
    t = createTestInstance();
  });

  it("should rank players by ELO", async () => {
    // Create test users
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        username: "player1",
        rankedElo: 1500,
        // ...
      });
    });

    // Query leaderboard via aggregate component
    const result = await t.run(async (ctx) => {
      const { rankedLeaderboard } = await import("../infrastructure/aggregates");
      return await rankedLeaderboard.topK(ctx, 10);
    });

    expect(result).toHaveLength(1);
  });
});
```

## Component Registration

Convex components are automatically registered in test setup:

```typescript
// convex/test_utils/setup.ts
import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerShardedCounter } from "@convex-dev/sharded-counter/test";

export function createTestInstance() {
  const t = convexTest(schema, modules);

  try {
    registerAggregate(t);
    registerShardedCounter(t);
  } catch (error) {
    // Expected without convex dev running
  }

  return t;
}
```

## Available Components

- **@convex-dev/aggregate** - For leaderboard queries
- **@convex-dev/sharded-counter** - For spectator counters
- **@convex-dev/ratelimiter** - No test helper (integration tests only)

## Test File Structure

```
convex/
├── lib/
│   ├── xpHelpers.ts
│   └── xpHelpers.test.ts          # Unit tests
├── social/
│   ├── leaderboards.ts
│   └── leaderboards.test.ts       # Integration tests (requires convex dev)
└── test_utils/
    ├── setup.ts                   # Test configuration
    └── utils.ts                   # Test helpers
```

## Best Practices

1. **Use `createTestInstance()` in `beforeEach()`** - Creates fresh test state
   ```typescript
   let t: ReturnType<typeof createTestInstance>;

   beforeEach(() => {
     t = createTestInstance();
   });
   ```

2. **Import components inside `t.run()`** - Ensures proper context
   ```typescript
   await t.run(async (ctx) => {
     const { rankedLeaderboard } = await import("../infrastructure/aggregates");
     // Use component here
   });
   ```

3. **Test mutations separately from queries**
   ```typescript
   // Mutation
   await t.run(async (ctx) => {
     await ctx.db.patch(userId, { rankedElo: 1500 });
   });

   // Separate query
   await t.run(async (ctx) => {
     const users = await ctx.db.query("users").collect();
     expect(users).toHaveLength(1);
   });
   ```

4. **Account for eventual consistency** in sharded counters
   ```typescript
   await counter.increment(ctx, key, 1);
   await counter.increment(ctx, key, 1);

   const count = await counter.count(ctx, key);
   expect(count).toBe(2); // Works in single test execution
   ```

## Troubleshooting

### Error: Could not find "_generated" directory

**Solution:** Run `bunx convex codegen` or start `bunx convex dev`

### Component registration fails

**Solution:** This is expected without `convex dev` running. Components are registered in a try-catch block and will work when dev server is running.

### Tests hang or timeout

**Solution:** Make sure `convex dev` is running if your test uses components (aggregates, counters)

## Why Vitest Instead of Bun?

Convex component test helpers use `import.meta.glob()` which is:
- ✅ Supported in Vitest (has Vite integration)
- ❌ Not supported in Bun's test runner

The project is configured to use Vitest via `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
  },
});
```

This provides the Vite environment needed for component registration.
