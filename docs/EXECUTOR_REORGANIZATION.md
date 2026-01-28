# Effect Executor Reorganization

## Summary

Reorganized effect executors from a flat structure into logical subdirectories by category to improve maintainability and code organization.

## Changes

### Directory Structure

**Before:**
```
convex/gameplay/effectSystem/executors/
├── damage.ts
├── gainLP.ts
├── modifyATK.ts
├── modifyDEF.ts
├── draw.ts
├── search.ts
├── toHand.ts
├── toGraveyard.ts
├── banish.ts
├── returnToDeck.ts
├── summon.ts
├── destroy.ts
├── negate.ts
├── mill.ts
├── discard.ts
└── index.ts
```

**After:**
```
convex/gameplay/effectSystem/executors/
├── combat/
│   ├── damage.ts
│   ├── gainLP.ts
│   ├── modifyATK.ts
│   └── modifyDEF.ts
├── cardMovement/
│   ├── draw.ts
│   ├── search.ts
│   ├── toHand.ts
│   ├── toGraveyard.ts
│   ├── banish.ts
│   ├── returnToDeck.ts
│   ├── mill.ts
│   └── discard.ts
├── summon/
│   ├── summon.ts
│   └── destroy.ts
├── utility/
│   └── negate.ts
└── index.ts
```

### Categories

1. **combat/** - Effects that modify life points and stats
   - damage.ts - Deal damage to players
   - gainLP.ts - Heal life points
   - modifyATK.ts - Modify attack values
   - modifyDEF.ts - Modify defense values

2. **cardMovement/** - Effects that move cards between zones
   - draw.ts - Draw cards from deck
   - search.ts - Search deck for specific cards
   - toHand.ts - Return cards to hand
   - toGraveyard.ts - Send cards to graveyard
   - banish.ts - Banish cards from play
   - returnToDeck.ts - Return cards to deck
   - mill.ts - Send cards from top of deck to graveyard
   - discard.ts - Discard cards from hand

3. **summon/** - Effects related to summoning and removal
   - summon.ts - Special summon monsters
   - destroy.ts - Destroy cards on field

4. **utility/** - Miscellaneous effect types
   - negate.ts - Negate card effects

### Files Modified

1. **convex/gameplay/effectSystem/executors/index.ts**
   - Updated all exports to reflect new subdirectory structure
   - Added category comments for better organization

2. **convex/gameplay/effectSystem/executor.ts**
   - Updated all imports to use new subdirectory paths
   - Organized imports by category

3. **convex/gameplay/gameEngine/selectionEffects.ts**
   - Updated import: `executors/summon` → `executors/summon/summon`

4. **convex/gameplay/gameEngine/spellsTraps.ts**
   - Updated import: `executors/search` → `executors/cardMovement/search`

5. **All executor files**
   - Updated relative import paths to account for one additional directory level:
     - `../../../_generated/` → `../../../../_generated/`
     - `../../gameEvents` → `../../../gameEvents`
     - `../parser` → `../../parser`
     - `../types` → `../../types`

## Benefits

1. **Improved Organization**: Related executors are now grouped together
2. **Better Maintainability**: Easier to find and modify specific effect types
3. **Scalability**: Clear pattern for adding new effect executors
4. **Code Navigation**: Clearer categorization helps developers locate code faster

## Testing

- ✅ TypeScript compilation successful
- ✅ All imports resolved correctly
- ✅ No broken references
- ✅ Convex dev build passes (excluding unrelated dependency issues)

## Migration Notes

All imports are handled through the index.ts barrel export, so external code importing from `executors/index` remains unchanged. Only direct imports from individual executor files needed updates (limited to executor.ts and gameEngine files).
