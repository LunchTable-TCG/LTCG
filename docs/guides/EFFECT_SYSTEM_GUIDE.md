# Effect System Guide

**Comprehensive guide to the card ability and trigger system**

---

## Overview

The effect system parses and executes card abilities, handles triggers, manages chains, and applies continuous effects. It supports all major card game mechanics including destruction, damage, stat modification, searching, and special summons.

### Current Status
- ✅ 16 effect types implemented
- ✅ 11 trigger conditions working
- ✅ Trap activation UI complete
- ✅ Continuous effects for ATK bonuses
- ⚠️ Card selection UI not integrated (see MASTER_TODO.md)
- ⚠️ DEF continuous effects not implemented

---

## Effect Types (16 Total)

### Implemented ✅

| Type | Description | Example |
|------|-------------|---------|
| `draw` | Draw cards | "Draw 2 cards" |
| `destroy` | Destroy cards | "Destroy 1 monster" |
| `damage` | Deal damage to opponent | "Inflict 500 damage" |
| `gainLP` | Heal life points | "Gain 1000 LP" |
| `modifyATK` | Change ATK stat | "Gain 500 ATK" |
| `modifyDEF` | Change DEF stat | "Gain 500 DEF" |
| `summon` | Special summon | "Special summon 1 monster" |
| `toHand` | Add to hand | "Add 1 card to hand" |
| `toGraveyard` | Send to graveyard | "Send 1 card to GY" |
| `banish` | Banish cards | "Banish 1 card" |
| `search` | Search deck | "Search 1 Warrior monster" |
| `negate` | Negate activation | "Negate the activation" |
| `directAttack` | Attack directly | "This card can attack directly" |
| `mill` | Mill cards from deck | "Send top 3 cards to GY" |
| `discard` | Discard from hand | "Discard 1 card" |
| `multipleAttack` | Attack multiple times | "Can attack twice" |

---

## Trigger Conditions (11 Total)

### Trigger Types ✅

| Trigger | When It Fires | Example Card |
|---------|---------------|--------------|
| `manual` | Player activates | Normal Spell |
| `on_summon` | When you summon | "When summoned: Draw 1" |
| `on_opponent_summon` | When opponent summons | "When opponent summons: Destroy 1" |
| `on_destroy` | When destroyed | "When destroyed: Search 1" |
| `on_flip` | When flipped face-up | "FLIP: Destroy 1 monster" |
| `on_battle_damage` | After dealing battle damage | "After damage: Draw 1" |
| `on_battle_destroy` | After destroying in battle | "After destroying: Gain 500 LP" |
| `on_battle_attacked` | When attacked | "When attacked: Negate" |
| `on_battle_start` | At battle phase start | "At battle start: Gain 1000 ATK" |
| `on_draw` | When you draw | "When you draw: Inflict 500" |
| `on_end` | At end phase | "At end phase: Destroy 1" |

---

## Ability Parser

### How Parsing Works

The parser converts natural language abilities into structured effect objects.

**Example Input:**
```typescript
ability: "When this card is Normal Summoned: Draw 2 cards"
```

**Parser Output:**
```typescript
{
  type: "draw",
  trigger: "on_summon",
  value: 2,
  condition: null,
  target: null,
  continuous: false,
  isOPT: false
}
```

### Supported Patterns

**Simple Effects:**
```
"Draw 2 cards" → { type: "draw", value: 2 }
"Gain 500 ATK" → { type: "modifyATK", value: 500 }
"Inflict 1000 damage" → { type: "damage", value: 1000 }
```

**Conditional Effects:**
```
"If you have 3 or more monsters: Destroy 1"
→ { type: "destroy", condition: "3_or_more_monsters" }
```

**Targeting:**
```
"Destroy 1 Spell or Trap card"
→ { type: "destroy", target: "spell_trap", value: 1 }
```

**Continuous Effects:**
```
"All Warrior monsters gain 500 ATK"
→ { type: "modifyATK", continuous: true, condition: "Warrior_monsters", value: 500 }
```

**Once Per Turn:**
```
"Once per turn: Draw 1 card"
→ { type: "draw", value: 1, isOPT: true }
```

---

## Effect Executors

