# @lunchtable-tcg Component Suite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract LTCG's game engine into publishable Convex custom components under `@lunchtable-tcg/*` that any TCG developer can plug into their Convex app.

**Architecture:** Core + Extensions pattern. `@lunchtable-tcg/types` (pure TS), `@lunchtable-tcg/core` (Convex component: cards, decks, game state, phases, turns, matchmaking), `@lunchtable-tcg/combat` (extension: battles, damage, positions), `@lunchtable-tcg/effects` (extension: chains, triggers, costs, executors). Components communicate via function handles. Host apps provide a "bridge" module.

**Tech Stack:** Convex custom components, TypeScript, Bun, Vitest, convex-test

**Design doc:** `docs/plans/2026-02-13-convex-components-design.md`

**Reference component:** `node_modules/@convex-dev/sharded-counter/` — follow this exact pattern for file structure, package.json exports, and client class shape.

---

## Phase 1: Scaffolding & Types Package

### Task 1: Scaffold package directories

**Files:**
- Create: `packages/lunchtable-tcg-types/package.json`
- Create: `packages/lunchtable-tcg-types/tsconfig.json`
- Create: `packages/lunchtable-tcg-core/package.json`
- Create: `packages/lunchtable-tcg-core/tsconfig.json`
- Create: `packages/lunchtable-tcg-core/tsconfig.build.json`
- Create: `packages/lunchtable-tcg-combat/package.json`
- Create: `packages/lunchtable-tcg-combat/tsconfig.json`
- Create: `packages/lunchtable-tcg-combat/tsconfig.build.json`
- Create: `packages/lunchtable-tcg-effects/package.json`
- Create: `packages/lunchtable-tcg-effects/tsconfig.json`
- Create: `packages/lunchtable-tcg-effects/tsconfig.build.json`

**Step 1: Create types package.json**

```json
{
  "name": "@lunchtable-tcg/types",
  "version": "0.1.0",
  "description": "Shared TypeScript types for Lunchtable TCG engine components",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./card": {
      "types": "./dist/card.d.ts",
      "import": "./dist/card.js"
    },
    "./game": {
      "types": "./dist/game.d.ts",
      "import": "./dist/game.js"
    },
    "./effect": {
      "types": "./dist/effect.d.ts",
      "import": "./dist/effect.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "convex": "^1.24.8"
  },
  "devDependencies": {
    "convex": "^1.31.6",
    "typescript": "^5.7.3"
  },
  "files": ["dist", "src"],
  "keywords": ["tcg", "convex", "types", "card-game"]
}
```

**Step 2: Create types tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create core package.json**

Follow the pattern from `@convex-dev/sharded-counter/package.json`:

```json
{
  "name": "@lunchtable-tcg/core",
  "version": "0.1.0",
  "description": "TCG game engine core: cards, decks, game state, phases, turns, matchmaking",
  "type": "module",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": {
        "@convex-dev/component-source": "./src/client/index.ts",
        "types": "./dist/client/index.d.ts",
        "default": "./dist/client/index.js"
      }
    },
    "./convex.config": {
      "import": {
        "@convex-dev/component-source": "./src/component/convex.config.ts",
        "types": "./dist/component/convex.config.d.ts",
        "default": "./dist/component/convex.config.js"
      }
    },
    "./convex.config.js": {
      "types": "./dist/component/convex.config.d.ts",
      "default": "./dist/component/convex.config.js"
    }
  },
  "scripts": {
    "build": "tsc --project ./tsconfig.build.json",
    "dev:build": "tsc --project ./tsconfig.build.json --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepare": "npm run build"
  },
  "peerDependencies": {
    "convex": "^1.24.8"
  },
  "dependencies": {
    "@lunchtable-tcg/types": "workspace:*"
  },
  "devDependencies": {
    "convex": "^1.31.6",
    "convex-test": "^0.0.38",
    "typescript": "^5.7.3",
    "vitest": "^3.2.4"
  },
  "files": ["dist", "src"],
  "types": "./dist/client/index.d.ts",
  "module": "./dist/client/index.js",
  "keywords": ["tcg", "convex", "component", "card-game", "game-engine"]
}
```

