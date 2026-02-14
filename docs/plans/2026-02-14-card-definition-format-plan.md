# Phase 3: Card Definition Format — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize the card definition format so white-label operators can author cards as JSON/TS files, validate them against the engine schema, and load them into both the engine and Convex database.

**Architecture:** Extend the engine's `CardDefinition` to include optional game-specific fields (viceType, flavorText, imageUrl) as a `meta` bag, add a `loadCards()` function that reads JSON files from a directory, add validation with clear error messages, and create a card seeder that imports validated cards into Convex.

**Tech Stack:** TypeScript 5.7+, `@lunchtable-tcg/engine`, Vitest

---

## Task 1: Extend CardDefinition with game metadata fields

**Files:**
- Modify: `packages/engine/src/types/cards.ts`
- Modify: `packages/engine/src/__tests__/cards.test.ts`

The current `CardDefinition` has the core gameplay fields but lacks game-specific metadata that white-label operators need: vice type, flavor text, image URL, cost, archetype color. Rather than polluting the core interface, add an optional `meta` record.

**Step 1: Add meta field and viceType to CardDefinition**

In `packages/engine/src/types/cards.ts`, add after the `effects` field:

```typescript
export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  description: string;
  rarity: Rarity;
  attack?: number;
  defense?: number;
  level?: number;
  attribute?: Attribute;
  archetype?: string;
  spellType?: SpellType;
  trapType?: TrapType;
  effects?: EffectDefinition[];
  // Game metadata — not used by rules engine, carried for display/storage
  viceType?: string;
  flavorText?: string;
  imageUrl?: string;
  cost?: number;
  meta?: Record<string, unknown>;
}
```

**Step 2: Add validation test for meta fields**

In `packages/engine/src/__tests__/cards.test.ts`, add:

```typescript
it("accepts cards with optional meta fields", () => {
  const cards = defineCards([
    {
      id: "meta-test",
      name: "Meta Card",
      type: "stereotype",
      description: "Card with metadata",
      rarity: "common",
      attack: 1000,
      defense: 1000,
      level: 4,
      viceType: "gambling",
      flavorText: "A test card",
      cost: 1,
      meta: { custom: true },
    },
  ]);
  expect(cards["meta-test"]?.viceType).toBe("gambling");
  expect(cards["meta-test"]?.meta?.custom).toBe(true);
});
```

**Step 3: Run tests**

Run: `cd packages/engine && bun run test`
Expected: All tests pass (meta fields are optional, no validation changes needed)

**Step 4: Build**

Run: `cd packages/engine && bun run build`
Expected: Clean compile

**Step 5: Commit**

```bash
git add packages/engine/src/types/cards.ts packages/engine/src/__tests__/cards.test.ts
git commit -m "feat(engine): extend CardDefinition with game metadata fields"
```

---

## Task 2: Add comprehensive card validation

**Files:**
- Modify: `packages/engine/src/cards.ts`
- Modify: `packages/engine/src/__tests__/cards.test.ts`

Current `defineCards` only checks stereotypes for attack/defense/level. We need thorough validation for all card types to give operators clear error messages.

**Step 1: Write failing validation tests**

Add to `packages/engine/src/__tests__/cards.test.ts`:

```typescript
describe("card validation", () => {
  it("rejects spell without spellType", () => {
    expect(() =>
      defineCards([
        { id: "bad-spell", name: "Bad", type: "spell", description: "", rarity: "common" },
      ])
    ).toThrow('Spell "bad-spell" must have a spellType');
  });

  it("rejects trap without trapType", () => {
    expect(() =>
      defineCards([
        { id: "bad-trap", name: "Bad", type: "trap", description: "", rarity: "common" },
      ])
    ).toThrow('Trap "bad-trap" must have a trapType');
  });

  it("rejects stereotype with negative attack", () => {
    expect(() =>
      defineCards([
        {
          id: "neg-atk",
          name: "Bad",
          type: "stereotype",
          description: "",
          rarity: "common",
          attack: -100,
          defense: 1000,
          level: 4,
        },
      ])
    ).toThrow('Stereotype "neg-atk" attack must be non-negative');
  });

  it("rejects stereotype with level out of range", () => {
    expect(() =>
      defineCards([
        {
          id: "bad-level",
          name: "Bad",
          type: "stereotype",
          description: "",
          rarity: "common",
          attack: 1000,
          defense: 1000,
          level: 0,
        },
      ])
    ).toThrow('Stereotype "bad-level" level must be between 1 and 12');
  });

  it("rejects cards with empty name", () => {
    expect(() =>
      defineCards([
        { id: "no-name", name: "", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ])
    ).toThrow('Card "no-name" must have a name');
  });

  it("rejects cards with empty id", () => {
    expect(() =>
      defineCards([
        { id: "", name: "Test", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ])
    ).toThrow("Card must have an id");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/engine && bun run test`