Each effect type has a dedicated executor in `convex/gameplay/effectSystem/executors/`.

### Example: Draw Effect

**File:** `convex/gameplay/effectSystem/executors/index.ts`

```typescript
async function executeDraw(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedAbility
): Promise<EffectResult> {
  const cardsToDraw = effect.value || 1;
  const isHost = gameState.hostId === playerId;

  const deck = isHost ? gameState.hostDeck : gameState.opponentDeck;
  const hand = isHost ? gameState.hostHand : gameState.opponentHand;

  if (deck.length < cardsToDraw) {
    return {
      success: false,
      message: "Not enough cards in deck"
    };
  }

  // Draw cards from top of deck
  const drawnCards = deck.slice(0, cardsToDraw);
  const newDeck = deck.slice(cardsToDraw);
  const newHand = [...hand, ...drawnCards];

  // Update game state
  if (isHost) {
    gameState.hostDeck = newDeck;
    gameState.hostHand = newHand;
  } else {
    gameState.opponentDeck = newDeck;
    gameState.opponentHand = newHand;
  }

  await ctx.db.patch(gameState._id, gameState);

  return {
    success: true,
    message: `Drew ${cardsToDraw} card(s)`
  };
}
```

### Example: Search Effect (Two-Step)

**File:** `convex/gameplay/effectSystem/executors/search.ts`

Search effects require player selection, so they use a two-step process:

**Step 1: Return matching cards**
```typescript
export async function executeSearch(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  playerId: Id<"users">,
  effect: ParsedAbility,
  selectedCardId?: Id<"cardDefinitions"> // Optional for step 2
): Promise<EffectResult> {
  // If no card selected yet, return options
  if (!selectedCardId) {
    const matchingCards = await findMatchingCards(
      ctx,
      deck,
      effect.condition // e.g., "Warrior_monsters"
    );

    return {
      success: true,
      matchingCards, // Frontend will show selection modal
      pendingSelection: true
    };
  }

  // Step 2: Add selected card to hand
  const cardIndex = deck.indexOf(selectedCardId);
  if (cardIndex === -1) {
    return { success: false, message: "Card not found" };
  }

  // Move card from deck to hand
  // ...

  return {
    success: true,
    message: `Added card to hand`
  };
}
```

⚠️ **Frontend integration not complete** - See MASTER_TODO.md

---

## Continuous Effects

### Overview

Continuous effects are always active while the card is face-up on the field. They don't activate or resolve on the chain.

**Examples:**
- Field Spells: "All DARK monsters gain 200 ATK"
- Continuous Traps: "All Warrior monsters gain 500 ATK"
- Monster Effects: "This card cannot be destroyed by battle"

### Implementation

**File:** `convex/gameplay/effectSystem/continuousEffects.ts`

```typescript
export function calculateContinuousModifiers(
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  card: Doc<"cardDefinitions">,
  isHost: boolean
): { atkBonus: number; defBonus: number } {
  let atkBonus = 0;
  let defBonus = 0;

  // Check field spell
  const fieldSpell = isHost
    ? gameState.hostFieldSpell
    : gameState.opponentFieldSpell;

  if (fieldSpell) {
    const parsed = parseAbility(fieldSpell.ability);
    if (parsed?.continuous && parsed.type === "modifyATK") {
      if (matchesCondition(card, parsed.condition)) {
        atkBonus += parsed.value || 0;
      }
    }
  }

  // Check continuous traps in backrow
  const backrow = isHost
    ? gameState.hostSpellTrapZone
    : gameState.opponentSpellTrapZone;

  for (const trapCard of backrow) {
    if (trapCard.cardType === "trap" && !trapCard.isFaceDown) {
      const parsed = parseAbility(trapCard.ability);
      if (parsed?.continuous && parsed.type === "modifyATK") {
        if (matchesCondition(card, parsed.condition)) {
          atkBonus += parsed.value || 0;
        }
      }
    }
  }

  return { atkBonus, defBonus };
}
```

### Condition Matching

