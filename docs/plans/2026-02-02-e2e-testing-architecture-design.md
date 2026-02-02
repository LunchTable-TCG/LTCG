# E2E Testing Architecture Design

**Date:** 2026-02-02
**Status:** Approved
**Author:** Claude + Human collaboration

## Overview

Complete E2E testing architecture for LTCG using Playwright, following 2026 standards for Privy authentication and Convex backend testing.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | Mock JWT (Privy standard) | Bypass UI, sign test JWTs with controlled keys |
| Test Data | Per-test seeding | Full isolation, no shared state |
| Test Organization | Page Object Model | Scalable, maintainable, readable |
| Coverage Scope | Full feature coverage | Comprehensive E2E across all features |
| CI/CD | PR gate with sharding | Block bad merges, parallel execution |
| Environment | Local dev server | Fast feedback, isolated, no external deps |

## 1. Authentication Strategy

### Approach
Mock JWT tokens using Privy's official pattern - generate test JWTs signed with keys we control.

### Implementation

**Test Key Generation** (`e2e/setup/test-auth-keys.ts`):
```typescript
import * as jose from 'jose';

let testKeyPair: { publicKey: jose.KeyLike; privateKey: jose.KeyLike } | null = null;

export async function getTestKeyPair() {
  if (!testKeyPair) {
    testKeyPair = await jose.generateKeyPair('ES256');
  }
  return testKeyPair;
}

export async function getTestPublicJWKS() {
  const { publicKey } = await getTestKeyPair();
  const jwk = await jose.exportJWK(publicKey);
  return { keys: [{ ...jwk, kid: 'test-key-1', use: 'sig' }] };
}
```

**Mock JWT Creation** (`e2e/setup/mock-privy-token.ts`):
```typescript
import * as jose from 'jose';
import { getTestKeyPair } from './test-auth-keys';

export async function createMockPrivyToken(userId: string, appId: string) {
  const { privateKey } = await getTestKeyPair();

  return await new jose.SignJWT({ sid: `test-session-${Date.now()}` })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuer('privy.io')
    .setIssuedAt()
    .setAudience(appId)
    .setSubject(`did:privy:${userId}`)
    .setExpirationTime('1h')
    .sign(privateKey);
}
```

**Test JWKS Endpoint** (`app/api/test-jwks/route.ts`):
```typescript
import { getTestPublicJWKS } from '@/e2e/setup/test-auth-keys';

export async function GET() {
  if (process.env.NODE_ENV !== 'test') {
    return Response.json({ error: 'Not available' }, { status: 404 });
  }
  return Response.json(await getTestPublicJWKS());
}
```