Expected: New tests FAIL (validation not yet implemented)

**Step 3: Implement validation in defineCards**

Update `packages/engine/src/cards.ts`:

```typescript
import type { CardDefinition } from "./types/index.js";

export type CardLookup = Record<string, CardDefinition>;

function validateCard(card: CardDefinition): void {
  if (!card.id) {
    throw new Error("Card must have an id");
  }
  if (!card.name) {
    throw new Error(`Card "${card.id}" must have a name`);
  }

  switch (card.type) {
    case "stereotype":
      if (card.attack === undefined || card.defense === undefined) {
        throw new Error(`Stereotype "${card.id}" must have attack and defense`);
      }
      if (card.level === undefined) {
        throw new Error(`Stereotype "${card.id}" must have a level`);
      }
      if (card.attack < 0) {
        throw new Error(`Stereotype "${card.id}" attack must be non-negative`);
      }
      if (card.defense < 0) {
        throw new Error(`Stereotype "${card.id}" defense must be non-negative`);
      }
      if (card.level < 1 || card.level > 12) {
        throw new Error(`Stereotype "${card.id}" level must be between 1 and 12`);
      }
      break;
    case "spell":
      if (!card.spellType) {
        throw new Error(`Spell "${card.id}" must have a spellType`);
      }
      break;
    case "trap":
      if (!card.trapType) {
        throw new Error(`Trap "${card.id}" must have a trapType`);
      }
      break;
  }
}

export function defineCards(cards: CardDefinition[]): CardLookup {
  const lookup: CardLookup = {};
  for (const card of cards) {
    validateCard(card);
    if (lookup[card.id]) {
      throw new Error(`Duplicate card ID: ${card.id}`);
    }
    lookup[card.id] = card;
  }
  return lookup;
}
```

Keep `validateDeck` unchanged.

**Step 4: Run tests to verify they pass**

Run: `cd packages/engine && bun run test`
Expected: All tests PASS

**Step 5: Build**

Run: `cd packages/engine && bun run build`
Expected: Clean compile

**Step 6: Commit**

```bash
git add packages/engine/src/cards.ts packages/engine/src/__tests__/cards.test.ts
git commit -m "feat(engine): add comprehensive card validation for all card types"
```

---

## Task 3: Add loadCards — JSON file loader

**Files:**
- Create: `packages/engine/src/loader.ts`
- Modify: `packages/engine/src/index.ts`
- Create: `packages/engine/src/__tests__/loader.test.ts`
- Create: `packages/engine/src/__tests__/fixtures/sample-cards.json`

White-label operators define cards as JSON files in a `cards/` directory. The loader reads them, validates via `defineCards`, and returns a `CardLookup`.

**Step 1: Create test fixture**

Create `packages/engine/src/__tests__/fixtures/sample-cards.json`:

```json
[
  {
    "id": "test-warrior",
    "name": "Test Warrior",
    "type": "stereotype",
    "description": "A test stereotype",
    "rarity": "common",
    "attack": 1500,
    "defense": 1200,
    "level": 4,
    "attribute": "fire",
    "archetype": "dropout"
  },
  {
    "id": "test-spell",
    "name": "Test Spell",
    "type": "spell",
    "description": "A test spell",
    "rarity": "common",
    "spellType": "normal"
  },
  {
    "id": "test-trap",
    "name": "Test Trap",
    "type": "trap",
    "description": "A test trap",
    "rarity": "common",
    "trapType": "normal"
  }
]
```

