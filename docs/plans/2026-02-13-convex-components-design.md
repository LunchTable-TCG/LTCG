# Convex Custom Components Design: @lunchtable-tcg

**Date**: 2026-02-13
**Status**: Approved
**Approach**: Core + Extensions (Approach C)

## Overview

Extract LTCG's game engine into a suite of publishable Convex custom components under the `@lunchtable-tcg` npm scope. Components are developed inside the monorepo with live reloading and published to npm for external consumption.

The goal: any developer can `npm install @lunchtable-tcg/core` and have a working TCG backend in minutes.

## Architecture

```
@lunchtable-tcg/types    → Pure TS types (not a Convex component)
@lunchtable-tcg/core     → Card defs, decks, game state, phases, turns, matchmaking
@lunchtable-tcg/combat   → Battle system extension (attacks, damage, positions)
@lunchtable-tcg/effects  → Effect system extension (chains, triggers, costs, executors)
```

Dependency graph:
```
types ← core ← combat
              ← effects
```

Extensions communicate with core via **function handles** (Convex's cross-component callback mechanism). The host app provides a "bridge" module that wires extensions to core.

## Package Structure

```
packages/
├── lunchtable-tcg-types/          # @lunchtable-tcg/types
│   ├── package.json
│   └── src/
│       ├── card.ts                # CardDefinition, CardType, Rarity, etc.
│       ├── game.ts                # GamePhase, GameState, PlayerState
│       ├── effect.ts              # EffectType, TriggerCondition, JsonAbility
│       └── index.ts
│
├── lunchtable-tcg-core/           # @lunchtable-tcg/core
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── component/
│   │   │   ├── convex.config.ts   # defineComponent("lunchtable-tcg-core")
│   │   │   ├── schema.ts
│   │   │   ├── cards.ts
│   │   │   ├── decks.ts
│   │   │   ├── game.ts
│   │   │   ├── phases.ts
│   │   │   ├── turns.ts
│   │   │   ├── matchmaking.ts
│   │   │   └── lib/
│   │   │       ├── gameHelpers.ts
│   │   │       ├── validation.ts
│   │   │       └── constants.ts
│   │   └── client/
│   │       ├── index.ts           # LTCGCore class
│   │       └── types.ts
│   └── example/
│       └── convex/
│
├── lunchtable-tcg-combat/         # @lunchtable-tcg/combat
│   ├── package.json
│   ├── src/
│   │   ├── component/
│   │   │   ├── convex.config.ts
│   │   │   ├── schema.ts
│   │   │   ├── combat.ts
│   │   │   ├── positions.ts
│   │   │   └── replay.ts
│   │   └── client/
│   │       └── index.ts           # LTCGCombat class
│
└── lunchtable-tcg-effects/        # @lunchtable-tcg/effects
    ├── package.json
    ├── src/
    │   ├── component/
    │   │   ├── convex.config.ts
    │   │   ├── schema.ts
    │   │   ├── executor.ts
    │   │   ├── chains.ts
    │   │   ├── triggers.ts
    │   │   ├── costs.ts
    │   │   ├── continuous.ts
    │   │   └── effectLibrary.ts
    │   └── client/
    │       └── index.ts           # LTCGEffects class
```

## Core Component Schema

```typescript
defineSchema({
  cardDefinitions: defineTable({
    name: v.string(),
    cardType: v.string(),         // "monster" | "spell" | "trap"
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    level: v.optional(v.number()),
    rarity: v.string(),
    stereotype: v.optional(v.string()),  // card grouping
    abilities: v.optional(v.any()),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),       // extensible per-game data
  }).index("by_name", ["name"])
    .index("by_type", ["cardType"])
    .index("by_rarity", ["rarity"]),

  decks: defineTable({
    ownerId: v.string(),
    name: v.string(),
    cards: v.array(v.string()),
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_owner", ["ownerId"]),

  gameStates: defineTable({
    players: v.array(v.object({
      id: v.string(),
      deckId: v.string(),
      lifePoints: v.number(),
      hand: v.array(v.any()),
      field: v.array(v.any()),
      graveyard: v.array(v.any()),
      deck: v.array(v.any()),
    })),
    currentPhase: v.string(),
    currentPlayerIndex: v.number(),
    turnNumber: v.number(),
    status: v.string(),              // "waiting" | "active" | "finished"
    winner: v.optional(v.string()),
    config: v.object({
      startingLP: v.number(),
      maxHandSize: v.number(),
      phases: v.array(v.string()),
      drawPerTurn: v.number(),
    }),
    metadata: v.optional(v.any()),
  }),

  gameEvents: defineTable({
    gameId: v.id("gameStates"),
    type: v.string(),
    playerId: v.optional(v.string()),
    data: v.any(),
    timestamp: v.number(),
  }).index("by_game", ["gameId", "timestamp"]),

  matchmakingQueue: defineTable({
    playerId: v.string(),
    deckId: v.string(),
    rating: v.number(),
    joinedAt: v.number(),
    mode: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_mode", ["mode", "joinedAt"]),
})
```

## Core Client API

```typescript
const ltcg = new LTCGCore(components.ltcgCore);

// Cards
await ltcg.cards.register(ctx, { name, cardType, ... });
await ltcg.cards.getAll(ctx);
await ltcg.cards.getById(ctx, cardId);
await ltcg.cards.bulkImport(ctx, definitions[]);

// Decks
await ltcg.decks.create(ctx, { ownerId, name, cards });
await ltcg.decks.validate(ctx, { deckId, rules: { min: 30, max: 60 }});
await ltcg.decks.setActive(ctx, { ownerId, deckId });
await ltcg.decks.getForPlayer(ctx, { ownerId });

// Game Lifecycle
const gameId = await ltcg.game.create(ctx, {
  players: [{ id: "p1", deckId: "d1" }, { id: "p2", deckId: "d2" }],
  config: { startingLP: 8000, phases: ["draw","standby","main1","battle","main2","end"] }
});
await ltcg.game.getState(ctx, { gameId });
await ltcg.game.advancePhase(ctx, { gameId, playerId });
await ltcg.game.endTurn(ctx, { gameId, playerId });
await ltcg.game.drawCards(ctx, { gameId, playerId, count: 1 });
await ltcg.game.modifyLP(ctx, { gameId, playerId, delta: -1000 });

// Matchmaking
await ltcg.matchmaking.joinQueue(ctx, { playerId, deckId, rating, mode });
await ltcg.matchmaking.leaveQueue(ctx, { playerId });
await ltcg.matchmaking.findMatch(ctx, { mode, ratingRange: 200 });

// Events
await ltcg.events.log(ctx, { gameId, type, playerId, data });
await ltcg.events.getForGame(ctx, { gameId });

// Extension Hooks (function handle callbacks)
await ltcg.hooks.onPhaseEnter(ctx, { phase, callbackHandle });
await ltcg.hooks.onTurnEnd(ctx, { callbackHandle });
await ltcg.hooks.onCardPlayed(ctx, { callbackHandle });
await ltcg.hooks.onBattleResolved(ctx, { callbackHandle });
```

## Combat Extension Schema & API

```typescript
// Schema
defineSchema({
  battleStates: defineTable({
    gameId: v.string(),
    attacker: v.any(),
    target: v.any(),
    phase: v.string(),       // "declare" | "damage_calc" | "resolve"
    modifiers: v.array(v.any()),
    metadata: v.optional(v.any()),
  }).index("by_game", ["gameId"]),

  battleLog: defineTable({
    gameId: v.string(),
    turn: v.number(),
    attacks: v.array(v.any()),
    timestamp: v.number(),
  }).index("by_game", ["gameId"]),
})

// Client
const combat = new LTCGCombat(components.ltcgCombat, {
  damageFormula: "standard",
  positionSystem: true,
  directAttackAllowed: true,
  battleReplay: true,
});

await combat.declareAttack(ctx, { gameId, attackerId, targetId, playerId });
await combat.calculateDamage(ctx, { gameId, battleId });
await combat.resolveAttack(ctx, { gameId, battleId });
await combat.getModifiedStats(ctx, { gameId, cardId });
await combat.getBattleLog(ctx, { gameId });
```

## Effects Extension Schema & API

```typescript
// Schema
defineSchema({
  activeEffects: defineTable({
    gameId: v.string(),
    sourceCardId: v.string(),
    effectType: v.string(),
    targets: v.array(v.string()),
    duration: v.string(),
    data: v.any(),
    metadata: v.optional(v.any()),
  }).index("by_game", ["gameId"]),

  chainState: defineTable({
    gameId: v.string(),
    links: v.array(v.object({
      cardId: v.string(),
      effectId: v.string(),
      spellSpeed: v.number(),
      targets: v.array(v.string()),
    })),
    resolving: v.boolean(),
  }).index("by_game", ["gameId"]),

  optTracking: defineTable({
    gameId: v.string(),
    cardId: v.string(),
    effectId: v.string(),
    usedThisTurn: v.boolean(),
  }).index("by_game_card", ["gameId", "cardId"]),
})

// Client
const effects = new LTCGEffects(components.ltcgEffects);

await effects.registerEffect(ctx, { id, type, params, spellSpeed });
await effects.startChain(ctx, { gameId });
await effects.addToChain(ctx, { gameId, cardId, effectId, targets });
await effects.resolveChain(ctx, { gameId });
await effects.activate(ctx, { gameId, cardId, effectId, targets });
await effects.applyContinuous(ctx, { gameId });
await effects.cleanupExpired(ctx, { gameId });
await effects.registerEffectSchema(ctx, { type, params, executor });
```

## Bridge Pattern (Host App Wiring)

Host apps wire components together via a bridge module:

```typescript
// convex/gameBridge.ts - app-level glue
import { createFunctionHandle } from "convex/server";

export const applyDamage = mutation({
  args: { gameId: v.string(), playerId: v.string(), amount: v.number() },
  handler: async (ctx, { gameId, playerId, amount }) => {
    await ltcg.game.modifyLP(ctx, { gameId, playerId, delta: -amount });
    await effects.checkTriggers(ctx, { gameId, event: "damage_dealt", data: { amount } });
  },
});

export const onCardDestroyed = mutation({
  args: { gameId: v.string(), cardId: v.string() },
  handler: async (ctx, { gameId, cardId }) => {
    await effects.checkTriggers(ctx, { gameId, event: "card_destroyed", data: { cardId } });
  },
});

// Register hooks on game startup
export const setupGameHooks = mutation({
  handler: async (ctx) => {
    const damageHandle = await createFunctionHandle(api.gameBridge.applyDamage);
    const destroyHandle = await createFunctionHandle(api.gameBridge.onCardDestroyed);
    await ltcg.hooks.onBattleResolved(ctx, { callbackHandle: damageHandle });
    await ltcg.hooks.onCardDestroyed(ctx, { callbackHandle: destroyHandle });
  },
});
```

## Key Design Decisions

1. **`stereotype` not `archetype`** - Card grouping field uses the term "stereotype"
2. **`metadata: v.any()` everywhere** - Extensibility over strictness at component boundaries
3. **IDs are strings across boundaries** - Convex component limitation; documented clearly
4. **No `ctx.auth` in components** - All user identification passed explicitly as `ownerId`/`playerId`
5. **Function handles for callbacks** - Components call back into the host app via registered handles
6. **Phase sequences are configurable** - Core doesn't hardcode Yu-Gi-Oh phases; games define their own
7. **Damage formula is pluggable** - Combat extension accepts different calculation strategies

## Convex Component Constraints

- Components cannot access `ctx.auth` or `process.env`
- Component tables are fully isolated from host app tables
- All public functions require `args` and `returns` validators
- IDs become plain strings across component boundaries
- Component functions can't be called from browser directly (must wrap in app functions)
- Standard `.paginate()` doesn't work cross-boundary (use `paginator` from convex-helpers)

## Migration Strategy

1. Build components alongside existing code (no breaking changes)
2. Create thin wrapper layer in LTCG that delegates to components
3. Gradually migrate LTCG's direct DB calls to component API calls
4. Once stable, remove old direct implementations
5. Publish to npm

## File Mapping: Existing → Component

| Existing File | Target Component | Target File |
|---|---|---|
| `convex/core/cards.ts` | `@lunchtable-tcg/core` | `src/component/cards.ts` |
| `convex/core/decks.ts` | `@lunchtable-tcg/core` | `src/component/decks.ts` |
| `convex/gameplay/phaseManager.ts` | `@lunchtable-tcg/core` | `src/component/phases.ts` |
| `convex/gameplay/gameEngine/turns.ts` | `@lunchtable-tcg/core` | `src/component/turns.ts` |
| `convex/gameplay/games/lifecycle.ts` | `@lunchtable-tcg/core` | `src/component/game.ts` |
| `convex/gameplay/games/queries.ts` | `@lunchtable-tcg/core` | `src/component/game.ts` |
| `convex/gameplay/gameEvents.ts` | `@lunchtable-tcg/core` | `src/component/game.ts` |
| `convex/social/matchmaking.ts` | `@lunchtable-tcg/core` | `src/component/matchmaking.ts` |
| `convex/gameplay/combatSystem.ts` | `@lunchtable-tcg/combat` | `src/component/combat.ts` |
| `convex/gameplay/replaySystem.ts` | `@lunchtable-tcg/combat` | `src/component/replay.ts` |
| `convex/gameplay/gameEngine/positions.ts` | `@lunchtable-tcg/combat` | `src/component/positions.ts` |
| `convex/gameplay/effectSystem/executor.ts` | `@lunchtable-tcg/effects` | `src/component/executor.ts` |
| `convex/gameplay/chainResolver.ts` | `@lunchtable-tcg/effects` | `src/component/chains.ts` |
| `convex/gameplay/triggerSystem.ts` | `@lunchtable-tcg/effects` | `src/component/triggers.ts` |
| `convex/gameplay/effectSystem/costValidator.ts` | `@lunchtable-tcg/effects` | `src/component/costs.ts` |
| `convex/gameplay/effectSystem/costPayment.ts` | `@lunchtable-tcg/effects` | `src/component/costs.ts` |
| `convex/gameplay/effectSystem/continuousEffects.ts` | `@lunchtable-tcg/effects` | `src/component/continuous.ts` |
| `convex/gameplay/effectSystem/effectLibrary.ts` | `@lunchtable-tcg/effects` | `src/component/effectLibrary.ts` |
| `packages/core/src/card-logic.ts` | `@lunchtable-tcg/types` | `src/card.ts` |
| `packages/core/src/game.ts` | `@lunchtable-tcg/types` | `src/game.ts` |
| `convex/lib/gameHelpers.ts` | `@lunchtable-tcg/core` | `src/component/lib/gameHelpers.ts` |
| `convex/lib/constants.ts` | `@lunchtable-tcg/core` | `src/component/lib/constants.ts` |

## Package.json Exports Pattern

Each Convex component package follows this export structure:

```json
{
  "name": "@lunchtable-tcg/core",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": {
        "@convex-dev/component-source": "./src/client/index.ts",
        "types": "./dist/esm/client/index.d.ts",
        "default": "./dist/esm/client/index.js"
      }
    },
    "./convex.config": {
      "import": {
        "@convex-dev/component-source": "./src/component/convex.config.ts",
        "types": "./dist/esm/component/convex.config.d.ts",
        "default": "./dist/esm/component/convex.config.js"
      }
    }
  }
}
```

## Consumer Quick Start

```typescript
// 1. Install
// npm install @lunchtable-tcg/core @lunchtable-tcg/combat @lunchtable-tcg/effects

// 2. convex.config.ts
import { defineApp } from "convex/server";
import core from "@lunchtable-tcg/core/convex.config";
import combat from "@lunchtable-tcg/combat/convex.config";
import effects from "@lunchtable-tcg/effects/convex.config";

const app = defineApp();
app.use(core, { name: "ltcgCore" });
app.use(combat, { name: "ltcgCombat" });
app.use(effects, { name: "ltcgEffects" });
export default app;

// 3. Use in mutations/queries
import { LTCGCore } from "@lunchtable-tcg/core";
import { LTCGCombat } from "@lunchtable-tcg/combat";
import { LTCGEffects } from "@lunchtable-tcg/effects";

const ltcg = new LTCGCore(components.ltcgCore);
const combat = new LTCGCombat(components.ltcgCombat);
const effects = new LTCGEffects(components.ltcgEffects);

// 4. Create a game
export const startGame = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const gameId = await ltcg.game.create(ctx, {
      players: [
        { id: userId, deckId: "deck1" },
        { id: "opponent", deckId: "deck2" },
      ],
      config: {
        startingLP: 8000,
        maxHandSize: 7,
        phases: ["draw", "standby", "main1", "battle", "main2", "end"],
        drawPerTurn: 1,
      },
    });
    return gameId;
  },
});
```
