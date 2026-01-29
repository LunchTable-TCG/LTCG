# Effect System Guide

**Comprehensive guide to the card ability and trigger system**

---

## Overview

The effect system executes JSON-defined card abilities, handles triggers, manages chains, and applies continuous effects. All 178 cards use structured JSON format for type-safe effect definitions.

### Current Status
- ✅ 178 cards loaded with JSON abilities
- ✅ 16 effect types implemented
- ✅ 11 trigger conditions working
- ✅ Trap activation UI complete
- ✅ Continuous effects for ATK bonuses
- ✅ JSON ability validation at schema level
- ⚠️ Card selection UI not integrated (see MASTER_TODO.md)
- ⚠️ DEF continuous effects not fully implemented

---

## JSON Ability Format

All card abilities are defined in structured JSON format. See [JSON_ABILITY_FORMAT.md](./JSON_ABILITY_FORMAT.md) for complete reference.

**Basic Structure:**
```json
{
  "ability": {
    "effects": [
      {
        "type": "draw",
        "trigger": "manual",
        "value": 2,
        "description": "Draw 2 cards"
      }
    ],
    "spellSpeed": 1,
    "isContinuous": false
  }
}
```

---

## Effect Types (16 Total)

### Implemented ✅

| Type | Description | JSON Example |
|------|-------------|--------------|
| `draw` | Draw cards | `{type: "draw", value: 2}` |
| `destroy` | Destroy cards | `{type: "destroy", target: {...}}` |
| `damage` | Deal damage | `{type: "damage", value: 500}` |
| `gainLP` | Heal life points | `{type: "gainLP", value: 1000}` |
| `modifyATK` | Change ATK stat | `{type: "modifyATK", value: 500}` |
| `modifyDEF` | Change DEF stat | `{type: "modifyDEF", value: 500}` |
| `summon` | Special summon | `{type: "summon", summonFrom: "graveyard"}` |
| `toHand` | Add to hand | `{type: "toHand", target: {...}}` |
| `toGraveyard` | Send to graveyard | `{type: "toGraveyard"}` |
| `banish` | Banish cards | `{type: "banish"}` |
| `search` | Search deck | `{type: "search", targetLocation: "deck"}` |
| `negate` | Negate activation | `{type: "negate"}` |
| `directAttack` | Attack directly | Special ability flag |
| `mill` | Mill from deck | `{type: "mill", value: 3}` |
| `discard` | Discard from hand | `{type: "discard"}` |
| `multipleAttack` | Attack multiple times | Special ability flag |

---

## Trigger Conditions (11 Total)

| Trigger | When It Fires | JSON Example |
|---------|---------------|--------------|
| `manual` | Player activates | Normal Spell activation |
| `continuous` | Always active | ATK boost effects |
| `on_summon` | When you summon | `{trigger: "on_summon"}` |
| `on_opponent_summon` | Opponent summons | Reactive effects |
| `on_destroy` | When destroyed | Float effects |
| `on_flip` | Flipped face-up | Flip effects |
| `on_battle_damage` | After damage dealt | Battle rewards |
| `on_battle_destroy` | After battle destroy | Victory effects |
| `on_attacked` | When attacked | Defensive triggers |
| `on_end_phase` | At end phase | Cleanup effects |
| `on_draw` | When you draw | Draw punishment |

---

## JSON Parsing & Execution

### How It Works

1. **Schema Validation**: JSON abilities validated at database level
2. **Runtime Parsing**: `jsonParser.ts` converts JSON to `ParsedAbility`
3. **Effect Execution**: Dispatched to type-specific executors
4. **Result Handling**: Success/failure returned with UI updates

**File:** `convex/gameplay/effectSystem/jsonParser.ts`

```typescript
export function parseJsonAbility(ability: JsonAbility): ParsedAbility {
  const effects: ParsedEffect[] = [];

  // Process each effect in the ability
  for (const jsonEffect of ability.effects) {
    const parsedEffect = parseJsonEffect(jsonEffect, ability.spellSpeed);
    effects.push(parsedEffect);
  }

  return {
    effects,
    spellSpeed: ability.spellSpeed,
    abilityText: ability.abilityText
  };
}
```