**Step 2: Write failing test**

Create `packages/engine/src/__tests__/loader.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { loadCardsFromJSON, loadCardsFromArray } from "../loader.js";
import sampleCards from "./fixtures/sample-cards.json";

describe("loadCardsFromArray", () => {
  it("loads and validates an array of card objects", () => {
    const lookup = loadCardsFromArray(sampleCards);
    expect(Object.keys(lookup)).toHaveLength(3);
    expect(lookup["test-warrior"]?.attack).toBe(1500);
    expect(lookup["test-spell"]?.spellType).toBe("normal");
    expect(lookup["test-trap"]?.trapType).toBe("normal");
  });

  it("rejects invalid cards in array", () => {
    expect(() =>
      loadCardsFromArray([{ id: "bad", name: "Bad", type: "stereotype", description: "", rarity: "common" }])
    ).toThrow("must have attack and defense");
  });

  it("merges multiple arrays", () => {
    const set1 = [
      { id: "a", name: "A", type: "spell" as const, description: "", rarity: "common" as const, spellType: "normal" as const },
    ];
    const set2 = [
      { id: "b", name: "B", type: "trap" as const, description: "", rarity: "common" as const, trapType: "normal" as const },
    ];
    const lookup = loadCardsFromArray([...set1, ...set2]);
    expect(Object.keys(lookup)).toHaveLength(2);
  });
});

describe("loadCardsFromJSON", () => {
  it("loads cards from a JSON string", () => {
    const json = JSON.stringify(sampleCards);
    const lookup = loadCardsFromJSON(json);
    expect(Object.keys(lookup)).toHaveLength(3);
  });

  it("throws on invalid JSON", () => {
    expect(() => loadCardsFromJSON("not json")).toThrow();
  });

  it("throws on non-array JSON", () => {
    expect(() => loadCardsFromJSON('{"id":"test"}')).toThrow("must be an array");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/engine && bun run test`
Expected: FAIL — loader.ts doesn't exist

**Step 4: Implement loader**

Create `packages/engine/src/loader.ts`:

```typescript
import type { CardDefinition } from "./types/index.js";
import { defineCards } from "./cards.js";
import type { CardLookup } from "./cards.js";

/**
 * Load and validate cards from a plain object array.
 * This is the primary entry point for white-label operators
 * who define cards as JSON or TypeScript arrays.
 */
export function loadCardsFromArray(cards: CardDefinition[]): CardLookup {
  return defineCards(cards);
}

/**
 * Load and validate cards from a JSON string.
 * Parses the string, validates the structure, then delegates to defineCards.
 */
export function loadCardsFromJSON(json: string): CardLookup {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error("Card JSON must be an array of CardDefinition objects");
  }
  return defineCards(parsed as CardDefinition[]);
}
```

**Step 5: Export from index.ts**

Add to `packages/engine/src/index.ts`:

```typescript
export { loadCardsFromArray, loadCardsFromJSON } from "./loader.js";
```

**Step 6: Enable JSON imports in tsconfig**

Check `packages/engine/tsconfig.json` — ensure `resolveJsonModule: true` is set. If not, add it under `compilerOptions`.

**Step 7: Run tests**

Run: `cd packages/engine && bun run test`
Expected: All tests PASS

**Step 8: Build**

Run: `cd packages/engine && bun run build`
Expected: Clean compile

**Step 9: Commit**

```bash
git add packages/engine/src/loader.ts packages/engine/src/index.ts packages/engine/src/__tests__/loader.test.ts packages/engine/src/__tests__/fixtures/sample-cards.json packages/engine/tsconfig.json
git commit -m "feat(engine): add loadCardsFromArray and loadCardsFromJSON loaders"
```

---

## Task 4: Add card set organization — defineCardSet

**Files:**
- Create: `packages/engine/src/cardSet.ts`
- Modify: `packages/engine/src/index.ts`
- Create: `packages/engine/src/__tests__/cardSet.test.ts`

