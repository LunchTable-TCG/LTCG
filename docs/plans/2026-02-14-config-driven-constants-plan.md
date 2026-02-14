# Phase 2: Config-Driven Constants — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded constants in `convex/lib/constants.ts` with config-driven values sourced from `@lunchtable-tcg/config`, making the game fully white-label-able through a single config file.

**Architecture:** Expand the config schema to cover all constant groups, add a `gameConfig` singleton table to Convex for runtime overrides, and create a `getGameConfig(ctx)` helper that handlers use instead of importing constants directly. Priority chain: DB override → config package defaults → hardcoded fallback.

**Tech Stack:** TypeScript 5.7+, Convex, `@lunchtable-tcg/config`, `@lunchtable-tcg/engine`

**Design Doc:** `docs/plans/2026-02-14-oss-tcg-framework-design.md`

---

## Task 1: Expand config schema to cover all constant groups

**Files:**
- Modify: `packages/config/src/schema.ts`
- Modify: `packages/config/src/defaults.ts`
- Modify: `packages/config/src/__tests__/config.test.ts`

The current `LTCGConfig` only covers economy basics and progression XP. We need to cover all groups from `convex/lib/constants.ts`.

**Step 1: Update schema.ts with full config interface**

```typescript
import type { EngineConfig } from "@lunchtable-tcg/engine";

export interface LTCGConfig {
  game: {
    name: string;
    engine: EngineConfig;
  };
  economy: {
    startingGold: number;
    startingGems: number;
    rarityWeights: Record<string, number>;
    wagerWinnerPct: number;
    variantBaseRates: {
      standard: number;
      foil: number;
      altArt: number;
      fullArt: number;
    };
    pityThresholds: {
      epic: number;
      legendary: number;
      fullArt: number;
    };
  };
  marketplace: {
    platformFeePercent: number;
    minBidIncrementPercent: number;
    minListingPrice: number;
    minAuctionDurationHours: number;
    maxAuctionDurationHours: number;
  };
  progression: {
    xp: {
      basePerLevel: number;
      multiplier: number;
      rankedWin: number;
      rankedLoss: number;
      casualWin: number;
      casualLoss: number;
      storyWin: number;
      storyLoss: number;
      dailyLogin: number[];
    };
    levelCurve: "linear" | "exponential";
  };
  competitive: {
    elo: {
      defaultRating: number;
      kFactor: number;
      ratingFloor: number;
    };
    rankThresholds: Record<string, number>;
  };
  social: {
    chat: {
      rateLimitMaxMessages: number;
      rateLimitWindowMs: number;
      presenceTimeoutMs: number;
    };
    spectator: {
      maxPerGame: number;
      defaultAllowSpectators: boolean;
    };
  };
  cards: string;
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

**Step 2: Update defaults.ts with values from constants.ts**

```typescript
import { DEFAULT_CONFIG } from "@lunchtable-tcg/engine";
import type { LTCGConfig } from "./schema.js";

export const DEFAULT_LTCG_CONFIG: LTCGConfig = {
  game: {
    name: "LunchTable TCG",
    engine: DEFAULT_CONFIG,
  },
  economy: {
    startingGold: 500,
    startingGems: 100,
    rarityWeights: { common: 550, uncommon: 280, rare: 120, epic: 40, legendary: 10 },
    wagerWinnerPct: 0.9,
    variantBaseRates: { standard: 8800, foil: 1000, altArt: 200, fullArt: 50 },
    pityThresholds: { epic: 150, legendary: 500, fullArt: 1000 },
  },
  marketplace: {
    platformFeePercent: 0.05,
    minBidIncrementPercent: 0.05,
    minListingPrice: 10,
    minAuctionDurationHours: 1,
    maxAuctionDurationHours: 168,
  },
  progression: {
    xp: {
      basePerLevel: 100,
      multiplier: 1.2,
      rankedWin: 30,
      rankedLoss: 10,
      casualWin: 20,
      casualLoss: 5,
      storyWin: 50,
      storyLoss: 0,
      dailyLogin: [25, 30, 30, 35, 35, 40, 50],
    },
    levelCurve: "exponential",
  },
  competitive: {
    elo: { defaultRating: 1000, kFactor: 32, ratingFloor: 0 },
    rankThresholds: {
      Bronze: 0, Silver: 1200, Gold: 1400,
      Platinum: 1600, Diamond: 1800, Master: 2000, Legend: 2200,
    },
  },
  social: {
    chat: { rateLimitMaxMessages: 10, rateLimitWindowMs: 60000, presenceTimeoutMs: 300000 },
    spectator: { maxPerGame: 100, defaultAllowSpectators: true },
  },
  cards: "./cards/",
  theme: {
    brand: "LunchTable",
    palette: { primary: "#6366f1", secondary: "#1e1b4b" },
  },
  blockchain: { enabled: false },
};
```

**Step 3: Update tests**

Add test for new config sections:
```typescript
it("covers all config sections", () => {
  const config = defineConfig({});
  expect(config.competitive.elo.defaultRating).toBe(1000);
  expect(config.marketplace.platformFeePercent).toBe(0.05);
  expect(config.social.spectator.maxPerGame).toBe(100);
});
```

**Step 4: Run tests**

Run: `cd packages/config && bun run test`
Expected: PASS

**Step 5: Build**

Run: `cd packages/config && bun run build`
Expected: Clean compile

**Step 6: Commit**

```bash
git add packages/config/
git commit -m "feat(config): expand schema to cover all constant groups"
```

---

## Task 2: Add gameConfig singleton table to Convex schema

**Files:**
- Modify: `convex/schema.ts` — add `gameConfig` table
- Create: `convex/lib/gameConfig.ts` — get/set helpers

**Step 1: Add table to schema.ts**

Add after the existing component tables:

```typescript
// Game configuration singleton — runtime-overridable config values
// Stores a JSON-serialized subset of LTCGConfig
gameConfig: defineTable({
  key: v.literal("active"),
  config: v.string(), // JSON-serialized partial LTCGConfig
  updatedAt: v.number(),
  updatedBy: v.optional(v.string()),
}).index("by_key", ["key"]),
```

Note: We store config as a JSON string in `v.string()` because Convex validators require static shapes and `LTCGConfig` is too complex/dynamic for Convex validators. JSON string + TypeScript parsing gives us flexibility.

**Step 2: Create gameConfig.ts helper**

```typescript
// convex/lib/gameConfig.ts
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { DEFAULT_LTCG_CONFIG } from "@lunchtable-tcg/config";
import type { LTCGConfig } from "@lunchtable-tcg/config";