**Step 4: Create core tsconfig.build.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "include": ["src/client/**/*", "src/component/convex.config.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 5: Create core tsconfig.json (for local dev)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 6: Create combat and effects package.json files**

Same structure as core but with names `@lunchtable-tcg/combat` and `@lunchtable-tcg/effects`. Combat description: "TCG battle system: attacks, damage calculation, positions". Effects description: "TCG effect system: chains, triggers, costs, executors".

Both depend on:
```json
"dependencies": {
  "@lunchtable-tcg/types": "workspace:*"
}
```

**Step 7: Run bun install**

Run: `bun install`
Expected: Workspaces resolve, no errors

**Step 8: Commit**

```bash
git add packages/lunchtable-tcg-*/package.json packages/lunchtable-tcg-*/tsconfig*.json
git commit -m "chore: scaffold @lunchtable-tcg component packages"
```

---

### Task 2: Implement @lunchtable-tcg/types

**Files:**
- Create: `packages/lunchtable-tcg-types/src/index.ts`
- Create: `packages/lunchtable-tcg-types/src/card.ts`
- Create: `packages/lunchtable-tcg-types/src/game.ts`
- Create: `packages/lunchtable-tcg-types/src/effect.ts`
- Reference: `packages/core/src/types/game.ts` (existing types to extract from)
- Reference: `packages/core/src/types/card-logic.ts` (existing effect types)
- Reference: `packages/core/src/config/gameConfig.ts` (existing enums)

**Step 1: Create card.ts**

Extract card-related types from existing `packages/core/src/types/game.ts` and `gameConfig.ts`. Make them generic (no LTCG-specific archetypes hardcoded):

```typescript
// packages/lunchtable-tcg-types/src/card.ts

/**
 * Base card definition that all TCG games share.
 * Games extend this via the `metadata` field for game-specific properties.
 */
export interface CardDefinition {
  /** Card name */
  name: string;
  /** Card type category */
  cardType: string;
  /** Attack points (combat cards only) */
  attack?: number;
  /** Defense points (combat cards only) */
  defense?: number;
  /** Level/rank/cost of the card */
  level?: number;
  /** Rarity tier */
  rarity: string;
  /** Card grouping/family (called "stereotype" in LTCG) */
  stereotype?: string;
  /** Card abilities in JSON format */
  abilities?: JsonAbility | JsonAbility[];
  /** Card description text */
  description: string;
  /** Artwork URL */
  imageUrl?: string;
  /** Game-specific extensible data */
  metadata?: Record<string, unknown>;
}

/**
 * Card as it appears in a player's hand during a game.
 */
export interface HandCard extends CardDefinition {
  /** Unique instance ID within this game */
  instanceId: string;
  /** Human-readable ability text */
  abilityText?: string;
  /** Effect category (trigger, continuous, etc.) */
  effectType?: string;
}

/**
 * Card on the game board (field/monster zone).
 */
export interface BoardCard extends HandCard {
  /** Card position (e.g., "attack" | "defense") */
  position?: string;
  /** Whether the card is face-down */
  isFaceDown: boolean;
  /** Turn number when this card was placed */
  placedOnTurn?: number;
  /** Whether this card has attacked this turn */
  hasAttacked?: boolean;
  /** Whether this card's effect was used this turn */
  effectUsedThisTurn?: boolean;
}

/**
 * Card in the backrow (spell/trap zone).
 */
export interface BackrowCard extends HandCard {
  /** Whether this card is face-down (set) */
  isFaceDown: boolean;
  /** Whether the card was set this turn (can't activate yet for traps) */
  setThisTurn?: boolean;
  /** Whether this is a continuous card that's currently active */
  isActive?: boolean;
}

/**
 * Card in the graveyard.
 */
export interface GraveyardCard extends CardDefinition {
  instanceId: string;
  /** How this card ended up in the graveyard */
  sentBy?: "destroyed" | "discarded" | "cost" | "effect" | "tribute";
  /** Turn it was sent to graveyard */
  sentOnTurn?: number;
}

/**
 * JSON ability definition structure.
 * This is the core schema for defining card effects declaratively.
 */
export interface JsonAbility {
  /** Name of the ability */
  name?: string;
  /** When this ability triggers */
  trigger?: TriggerCondition;
  /** The effect(s) this ability produces */
  effects: JsonEffect[];
  /** Cost to activate this ability */
  cost?: JsonCost;
  /** Once-per-turn restriction */
  opt?: boolean;
  /** Hard once-per-turn (by card name, not instance) */
  hopt?: boolean;
  /** Spell speed (1 = normal, 2 = quick, 3 = counter) */
  spellSpeed?: number;
  /** Whether this is a continuous effect */
  continuous?: boolean;
}

/**
 * Individual effect within an ability.
 */
export interface JsonEffect {
  type: string;
  params?: Record<string, unknown>;
  targets?: EffectTarget;
  condition?: EffectCondition;
}

/**
 * Cost to activate an ability.
 */
export interface JsonCost {
  type: string;
  amount?: number;
  params?: Record<string, unknown>;
}

/**
 * When an ability triggers.
 */
export type TriggerCondition =
  | "on_summon"
  | "on_destroy"
  | "on_battle"
  | "on_damage"
  | "on_draw"
  | "on_discard"
  | "on_tribute"
  | "on_phase_enter"
  | "on_phase_exit"
  | "on_turn_start"
  | "on_turn_end"
  | "manual"
  | string; // Extensible for custom triggers

/**
 * Target specification for an effect.
 */
export interface EffectTarget {
  who?: "self" | "opponent" | "any" | "both";
  where?: "hand" | "field" | "graveyard" | "deck" | "backrow" | "any";
  count?: number;
  filter?: Record<string, unknown>;
}

/**
 * Condition that must be true for an effect to resolve.
 */
export interface EffectCondition {
  type: string;
  params?: Record<string, unknown>;
}

/**
 * Deck validation rules.
 */
export interface DeckRules {
  /** Minimum cards in deck */
  minCards: number;
  /** Maximum cards in deck */
  maxCards: number;
  /** Max copies of any single card */
  maxCopies: number;
  /** Max copies of legendary/limited cards */
  maxLegendaryCopies?: number;
  /** Custom validation function name (for extension) */
  customValidator?: string;
}
```

**Step 2: Create game.ts**

```typescript
// packages/lunchtable-tcg-types/src/game.ts

import type { BoardCard, BackrowCard, GraveyardCard, HandCard, CardDefinition } from "./card.js";

/**
 * Configuration for a game instance.
 */
export interface GameConfig {
  /** Starting life points per player */
  startingLP: number;
  /** Maximum hand size */
  maxHandSize: number;
  /** Ordered list of phase names per turn */
  phases: string[];
  /** Cards drawn per turn (during draw phase) */
  drawPerTurn: number;
  /** Maximum monsters on field */
  maxFieldSlots?: number;
  /** Maximum spells/traps in backrow */
  maxBackrowSlots?: number;
  /** Turn time limit in seconds (0 = no limit) */
  turnTimeLimit?: number;
  /** Game-specific config extensions */
  metadata?: Record<string, unknown>;
}

/**
 * State of a single player within a game.
 */
export interface PlayerState {
  /** Player identifier (passed from host app) */
  id: string;
  /** ID of the deck being used */
  deckId: string;
  /** Current life points */
  lifePoints: number;
  /** Cards in hand */
  hand: HandCard[];
  /** Monster/creature cards on field */
  field: BoardCard[];
  /** Spell/trap cards in backrow */
  backrow: BackrowCard[];
  /** Cards in graveyard */
  graveyard: GraveyardCard[];
  /** Cards remaining in deck (face-down, order matters) */
  deck: CardDefinition[];
  /** Whether this player has performed a normal summon this turn */
  normalSummonUsed?: boolean;
  /** Game-specific player state extensions */
  metadata?: Record<string, unknown>;
}

/**
 * Complete state of a game.
 */
export interface GameState {
  /** All players in the game */
  players: PlayerState[];
  /** Current phase name */
  currentPhase: string;
  /** Index into players array for whose turn it is */
  currentPlayerIndex: number;
  /** Current turn number (starts at 1) */
  turnNumber: number;
  /** Game status */
  status: GameStatus;
  /** Winner player ID (if game is finished) */
  winner?: string;
  /** Game rules configuration */
  config: GameConfig;
  /** Game-specific state extensions */
  metadata?: Record<string, unknown>;
}

export type GameStatus = "waiting" | "active" | "finished" | "abandoned";

/**
 * A recorded game event.
 */
export interface GameEvent {
  /** Event type identifier */
  type: string;
  /** Player who caused the event (if applicable) */
  playerId?: string;
  /** Event-specific data */
  data: Record<string, unknown>;
  /** When this event occurred */
  timestamp: number;
}

/**
 * Matchmaking queue entry.
 */
export interface QueueEntry {
  playerId: string;
  deckId: string;
  rating: number;
  joinedAt: number;
  mode: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a matchmaking attempt.
 */
export interface MatchResult {
  matched: boolean;
  player1?: QueueEntry;
  player2?: QueueEntry;
  gameId?: string;
}
```

**Step 3: Create effect.ts**

```typescript
// packages/lunchtable-tcg-types/src/effect.ts

/**
 * Types for the effect system extension.
 */

/**
 * An active continuous or lingering effect on the game.
 */
export interface ActiveEffect {
  /** Source card instance ID */
  sourceCardId: string;
  /** Effect type identifier */
  effectType: string;
  /** Affected targets */
  targets: string[];
  /** How long this effect lasts */
  duration: EffectDuration;
  /** Effect-specific data (stat modifiers, etc.) */
  data: Record<string, unknown>;
  /** Extension data */
  metadata?: Record<string, unknown>;
}

export type EffectDuration =
  | "permanent"
  | "until_end_of_turn"
  | "until_end_of_next_turn"
  | `turns:${number}`
  | "until_leaves_field"
  | string;

/**
 * A single link in an effect chain.
 */
export interface ChainLink {
  /** Card activating this link */
  cardId: string;
  /** Effect being activated */
  effectId: string;
  /** Spell speed of this link */
  spellSpeed: number;
  /** Selected targets */
  targets: string[];
  /** Chain link position (1-indexed) */
  chainPosition: number;
}

/**
 * State of the current chain being built/resolved.
 */
export interface ChainState {
  /** Ordered chain links */
  links: ChainLink[];
  /** Whether the chain is currently resolving (LIFO) */
  resolving: boolean;
  /** Which player has priority to respond */
  priorityPlayerId?: string;
}

/**
 * Battle state for the combat extension.
 */
export interface BattleState {
  /** Attacking card instance ID */
  attackerId: string;
  /** Target card ID or "direct" for direct attack */
  targetId: string | "direct";
  /** Current battle sub-phase */
  phase: "declare" | "damage_step" | "damage_calc" | "resolve" | "end";
  /** ATK/DEF modifications applied to this battle */
  modifiers: BattleModifier[];
  /** Extension data */
  metadata?: Record<string, unknown>;
}

export interface BattleModifier {
  source: string;
  stat: "attack" | "defense";
  delta: number;
}

/**
 * Configuration for the combat extension.
 */
export interface CombatConfig {
  /** Damage formula: "standard" (ATK difference), "pokemon" (base damage) */
  damageFormula?: string;
  /** Whether cards have ATK/DEF positions */
  positionSystem?: boolean;
  /** Whether players can attack directly when opponent has no monsters */
  directAttackAllowed?: boolean;
  /** Whether to re-select targets when field changes mid-battle */
  battleReplay?: boolean;
}
```

**Step 4: Create index.ts**

```typescript
// packages/lunchtable-tcg-types/src/index.ts
export * from "./card.js";
export * from "./game.js";
export * from "./effect.js";
```

**Step 5: Build types package**

Run: `cd packages/lunchtable-tcg-types && bun run build`
Expected: Compiles without errors, `dist/` created

**Step 6: Commit**

```bash
git add packages/lunchtable-tcg-types/
git commit -m "feat: implement @lunchtable-tcg/types package with card, game, and effect types"
```

---

## Phase 2: Core Component

### Task 3: Core component config and schema

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/convex.config.ts`
- Create: `packages/lunchtable-tcg-core/src/component/schema.ts`

**Step 1: Create convex.config.ts**

```typescript
// packages/lunchtable-tcg-core/src/component/convex.config.ts
import { defineComponent } from "convex/server";

export default defineComponent("lunchtable-tcg-core");
```

**Step 2: Create schema.ts**

```typescript
// packages/lunchtable-tcg-core/src/component/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  cardDefinitions: defineTable({
    name: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    level: v.optional(v.number()),
    rarity: v.string(),
    stereotype: v.optional(v.string()),
    abilities: v.optional(v.any()),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_name", ["name"])
    .index("by_type", ["cardType"])
    .index("by_rarity", ["rarity"])
    .index("by_stereotype", ["stereotype"]),

  decks: defineTable({
    ownerId: v.string(),
    name: v.string(),
    cards: v.array(v.string()),
    isActive: v.boolean(),
    metadata: v.optional(v.any()),
  }).index("by_owner", ["ownerId"]),

  gameStates: defineTable({
    players: v.array(
      v.object({
        id: v.string(),
        deckId: v.string(),
        lifePoints: v.number(),
        hand: v.array(v.any()),
        field: v.array(v.any()),
        backrow: v.array(v.any()),
        graveyard: v.array(v.any()),
        deck: v.array(v.any()),
        normalSummonUsed: v.optional(v.boolean()),
        metadata: v.optional(v.any()),
      })
    ),
    currentPhase: v.string(),
    currentPlayerIndex: v.number(),
    turnNumber: v.number(),
    status: v.string(),
    winner: v.optional(v.string()),
    config: v.object({
      startingLP: v.number(),
      maxHandSize: v.number(),
      phases: v.array(v.string()),
      drawPerTurn: v.number(),
      maxFieldSlots: v.optional(v.number()),
      maxBackrowSlots: v.optional(v.number()),
      turnTimeLimit: v.optional(v.number()),
      metadata: v.optional(v.any()),
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
  })
    .index("by_mode", ["mode", "joinedAt"])
    .index("by_player", ["playerId"]),

  hooks: defineTable({
    event: v.string(),
    callbackHandle: v.string(),
    filter: v.optional(v.any()),
  }).index("by_event", ["event"]),
});
```

**Step 3: Generate component types**

Run: `cd packages/lunchtable-tcg-core && npx convex codegen --component-dir ./src/component`
Expected: `src/component/_generated/` directory created with `api.ts`, `dataModel.ts`, `server.ts`, `component.ts`

Note: If codegen fails, this is expected — the component needs to be registered in a Convex app to generate. For local dev, we'll create the `_generated` stubs or use the example app approach.

**Step 4: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/
git commit -m "feat: add core component config and schema"
```

---

### Task 4: Core component — Cards public functions

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/cards.ts`
- Reference: `convex/core/cards.ts` (existing card logic)

**Step 1: Create cards.ts with public query/mutation functions**

```typescript
// packages/lunchtable-tcg-core/src/component/cards.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const register = mutation({
  args: {
    name: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    level: v.optional(v.number()),
    rarity: v.string(),
    stereotype: v.optional(v.string()),
    abilities: v.optional(v.any()),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("cardDefinitions", args);
    return id;
  },
});