Card sets group cards thematically (like "Core Set", "Expansion 1"). Operators organize cards into sets for release management.

**Step 1: Write failing tests**

Create `packages/engine/src/__tests__/cardSet.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { defineCardSet, mergeCardSets } from "../cardSet.js";

describe("defineCardSet", () => {
  it("creates a card set with metadata", () => {
    const set = defineCardSet({
      id: "core",
      name: "Core Set",
      cards: [
        {
          id: "warrior-1",
          name: "Warrior",
          type: "stereotype",
          description: "A warrior",
          rarity: "common",
          attack: 1500,
          defense: 1200,
          level: 4,
        },
      ],
    });
    expect(set.id).toBe("core");
    expect(set.name).toBe("Core Set");
    expect(set.cardCount).toBe(1);
    expect(set.lookup["warrior-1"]?.name).toBe("Warrior");
  });

  it("validates all cards in the set", () => {
    expect(() =>
      defineCardSet({
        id: "bad",
        name: "Bad Set",
        cards: [
          { id: "x", name: "X", type: "stereotype", description: "", rarity: "common" },
        ],
      })
    ).toThrow("must have attack and defense");
  });
});

describe("mergeCardSets", () => {
  it("merges multiple sets into one lookup", () => {
    const set1 = defineCardSet({
      id: "core",
      name: "Core",
      cards: [
        { id: "a", name: "A", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ],
    });
    const set2 = defineCardSet({
      id: "exp1",
      name: "Expansion 1",
      cards: [
        { id: "b", name: "B", type: "trap", description: "", rarity: "common", trapType: "normal" },
      ],
    });
    const merged = mergeCardSets([set1, set2]);
    expect(Object.keys(merged)).toHaveLength(2);
    expect(merged["a"]).toBeDefined();
    expect(merged["b"]).toBeDefined();
  });

  it("rejects sets with duplicate card IDs", () => {
    const set1 = defineCardSet({
      id: "core",
      name: "Core",
      cards: [
        { id: "a", name: "A", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ],
    });
    const set2 = defineCardSet({
      id: "exp1",
      name: "Expansion 1",
      cards: [
        { id: "a", name: "A Copy", type: "spell", description: "", rarity: "common", spellType: "normal" },
      ],
    });
    expect(() => mergeCardSets([set1, set2])).toThrow('Duplicate card ID "a"');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/engine && bun run test`
Expected: FAIL

**Step 3: Implement cardSet**

Create `packages/engine/src/cardSet.ts`:

```typescript
import type { CardDefinition } from "./types/index.js";
import { defineCards } from "./cards.js";
import type { CardLookup } from "./cards.js";

export interface CardSetInput {
  id: string;
  name: string;
  description?: string;
  cards: CardDefinition[];
}

export interface CardSet {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
  lookup: CardLookup;
}

/**
 * Define a card set with metadata and validation.
 * All cards in the set are validated via defineCards.
 */
export function defineCardSet(input: CardSetInput): CardSet {
  const lookup = defineCards(input.cards);
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    cardCount: input.cards.length,
    lookup,
  };
}

/**
 * Merge multiple card sets into a single CardLookup.
 * Throws on duplicate card IDs across sets.
 */
export function mergeCardSets(sets: CardSet[]): CardLookup {
  const merged: CardLookup = {};
  for (const set of sets) {
    for (const [id, card] of Object.entries(set.lookup)) {
      if (merged[id]) {
        throw new Error(`Duplicate card ID "${id}" found when merging sets "${set.id}"`);
      }
      merged[id] = card;
    }
  }
  return merged;
}
```

**Step 4: Export from index.ts**

Add to `packages/engine/src/index.ts`:

```typescript
export { defineCardSet, mergeCardSets } from "./cardSet.js";
export type { CardSet, CardSetInput } from "./cardSet.js";
```

**Step 5: Run tests**

Run: `cd packages/engine && bun run test`
Expected: All tests PASS

**Step 6: Build**

Run: `cd packages/engine && bun run build`
Expected: Clean compile

