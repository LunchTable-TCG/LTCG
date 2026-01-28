# Real-time & Stale Data Regression Tests

## Overview

The `/e2e/realtime.spec.ts` file contains 18 critical E2E tests designed to catch WebSocket subscription bugs, stale cached data, and cache invalidation failures.

**Location**: `/Users/home/Desktop/LTCG/e2e/realtime.spec.ts`

## Why These Tests Matter

These tests catch critical bugs that affect user experience:

1. **WebSocket Subscription Bugs** - Missing subscriptions mean users don't see real-time updates
2. **Stale Cached Data** - Aggressive caching can show outdated information
3. **Race Conditions** - State updates that don't sync properly
4. **Cache Invalidation Failures** - Data persists incorrectly after page refresh
5. **Broken Optimistic Updates** - UI doesn't update immediately or rollback fails

## Test Coverage

### 1. Opponent Move Updates (3 tests)

**Critical Path**: Real-time game synchronization

- **Opponent card appears on board within 2 seconds**
  - Player 1 summons monster
  - Player 2's UI updates in real-time
  - Verifies WebSocket subscription is active

- **Opponent life points decrease in real-time**
  - Player 1 deals damage
  - Player 2 sees LP update within 2 seconds
  - Catches missing game state subscriptions

- **Opponent phase changes in real-time**
  - Player 1 ends turn
  - Player 2 sees turn indicator within 2 seconds
  - Validates phase synchronization

### 2. Currency Update After Purchase (4 tests)

**Critical Path**: Economy data synchronization

- **Gold balance updates without refresh**
  - Purchase pack in shop
  - Gold updates in UI within 2 seconds
  - No stale cached balance

- **Gold balance persists after page refresh**
  - Purchase pack
  - Refresh page
  - Verify cache was invalidated (no stale data)

- **Gold updates across multiple tabs**
  - Open same user in two tabs
  - Purchase in Tab 1
  - Tab 2 sees update via WebSocket within 2 seconds

- **Pack count updates in real-time**
  - Purchase pack
  - Pack count increases immediately
  - Persists after refresh

### 3. Leaderboard Position After Win (3 tests)

**Critical Path**: Progression data synchronization

- **Leaderboard rank updates after winning**
  - Win ranked game
  - Navigate to leaderboard
  - Rank updates without manual refresh

- **Rank persists after page refresh**
  - Check rank
  - Refresh page
  - Verify no stale cached rank

- **Win/loss stats update in real-time**
  - Win game
  - View profile
  - Stats update without refresh

### 4. Chat Message Real-time Delivery (2 tests)

**Critical Path**: Social features synchronization

- **Messages deliver between users within 2 seconds**
  - User 1 sends message
  - User 2 sees it within 2 seconds
  - Validates chat WebSocket

- **Messages sync across multiple tabs**
  - Open chat in two tabs
  - Send message in Tab 1
  - Tab 2 receives via WebSocket

### 5. Collection Updates After Pack Opening (2 tests)

**Critical Path**: Inventory synchronization

- **Cards add to collection in real-time**
  - Open pack
  - Navigate to binder
  - New cards appear immediately

- **Collection persists after refresh**
  - Open pack
  - Refresh page
  - Cards remain (cache invalidated)

### 6. Presence Updates (1 test)

**Critical Path**: User status synchronization

- **Online status shows in real-time**
  - Friend goes online
  - Status updates within 2 seconds
  - Friend goes offline
  - Status updates within 5 seconds

### 7. Optimistic Updates (2 tests)

**Critical Path**: UI responsiveness

- **UI updates optimistically before server confirms**
  - Click purchase button
  - UI updates within 100ms (optimistic)
  - Server confirms
  - UI remains consistent

- **Optimistic update rolls back on error**
  - Attempt invalid purchase
  - UI updates optimistically
  - Server rejects
  - UI rolls back to previous state

### 8. Quest Progress Real-time Updates (1 test)

**Critical Path**: Progression tracking

- **Quest progress updates without refresh**
  - Complete quest action
  - Return to quests page
  - Progress updated automatically

## Running the Tests

### Run all real-time tests
```bash
bun run test:e2e:realtime
```

### Run in headed mode (see browser)
```bash
bun run test:e2e:realtime --headed
```

### Run in debug mode
```bash
bun run test:e2e:realtime --debug
```

### Run in UI mode (interactive)
```bash
bun run test:e2e:ui e2e/realtime.spec.ts
```

### Run specific test
```bash
bun run test:e2e:realtime -g "should update gold balance"
```

## Prerequisites

1. **Start development server**:
   ```bash
   bun run dev
   ```

2. **Start Convex backend**:
   ```bash
   bun run dev:convex
   ```

3. **Ensure environment variables** are configured in `.env.local`

## When to Run These Tests

Run these tests when:

- ✅ Modifying Convex queries or mutations
- ✅ Changing cache strategies or TTLs
- ✅ Updating WebSocket subscription logic
- ✅ Implementing real-time features
- ✅ Modifying optimistic update logic
- ✅ Changing state management patterns
- ✅ Before deploying to production
- ✅ When debugging stale data issues

## Test Timeouts

All real-time assertions use strict timeouts to catch performance regressions:

- **Real-time updates**: 2 seconds (critical UX threshold)
- **Optimistic updates**: 100ms (immediate feedback)
- **Offline detection**: 5 seconds (acceptable delay)

If tests fail due to timeouts, it indicates a real performance issue that needs investigation.

## Common Issues & Debugging

### Tests timeout waiting for updates

**Possible causes**:
- WebSocket connection not established
- Missing Convex subscription
- Network issues
- Backend not running

**Debug steps**:
1. Open browser DevTools (Network tab)
2. Filter by "WS" to see WebSocket connections
3. Check for subscription errors in Console
4. Verify Convex backend is running

### Gold/currency not updating

**Possible causes**:
- Missing subscription to user document
- Stale query cache
- Race condition in mutation

**Debug steps**:
1. Check Convex dashboard for mutation errors
2. Verify `useQuery` has proper dependencies
3. Test with cache disabled

### Opponent moves not syncing

**Possible causes**:
- Missing game state subscription
- WebSocket disconnected
- Player not in same game

**Debug steps**:
1. Verify both players joined same game
2. Check game document subscriptions
3. Test with simpler actions first

### Multi-tab tests failing

**Possible causes**:
- Browser context not shared properly
- Authentication state not synchronized
- WebSocket limit reached

**Debug steps**:
1. Use `context.newPage()` for same auth context
2. Verify cookies are shared
3. Check browser WebSocket limits

## Performance Benchmarks

These tests enforce performance SLAs:

| Metric | Target | Test |
|--------|--------|------|
| Opponent move sync | < 2s | ✅ |
| Currency update | < 2s | ✅ |
| Chat message delivery | < 2s | ✅ |
| Optimistic UI update | < 100ms | ✅ |
| Cache invalidation | Immediate | ✅ |

## Integration with CI/CD

These tests should run:

- ✅ Before merging PRs (blocking)
- ✅ After deployments (smoke test)
- ✅ Nightly (full suite)

**CI command**:
```bash
bun run test:e2e:realtime --reporter=github
```

## Architecture Notes

The tests validate this data flow:

```
User Action → Convex Mutation → Database Update
     ↓              ↓                    ↓
 Optimistic UI  WebSocket Push    Real-time Sync
     ↓              ↓                    ↓
 Rollback?     Subscription        UI Update
```

### Key Patterns Tested

1. **Optimistic Updates**
   ```typescript
   // UI updates immediately
   await buyButton.click();
   await waitForTimeout(100);
   expect(gold).toBeLessThan(goldBefore); // Optimistic

   // Server confirms
   await waitForTimeout(1000);
   expect(gold).toBe(expectedGold); // Confirmed
   ```

2. **WebSocket Subscriptions**
   ```typescript
   // Player 1 action
   await player1.summonMonster();

   // Player 2 sees update
   await player2.waitForSelector('[data-testid="opponent-monster"]', {
     timeout: 2000 // Real-time threshold
   });
   ```

3. **Cache Invalidation**
   ```typescript
   // Make change
   await shopHelper.buyPack();
   const goldAfter = await getGold();

   // Refresh page
   await page.reload();

   // Should match (cache invalidated)
   expect(await getGold()).toBe(goldAfter);
   ```

## Test Data Patterns

- **Unique test users**: Each test creates unique users via `TestUserFactory`
- **Timestamp-based IDs**: Prevents conflicts between parallel test runs
- **Isolated game sessions**: Each test creates fresh game instances
- **Automatic cleanup**: Pages close after tests complete

## Coverage Report

After running tests, view coverage:

```bash
bun run test:e2e:realtime
bun run test:e2e:report
```

This opens an HTML report showing:
- Test execution time
- Pass/fail status
- Screenshots on failure
- Video recordings
- Trace files for debugging

## Contributing

When adding new real-time features, add corresponding tests:

1. Identify the real-time data flow
2. Add test case to appropriate describe block
3. Use strict 2-second timeout for assertions
4. Test with page refresh (cache invalidation)
5. Test across multiple tabs (WebSocket sync)
6. Verify optimistic updates and rollback

## Related Files

- `/e2e/realtime.spec.ts` - Test implementation
- `/e2e/setup/fixtures.ts` - Test fixtures
- `/e2e/setup/helpers.ts` - Helper utilities
- `/playwright.config.ts` - Playwright configuration
- `/convex/` - Backend query/mutation logic

## Documentation

- [E2E Testing Guide](./e2e/README.md)
- [Playwright Docs](https://playwright.dev/)
- [Convex Real-time Docs](https://docs.convex.dev/)

---

**Status**: ✅ 18 tests implemented covering all critical real-time paths

**Last Updated**: 2026-01-28