export const bulkImport = mutation({
  args: {
    cards: v.array(
      v.object({
        name: v.string(),
        cardType: v.string(),
        attack: v.optional(v.number()),
        defense: v.optional(v.number()),
        level: v.optional(v.number()),
        rarity: v.string(),
        stereotype: v.optional(v.string()),
        abilities: v.optional(v.any()),
        description: v.string(),
        imageUrl: v.optional(v.string()),
        metadata: v.optional(v.any()),
      })
    ),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const card of args.cards) {
      const id = await ctx.db.insert("cardDefinitions", card);
      ids.push(id);
    }
    return ids;
  },
});

export const getAll = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    return await ctx.db.query("cardDefinitions").collect();
  },
});

export const getById = query({
  args: { id: v.id("cardDefinitions") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByName = query({
  args: { name: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardDefinitions")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const getByType = query({
  args: { cardType: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cardDefinitions")
      .withIndex("by_type", (q) => q.eq("cardType", args.cardType))
      .collect();
  },
});

export const update = mutation({
  args: {
    id: v.id("cardDefinitions"),
    updates: v.object({
      name: v.optional(v.string()),
      cardType: v.optional(v.string()),
      attack: v.optional(v.number()),
      defense: v.optional(v.number()),
      level: v.optional(v.number()),
      rarity: v.optional(v.string()),
      stereotype: v.optional(v.string()),
      abilities: v.optional(v.any()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error(`Card ${args.id} not found`);
    await ctx.db.patch(args.id, args.updates);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("cardDefinitions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/cards.ts
git commit -m "feat: add core component card CRUD functions"
```

---

### Task 5: Core component — Decks public functions

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/decks.ts`
- Reference: `convex/core/decks.ts` (existing deck logic)

**Step 1: Create decks.ts**

```typescript
// packages/lunchtable-tcg-core/src/component/decks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    ownerId: v.string(),
    name: v.string(),
    cards: v.array(v.string()),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("decks", {
      ownerId: args.ownerId,
      name: args.name,
      cards: args.cards,
      isActive: false,
      metadata: args.metadata,
    });
    return id;
  },
});

export const getForPlayer = query({
  args: { ownerId: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("decks") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
    name: v.optional(v.string()),
    cards: v.optional(v.array(v.string())),
    metadata: v.optional(v.any()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) throw new Error(`Deck ${args.id} not found`);
    if (deck.ownerId !== args.ownerId) throw new Error("Not authorized");
    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.cards !== undefined) updates.cards = args.cards;
    if (args.metadata !== undefined) updates.metadata = args.metadata;
    await ctx.db.patch(args.id, updates);
    return null;
  },
});

export const remove = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) throw new Error(`Deck ${args.id} not found`);
    if (deck.ownerId !== args.ownerId) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
    return null;
  },
});

export const setActive = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) throw new Error(`Deck ${args.id} not found`);
    if (deck.ownerId !== args.ownerId) throw new Error("Not authorized");
    // Deactivate all other decks for this player
    const allDecks = await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    for (const d of allDecks) {
      if (d.isActive) {
        await ctx.db.patch(d._id, { isActive: false });
      }
    }
    await ctx.db.patch(args.id, { isActive: true });
    return null;
  },
});

export const validate = query({
  args: {
    id: v.id("decks"),
    rules: v.object({
      minCards: v.number(),
      maxCards: v.number(),
      maxCopies: v.number(),
      maxLegendaryCopies: v.optional(v.number()),
    }),
  },
  returns: v.object({
    valid: v.boolean(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) return { valid: false, errors: ["Deck not found"] };

    const errors: string[] = [];
    const cardCount = deck.cards.length;

    if (cardCount < args.rules.minCards) {
      errors.push(`Deck has ${cardCount} cards, minimum is ${args.rules.minCards}`);
    }
    if (cardCount > args.rules.maxCards) {
      errors.push(`Deck has ${cardCount} cards, maximum is ${args.rules.maxCards}`);
    }

    // Count copies of each card
    const counts = new Map<string, number>();
    for (const cardId of deck.cards) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }

    // Check max copies
    for (const [cardId, count] of counts) {
      if (count > args.rules.maxCopies) {
        errors.push(`Card ${cardId} has ${count} copies, maximum is ${args.rules.maxCopies}`);
      }
      // Check legendary copy limit if provided
      if (args.rules.maxLegendaryCopies !== undefined) {
        const card = await ctx.db.get(cardId as any);
        if (card && card.rarity === "legendary" && count > args.rules.maxLegendaryCopies) {
          errors.push(
            `Legendary card ${card.name} has ${count} copies, maximum is ${args.rules.maxLegendaryCopies}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },
});

export const duplicate = mutation({
  args: {
    id: v.id("decks"),
    ownerId: v.string(),
    newName: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const deck = await ctx.db.get(args.id);
    if (!deck) throw new Error(`Deck ${args.id} not found`);
    if (deck.ownerId !== args.ownerId) throw new Error("Not authorized");
    const newId = await ctx.db.insert("decks", {
      ownerId: args.ownerId,
      name: args.newName,
      cards: deck.cards,
      isActive: false,
      metadata: deck.metadata,
    });
    return newId;
  },
});
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/decks.ts
git commit -m "feat: add core component deck management functions"
```

---

### Task 6: Core component — Game lifecycle and phases

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/game.ts`
- Reference: `convex/gameplay/games/lifecycle.ts`, `convex/gameplay/phaseManager.ts`

**Step 1: Create game.ts**

This is the largest component file. Contains game creation, state queries, phase management, turn management, LP modification, and draw logic.

```typescript
// packages/lunchtable-tcg-core/src/component/game.ts
import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// === Game Lifecycle ===

export const create = mutation({
  args: {
    players: v.array(
      v.object({
        id: v.string(),
        deckId: v.string(),
      })
    ),
    config: v.object({
      startingLP: v.number(),
      maxHandSize: v.number(),
      phases: v.array(v.string()),
      drawPerTurn: v.number(),
      maxFieldSlots: v.optional(v.number()),
      maxBackrowSlots: v.optional(v.number()),
      turnTimeLimit: v.optional(v.number()),
      metadata: v.optional(v.any()),
    }),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Build initial player states
    const players = [];
    for (const p of args.players) {
      // Load deck cards
      const deck = await ctx.db.get(p.deckId as any);
      const deckCards = [];
      if (deck) {
        for (const cardId of deck.cards) {
          const card = await ctx.db.get(cardId as any);
          if (card) {
            deckCards.push({
              ...card,
              instanceId: `${card._id}_${Math.random().toString(36).slice(2, 9)}`,
            });
          }
        }
      }
      // Shuffle the deck
      for (let i = deckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckCards[i], deckCards[j]] = [deckCards[j], deckCards[i]];
      }

      players.push({
        id: p.id,
        deckId: p.deckId,
        lifePoints: args.config.startingLP,
        hand: [] as any[],
        field: [] as any[],
        backrow: [] as any[],
        graveyard: [] as any[],
        deck: deckCards,
        normalSummonUsed: false,
      });
    }

    const gameId = await ctx.db.insert("gameStates", {
      players,
      currentPhase: args.config.phases[0],
      currentPlayerIndex: 0,
      turnNumber: 1,
      status: "active",
      config: args.config,
      metadata: args.metadata,
    });

    // Log game creation event
    await ctx.db.insert("gameEvents", {
      gameId,
      type: "game_created",
      data: { playerIds: args.players.map((p) => p.id) },
      timestamp: Date.now(),
    });

    return gameId;
  },
});

export const getState = query({
  args: { gameId: v.id("gameStates") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const getStateForPlayer = query({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) return null;

    // Hide opponent's hand and deck contents
    const players = game.players.map((p: any) => {
      if (p.id === args.playerId) return p;
      return {
        ...p,
        hand: p.hand.map(() => ({ hidden: true })),
        deck: { count: p.deck.length },
      };
    });

    return { ...game, players };
  },
});

// === Phase Management ===

export const advancePhase = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
  },
  returns: v.object({
    newPhase: v.string(),
    turnEnded: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "active") throw new Error("Game is not active");

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== args.playerId) throw new Error("Not your turn");

    const phases = game.config.phases;
    const currentIdx = phases.indexOf(game.currentPhase);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= phases.length) {
      // End of turn — wrap to next player
      const nextPlayerIndex =
        (game.currentPlayerIndex + 1) % game.players.length;

      await ctx.db.patch(args.gameId, {
        currentPhase: phases[0],
        currentPlayerIndex: nextPlayerIndex,
        turnNumber: game.turnNumber + 1,
      });

      await ctx.db.insert("gameEvents", {
        gameId: args.gameId,
        type: "turn_ended",
        playerId: args.playerId,
        data: { turnNumber: game.turnNumber },
        timestamp: Date.now(),
      });

      return { newPhase: phases[0], turnEnded: true };
    }

    const newPhase = phases[nextIdx];
    await ctx.db.patch(args.gameId, { currentPhase: newPhase });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "phase_changed",
      playerId: args.playerId,
      data: { from: game.currentPhase, to: newPhase },
      timestamp: Date.now(),
    });

    return { newPhase, turnEnded: false };
  },
});

// === Card Operations ===

export const drawCards = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    count: v.number(),
  },
  returns: v.object({
    drawn: v.number(),
    deckEmpty: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const playerIdx = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIdx === -1) throw new Error("Player not in game");

    const player = game.players[playerIdx];
    const toDraw = Math.min(args.count, player.deck.length);
    const drawn = player.deck.slice(0, toDraw);
    const remaining = player.deck.slice(toDraw);

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIdx] = {
      ...player,
      hand: [...player.hand, ...drawn],
      deck: remaining,
    };

    await ctx.db.patch(args.gameId, { players: updatedPlayers });

    for (const card of drawn) {
      await ctx.db.insert("gameEvents", {
        gameId: args.gameId,
        type: "card_drawn",
        playerId: args.playerId,
        data: { cardName: card.name, instanceId: card.instanceId },
        timestamp: Date.now(),
      });
    }

    return { drawn: toDraw, deckEmpty: remaining.length === 0 };
  },
});

export const modifyLP = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    delta: v.number(),
  },
  returns: v.object({
    newLP: v.number(),
    defeated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const playerIdx = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIdx === -1) throw new Error("Player not in game");

    const player = game.players[playerIdx];
    const newLP = Math.max(0, player.lifePoints + args.delta);
    const defeated = newLP === 0;

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIdx] = { ...player, lifePoints: newLP };

    const updates: Record<string, unknown> = { players: updatedPlayers };
    if (defeated) {
      // Find the other player as winner
      const winner = game.players.find((p: any) => p.id !== args.playerId);
      updates.status = "finished";
      updates.winner = winner?.id;
    }

    await ctx.db.patch(args.gameId, updates);

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: args.delta < 0 ? "damage_dealt" : "lp_gained",
      playerId: args.playerId,
      data: { delta: args.delta, newLP, defeated },
      timestamp: Date.now(),
    });

    return { newLP, defeated };
  },
});

export const moveCard = mutation({
  args: {
    gameId: v.id("gameStates"),
    playerId: v.string(),
    instanceId: v.string(),
    from: v.string(),
    to: v.string(),
    position: v.optional(v.string()),
    isFaceDown: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const playerIdx = game.players.findIndex(
      (p: any) => p.id === args.playerId
    );
    if (playerIdx === -1) throw new Error("Player not in game");

    const player = { ...game.players[playerIdx] };
    const fromZone = player[args.from as keyof typeof player] as any[];
    const cardIdx = fromZone.findIndex(
      (c: any) => c.instanceId === args.instanceId
    );
    if (cardIdx === -1)
      throw new Error(`Card ${args.instanceId} not in ${args.from}`);

    const card = fromZone[cardIdx];
    const updatedFrom = [...fromZone];
    updatedFrom.splice(cardIdx, 1);

    const toZone = player[args.to as keyof typeof player] as any[];
    const movedCard = {
      ...card,
      ...(args.position !== undefined ? { position: args.position } : {}),
      ...(args.isFaceDown !== undefined ? { isFaceDown: args.isFaceDown } : {}),
    };
    const updatedTo = [...toZone, movedCard];

    (player as any)[args.from] = updatedFrom;
    (player as any)[args.to] = updatedTo;

    const updatedPlayers = [...game.players];
    updatedPlayers[playerIdx] = player;
    await ctx.db.patch(args.gameId, { players: updatedPlayers });

    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "card_moved",
      playerId: args.playerId,
      data: {
        instanceId: args.instanceId,
        cardName: card.name,
        from: args.from,
        to: args.to,
      },
      timestamp: Date.now(),
    });

    return null;
  },
});

export const endGame = mutation({
  args: {
    gameId: v.id("gameStates"),
    winnerId: v.optional(v.string()),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      status: "finished",
      winner: args.winnerId,
    });
    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: "game_ended",
      data: { winnerId: args.winnerId, reason: args.reason },
      timestamp: Date.now(),
    });
    return null;
  },
});

// === Events ===

export const logEvent = mutation({
  args: {
    gameId: v.id("gameStates"),
    type: v.string(),
    playerId: v.optional(v.string()),
    data: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("gameEvents", {
      gameId: args.gameId,
      type: args.type,
      playerId: args.playerId,
      data: args.data,
      timestamp: Date.now(),
    });
    return null;
  },
});

export const getEvents = query({
  args: { gameId: v.id("gameStates") },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("gameEvents")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
  },
});
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/game.ts
git commit -m "feat: add core component game lifecycle, phases, cards, LP, and events"
```

---

### Task 7: Core component — Matchmaking

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/matchmaking.ts`
- Reference: `convex/social/matchmaking.ts`

**Step 1: Create matchmaking.ts**

```typescript
// packages/lunchtable-tcg-core/src/component/matchmaking.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const joinQueue = mutation({
  args: {
    playerId: v.string(),
    deckId: v.string(),
    rating: v.number(),
    mode: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check if already in queue
    const existing = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();
    if (existing) throw new Error("Already in queue");

    const id = await ctx.db.insert("matchmakingQueue", {
      playerId: args.playerId,
      deckId: args.deckId,
      rating: args.rating,
      joinedAt: Date.now(),
      mode: args.mode,
      metadata: args.metadata,
    });
    return id;
  },
});

export const leaveQueue = mutation({
  args: { playerId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();
    if (entry) await ctx.db.delete(entry._id);
    return null;
  },
});

export const findMatch = mutation({
  args: {
    mode: v.string(),
    ratingRange: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const queue = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();

    if (queue.length < 2) return { matched: false };

    // Sort by join time (FIFO)
    queue.sort((a, b) => a.joinedAt - b.joinedAt);

    // Try to match players within rating range
    for (let i = 0; i < queue.length; i++) {
      for (let j = i + 1; j < queue.length; j++) {
        const ratingDiff = Math.abs(queue[i].rating - queue[j].rating);
        if (ratingDiff <= args.ratingRange) {
          // Remove both from queue
          await ctx.db.delete(queue[i]._id);
          await ctx.db.delete(queue[j]._id);
          return {
            matched: true,
            player1: {
              playerId: queue[i].playerId,
              deckId: queue[i].deckId,
              rating: queue[i].rating,
            },
            player2: {
              playerId: queue[j].playerId,
              deckId: queue[j].deckId,
              rating: queue[j].rating,
            },
          };
        }
      }
    }

    return { matched: false };
  },
});

export const getQueueStatus = query({
  args: { mode: v.string() },
  returns: v.object({
    count: v.number(),
    oldestWaitMs: v.number(),
  }),
  handler: async (ctx, args) => {
    const queue = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();
    const now = Date.now();
    const oldest =
      queue.length > 0
        ? now - Math.min(...queue.map((e) => e.joinedAt))
        : 0;
    return { count: queue.length, oldestWaitMs: oldest };
  },
});

export const getPlayerQueueEntry = query({
  args: { playerId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .first();
  },
});
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/matchmaking.ts
git commit -m "feat: add core component matchmaking with rating-based pairing"
```

---

### Task 8: Core component — Hooks system

**Files:**
- Create: `packages/lunchtable-tcg-core/src/component/hooks.ts`

**Step 1: Create hooks.ts**

```typescript
// packages/lunchtable-tcg-core/src/component/hooks.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const register = mutation({
  args: {
    event: v.string(),
    callbackHandle: v.string(),
    filter: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("hooks", {
      event: args.event,
      callbackHandle: args.callbackHandle,
      filter: args.filter,
    });
    return id;
  },
});

export const unregister = mutation({
  args: { id: v.id("hooks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getForEvent = query({
  args: { event: v.string() },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hooks")
      .withIndex("by_event", (q) => q.eq("event", args.event))
      .collect();
  },
});

export const clearAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const all = await ctx.db.query("hooks").collect();
    for (const hook of all) {
      await ctx.db.delete(hook._id);
    }
    return null;
  },
});
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/component/hooks.ts
git commit -m "feat: add core component hook registration system for extensions"
```

---

### Task 9: Core component — Client class

**Files:**
- Create: `packages/lunchtable-tcg-core/src/client/index.ts`

**Step 1: Create the client class**

Follow the pattern from `@convex-dev/sharded-counter/src/client/index.ts`:

```typescript
// packages/lunchtable-tcg-core/src/client/index.ts
import type {
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};
type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

/**
 * LTCGCore — Main client for the @lunchtable-tcg/core Convex component.
 *
 * Usage:
 * ```ts
 * import { LTCGCore } from "@lunchtable-tcg/core";
 * const ltcg = new LTCGCore(components.ltcgCore);
 * ```
 */
export class LTCGCore {
  public cards: CardsClient;
  public decks: DecksClient;
  public game: GameClient;
  public matchmaking: MatchmakingClient;
  public events: EventsClient;
  public hooks: HooksClient;

  constructor(private component: ComponentApi) {
    this.cards = new CardsClient(component);
    this.decks = new DecksClient(component);
    this.game = new GameClient(component);
    this.matchmaking = new MatchmakingClient(component);
    this.events = new EventsClient(component);
    this.hooks = new HooksClient(component);
  }
}

class CardsClient {
  constructor(private component: ComponentApi) {}

  async register(ctx: RunMutationCtx, args: {
    name: string;
    cardType: string;
    attack?: number;
    defense?: number;
    level?: number;
    rarity: string;
    stereotype?: string;
    abilities?: any;
    description: string;
    imageUrl?: string;
    metadata?: any;
  }) {
    return ctx.runMutation(this.component.cards.register, args);
  }

  async bulkImport(ctx: RunMutationCtx, cards: Array<{
    name: string;
    cardType: string;
    attack?: number;
    defense?: number;
    level?: number;
    rarity: string;
    stereotype?: string;
    abilities?: any;
    description: string;
    imageUrl?: string;
    metadata?: any;
  }>) {
    return ctx.runMutation(this.component.cards.bulkImport, { cards });
  }

  async getAll(ctx: RunQueryCtx) {
    return ctx.runQuery(this.component.cards.getAll, {});
  }

  async getById(ctx: RunQueryCtx, id: string) {
    return ctx.runQuery(this.component.cards.getById, { id } as any);
  }

  async getByName(ctx: RunQueryCtx, name: string) {
    return ctx.runQuery(this.component.cards.getByName, { name });
  }

  async getByType(ctx: RunQueryCtx, cardType: string) {
    return ctx.runQuery(this.component.cards.getByType, { cardType });
  }

  async update(ctx: RunMutationCtx, id: string, updates: Record<string, unknown>) {
    return ctx.runMutation(this.component.cards.update, { id, updates } as any);
  }

  async remove(ctx: RunMutationCtx, id: string) {
    return ctx.runMutation(this.component.cards.remove, { id } as any);
  }
}

class DecksClient {
  constructor(private component: ComponentApi) {}

  async create(ctx: RunMutationCtx, args: {
    ownerId: string;
    name: string;
    cards: string[];
    metadata?: any;
  }) {
    return ctx.runMutation(this.component.decks.create, args);
  }

  async getForPlayer(ctx: RunQueryCtx, ownerId: string) {
    return ctx.runQuery(this.component.decks.getForPlayer, { ownerId });
  }

  async getById(ctx: RunQueryCtx, id: string) {
    return ctx.runQuery(this.component.decks.getById, { id } as any);
  }

  async update(ctx: RunMutationCtx, args: {
    id: string;
    ownerId: string;
    name?: string;
    cards?: string[];
    metadata?: any;
  }) {
    return ctx.runMutation(this.component.decks.update, args as any);
  }

  async remove(ctx: RunMutationCtx, id: string, ownerId: string) {
    return ctx.runMutation(this.component.decks.remove, { id, ownerId } as any);
  }

  async setActive(ctx: RunMutationCtx, id: string, ownerId: string) {
    return ctx.runMutation(this.component.decks.setActive, { id, ownerId } as any);
  }

  async validate(ctx: RunQueryCtx, id: string, rules: {
    minCards: number;
    maxCards: number;
    maxCopies: number;
    maxLegendaryCopies?: number;
  }) {
    return ctx.runQuery(this.component.decks.validate, { id, rules } as any);
  }

  async duplicate(ctx: RunMutationCtx, id: string, ownerId: string, newName: string) {
    return ctx.runMutation(this.component.decks.duplicate, { id, ownerId, newName } as any);
  }
}

class GameClient {
  constructor(private component: ComponentApi) {}

  async create(ctx: RunMutationCtx, args: {
    players: Array<{ id: string; deckId: string }>;
    config: {
      startingLP: number;
      maxHandSize: number;
      phases: string[];
      drawPerTurn: number;
      maxFieldSlots?: number;
      maxBackrowSlots?: number;
      turnTimeLimit?: number;
      metadata?: any;
    };
    metadata?: any;
  }) {
    return ctx.runMutation(this.component.game.create, args);
  }

  async getState(ctx: RunQueryCtx, gameId: string) {
    return ctx.runQuery(this.component.game.getState, { gameId } as any);
  }

  async getStateForPlayer(ctx: RunQueryCtx, gameId: string, playerId: string) {
    return ctx.runQuery(this.component.game.getStateForPlayer, { gameId, playerId } as any);
  }

  async advancePhase(ctx: RunMutationCtx, gameId: string, playerId: string) {
    return ctx.runMutation(this.component.game.advancePhase, { gameId, playerId } as any);
  }

  async drawCards(ctx: RunMutationCtx, gameId: string, playerId: string, count: number) {
    return ctx.runMutation(this.component.game.drawCards, { gameId, playerId, count } as any);
  }

  async modifyLP(ctx: RunMutationCtx, gameId: string, playerId: string, delta: number) {
    return ctx.runMutation(this.component.game.modifyLP, { gameId, playerId, delta } as any);
  }

  async moveCard(ctx: RunMutationCtx, args: {
    gameId: string;
    playerId: string;
    instanceId: string;
    from: string;
    to: string;
    position?: string;
    isFaceDown?: boolean;
  }) {
    return ctx.runMutation(this.component.game.moveCard, args as any);
  }

  async endGame(ctx: RunMutationCtx, gameId: string, winnerId: string | undefined, reason: string) {
    return ctx.runMutation(this.component.game.endGame, { gameId, winnerId, reason } as any);
  }
}

class MatchmakingClient {
  constructor(private component: ComponentApi) {}

  async joinQueue(ctx: RunMutationCtx, args: {
    playerId: string;
    deckId: string;
    rating: number;
    mode: string;
    metadata?: any;
  }) {
    return ctx.runMutation(this.component.matchmaking.joinQueue, args);
  }

  async leaveQueue(ctx: RunMutationCtx, playerId: string) {
    return ctx.runMutation(this.component.matchmaking.leaveQueue, { playerId });
  }

  async findMatch(ctx: RunMutationCtx, mode: string, ratingRange: number) {
    return ctx.runMutation(this.component.matchmaking.findMatch, { mode, ratingRange });
  }

  async getQueueStatus(ctx: RunQueryCtx, mode: string) {
    return ctx.runQuery(this.component.matchmaking.getQueueStatus, { mode });
  }

  async getPlayerQueueEntry(ctx: RunQueryCtx, playerId: string) {
    return ctx.runQuery(this.component.matchmaking.getPlayerQueueEntry, { playerId });
  }
}

class EventsClient {
  constructor(private component: ComponentApi) {}

  async log(ctx: RunMutationCtx, args: {
    gameId: string;
    type: string;
    playerId?: string;
    data: any;
  }) {
    return ctx.runMutation(this.component.game.logEvent, args as any);
  }

  async getForGame(ctx: RunQueryCtx, gameId: string) {
    return ctx.runQuery(this.component.game.getEvents, { gameId } as any);
  }
}

class HooksClient {
  constructor(private component: ComponentApi) {}

  async register(ctx: RunMutationCtx, event: string, callbackHandle: string, filter?: any) {
    return ctx.runMutation(this.component.hooks.register, { event, callbackHandle, filter });
  }

  async unregister(ctx: RunMutationCtx, id: string) {
    return ctx.runMutation(this.component.hooks.unregister, { id } as any);
  }

  async getForEvent(ctx: RunQueryCtx, event: string) {
    return ctx.runQuery(this.component.hooks.getForEvent, { event });
  }

  async clearAll(ctx: RunMutationCtx) {
    return ctx.runMutation(this.component.hooks.clearAll, {});
  }

  // Convenience methods for common hook events
  async onPhaseEnter(ctx: RunMutationCtx, callbackHandle: string, phase?: string) {
    return this.register(ctx, "phase_enter", callbackHandle, phase ? { phase } : undefined);
  }

  async onTurnEnd(ctx: RunMutationCtx, callbackHandle: string) {
    return this.register(ctx, "turn_end", callbackHandle);
  }

  async onCardPlayed(ctx: RunMutationCtx, callbackHandle: string) {
    return this.register(ctx, "card_played", callbackHandle);
  }

  async onBattleResolved(ctx: RunMutationCtx, callbackHandle: string) {
    return this.register(ctx, "battle_resolved", callbackHandle);
  }

  async onGameEnd(ctx: RunMutationCtx, callbackHandle: string) {
    return this.register(ctx, "game_end", callbackHandle);
  }
}

// Re-export types for consumer convenience
export type { ComponentApi };
```

**Step 2: Commit**

```bash
git add packages/lunchtable-tcg-core/src/client/
git commit -m "feat: add LTCGCore client class with cards, decks, game, matchmaking, events, hooks"
```

---

### Task 10: Run codegen and verify build

**Step 1: Attempt component codegen**

Run: `cd packages/lunchtable-tcg-core && npx convex codegen --component-dir ./src/component`

If this fails (likely — component codegen requires a registered app), we need to create stub `_generated` files. Check the `@convex-dev/sharded-counter/src/component/_generated/` directory for the pattern.

**Step 2: Build types package**

Run: `cd packages/lunchtable-tcg-types && bun run build`
Expected: Clean compile

**Step 3: Build core package**

Run: `cd packages/lunchtable-tcg-core && bun run build`
Expected: May fail on `_generated` imports — this is OK, we'll fix by creating stubs or by integrating with the example app

**Step 4: Fix any build issues**

If `_generated` files are missing, copy the stub pattern from sharded-counter:
- `src/component/_generated/api.ts` — generated API reference
- `src/component/_generated/server.ts` — re-exports mutation/query/action
- `src/component/_generated/dataModel.ts` — data model type
- `src/component/_generated/component.ts` — ComponentApi type

**Step 5: Commit**

```bash
git add packages/lunchtable-tcg-core/ packages/lunchtable-tcg-types/
git commit -m "chore: add generated stubs and verify build"
```

---

## Phase 3: Combat Extension (Future)

> Tasks 11-14 will implement `@lunchtable-tcg/combat`. Same pattern:
> component config → schema → public functions (combat.ts, positions.ts, replay.ts) → client class.
> Reference: `convex/gameplay/combatSystem.ts`, `convex/gameplay/replaySystem.ts`, `convex/gameplay/gameEngine/positions.ts`

---

## Phase 4: Effects Extension (Future)

> Tasks 15-19 will implement `@lunchtable-tcg/effects`. Same pattern:
> component config → schema → public functions (executor.ts, chains.ts, triggers.ts, costs.ts, continuous.ts, effectLibrary.ts) → client class.
> Reference: `convex/gameplay/effectSystem/executor.ts`, `convex/gameplay/chainResolver.ts`, `convex/gameplay/triggerSystem.ts`, etc.

---

## Phase 5: Integration & Testing (Future)

> Tasks 20-23: Wire LTCG to use the components, write tests with `convex-test`, create example app, publish to npm.

---

## Key References

| What | Where |
|------|-------|
| Design doc | `docs/plans/2026-02-13-convex-components-design.md` |
| Existing card logic | `convex/core/cards.ts`, `packages/core/src/types/game.ts` |
| Existing deck logic | `convex/core/decks.ts` |
| Existing game logic | `convex/gameplay/` (all subdirectories) |
| Existing schema | `convex/schema.ts` |
| Reference component | `node_modules/@convex-dev/sharded-counter/` |
| Convex component docs | https://docs.convex.dev/components |
| Convex authoring docs | https://docs.convex.dev/components/authoring |

## Skills to reference during implementation

- `@convex-functions` — for query/mutation/action patterns
- `@convex-best-practices` — for Convex coding standards
- `@vitest` — for testing with convex-test
- `@turborepo` — for monorepo workspace management