```typescript
function matchesCondition(
  card: Doc<"cardDefinitions">,
  condition: string | null
): boolean {
  if (!condition) return true;

  // Archetype matching
  if (condition.endsWith("_monsters")) {
    const archetype = condition.replace("_monsters", "");

    // Check card's archetype field
    if (card.archetype?.toLowerCase() === archetype.toLowerCase()) {
      return true;
    }

    // Check if name contains archetype
    if (card.name.toLowerCase().includes(archetype.toLowerCase())) {
      return true;
    }
  }

  return false;
}
```

### Current Limitations

- ✅ ATK bonuses work
- ❌ DEF bonuses NOT implemented (see MASTER_TODO.md)
- ❌ Level-based conditions NOT implemented
- ❌ ATK threshold conditions NOT implemented

---

## Trap Activation

### How Traps Work

1. **Set Face-Down:** Player sets trap during their turn
2. **Wait:** Cannot activate same turn
3. **Activate:** Can activate on either player's turn (via ActivateCardModal)
4. **Resolve:** Effect executes

### ActivateCardModal

**File:** `apps/web/src/components/game/dialogs/ActivateCardModal.tsx`

**Features:**
- Shows when player clicks face-down trap
- Displays card details
- Confirm/Cancel buttons
- Validates activation timing (not same turn)

**Usage:**
```typescript
// In GameBoard.tsx
const [showActivateModal, setShowActivateModal] = useState(false);
const [cardToActivate, setCardToActivate] = useState(null);

// When player clicks face-down trap
const handleTrapClick = (card) => {
  setCardToActivate(card);
  setShowActivateModal(true);
};

// Activate handler
const handleConfirmActivate = async () => {
  await activateTrap(cardToActivate.instanceId);
  setShowActivateModal(false);
};
```

---

## Card Selection Modal

### Overview

⚠️ **Component created but NOT integrated** - See MASTER_TODO.md

**File:** `apps/web/src/components/game/dialogs/CardSelectionModal.tsx`

**Features:**
- Single or multi-select mode
- Zone-specific display (deck, graveyard, banished, board, hand)
- Visual card previews
- Selection counter
- Confirm/Cancel actions

### Intended Usage

```typescript
// Step 1: Backend returns matching cards
const result = await activateSpell(cardId);

if (result.matchingCards) {
  // Step 2: Show selection modal
  setCardSelection({
    cards: result.matchingCards,
    zone: "deck",
    title: "Search Your Deck",
    description: "Select 1 card to add to your hand",
    callback: async (selectedIds) => {
      // Step 3: Complete effect with selection
      await completeSearchEffect(cardId, selectedIds[0]);
    }
  });
}
```

### Missing Integration

1. Backend mutations need to return `matchingCards`
2. GameBoard needs selection state management
3. Need `completeSearchEffect` mutation

See MASTER_TODO.md for full details.

---

## Chain System

### Chain Basics

When multiple effects activate in response to each other, they form a "chain" that resolves backwards (LIFO - Last In, First Out).

**Example:**
```
1. Player activates Spell A
2. Opponent activates Trap B (negates Spell A)
3. Player activates Trap C (negates Trap B)

Resolution:
← 3. Trap C resolves (negates Trap B)
← 2. Trap B is negated (doesn't resolve)
← 1. Spell A resolves normally
```

### Chain Implementation

**File:** `convex/gameplay/chainResolver.ts`

```typescript
export async function resolveChain(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">
) {
  const chain = gameState.currentChain || [];

  // Resolve in reverse order (LIFO)
  for (let i = chain.length - 1; i >= 0; i--) {
    const chainLink = chain[i];

    if (!chainLink.negated) {
      // Execute effect
      const result = await executeEffect(
        ctx,
        gameState,
        chainLink.playerId,
        chainLink.effect
      );

      // Record event
      await recordGameEvent(ctx, gameState._id, {
        eventType: "chain_resolved",
        description: `${chainLink.cardName} resolved`,
        chainLinkNumber: i + 1
      });
    }
  }

  // Clear chain after resolution
  gameState.currentChain = [];
  await ctx.db.patch(gameState._id, { currentChain: [] });
}
```

---

## Auto-Triggers

### How Auto-Triggers Work

When trigger conditions are met, effects automatically activate and show toast notifications.

