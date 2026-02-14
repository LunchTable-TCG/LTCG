# Event-Sourced Match Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a pure-TypeScript game engine (`@ltcg/engine`) and Convex persistence layer (`@lunchtable-tcg/match`) using the Decider pattern (decide/evolve/mask).

**Architecture:** Two packages — a zero-dependency pure TS engine importable everywhere (server, client, agents, tests) and a thin Convex component that wraps it for persistence and real-time queries. The engine uses event sourcing internally (commands produce events, events produce state), while the Convex layer materializes state snapshots for fast reads.

**Tech Stack:** TypeScript 5.7+, Vitest 4.x, Convex 1.31+, convex-helpers

---

## Task 1: Scaffold `@ltcg/engine` Package

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/tsconfig.build.json`
- Create: `packages/engine/src/index.ts`

**Step 1: Create package directory**

```bash
mkdir -p packages/engine/src/rules
```

**Step 2: Write package.json**

```json
{
  "name": "@ltcg/engine",
  "version": "0.1.0",
  "description": "Pure TypeScript game engine for LunchTable TCG — zero dependencies",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc --project ./tsconfig.build.json",
    "dev:build": "tsc --project ./tsconfig.build.json --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.3",
    "vitest": "^4.0.18"
  },
  "files": ["dist", "src"],
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js"
}
```

**Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 4: Write tsconfig.build.json**

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
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 5: Write barrel export**

Create `packages/engine/src/index.ts`:
```typescript
export * from "./types.js";
```

**Step 6: Write vitest config**

Create `packages/engine/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
```

**Step 7: Install deps and verify**

```bash
cd packages/engine && bun install
```

**Step 8: Commit**

```bash
git add packages/engine/
git commit -m "feat(engine): scaffold @ltcg/engine package"
```

---

## Task 2: Define Core Types

**Files:**
- Create: `packages/engine/src/types.ts`

This is the foundation — every other file depends on these types. Port the type system from the existing `gameStates` schema and game engine types into clean, self-contained TypeScript.

**Step 1: Write types.ts**

```typescript
// =============================================================================
// Seats & Phases
// =============================================================================

export type Seat = "host" | "away";
export type Phase = "draw" | "main" | "combat" | "breakdown_check" | "end";

export function otherSeat(seat: Seat): Seat {
  return seat === "host" ? "away" : "host";
}

// =============================================================================
// Board Cards
// =============================================================================

export interface BoardMonster {
  cardId: string;
  position: 1 | -1; // 1 = attack, -1 = defense
  attack: number;
  defense: number;
  hasAttacked: boolean;
  isFaceDown: boolean;
  hasChangedPosition: boolean;
  turnSummoned: number;
  viceCounters: number;
  viceType?: string;
  // Protection flags
  cannotBeDestroyedByBattle?: boolean;
  cannotBeDestroyedByEffects?: boolean;
  cannotBeTargeted?: boolean;
  // Equips
  equippedCards: string[];
  // Tokens
  isToken?: boolean;
  tokenData?: {
    name: string;
    atk: number;
    def: number;
    level?: number;
    attribute?: string;
  };
}

export interface BoardSpellTrap {
  cardId: string;
  isFaceDown: boolean;
  isActivated: boolean;
  turnSet?: number;
  equippedTo?: string;
}

export interface FieldSpell {
  cardId: string;
  isActive: boolean;
}

// =============================================================================
// Seat State (one player's complete state)
// =============================================================================

export interface SeatState {
  playerId: string;
  hand: string[]; // cardIds
  deck: string[]; // cardIds (top = index 0)
  board: BoardMonster[];
  spellTrapZone: BoardSpellTrap[];
  fieldSpell?: FieldSpell;
  graveyard: string[]; // cardIds
  banished: string[]; // cardIds
  lifePoints: number;
  clout: number;
  breakdownsCaused: number;
  normalSummonedThisTurn: boolean;
}

// =============================================================================
// Chain & Response Window
// =============================================================================

export interface ChainLink {
  cardId: string;
  playerId: string;
  spellSpeed: 1 | 2 | 3;
  effect: unknown; // JSON ability
  targets?: string[];
  negated?: boolean;
}

export type ResponseWindowType =
  | "summon"
  | "attack_declaration"
  | "spell_activation"
  | "trap_activation"
  | "effect_activation"
  | "damage_calculation"
  | "end_phase"
  | "open";

export interface ResponseWindow {
  type: ResponseWindowType;
  triggerPlayerId: string;
  activePlayerId: string;
  canRespond: boolean;
  chainOpen: boolean;
  passCount: number;
}

// =============================================================================
// Pending Actions
// =============================================================================

export interface PendingAttack {
  type: "attack";
  attackerId: string;
  targetId?: string; // undefined = direct attack
  originalMonsterCount?: number;
}

export interface PendingSummon {
  type: "summon";
  summonedCardId: string;
}

export type PendingAction = PendingAttack | PendingSummon;

export interface PendingReplay {
  attackerId: string;
  attackerSeat: Seat;
  originalTargetId?: string;
  originalMonsterCount: number;
  currentMonsterCount: number;
  availableTargets: string[];
  canAttackDirectly: boolean;
}

// =============================================================================
// Effect Tracking
// =============================================================================

export interface TemporaryModifier {
  cardId: string;
  atkBonus: number;
  defBonus: number;
  expiresAtTurn: number;
  expiresAtPhase?: string;
}

export interface LingeringEffect {
  effectType: string;
  value: unknown;
  sourceCardId?: string;
  sourceCardName?: string;
  appliedBySeat: Seat;
  appliedTurn: number;
  duration: {
    type: "until_end_phase" | "until_turn_end" | "until_next_turn" | "permanent" | "custom";
    endTurn?: number;
    endPhase?: string;
  };
  affectsPlayer?: "host" | "away" | "both";
  conditions?: unknown;
}

export interface OPTRecord {
  cardId: string;
  effectIndex: number;
  seat: Seat;
  turnUsed: number;
}

export interface HOPTRecord extends OPTRecord {
  resetOnTurn: number;
}

export interface PendingOptionalTrigger {
  cardId: string;
  cardName: string;
  effectIndex: number;
  trigger: string;
  seat: Seat;
  addedAt: number;
}

// =============================================================================
// Full Game State
// =============================================================================

export interface GameState {
  // Seat states
  host: SeatState;
  away: SeatState;

  // Turn tracking
  currentTurn: Seat;
  turnNumber: number;
  phase: Phase;

  // Chain
  chain: ChainLink[];
  currentPrioritySeat?: Seat;

  // Pending actions
  pendingAction?: PendingAction;
  pendingReplay?: PendingReplay;
  responseWindow?: ResponseWindow;

  // Effect tracking
  temporaryModifiers: TemporaryModifier[];
  lingeringEffects: LingeringEffect[];
  optUsedThisTurn: OPTRecord[];
  hoptUsedEffects: HOPTRecord[];
  pendingOptionalTriggers: PendingOptionalTrigger[];

  // Metadata
  gameMode: "pvp" | "story";
  isAIOpponent: boolean;
  status: "active" | "ended";
  winner?: Seat;
  endReason?: string;
}

// =============================================================================
// Commands (player actions)
// =============================================================================