**Step 7: Commit**

```bash
git add packages/engine/src/cardSet.ts packages/engine/src/index.ts packages/engine/src/__tests__/cardSet.test.ts
git commit -m "feat(engine): add defineCardSet and mergeCardSets for card organization"
```

---

## Task 5: Add Convex card seeder utility

**Files:**
- Create: `packages/engine/src/seeder.ts`
- Modify: `packages/engine/src/index.ts`
- Create: `packages/engine/src/__tests__/seeder.test.ts`

Operators need a function to convert engine `CardDefinition[]` into Convex `cardDefinitions` table rows. This is a pure mapping function (no Convex runtime dependency).

**Step 1: Write failing test**

Create `packages/engine/src/__tests__/seeder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { toConvexCardRows } from "../seeder.js";
import type { CardDefinition } from "../types/index.js";

describe("toConvexCardRows", () => {
  it("maps a stereotype to Convex row format", () => {
    const card: CardDefinition = {
      id: "warrior-1",
      name: "Test Warrior",
      type: "stereotype",
      description: "A test card",
      rarity: "common",
      attack: 1500,
      defense: 1200,
      level: 4,
      attribute: "fire",
      archetype: "dropout",
      viceType: "gambling",
      flavorText: "Flavor",
      cost: 1,
    };
    const rows = toConvexCardRows([card]);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.name).toBe("Test Warrior");
    expect(row.cardType).toBe("stereotype");
    expect(row.rarity).toBe("common");
    expect(row.attack).toBe(1500);
    expect(row.defense).toBe(1200);
    expect(row.level).toBe(4);
    expect(row.attribute).toBe("fire");
    expect(row.archetype).toBe("dropout");
    expect(row.viceType).toBe("gambling");
    expect(row.flavorText).toBe("Flavor");
    expect(row.cost).toBe(1);
    expect(row.isActive).toBe(true);
    expect(typeof row.createdAt).toBe("number");
  });

  it("maps a spell to Convex row format", () => {
    const card: CardDefinition = {
      id: "spell-1",
      name: "Test Spell",
      type: "spell",
      description: "A test spell",
      rarity: "rare",
      spellType: "continuous",
      cost: 2,
    };
    const rows = toConvexCardRows([card]);
    const row = rows[0]!;
    expect(row.cardType).toBe("spell");
    expect(row.spellType).toBe("continuous");
    expect(row.attack).toBeUndefined();
    expect(row.cost).toBe(2);
  });

  it("includes effects as ability JSON", () => {
    const card: CardDefinition = {
      id: "effect-card",
      name: "Effect Card",
      type: "spell",
      description: "Has effects",
      rarity: "common",
      spellType: "normal",
      effects: [
        {
          id: "eff1",
          type: "ignition",
          description: "Draw 2",
          actions: [{ type: "draw", count: 2 }],
        },
      ],
    };
    const rows = toConvexCardRows([card]);
    expect(rows[0]!.ability).toEqual(card.effects);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/engine && bun run test`
Expected: FAIL

**Step 3: Implement seeder**

Create `packages/engine/src/seeder.ts`:

```typescript
import type { CardDefinition } from "./types/index.js";

/**
 * Shape matching the Convex cardDefinitions table.
 * This is a plain object — no Convex runtime dependency.
 */
export interface ConvexCardRow {
  name: string;
  rarity: string;
  archetype: string;
  cardType: string;
  attack?: number;
  defense?: number;
  cost: number;
  level?: number;
  attribute?: string;
  spellType?: string;
  trapType?: string;
  viceType?: string;
  breakdownEffect?: unknown;
  breakdownFlavorText?: string;
  ability?: unknown;
  flavorText?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: number;
}

/**
 * Convert engine CardDefinition[] to Convex cardDefinitions row format.
 * Pure mapping function — does not touch the database.
 *
 * Usage in a Convex seed mutation:
 *   const rows = toConvexCardRows(cards);
 *   for (const row of rows) {
 *     await ctx.db.insert("cardDefinitions", row);
 *   }
 */
export function toConvexCardRows(cards: CardDefinition[]): ConvexCardRow[] {
  const now = Date.now();
  return cards.map((card) => ({
    name: card.name,
    rarity: card.rarity,
    archetype: card.archetype ?? "",
    cardType: card.type,
    attack: card.type === "stereotype" ? card.attack : undefined,
    defense: card.type === "stereotype" ? card.defense : undefined,
    cost: card.cost ?? 0,
    level: card.level,
    attribute: card.attribute,
    spellType: card.spellType,
    trapType: card.trapType,
    viceType: card.viceType,
    ability: card.effects,
    flavorText: card.flavorText,
    imageUrl: card.imageUrl,
    isActive: true,
    createdAt: now,
  }));
}
```

