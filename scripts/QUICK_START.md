# Type Generation - Quick Start Guide

## TL;DR

Types are auto-generated from Convex validators. You never need to write `Infer<typeof validator>` again.

## Usage

### Automatic (Recommended)
```bash
bun run dev    # Types auto-generate before dev server starts
bun run build  # Types auto-generate before build
```

### Manual
```bash
bun run generate:types
```

## Import Generated Types

### Direct Import
```typescript
import type { Achievement, LeaderboardEntry } from "@/types/generated";
```

### Barrel Export
```typescript
import type { Achievement, LeaderboardEntry } from "@/types";
```

### Domain-Specific
```typescript
import type { Achievement, Quest } from "@/types/progression";
import type { LeaderboardEntry, Friend } from "@/types/social";
import type { StoryChapter } from "@/types/story";
```

## Add New Types

1. Add validator to `convex/lib/returnValidators.ts`:
   ```typescript
   export const myNewFeatureValidator = v.object({
     id: v.string(),
     name: v.string(),
     // ... more fields
   });
   ```

2. Run generator (or let it auto-run):
   ```bash
   bun run generate:types
   ```

3. Import the generated type:
   ```typescript
   import type { MyNewFeature } from "@/types/generated";
   ```

That's it! No manual type definitions needed.

## Naming Convention

Validator names must end with `Validator`:

| Validator | Generated Type |
|-----------|----------------|
| `userProfileValidator` | `UserProfile` |
| `leaderboardEntryValidator` | `LeaderboardEntry` |
| `achievementValidator` | `Achievement` |

## Available Types (47)

### User & Auth
- UserProfile, UserInfo, FullUser

### Economy
- PlayerBalance, CurrencyTransaction, TransactionHistory
- CardResult, PackPurchase, ShopProduct, PackOpeningHistory
- MarketplaceListing, MarketplaceListings, AuctionBid

### Social
- LeaderboardEntry, CachedLeaderboard, UserRank
- FriendInfo, FriendRequest, FriendOperation

### Game
- GameLobby, LobbyForCleanup
- MatchmakingStatus, QueueStats

### Progression
- Achievement, AchievementUnlocked
- UserQuest, QuestReward, QuestClaim
- MatchHistoryEntry, BattleHistoryEntry

### Story Mode
- StoryProgressRecord, PlayerProgress
- ChapterDefinition, AvailableChapter
- PlayerBadge, PlayerBadges
- BattleAttempt, StoryBattleStart, StoryBattleCompletion

### Collection
- CardWithOwnership
- DeckWithCount, DeckCardEntry, DeckWithCards, DeckStats

### Utility
- SuccessResponse, PaginatedResponse, OptionalData

## Troubleshooting

### Types Not Updating?
```bash
bun run generate:types
```

### Import Errors?
Check that the generated file exists:
```bash
ls -la apps/web/src/types/generated.ts
```

If missing, regenerate:
```bash
bun run generate:types
```

### Wrong Type Name?
- Ensure validator ends with `Validator`
- Check export in `convex/lib/returnValidators.ts`
- Verify naming follows camelCase pattern

## File Locations

- **Generator Script:** `/scripts/generate-types.ts`
- **Generated Output:** `/apps/web/src/types/generated.ts` (git-ignored)
- **Validators:** `/convex/lib/returnValidators.ts`
- **Full Docs:** `/scripts/README.md`

## Example: Before vs After

### Before (Manual)
```typescript
import type { Infer } from "convex/values";
import type { achievementValidator } from "../../../../convex/lib/returnValidators";

export type Achievement = Infer<typeof achievementValidator>;
```

### After (Auto-Generated)
```typescript
export type { Achievement } from "./generated";
```

**Benefits:**
- ✅ Zero maintenance
- ✅ Always in sync with validators
- ✅ Single source of truth
- ✅ Automatic updates

## Need Help?

See full documentation: `/scripts/README.md`