**Example Flow:**
```
1. Player summons Blue-Eyes (ATK 3000)
2. Blue-Eyes has ability: "When summoned: Draw 1 card"
3. System detects on_summon trigger
4. Effect executes automatically
5. Toast shows: "Blue-Eyes ability activated: Drew 1 card"
```

### Trigger Detection

**File:** `convex/gameplay/gameEngine/index.ts`

```typescript
async function checkAndExecuteTriggers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  triggerType: TriggerType,
  sourceCard?: BoardCard
) {
  // Check all cards on field for matching triggers
  const allBoardCards = [
    ...gameState.hostBoard,
    ...gameState.opponentBoard
  ];

  for (const boardCard of allBoardCards) {
    const card = await ctx.db.get(boardCard.cardId);
    if (!card?.ability) continue;

    const parsed = parseAbility(card.ability);
    if (parsed?.trigger === triggerType) {
      // Execute effect
      await executeEffect(ctx, gameState, boardCard.owner, parsed);

      // Show toast (via game event)
      await recordGameEvent(ctx, gameState._id, {
        eventType: "effect_activated",
        description: `${card.name} ability activated!`,
        affectedCards: [card._id]
      });
    }
  }
}
```

### Protection Badges

Cards with protection abilities show visual badges:

**Examples:**
- 🛡️ "Cannot be destroyed by battle"
- 🚫 "Cannot be targeted"
- 💪 "Cannot be destroyed by effects"

**Implementation:**
```typescript
// In BoardCard component
{card.cannotBeDestroyed && (
  <div className="absolute top-1 right-1 bg-blue-500 text-white px-1 rounded text-xs">
    🛡️
  </div>
)}
```

---

## Testing

### Test Effect Execution

**Test Draw:**
```
1. Activate card with "Draw 2 cards"
2. ✅ Hand size increases by 2
3. ✅ Deck size decreases by 2
4. ✅ Toast notification shows
```

**Test Search (when integrated):**
```
1. Activate "Search 1 Warrior monster"
2. ⚠️ CardSelectionModal should appear
3. ⚠️ Shows all Warrior monsters from deck
4. Click to select
5. ⚠️ Card added to hand
```

**Test Continuous Effect:**
```
1. Activate field spell "All DARK monsters gain 200 ATK"
2. Summon DARK monster (base 1500 ATK)
3. Attack with it
4. ✅ Should deal 1700 damage (1500 + 200)
5. Destroy field spell
6. Attack again
7. ✅ Should deal 1500 damage
```

**Test Trap Activation:**
```
1. Set trap face-down
2. End turn (cannot activate same turn)
3. Opponent takes action
4. Click trap card
5. ✅ ActivateCardModal appears
6. Confirm activation
7. ✅ Effect resolves
```

---

## Known Issues & TODOs

### Critical (See MASTER_TODO.md)
- ❌ CardSelectionModal not integrated
- ❌ Search effects can't complete without selection
- ❌ Special summon from GY blocked

### High
- ⚠️ DEF continuous effects not working
- ⚠️ Complex conditions not supported (level, ATK threshold)

### Medium
- Multi-target selection needs testing
- Zone-specific selections (banished, etc.)
- Effect negation in chains needs more testing

---

## File Structure

```
convex/gameplay/effectSystem/
├── parser.ts              # Ability parsing
├── executor.ts            # Main execution dispatcher
├── types.ts               # TypeScript types
├── continuousEffects.ts   # Continuous effect evaluation
└── executors/
    ├── index.ts           # Basic executors (draw, damage, etc.)
    ├── destroy.ts         # Destruction logic
    ├── search.ts          # Search with selection
    ├── mill.ts            # Mill/send to GY
    ├── discard.ts         # Discard from hand
    ├── modifyATK.ts       # ATK modification
    ├── modifyDEF.ts       # DEF modification
    └── negate.ts          # Effect negation

apps/web/src/components/game/dialogs/
├── ActivateCardModal.tsx        # Trap activation ✅
└── CardSelectionModal.tsx       # Card selection ⚠️ Not integrated
```

---

**See also:**
- [MASTER_TODO.md](../../MASTER_TODO.md) - Implementation status and priorities
- [Integration Patterns](../reference/INTEGRATION_PATTERNS.md) - Code integration examples
