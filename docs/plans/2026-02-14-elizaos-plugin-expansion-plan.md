# Phase 5: ElizaOS Plugin Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add operator actions to the ElizaOS plugin so AI agents can manage their white-label TCG deployment (update config, seed cards), backed by new admin HTTP endpoints on the Convex backend.

**Architecture:** Add `/api/admin/*` HTTP routes to Convex that call existing admin mutations (`gameConfig.getConfig`, `gameConfig.updateConfig`). Add a card-seeding endpoint. Extend the plugin's `LTCGApiClient` with admin methods, then build 3 operator actions + 1 operator provider that use them. Register everything in the plugin.

**Tech Stack:** TypeScript, ElizaOS v2, Convex httpActions, `@lunchtable-tcg/engine`, `@lunchtable-tcg/config`

---

## Task 1: Add admin HTTP routes to Convex backend

**Files:**
- Create: `convex/http/admin.ts`
- Modify: `convex/router.ts`

The plugin communicates with Convex via REST. Operator actions need admin endpoints. We'll add 3 routes under `/api/admin/*` that call existing Convex mutations.

The auth pattern uses API key authentication. Admin routes will reuse the same `authHttpAction` middleware from `convex/http/middleware/auth.ts` — the operator's agent already has an API key. For now, any authenticated agent can call admin routes (a TODO for role-based access control later).

**Step 1: Create admin HTTP handlers**

Create `convex/http/admin.ts`:

```typescript
/**
 * Admin API Endpoints
 *
 * Operator-level endpoints for managing game configuration and seeding cards.
 * These are called by ElizaOS agents with operator privileges.
 */

// Workaround for TS2589 (excessively deep type instantiation)
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const api = (generatedApi as any).api;
import { httpAction } from "../_generated/server";
import {
  corsPreflightResponse,
  errorResponse,
  parseJsonBody,
  successResponse,
} from "./middleware/responses";

/**
 * GET /api/admin/config
 * Get the current active game configuration.
 */
export const getConfig = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const config = await ctx.runQuery(api.admin.gameConfig.getConfig, {});
    return successResponse(config);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to get config",
      500,
    );
  }
});

/**
 * PUT /api/admin/config
 * Update game configuration at runtime.
 * Body: { updates: object, updatedBy?: string }
 */
export const updateConfig = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "PUT") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only PUT method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      updates: Record<string, unknown>;
      updatedBy?: string;
    }>(request);

    if (body instanceof Response) return body;

    if (!body.updates || typeof body.updates !== "object") {
      return errorResponse("VALIDATION_ERROR", "updates must be an object", 400);
    }

    await ctx.runMutation(api.admin.gameConfig.updateConfig, {
      updates: JSON.stringify(body.updates),
      updatedBy: body.updatedBy,
    });

    // Return the new config
    const config = await ctx.runQuery(api.admin.gameConfig.getConfig, {});
    return successResponse(config);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to update config",
      500,
    );
  }
});

/**
 * POST /api/admin/seed-cards
 * Seed card definitions into the database.
 * Body: { cards: ConvexCardRow[] }
 *
 * The plugin validates cards client-side using @lunchtable-tcg/engine
 * before sending ConvexCardRow[] here. This endpoint just inserts rows.
 */
export const seedCards = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    const body = await parseJsonBody<{
      cards: Array<{
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
        ability?: unknown;
        flavorText?: string;
        imageUrl?: string;
      }>;
    }>(request);

    if (body instanceof Response) return body;

    if (!Array.isArray(body.cards) || body.cards.length === 0) {
      return errorResponse("VALIDATION_ERROR", "cards must be a non-empty array", 400);
    }

    // Insert each card into cardDefinitions table
    let seeded = 0;
    for (const card of body.cards) {
      await ctx.runMutation(api.admin.seedCard.insertCard, {
        name: card.name,
        rarity: card.rarity,
        archetype: card.archetype ?? "",
        cardType: card.cardType,
        attack: card.attack,
        defense: card.defense,
        cost: card.cost ?? 0,
        level: card.level,
        attribute: card.attribute,
        spellType: card.spellType,
        trapType: card.trapType,
        viceType: card.viceType,
        ability: card.ability,
        flavorText: card.flavorText,
        imageUrl: card.imageUrl,
        isActive: true,
        createdAt: Date.now(),
      });
      seeded++;
    }

    return successResponse({ seeded, total: body.cards.length });
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Failed to seed cards",
      500,
    );
  }
});
```