**Step 4: Export from index.ts**

Add to `packages/engine/src/index.ts`:

```typescript
export { toConvexCardRows } from "./seeder.js";
export type { ConvexCardRow } from "./seeder.js";
```

**Step 5: Run tests**

Run: `cd packages/engine && bun run test`
Expected: All tests PASS

**Step 6: Build**

Run: `cd packages/engine && bun run build`
Expected: Clean compile

**Step 7: Commit**

```bash
git add packages/engine/src/seeder.ts packages/engine/src/index.ts packages/engine/src/__tests__/seeder.test.ts
git commit -m "feat(engine): add toConvexCardRows utility for card seeding"
```

---

## Task 6: Create example card set for white-label reference

**Files:**
- Create: `packages/engine/src/__tests__/fixtures/example-card-set.ts`
- Modify: `packages/engine/src/__tests__/cards.test.ts`

Create a small but representative card set (6 cards, one per archetype) that serves as documentation for white-label operators.

**Step 1: Create the example set**

Create `packages/engine/src/__tests__/fixtures/example-card-set.ts`:

```typescript
import type { CardDefinition } from "../../types/index.js";

/**
 * Example card set for white-label reference.
 * Demonstrates all card types, effects, and metadata fields.
 */
export const EXAMPLE_CARDS: CardDefinition[] = [
  // Stereotype (monster) — basic attacker
  {
    id: "dropout-brawler",
    name: "Dropout Brawler",
    type: "stereotype",
    description: "A reckless fighter who dropped out to pursue street brawling.",
    rarity: "common",
    attack: 1800,
    defense: 800,
    level: 4,
    attribute: "fire",
    archetype: "dropout",
    viceType: "rage",
    flavorText: "Fists first, questions never.",
    cost: 1,
  },
  // Stereotype — high level, needs tribute
  {
    id: "prep-valedictorian",
    name: "Prep Valedictorian",
    type: "stereotype",
    description: "The overachieving prep who dominates every field.",
    rarity: "epic",
    attack: 2500,
    defense: 2000,
    level: 7,
    attribute: "water",
    archetype: "prep",
    flavorText: "4.0 GPA, zero chill.",
    cost: 2,
    effects: [
      {
        id: "val-draw",
        type: "on_summon",
        description: "Draw 1 card when summoned",
        actions: [{ type: "draw", count: 1 }],
      },
    ],
  },
  // Spell — normal (one-shot)
  {
    id: "cram-session",
    name: "Cram Session",
    type: "spell",
    description: "Draw 2 cards.",
    rarity: "rare",
    spellType: "normal",
    cost: 1,
    effects: [
      {
        id: "cram-draw",
        type: "ignition",
        description: "Draw 2 cards",
        actions: [{ type: "draw", count: 2 }],
      },
    ],
  },
  // Spell — field (class)
  {
    id: "study-hall",
    name: "Study Hall",
    type: "spell",
    description: "All Geek stereotypes gain 300 ATK.",
    rarity: "uncommon",
    spellType: "field",
    archetype: "geek",
    cost: 1,
    effects: [
      {
        id: "study-boost",
        type: "continuous",
        description: "Geek stereotypes gain 300 ATK",
        actions: [{ type: "boost_attack", amount: 300, duration: "permanent" }],
      },
    ],
  },
  // Trap — normal
  {
    id: "pop-quiz",
    name: "Pop Quiz",
    type: "trap",
    description: "Destroy 1 attacking stereotype.",
    rarity: "uncommon",
    trapType: "normal",
    cost: 1,
    effects: [
      {
        id: "quiz-destroy",
        type: "trigger",
        description: "Destroy 1 attacking stereotype",
        actions: [{ type: "destroy", target: "selected" }],
      },
    ],
  },
  // Trap — continuous
  {
    id: "detention",
    name: "Detention",
    type: "trap",
    description: "Opponent's stereotypes lose 500 ATK while this card is face-up.",
    rarity: "rare",
    trapType: "continuous",
    cost: 2,
    effects: [
      {
        id: "detention-debuff",
        type: "continuous",
        description: "Opponent stereotypes lose 500 ATK",
        actions: [{ type: "boost_attack", amount: -500, duration: "permanent" }],
      },
    ],
  },
];
```