export type Command =
  | { type: "SUMMON"; seat: Seat; cardId: string; position: "attack" | "defense" }
  | { type: "SET_MONSTER"; seat: Seat; cardId: string }
  | { type: "FLIP_SUMMON"; seat: Seat; cardId: string }
  | { type: "SET_SPELL_TRAP"; seat: Seat; cardId: string }
  | { type: "ACTIVATE_SPELL"; seat: Seat; cardId: string; targets?: string[] }
  | { type: "CHANGE_POSITION"; seat: Seat; cardId: string }
  | { type: "DECLARE_ATTACK"; seat: Seat; attackerId: string; targetId?: string }
  | { type: "ENTER_COMBAT"; seat: Seat }
  | { type: "END_TURN"; seat: Seat }
  | { type: "RESPOND_CHAIN"; seat: Seat; cardId?: string; pass: boolean }
  | { type: "RESPOND_OPTIONAL_TRIGGER"; seat: Seat; cardId: string; effectIndex: number; activate: boolean }
  | { type: "RESPOND_REPLAY"; seat: Seat; targetId?: string; cancel: boolean }
  | { type: "SURRENDER"; seat: Seat };

// =============================================================================
// Engine Events (facts that happened)
// =============================================================================

export type EngineEvent =
  // Lifecycle
  | { type: "GAME_STARTED"; hostId: string; awayId: string }
  | { type: "TURN_STARTED"; seat: Seat; turnNumber: number }
  | { type: "PHASE_CHANGED"; phase: Phase }
  | { type: "GAME_ENDED"; winner: Seat; reason: string }
  // Cards drawn
  | { type: "CARD_DRAWN"; seat: Seat; cardId: string }
  // Summoning
  | { type: "NORMAL_SUMMONED"; seat: Seat; cardId: string; position: 1 | -1 }
  | { type: "MONSTER_SET"; seat: Seat; cardId: string }
  | { type: "FLIP_SUMMONED"; seat: Seat; cardId: string }
  | { type: "TRIBUTE_PAID"; seat: Seat; tributeIds: string[] }
  | { type: "SPECIAL_SUMMONED"; seat: Seat; cardId: string; position: 1 | -1 }
  // Spells/Traps
  | { type: "SPELL_TRAP_SET"; seat: Seat; cardId: string }
  | { type: "SPELL_ACTIVATED"; seat: Seat; cardId: string }
  | { type: "TRAP_ACTIVATED"; seat: Seat; cardId: string }
  | { type: "EFFECT_ACTIVATED"; seat: Seat; cardId: string; effectIndex: number }
  // Combat
  | { type: "ATTACK_DECLARED"; seat: Seat; attackerId: string; targetId?: string }
  | { type: "DAMAGE_DEALT"; seat: Seat; amount: number; isDirect: boolean }
  | { type: "CARD_DESTROYED"; cardId: string; reason: "battle" | "effect" | "breakdown" }
  // Position
  | { type: "POSITION_CHANGED"; seat: Seat; cardId: string; newPosition: 1 | -1 }
  // Zone transitions
  | { type: "CARD_TO_GRAVEYARD"; seat: Seat; cardId: string; from: string }
  | { type: "CARD_TO_HAND"; seat: Seat; cardId: string; from: string }
  | { type: "CARD_BANISHED"; seat: Seat; cardId: string; from: string }
  | { type: "CARD_TO_DECK"; seat: Seat; cardId: string; position: "top" | "bottom" | "shuffle" }
  // Resources
  | { type: "LP_CHANGED"; seat: Seat; amount: number; newTotal: number }
  | { type: "CLOUT_CHANGED"; seat: Seat; amount: number; newTotal: number }
  // Vice/Breakdown
  | { type: "VICE_COUNTER_ADDED"; seat: Seat; cardId: string; newCount: number }
  | { type: "BREAKDOWN_TRIGGERED"; seat: Seat; cardId: string }
  | { type: "BREAKDOWN_WIN"; winner: Seat; totalBreakdowns: number }
  // Chain
  | { type: "CHAIN_LINK_ADDED"; seat: Seat; cardId: string; chainIndex: number }
  | { type: "CHAIN_RESOLVING"; chainLength: number }
  | { type: "CHAIN_RESOLVED" }
  | { type: "ACTIVATION_NEGATED"; cardId: string }
  // Misc
  | { type: "HAND_DISCARDED"; seat: Seat; cardId: string }
  | { type: "DECK_SHUFFLED"; seat: Seat };

// =============================================================================
// Player View (masked state for one player)
// =============================================================================

export interface PlayerViewMonster {
  cardId?: string; // undefined if opponent's face-down
  position: 1 | -1;
  attack?: number; // undefined if face-down
  defense?: number;
  isFaceDown: boolean;
  hasAttacked: boolean;
  viceCounters: number;
  cannotBeTargeted?: boolean;
  isToken?: boolean;
}

export interface PlayerViewSpellTrap {
  cardId?: string; // undefined if opponent's face-down
  isFaceDown: boolean;
  isActivated: boolean;
}

export interface PlayerViewState {
  // My full state
  myHand: string[];
  myDeck: number; // count only
  myBoard: PlayerViewMonster[];
  mySpellTrapZone: PlayerViewSpellTrap[];
  myFieldSpell?: FieldSpell;
  myGraveyard: string[];
  myBanished: string[];
  myLifePoints: number;
  myClout: number;
  myBreakdownsCaused: number;
  myNormalSummonedThisTurn: boolean;

  // Opponent masked state
  opponentHand: number; // count only
  opponentDeck: number; // count only
  opponentBoard: PlayerViewMonster[];
  opponentSpellTrapZone: PlayerViewSpellTrap[];
  opponentFieldSpell?: FieldSpell;
  opponentGraveyard: string[];
  opponentBanished: string[];
  opponentLifePoints: number;
  opponentClout: number;
  opponentBreakdownsCaused: number;

  // Game metadata
  isMyTurn: boolean;
  turnNumber: number;
  phase: Phase;
  status: "active" | "ended";
  winner?: "me" | "opponent";

  // Pending decisions
  pendingOptionalTriggers: PendingOptionalTrigger[];
  hasResponseWindow: boolean;
  hasPendingReplay: boolean;
}

// =============================================================================
// Card Data Lookup (external dependency)
// =============================================================================

/** Minimal card data the engine needs for validation */
export interface CardData {
  id: string;
  name: string;
  cardType: "stereotype" | "spell" | "trap" | "class";
  level?: number;
  attack?: number;
  defense?: number;
  cost?: number;
  spellType?: "normal" | "quick_play" | "continuous";
  trapType?: "normal" | "continuous" | "counter";
  viceType?: string;
  ability?: unknown; // JSON effect definition
  breakdownEffect?: unknown;
}

/**
 * Card lookup function — the engine doesn't own card data,
 * the caller provides this function.
 */
export type CardLookup = (cardId: string) => CardData | undefined;
```

**Step 2: Verify types compile**

```bash
cd packages/engine && npx tsc --noEmit
```
Expected: No errors.

**Step 3: Update barrel export**

Update `packages/engine/src/index.ts` to export everything:
```typescript
export * from "./types.js";
```

**Step 4: Commit**

```bash
git add packages/engine/src/types.ts packages/engine/src/index.ts
git commit -m "feat(engine): define core type system — GameState, Command, EngineEvent, PlayerViewState"
```

---

## Task 3: Implement `init.ts` — Create Initial Game State

**Files:**
- Create: `packages/engine/src/init.ts`
- Create: `packages/engine/src/init.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { createInitialState } from "./init";
import type { Seat } from "./types";