### Effect Execution Flow

**File:** `convex/gameplay/effectSystem/executor.ts`

```typescript
export async function executeEffect(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  playerId: Id<"users">,
  cardId: Id<"cardDefinitions">,
  targets?: Id<"cardDefinitions">[],
  effectIndex: number = 0
): Promise<EffectResult> {
  // Check OPT restrictions
  if (effect.isOPT) {
    const canActivate = await checkCanActivateOPT(ctx, gameState, cardId, effectIndex);
    if (!canActivate) {
      return { success: false, message: "Already used this turn" };
    }
  }

  // Route to specific executor based on type
  switch (effect.type) {
    case "draw":
      return await executeDraw(ctx, gameState, lobbyId, effect, playerId);
    case "damage":
      return await executeDamage(ctx, gameState, lobbyId, effect, playerId);
    case "destroy":
      return await executeDestroy(ctx, gameState, lobbyId, effect, playerId, targets);
    // ... other effect types
  }
}
```

---

## Effect Executors

Each effect type has a dedicated executor in `convex/gameplay/effectSystem/executors/`.

### Example: Damage Effect

**File:** `convex/gameplay/effectSystem/executors/combat/damage.ts`

```typescript
export async function executeDamage(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  effect: ParsedEffect,
  playerId: Id<"users">
): Promise<EffectResult> {
  const damageValue = effect.value || 0;
  const targetOwner = effect.targetOwner || "opponent";

  // Determine target
  const isHost = gameState.hostId === playerId;
  const targetIsHost = targetOwner === "self" ? isHost : !isHost;

  // Apply damage
  if (targetIsHost) {
    gameState.hostLP = Math.max(0, gameState.hostLP - damageValue);
  } else {
    gameState.opponentLP = Math.max(0, gameState.opponentLP - damageValue);
  }

  await ctx.db.patch(gameState._id, {
    hostLP: gameState.hostLP,
    opponentLP: gameState.opponentLP
  });

  return {
    success: true,
    message: `Inflicted ${damageValue} damage`
  };
}
```

---

## Continuous Effects

### Overview

Continuous effects are always active while the card is face-up. They don't activate or use the chain.

**Examples:**
- "All your monsters gain 300 ATK"
- "This card cannot be destroyed by battle"
- Field Spells providing archetype bonuses

### Implementation

**File:** `convex/gameplay/effectSystem/continuousEffects.ts`

```typescript
export async function applyContinuousModifiers(
  ctx: QueryCtx,
  gameState: Doc<"gameStates">,
  cardId: Id<"cardDefinitions">,
  card: Doc<"cardDefinitions">,
  isHost: boolean
): Promise<{ atkBonus: number; defBonus: number }> {
  let atkBonus = 0;
  let defBonus = 0;

  // Check field spell
  const fieldSpell = isHost ? gameState.hostFieldSpell : gameState.opponentFieldSpell;
  if (fieldSpell) {
    const fieldCard = await ctx.db.get(fieldSpell.cardId);
    if (fieldCard?.ability) {
      const ability = parseJsonAbility(fieldCard.ability);
      for (const effect of ability.effects) {
        if (effect.isContinuous && effect.type === "modifyATK") {
          if (matchesCondition(card, effect)) {
            atkBonus += effect.value || 0;
          }
        }
      }
    }
  }

  // Check continuous traps/spells in backrow
  const backrow = isHost ? gameState.hostSpellTrapZone : gameState.opponentSpellTrapZone;
  for (const backrowCard of backrow) {
    if (!backrowCard.isFaceDown) {
      const cardDef = await ctx.db.get(backrowCard.cardId);
      if (cardDef?.ability) {
        const ability = parseJsonAbility(cardDef.ability);
        for (const effect of ability.effects) {
          if (effect.isContinuous && effect.type === "modifyATK") {
            if (matchesCondition(card, effect)) {
              atkBonus += effect.value || 0;
            }
          }
        }
      }
    }
  }

  return { atkBonus, defBonus };
}
```

