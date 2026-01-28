# Missing Test IDs - Comprehensive Fix List

## Problem Summary
E2E tests are failing because components are missing 63 `data-testid` attributes that tests expect. Components were refactored but test IDs were not maintained.

## Critical Path (Fix First - for smoke test)
These are needed for the smoke test to pass:

### ✅ Shop Page - PARTIALLY FIXED
- [x] `data-testid="shop"` - Main shop container (apps/web/app/(app)/shop/page.tsx:292)
- [x] `data-testid="player-gold"` - Gold balance display (apps/web/app/(app)/shop/page.tsx:313)
- [x] `data-testid="pack-item"` - Shop item card (apps/web/app/(app)/shop/page.tsx:832)
- [ ] **ISSUE**: Tests expect `button:has-text("Buy Pack")` but UI shows prices only
  - Need to either: (1) update test selectors, or (2) add aria-labels to buttons

### Shop/Economy Tests (12 test IDs)
- [ ] `owned-pack` - Owned pack items in inventory
- [ ] `pack-product` - Shop product listings
- [ ] `pack-price` - Price display for packs
- [ ] `pack-card` - Individual card in pack
- [ ] `pack-results` - Pack opening results screen
- [ ] `marketplace-card` - Marketplace card listing
- [ ] `player-badges` - Player badge display
- [ ] `player-stats` - Player statistics panel
- [ ] `player-wins` - Win count display
- [ ] `player-rank` - Rank display
- [ ] `win-count` - Alternative win count selector
- [ ] `retry-count` - Retry attempt counter

### Game/Lobby Tests (15 test IDs)
- [ ] `game-lobby` - Game lobby container
- [ ] `lobby-id` - Lobby ID display
- [ ] `lobby-players` - Players list in lobby
- [ ] `lobby-player` - Individual player in lobby
- [ ] `player-ready` - Ready status indicator
- [ ] `host-indicator` - Host badge/indicator
- [ ] `game-code` - Game/lobby code display
- [ ] `create-game-modal` - Create game modal
- [ ] `game-board` - Main game board container
- [ ] `player-monster` - Player's monster card zone
- [ ] `player-spell-trap` - Player's spell/trap zone
- [ ] `opponent-monster` - Opponent's monster zone
- [ ] `player-lp` - Player life points (likely exists as `opponent-lp`)
- [ ] `opponent-lp` - Opponent life points
- [ ] `opponent-info` - Opponent information panel

### Game State Tests (8 test IDs)
- [ ] `turn-number` - Current turn number
- [ ] `graveyard-count` - Graveyard card count
- [ ] `chain-link` - Chain link indicator
- [ ] `response-prompt` - Response prompt for player actions
- [ ] `battle-rewards` - Battle completion rewards
- [ ] `spectator-view` - Spectator mode view

### Deck Builder Tests (7 test IDs)
- [ ] `deck-editor` - Deck editor container
- [ ] `deck-list` - Deck list view
- [ ] `deck-card` - Individual card in deck
- [ ] `deck-count` - Deck card count
- [ ] `deck-search` - Search input for cards
- [ ] `collection-view` - Card collection view
- [ ] `collection-card` - Card in collection
- [ ] `card-item` - Generic card item

### Social/Chat Tests (6 test IDs)
- [ ] `global-chat` - Global chat container
- [ ] `chat-input` - Chat message input
- [ ] `online-status` - Online status indicator
- [ ] `friend-request` - Friend request item
- [ ] `leaderboard` - Leaderboard container
- [ ] `leaderboard-entry` - Leaderboard row

### Story Mode Tests (8 test IDs)
- [ ] `story-chapter` - Story chapter item
- [ ] `story-stage` - Story stage item
- [ ] `chapter-artwork` - Chapter artwork/thumbnail
- [ ] `chapter-progress` - Chapter completion progress
- [ ] `stage-difficulty` - Stage difficulty indicator
- [ ] `stage-stars` - Stage star rating
- [ ] `story-dialogue` - Story dialogue box
- [ ] `completion-percentage` - Overall completion %

### Quest/Achievement Tests (6 test IDs)
- [ ] `quests-list` - Quests list container
- [ ] `quest-progress` - Quest progress bar
- [ ] `achievement` - Achievement item
- [ ] `achievement-progress` - Achievement progress
- [ ] `achievement-reward` - Achievement reward display

## Implementation Strategy

### Option 1: Fix Components (Recommended for Production)
Add all test IDs systematically to components. This maintains test stability.

**Pros:**
- Tests stay maintainable
- Clear contract between components and tests
- Easy to debug failures

**Cons:**
- 63 test IDs to add across ~15 components
- Time-consuming

### Option 2: Update Test Selectors (Quick Fix)
Rewrite test selectors to match current UI structure using role-based queries.

**Pros:**
- Faster initial fix
- More accessible selectors
- Better practices (using roles instead of test IDs)

**Cons:**
- Tests become more brittle (UI changes break tests)
- Harder to debug which element is which

### Option 3: Hybrid Approach (Balanced)
- Add test IDs to critical/complex selectors (game board, specific stats)
- Use role-based queries for simple elements (buttons, headings)

## Recommended Next Steps

1. **Immediate**: Fix smoke test by updating SHOP_BUY_PACK_BUTTON selector:
   ```diff
   - SHOP_BUY_PACK_BUTTON: 'button:has-text("Buy Pack")',
   + SHOP_BUY_PACK_BUTTON: '[data-testid="pack-item"] button:first-of-type',
   ```

2. **Short-term**: Add critical game/lobby test IDs (15 total) since gameplay is core

3. **Medium-term**: Decide on long-term strategy (Option 1 vs 3)

4. **Alternative**: Generate test IDs automatically with script:
   ```bash
   # Find all components that need test IDs
   # Add them systematically with sed/awk
   ```

## Files Requiring Changes

### Already Fixed:
- [x] apps/web/app/(app)/shop/page.tsx (3 test IDs added)
- [x] apps/web/src/components/auth/AuthForm.tsx (password confirmation validation)

### Need Fixing:
- [ ] apps/web/app/(app)/lunchtable/page.tsx (game lobby)
- [ ] apps/web/src/components/game/GameBoard.tsx (game board, monsters, LP)
- [ ] apps/web/src/components/game/GameLobby.tsx (lobby UI)
- [ ] apps/web/app/(app)/binder/page.tsx (deck editor, collection)
- [ ] apps/web/app/(app)/social/page.tsx (chat, friends, leaderboard)
- [ ] apps/web/app/(app)/play/story/page.tsx (story mode)
- [ ] apps/web/app/(app)/quests/page.tsx (quests, achievements)
- [ ] apps/web/app/(app)/shop/open/page.tsx (pack opening)

## Test Selector Issues

Beyond missing test IDs, some test selectors use outdated button text:
- `button:has-text("Buy Pack")` - buttons show prices, not "Buy Pack"
- `button:has-text("Open Pack")` - need to verify actual button text
- Various game action buttons may have changed

## Estimated Effort
- **Quick fix** (update test selectors only): 2-3 hours
- **Complete fix** (add all 63 test IDs): 6-8 hours
- **Hybrid approach**: 4-5 hours

## Decision Needed
User should decide: Fix tests to match UI (fast), or fix UI to match tests (thorough)?
