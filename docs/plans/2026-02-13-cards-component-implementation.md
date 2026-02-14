# Cards Component Extraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract the cards/decks system into `packages/lunchtable-tcg-cards/` and delete the unused card template system.

**Architecture:** Standalone Convex component with 6 tables (cardDefinitions, playerCards, userDecks, deckCards, starterDeckDefinitions, numberedCardRegistry). Uses `v.string()` for userId at boundary. Card enum fields (rarity, archetype, cardType) use `v.string()` for plug-and-play flexibility. Ability field uses `v.any()` since it's game-specific.

**Tech Stack:** Convex components, TypeScript, Bun

---

## Task 1: Delete Template Tables from Schema

**Files:**
- Modify: `convex/schema.ts:1042` (remove templateId field)
- Modify: `convex/schema.ts:1050-1250` (remove 6 template tables)

**Step 1: Remove templateId from cardDefinitions**

In `convex/schema.ts`, delete line 1042:
```
    templateId: v.optional(v.id("cardTemplates")), // Link to visual template
```

**Step 2: Remove the 6 template table definitions**

Delete the entire "Card Template Designer" section (lines ~1050-1250), which includes:
- `cardBackgrounds` (lines 1055-1062)
- `cardTypeTemplates` (lines 1065-1108)
- `cardTemplates` (lines 1111-1152)
- `cardTemplateBlocks` (lines 1155-1208)
- `freeformDesigns` (lines 1211-1223)
- `freeformElements` (lines 1226-1250)

Everything between the `// Card Template Designer` comment block and `// Player's card inventory` comment block.

**Step 3: Verify**

Run: `cd /Users/home/Desktop/LTCG/convex && npx tsc --noEmit 2>&1 | head -30`

Expected: Errors from files referencing deleted tables (template function files). These are deleted in Task 2.

---

## Task 2: Delete Template Function Files

**Files:**
- Delete: `convex/cardTypeTemplates.ts` (103 lines)
- Delete: `convex/cardBackgrounds.ts` (47 lines)
- Delete: `convex/admin/templates.ts` (791 lines)
- Delete: `convex/admin/freeformDesigns.ts` (462 lines)

**Step 1: Verify no non-template imports**

Run: `grep -r "cardTypeTemplates\|cardBackgrounds\|admin/templates\|admin/freeformDesigns" convex/ --include="*.ts" -l`

Expected: Only the files themselves and `_generated/api.d.ts` (auto-generated).

**Step 2: Delete the files**

```bash
rm convex/cardTypeTemplates.ts convex/cardBackgrounds.ts convex/admin/templates.ts convex/admin/freeformDesigns.ts
```

**Step 3: Verify**

Run: `cd /Users/home/Desktop/LTCG/convex && npx tsc --noEmit 2>&1 | head -10`

Expected: Clean (0 errors) or only admin frontend errors.

---

## Task 3: Delete Template Admin Frontend

**Files:**
- Delete: `apps/admin/src/components/freeform/` (entire directory, ~1,577 lines)
- Delete: `apps/admin/src/components/cards/TemplateDesigner.tsx` (313 lines)
- Delete: `apps/admin/src/components/cards/BackgroundPicker.tsx` (73 lines)
- Delete: `apps/admin/src/app/cards/template-designer/page.tsx` (28 lines)
- Delete: `apps/admin/src/app/cards/upload-backgrounds/page.tsx` (125 lines)
- Delete: `apps/admin/src/app/templates/page.tsx` (13 lines)
- Delete: `apps/admin/src/app/templates/[templateId]/page.tsx` (220 lines)

**Step 1: Delete all template frontend files**

```bash
rm -rf apps/admin/src/components/freeform/
rm apps/admin/src/components/cards/TemplateDesigner.tsx
rm apps/admin/src/components/cards/BackgroundPicker.tsx
rm -rf apps/admin/src/app/cards/template-designer/
rm -rf apps/admin/src/app/cards/upload-backgrounds/
rm -rf apps/admin/src/app/templates/
```