/**
 * Deep merge utility — same as config package but inlined to avoid
 * import complexity in Convex runtime.
 */
function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val && typeof val === "object" && !Array.isArray(val) && typeof base[key] === "object") {
      result[key] = deepMerge(
        base[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      ) as T[keyof T];
    } else if (val !== undefined) {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

/**
 * Get the active game configuration.
 * Reads from gameConfig table, falls back to DEFAULT_LTCG_CONFIG.
 *
 * Usage in any query/mutation:
 *   const config = await getGameConfig(ctx);
 *   const startingGold = config.economy.startingGold;
 */
export async function getGameConfig(ctx: QueryCtx | MutationCtx): Promise<LTCGConfig> {
  try {
    const row = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();

    if (!row) return DEFAULT_LTCG_CONFIG;

    const overrides = JSON.parse(row.config) as Partial<LTCGConfig>;
    return deepMerge(DEFAULT_LTCG_CONFIG, overrides);
  } catch {
    return DEFAULT_LTCG_CONFIG;
  }
}

/**
 * Update game configuration (admin only).
 * Merges partial updates into existing config.
 */
export async function setGameConfig(
  ctx: MutationCtx,
  updates: Partial<LTCGConfig>,
  updatedBy?: string,
) {
  const existing = await ctx.db
    .query("gameConfig")
    .withIndex("by_key", (q) => q.eq("key", "active"))
    .first();

  const currentOverrides = existing ? JSON.parse(existing.config) as Partial<LTCGConfig> : {};
  const merged = deepMerge(currentOverrides as Record<string, unknown>, updates as Record<string, unknown>);

  if (existing) {
    await ctx.db.patch(existing._id, {
      config: JSON.stringify(merged),
      updatedAt: Date.now(),
      updatedBy,
    });
  } else {
    await ctx.db.insert("gameConfig", {
      key: "active" as const,
      config: JSON.stringify(merged),
      updatedAt: Date.now(),
      updatedBy,
    });
  }
}
```

**Step 3: Add @lunchtable-tcg/config as Convex dependency**

The root convex package needs access to the config package. Check if it's already a workspace dependency — if not, add to root `package.json`:
```json
"@lunchtable-tcg/config": "workspace:*"
```

Run: `bun install`

**Step 4: Verify Convex type-check**

Run: `cd /Users/home/Desktop/LTCG && npx convex typecheck`
Expected: PASS (or existing errors only, no new errors)

**Step 5: Commit**

```bash
git add convex/schema.ts convex/lib/gameConfig.ts package.json
git commit -m "feat: add gameConfig singleton table and get/set helpers"
```

---

## Task 3: Migrate event handlers to use getGameConfig

**Files:**
- Modify: `convex/events/handlers/economyHandler.ts`
- Modify: `convex/events/handlers/progressionHandler.ts`
- Modify: `convex/events/handlers/statsHandler.ts`

These are the domain event handlers that currently import from constants.ts. They need to call `getGameConfig(ctx)` instead.

**Step 1: Read each handler to identify constant usage**

Read: `convex/events/handlers/economyHandler.ts`, `progressionHandler.ts`, `statsHandler.ts`

Look for imports from `../../lib/constants` or hardcoded values.

**Step 2: Replace constant imports with getGameConfig**

Pattern:
```typescript
// Before
import { ECONOMY, XP_SYSTEM } from "../../lib/constants";

export async function handleGameEnded(ctx, event) {
  const goldReward = event.isRanked ? GOLD_REWARDS.RANKED_WIN_BASE : GOLD_REWARDS.CASUAL_WIN;
}

// After
import { getGameConfig } from "../../lib/gameConfig";

export async function handleGameEnded(ctx, event) {
  const config = await getGameConfig(ctx);
  // Use config values — note: gold rewards aren't in config yet,
  // so only migrate values that ARE in the config schema
}
```

**Important**: Only migrate values that exist in the `LTCGConfig` schema. Leave other constants as-is until they're added to the schema.

**Step 3: Verify type-check**

Run: `npx convex typecheck`

**Step 4: Commit**

```bash
git add convex/events/handlers/
git commit -m "refactor: migrate event handlers to use getGameConfig"
```

---

## Task 4: Migrate helpers.ts to use getGameConfig

**Files:**
- Modify: `convex/lib/helpers.ts`

`helpers.ts` is the most constant-heavy file. It imports `RARITY_WEIGHTS`, `VARIANT_CONFIG`, `PITY_THRESHOLDS`, `ELO_SYSTEM`, `RANK_THRESHOLDS`.

**Step 1: Read helpers.ts fully**

Identify every constant reference and map to config paths.

**Step 2: Update getFullRngConfig to use getGameConfig**

The existing `getFullRngConfig()` already queries the economy component and falls back to constants. Replace the fallback with `getGameConfig()`:

```typescript
// Before
const DEFAULTS: FullRngConfig = {
  rarityWeights: RARITY_WEIGHTS as unknown as RarityWeights,
  variantRates: { ... VARIANT_CONFIG.BASE_RATES ... },
  pityThresholds: PITY_THRESHOLDS as unknown as PityThresholds,
};

// After
import { getGameConfig } from "./gameConfig";

async function getFullRngConfig(ctx: QueryCtx | MutationCtx): Promise<FullRngConfig> {
  const config = await getGameConfig(ctx);
  const DEFAULTS: FullRngConfig = {
    rarityWeights: config.economy.rarityWeights as unknown as RarityWeights,
    variantRates: config.economy.variantBaseRates,
    pityThresholds: config.economy.pityThresholds,
  };
  // ... rest stays the same (component query with fallback)
}
```

**Step 3: Update ELO/rank functions**

For functions using `ELO_SYSTEM` and `RANK_THRESHOLDS`, add `ctx` parameter and use config:

```typescript
// Before
export function calculateEloChange(winner: number, loser: number) {
  const K = ELO_SYSTEM.K_FACTOR;
  ...
}

// After
export function calculateEloChange(
  winner: number,
  loser: number,
  eloConfig = { kFactor: 32, ratingFloor: 0 }
) {
  const K = eloConfig.kFactor;
  ...
}
```

Note: For pure calculation functions, accept config as a parameter rather than making them async. The caller reads config once and passes the relevant section.

**Step 4: Remove unused constant imports**

After migrating, remove imports from `constants.ts` that are no longer needed.

**Step 5: Verify type-check**

Run: `npx convex typecheck`

**Step 6: Commit**

```bash
git add convex/lib/helpers.ts
git commit -m "refactor: migrate helpers.ts to use getGameConfig for rarity, ELO, and rank values"
```

---

## Task 5: Migrate HTTP handlers and gameplay code

**Files:**
- Modify: `convex/http/matchmaking.ts` — uses `ELO_SYSTEM`
- Modify: `convex/http/shop.ts` — uses `GEM_PACKAGES`
- Modify: `convex/gameplay/games/lobby.ts` — uses `ELO_SYSTEM`
- Modify: `convex/gameplay/games/queries.ts` — uses `ELO_SYSTEM`
- Modify: `convex/gameplay/games/spectator.ts` — uses `SPECTATOR`

**Step 1: Read each file, identify constant usage**

**Step 2: For HTTP handlers (httpAction)**

HTTP actions don't have direct `ctx.db` access in the same way. Use `ctx.runQuery` to fetch config:

```typescript
// In httpAction, call an internal query that returns config
const config = await ctx.runQuery(internal.lib.gameConfigQueries.getConfig, {});
```

Create `convex/lib/gameConfigQueries.ts`:
```typescript
import { internalQuery } from "../_generated/server";
import { getGameConfig } from "./gameConfig";

export const getConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getGameConfig(ctx);
  },
});
```

**Step 3: For gameplay mutations/queries**

These already have `ctx`, so just call `getGameConfig(ctx)` directly.

**Step 4: Verify type-check**

Run: `npx convex typecheck`

**Step 5: Commit**

```bash
git add convex/http/ convex/gameplay/ convex/lib/gameConfigQueries.ts
git commit -m "refactor: migrate HTTP and gameplay code to config-driven constants"
```

---

## Task 6: Add admin mutation for runtime config updates

**Files:**
- Create: `convex/admin/gameConfig.ts` — admin-only config mutation
- Modify: `convex/http.ts` or relevant admin routes — expose endpoint

**Step 1: Create admin config mutation**

```typescript
// convex/admin/gameConfig.ts
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getGameConfig, setGameConfig } from "../lib/gameConfig";