**Step 2: Create the seedCard admin mutation**

Create `convex/admin/seedCard.ts`:

```typescript
import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Insert a single card definition into the database.
 * Called by the admin seed-cards HTTP endpoint.
 */
export const insertCard = mutation({
  args: {
    name: v.string(),
    rarity: v.string(),
    archetype: v.string(),
    cardType: v.string(),
    attack: v.optional(v.number()),
    defense: v.optional(v.number()),
    cost: v.number(),
    level: v.optional(v.number()),
    attribute: v.optional(v.string()),
    spellType: v.optional(v.string()),
    trapType: v.optional(v.string()),
    viceType: v.optional(v.string()),
    ability: v.optional(v.any()),
    flavorText: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Add admin role check
    await ctx.db.insert("cardDefinitions", args);
  },
});
```

**Step 3: Register admin routes in router.ts**

Add to `convex/router.ts` after the existing imports:

```typescript
// Admin Management
import * as admin from "./http/admin";
```

Then add route registrations at the end (before `export default http;`):

```typescript
// ============================================================================
// Admin Management Endpoints
// ============================================================================

// GET /api/admin/config - Get current game configuration
http.route({
  path: "/api/admin/config",
  method: "GET",
  handler: admin.getConfig,
});

// OPTIONS /api/admin/config - CORS preflight
http.route({
  path: "/api/admin/config",
  method: "OPTIONS",
  handler: admin.getConfig,
});

// PUT /api/admin/config - Update game configuration
http.route({
  path: "/api/admin/config",
  method: "PUT",
  handler: admin.updateConfig,
});

// OPTIONS /api/admin/config - CORS preflight for PUT
http.route({
  path: "/api/admin/config",
  method: "OPTIONS",
  handler: admin.updateConfig,
});

// POST /api/admin/seed-cards - Seed card definitions
http.route({
  path: "/api/admin/seed-cards",
  method: "POST",
  handler: admin.seedCards,
});

// OPTIONS /api/admin/seed-cards - CORS preflight
http.route({
  path: "/api/admin/seed-cards",
  method: "OPTIONS",
  handler: admin.seedCards,
});
```

**Step 4: Build to verify**

Run: `cd /Users/home/Desktop/LTCG && npx convex dev --once 2>&1 | head -20` (or just `npx convex typecheck`)

If Convex dev isn't available locally, verify with TypeScript: `cd /Users/home/Desktop/LTCG && bunx tsc --noEmit convex/http/admin.ts convex/admin/seedCard.ts` (or check for syntax errors by reading).

**Step 5: Commit**

```bash
git add convex/http/admin.ts convex/admin/seedCard.ts convex/router.ts
git commit -m "feat: add admin HTTP routes for config management and card seeding"
```

---

## Task 2: Add admin methods to LTCGApiClient

**Files:**
- Modify: `packages/plugin-ltcg/src/client/LTCGApiClient.ts`
- Modify: `packages/plugin-ltcg/src/constants.ts`

Extend the existing API client with methods for admin endpoints.

**Step 1: Add admin endpoint constants**

Add to `packages/plugin-ltcg/src/constants.ts` inside `API_ENDPOINTS`:

```typescript
  // Admin
  ADMIN_GET_CONFIG: "/api/admin/config",
  ADMIN_UPDATE_CONFIG: "/api/admin/seed-cards",
  ADMIN_SEED_CARDS: "/api/admin/seed-cards",
```

Wait — fix the update config path:

```typescript
  // Admin
  ADMIN_GET_CONFIG: "/api/admin/config",
  ADMIN_UPDATE_CONFIG: "/api/admin/config",
  ADMIN_SEED_CARDS: "/api/admin/seed-cards",
```

**Step 2: Add admin methods to LTCGApiClient**

Add these methods to the `LTCGApiClient` class in `packages/plugin-ltcg/src/client/LTCGApiClient.ts`. Add them at the end of the class, before the closing brace:

```typescript
  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  /**
   * Get the current game configuration.
   */
  async getGameConfig(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      API_ENDPOINTS.ADMIN_GET_CONFIG,
      { method: "GET" },
    );
  }

  /**
   * Update game configuration at runtime.
   */
  async updateGameConfig(
    updates: Record<string, unknown>,
    updatedBy?: string,
  ): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(
      API_ENDPOINTS.ADMIN_UPDATE_CONFIG,
      {
        method: "PUT",
        body: JSON.stringify({ updates, updatedBy }),
      },
    );
  }

  /**
   * Seed card definitions into the database.
   * Cards should already be converted to ConvexCardRow format.
   */
  async seedCards(
    cards: Array<Record<string, unknown>>,
  ): Promise<{ seeded: number; total: number }> {
    return this.request<{ seeded: number; total: number }>(
      API_ENDPOINTS.ADMIN_SEED_CARDS,
      {
        method: "POST",
        body: JSON.stringify({ cards }),
      },
    );
  }
```

**Step 3: Commit**

```bash
git add packages/plugin-ltcg/src/client/LTCGApiClient.ts packages/plugin-ltcg/src/constants.ts
git commit -m "feat(plugin): add admin API client methods for config and card seeding"
```

---

## Task 3: Create updateConfigAction operator action

**Files:**
- Create: `packages/plugin-ltcg/src/actions/operator/updateConfigAction.ts`
- Create: `packages/plugin-ltcg/src/actions/operator/index.ts`

Follow the existing action pattern (see `registerAgentAction.ts` for reference).

**Step 1: Create operator actions directory and updateConfigAction**

Create `packages/plugin-ltcg/src/actions/operator/updateConfigAction.ts`:

```typescript
/**
 * Update Config Operator Action
 *
 * Allows the agent operator to adjust game configuration at runtime.
 * Supports economy, progression, competitive, and social settings.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";
import { LTCGApiClient } from "../../client/LTCGApiClient";
import { extractJsonFromLlmResponse } from "../../utils/safeParseJson";

export const updateConfigAction: Action = {
  name: "UPDATE_GAME_CONFIG",
  similes: ["ADJUST_ECONOMY", "CHANGE_SETTINGS", "CONFIGURE_GAME", "SET_CONFIG"],
  description:
    "Update game configuration settings like economy values, XP rewards, ELO parameters, or other runtime settings",

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
    const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
    return !!apiKey && !!apiUrl;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling UPDATE_GAME_CONFIG action");

      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

      // Get current config for context
      const currentConfig = await client.getGameConfig();

      // Use LLM to interpret the user's request into config updates
      const prompt = `You are a game configuration assistant. The user wants to update game settings.

Current configuration (abbreviated):
${JSON.stringify(currentConfig, null, 2).slice(0, 2000)}

User request: "${message.content.text}"

Extract the configuration updates as a JSON object matching the config structure.
Only include fields that should change.

Examples:
- "increase XP for ranked wins to 50" → { "progression": { "xp": { "rankedWin": 50 } } }
- "set wager winner percentage to 85%" → { "economy": { "wagerWinnerPct": 0.85 } }
- "change default ELO to 1200" → { "competitive": { "elo": { "defaultRating": 1200 } } }

Respond with JSON only: { "updates": { ... }, "summary": "..." }`;

      const decision = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      const parsed = extractJsonFromLlmResponse(decision, {
        updates: {},
        summary: "No changes",
      });

      if (!parsed.updates || Object.keys(parsed.updates).length === 0) {
        await callback({
          text: "I couldn't determine what configuration changes to make. Please be more specific about which settings to update.",
        } as Content);
        return { success: false, text: "No config updates determined" };
      }

      // Apply the updates
      const agentName = runtime.character?.name || "Agent";
      const result = await client.updateGameConfig(parsed.updates, agentName);

      const responseText = `Game configuration updated successfully.

**Changes:** ${parsed.summary}

