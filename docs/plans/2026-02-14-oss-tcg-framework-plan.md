# OSS White-Label TCG Framework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the game engine into a pure TypeScript package and create a config package, forming the foundation for the white-label TCG framework.

**Architecture:** Three-layer split — pure engine SDK (zero deps), Convex backend components (configurable), AI agent plugins (ElizaOS + MCP). This plan covers the engine and config layers (Phase 1). Subsequent phases will be planned separately.

**Tech Stack:** TypeScript 5.7+, Bun workspaces, Turbo, Vitest, Convex

**Design Doc:** `docs/plans/2026-02-14-oss-tcg-framework-design.md`
**Prior Art:** `docs/plans/2026-02-14-event-sourced-match-engine-design.md`

---

## Phase 1A: `@lunchtable-tcg/engine` — Pure TypeScript Game Engine

### Task 1: Scaffold the engine package

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/tsconfig.build.json`
- Create: `packages/engine/src/index.ts`

**Step 1: Create package directory and package.json**

```json
{
  "name": "@lunchtable-tcg/engine",
  "version": "0.1.0",
  "description": "Pure TypeScript trading card game engine — zero dependencies, runs anywhere",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/types/index.js"
    },
    "./rules": {
      "types": "./dist/rules/index.d.ts",
      "import": "./dist/rules/index.js"
    }
  },
  "scripts": {
    "build": "tsc --project tsconfig.build.json",
    "dev": "tsc --project tsconfig.build.json --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^3.0.0"
  },
  "files": ["dist", "src"],
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js",
  "keywords": ["tcg", "card-game", "game-engine", "typescript", "ai-agents"],
  "license": "MIT"
}
```

Note: **Zero runtime dependencies.** Only devDependencies for build/test.

**Step 2: Create tsconfig files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

`tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/__tests__/**"]
}
```

**Step 3: Create barrel export**

`src/index.ts`:
```typescript
export * from "./types/index.js";
export * from "./engine.js";
export { defineCards } from "./cards.js";
```

**Step 4: Register in workspace**

Add to root `package.json` dependencies:
```json
"@lunchtable-tcg/engine": "workspace:*"
```

Run: `bun install`

**Step 5: Verify build scaffolding**

Run: `cd packages/engine && bun run build`
Expected: Compiles (may have errors from missing source files — that's fine, they're created next)

**Step 6: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): scaffold @lunchtable-tcg/engine package"
```

---

### Task 2: Define core types

**Files:**
- Create: `packages/engine/src/types/index.ts`
- Create: `packages/engine/src/types/state.ts`
- Create: `packages/engine/src/types/commands.ts`
- Create: `packages/engine/src/types/events.ts`
- Create: `packages/engine/src/types/cards.ts`
- Create: `packages/engine/src/types/config.ts`

**Context:** These types are extracted from two sources:
1. `packages/lunchtable-tcg-game/src/component/schema.ts` — game state shape (validators → TS interfaces)
2. `packages/core/src/types/` — card types, game config constants
3. `convex/gameplay/gameEngine/` — command/event patterns implicit in mutation signatures

**Step 1: Write type tests**

Create `packages/engine/src/types/__tests__/types.test.ts`:
```typescript
import { describe, it, expectTypeOf } from "vitest";
import type {
  GameState,
  Seat,
  Phase,
  Command,
  EngineEvent,
  CardDefinition,
  EngineConfig,
  BoardCard,
  SpellTrapCard,
} from "../index.js";

describe("Type definitions", () => {
  it("GameState has required fields", () => {
    expectTypeOf<GameState>().toHaveProperty("hostId");
    expectTypeOf<GameState>().toHaveProperty("currentPhase");
    expectTypeOf<GameState>().toHaveProperty("hostLifePoints");
    expectTypeOf<GameState>().toHaveProperty("hostHand");
    expectTypeOf<GameState>().toHaveProperty("hostBoard");
    expectTypeOf<GameState>().toHaveProperty("turnNumber");
  });

  it("Seat is host or away", () => {
    expectTypeOf<Seat>().toEqualTypeOf<"host" | "away">();
  });

  it("Phase covers all game phases", () => {
    expectTypeOf<Phase>().toEqualTypeOf<
      "draw" | "standby" | "main" | "combat" | "main2" | "breakdown_check" | "end"
    >();
  });

  it("Command is a discriminated union", () => {
    const summon: Command = {
      type: "SUMMON",
      cardId: "card-1",
      position: "attack",
    };
    expectTypeOf(summon).toMatchTypeOf<Command>();
  });

  it("EngineEvent is a discriminated union", () => {
    const drawn: EngineEvent = {
      type: "CARD_DRAWN",
      seat: "host",
      cardId: "card-1",
    };
    expectTypeOf(drawn).toMatchTypeOf<EngineEvent>();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && bun run test`
Expected: FAIL — types don't exist yet

**Step 3: Implement types**

Source from: `packages/lunchtable-tcg-game/src/component/schema.ts` (game state validators),
`packages/core/src/types/` (card types), `convex/gameplay/gameEngine/` (commands/events).

`src/types/config.ts` — Engine configuration:
```typescript
export interface EngineConfig {
  startingLP: number;
  deckSize: { min: number; max: number };
  maxHandSize: number;
  maxBoardSlots: number;
  maxSpellTrapSlots: number;
  startingHandSize: number;
  breakdownThreshold: number;
  maxBreakdownsToWin: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  startingLP: 8000,
  deckSize: { min: 40, max: 60 },
  maxHandSize: 7,
  maxBoardSlots: 3,
  maxSpellTrapSlots: 3,
  startingHandSize: 5,
  breakdownThreshold: 3,
  maxBreakdownsToWin: 3,
};
```

`src/types/cards.ts` — Card definitions:
```typescript
export type CardType = "stereotype" | "spell" | "trap";
export type Attribute = "fire" | "water" | "earth" | "wind" | "dark" | "light" | "neutral";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type SpellType = "normal" | "continuous" | "equip" | "field" | "quick-play" | "ritual";
export type TrapType = "normal" | "continuous" | "counter";

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  description: string;
  rarity: Rarity;
  // Stereotype-specific
  attack?: number;
  defense?: number;
  level?: number;
  attribute?: Attribute;
  archetype?: string;
  // Spell/Trap-specific
  spellType?: SpellType;
  trapType?: TrapType;
  // Effects
  effects?: EffectDefinition[];
}

export interface EffectDefinition {
  id: string;
  type: "ignition" | "trigger" | "quick" | "continuous" | "flip" | "on_summon";
  description: string;
  cost?: CostDefinition;
  targetCount?: number;
  targetFilter?: TargetFilter;
  actions: EffectAction[];
  oncePerturn?: boolean;
  hardOncePerturn?: boolean;
}

export interface CostDefinition {
  type: "tribute" | "discard" | "pay_lp" | "remove_vice" | "banish";
  count?: number;
  amount?: number;
}

export interface TargetFilter {
  zone?: "board" | "hand" | "graveyard" | "banished" | "deck";
  owner?: "self" | "opponent" | "any";
  cardType?: CardType;
  attribute?: Attribute;
}

export type EffectAction =
  | { type: "destroy"; target: "selected" | "all_opponent_monsters" | "all_spells_traps" }
  | { type: "damage"; amount: number; target: "opponent" }
  | { type: "heal"; amount: number; target: "self" }
  | { type: "draw"; count: number }
  | { type: "discard"; count: number; target: "opponent" }
  | { type: "boost_attack"; amount: number; duration: "turn" | "permanent" }
  | { type: "boost_defense"; amount: number; duration: "turn" | "permanent" }
  | { type: "add_vice"; count: number; target: "selected" }
  | { type: "remove_vice"; count: number; target: "selected" }
  | { type: "special_summon"; from: "hand" | "graveyard" | "deck" | "banished" }
  | { type: "banish"; target: "selected" }
  | { type: "return_to_hand"; target: "selected" }
  | { type: "negate"; target: "last_chain_link" }
  | { type: "change_position"; target: "selected" };
```

`src/types/state.ts` — Game state (extracted from schema.ts validators):
```typescript
import type { CardDefinition } from "./cards.js";
import type { EngineConfig } from "./config.js";

export type Seat = "host" | "away";
export type Phase = "draw" | "standby" | "main" | "combat" | "main2" | "breakdown_check" | "end";
export type Position = "attack" | "defense";
export type WinReason = "lp_zero" | "deck_out" | "breakdown" | "surrender";

export interface BoardCard {
  cardId: string;
  definitionId: string;
  position: Position;
  faceDown: boolean;
  canAttack: boolean;
  hasAttackedThisTurn: boolean;
  changedPositionThisTurn: boolean;
  viceCounters: number;
  temporaryBoosts: { attack: number; defense: number };
  equippedCards: string[];
  turnSummoned: number;
}

export interface SpellTrapCard {
  cardId: string;
  definitionId: string;
  faceDown: boolean;
  activated: boolean;
  isFieldSpell?: boolean;
}

export interface ChainLink {
  cardId: string;
  effectIndex: number;
  activatingPlayer: Seat;
  targets: string[];
}

export interface PendingAction {
  type: string;
  playerId: string;
  data: Record<string, unknown>;
}

export interface TemporaryModifier {
  cardId: string;
  field: "attack" | "defense";
  amount: number;
  expiresAt: "end_of_turn" | "end_of_next_turn" | "permanent";
  source: string;
}

export interface LingeringEffect {
  sourceCardId: string;
  effectType: string;
  affectedZone: string;
  expiresAt?: number;
}

export interface GameState {
  // Config
  config: EngineConfig;
  cardLookup: Record<string, CardDefinition>;

  // Players
  hostId: string;
  awayId: string;

  // Zones — host
  hostHand: string[];
  hostBoard: BoardCard[];
  hostSpellTrapZone: SpellTrapCard[];
  hostFieldSpell: SpellTrapCard | null;
  hostDeck: string[];
  hostGraveyard: string[];
  hostBanished: string[];

  // Zones — away
  awayHand: string[];
  awayBoard: BoardCard[];
  awaySpellTrapZone: SpellTrapCard[];
  awayFieldSpell: SpellTrapCard | null;
  awayDeck: string[];
  awayGraveyard: string[];
  awayBanished: string[];

  // Resources
  hostLifePoints: number;
  awayLifePoints: number;
  hostBreakdownsCaused: number;
  awayBreakdownsCaused: number;

  // Turn state
  currentTurnPlayer: Seat;
  turnNumber: number;
  currentPhase: Phase;
  hostNormalSummonedThisTurn: boolean;
  awayNormalSummonedThisTurn: boolean;

  // Chain
  currentChain: ChainLink[];
  currentPriorityPlayer: Seat | null;

  // Pending
  pendingAction: PendingAction | null;

  // Effects tracking
  temporaryModifiers: TemporaryModifier[];
  lingeringEffects: LingeringEffect[];
  optUsedThisTurn: string[];
  hoptUsedEffects: string[];

  // Game result
  winner: Seat | null;
  winReason: WinReason | null;
  gameOver: boolean;
}

export interface PlayerView {
  // Own state — full visibility
  hand: string[];
  board: BoardCard[];
  spellTrapZone: SpellTrapCard[];
  fieldSpell: SpellTrapCard | null;
  graveyard: string[];
  banished: string[];
  lifePoints: number;
  deckCount: number;
  breakdownsCaused: number;

  // Opponent state — masked
  opponentHandCount: number;
  opponentBoard: BoardCard[]; // faceDown cards have no definitionId
  opponentSpellTrapZone: SpellTrapCard[]; // faceDown cards masked
  opponentFieldSpell: SpellTrapCard | null;
  opponentGraveyard: string[];
  opponentBanished: string[];
  opponentLifePoints: number;
  opponentDeckCount: number;
  opponentBreakdownsCaused: number;

  // Shared state
  currentTurnPlayer: Seat;
  turnNumber: number;
  currentPhase: Phase;
  currentChain: ChainLink[];
  mySeat: Seat;
  gameOver: boolean;
  winner: Seat | null;
  winReason: WinReason | null;
}
```

`src/types/commands.ts` — Player commands:
```typescript
import type { Position } from "./state.js";

export type Command =
  | { type: "SUMMON"; cardId: string; position: Position; tributeCardIds?: string[] }
  | { type: "SET_MONSTER"; cardId: string }
  | { type: "FLIP_SUMMON"; cardId: string }
  | { type: "CHANGE_POSITION"; cardId: string }
  | { type: "SET_SPELL_TRAP"; cardId: string }
  | { type: "ACTIVATE_SPELL"; cardId: string; targets?: string[] }
  | { type: "ACTIVATE_TRAP"; cardId: string; targets?: string[] }
  | { type: "ACTIVATE_EFFECT"; cardId: string; effectIndex: number; targets?: string[] }
  | { type: "DECLARE_ATTACK"; attackerId: string; targetId?: string }
  | { type: "ADVANCE_PHASE" }
  | { type: "END_TURN" }
  | { type: "CHAIN_RESPONSE"; cardId?: string; pass: boolean }
  | { type: "SURRENDER" };
```

`src/types/events.ts` — Engine events (facts that happened):
```typescript
import type { Seat, Phase, Position, WinReason } from "./state.js";

export type EngineEvent =
  // Game lifecycle
  | { type: "GAME_STARTED"; hostId: string; awayId: string; goingFirst: Seat }
  | { type: "GAME_ENDED"; winner: Seat; reason: WinReason }

  // Turn/Phase
  | { type: "TURN_STARTED"; seat: Seat; turnNumber: number }
  | { type: "TURN_ENDED"; seat: Seat }
  | { type: "PHASE_CHANGED"; from: Phase; to: Phase }

  // Draw
  | { type: "CARD_DRAWN"; seat: Seat; cardId: string }
  | { type: "DECK_OUT"; seat: Seat }

  // Summon
  | { type: "MONSTER_SUMMONED"; seat: Seat; cardId: string; position: Position; tributes: string[] }
  | { type: "MONSTER_SET"; seat: Seat; cardId: string }
  | { type: "FLIP_SUMMONED"; seat: Seat; cardId: string; position: Position }
  | { type: "SPECIAL_SUMMONED"; seat: Seat; cardId: string; from: string; position: Position }

  // Spells/Traps
  | { type: "SPELL_TRAP_SET"; seat: Seat; cardId: string }
  | { type: "SPELL_ACTIVATED"; seat: Seat; cardId: string; targets: string[] }
  | { type: "TRAP_ACTIVATED"; seat: Seat; cardId: string; targets: string[] }
  | { type: "EFFECT_ACTIVATED"; seat: Seat; cardId: string; effectIndex: number; targets: string[] }

  // Combat
  | { type: "ATTACK_DECLARED"; seat: Seat; attackerId: string; targetId: string | null }
  | { type: "DAMAGE_DEALT"; seat: Seat; amount: number; isBattle: boolean }
  | { type: "BATTLE_RESOLVED"; attackerId: string; defenderId: string | null; result: "win" | "lose" | "draw" }

  // Destruction / Removal
  | { type: "CARD_DESTROYED"; cardId: string; reason: "battle" | "effect" | "breakdown" }
  | { type: "CARD_BANISHED"; cardId: string; from: string }
  | { type: "CARD_RETURNED_TO_HAND"; cardId: string; from: string }
  | { type: "CARD_SENT_TO_GRAVEYARD"; cardId: string; from: string }

  // Vice system
  | { type: "VICE_COUNTER_ADDED"; cardId: string; newCount: number }
  | { type: "VICE_COUNTER_REMOVED"; cardId: string; newCount: number }
  | { type: "BREAKDOWN_TRIGGERED"; seat: Seat; cardId: string }

  // Position
  | { type: "POSITION_CHANGED"; cardId: string; from: Position; to: Position }

  // Modifiers
  | { type: "MODIFIER_APPLIED"; cardId: string; field: "attack" | "defense"; amount: number; source: string }
  | { type: "MODIFIER_EXPIRED"; cardId: string; source: string }

  // Chain
  | { type: "CHAIN_STARTED" }
  | { type: "CHAIN_LINK_ADDED"; cardId: string; seat: Seat; effectIndex: number }
  | { type: "CHAIN_RESOLVED" }
  | { type: "CHAIN_PASSED"; seat: Seat };
```

`src/types/index.ts` — Barrel export:
```typescript
export * from "./state.js";
export * from "./commands.js";
export * from "./events.js";
export * from "./cards.js";
export * from "./config.js";
```

**Step 4: Run tests**

Run: `cd packages/engine && bun run test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/types/
git commit -m "feat(engine): define core type system — GameState, Command, EngineEvent, CardDefinition"
```

---

### Task 3: Implement `defineCards` and card validation

**Files:**
- Create: `packages/engine/src/cards.ts`
- Create: `packages/engine/src/__tests__/cards.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { defineCards, validateDeck } from "../cards.js";
import type { CardDefinition } from "../types/index.js";

const sampleCards: CardDefinition[] = [
  {
    id: "warrior-1",
    name: "Test Warrior",
    type: "stereotype",
    description: "A test warrior",
    rarity: "common",
    attack: 1500,
    defense: 1200,
    level: 4,
  },
  {
    id: "spell-1",
    name: "Test Spell",
    type: "spell",
    description: "A test spell",
    rarity: "common",
    spellType: "normal",
  },
];

describe("defineCards", () => {
  it("returns a card lookup map", () => {
    const lookup = defineCards(sampleCards);
    expect(lookup["warrior-1"]).toBeDefined();
    expect(lookup["warrior-1"].name).toBe("Test Warrior");
  });

  it("throws on duplicate card IDs", () => {
    const dupes = [sampleCards[0], { ...sampleCards[0] }];
    expect(() => defineCards(dupes)).toThrow("Duplicate card ID");
  });

  it("throws on stereotype without attack/defense", () => {
    const bad: CardDefinition[] = [
      { id: "bad", name: "Bad", type: "stereotype", description: "", rarity: "common" },
    ];
    expect(() => defineCards(bad)).toThrow("attack");
  });
});

describe("validateDeck", () => {
  const lookup = defineCards(sampleCards);

  it("validates a legal deck", () => {
    const deck = Array(40).fill("warrior-1");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(true);
  });

  it("rejects a deck that is too small", () => {
    const deck = Array(10).fill("warrior-1");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("too few");
  });

  it("rejects unknown card IDs", () => {
    const deck = Array(40).fill("nonexistent");
    const result = validateDeck(deck, lookup, { min: 40, max: 60 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Unknown card");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && bun run test`
Expected: FAIL

**Step 3: Implement**

`src/cards.ts`:
```typescript
import type { CardDefinition } from "./types/index.js";

export type CardLookup = Record<string, CardDefinition>;

export function defineCards(cards: CardDefinition[]): CardLookup {
  const lookup: CardLookup = {};
  for (const card of cards) {
    if (lookup[card.id]) {
      throw new Error(`Duplicate card ID: ${card.id}`);
    }
    if (card.type === "stereotype") {
      if (card.attack === undefined || card.defense === undefined) {
        throw new Error(`Stereotype "${card.id}" must have attack and defense`);
      }
      if (card.level === undefined) {
        throw new Error(`Stereotype "${card.id}" must have a level`);
      }
    }
    lookup[card.id] = card;
  }
  return lookup;
}

export interface DeckValidation {
  valid: boolean;
  errors: string[];
}

export function validateDeck(
  deckCardIds: string[],
  cardLookup: CardLookup,
  sizeConstraint: { min: number; max: number },
): DeckValidation {
  const errors: string[] = [];

  if (deckCardIds.length < sizeConstraint.min) {
    errors.push(`Deck has too few cards (${deckCardIds.length}/${sizeConstraint.min})`);
  }
  if (deckCardIds.length > sizeConstraint.max) {
    errors.push(`Deck has too many cards (${deckCardIds.length}/${sizeConstraint.max})`);
  }
  for (const id of deckCardIds) {
    if (!cardLookup[id]) {
      errors.push(`Unknown card ID: ${id}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

**Step 4: Run tests**

Run: `cd packages/engine && bun run test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/cards.ts packages/engine/src/__tests__/cards.test.ts
git commit -m "feat(engine): add defineCards and validateDeck with validation"
```

---

### Task 4: Implement `createInitialState` and `mask`

**Files:**
- Create: `packages/engine/src/engine.ts`
- Create: `packages/engine/src/__tests__/engine.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest";
import { createEngine } from "../engine.js";
import { defineCards } from "../cards.js";
import { DEFAULT_CONFIG } from "../types/config.js";
import type { CardDefinition } from "../types/index.js";

// Minimal card set for testing
const testCards: CardDefinition[] = [
  { id: "w1", name: "Warrior", type: "stereotype", description: "", rarity: "common", attack: 1500, defense: 1200, level: 4 },
  { id: "w2", name: "Knight", type: "stereotype", description: "", rarity: "common", attack: 1800, defense: 1000, level: 4 },
  { id: "s1", name: "Power Boost", type: "spell", description: "", rarity: "common", spellType: "normal" },
  { id: "t1", name: "Mirror Force", type: "trap", description: "", rarity: "rare", trapType: "normal" },
];

const cardLookup = defineCards(testCards);

describe("createEngine", () => {
  const engine = createEngine({ cards: cardLookup, config: DEFAULT_CONFIG });

  describe("createInitialState", () => {
    it("creates a valid initial game state", () => {
      const hostDeck = Array(40).fill("w1");
      const awayDeck = Array(40).fill("w2");
      const state = engine.createInitialState("host-1", "away-1", hostDeck, awayDeck, "host");

      expect(state.hostId).toBe("host-1");
      expect(state.awayId).toBe("away-1");
      expect(state.hostLifePoints).toBe(8000);
      expect(state.awayLifePoints).toBe(8000);
      expect(state.hostHand).toHaveLength(5);
      expect(state.awayHand).toHaveLength(5);
      expect(state.hostDeck).toHaveLength(35);
      expect(state.awayDeck).toHaveLength(35);
      expect(state.currentPhase).toBe("draw");
      expect(state.turnNumber).toBe(1);
      expect(state.currentTurnPlayer).toBe("host");
      expect(state.gameOver).toBe(false);
    });
  });

  describe("mask", () => {
    it("hides opponent hand contents", () => {
      const hostDeck = Array(40).fill("w1");
      const awayDeck = Array(40).fill("w2");
      const state = engine.createInitialState("host-1", "away-1", hostDeck, awayDeck, "host");

      const hostView = engine.mask(state, "host");
      expect(hostView.hand).toHaveLength(5);
      expect(hostView.opponentHandCount).toBe(5);
      expect(hostView.mySeat).toBe("host");
    });

    it("shows own LP and opponent LP", () => {
      const hostDeck = Array(40).fill("w1");
      const awayDeck = Array(40).fill("w2");
      const state = engine.createInitialState("host-1", "away-1", hostDeck, awayDeck, "host");

      const view = engine.mask(state, "host");
      expect(view.lifePoints).toBe(8000);
      expect(view.opponentLifePoints).toBe(8000);
    });
  });

  describe("legalMoves", () => {
    it("returns available commands for current player", () => {
      const hostDeck = Array(40).fill("w1");
      const awayDeck = Array(40).fill("w2");
      const state = engine.createInitialState("host-1", "away-1", hostDeck, awayDeck, "host");

      const moves = engine.legalMoves(state, "host");
      expect(moves.length).toBeGreaterThan(0);
      // In draw phase, should be able to advance phase
      const hasAdvance = moves.some((m) => m.type === "ADVANCE_PHASE");
      expect(hasAdvance).toBe(true);
    });

    it("returns empty for non-current player", () => {
      const hostDeck = Array(40).fill("w1");
      const awayDeck = Array(40).fill("w2");
      const state = engine.createInitialState("host-1", "away-1", hostDeck, awayDeck, "host");

      const moves = engine.legalMoves(state, "away");
      expect(moves).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/engine && bun run test`
Expected: FAIL

**Step 3: Implement engine core**

`src/engine.ts`:
```typescript
import type { CardLookup } from "./cards.js";
import type {
  GameState,
  PlayerView,
  Seat,
  Phase,
  BoardCard,
  SpellTrapCard,
  EngineConfig,
  Command,
  EngineEvent,
} from "./types/index.js";
import { DEFAULT_CONFIG } from "./types/config.js";

export interface EngineOptions {
  cards: CardLookup;
  config?: EngineConfig;
}

export interface Engine {
  createInitialState(
    hostId: string,
    awayId: string,
    hostDeck: string[],
    awayDeck: string[],
    goingFirst: Seat,
  ): GameState;

  decide(state: GameState, command: Command): EngineEvent[];
  evolve(state: GameState, event: EngineEvent): GameState;
  mask(state: GameState, seat: Seat): PlayerView;
  legalMoves(state: GameState, seat: Seat): Command[];
}

export function createEngine(options: EngineOptions): Engine {
  const config = options.config ?? DEFAULT_CONFIG;
  const cards = options.cards;

  function createInitialState(
    hostId: string,
    awayId: string,
    hostDeck: string[],
    awayDeck: string[],
    goingFirst: Seat,
  ): GameState {
    // Shuffle decks (Fisher-Yates)
    const shuffledHost = shuffle([...hostDeck]);
    const shuffledAway = shuffle([...awayDeck]);

    // Draw starting hands
    const hostHand = shuffledHost.splice(0, config.startingHandSize);
    const awayHand = shuffledAway.splice(0, config.startingHandSize);

    return {
      config,
      cardLookup: cards,
      hostId,
      awayId,
      hostHand,
      awayHand,
      hostBoard: [],
      awayBoard: [],
      hostSpellTrapZone: [],
      awaySpellTrapZone: [],
      hostFieldSpell: null,
      awayFieldSpell: null,
      hostDeck: shuffledHost,
      awayDeck: shuffledAway,
      hostGraveyard: [],
      awayGraveyard: [],
      hostBanished: [],
      awayBanished: [],
      hostLifePoints: config.startingLP,
      awayLifePoints: config.startingLP,
      hostBreakdownsCaused: 0,
      awayBreakdownsCaused: 0,
      currentTurnPlayer: goingFirst,
      turnNumber: 1,
      currentPhase: "draw",
      hostNormalSummonedThisTurn: false,
      awayNormalSummonedThisTurn: false,
      currentChain: [],
      currentPriorityPlayer: null,
      pendingAction: null,
      temporaryModifiers: [],
      lingeringEffects: [],
      optUsedThisTurn: [],
      hoptUsedEffects: [],
      winner: null,
      winReason: null,
      gameOver: false,
    };
  }

  function decide(_state: GameState, _command: Command): EngineEvent[] {
    // TODO: Task 5+ — implement command handlers
    return [];
  }

  function evolve(state: GameState, _event: EngineEvent): GameState {
    // TODO: Task 5+ — implement event reducer
    return state;
  }

  function mask(state: GameState, seat: Seat): PlayerView {
    const isHost = seat === "host";

    const myBoard = isHost ? state.hostBoard : state.awayBoard;
    const mySTZ = isHost ? state.hostSpellTrapZone : state.awaySpellTrapZone;
    const myField = isHost ? state.hostFieldSpell : state.awayFieldSpell;
    const oppBoard = isHost ? state.awayBoard : state.hostBoard;
    const oppSTZ = isHost ? state.awaySpellTrapZone : state.hostSpellTrapZone;
    const oppField = isHost ? state.awayFieldSpell : state.hostFieldSpell;

    return {
      hand: isHost ? state.hostHand : state.awayHand,
      board: myBoard,
      spellTrapZone: mySTZ,
      fieldSpell: myField,
      graveyard: isHost ? state.hostGraveyard : state.awayGraveyard,
      banished: isHost ? state.hostBanished : state.awayBanished,
      lifePoints: isHost ? state.hostLifePoints : state.awayLifePoints,
      deckCount: isHost ? state.hostDeck.length : state.awayDeck.length,
      breakdownsCaused: isHost ? state.hostBreakdownsCaused : state.awayBreakdownsCaused,

      opponentHandCount: isHost ? state.awayHand.length : state.hostHand.length,
      opponentBoard: maskBoard(oppBoard),
      opponentSpellTrapZone: maskSpellTrapZone(oppSTZ),
      opponentFieldSpell: oppField,
      opponentGraveyard: isHost ? state.awayGraveyard : state.hostGraveyard,
      opponentBanished: isHost ? state.awayBanished : state.hostBanished,
      opponentLifePoints: isHost ? state.awayLifePoints : state.hostLifePoints,
      opponentDeckCount: isHost ? state.awayDeck.length : state.hostDeck.length,
      opponentBreakdownsCaused: isHost ? state.awayBreakdownsCaused : state.hostBreakdownsCaused,

      currentTurnPlayer: state.currentTurnPlayer,
      turnNumber: state.turnNumber,
      currentPhase: state.currentPhase,
      currentChain: state.currentChain,
      mySeat: seat,
      gameOver: state.gameOver,
      winner: state.winner,
      winReason: state.winReason,
    };
  }

  function legalMoves(state: GameState, seat: Seat): Command[] {
    if (state.gameOver) return [];
    if (state.currentTurnPlayer !== seat) return [];

    const moves: Command[] = [];

    // Can always surrender
    moves.push({ type: "SURRENDER" });

    // Phase-based moves
    if (state.currentPhase === "draw" || state.currentPhase === "standby") {
      moves.push({ type: "ADVANCE_PHASE" });
    }

    if (state.currentPhase === "main" || state.currentPhase === "main2") {
      moves.push({ type: "ADVANCE_PHASE" });
      moves.push({ type: "END_TURN" });

      const hand = seat === "host" ? state.hostHand : state.awayHand;
      const board = seat === "host" ? state.hostBoard : state.awayBoard;
      const stz = seat === "host" ? state.hostSpellTrapZone : state.awaySpellTrapZone;
      const hasNormalSummoned = seat === "host"
        ? state.hostNormalSummonedThisTurn
        : state.awayNormalSummonedThisTurn;

      // Summon / Set from hand
      for (const cardId of hand) {
        const card = state.cardLookup[cardId];
        if (!card) continue;

        if (card.type === "stereotype") {
          if (!hasNormalSummoned && board.length < state.config.maxBoardSlots) {
            if (card.level !== undefined && card.level <= 4) {
              moves.push({ type: "SUMMON", cardId, position: "attack" });
              moves.push({ type: "SUMMON", cardId, position: "defense" });
            }
            moves.push({ type: "SET_MONSTER", cardId });
          }
        }

        if (card.type === "spell") {
          if (stz.length < state.config.maxSpellTrapSlots || card.spellType === "field") {
            moves.push({ type: "ACTIVATE_SPELL", cardId });
            if (card.spellType !== "normal") {
              moves.push({ type: "SET_SPELL_TRAP", cardId });
            }
          }
        }

        if (card.type === "trap") {
          if (stz.length < state.config.maxSpellTrapSlots) {
            moves.push({ type: "SET_SPELL_TRAP", cardId });
          }
        }
      }

      // Change position of board monsters
      for (const monster of board) {
        if (!monster.changedPositionThisTurn && !monster.faceDown) {
          moves.push({ type: "CHANGE_POSITION", cardId: monster.cardId });
        }
        if (monster.faceDown) {
          moves.push({ type: "FLIP_SUMMON", cardId: monster.cardId });
        }
      }
    }

    if (state.currentPhase === "combat") {
      moves.push({ type: "ADVANCE_PHASE" });
      const board = seat === "host" ? state.hostBoard : state.awayBoard;
      for (const monster of board) {
        if (monster.canAttack && !monster.hasAttackedThisTurn && !monster.faceDown) {
          const oppBoard = seat === "host" ? state.awayBoard : state.hostBoard;
          if (oppBoard.length === 0) {
            moves.push({ type: "DECLARE_ATTACK", attackerId: monster.cardId, targetId: undefined });
          } else {
            for (const target of oppBoard) {
              moves.push({ type: "DECLARE_ATTACK", attackerId: monster.cardId, targetId: target.cardId });
            }
          }
        }
      }
    }

    if (state.currentPhase === "breakdown_check" || state.currentPhase === "end") {
      moves.push({ type: "ADVANCE_PHASE" });
    }

    return moves;
  }

  return {
    createInitialState,
    decide,
    evolve,
    mask,
    legalMoves,
  };
}

// --- Helpers ---

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function maskBoard(board: BoardCard[]): BoardCard[] {
  return board.map((card) =>
    card.faceDown
      ? { ...card, definitionId: "hidden", cardId: "hidden-" + card.cardId }
      : card,
  );
}

function maskSpellTrapZone(zone: SpellTrapCard[]): SpellTrapCard[] {
  return zone.map((card) =>
    card.faceDown
      ? { ...card, definitionId: "hidden", cardId: "hidden-" + card.cardId }
      : card,
  );
}
```

**Step 4: Run tests**

Run: `cd packages/engine && bun run test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/engine/src/engine.ts packages/engine/src/__tests__/engine.test.ts
git commit -m "feat(engine): implement createInitialState, mask, and legalMoves"
```

---

### Task 5: Implement `decide` and `evolve` — Phase advancement and turn management

**Files:**
- Create: `packages/engine/src/rules/phases.ts`
- Create: `packages/engine/src/rules/index.ts`
- Modify: `packages/engine/src/engine.ts` — wire decide/evolve
- Create: `packages/engine/src/__tests__/phases.test.ts`

This task implements the first decide/evolve handlers: ADVANCE_PHASE, END_TURN, SURRENDER. Subsequent tasks add summon, combat, effects, etc.

**Step 1: Write failing tests**

`packages/engine/src/__tests__/phases.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { createEngine } from "../engine.js";
import { defineCards } from "../cards.js";
import { DEFAULT_CONFIG } from "../types/config.js";

const cards = defineCards([
  { id: "w1", name: "Warrior", type: "stereotype", description: "", rarity: "common", attack: 1500, defense: 1200, level: 4 },
]);

const engine = createEngine({ cards, config: DEFAULT_CONFIG });

function makeState() {
  return engine.createInitialState("h", "a", Array(40).fill("w1"), Array(40).fill("w1"), "host");
}

describe("decide + evolve: phases", () => {
  it("ADVANCE_PHASE from draw to standby", () => {
    const state = makeState();
    expect(state.currentPhase).toBe("draw");

    const events = engine.decide(state, { type: "ADVANCE_PHASE" });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("PHASE_CHANGED");

    const next = events.reduce(engine.evolve, state);
    expect(next.currentPhase).toBe("standby");
  });

  it("END_TURN advances to opponent", () => {
    let state = makeState();
    // Advance through phases to main
    state = engine.evolve(state, { type: "PHASE_CHANGED", from: "draw", to: "standby" });
    state = engine.evolve(state, { type: "PHASE_CHANGED", from: "standby", to: "main" });

    const events = engine.decide(state, { type: "END_TURN" });
    const turnEnded = events.find((e) => e.type === "TURN_ENDED");
    const turnStarted = events.find((e) => e.type === "TURN_STARTED");
    expect(turnEnded).toBeDefined();
    expect(turnStarted).toBeDefined();
    if (turnStarted && turnStarted.type === "TURN_STARTED") {
      expect(turnStarted.seat).toBe("away");
    }

    const next = events.reduce(engine.evolve, state);
    expect(next.currentTurnPlayer).toBe("away");
    expect(next.turnNumber).toBe(2);
    expect(next.currentPhase).toBe("draw");
  });

  it("SURRENDER ends the game", () => {
    const state = makeState();
    const events = engine.decide(state, { type: "SURRENDER" });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("GAME_ENDED");

    const next = events.reduce(engine.evolve, state);
    expect(next.gameOver).toBe(true);
    expect(next.winner).toBe("away");
    expect(next.winReason).toBe("surrender");
  });
});
```

**Step 2: Run to verify fail**
Run: `cd packages/engine && bun run test`

**Step 3: Implement phase rules**

`src/rules/phases.ts` — Phase transition logic:
```typescript
import type { Phase, Seat } from "../types/state.js";

const PHASE_ORDER: Phase[] = ["draw", "standby", "main", "combat", "main2", "breakdown_check", "end"];

export function nextPhase(current: Phase): Phase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return "draw"; // wrap to next turn
  return PHASE_ORDER[idx + 1];
}

export function opponentSeat(seat: Seat): Seat {
  return seat === "host" ? "away" : "host";
}
```

Then wire `decide` and `evolve` in `engine.ts` to handle ADVANCE_PHASE, END_TURN, SURRENDER commands and PHASE_CHANGED, TURN_STARTED, TURN_ENDED, GAME_ENDED events.

**Step 4: Run tests**
Run: `cd packages/engine && bun run test`
Expected: PASS

**Step 5: Commit**
```bash
git add packages/engine/src/rules/ packages/engine/src/__tests__/phases.test.ts packages/engine/src/engine.ts
git commit -m "feat(engine): implement phase advancement, turn management, surrender"
```

---

### Task 6–10: Implement remaining decide/evolve handlers

These follow the same TDD pattern as Task 5. Listed for sequencing:

**Task 6: Summoning** — SUMMON, SET_MONSTER, FLIP_SUMMON, tribute logic
- Source: `convex/gameplay/gameEngine/summons.ts`
- Tests: Normal summon, tribute summon, set monster, flip summon, board limit enforcement

**Task 7: Spells and Traps** — SET_SPELL_TRAP, ACTIVATE_SPELL, ACTIVATE_TRAP
- Source: `convex/gameplay/gameEngine/spellsTraps.ts`
- Tests: Set face-down, activate, chain interaction stubs

**Task 8: Combat** — DECLARE_ATTACK, damage calculation, battle resolution
- Source: `convex/gameplay/gameEngine/` (combat logic spread across files)
- Tests: Attack → damage, position-based defense, direct attack, battle destruction

**Task 9: Vice System** — Vice counters, breakdown triggers, breakdown win condition
- Source: `convex/gameplay/gameEngine/viceSystem.ts` (already mostly pure)
- Tests: Add vice, threshold check, breakdown trigger, 3-breakdown win

**Task 10: State-based actions** — LP win, deck-out, hand limit enforcement
- Source: `convex/gameplay/gameEngine/stateBasedActions.ts` (extract pure checks)
- Tests: LP → 0 ends game, deck-out ends game, hand limit discard

Each task: write failing test → implement → pass → commit.

---

## Phase 1B: `@lunchtable-tcg/config` — Configuration Package

### Task 11: Scaffold config package

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/tsconfig.build.json`
- Create: `packages/config/src/index.ts`
- Create: `packages/config/src/schema.ts`
- Create: `packages/config/src/defaults.ts`

Same scaffolding pattern as Task 1, but for a standard (non-Convex) package:

```json
{
  "name": "@lunchtable-tcg/config",
  "version": "0.1.0",
  "description": "Configuration schema and defaults for @lunchtable-tcg games",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

`src/schema.ts` — Full config type:
```typescript
import type { EngineConfig } from "@lunchtable-tcg/engine";

export interface LTCGConfig {
  game: {
    name: string;
    engine: EngineConfig;
  };
  economy: {
    startingCurrency: number;
    packPrice: number;
    rarityWeights: Record<string, number>;
    wagerWinnerPct: number;
  };
  progression: {
    xp: {
      rankedWin: number;
      rankedLoss: number;
      casualWin: number;
      casualLoss: number;
      storyWin: number;
      storyLoss: number;
    };
    levelCurve: "linear" | "exponential";
  };
  cards: string; // path to card definitions directory
  theme: {
    brand: string;
    palette: { primary: string; secondary: string };
  };
  blockchain: {
    enabled: boolean;
    chain?: "solana" | "ethereum" | "base";
    network?: string;
    tokenMint?: string;
    treasuryWallet?: string;
  };
}
```

`src/defaults.ts` — Default values (extracted from `convex/lib/constants.ts`):
```typescript
import { DEFAULT_CONFIG } from "@lunchtable-tcg/engine";
import type { LTCGConfig } from "./schema.js";

export const DEFAULT_LTCG_CONFIG: LTCGConfig = {
  game: {
    name: "LunchTable TCG",
    engine: DEFAULT_CONFIG,
  },
  economy: {
    startingCurrency: 500,
    packPrice: 100,
    rarityWeights: { common: 55, uncommon: 28, rare: 12, epic: 4, legendary: 1 },
    wagerWinnerPct: 0.9,
  },
  progression: {
    xp: { rankedWin: 30, rankedLoss: 10, casualWin: 20, casualLoss: 5, storyWin: 50, storyLoss: 0 },
    levelCurve: "exponential",
  },
  cards: "./cards/",
  theme: {
    brand: "LunchTable",
    palette: { primary: "#6366f1", secondary: "#1e1b4b" },
  },
  blockchain: { enabled: false },
};
```

`src/index.ts`:
```typescript
import { DEFAULT_LTCG_CONFIG } from "./defaults.js";
import type { LTCGConfig } from "./schema.js";

export type { LTCGConfig } from "./schema.js";
export { DEFAULT_LTCG_CONFIG } from "./defaults.js";

export function defineConfig(overrides: Partial<LTCGConfig>): LTCGConfig {
  return deepMerge(DEFAULT_LTCG_CONFIG, overrides);
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val && typeof val === "object" && !Array.isArray(val) && typeof base[key] === "object") {
      result[key] = deepMerge(base[key] as Record<string, unknown>, val as Record<string, unknown>) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}
```

Commit: `feat(config): scaffold @lunchtable-tcg/config with schema and defaults`

---

### Task 12: Wire config into economy component constants

**Files:**
- Modify: `convex/lib/constants.ts` — import defaults from config package
- Test: Verify `bun run type-check` passes

Replace hardcoded values in `constants.ts` with imports from `@lunchtable-tcg/config` defaults. This is a gradual migration — start with economy constants (rarity weights, XP values, marketplace fees) and verify nothing breaks.

Commit: `refactor: source economy constants from @lunchtable-tcg/config defaults`

---

## Phase 2 (Future Plan): Component Refactoring

> To be planned in a separate document after Phase 1 is complete.

- Each Convex component reads from shared config
- Card definition format standardized as JSON/TS files
- Components become configurable without code changes

## Phase 3 (Future Plan): CLI Scaffolder

> To be planned after Phase 2.

- `create-lunchtable-tcg` CLI using `@clack/prompts`
- Template directory generated from working monorepo
- Tier selection (Core, Engagement, Social, etc.)

## Phase 4 (Future Plan): ElizaOS Plugin Expansion

> To be planned after Phase 2.

- Operator actions (createCard, adjustEconomy, runTournament)
- Additional providers (meta analysis, economy state)
- Agent-to-agent match service
- Note: Plugin already has 21 actions, 10 providers, 3 evaluators, 3 services

## Phase 5 (Future Plan): Documentation & Publishing

> To be planned last.

- README per package
- Getting started guide
- Card authoring guide
- npm publishing pipeline
