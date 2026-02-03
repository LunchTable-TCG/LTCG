# E2E Testing Architecture - Task Graph

## Overview
Implementation of comprehensive E2E testing infrastructure following 2026 Privy and Convex standards.

**Design Document**: `docs/plans/2026-02-02-e2e-testing-architecture-design.md`

---

## Phase 1: Infrastructure Foundation (Sequential)

### Task 1.1: Auth Key Infrastructure
**Status**: Pending
**Dependencies**: None
**Agent**: general-purpose

**Deliverables**:
- `e2e/setup/test-auth-keys.ts` - ECDSA P256 key pair generation
- `e2e/setup/mock-privy-token.ts` - JWT creation with Privy format
- `e2e/setup/env.ts` - Environment configuration

### Task 1.2: Test JWKS Endpoint
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose

**Deliverables**:
- `apps/web/app/api/test-jwks/route.ts` - Next.js API route for test public keys

---

## Phase 2: Convex Test Mutations (Parallel after 1.1)

### Task 2.1: User Seed Mutation
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 2.2, 2.3)

**Deliverables**:
- `convex/testing/seedTestUser.ts`

### Task 2.2: Deck Seed Mutation
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 2.1, 2.3)

**Deliverables**:
- `convex/testing/seedTestDeck.ts`

### Task 2.3: Cleanup Mutation
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 2.1, 2.2)

**Deliverables**:
- `convex/testing/cleanup.ts`

### Task 2.4: Test Data Factory
**Status**: Pending
**Dependencies**: Tasks 2.1, 2.2, 2.3
**Agent**: general-purpose

**Deliverables**:
- `e2e/setup/factories.ts`

---

## Phase 3: Page Objects (Parallel after 1.1)

### Task 3.1: Base Page Object
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/pages/BasePage.ts`
- `e2e/pages/index.ts`

### Task 3.2: Game Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.3-3.7)

**Deliverables**:
- `e2e/pages/GamePage.ts`

### Task 3.3: Deck Builder Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.2, 3.4-3.7)

**Deliverables**:
- `e2e/pages/DeckBuilderPage.ts`

### Task 3.4: Shop Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.2-3.3, 3.5-3.7)

**Deliverables**:
- `e2e/pages/ShopPage.ts`

### Task 3.5: Lobby Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.2-3.4, 3.6-3.7)

**Deliverables**:
- `e2e/pages/LobbyPage.ts`

### Task 3.6: Social Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.2-3.5, 3.7)

**Deliverables**:
- `e2e/pages/SocialPage.ts`

### Task 3.7: Story Page Object
**Status**: Pending
**Dependencies**: Task 3.1
**Agent**: general-purpose
**Parallelizable**: Yes (with 3.2-3.6)

**Deliverables**:
- `e2e/pages/StoryPage.ts`

---

## Phase 4: Fixtures & Config (After Phase 2 & 3.1)

### Task 4.1: Playwright Fixtures
**Status**: Pending
**Dependencies**: Tasks 2.4, 3.1
**Agent**: general-purpose

**Deliverables**:
- `e2e/setup/fixtures.ts`

### Task 4.2: Global Setup/Teardown
**Status**: Pending
**Dependencies**: Task 1.1
**Agent**: general-purpose

**Deliverables**:
- `e2e/setup/global-setup.ts`
- `e2e/setup/global-teardown.ts`

### Task 4.3: Playwright Config
**Status**: Pending
**Dependencies**: Tasks 4.1, 4.2
**Agent**: general-purpose

**Deliverables**:
- `e2e/playwright.config.ts` (update existing)

---

## Phase 5: Spec Files (After Phase 4)

### Task 5.1: Smoke Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes (with 5.2-5.7)

**Deliverables**:
- `e2e/smoke.spec.ts` (rewrite)

### Task 5.2: Auth Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/auth.spec.ts` (rewrite)

### Task 5.3: Gameplay Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/gameplay.spec.ts` (rewrite)

### Task 5.4: Deck Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/deck.spec.ts` (rewrite)

### Task 5.5: Economy Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/economy.spec.ts` (rewrite)

### Task 5.6: Social Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/social.spec.ts` (rewrite)