**Step 2: Add integration test using the example set**

Add to `packages/engine/src/__tests__/cards.test.ts`:

```typescript
import { EXAMPLE_CARDS } from "./fixtures/example-card-set.js";

describe("example card set", () => {
  it("validates the complete example set", () => {
    const lookup = defineCards(EXAMPLE_CARDS);
    expect(Object.keys(lookup)).toHaveLength(6);
  });

  it("includes all card types", () => {
    const lookup = defineCards(EXAMPLE_CARDS);
    const types = new Set(Object.values(lookup).map((c) => c.type));
    expect(types).toEqual(new Set(["stereotype", "spell", "trap"]));
  });
});
```

**Step 3: Run tests**

Run: `cd packages/engine && bun run test`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add packages/engine/src/__tests__/fixtures/example-card-set.ts packages/engine/src/__tests__/cards.test.ts
git commit -m "feat(engine): add example card set as white-label reference"
```

---

## Task 7: Integration verification

**Files:**
- None (verification only)

**Step 1: Run full test suite**

Run: `cd packages/engine && bun run test`
Expected: All tests pass (engine + cards + loader + cardSet + seeder)

**Step 2: Build all packages**

Run: `cd packages/engine && bun run build && cd ../config && bun run build`
Expected: Clean builds

**Step 3: Verify exports**

Run: `cd /Users/home/Desktop/LTCG && node -e "const e = require('./packages/engine/dist/index.js'); console.log(Object.keys(e).sort().join(', '))"`

Expected output should include: `CardLookup`, `defineCardSet`, `defineCards`, `loadCardsFromArray`, `loadCardsFromJSON`, `mergeCardSets`, `toConvexCardRows`, `validateDeck` (plus type exports)

If ESM-only, use: `bun -e "import * as e from './packages/engine/dist/index.js'; console.log(Object.keys(e).sort().join(', '))"`

**Step 4: Commit**

No changes to commit (verification only).

---

## Summary

After these 7 tasks:

1. `CardDefinition` includes optional game metadata (`viceType`, `flavorText`, `imageUrl`, `cost`, `meta`)
2. `defineCards` validates all card types thoroughly (spells need spellType, traps need trapType, stereotypes need valid stats)
3. `loadCardsFromArray` / `loadCardsFromJSON` — load and validate cards from JSON/TS
4. `defineCardSet` / `mergeCardSets` — organize cards into themed sets
5. `toConvexCardRows` — convert engine cards to Convex table format for seeding
6. Example card set demonstrates the format for white-label operators

**White-label card authoring workflow:**
```typescript
// 1. Define cards as JSON or TypeScript
import coreCards from "./cards/core-set.json";
import expansion from "./cards/expansion-1.json";

// 2. Load and validate
const core = defineCardSet({ id: "core", name: "Core Set", cards: coreCards });
const exp1 = defineCardSet({ id: "exp1", name: "Expansion 1", cards: expansion });

// 3. Merge for engine
const allCards = mergeCardSets([core, exp1]);
const engine = createEngine({ cardLookup: allCards, ... });

// 4. Seed to Convex
const rows = toConvexCardRows([...coreCards, ...expansion]);
// Insert rows into cardDefinitions table
```
