# Real-time Test Checklist

Quick reference for ensuring real-time features work correctly.

## Before Deploying

Run this checklist before deploying changes that affect:
- Convex queries/mutations
- Cache strategies
- WebSocket subscriptions
- State management
- Optimistic updates

### 1. Run Real-time Tests

```bash
bun run test:e2e:realtime
```

Expected result: **All 18 tests pass**

### 2. Check Specific Scenarios

#### Game State Sync
```bash
bun run test:e2e:realtime -g "Opponent Move Updates"
```
- ✅ Opponent cards appear within 2s
- ✅ Life points sync in real-time
- ✅ Phase changes propagate

#### Currency Updates
```bash
bun run test:e2e:realtime -g "Currency Update"
```
- ✅ Gold updates without refresh
- ✅ Persists after page reload
- ✅ Syncs across tabs

#### Leaderboard Updates
```bash
bun run test:e2e:realtime -g "Leaderboard Position"
```
- ✅ Rank updates after win
- ✅ Persists after refresh
- ✅ Stats update in real-time

#### Chat Delivery
```bash
bun run test:e2e:realtime -g "Chat Message"
```
- ✅ Messages deliver within 2s
- ✅ Syncs across tabs

### 3. Manual Verification (Optional)

If tests pass but you want to verify manually:

1. **Open two browser windows side-by-side**
2. **Log in as different users**
3. **Start a game together**
4. **Verify**:
   - Moves appear immediately (< 2s)
   - Life points update in real-time
   - Phase transitions sync

### 4. Performance Check

Tests enforce these SLAs:

| Feature | Max Latency | Status |
|---------|-------------|--------|
| Opponent moves | 2s | 🟢 |
| Currency update | 2s | 🟢 |
| Chat messages | 2s | 🟢 |
| Optimistic UI | 100ms | 🟢 |

If tests fail timing checks, investigate before deploying.

## Debugging Failed Tests

### Test: "opponent card on board in real-time"

**Symptoms**: Timeout waiting for opponent monster

**Check**:
1. WebSocket connection active?
2. Game state subscription working?
3. Both players in same game?

**Fix**:
```typescript
// Ensure subscription exists in useGameState
const game = useQuery(api.games.get, { gameId });
```

### Test: "gold balance updates without refresh"

**Symptoms**: Gold shows stale value

**Check**:
1. User document subscription?
2. Cache invalidation working?
3. Mutation completing successfully?

**Fix**:
```typescript
// Ensure useQuery deps are correct
const user = useQuery(api.users.getCurrent, {});
// NOT: const user = useQuery(api.users.getCurrent); // WRONG
```

### Test: "messages deliver in real-time"

**Symptoms**: Messages don't appear

**Check**:
1. Chat subscription active?
2. WebSocket connected?
3. User in correct channel?

**Fix**:
```typescript
// Ensure chat subscription
const messages = useQuery(api.chat.getMessages, { channelId });
```

## Common Patterns

### Pattern 1: Real-time Query

```typescript
// ✅ GOOD - Real-time updates
const game = useQuery(api.games.get, { gameId });

// ❌ BAD - Stale data
const game = await convex.query(api.games.get, { gameId });
```

### Pattern 2: Optimistic Updates

```typescript
// ✅ GOOD - Optimistic + rollback
const [gold, setGold] = useState(initialGold);

async function buyPack() {
  setGold(gold - PACK_COST); // Optimistic
  
  try {
    await buyPackMutation({ ... });
  } catch (error) {
    setGold(gold); // Rollback
  }
}
```

### Pattern 3: Cache Invalidation

```typescript
// ✅ GOOD - Cache invalidated
const { data } = useQuery(api.users.getCurrent);

// ❌ BAD - Stale cache
const data = localStorage.getItem('user'); // NEVER CACHE USER DATA
```

## Pre-deployment Checklist

- [ ] All real-time tests pass
- [ ] No timeout failures (< 2s updates)
- [ ] Optimistic updates work correctly
- [ ] Cache invalidates on page refresh
- [ ] Multi-tab sync working
- [ ] WebSocket connections stable
- [ ] Error rollbacks function properly

## Quick Test Commands

```bash
# Full suite
bun run test:e2e:realtime

# Headed mode (watch tests)
bun run test:e2e:realtime --headed

# Debug mode (pause on failures)
bun run test:e2e:realtime --debug

# Specific test
bun run test:e2e:realtime -g "gold balance"

# View report
bun run test:e2e:report
```

## Emergency Rollback

If real-time features break in production:

1. **Identify broken subscription**:
   ```bash
   bun run test:e2e:realtime
   # Note which test fails
   ```

2. **Check Convex logs**:
   ```bash
   npx convex logs
   ```

3. **Verify WebSocket**:
   - Open DevTools → Network → WS
   - Check for connection errors

4. **Rollback if needed**:
   ```bash
   git revert HEAD
   git push
   ```

## Success Criteria

✅ **All 18 tests pass**
✅ **No timeouts (< 2s)**
✅ **No flaky tests (run 3x)**
✅ **Manual verification passes**

---

**Questions?** See [REALTIME_TESTS.md](../REALTIME_TESTS.md) for detailed documentation.