### Task 5.7: Story Tests
**Status**: Pending
**Dependencies**: Task 4.3
**Agent**: general-purpose
**Parallelizable**: Yes

**Deliverables**:
- `e2e/story.spec.ts` (rewrite)

---

## Phase 6: CI/CD (After Phase 5)

### Task 6.1: GitHub Actions Workflow
**Status**: Pending
**Dependencies**: All Phase 5 tasks
**Agent**: general-purpose

**Deliverables**:
- `.github/workflows/e2e.yml`

---

## Dependency Graph

```
Phase 1 (Sequential):
[1.1 Auth Keys] ──→ [1.2 JWKS Endpoint]
       │
       ↓
Phase 2 (Parallel):
       ├──→ [2.1 User Seed]  ──┐
       ├──→ [2.2 Deck Seed]  ──┼──→ [2.4 Factory]
       └──→ [2.3 Cleanup]    ──┘

Phase 3 (Parallel):
[1.1] ──→ [3.1 BasePage] ──┬──→ [3.2 GamePage]
                           ├──→ [3.3 DeckBuilderPage]
                           ├──→ [3.4 ShopPage]
                           ├──→ [3.5 LobbyPage]
                           ├──→ [3.6 SocialPage]
                           └──→ [3.7 StoryPage]

Phase 4 (Mixed):
[2.4 Factory] + [3.1 BasePage] ──→ [4.1 Fixtures]
[1.1] ──→ [4.2 Global Setup]
[4.1] + [4.2] ──→ [4.3 Playwright Config]

Phase 5 (Parallel):
[4.3] ──┬──→ [5.1 Smoke Tests]
        ├──→ [5.2 Auth Tests]
        ├──→ [5.3 Gameplay Tests]
        ├──→ [5.4 Deck Tests]
        ├──→ [5.5 Economy Tests]
        ├──→ [5.6 Social Tests]
        └──→ [5.7 Story Tests]

Phase 6:
[All Phase 5] ──→ [6.1 CI/CD Workflow]
```

---

## Execution Waves

### Wave 1: Foundation (1 agent)
- Task 1.1: Auth Key Infrastructure

### Wave 2: JWKS + Convex Mutations + BasePage (4 agents parallel)
- Task 1.2: JWKS Endpoint
- Task 2.1: User Seed
- Task 2.2: Deck Seed
- Task 2.3: Cleanup
- Task 3.1: BasePage

### Wave 3: Page Objects + Factory (6 agents parallel)
- Task 2.4: Factory
- Task 3.2: GamePage
- Task 3.3: DeckBuilderPage
- Task 3.4: ShopPage
- Task 3.5: LobbyPage
- Task 3.6: SocialPage
- Task 3.7: StoryPage

### Wave 4: Fixtures & Config (3 agents)
- Task 4.1: Fixtures
- Task 4.2: Global Setup
- Task 4.3: Playwright Config (after 4.1, 4.2)

### Wave 5: Spec Files (7 agents parallel)
- Tasks 5.1-5.7: All spec files

### Wave 6: CI/CD (1 agent)
- Task 6.1: GitHub Actions

---

## Progress Tracking

| Task | Status | Agent | Checkpoint |
|------|--------|-------|------------|
| 1.1 | Pending | - | - |
| 1.2 | Pending | - | - |
| 2.1 | Pending | - | - |
| 2.2 | Pending | - | - |
| 2.3 | Pending | - | - |
| 2.4 | Pending | - | - |
| 3.1 | Pending | - | - |
| 3.2 | Pending | - | - |
| 3.3 | Pending | - | - |
| 3.4 | Pending | - | - |
| 3.5 | Pending | - | - |
| 3.6 | Pending | - | - |
| 3.7 | Pending | - | - |
| 4.1 | Pending | - | - |
| 4.2 | Pending | - | - |
| 4.3 | Pending | - | - |
| 5.1 | Pending | - | - |
| 5.2 | Pending | - | - |
| 5.3 | Pending | - | - |
| 5.4 | Pending | - | - |
| 5.5 | Pending | - | - |
| 5.6 | Pending | - | - |
| 5.7 | Pending | - | - |
| 6.1 | Pending | - | - |