**References:**
- [Privy Mock JWT Documentation](https://docs.privy.io/recipes/mock-jwt)

---

## 2. Test Data Strategy

### Approach
Per-test seeding via Convex mutations with automatic cleanup.

### Implementation

**Test Mutations** (`convex/testing/seed.ts`):
```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const seedTestUser = internalMutation({
  args: {
    privyDid: v.string(),
    displayName: v.string(),
    gold: v.optional(v.number()),
    gems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      privyId: args.privyDid,
      displayName: args.displayName,
      gold: args.gold ?? 1000,
      gems: args.gems ?? 100,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.testing.seed.grantStarterCards, { userId });
    return userId;
  },
});

export const seedTestDeck = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    cardIds: v.array(v.id("cards")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userDecks", {
      ownerId: args.userId,
      name: args.name,
      cards: args.cardIds,
      createdAt: Date.now(),
    });
  },
});

export const cleanupTestUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const decks = await ctx.db
      .query("userDecks")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.userId))
      .collect();
    for (const deck of decks) {
      await ctx.db.delete(deck._id);
    }
    await ctx.db.delete(args.userId);
  },
});
```

**Test Data Factory** (`e2e/setup/factories.ts`):
```typescript
import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../convex/_generated/api";

export class TestDataFactory {
  private client: ConvexHttpClient;
  private createdUsers: Id<"users">[] = [];

  constructor(convexUrl: string) {
    this.client = new ConvexHttpClient(convexUrl);
  }

  async createUser(opts: { displayName?: string } = {}) {
    const privyDid = `did:privy:test-${Date.now()}-${Math.random().toString(36)}`;
    const displayName = opts.displayName ?? `TestPlayer_${Date.now()}`;

    const userId = await this.client.mutation(internal.testing.seed.seedTestUser, {
      privyDid,
      displayName,
    });

    this.createdUsers.push(userId);
    return { userId, privyDid, displayName };
  }

  async cleanup() {
    for (const userId of this.createdUsers) {
      await this.client.mutation(internal.testing.seed.cleanupTestUser, { userId });
    }
    this.createdUsers = [];
  }
}
```

**References:**
- [Convex Testing Patterns](https://stack.convex.dev/testing-patterns)

---

## 3. Page Object Model

### Approach
Encapsulate all page interactions in reusable classes.

### Base Page
```typescript
// e2e/pages/BasePage.ts
import { Page, Locator, expect } from "@playwright/test";

export abstract class BasePage {
  constructor(protected page: Page) {}
  abstract readonly url: string;

  async navigate() {
    await this.page.goto(this.url);
    await this.waitForLoad();
  }

  async waitForLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading"]');
  }

  get toast(): Locator {
    return this.page.locator('[data-testid="toast"]');
  }

  async waitForToast(message: string) {
    await expect(this.toast).toContainText(message, { timeout: 5000 });
  }
}
```

### Page Objects

| Page | File | Key Actions |
|------|------|-------------|
| GamePage | `GamePage.ts` | `summonCard()`, `attackWithCard()`, `endTurn()` |
| DeckBuilderPage | `DeckBuilderPage.ts` | `createNewDeck()`, `addCardToDeck()`, `saveDeck()` |
| ShopPage | `ShopPage.ts` | `buyPack()`, `closePackResults()` |
| LobbyPage | `LobbyPage.ts` | `createLobby()`, `joinLobby()`, `startMatch()` |
| SocialPage | `SocialPage.ts` | `sendFriendRequest()`, `sendMessage()` |
| StoryPage | `StoryPage.ts` | `selectChapter()`, `startBattle()` |

---

## 4. CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx playwright install chromium --with-deps
      - run: |
          bunx convex dev --once &
          sleep 5
      - run: |
          bun run dev &
          bunx wait-on http://localhost:3000 --timeout 60000
        env:
          NODE_ENV: test
      - run: bunx playwright test --project=smoke

  e2e-full:
    if: github.base_ref == 'main' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('bun.lock') }}
      - run: bunx playwright install --with-deps
      - run: |
          bunx convex dev --once &
          sleep 5
      - run: |
          bun run dev &
          bunx wait-on http://localhost:3000 --timeout 60000
        env:
          NODE_ENV: test
      - run: bunx playwright test --shard=${{ matrix.shard }}/4
```

### Test Projects

| Project | Scope | When |
|---------|-------|------|
| smoke | Critical paths only | Every PR |
| chromium | Full suite | PRs to main |
| firefox | Full suite | PRs to main |
| webkit | Full suite | PRs to main |
| mobile-chrome | Full suite | PRs to main |

---

## 5. Test Environment

### Configuration

```bash
# .env.test
NODE_ENV=test
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_PRIVY_APP_ID=cml0fnzn501t7lc0buoz8kt74
CONVEX_TEST_MODE=true
```

### Fixtures

```typescript
// e2e/setup/fixtures.ts
import { test as base, expect, Page } from "@playwright/test";
import { TestDataFactory } from "./factories";
import { createMockPrivyToken } from "./mock-privy-token";
import { TEST_ENV } from "./env";
import { GamePage, DeckBuilderPage, ShopPage } from "../pages";

export { expect };

type TestFixtures = {
  factory: TestDataFactory;
  testUser: { userId: string; privyDid: string; displayName: string; token: string };
  authenticatedPage: Page;
  gamePage: GamePage;
  deckPage: DeckBuilderPage;
  shopPage: ShopPage;
};