The new configuration is now active.`;

      await callback({
        text: responseText,
        actions: ["UPDATE_GAME_CONFIG"],
        source: message.content.source,
      } as Content);

      return {
        success: true,
        text: "Config updated",
        values: { updates: parsed.updates, summary: parsed.summary },
      };
    } catch (error) {
      logger.error({ error }, "Error in UPDATE_GAME_CONFIG action");

      await callback({
        text: `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      } as Content);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Increase XP for ranked wins to 50" },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Game configuration updated successfully.\n\n**Changes:** Increased ranked win XP from 30 to 50\n\nThe new configuration is now active.',
          actions: ["UPDATE_GAME_CONFIG"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Set the wager winner percentage to 85%" },
      },
      {
        name: "{{name2}}",
        content: {
          text: 'Game configuration updated successfully.\n\n**Changes:** Set wager winner percentage to 0.85\n\nThe new configuration is now active.',
          actions: ["UPDATE_GAME_CONFIG"],
        },
      },
    ],
  ],
};
```

**Step 2: Create operator index**

Create `packages/plugin-ltcg/src/actions/operator/index.ts`:

```typescript
/**
 * Operator Actions Index
 *
 * Actions for game operators to manage their white-label TCG deployment.
 */

import { updateConfigAction } from "./updateConfigAction";

export const operatorActions = [updateConfigAction];

export { updateConfigAction };
```

**Step 3: Commit**

```bash
git add packages/plugin-ltcg/src/actions/operator/
git commit -m "feat(plugin): add updateConfigAction operator action"
```

---

## Task 4: Create seedCardsAction operator action

**Files:**
- Create: `packages/plugin-ltcg/src/actions/operator/seedCardsAction.ts`
- Modify: `packages/plugin-ltcg/src/actions/operator/index.ts`
- Modify: `packages/plugin-ltcg/package.json` (add engine dependency)

This action validates cards using `@lunchtable-tcg/engine`, converts to Convex row format, and seeds them via the admin API.

**Step 1: Add engine dependency**

Add `@lunchtable-tcg/engine` to `packages/plugin-ltcg/package.json` dependencies:

```json
"@lunchtable-tcg/engine": "workspace:*"
```

Run: `cd /Users/home/Desktop/LTCG && bun install`

**Step 2: Create seedCardsAction**

Create `packages/plugin-ltcg/src/actions/operator/seedCardsAction.ts`:

```typescript
/**
 * Seed Cards Operator Action
 *
 * Validates card definitions using @lunchtable-tcg/engine,
 * converts to Convex row format, and seeds them into the database.
 */

