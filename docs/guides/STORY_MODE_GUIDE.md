# Story Mode Guide

**Comprehensive guide to the single-player story campaign system**

---

## Overview

Story mode is a single-player campaign where players battle AI opponents across 10 chapters, each featuring unique archetypes and increasing difficulty.

### Key Features
- ✅ 10 chapters across 2 acts
- ✅ AI opponents with archetype-specific decks
- ✅ Progression tracking and rewards
- ✅ XP and leveling system
- ✅ Badge achievements
- ⚠️ **Stage system not yet implemented** (see MASTER_TODO.md)

---

## Data Flow

### Chapter Selection → Battle → Completion

```
┌─────────────────────────────────────────┐
│   Story Hub (/play/story)              │
│   - Lists all 10 chapters              │
│   - Shows player progress              │
│   - Chapter 1 unlocked by default      │
└──────────────┬──────────────────────────┘
               │ Click Chapter
               ▼
┌─────────────────────────────────────────┐
│   Chapter Detail Page                   │
│   - ⚠️ Should show 10 stages           │
│   - Stage 1 unlocked, rest locked      │
│   - ⚠️ Stages NOT implemented yet      │
└──────────────┬──────────────────────────┘
               │ Start Battle
               ▼
┌─────────────────────────────────────────┐
│   initializeStoryBattle                 │
│   - Creates AI opponent                 │
│   - Builds AI deck from archetype       │
│   - Initializes game state              │
│   - Returns lobbyId and gameId          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   Battle Page                           │
│   - Renders GameBoard component         │
│   - Player takes turn                   │
│   - AI auto-executes turn after player  │
│   - Loops until winner determined       │
└──────────────┬──────────────────────────┘
               │ Battle Ends
               ▼
┌─────────────────────────────────────────┐
│   completeStage (if implemented)        │
│   OR completeChapter                    │
│   - Calculate star rating (LP-based)    │
│   - Award gold (base + bonus)           │
│   - Award XP (with level tracking)      │
│   - Award card rewards                  │
│   - Unlock next stage/chapter           │
└─────────────────────────────────────────┘
```

---

## Backend API

### Queries

```typescript
// Get all player progress
api.progression.story.getPlayerProgress()
// Returns: { totalStarsEarned, chaptersCompleted, lastPlayedAt }

// Get specific chapter details
api.progression.story.getChapterDetails({
  actNumber: 1,
  chapterNumber: 1
})
// Returns: Chapter data + stages (if implemented) + progress

// Get available chapters
api.progression.story.getAvailableChapters({
  difficulty: "normal" // or "hard" | "legendary"
})
// Returns: Array of chapters with unlock status

// Get player XP and level
api.progression.story.getPlayerXPInfo()
// Returns: { level, currentXP, xpToNextLevel }
```

### Mutations

```typescript
// Initialize story battle
api.progression.storyBattle.initializeStoryBattle({
  chapterId: "1-1" // Format: "actNumber-chapterNumber"
})
// Returns: { success, lobbyId, gameId }

// Complete battle (currently completeChapter, should be completeStage)
api.progression.story.completeChapter({
  attemptId: Id<"storyBattleAttempts">,
  won: true,
  finalLP: 6500
})
// Returns: { rewards, levelUp, newBadges, nextUnlocked }

// Execute AI turn
api.gameplay.ai.aiTurn.executeAITurn({
  gameId: "story_user123_123456789"
})
// Returns: { success, actionsPerformed }
```

---

## Frontend Integration

### Story Hub Page
**File:** `apps/web/app/(app)/play/story/page.tsx`

```typescript
const availableChapters = useQuery(api.progression.story.getAvailableChapters);
const playerProgress = useQuery(api.progression.story.getPlayerProgress);
const initProgress = useMutation(api.progression.story.initializeStoryProgress);

useEffect(() => {
  // Auto-initialize progress on first visit
  if (!playerProgress && !isLoading) {
    initProgress().catch(console.error);
  }
}, [playerProgress, isLoading]);
```

### Chapter Detail Page
**File:** `apps/web/app/(app)/play/story/[chapterId]/page.tsx`

⚠️ **Currently shows empty stages array - needs implementation**