export const test = base.extend<TestFixtures>({
  factory: async ({}, use) => {
    const factory = new TestDataFactory(TEST_ENV.CONVEX_URL);
    await use(factory);
    await factory.cleanup();
  },

  testUser: async ({ factory }, use) => {
    const user = await factory.createUser();
    const token = await createMockPrivyToken(user.privyDid, TEST_ENV.PRIVY_APP_ID);
    await use({ ...user, token });
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await page.addInitScript(
      ({ token, privyDid }) => {
        localStorage.setItem("privy:token", token);
        localStorage.setItem("privy:user", JSON.stringify({ id: privyDid }));
        localStorage.setItem("privy:authenticated", "true");
      },
      { token: testUser.token, privyDid: testUser.privyDid }
    );
    await use(page);
  },

  gamePage: async ({ authenticatedPage }, use) => {
    await use(new GamePage(authenticatedPage));
  },

  deckPage: async ({ authenticatedPage }, use) => {
    await use(new DeckBuilderPage(authenticatedPage));
  },

  shopPage: async ({ authenticatedPage }, use) => {
    await use(new ShopPage(authenticatedPage));
  },
});
```

---

## 6. Directory Structure

```
e2e/
├── setup/
│   ├── env.ts                 # Environment config
│   ├── fixtures.ts            # Playwright fixtures
│   ├── factories.ts           # Test data factory
│   ├── mock-privy-token.ts    # JWT generation
│   ├── test-auth-keys.ts      # ECDSA key pair
│   ├── global-setup.ts        # Pre-test setup
│   └── global-teardown.ts     # Post-test cleanup
├── pages/
│   ├── index.ts               # Export all pages
│   ├── BasePage.ts            # Common page functionality
│   ├── GamePage.ts            # Gameplay interactions
│   ├── DeckBuilderPage.ts     # Deck building
│   ├── ShopPage.ts            # Economy/shop
│   ├── LobbyPage.ts           # Matchmaking
│   ├── SocialPage.ts          # Friends/chat
│   └── StoryPage.ts           # Story mode
├── specs/
│   ├── smoke.spec.ts          # Critical path smoke tests
│   ├── auth.spec.ts           # Authentication flows
│   ├── gameplay.spec.ts       # Game mechanics
│   ├── deck.spec.ts           # Deck building
│   ├── economy.spec.ts        # Shop/currency
│   ├── social.spec.ts         # Social features
│   └── story.spec.ts          # Story mode
└── playwright.config.ts
```

---

## 7. Test Coverage Matrix

### Critical Paths (Smoke Tests)
- [ ] User can authenticate
- [ ] User can create and save a deck
- [ ] User can complete a full game match
- [ ] User can purchase and open a pack

### Full Coverage

| Feature | Tests |
|---------|-------|
| Authentication | Login, logout, session persistence |
| Deck Building | Create, edit, save, delete, validate 30-card rule |
| Gameplay | Summon, attack, effects, phases, win/lose conditions |
| Economy | Buy packs, open packs, gold/gems balance updates |
| Story Mode | Chapter selection, AI battles, progress saving |
| Social | Friend requests, chat, leaderboards, profiles |
| Real-time | WebSocket updates, opponent moves, currency sync |

---

## 8. Implementation Order

1. **Phase 1: Infrastructure**
   - Test auth keys and mock JWT
   - Test data factory and Convex mutations
   - Playwright fixtures

2. **Phase 2: Page Objects**
   - BasePage with common functionality
   - GamePage, DeckBuilderPage, ShopPage
   - LobbyPage, SocialPage, StoryPage

3. **Phase 3: Smoke Tests**
   - Auth flow
   - Deck save flow
   - Purchase flow
   - Complete game flow

4. **Phase 4: Full Suite**
   - Gameplay edge cases
   - Effect system tests
   - Social feature tests
   - Real-time sync tests

5. **Phase 5: CI/CD**
   - GitHub Actions workflow
   - Sharding configuration
   - Report merging

---

## References

- [Privy Mock JWT Documentation](https://docs.privy.io/recipes/mock-jwt)
- [Privy Test Accounts](https://docs.privy.io/recipes/using-test-accounts)
- [Convex Testing Patterns](https://stack.convex.dev/testing-patterns)
- [Playwright Best Practices 2026](https://www.browserstack.com/guide/playwright-best-practices)
- [Playwright Authentication](https://playwright.dev/docs/auth)
