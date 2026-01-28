# Index Performance Tests

## Overview

The index tests in `indexes.test.ts` verify that database queries use intended indexes and don't cause table scans. These tests are critical for catching missing indexes that cause production timeouts under load.

## Test Strategy

Each test follows this pattern:

1. **Seed large dataset** (1,000-10,000 records) to simulate production load
2. **Perform indexed query** using the appropriate index
3. **Measure execution time** with Date.now() before/after
4. **Assert time < threshold** to prove index usage:
   - **Index scan**: <500ms (acceptable)
   - **Table scan**: >3000ms (unacceptable, indicates missing index)

Without proper indexes, queries scan entire tables, causing severe performance degradation at scale.

## Test Coverage

### 1. Leaderboard Query Performance

**Purpose**: Verify leaderboard queries use rating indexes efficiently

**Tests**:
- `should query 10k users by rankedElo in <500ms`
  - Seeds 10,000 users with random ELO ratings (800-2200)
  - Queries top 100 ranked players using `rankedElo` index
  - **Index used**: `users.rankedElo`
  - **Expected**: <500ms

- `should query segmented leaderboard (humans only) in <500ms`
  - Seeds 5,000 users (mix of humans and AI agents)
  - Queries humans-only leaderboard using composite index
  - **Index used**: `users.rankedElo_byType` (isAiAgent + rankedElo)
  - **Expected**: <500ms

- `should query XP leaderboard in <500ms`
  - Seeds 8,000 users with XP data
  - Queries top XP earners
  - **Index used**: `users.xp`
  - **Expected**: <500ms

### 2. User Lookup by Email/Username

**Purpose**: Ensure user authentication lookups are instant

**Tests**:
- `should use email index, not table scan`
  - Seeds 5,000 users
  - Looks up single user by email
  - **Index used**: `users.email`
  - **Expected**: <100ms (extremely fast)

- `should lookup by username efficiently`
  - Seeds 3,000 users
  - Looks up by username
  - **Index used**: `users.username`
  - **Expected**: <100ms

**Why this matters**: Without email/username indexes, every login would scan the entire users table.

### 3. Pack History Pagination

**Purpose**: Verify pack opening history queries use time-based indexes

**Tests**:
- `should use by_user_time index efficiently`
  - Seeds 1,000 pack openings for one user
  - Paginates recent pack history
  - **Index used**: `packOpeningHistory.by_user_time` (userId + openedAt)
  - **Expected**: <200ms

- `should query global pack history by time`
  - Seeds 2,000 pack openings across multiple users
  - Queries recent global activity
  - **Index used**: `packOpeningHistory.by_time` (openedAt)
  - **Expected**: <300ms

### 4. Matchmaking Queue Performance

**Purpose**: Ensure matchmaking finds opponents quickly

**Tests**:
- `should use by_mode_rating composite index`
  - Seeds 1,000 matchmaking queue entries
  - Finds ranked matches in rating window (±200 ELO)
  - **Index used**: `matchmakingQueue.by_mode_rating` (mode + rating)
  - **Expected**: <200ms

- `should handle queue by user lookup`
  - Seeds 500 queue entries
  - Checks if specific user is in queue
  - **Index used**: `matchmakingQueue.by_user` (userId)
  - **Expected**: <100ms

**Why this matters**: Without composite index on (mode + rating), matchmaking would scan entire queue.

### 5. Game Events Query Performance

**Purpose**: Verify spectator/replay systems can load game events efficiently

**Tests**:
- `should use by_lobby index for event log`
  - Seeds 5,000 game events for one lobby
  - Queries events for spectators
  - **Index used**: `gameEvents.by_lobby` (lobbyId + timestamp)
  - **Expected**: <300ms

- `should query events by timestamp range`
  - Seeds 3,000 events
  - Queries recent events (last 5 minutes)
  - **Index used**: `gameEvents.by_timestamp`
  - **Expected**: <300ms

### 6. Currency Transaction Queries

**Purpose**: Ensure transaction history loads quickly

**Tests**:
- `should paginate user transactions efficiently`
  - Seeds 2,000 transactions for one user
  - Paginates recent transaction history
  - **Index used**: `currencyTransactions.by_user_time` (userId + createdAt)
  - **Expected**: <200ms