export const getConfig = query({
  args: {},
  handler: async (ctx) => {
    return await getGameConfig(ctx);
  },
});

export const updateConfig = mutation({
  args: {
    updates: v.string(), // JSON-serialized Partial<LTCGConfig>
    updatedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin role check via admin component
    const updates = JSON.parse(args.updates);
    await setGameConfig(ctx, updates, args.updatedBy);
  },
});

export const resetConfig = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete the override row, reverting to package defaults
    const row = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "active"))
      .first();
    if (row) {
      await ctx.db.delete(row._id);
    }
  },
});
```

**Step 2: Verify type-check**

Run: `npx convex typecheck`

**Step 3: Commit**

```bash
git add convex/admin/gameConfig.ts
git commit -m "feat: add admin mutations for runtime game config management"
```

---

## Task 7: Clean up constants.ts — deprecation layer

**Files:**
- Modify: `convex/lib/constants.ts`

**Step 1: Add deprecation notices**

For each constant group that now has a config equivalent, add `@deprecated` JSDoc:

```typescript
/**
 * @deprecated Use getGameConfig(ctx).economy.rarityWeights instead.
 * Kept for backward compatibility with code not yet migrated.
 */
export const RARITY_WEIGHTS = { ... } as const;
```

**Step 2: Remove env var override IIFEs for migrated values**

The `GAME_ECONOMY_CONFIG` env var pattern is replaced by the `gameConfig` table. Keep the constants as static defaults but remove the env var parsing:

```typescript
// Before
export const DAILY_REWARDS = (() => {
  const envConfig = process.env["GAME_ECONOMY_CONFIG"];
  if (envConfig) { ... }
  return DEFAULT_DAILY_REWARDS;
})();