**Step 2: Check for broken imports in remaining admin files**

Run: `grep -r "TemplateDesigner\|BackgroundPicker\|freeform\|template-designer\|upload-backgrounds" apps/admin/src/ --include="*.ts" --include="*.tsx" -l`

Fix any remaining imports in navigation or layout files.

---

## Task 4: Update Admin Navigation

**Files:**
- Modify: `apps/admin/src/components/layout/navigation.ts`

**Step 1: Remove template nav entries**

Remove these navigation items:
- `{ title: "Template Designer", href: "/cards/template-designer", ... }`
- `{ title: "Upload Backgrounds", href: "/cards/upload-backgrounds", ... }`
- `{ title: "Design Gallery", href: "/templates", ... }`

And their route map entries:
- `/cards/template-designer`
- `/cards/upload-backgrounds`
- `/templates`
- `/templates/[templateId]`

---

## Task 5: Verify and Commit Template Deletion

**Step 1: TypeScript verification**

```bash
cd /Users/home/Desktop/LTCG && npx tsc --noEmit
cd /Users/home/Desktop/LTCG/convex && npx tsc --noEmit
```

Expected: Both pass with 0 errors.

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: delete card template/design system (6 tables, ~3,400 lines)"
```

---

## Task 6: Scaffold lunchtable-tcg-cards Package

**Files:**
- Create: `packages/lunchtable-tcg-cards/package.json`
- Create: `packages/lunchtable-tcg-cards/tsconfig.json`
- Create: `packages/lunchtable-tcg-cards/tsconfig.build.json`
- Create: `packages/lunchtable-tcg-cards/src/index.ts`
- Create: `packages/lunchtable-tcg-cards/src/component/convex.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "@lunchtable-tcg/cards",
  "version": "0.1.0",
  "description": "Card definitions, player inventory, and deck management component",
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
  "types": "./dist/client/index.d.ts",
  "module": "./dist/client/index.js",
  "keywords": ["tcg", "convex", "component", "card-game", "cards", "decks"]
}
```

**Step 2: Create tsconfig.json**

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

**Step 3: Create tsconfig.build.json**

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

**Step 4: Create src/component/convex.config.ts**

```typescript
import { defineComponent } from "convex/server";

export default defineComponent("lunchtable-tcg-cards");
```

**Step 5: Create src/index.ts**

```typescript
export { LTCGCards } from "./client/index.js";
```

**Step 6: Run `bun install` to link workspace package**

```bash
cd /Users/home/Desktop/LTCG && bun install
```

---

## Task 7: Write Component Schema

**Files:**
- Create: `packages/lunchtable-tcg-cards/src/component/schema.ts`

**Step 1: Write schema with 6 tables**

The schema uses `v.string()` for:
- `userId` (cross-component ref to users table)
- `rarity`, `archetype`, `cardType`, `attribute`, `monsterType`, `spellType`, `trapType` (game-specific enums — plug-and-play)
- `ability` uses `v.any()` (complex game-specific structure)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const cardVariantValidator = v.union(
  v.literal("standard"),
  v.literal("foil"),
  v.literal("alt_art"),
  v.literal("full_art"),
  v.literal("numbered")
);

export default defineSchema({
  cardDefinitions: defineTable({
    name: v.string(),
    rarity: v.string(),
    archetype: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    level: v.optional(v.number()),
    attribute: v.optional(v.string()),
    monsterType: v.optional(v.string()),
    spellType: v.optional(v.string()),
    trapType: v.optional(v.string()),
    ability: v.optional(v.any()),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_rarity", ["rarity"])
    .index("by_archetype", ["archetype"])
    .index("by_type", ["cardType"])
    .index("by_name", ["name"])
    .index("by_active_rarity", ["isActive", "rarity"]),

  playerCards: defineTable({
    userId: v.string(),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    variant: v.optional(cardVariantValidator),
    serialNumber: v.optional(v.number()),
    isFavorite: v.boolean(),
    acquiredAt: v.number(),
    lastUpdatedAt: v.number(),
    source: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_card", ["userId", "cardDefinitionId"])
    .index("by_user_card_variant", ["userId", "cardDefinitionId", "variant"])
    .index("by_user_favorite", ["userId", "isFavorite"])
    .index("by_variant", ["variant"]),

  userDecks: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    deckArchetype: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_updated", ["updatedAt"]),

  deckCards: defineTable({
    deckId: v.id("userDecks"),
    cardDefinitionId: v.id("cardDefinitions"),
    quantity: v.number(),
    position: v.optional(v.number()),
  })
    .index("by_deck", ["deckId"])
    .index("by_deck_card", ["deckId", "cardDefinitionId"]),

  starterDeckDefinitions: defineTable({
    name: v.string(),
    deckCode: v.string(),
    archetype: v.string(),
    description: v.string(),
    playstyle: v.string(),
    cardCount: v.number(),
    isAvailable: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["deckCode"])
    .index("by_available", ["isAvailable"]),

  numberedCardRegistry: defineTable({
    cardDefinitionId: v.id("cardDefinitions"),
    serialNumber: v.number(),
    maxSerial: v.number(),
    mintedAt: v.number(),
    mintedTo: v.optional(v.string()),
    mintMethod: v.string(),
    currentOwner: v.optional(v.string()),
  })
    .index("by_card", ["cardDefinitionId"])
    .index("by_card_serial", ["cardDefinitionId", "serialNumber"])
    .index("by_owner", ["currentOwner"]),
});
```