import type {
  Action,
  ActionResult,
  Content,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { ModelType, logger } from "@elizaos/core";
import { loadCardsFromJSON, toConvexCardRows } from "@lunchtable-tcg/engine";
import { LTCGApiClient } from "../../client/LTCGApiClient";
import { extractJsonFromLlmResponse } from "../../utils/safeParseJson";

export const seedCardsAction: Action = {
  name: "SEED_CARDS",
  similes: ["CREATE_CARDS", "ADD_CARDS", "IMPORT_CARDS", "UPLOAD_CARDS"],
  description:
    "Validate and seed card definitions into the game database using the engine's card format",

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<boolean> => {
    const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
    const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
    return !!apiKey && !!apiUrl;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      logger.info("Handling SEED_CARDS action");

      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;
      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

      const messageText = message.content.text || "";

      // Check if the message contains JSON card data directly
      let cardsJson: string | null = null;
      const jsonMatch = messageText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cardsJson = jsonMatch[0];
      }

      if (!cardsJson) {
        // Use LLM to generate cards from natural language description
        const prompt = `Generate trading card game card definitions as a JSON array.

User request: "${messageText}"

Each card must have: id, name, type ("stereotype"|"spell"|"trap"), description, rarity ("common"|"uncommon"|"rare"|"epic"|"legendary").

Stereotypes also need: attack (number), defense (number), level (1-12).
Spells need: spellType ("normal"|"continuous"|"equip"|"field"|"quick-play"|"ritual").
Traps need: trapType ("normal"|"continuous"|"counter").

Optional fields: attribute, archetype, viceType, flavorText, cost, effects.

Respond with ONLY a JSON array of card objects.`;

        const generated = await runtime.useModel(ModelType.TEXT_SMALL, {
          prompt,
          temperature: 0.7,
          maxTokens: 2000,
        });

        cardsJson = generated;
      }

      // Validate cards using engine
      let lookup;
      try {
        lookup = loadCardsFromJSON(cardsJson);
      } catch (validationError) {
        await callback({
          text: `Card validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
          error: true,
        } as Content);
        return {
          success: false,
          error:
            validationError instanceof Error
              ? validationError
              : new Error(String(validationError)),
        };
      }

      const cardCount = Object.keys(lookup).length;
      const cards = Object.values(lookup);

      // Convert to Convex row format
      const rows = toConvexCardRows(cards);

      // Seed via admin API
      const result = await client.seedCards(rows as Array<Record<string, unknown>>);

      const cardNames = cards
        .slice(0, 5)
        .map((c) => c.name)
        .join(", ");
      const moreText = cardCount > 5 ? ` and ${cardCount - 5} more` : "";

      await callback({
        text: `Successfully seeded ${result.seeded} cards: ${cardNames}${moreText}`,
        actions: ["SEED_CARDS"],
        source: message.content.source,
      } as Content);

      return {
        success: true,
        text: `Seeded ${result.seeded} cards`,
        values: { seeded: result.seeded, total: result.total },
      };
    } catch (error) {
      logger.error({ error }, "Error in SEED_CARDS action");

      await callback({
        text: `Failed to seed cards: ${error instanceof Error ? error.message : String(error)}`,
        error: true,
      } as Content);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{name1}}",
        content: {
          text: 'Seed these cards: [{"id":"fire-knight","name":"Fire Knight","type":"stereotype","description":"A blazing warrior","rarity":"rare","attack":1800,"defense":1200,"level":4,"attribute":"fire"}]',
        },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully seeded 1 cards: Fire Knight",
          actions: ["SEED_CARDS"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Create 3 water-themed stereotype cards for a new expansion" },
      },
      {
        name: "{{name2}}",
        content: {
          text: "Successfully seeded 3 cards: Tidal Guardian, Ocean Sage, Deep Sea Leviathan",
          actions: ["SEED_CARDS"],
        },
      },
    ],
  ],
};
```

**Step 3: Update operator index**

Update `packages/plugin-ltcg/src/actions/operator/index.ts`:

```typescript
/**
 * Operator Actions Index
 *
 * Actions for game operators to manage their white-label TCG deployment.
 */

import { seedCardsAction } from "./seedCardsAction";
import { updateConfigAction } from "./updateConfigAction";

export const operatorActions = [updateConfigAction, seedCardsAction];

export { updateConfigAction, seedCardsAction };
```

**Step 4: Commit**

```bash
git add packages/plugin-ltcg/src/actions/operator/seedCardsAction.ts packages/plugin-ltcg/src/actions/operator/index.ts packages/plugin-ltcg/package.json bun.lock
git commit -m "feat(plugin): add seedCardsAction operator action with engine validation"
```

---

## Task 5: Add configProvider and register operator actions in plugin

**Files:**
- Create: `packages/plugin-ltcg/src/providers/configProvider.ts`
- Modify: `packages/plugin-ltcg/src/providers/index.ts`
- Modify: `packages/plugin-ltcg/src/actions/index.ts`
- Modify: `packages/plugin-ltcg/src/index.ts`

**Step 1: Create configProvider**

Create `packages/plugin-ltcg/src/providers/configProvider.ts`:

```typescript
/**
 * Config Provider
 *
 * Supplies current game configuration to the LLM context.
 * Used by operator actions to understand current settings before making changes.
 */

import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

export const configProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
  ): Promise<ProviderResult> => {
    try {
      const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
      const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

      if (!apiKey || !apiUrl) {
        return { text: "Game configuration unavailable (not authenticated)." };
      }

      const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });
      const config = await client.getGameConfig();

      const text = `Current Game Configuration:
${JSON.stringify(config, null, 2)}`;

      return { text, values: config as Record<string, unknown> };
    } catch (error) {
      logger.debug({ error }, "Failed to fetch game config for provider");
      return { text: "Game configuration unavailable." };
    }
  },
};
```

**Step 2: Add configProvider to providers index**

Read `packages/plugin-ltcg/src/providers/index.ts` and add `configProvider` to the exports and the `ltcgProviders` array.

Add import:
```typescript
import { configProvider } from "./configProvider";
```

Add to the `ltcgProviders` array:
```typescript
configProvider,
```

Add to named exports:
```typescript
export { configProvider };
```

**Step 3: Add operator actions to actions index**

In `packages/plugin-ltcg/src/actions/index.ts`, import and add operator actions:

Add import:
```typescript
import { operatorActions, updateConfigAction, seedCardsAction } from "./operator";
```

Add to the `ltcgActions` array (after the Personality & Chat section):
```typescript
  // Operator Actions
  ...operatorActions,
```

Add to named exports:
```typescript
  // Operator
  updateConfigAction,
  seedCardsAction,
```

**Step 4: Export operator actions from main index.ts**

In `packages/plugin-ltcg/src/index.ts`, add after the existing action exports:

```typescript
// Operator Actions
export { updateConfigAction, seedCardsAction } from "./actions/operator";

// Config Provider
export { configProvider } from "./providers/configProvider";
```

**Step 5: Commit**

```bash
git add packages/plugin-ltcg/src/providers/configProvider.ts packages/plugin-ltcg/src/providers/index.ts packages/plugin-ltcg/src/actions/index.ts packages/plugin-ltcg/src/actions/operator/ packages/plugin-ltcg/src/index.ts
git commit -m "feat(plugin): register operator actions and configProvider in plugin"
```

---

## Task 6: Integration verification

**Files:**
- None (verification only)

**Step 1: Type-check plugin**

Run: `cd /Users/home/Desktop/LTCG/packages/plugin-ltcg && bun run type-check 2>&1 | tail -20`

If there are pre-existing type errors, verify only that our new files don't add new errors:
```bash
cd /Users/home/Desktop/LTCG && bunx tsc --noEmit --pretty packages/plugin-ltcg/src/actions/operator/updateConfigAction.ts packages/plugin-ltcg/src/actions/operator/seedCardsAction.ts packages/plugin-ltcg/src/providers/configProvider.ts
```

**Step 2: Verify engine tests still pass**

Run: `cd /Users/home/Desktop/LTCG/packages/engine && bun run test`
Expected: All 95 tests pass

**Step 3: Verify new files exist and are properly structured**

Run: `ls -la /Users/home/Desktop/LTCG/convex/http/admin.ts /Users/home/Desktop/LTCG/convex/admin/seedCard.ts /Users/home/Desktop/LTCG/packages/plugin-ltcg/src/actions/operator/updateConfigAction.ts /Users/home/Desktop/LTCG/packages/plugin-ltcg/src/actions/operator/seedCardsAction.ts /Users/home/Desktop/LTCG/packages/plugin-ltcg/src/providers/configProvider.ts`

**Step 4: Verify operator actions are in the plugin action list**

Run: `cd /Users/home/Desktop/LTCG && grep -c "operatorActions\|updateConfigAction\|seedCardsAction" packages/plugin-ltcg/src/actions/index.ts`

Expected: Multiple matches confirming integration.

---

## Summary

After these 6 tasks:

1. **Admin HTTP routes** — `/api/admin/config` (GET/PUT) and `/api/admin/seed-cards` (POST) on the Convex backend
2. **Admin API client** — `getGameConfig()`, `updateGameConfig()`, `seedCards()` methods on `LTCGApiClient`
3. **updateConfigAction** — Operator can adjust economy, progression, competitive settings via natural language
4. **seedCardsAction** — Operator can validate and seed cards using `@lunchtable-tcg/engine` types
5. **configProvider** — Supplies current game config to LLM context for informed decisions

**Operator workflow:**
```
Agent operator: "Increase ranked XP rewards to 50"
→ Plugin fetches current config via configProvider
→ LLM interprets request into config patch
→ Plugin calls PUT /api/admin/config
→ Config updated at runtime

Agent operator: "Seed these cards: [{...}]"
→ Plugin validates cards with loadCardsFromJSON (engine)
→ Converts to Convex rows with toConvexCardRows (engine)
→ Plugin calls POST /api/admin/seed-cards
→ Cards inserted into database
```

**Future operator actions (not in this plan — need backend support first):**
- `runTournament` — needs tournament tables/logic
- `banPlayer` — needs moderation tables/logic
- `setSeason` — needs season management tables/logic