### Current Status
- ✅ ATK bonuses from field spells
- ✅ ATK bonuses from continuous traps
- ✅ Archetype-based matching
- ⚠️ DEF bonuses partially implemented

---

## Chain System

### Chain Basics

Effects form a chain when activated in response to each other. Chains resolve backwards (LIFO).

**Example:**
```
1. Player activates Spell A
2. Opponent chains Trap B (targets Spell A)
3. Player chains Counter Trap C (targets Trap B)

Resolution (backwards):
← 3. Counter Trap C resolves (negates Trap B)
← 2. Trap B is negated (doesn't resolve)
← 1. Spell A resolves normally
```

### Implementation

**File:** `convex/gameplay/chainResolver.ts`

```typescript
export const resolveChain = internalMutation({
  handler: async (ctx, { lobbyId }) => {
    const gameState = await getGameState(ctx, lobbyId);
    const chain = gameState.currentChain || [];

    // Resolve in reverse order (LIFO)
    for (let i = chain.length - 1; i >= 0; i--) {
      const link = chain[i];

      if (!link.negated) {
        const card = await ctx.db.get(link.cardId);
        if (card?.ability) {
          const ability = getCardAbility(card);
          if (ability) {
            await executeEffect(
              ctx,
              gameState,
              lobbyId,
              ability.effects[link.effectIndex || 0],
              link.playerId,
              link.cardId
            );
          }
        }
      }
    }

    // Clear chain
    await ctx.db.patch(gameState._id, { currentChain: [] });
  }
});
```

---

## Trap Activation

### Flow

1. **Set Face-Down**: Player sets trap during their Main Phase
2. **Wait**: Cannot activate same turn
3. **Activate**: Click trap to activate (via ActivateCardModal)
4. **Resolve**: Effect executes immediately or enters chain

### ActivateCardModal

**File:** `apps/web/src/components/game/dialogs/ActivateCardModal.tsx`

**Features:**
- Displays trap card details
- Validates activation timing
- Confirms player intent
- Triggers backend activation

**Usage:**
```typescript
// In GameBoard component
const handleTrapClick = (trapCard: BoardCard) => {
  if (trapCard.isFaceDown && !trapCard.setThisTurn) {
    setCardToActivate(trapCard);
    setShowActivateModal(true);
  }
};

const handleConfirmActivate = async () => {
  await activateTrap(cardToActivate.instanceId);
  setShowActivateModal(false);
};
```

---

## Auto-Triggers

### How They Work

When trigger conditions are met (summon, destroy, battle damage), effects automatically activate.

**Example:**
```
1. Player summons "Cinder Wyrm"
2. Cinder Wyrm has ability: { trigger: "on_summon", type: "draw" }
3. System detects on_summon trigger
4. Draw effect executes automatically
5. Toast notification: "Cinder Wyrm effect activated!"
```

### Trigger Detection

**File:** `convex/gameplay/triggerSystem.ts`

```typescript
export async function checkAndExecuteTriggers(
  ctx: MutationCtx,
  gameState: Doc<"gameStates">,
  lobbyId: Id<"gameLobbies">,
  triggerType: TriggerCondition,
  sourceCardId?: Id<"cardDefinitions">
) {
  // Check all board cards for matching triggers
  const allCards = [
    ...gameState.hostBoard,
    ...gameState.opponentBoard
  ];

  for (const boardCard of allCards) {
    const card = await ctx.db.get(boardCard.cardId);
    if (!card) continue;

    const ability = getCardAbility(card);
    if (!ability) continue;

    for (const effect of ability.effects) {
      if (effect.trigger === triggerType) {
        // Execute trigger
        await executeEffect(
          ctx,
          gameState,
          lobbyId,
          effect,
          boardCard.owner,
          card._id
        );

        // Record event for toast
        await recordEventHelper(ctx, lobbyId, {
          eventType: "effect_activated",
          description: `${card.name} effect activated!`,
          playerId: boardCard.owner
        });
      }
    }
  }
}
```