**Step 2: Generate component types**

```bash
cd /Users/home/Desktop/LTCG/packages/lunchtable-tcg-cards && npx convex component:codegen --once
```

If codegen isn't available, create `_generated/` stubs matching the pattern from other components.

---

## Task 8: Write Card Functions

**Files:**
- Create: `packages/lunchtable-tcg-cards/src/component/cards.ts`

**Step 1: Implement card queries and mutations**

Functions to implement (adapted from `convex/core/cards.ts`):

- `getAllCards` — query, no args, returns all active cardDefinitions
- `getCard` — query, args: `{ cardId: v.id("cardDefinitions") }`, returns single card
- `getCardsBatch` — query, args: `{ cardIds: v.array(v.string()) }`, returns array (batch resolve for game engine)
- `getUserCards` — query, args: `{ userId: v.string() }`, returns cards with definitions joined
- `getUserFavoriteCards` — query, args: `{ userId: v.string() }`, returns favorites
- `getCollectionStats` — query, args: `{ userId: v.string() }`, returns `{ uniqueCards, totalCards, favoriteCount }`
- `createCardDefinition` — mutation, args: full card fields, returns card ID
- `updateCardDefinition` — mutation, args: cardId + partial fields, patches card
- `toggleCardActive` — mutation, args: `{ cardId }`, toggles `isActive`
- `addCardsToInventory` — mutation, args: `{ userId, cardDefinitionId, quantity, variant?, source?, serialNumber? }`, upserts playerCards
- `removeCardsFromInventory` — mutation, args: `{ userId, cardDefinitionId, quantity }`, decrements or deletes
- `toggleFavorite` — mutation, args: `{ userId, playerCardId }`, toggles `isFavorite`

Key pattern: Use `query`/`mutation` from `./_generated/server`, NOT from `convex/server`. Accept `userId` as `v.string()`. Return plain objects (no `Doc<>` types across boundary).

Use `returns` validators on all functions per project CLAUDE.md convention.

---

## Task 9: Write Deck Functions

**Files:**
- Create: `packages/lunchtable-tcg-cards/src/component/decks.ts`

**Step 1: Implement deck queries and mutations**

Functions to implement (adapted from `convex/core/decks.ts`):