describe("createInitialState", () => {
  const hostDeck = Array.from({ length: 30 }, (_, i) => `host_card_${i}`);
  const awayDeck = Array.from({ length: 30 }, (_, i) => `away_card_${i}`);

  it("should create a valid initial state", () => {
    const state = createInitialState({
      hostId: "player_1",
      awayId: "player_2",
      hostDeck,
      awayDeck,
    });

    expect(state.status).toBe("active");
    expect(state.turnNumber).toBe(1);
    expect(state.phase).toBe("draw");
    expect(state.currentTurn).toBe("host");
  });

  it("should deal 5 cards to each player", () => {
    const state = createInitialState({
      hostId: "player_1",
      awayId: "player_2",
      hostDeck,
      awayDeck,
    });

    expect(state.host.hand).toHaveLength(5);
    expect(state.away.hand).toHaveLength(5);
    expect(state.host.deck).toHaveLength(25);
    expect(state.away.deck).toHaveLength(25);
  });

  it("should start with 8000 LP and 0 clout", () => {
    const state = createInitialState({
      hostId: "player_1",
      awayId: "player_2",
      hostDeck,
      awayDeck,
    });

    expect(state.host.lifePoints).toBe(8000);
    expect(state.away.lifePoints).toBe(8000);
    expect(state.host.clout).toBe(0);
    expect(state.away.clout).toBe(0);
  });

  it("should start with empty boards", () => {
    const state = createInitialState({
      hostId: "player_1",
      awayId: "player_2",
      hostDeck,
      awayDeck,
    });

    expect(state.host.board).toHaveLength(0);
    expect(state.away.board).toHaveLength(0);
    expect(state.host.graveyard).toHaveLength(0);
    expect(state.host.breakdownsCaused).toBe(0);
  });

  it("should shuffle decks (not same order as input)", () => {
    // Run multiple times — at least one should differ
    const results = Array.from({ length: 5 }, () =>
      createInitialState({
        hostId: "p1",
        awayId: "p2",
        hostDeck: [...hostDeck],
        awayDeck: [...awayDeck],
        seed: undefined, // random
      })
    );

    const allSameOrder = results.every(
      (r) => JSON.stringify(r.host.deck) === JSON.stringify(results[0].host.deck)
    );
    expect(allSameOrder).toBe(false);
  });

  it("should produce deterministic state with a seed", () => {
    const state1 = createInitialState({
      hostId: "p1",
      awayId: "p2",
      hostDeck: [...hostDeck],
      awayDeck: [...awayDeck],
      seed: 12345,
    });
    const state2 = createInitialState({
      hostId: "p1",
      awayId: "p2",
      hostDeck: [...hostDeck],
      awayDeck: [...awayDeck],
      seed: 12345,
    });

    expect(state1.host.hand).toEqual(state2.host.hand);
    expect(state1.host.deck).toEqual(state2.host.deck);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/engine && npx vitest run src/init.test.ts
```
Expected: FAIL — module not found.

**Step 3: Implement init.ts**

```typescript
import type { GameState, SeatState } from "./types.js";

export interface InitOptions {
  hostId: string;
  awayId: string;
  hostDeck: string[];
  awayDeck: string[];
  seed?: number;
  startingLP?: number;
  startingHandSize?: number;
}

/** Simple seeded PRNG (mulberry32) for deterministic shuffling */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr: string[], rng: () => number): string[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createEmptySeatState(playerId: string): SeatState {
  return {
    playerId,
    hand: [],
    deck: [],
    board: [],
    spellTrapZone: [],
    graveyard: [],
    banished: [],
    lifePoints: 8000,
    clout: 0,
    breakdownsCaused: 0,
    normalSummonedThisTurn: false,
  };
}

export function createInitialState(opts: InitOptions): GameState {
  const lp = opts.startingLP ?? 8000;
  const handSize = opts.startingHandSize ?? 5;
  const rng = opts.seed != null ? mulberry32(opts.seed) : Math.random;

  // Shuffle decks
  const hostShuffled = shuffle(opts.hostDeck, rng);
  const awayShuffled = shuffle(opts.awayDeck, rng);

  // Deal opening hands (draw from top = index 0)
  const hostHand = hostShuffled.slice(0, handSize);
  const hostDeck = hostShuffled.slice(handSize);
  const awayHand = awayShuffled.slice(0, handSize);
  const awayDeck = awayShuffled.slice(handSize);

  const host: SeatState = {
    ...createEmptySeatState(opts.hostId),
    hand: hostHand,
    deck: hostDeck,
    lifePoints: lp,
  };

  const away: SeatState = {
    ...createEmptySeatState(opts.awayId),
    hand: awayHand,
    deck: awayDeck,
    lifePoints: lp,
  };

  return {
    host,
    away,
    currentTurn: "host",
    turnNumber: 1,
    phase: "draw",
    chain: [],
    temporaryModifiers: [],
    lingeringEffects: [],
    optUsedThisTurn: [],
    hoptUsedEffects: [],
    pendingOptionalTriggers: [],
    gameMode: "pvp",
    isAIOpponent: false,
    status: "active",
  };
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/engine && npx vitest run src/init.test.ts
```
Expected: All PASS.

**Step 5: Update barrel export**

Add to `packages/engine/src/index.ts`:
```typescript
export * from "./types.js";
export * from "./init.js";
```

**Step 6: Commit**

```bash
git add packages/engine/src/init.ts packages/engine/src/init.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): implement createInitialState with seeded shuffle and opening hand deal"
```

---

## Task 4: Implement `evolve.ts` — Event Reducer

**Files:**
- Create: `packages/engine/src/evolve.ts`
- Create: `packages/engine/src/evolve.test.ts`

The evolve function is the core state reducer: given a state and an event, produce a new state. It must be pure and never mutate the input.

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { evolve } from "./evolve";
import { createInitialState } from "./init";
import type { EngineEvent, GameState } from "./types";

function makeState(): GameState {
  return createInitialState({
    hostId: "p1",
    awayId: "p2",
    hostDeck: Array.from({ length: 30 }, (_, i) => `hc_${i}`),
    awayDeck: Array.from({ length: 30 }, (_, i) => `ac_${i}`),
    seed: 42,
  });
}

describe("evolve", () => {
  it("should not mutate the original state", () => {
    const state = makeState();
    const original = JSON.parse(JSON.stringify(state));
    evolve(state, { type: "PHASE_CHANGED", phase: "main" });
    expect(state).toEqual(original);
  });

  it("should handle PHASE_CHANGED", () => {
    const state = makeState();
    const next = evolve(state, { type: "PHASE_CHANGED", phase: "main" });
    expect(next.phase).toBe("main");
  });

  it("should handle TURN_STARTED", () => {
    const state = makeState();
    const next = evolve(state, { type: "TURN_STARTED", seat: "away", turnNumber: 2 });
    expect(next.currentTurn).toBe("away");
    expect(next.turnNumber).toBe(2);
    expect(next.host.normalSummonedThisTurn).toBe(false);
    expect(next.away.normalSummonedThisTurn).toBe(false);
  });

  it("should handle CARD_DRAWN", () => {
    const state = makeState();
    const topCard = state.host.deck[0];
    const next = evolve(state, { type: "CARD_DRAWN", seat: "host", cardId: topCard });
    expect(next.host.hand).toContain(topCard);
    expect(next.host.deck).not.toContain(topCard);
    expect(next.host.deck.length).toBe(state.host.deck.length - 1);
  });

  it("should handle NORMAL_SUMMONED", () => {
    const state = makeState();
    const cardId = state.host.hand[0];
    const next = evolve(state, { type: "NORMAL_SUMMONED", seat: "host", cardId, position: 1 });
    expect(next.host.board).toHaveLength(1);
    expect(next.host.board[0].cardId).toBe(cardId);
    expect(next.host.board[0].position).toBe(1);
    expect(next.host.hand).not.toContain(cardId);
    expect(next.host.normalSummonedThisTurn).toBe(true);
  });

  it("should handle LP_CHANGED", () => {
    const state = makeState();
    const next = evolve(state, { type: "LP_CHANGED", seat: "host", amount: -1000, newTotal: 7000 });
    expect(next.host.lifePoints).toBe(7000);
  });

  it("should handle CLOUT_CHANGED", () => {
    const state = makeState();
    const next = evolve(state, { type: "CLOUT_CHANGED", seat: "host", amount: 1, newTotal: 1 });
    expect(next.host.clout).toBe(1);
  });

  it("should handle CARD_TO_GRAVEYARD from board", () => {
    // First summon a monster
    const state = makeState();
    const cardId = state.host.hand[0];
    const withMonster = evolve(state, { type: "NORMAL_SUMMONED", seat: "host", cardId, position: 1 });
    // Then destroy it
    const next = evolve(withMonster, { type: "CARD_TO_GRAVEYARD", seat: "host", cardId, from: "board" });
    expect(next.host.board.find((m) => m.cardId === cardId)).toBeUndefined();
    expect(next.host.graveyard).toContain(cardId);
  });

  it("should handle VICE_COUNTER_ADDED", () => {
    const state = makeState();
    const cardId = state.host.hand[0];
    const withMonster = evolve(state, { type: "NORMAL_SUMMONED", seat: "host", cardId, position: 1 });
    const next = evolve(withMonster, { type: "VICE_COUNTER_ADDED", seat: "host", cardId, newCount: 1 });
    expect(next.host.board[0].viceCounters).toBe(1);
  });

  it("should handle BREAKDOWN_TRIGGERED", () => {
    const state = makeState();
    const cardId = state.host.hand[0];
    const withMonster = evolve(state, { type: "NORMAL_SUMMONED", seat: "host", cardId, position: 1 });
    // Breakdown sends card to GY and credits opponent
    const next = evolve(withMonster, { type: "BREAKDOWN_TRIGGERED", seat: "host", cardId });
    expect(next.host.board.find((m) => m.cardId === cardId)).toBeUndefined();
    expect(next.host.graveyard).toContain(cardId);
    expect(next.away.breakdownsCaused).toBe(1);
  });

  it("should handle GAME_ENDED", () => {
    const state = makeState();
    const next = evolve(state, { type: "GAME_ENDED", winner: "host", reason: "lp_zero" });
    expect(next.status).toBe("ended");
    expect(next.winner).toBe("host");
    expect(next.endReason).toBe("lp_zero");
  });

  it("should apply multiple events in sequence", () => {
    const state = makeState();
    const events: EngineEvent[] = [
      { type: "PHASE_CHANGED", phase: "main" },
      { type: "CLOUT_CHANGED", seat: "host", amount: 1, newTotal: 1 },
    ];
    const next = events.reduce((s, e) => evolve(s, e), state);
    expect(next.phase).toBe("main");
    expect(next.host.clout).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/engine && npx vitest run src/evolve.test.ts
```

**Step 3: Implement evolve.ts**

```typescript
import type {
  GameState,
  SeatState,
  BoardMonster,
  EngineEvent,
  Seat,
} from "./types.js";

/** Deep-clone helper for immutability */
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/** Get a mutable copy of the seat state */
function mutateSeat(state: GameState, seat: Seat): { next: GameState; seatState: SeatState } {
  const next = clone(state);
  return { next, seatState: seat === "host" ? next.host : next.away };
}

export function evolve(state: GameState, event: EngineEvent): GameState {
  switch (event.type) {
    case "PHASE_CHANGED": {
      const next = clone(state);
      next.phase = event.phase;
      return next;
    }

    case "TURN_STARTED": {
      const next = clone(state);
      next.currentTurn = event.seat;
      next.turnNumber = event.turnNumber;
      next.host.normalSummonedThisTurn = false;
      next.away.normalSummonedThisTurn = false;
      // Reset hasAttacked and hasChangedPosition on all monsters
      for (const m of next.host.board) {
        m.hasAttacked = false;
        m.hasChangedPosition = false;
      }
      for (const m of next.away.board) {
        m.hasAttacked = false;
        m.hasChangedPosition = false;
      }
      return next;
    }

    case "CARD_DRAWN": {
      const { next, seatState } = mutateSeat(state, event.seat);
      const idx = seatState.deck.indexOf(event.cardId);
      if (idx !== -1) {
        seatState.deck.splice(idx, 1);
      } else if (seatState.deck.length > 0) {
        seatState.deck.shift(); // fallback: remove top
      }
      seatState.hand.push(event.cardId);
      return next;
    }

    case "NORMAL_SUMMONED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.hand = seatState.hand.filter((id) => id !== event.cardId);
      seatState.board.push(createBoardMonster(event.cardId, event.position, next.turnNumber));
      seatState.normalSummonedThisTurn = true;
      return next;
    }

    case "MONSTER_SET": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.hand = seatState.hand.filter((id) => id !== event.cardId);
      const monster = createBoardMonster(event.cardId, -1, next.turnNumber);
      monster.isFaceDown = true;
      seatState.board.push(monster);
      seatState.normalSummonedThisTurn = true;
      return next;
    }

    case "FLIP_SUMMONED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      const monster = seatState.board.find((m) => m.cardId === event.cardId);
      if (monster) {
        monster.isFaceDown = false;
        monster.position = 1;
      }
      return next;
    }

    case "TRIBUTE_PAID": {
      const { next, seatState } = mutateSeat(state, event.seat);
      for (const id of event.tributeIds) {
        const idx = seatState.board.findIndex((m) => m.cardId === id);
        if (idx !== -1) {
          seatState.board.splice(idx, 1);
          seatState.graveyard.push(id);
        }
      }
      return next;
    }

    case "SPECIAL_SUMMONED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      // Remove from hand if present
      seatState.hand = seatState.hand.filter((id) => id !== event.cardId);
      // Remove from graveyard if present
      seatState.graveyard = seatState.graveyard.filter((id) => id !== event.cardId);
      seatState.board.push(createBoardMonster(event.cardId, event.position, next.turnNumber));
      return next;
    }

    case "SPELL_TRAP_SET": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.hand = seatState.hand.filter((id) => id !== event.cardId);
      seatState.spellTrapZone.push({
        cardId: event.cardId,
        isFaceDown: true,
        isActivated: false,
        turnSet: next.turnNumber,
      });
      return next;
    }

    case "SPELL_ACTIVATED":
    case "TRAP_ACTIVATED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      const card = seatState.spellTrapZone.find((c) => c.cardId === event.cardId);
      if (card) {
        card.isFaceDown = false;
        card.isActivated = true;
      }
      return next;
    }

    case "EFFECT_ACTIVATED": {
      // Effects don't change state directly — side effects are separate events
      return clone(state);
    }

    case "ATTACK_DECLARED": {
      const next = clone(state);
      next.pendingAction = {
        type: "attack",
        attackerId: event.attackerId,
        targetId: event.targetId,
      };
      return next;
    }

    case "DAMAGE_DEALT": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.lifePoints = Math.max(0, seatState.lifePoints - event.amount);
      return next;
    }

    case "CARD_DESTROYED": {
      const next = clone(state);
      // Find card on either board and move to graveyard
      for (const seat of ["host", "away"] as const) {
        const seatState = next[seat];
        const boardIdx = seatState.board.findIndex((m) => m.cardId === event.cardId);
        if (boardIdx !== -1) {
          seatState.board.splice(boardIdx, 1);
          seatState.graveyard.push(event.cardId);
          break;
        }
        const stIdx = seatState.spellTrapZone.findIndex((c) => c.cardId === event.cardId);
        if (stIdx !== -1) {
          seatState.spellTrapZone.splice(stIdx, 1);
          seatState.graveyard.push(event.cardId);
          break;
        }
      }
      return next;
    }

    case "POSITION_CHANGED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      const monster = seatState.board.find((m) => m.cardId === event.cardId);
      if (monster) {
        monster.position = event.newPosition;
        monster.hasChangedPosition = true;
      }
      return next;
    }

    case "CARD_TO_GRAVEYARD": {
      const { next, seatState } = mutateSeat(state, event.seat);
      removeCardFromZone(seatState, event.cardId, event.from);
      seatState.graveyard.push(event.cardId);
      return next;
    }

    case "CARD_TO_HAND": {
      const { next, seatState } = mutateSeat(state, event.seat);
      removeCardFromZone(seatState, event.cardId, event.from);
      seatState.hand.push(event.cardId);
      return next;
    }

    case "CARD_BANISHED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      removeCardFromZone(seatState, event.cardId, event.from);
      seatState.banished.push(event.cardId);
      return next;
    }

    case "CARD_TO_DECK": {
      const { next, seatState } = mutateSeat(state, event.seat);
      removeCardFromZone(seatState, event.cardId, "graveyard");
      if (event.position === "top") {
        seatState.deck.unshift(event.cardId);
      } else if (event.position === "bottom") {
        seatState.deck.push(event.cardId);
      } else {
        // shuffle — just add and shuffle
        seatState.deck.push(event.cardId);
        for (let i = seatState.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [seatState.deck[i], seatState.deck[j]] = [seatState.deck[j], seatState.deck[i]];
        }
      }
      return next;
    }

    case "LP_CHANGED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.lifePoints = event.newTotal;
      return next;
    }

    case "CLOUT_CHANGED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.clout = event.newTotal;
      return next;
    }

    case "VICE_COUNTER_ADDED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      const monster = seatState.board.find((m) => m.cardId === event.cardId);
      if (monster) {
        monster.viceCounters = event.newCount;
      }
      return next;
    }

    case "BREAKDOWN_TRIGGERED": {
      const next = clone(state);
      const seatState = next[event.seat];
      const otherSeatState = event.seat === "host" ? next.away : next.host;
      const idx = seatState.board.findIndex((m) => m.cardId === event.cardId);
      if (idx !== -1) {
        seatState.board.splice(idx, 1);
        seatState.graveyard.push(event.cardId);
      }
      otherSeatState.breakdownsCaused += 1;
      return next;
    }

    case "BREAKDOWN_WIN": {
      const next = clone(state);
      next.status = "ended";
      next.winner = event.winner;
      next.endReason = "breakdown";
      return next;
    }

    case "GAME_STARTED": {
      return clone(state); // State already initialized
    }

    case "GAME_ENDED": {
      const next = clone(state);
      next.status = "ended";
      next.winner = event.winner;
      next.endReason = event.reason;
      return next;
    }

    case "CHAIN_LINK_ADDED": {
      const next = clone(state);
      // Chain links are managed by the decide function
      return next;
    }

    case "CHAIN_RESOLVING":
    case "CHAIN_RESOLVED":
    case "ACTIVATION_NEGATED": {
      return clone(state);
    }

    case "HAND_DISCARDED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      seatState.hand = seatState.hand.filter((id) => id !== event.cardId);
      seatState.graveyard.push(event.cardId);
      return next;
    }

    case "DECK_SHUFFLED": {
      const { next, seatState } = mutateSeat(state, event.seat);
      for (let i = seatState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seatState.deck[i], seatState.deck[j]] = [seatState.deck[j], seatState.deck[i]];
      }
      return next;
    }

    default: {
      // Unknown event — return unchanged clone
      return clone(state);
    }
  }
}

// =============================================================================
// Helpers
// =============================================================================

function createBoardMonster(cardId: string, position: 1 | -1, turnNumber: number): BoardMonster {
  return {
    cardId,
    position,
    attack: 0, // Will be set by card data lookup in decide()
    defense: 0,
    hasAttacked: false,
    isFaceDown: false,
    hasChangedPosition: false,
    turnSummoned: turnNumber,
    viceCounters: 0,
    equippedCards: [],
  };
}

function removeCardFromZone(seat: SeatState, cardId: string, from: string) {
  switch (from) {
    case "hand":
      seat.hand = seat.hand.filter((id) => id !== cardId);
      break;
    case "board": {
      const idx = seat.board.findIndex((m) => m.cardId === cardId);
      if (idx !== -1) seat.board.splice(idx, 1);
      break;
    }
    case "spellTrapZone": {
      const idx = seat.spellTrapZone.findIndex((c) => c.cardId === cardId);
      if (idx !== -1) seat.spellTrapZone.splice(idx, 1);
      break;
    }
    case "graveyard":
      seat.graveyard = seat.graveyard.filter((id) => id !== cardId);
      break;
    case "banished":
      seat.banished = seat.banished.filter((id) => id !== cardId);
      break;
    case "deck":
      seat.deck = seat.deck.filter((id) => id !== cardId);
      break;
  }
}
```

**Step 4: Run tests**

```bash
cd packages/engine && npx vitest run src/evolve.test.ts
```
Expected: All PASS.

**Step 5: Update barrel export**

```typescript
export * from "./types.js";
export * from "./init.js";
export * from "./evolve.js";
```

**Step 6: Commit**

```bash
git add packages/engine/src/evolve.ts packages/engine/src/evolve.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): implement evolve reducer — pure state transitions for all event types"
```

---

## Task 5: Implement `mask.ts` — Player View Masking

**Files:**
- Create: `packages/engine/src/mask.ts`
- Create: `packages/engine/src/mask.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { mask } from "./mask";
import { createInitialState } from "./init";
import { evolve } from "./evolve";
import type { GameState } from "./types";

function makeState(): GameState {
  return createInitialState({
    hostId: "p1",
    awayId: "p2",
    hostDeck: Array.from({ length: 30 }, (_, i) => `hc_${i}`),
    awayDeck: Array.from({ length: 30 }, (_, i) => `ac_${i}`),
    seed: 42,
  });
}

describe("mask", () => {
  it("should show my hand cards fully", () => {
    const state = makeState();
    const view = mask(state, "host");
    expect(view.myHand.length).toBeGreaterThan(0);
    expect(typeof view.myHand[0]).toBe("string");
  });

  it("should show opponent hand as count only", () => {
    const state = makeState();
    const view = mask(state, "host");
    expect(view.opponentHand).toBe(state.away.hand.length);
  });

  it("should show both decks as count only", () => {
    const state = makeState();
    const view = mask(state, "host");
    expect(view.myDeck).toBe(state.host.deck.length);
    expect(view.opponentDeck).toBe(state.away.deck.length);
  });

  it("should hide opponent face-down monster cardId", () => {
    let state = makeState();
    // Set a monster face-down for away player
    state = evolve(state, { type: "MONSTER_SET", seat: "away", cardId: state.away.hand[0] });
    const view = mask(state, "host");
    expect(view.opponentBoard[0].isFaceDown).toBe(true);
    expect(view.opponentBoard[0].cardId).toBeUndefined();
    expect(view.opponentBoard[0].attack).toBeUndefined();
  });

  it("should show my own face-down monster cardId", () => {
    let state = makeState();
    state = evolve(state, { type: "MONSTER_SET", seat: "host", cardId: state.host.hand[0] });
    const view = mask(state, "host");
    expect(view.myBoard[0].isFaceDown).toBe(true);
    expect(view.myBoard[0].cardId).toBeDefined();
  });

  it("should show public zones fully (graveyard, banished)", () => {
    const state = makeState();
    const view = mask(state, "host");
    expect(view.myGraveyard).toEqual(state.host.graveyard);
    expect(view.opponentGraveyard).toEqual(state.away.graveyard);
    expect(view.myBanished).toEqual(state.host.banished);
    expect(view.opponentBanished).toEqual(state.away.banished);
  });

  it("should show life points and clout for both players", () => {
    const state = makeState();
    const view = mask(state, "host");
    expect(view.myLifePoints).toBe(8000);
    expect(view.opponentLifePoints).toBe(8000);
    expect(view.myClout).toBe(0);
    expect(view.opponentClout).toBe(0);
  });

  it("should show isMyTurn correctly", () => {
    const state = makeState();
    expect(mask(state, "host").isMyTurn).toBe(true);
    expect(mask(state, "away").isMyTurn).toBe(false);
  });

  it("should map winner to me/opponent", () => {
    let state = makeState();
    state = evolve(state, { type: "GAME_ENDED", winner: "host", reason: "lp_zero" });
    expect(mask(state, "host").winner).toBe("me");
    expect(mask(state, "away").winner).toBe("opponent");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd packages/engine && npx vitest run src/mask.test.ts
```

**Step 3: Implement mask.ts**

```typescript
import type {
  GameState,
  Seat,
  PlayerViewState,
  PlayerViewMonster,
  PlayerViewSpellTrap,
  SeatState,
  BoardMonster,
  BoardSpellTrap,
} from "./types.js";
import { otherSeat } from "./types.js";

export function mask(state: GameState, seat: Seat): PlayerViewState {
  const my = state[seat];
  const opp = state[otherSeat(seat)];

  return {
    // My full state
    myHand: [...my.hand],
    myDeck: my.deck.length,
    myBoard: my.board.map((m) => maskMonster(m, true)),
    mySpellTrapZone: my.spellTrapZone.map((c) => maskSpellTrap(c, true)),
    myFieldSpell: my.fieldSpell ? { ...my.fieldSpell } : undefined,
    myGraveyard: [...my.graveyard],
    myBanished: [...my.banished],
    myLifePoints: my.lifePoints,
    myClout: my.clout,
    myBreakdownsCaused: my.breakdownsCaused,
    myNormalSummonedThisTurn: my.normalSummonedThisTurn,

    // Opponent masked state
    opponentHand: opp.hand.length,
    opponentDeck: opp.deck.length,
    opponentBoard: opp.board.map((m) => maskMonster(m, false)),
    opponentSpellTrapZone: opp.spellTrapZone.map((c) => maskSpellTrap(c, false)),
    opponentFieldSpell: opp.fieldSpell ? { ...opp.fieldSpell } : undefined,
    opponentGraveyard: [...opp.graveyard],
    opponentBanished: [...opp.banished],
    opponentLifePoints: opp.lifePoints,
    opponentClout: opp.clout,
    opponentBreakdownsCaused: opp.breakdownsCaused,

    // Game metadata
    isMyTurn: state.currentTurn === seat,
    turnNumber: state.turnNumber,
    phase: state.phase,
    status: state.status,
    winner: state.winner
      ? state.winner === seat
        ? "me"
        : "opponent"
      : undefined,

    // Pending decisions
    pendingOptionalTriggers: state.pendingOptionalTriggers.filter((t) => t.seat === seat),
    hasResponseWindow: state.responseWindow?.activePlayerId === state[seat].playerId,
    hasPendingReplay: state.pendingReplay?.attackerSeat === seat,
  };
}

function maskMonster(m: BoardMonster, isOwner: boolean): PlayerViewMonster {
  if (m.isFaceDown && !isOwner) {
    return {
      cardId: undefined,
      position: m.position,
      attack: undefined,
      defense: undefined,
      isFaceDown: true,
      hasAttacked: m.hasAttacked,
      viceCounters: m.viceCounters,
      isToken: m.isToken,
    };
  }

  return {
    cardId: m.cardId,
    position: m.position,
    attack: m.attack,
    defense: m.defense,
    isFaceDown: m.isFaceDown,
    hasAttacked: m.hasAttacked,
    viceCounters: m.viceCounters,
    cannotBeTargeted: m.cannotBeTargeted,
    isToken: m.isToken,
  };
}

function maskSpellTrap(c: BoardSpellTrap, isOwner: boolean): PlayerViewSpellTrap {
  if (c.isFaceDown && !isOwner) {
    return {
      cardId: undefined,
      isFaceDown: true,
      isActivated: false,
    };
  }

  return {
    cardId: c.cardId,
    isFaceDown: c.isFaceDown,
    isActivated: c.isActivated,
  };
}
```

**Step 4: Run tests**

```bash
cd packages/engine && npx vitest run src/mask.test.ts
```
Expected: All PASS.

**Step 5: Update barrel export and commit**

```bash
git add packages/engine/src/mask.ts packages/engine/src/mask.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): implement player view masking — hides opponent's hidden info"
```

---

## Task 6: Implement Rules — Summoning Validation

**Files:**
- Create: `packages/engine/src/rules/summoning.ts`
- Create: `packages/engine/src/rules/summoning.test.ts`

Port summoning validation from `convex/gameplay/summonValidator.ts`:
- Level 1-6: 0 tributes
- Level 7+: 1 tribute
- Max 3 stereotypes on board
- One normal summon per turn
- Main phase only

**Step 1: Write failing test**

```typescript
import { describe, it, expect } from "vitest";
import { validateSummon, validateSetMonster, validateFlipSummon } from "./summoning";
import { createInitialState } from "../init";
import { evolve } from "../evolve";
import type { CardData, CardLookup, GameState } from "../types";

const mockCard = (overrides: Partial<CardData> = {}): CardData => ({
  id: "card_1",
  name: "Test Stereotype",
  cardType: "stereotype",
  level: 4,
  attack: 1800,
  defense: 1200,
  cost: 4,
  ...overrides,
});

const lookup: CardLookup = (id) => mockCard({ id, level: parseInt(id.split("_")[1]) || 4 });

function makeState(): GameState {
  return createInitialState({
    hostId: "p1",
    awayId: "p2",
    hostDeck: Array.from({ length: 30 }, (_, i) => `hc_${i}`),
    awayDeck: Array.from({ length: 30 }, (_, i) => `ac_${i}`),
    seed: 42,
  });
}

describe("validateSummon", () => {
  it("should allow summoning a level 4 stereotype with no tributes", () => {
    const state = makeState();
    state.phase = "main";
    const cardId = state.host.hand[0];
    const result = validateSummon(state, "host", cardId, "attack", lookup);
    expect(result.valid).toBe(true);
  });

  it("should reject summoning when not in main phase", () => {
    const state = makeState();
    state.phase = "combat";
    const result = validateSummon(state, "host", state.host.hand[0], "attack", lookup);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("main phase");
  });

  it("should reject summoning when already summoned this turn", () => {
    const state = makeState();
    state.phase = "main";
    state.host.normalSummonedThisTurn = true;
    const result = validateSummon(state, "host", state.host.hand[0], "attack", lookup);
    expect(result.valid).toBe(false);
  });

  it("should reject summoning when board is full (3 stereotypes)", () => {
    const state = makeState();
    state.phase = "main";
    // Fill board
    for (let i = 0; i < 3; i++) {
      state.host.board.push({
        cardId: `fill_${i}`, position: 1, attack: 1000, defense: 1000,
        hasAttacked: false, isFaceDown: false, hasChangedPosition: false,
        turnSummoned: 1, viceCounters: 0, equippedCards: [],
      });
    }
    const result = validateSummon(state, "host", state.host.hand[0], "attack", lookup);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("full");
  });

  it("should reject summoning a card not in hand", () => {
    const state = makeState();
    state.phase = "main";
    const result = validateSummon(state, "host", "nonexistent", "attack", lookup);
    expect(result.valid).toBe(false);
  });

  it("should require 1 tribute for level 7+ stereotypes", () => {
    const state = makeState();
    state.phase = "main";
    state.host.hand.push("lvl_7");
    const highLvlLookup: CardLookup = (id) =>
      id === "lvl_7" ? mockCard({ id, level: 7 }) : mockCard({ id });
    const result = validateSummon(state, "host", "lvl_7", "attack", highLvlLookup);
    // Should fail because no tributes available
    expect(result.valid).toBe(false);
    expect(result.error).toContain("tribute");
  });

  it("should allow level 7+ with 1 tribute available", () => {
    const state = makeState();
    state.phase = "main";
    state.host.hand.push("lvl_7");
    state.host.board.push({
      cardId: "tribute_1", position: 1, attack: 1000, defense: 1000,
      hasAttacked: false, isFaceDown: false, hasChangedPosition: false,
      turnSummoned: 0, viceCounters: 0, equippedCards: [],
    });
    const highLvlLookup: CardLookup = (id) =>
      id === "lvl_7" ? mockCard({ id, level: 7 }) : mockCard({ id });
    const result = validateSummon(state, "host", "lvl_7", "attack", highLvlLookup);
    expect(result.valid).toBe(true);
    expect(result.tributesRequired).toBe(1);
  });
});
```

**Step 2: Run test to verify failure, then implement**

Create `packages/engine/src/rules/summoning.ts`:

```typescript
import type { GameState, Seat, CardLookup } from "../types.js";

const MAX_STEREOTYPES = 3;

interface ValidationResult {
  valid: boolean;
  error?: string;
  tributesRequired?: number;
  validTributes?: string[];
}

export function validateSummon(
  state: GameState,
  seat: Seat,
  cardId: string,
  position: "attack" | "defense",
  lookup: CardLookup
): ValidationResult {
  const seatState = state[seat];

  // Phase check
  if (state.phase !== "main") {
    return { valid: false, error: "Can only summon during main phase" };
  }

  // Turn check
  if (state.currentTurn !== seat) {
    return { valid: false, error: "Not your turn" };
  }

  // Already summoned
  if (seatState.normalSummonedThisTurn) {
    return { valid: false, error: "Already normal summoned this turn" };
  }

  // Card in hand check
  if (!seatState.hand.includes(cardId)) {
    return { valid: false, error: "Card not in hand" };
  }

  // Card data
  const card = lookup(cardId);
  if (!card) {
    return { valid: false, error: "Card data not found" };
  }

  if (card.cardType !== "stereotype") {
    return { valid: false, error: "Only stereotypes can be normal summoned" };
  }

  // Tribute requirements: L1-6 = 0, L7+ = 1
  const level = card.level ?? 1;
  const tributesRequired = level >= 7 ? 1 : 0;

  // Board space check (after tributes)
  const boardAfterTributes = seatState.board.length - tributesRequired + 1;
  if (boardAfterTributes > MAX_STEREOTYPES) {
    return { valid: false, error: "Stereotype zone is full (max 3)" };
  }

  // Tribute availability
  if (tributesRequired > 0) {
    const validTributes = seatState.board
      .filter((m) => !m.isFaceDown || true) // Can tribute face-down
      .map((m) => m.cardId);

    if (validTributes.length < tributesRequired) {
      return { valid: false, error: `Need ${tributesRequired} tribute(s) but only have ${validTributes.length} stereotype(s)` };
    }

    return { valid: true, tributesRequired, validTributes };
  }

  return { valid: true, tributesRequired: 0 };
}

export function validateSetMonster(
  state: GameState,
  seat: Seat,
  cardId: string,
  lookup: CardLookup
): ValidationResult {
  // Same rules as normal summon (shares the 1/turn limit)
  return validateSummon(state, seat, cardId, "defense", lookup);
}

export function validateFlipSummon(
  state: GameState,
  seat: Seat,
  cardId: string
): ValidationResult {
  const seatState = state[seat];

  if (state.phase !== "main") {
    return { valid: false, error: "Can only flip summon during main phase" };
  }

  if (state.currentTurn !== seat) {
    return { valid: false, error: "Not your turn" };
  }

  const monster = seatState.board.find((m) => m.cardId === cardId);
  if (!monster) {
    return { valid: false, error: "Card not on board" };
  }

  if (!monster.isFaceDown) {
    return { valid: false, error: "Card is already face-up" };
  }

  // Cannot flip summon on the turn it was set
  if (monster.turnSummoned === state.turnNumber) {
    return { valid: false, error: "Cannot flip summon on the turn a card was set" };
  }

  return { valid: true };
}
```

**Step 3: Run tests, update exports, commit**

```bash
cd packages/engine && npx vitest run src/rules/summoning.test.ts
git add packages/engine/src/rules/
git commit -m "feat(engine): implement summoning validation — tribute rules, zone limits, phase checks"
```

---

## Task 7: Implement Rules — Combat Resolution

**Files:**
- Create: `packages/engine/src/rules/combat.ts`
- Create: `packages/engine/src/rules/combat.test.ts`

Port combat logic from `convex/gameplay/combatSystem.ts`:
- ATK vs ATK: higher wins, damage = difference
- ATK vs DEF: ATK > DEF destroys defender, no damage unless piercing
- Direct attack: full ATK damage
- Summoning sickness (cannot attack turn summoned)
- Turn 1 no-attack rule

**Step 1: Write test, implement, verify, commit**

Test covers: valid attack declaration, direct attack when field empty, cannot attack if summoned this turn, ATK vs ATK resolution, ATK vs DEF resolution, turn 1 no-attack.

Implementation produces `EngineEvent[]` for each combat scenario.

```bash
git commit -m "feat(engine): implement combat resolution — damage calc, battle destruction, direct attacks"
```

---

## Task 8: Implement Rules — Phase Transitions & Clout

**Files:**
- Create: `packages/engine/src/rules/phases.ts`
- Create: `packages/engine/src/rules/phases.test.ts`

The 5-phase system: draw → main → combat → breakdown_check → end.

Key rules:
- Draw phase: auto-draw 1 card, increment clout by 1
- Main phase: interactive (summon, set, activate)
- Combat phase: interactive (declare attacks)
- Breakdown check: auto-check vice counters
- End phase: cleanup, discard to hand limit, advance to next turn

```bash
git commit -m "feat(engine): implement phase transitions — 5-phase system with clout increment"
```

---

## Task 9: Implement Rules — Vice & Breakdown

**Files:**
- Create: `packages/engine/src/rules/vice.ts`
- Create: `packages/engine/src/rules/vice.test.ts`

Port from `convex/gameplay/gameEngine/viceSystem.ts`:
- Vice counters tracked per stereotype
- Threshold = 3 → forced breakdown
- Breakdown: card to graveyard, opponent gets credit
- 3 breakdowns caused = win condition

```bash
git commit -m "feat(engine): implement vice counter system — breakdown triggers and win condition"
```

---

## Task 10: Implement `decide.ts` — Command Orchestrator

**Files:**
- Create: `packages/engine/src/decide.ts`
- Create: `packages/engine/src/decide.test.ts`

The decide function is the main orchestrator: validate command → produce events.

```typescript
export function decide(
  state: GameState,
  command: Command,
  lookup: CardLookup
): { events: EngineEvent[]; error?: string }
```

This calls into the rules modules (summoning, combat, phases, vice) and produces the complete event batch for a single command.

Tests cover: each command type produces correct events, invalid commands return errors, state-based actions (LP check, breakdown check) fire automatically after each command.

```bash
git commit -m "feat(engine): implement decide orchestrator — validates commands and produces event batches"
```

---

## Task 11: Scaffold `@lunchtable-tcg/match` Convex Component

**Files:**
- Create: `packages/lunchtable-tcg-match/package.json`
- Create: `packages/lunchtable-tcg-match/tsconfig.json`
- Create: `packages/lunchtable-tcg-match/tsconfig.build.json`
- Create: `packages/lunchtable-tcg-match/src/component/convex.config.ts`
- Create: `packages/lunchtable-tcg-match/src/component/schema.ts`
- Create: `packages/lunchtable-tcg-match/src/client/index.ts`

Follow `@lunchtable-tcg/social` pattern exactly:
- `defineComponent("lunchtable_tcg_match")`
- Same package.json export structure
- Same tsconfig.build.json pattern

```bash
git commit -m "feat(match): scaffold @lunchtable-tcg/match Convex component"
```

---

## Task 12: Define Match Schema

**File:** `packages/lunchtable-tcg-match/src/component/schema.ts`

Four tables:

1. **matches** — Match metadata (status, players, mode, winner)
2. **matchSnapshots** — Materialized GameState (the source of truth)
3. **matchEvents** — Append-only event log (for replays/animations)
4. **matchPrompts** — Pending player decisions

Indexes: by_matchId on all tables, by_status on matches, by_version on snapshots/events.

```bash
git commit -m "feat(match): define schema — matches, snapshots, events, prompts tables"
```

---

## Task 13: Implement Match Mutations

**Files:**
- Create: `packages/lunchtable-tcg-match/src/component/mutations.ts`

Core mutation: `submitAction`

```
1. Load latest matchSnapshot by matchId
2. Validate the command is from the correct player
3. Call engine.decide(state, command, lookup)
4. If error, throw
5. Call engine.evolve(state, events) for each event
6. Save new matchSnapshot (version + 1)
7. Append matchEvents batch
8. Return events
```

Also: `createMatch`, `startMatch` mutations.

```bash
git commit -m "feat(match): implement submitAction mutation — decide/evolve/persist loop"
```

---

## Task 14: Implement Match Queries

**Files:**
- Create: `packages/lunchtable-tcg-match/src/component/queries.ts`

Queries:
- `getMatchMeta(matchId)` — Status, players, mode
- `getPlayerView(matchId, playerId)` — Load snapshot, call `mask(state, seat)`, return PlayerViewState
- `getRecentEvents(matchId, sinceVersion)` — Return events after version N
- `getOpenPrompt(matchId, playerId)` — Pending optional triggers or chain responses

```bash
git commit -m "feat(match): implement queries — getPlayerView with server-side masking"
```

---

## Task 15: Implement Client Class

**File:** `packages/lunchtable-tcg-match/src/client/index.ts`

Follow `LTCGSocial` pattern:

```typescript
export class LTCGMatch {
  constructor(private component: typeof api) {}

  async submitAction(ctx: RunMutationCtx, args: {...}) { ... }
  async createMatch(ctx: RunMutationCtx, args: {...}) { ... }
  async getPlayerView(ctx: RunQueryCtx, args: {...}) { ... }
  async getRecentEvents(ctx: RunQueryCtx, args: {...}) { ... }
  async getOpenPrompt(ctx: RunQueryCtx, args: {...}) { ... }
}
```

```bash
git commit -m "feat(match): implement LTCGMatch client class"
```

---

## Task 16: Register Component & Integration

**Files:**
- Modify: `convex/convex.config.ts` — Add `app.use(ltcgMatch)`
- Modify: Root `package.json` — Add workspace reference

Register `@lunchtable-tcg/match` as a Convex component and wire it into the app.

```bash
git commit -m "feat(match): register component in convex.config.ts"
```

---

## Task 17: Integration Test — Full Game Loop

**Files:**
- Create: `packages/engine/src/integration.test.ts`

End-to-end test that plays a complete game using only the engine:

1. `createInitialState()` with two decks
2. Draw phase → main phase (phase transitions via decide)
3. Summon a stereotype
4. Enter combat → declare attack → direct damage
5. End turn
6. Repeat until LP reaches 0
7. Verify GAME_ENDED event fires

This validates the full decide/evolve loop works for a real game.

```bash
git commit -m "test(engine): add integration test — full game loop from start to LP win"
```

---

## Verification Checklist

After all tasks:

1. `cd packages/engine && npx vitest run` — All engine tests pass
2. `cd packages/engine && npx tsc --noEmit` — Types compile
3. `cd packages/lunchtable-tcg-match && npx tsc --noEmit` — Component compiles
4. `npx tsc --noEmit` from root — Full project compiles
5. `bun test:convex` — Existing Convex tests still pass (no regressions)

---

## Out of Scope (Future Tasks)

- TanStack Start migration (separate plan)
- Effect system port (complex — uses JSON ability format, needs separate detailed plan)
- Chain/priority system port (depends on effect system)
- Agent REST API integration with new match component
- Migration of existing games from old `gameStates` to new `matchSnapshots`