---

## Protection Effects

### Visual Indicators

Cards with protection show badges on the board:

- 🛡️ Cannot be destroyed by battle
- 🚫 Cannot be targeted
- 💪 Cannot be destroyed by effects

### JSON Definition

```json
{
  "type": "modifyATK",
  "trigger": "continuous",
  "value": 0,
  "isContinuous": true,
  "protection": {
    "cannotBeTargeted": true
  }
}
```

---

## Testing Effect Execution

### Manual Testing Checklist

**Draw Effect:**
```
✅ Activate card with draw effect
✅ Hand size increases
✅ Deck size decreases
✅ Toast notification appears
```

**Damage Effect:**
```
✅ Activate damage effect
✅ Opponent LP decreases correctly
✅ Game ends at LP = 0
```

**Continuous ATK:**
```
✅ Activate field spell with ATK boost
✅ Monster ATK increases on board
✅ Damage calculation uses boosted ATK
✅ Destroying field spell removes boost
```

**Trap Activation:**
```
✅ Set trap face-down
✅ Cannot activate same turn
✅ Can activate on subsequent turns
✅ ActivateCardModal appears
✅ Effect resolves correctly
```

**Triggered Effects:**
```
✅ Summon monster with on_summon trigger
✅ Effect activates automatically
✅ Toast shows activation message
✅ Effect resolves correctly
```

---

## Known Issues & TODOs

### Critical (See MASTER_TODO.md)
- ❌ CardSelectionModal not integrated with search effects
- ❌ Special summon selection not available
- ❌ Multi-target selection needs UI work

### High Priority
- ⚠️ DEF continuous effects need completion
- ⚠️ Complex conditions (level, ATK threshold) not supported
- ⚠️ Some unparsed effects need manual conversion

### Medium Priority
- Zone-specific card selections (banished, etc.)
- Effect negation in complex chains
- SEGOC (Simultaneous Effects Go On Chain) ordering

---

## File Structure

```
convex/
├── gameplay/effectSystem/
│   ├── types.ts                  # TypeScript type definitions
│   ├── jsonParser.ts             # JSON ability parser ✅
│   ├── jsonEffectValidators.ts   # Schema validators ✅
│   ├── executor.ts               # Main effect dispatcher ✅
│   ├── continuousEffects.ts      # Continuous effect evaluation ✅
│   └── executors/
│       ├── cardMovement/
│       │   ├── draw.ts           # Draw cards
│       │   ├── search.ts         # Search deck
│       │   ├── toHand.ts         # Add to hand
│       │   ├── toGraveyard.ts    # Send to GY
│       │   ├── banish.ts         # Banish cards
│       │   ├── mill.ts           # Mill from deck
│       │   └── discard.ts        # Discard from hand
│       ├── combat/
│       │   ├── damage.ts         # Inflict damage
│       │   ├── gainLP.ts         # Heal LP
│       │   ├── modifyATK.ts      # Change ATK
│       │   └── modifyDEF.ts      # Change DEF
│       ├── summon/
│       │   ├── summon.ts         # Special summon
│       │   └── destroy.ts        # Destroy cards
│       └── utility/
│           └── negate.ts         # Negate effects

apps/web/src/components/game/dialogs/
├── ActivateCardModal.tsx        # Trap activation ✅
└── CardSelectionModal.tsx       # Card selection ⚠️ Not integrated
```

---

## See Also

- [JSON Ability Format Guide](./JSON_ABILITY_FORMAT.md) - Complete JSON reference
- [Schema Documentation](../schema.md) - Database schema
- [MASTER_TODO.md](../../MASTER_TODO.md) - Implementation priorities