- `getUserDecks` — query, args: `{ userId }`, returns decks with card counts
- `getDeckWithCards` — query, args: `{ deckId }`, returns deck + full card list (batch fetch definitions)
- `getDeckStats` — query, args: `{ deckId }`, returns element/rarity/type breakdown
- `validateDeck` — query, args: `{ deckId, minSize?, maxSize?, maxCopies?, maxLegendaryCopies? }`, returns `{ isValid, errors[], warnings[], totalCards }`
- `createDeck` — mutation, args: `{ userId, name, description?, deckArchetype?, maxDecks? }`, returns deck ID string
- `saveDeck` — mutation, args: `{ deckId, cards: [{cardDefinitionId, quantity}], minSize?, maxSize?, maxCopies?, maxLegendaryCopies? }`, validates ownership + limits, replaces all deckCards
- `renameDeck` — mutation, args: `{ deckId, name }`, patches name
- `deleteDeck` — mutation, args: `{ deckId }`, soft deletes (isActive = false)
- `duplicateDeck` — mutation, args: `{ deckId, name, maxDecks? }`, copies deck + cards
- `setActiveDeck` — mutation, args: `{ userId, deckId, minSize?, maxSize?, maxCopies?, maxLegendaryCopies? }`, validates then returns deckId string (caller updates users.activeDeckId)
- `selectStarterDeck` — mutation, args: `{ userId, deckCode, starterCards: v.array(v.any()) }`, creates deck + adds cards to inventory

**Key design decisions:**
- Game rule params (`minSize`, `maxSize`, `maxCopies`, `maxLegendaryCopies`, `maxDecks`) are passed per-call with defaults matching LTCG rules (30/60/3/1/50). This lets different games override without component config.
- `selectStarterDeck` receives card data as args rather than importing seed files (component is game-agnostic).
- `saveDeck` validates that the user actually owns the cards being added by checking `playerCards`.
- All deck mutations that return IDs return them as `v.string()` for boundary safety.

---

## Task 10: Write Seed Functions

**Files:**
- Create: `packages/lunchtable-tcg-cards/src/component/seeds.ts`

**Step 1: Implement seed mutations**

- `seedCardDefinitions` — mutation, args: `{ cards: v.array(v.object({...})) }`, bulk inserts card definitions, skips duplicates by name. Returns `{ created: number, skipped: number }`.
- `seedStarterDecks` — mutation, args: `{ decks: v.array(v.object({...})) }`, inserts starter deck definitions. Returns `{ created: number }`.

These are internal mutations callable via the client class for admin/setup operations.

---

## Task 11: Write Client Class

**Files:**
- Create: `packages/lunchtable-tcg-cards/src/client/index.ts`

**Step 1: Implement LTCGCards client**

Follow the pattern from `@lunchtable-tcg/social`:

```typescript
import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { RunQueryCtx, RunMutationCtx };
export type { api };

export class LTCGCards {
  public cards: CardsClient;
  public decks: DecksClient;
  public seeds: SeedsClient;

  constructor(private component: typeof api) {
    this.cards = new CardsClient(component);
    this.decks = new DecksClient(component);
    this.seeds = new SeedsClient(component);
  }
}
```

Each sub-client wraps component functions with `ctx.runQuery`/`ctx.runMutation`, converting string IDs to component IDs via `as any` at the boundary (matching existing pattern).

**CardsClient methods:**
- `getAllCards(ctx)` → `ctx.runQuery(this.component.cards.getAllCards, {})`
- `getCard(ctx, cardId)` → `ctx.runQuery(this.component.cards.getCard, { cardId: cardId as any })`
- `getCardsBatch(ctx, cardIds)` → `ctx.runQuery(this.component.cards.getCardsBatch, { cardIds })`
- `getUserCards(ctx, userId)` → `ctx.runQuery(this.component.cards.getUserCards, { userId })`
- `getUserFavoriteCards(ctx, userId)` → similar
- `getCollectionStats(ctx, userId)` → similar
- `createCardDefinition(ctx, card)` → `ctx.runMutation(this.component.cards.createCardDefinition, card)`
- `updateCardDefinition(ctx, cardId, updates)` → similar
- `toggleCardActive(ctx, cardId)` → similar
- `addCardsToInventory(ctx, args)` → similar
- `removeCardsFromInventory(ctx, args)` → similar
- `toggleFavorite(ctx, userId, playerCardId)` → similar

