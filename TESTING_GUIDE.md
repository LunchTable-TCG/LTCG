# Testing Guide

## Current Testing Status

### Infrastructure Status

The test suite uses `convex-test@0.0.41` which requires updating the testing infrastructure. The current test files are written correctly but won't run until the setup is updated.

**Issue**: `convex-test` 0.0.41 no longer exports `ConvexTestingHelper`. It now uses `convexTest()` function.

**Files that need updating**:
- `convex_test_utils/setup.ts` - Update to use `convexTest()` instead of `ConvexTestingHelper`
- `tests/integration/auth-matrix.test.ts` - Already written correctly but can't run yet

### Invariant Tests Structure

The file `tests/integration/invariants.test.ts` contains comprehensive data integrity tests covering 6 critical business invariants.

## Invariants Tested

### 1. Currency Never Negative
**Why it matters**: Prevents economy exploits, duplication glitches, and infinite currency bugs.

Tests:
- ✓ Gold remains >= 0 after valid pack purchase
- ✓ System rejects purchases with insufficient gold (negative test)
- ✓ Gems remain >= 0 when using gem currency

**Business rule**: `playerCurrency.gold >= 0` AND `playerCurrency.gems >= 0`

### 2. Deck Validity (Exactly 30+ Cards)
**Why it matters**: Ensures fair gameplay - players can't enter matches with invalid decks.

Tests:
- ✓ Allows creating deck with exactly 30 cards
- ✓ Rejects deck with fewer than 30 cards (negative test)
- ✓ Allows deck with more than 30 cards (no maximum enforced)

**Business rule**: `deck.cardCount >= 30`

### 3. Active Deck Exists Before Game
**Why it matters**: Prevents players from entering games without a legal deck.

Tests:
- ✓ Allows setting valid 30-card deck as active
- ✓ Rejects setting invalid deck as active (negative test)
- ✓ Auto-sets first valid deck as active

**Business rule**: `user.activeDeckId` must reference a valid deck with >= 30 cards

### 4. No Orphaned Records (Referential Integrity)
**Why it matters**: Prevents data corruption and broken references that crash the game.

Tests:
- ✓ Maintains card definition references in deck cards
- ✓ Rejects adding cards user does not own (negative test)
- ✓ Handles deck deletion without orphaning deck cards (soft delete)

**Business rule**: All `deckCards.cardDefinitionId` must reference existing, active `cardDefinitions`

### 5. Rating Bounds (0-3000 ELO)
**Why it matters**: Keeps leaderboard data valid, prevents integer overflow/underflow.

Tests:
- ✓ Maintains rating bounds after match completion
- ✓ Never allows rating to drop below 0 (boundary test)

**Business rule**: `0 <= user.rankedElo <= 3000` AND `0 <= user.casualRating <= 3000`

### 6. Consistent Totals (Wins + Losses = Match History)
**Why it matters**: Ensures match statistics are accurate and auditable.

Tests:
- ✓ Maintains win/loss count consistency with match history
- ✓ Detects inconsistency if stats and history mismatch (negative test)
- ✓ Maintains separate game mode win counts

**Business rule**:
```
user.totalWins = COUNT(matchHistory WHERE winnerId = user._id)
user.totalLosses = COUNT(matchHistory WHERE loserId = user._id)
user.totalWins = user.rankedWins + user.casualWins + user.storyWins
```

## Test Strategy

Each test follows this pattern:

1. **Setup**: Establish valid initial state
2. **Operation**: Perform action that COULD violate invariant
3. **Assert**: Verify invariant still holds
4. **Negative Tests**: Deliberately try to break the invariant

### Example: How Invariants Prevent Exploits

#### Without Invariant 1 (Currency Never Negative)
```typescript
// BAD: No validation
async function purchasePack(userId, cost) {
  const user = await db.get(userId);
  user.gold -= cost; // Could go negative!
  await db.patch(userId, { gold: user.gold });
}

// Exploit: User with 50 gold buys 100 gold pack
// Result: gold = -50 (or wraps to 4,294,967,246 on 32-bit systems)
```

#### With Invariant 1 (Currency Never Negative)
```typescript
// GOOD: Validates invariant
async function purchasePack(userId, cost) {
  const user = await db.get(userId);

  if (user.gold < cost) {
    throw new Error("Insufficient gold"); // Maintain invariant
  }

  user.gold -= cost; // Always >= 0
  await db.patch(userId, { gold: user.gold });
}
```

## How to Run Tests (Once Infrastructure is Fixed)

```bash
# Run all invariant tests
bun test tests/integration/invariants.test.ts

# Run specific test suite
bun test tests/integration/invariants.test.ts -t "Currency Never Negative"

# Run with watch mode
bun test tests/integration/invariants.test.ts --watch
```

## Why These Tests Matter

### Bug Prevention
- **Currency exploits**: Without invariant tests, players could find ways to get negative currency
- **Invalid deck states**: Players could enter games with 0-card decks, causing crashes
- **Data corruption**: Orphaned records waste database space and cause errors

### Audit Trail
- Rating bounds ensure leaderboard integrity
- Win/loss consistency enables dispute resolution
- Transaction history maintains economy fairness

### Competitive Integrity
- All players must follow the same deck rules
- Rating calculations must be consistent
- No exploits that give unfair advantages