// After
/** @deprecated Use getGameConfig(ctx) for config-driven values */
export const DAILY_REWARDS = DEFAULT_DAILY_REWARDS;
```

Note: Keep `TOKEN`, `SOLANA`, `ELIZAOS_TOKEN` env var patterns — these contain secrets and deployment-specific values that belong in env vars, not config.

**Step 3: Verify nothing breaks**

Run: `npx convex typecheck`

**Step 4: Commit**

```bash
git add convex/lib/constants.ts
git commit -m "refactor: deprecate constants migrated to @lunchtable-tcg/config"
```

---

## Task 8: Integration test — verify full config flow

**Files:**
- Create: `convex/lib/__tests__/gameConfig.test.ts` (or verify manually)

**Step 1: Manual verification checklist**

Since Convex mutations can't be unit tested locally without `convex-test`, verify by:

1. `cd /Users/home/Desktop/LTCG && npx convex typecheck` — all types pass
2. `cd packages/config && bun run test` — config tests pass
3. `cd packages/engine && bun run test` — engine tests pass
4. Check that `getGameConfig` is imported (not constants) in migrated files:
   ```bash
   grep -r "from.*constants" convex/events/handlers/ convex/lib/helpers.ts
   ```
   Should show fewer imports than before.

**Step 2: Verify config package builds**

Run: `cd packages/config && bun run build`

**Step 3: Verify no circular deps**

Run: `cd packages/config && bun run type-check`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify config-driven constants integration"
```

---

## Summary

After these 8 tasks:

1. `@lunchtable-tcg/config` covers ALL game-configurable values
2. `gameConfig` table enables runtime config overrides via admin UI
3. Event handlers, helpers, HTTP routes, and gameplay code read from config
4. `constants.ts` is deprecated as a static fallback layer
5. White-label operators customize via `defineConfig()` at deploy time or admin mutations at runtime

**What's NOT migrated** (intentionally):
- `TOKEN`, `SOLANA`, `ELIZAOS_TOKEN` — remain env var driven (secrets)
- `RATELIMIT_CONFIG` — infrastructure, not game config
- `PAGINATION` — UI concern, not game config
- `GEM_PACKAGES`, `GOLD_BUNDLES`, `SHOP_PACKS` — product definitions that belong in DB (economy component), not config
- `SALES_CONFIG` — operational, not white-label config