**DecksClient methods:**
- `getUserDecks(ctx, userId)` → wraps decks.getUserDecks
- `getDeckWithCards(ctx, deckId)` → wraps decks.getDeckWithCards
- `getDeckStats(ctx, deckId)` → wraps decks.getDeckStats
- `validateDeck(ctx, deckId, rules?)` → wraps decks.validateDeck with optional rule overrides
- `createDeck(ctx, userId, name, opts?)` → wraps decks.createDeck
- `saveDeck(ctx, deckId, cards, rules?)` → wraps decks.saveDeck
- `renameDeck(ctx, deckId, name)` → wraps decks.renameDeck
- `deleteDeck(ctx, deckId)` → wraps decks.deleteDeck
- `duplicateDeck(ctx, deckId, name, opts?)` → wraps decks.duplicateDeck
- `setActiveDeck(ctx, userId, deckId, rules?)` → wraps decks.setActiveDeck, returns string deckId
- `selectStarterDeck(ctx, userId, deckCode, cards)` → wraps decks.selectStarterDeck

**SeedsClient methods:**
- `seedCardDefinitions(ctx, cards)` → wraps seeds.seedCardDefinitions
- `seedStarterDecks(ctx, decks)` → wraps seeds.seedStarterDecks

---

## Task 12: Verify and Commit Component

**Step 1: TypeScript verification**

```bash
cd /Users/home/Desktop/LTCG/packages/lunchtable-tcg-cards && npx tsc --noEmit
```

Expected: 0 errors.

**Step 2: Root verification**

```bash
cd /Users/home/Desktop/LTCG && npx tsc --noEmit
cd /Users/home/Desktop/LTCG/convex && npx tsc --noEmit
```

Expected: Both pass (main app unchanged, component is standalone).

**Step 3: Commit**

```bash
git add packages/lunchtable-tcg-cards/
git commit -m "feat: add lunchtable-tcg-cards component package

Standalone Convex component with 6 tables: cardDefinitions, playerCards,
userDecks, deckCards, starterDeckDefinitions, numberedCardRegistry.

Uses v.string() for userId and game-specific enums (rarity, archetype,
cardType) to support plug-and-play card game variations."
```

---

## Summary

| Task | Description | Effort |
|------|-------------|--------|
| 1 | Delete template tables from schema | 5 min |
| 2 | Delete template function files | 5 min |
| 3 | Delete template admin frontend | 5 min |
| 4 | Update admin navigation | 5 min |
| 5 | Verify + commit template deletion | 5 min |
| 6 | Scaffold package | 10 min |
| 7 | Write component schema | 10 min |
| 8 | Write card functions | 30 min |
| 9 | Write deck functions | 40 min |
| 10 | Write seed functions | 10 min |
| 11 | Write client class | 20 min |
| 12 | Verify + commit component | 5 min |

**Total: ~12 tasks, 2 commits**

---

## Critical Files Reference

- **Production schema (source of truth):** `convex/schema.ts`
- **Production card functions:** `convex/core/cards.ts` (416 lines)
- **Production deck functions:** `convex/core/decks.ts` (1,116 lines)
- **Production seed script:** `convex/scripts/seedStarterCards.ts` (78 lines)
- **Seed data types:** `convex/seeds/types.ts` (95 lines)
- **Existing component pattern:** `packages/lunchtable-tcg-social/` (reference for structure)
- **Ability validator (for reference):** `convex/gameplay/effectSystem/jsonEffectValidators.ts:779`
- **Card helpers (for reference):** `convex/lib/helpers.ts:79-314`