```typescript
const chapterDetails = useQuery(api.progression.story.getChapterDetails, {
  actNumber: parseInt(actNumber),
  chapterNumber: parseInt(chapterNumber)
});

// Should show 10 stages with status:
// - Stage 1: "available"
// - Stages 2-10: "locked"
```

### Battle Page
**File:** `apps/web/app/(app)/play/story/[chapterId]/battle/[stageNumber]/page.tsx`

```typescript
const initBattle = useMutation(api.progression.storyBattle.initializeStoryBattle);
const { completeBattle } = useStoryBattle({
  lobbyId,
  gameId,
  onBattleComplete: (result) => {
    // Show completion dialog
    // Navigate back to chapter
  }
});

// Initialize battle on mount
useEffect(() => {
  initBattle({ chapterId }).then(result => {
    setLobbyId(result.lobbyId);
    setGameId(result.gameId);
  });
}, []);
```

---

## AI System

### Normal Difficulty (Current)
**File:** `convex/gameplay/ai/aiEngine.ts`

**Strategy:**
- Summons strongest monster without tributes
- Attacks when attacker ATK > defender ATK
- Sets monsters defensively when hand is full
- Activates spells randomly (50% chance)

**Example Decision Tree:**
```typescript
// Main Phase
if (canNormalSummon && hand.length > 0) {
  const strongestMonster = findStrongestMonster(hand);
  if (strongestMonster.cost <= 4) {
    summon(strongestMonster, "attack");
  }
}

// Battle Phase
if (myBoard.length > 0 && opponentBoard.length === 0) {
  // Direct attack
  attack(myBoard[0], null);
} else if (canWinBattle(myMonster, theirMonster)) {
  attack(myMonster, theirMonster);
}
```

### Hard Difficulty (NOT Implemented)
⚠️ **See MASTER_TODO.md**

**Should include:**
- Tribute summons for high-cost monsters
- Better targeting (attack weakest defender)
- Defensive positioning when losing
- Spell/trap activation at optimal timing

### Legendary Difficulty (NOT Implemented)
⚠️ **See MASTER_TODO.md**

**Should include:**
- Combo execution
- Trap usage for negation
- Card advantage calculations
- Optimal resource management

### Boss Difficulty (NOT Implemented)
⚠️ **See MASTER_TODO.md**

**Should include:**
- Archetype-specific strategies
- Unique abilities per chapter boss
- Advanced combo chains

---

## Rewards System

### Star Rating
Based on remaining LP:
```typescript
const calculateStars = (finalLP: number, maxLP: number = 8000) => {
  if (finalLP >= maxLP * 0.75) return 3; // 75%+ LP = 3 stars
  if (finalLP >= maxLP * 0.5) return 2;  // 50%+ LP = 2 stars
  return 1;                               // Victory = 1 star
};
```

### Gold Rewards
```typescript
baseGold = chapter.rewardGold; // e.g., 100
firstClearBonus = chapter.rewardGold * 2; // e.g., 200

// Star multipliers
const starMultipliers = {
  1: 1.0,  // No bonus
  2: 1.2,  // +20%
  3: 1.4   // +40%
};

totalGold = (baseGold + firstClearBonus) * starMultipliers[stars];

// Example: 3-star first clear
// (100 + 200) * 1.4 = 420 gold
```

### XP Rewards
```typescript
baseXP = chapter.rewardXP; // e.g., 50
totalXP = baseXP * starMultipliers[stars];

// Example: 3-star clear
// 50 * 1.4 = 70 XP
```

### Card Rewards
```typescript
const cardRewardCount = stars; // 1-3 cards based on stars
// Cards are from the chapter's archetype
```

### Level Progression
```typescript
xpToNextLevel = currentLevel * 100;

// Example:
// Level 1 → 2: 100 XP
// Level 2 → 3: 200 XP
// Level 3 → 4: 300 XP
```

---

## Testing Guide

### Test Story Hub
1. Navigate to `/play/story`
2. ✅ Should see all 10 chapters
3. ✅ Chapter 1 should be "available"
4. ✅ Chapters 2-10 should be "locked"
5. ✅ Progress stats should show