### 7. Match History Queries

**Purpose**: Verify match history queries use player and game type indexes

**Tests**:
- `should query user match history efficiently`
  - Seeds 1,000 matches
  - Queries user's wins
  - **Index used**: `matchHistory.by_winner` (winnerId)
  - **Expected**: <200ms

- `should query matches by game type and time`
  - Seeds 1,500 matches
  - Filters by game type (ranked/casual)
  - **Index used**: `matchHistory.by_game_type` (gameType + completedAt)
  - **Expected**: <300ms

### 8. Story Progress Queries

**Purpose**: Ensure story mode progress loads efficiently

**Tests**:
- `should query user progress efficiently`
  - Seeds 500 story progress entries (5 acts × 10 chapters × 3 difficulties)
  - Queries all progress for user
  - **Index used**: `storyProgress.by_user` (userId)
  - **Expected**: <500ms

## Running the Tests

### Known Issues

The tests currently fail due to a `convex-test` library issue with finding the `_generated` directory in the Vitest environment. This is a known limitation with the current project setup and affects all tests using `createTestInstance()`.

### When Fixed, Run With:

```bash
# Run all index tests
bunx vitest run tests/integration/indexes.test.ts

# Run specific test suite
bunx vitest run tests/integration/indexes.test.ts -t "Leaderboard"

# Run with verbose output
bunx vitest run tests/integration/indexes.test.ts --reporter=verbose
```

## How to Fix Failing Tests

If a test fails with timeout (>500ms), it indicates a missing or unused index:

1. **Check schema.ts** for the expected index
2. **Verify index exists** in Convex dashboard
3. **Check query syntax** - ensure `.withIndex()` is used correctly
4. **Run `npx convex deploy`** to apply schema changes

## Production Impact

Without these indexes, production queries experience:
- **10-100x slower** query times under load
- **Database connection exhaustion** from slow queries
- **User timeout errors** on leaderboards and history pages
- **Failed matchmaking** due to slow queue queries

These tests prevent production outages by catching missing indexes before deployment.

## Index Schema Reference

All indexes are defined in `/convex/schema.ts`:

```typescript
// Users table indexes
.index("email", ["email"])
.index("username", ["username"])
.index("rankedElo", ["rankedElo"])
.index("rankedElo_byType", ["isAiAgent", "rankedElo"])
.index("xp", ["xp"])
.index("xp_byType", ["isAiAgent", "xp"])

// Pack history indexes
.index("by_user_time", ["userId", "openedAt"])
.index("by_time", ["openedAt"])

// Matchmaking indexes
.index("by_mode_rating", ["mode", "rating"])
.index("by_user", ["userId"])

// Game events indexes
.index("by_lobby", ["lobbyId", "timestamp"])
.index("by_timestamp", ["timestamp"])

// Transactions indexes
.index("by_user_time", ["userId", "createdAt"])

// Match history indexes
.index("by_winner", ["winnerId"])
.index("by_game_type", ["gameType", "completedAt"])

// Story progress indexes
.index("by_user", ["userId"])
```

## Adding New Index Tests

When adding a new feature that queries large datasets:

1. **Add index to schema.ts** first
2. **Create test in indexes.test.ts**:
   ```typescript
   it("should query feature efficiently", async () => {
     const t = createTestInstance();

     // Seed large dataset
     await t.run(async (ctx) => {
       for (let i = 0; i < 1000; i++) {
         await ctx.db.insert("tableName", { ... });
       }
     });

     // Time the query
     const start = Date.now();
     const results = await t.run(async (ctx) => {
       return await ctx.db
         .query("tableName")
         .withIndex("index_name", (q) => q.eq("field", value))
         .take(100);
     });
     const duration = Date.now() - start;

     // Assert performance
     expect(duration).toBeLessThan(500);
   });
   ```
3. **Deploy and verify** in production

## Maintenance

Run these tests:
- **Before every deployment** to catch missing indexes
- **After schema changes** to verify new indexes work
- **When adding pagination** to ensure efficient querying
- **During performance investigations** to identify slow queries