### Test Chapter Selection
1. Click Chapter 1
2. ⚠️ Should see 10 stages (NOT IMPLEMENTED)
3. ⚠️ Stage 1 should be "available"
4. ⚠️ Stages 2-10 should be "locked"

### Test Battle Flow
1. Click Stage 1 → Start Battle
2. ✅ Battle should initialize with AI opponent
3. ✅ GameBoard should load
4. ✅ Player takes turn
5. ✅ AI automatically takes turn after player ends
6. ✅ Battle continues until winner
7. ⚠️ Completion dialog should show (needs stage completion)

### Test Rewards
1. Win battle with high LP (3 stars)
2. ✅ Should receive gold (base + first clear + star bonus)
3. ✅ Should receive XP
4. ✅ Check if level up occurred
5. ⚠️ Stage 2 should unlock (NOT IMPLEMENTED)

### Test Replay
1. Replay Stage 1
2. ✅ Should NOT receive first clear bonus
3. ✅ Should still receive star-based rewards
4. ✅ Can improve star rating

---

## Known Issues & TODOs

### Critical (See MASTER_TODO.md)
- ❌ **Stage system not implemented** - Chapter detail page shows no stages
- ❌ **Chapter unlocking not implemented** - Only Chapter 1 unlocks
- ❌ **AI difficulty scaling not implemented** - Only Normal difficulty works

### Medium
- ⚠️ `stagesCompleted` hardcoded to 0 in `getAvailableChapters`
- ⚠️ Stage-specific rewards not configured
- ⚠️ Badge system exists but not fully integrated

### Low
- Card rewards are generic, should be archetype-specific
- No leaderboards for story mode completions
- No daily/weekly story challenges

---

## Database Schema

### Current Tables
```typescript
storyChapters {
  actNumber: number,
  chapterNumber: number,
  name: string,
  description: string,
  archetype: string,
  rewardGold: number,
  rewardXP: number,
  difficulty: "normal" | "hard" | "legendary"
}

storyProgress {
  userId: Id<"users">,
  actNumber: number,
  chapterNumber: number,
  difficulty: string,
  status: "locked" | "available" | "completed" | "mastered",
  starsEarned: number,
  timesCompleted: number,
  bestScore: number,
  completedAt?: number
}

storyBattleAttempts {
  userId: Id<"users">,
  chapterId: Id<"storyChapters">,
  gameId: string,
  startedAt: number,
  completedAt?: number,
  won?: boolean,
  finalLP?: number,
  starsEarned?: number
}
```

### Missing Tables (See MASTER_TODO.md)
```typescript
// ⚠️ NOT YET IMPLEMENTED
storyStages {
  chapterId: Id<"storyChapters">,
  stageNumber: number, // 1-10
  name: string,
  description: string,
  aiDifficulty: "easy" | "medium" | "hard" | "boss",
  rewardGold: number,
  rewardXp: number
}

storyStageProgress {
  userId: Id<"users">,
  stageId: Id<"storyStages">,
  status: "locked" | "available" | "completed" | "starred",
  bestScore: number,
  timesCompleted: number,
  firstClearClaimed: boolean
}
```

---

## Chapter List

### Act 1: The Awakening
1. **Chapter 1: Fire** - Infernal Dragons
2. **Chapter 2: Water** - Aquatic Legion
3. **Chapter 3: Earth** - Stone Guardians
4. **Chapter 4: Wind** - Storm Riders
5. **Chapter 5: Light** - Celestial Knights

### Act 2: The Trials
6. **Chapter 6: Dark** - Shadow Legion
7. **Chapter 7: Thunder** - Thunder Titans
8. **Chapter 8: Nature** - Forest Sentinels
9. **Chapter 9: Undead** - Necromancers
10. **Chapter 10: Machines** - Cyber Army

---

## Next Steps

1. **Implement stage system** (see MASTER_TODO.md)
2. **Add chapter unlocking logic**
3. **Scale AI difficulty**
4. **Test end-to-end story progression**

---

**See also:**
- [MASTER_TODO.md](../../MASTER_TODO.md) - Current implementation status
- [Story Mode Testing](../testing/STORY_MODE_TESTING.md) - Comprehensive testing checklist
- [Agent Gameplay Guide](./AGENT_GAMEPLAY_GUIDE.md) - AI system details
