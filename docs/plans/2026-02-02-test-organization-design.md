# Test Organization Design

**Date:** 2026-02-02
**Status:** Approved
**Goal:** Reorganize monorepo tests following 2026 best practices with centralized `__tests__/` folders

---

## Target Structure

```
LTCG/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── Button.tsx
│   │   │   └── hooks/
│   │   │       └── useGameState.ts
│   │   └── __tests__/                      ← mirrors src/ structure
│   │       ├── components/
│   │       │   └── Button.test.tsx
│   │       ├── hooks/
│   │       │   └── useGameState.test.ts
│   │       └── fixtures/
│   │
│   └── admin/
│       ├── src/
│       └── __tests__/                      ← same pattern
│
├── convex/
│   ├── core/
│   │   └── decks.ts
│   ├── gameplay/
│   │   └── gameEngine.ts
│   └── __tests__/                          ← mirrors convex/ structure
│       ├── core/
│       │   └── decks.test.ts
│       ├── gameplay/
│       │   └── gameEngine.test.ts
│       ├── integration/                    ← integration tests
│       │   ├── indexes.integration.test.ts
│       │   └── invariants.integration.test.ts
│       └── fixtures/
│
├── packages/
│   └── plugin-ltcg/
│       ├── src/
│       │   ├── actions/
│       │   └── services/
│       └── __tests__/                      ← mirrors src/ structure
│           ├── actions/
│           │   └── summonAction.test.ts
│           ├── services/
│           │   └── StateAggregator.test.ts
│           ├── integration/
│           └── fixtures/
│
├── e2e/                                    ← Playwright E2E (unchanged)
│   ├── auth.spec.ts
│   ├── gameplay.spec.ts
│   └── ...
│
├── vitest.config.ts                        ← root config with projects
├── vitest.shared.ts                        ← shared test settings
└── playwright.config.ts
```

---

## Configuration

### Root Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/web',
      'apps/admin',
      'convex',
      'packages/plugin-ltcg',
    ],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: './coverage',
    },
  },
})
```

### Shared Config

```typescript
// vitest.shared.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    testTimeout: 10000,
  },
})
```

### Per-Workspace Configs

```typescript
// apps/web/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    name: 'web',
    environment: 'happy-dom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
}))
```

```typescript
// apps/admin/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    name: 'admin',
    environment: 'happy-dom',
    include: ['__tests__/**/*.test.{ts,tsx}'],
  },
}))
```

```typescript
// convex/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    name: 'convex',
    environment: 'edge-runtime',
    include: ['__tests__/**/*.test.ts'],
  },
}))
```

```typescript
// packages/plugin-ltcg/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config'
import sharedConfig from '../../vitest.shared'

export default mergeConfig(sharedConfig, defineConfig({
  test: {
    name: 'plugin-ltcg',
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
}))
```

---

## Naming Conventions

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Unit tests | `*.test.ts(x)` | `Button.test.tsx` |
| Integration tests | `*.integration.test.ts` | `indexes.integration.test.ts` |
| E2E tests | `*.spec.ts` | `auth.spec.ts` |

---

## Package Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:web": "vitest --project web",
    "test:admin": "vitest --project admin",
    "test:convex": "vitest --project convex",
    "test:plugin": "vitest --project plugin-ltcg",
    "test:integration": "vitest run --testNamePattern=integration",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run && playwright test --grep @smoke"
  }
}
```

---

## Migration Plan

### Phase 1: Create New Structure

1. Create `__tests__/` folders in each workspace
2. Create `vitest.shared.ts` at root
3. Create per-workspace `vitest.config.ts` files

### Phase 2: Move Tests

| From | To |
|------|-----|
| `apps/web/src/**/__tests__/*.test.tsx` | `apps/web/__tests__/**/*.test.tsx` |
| `convex/**/*.test.ts` (colocated) | `convex/__tests__/**/*.test.ts` |
| `tests/integration/*.test.ts` | `convex/__tests__/integration/*.integration.test.ts` |
| `tests/fixtures/*` | `convex/__tests__/fixtures/*` |
| `packages/plugin-ltcg/src/**/*.test.ts` | `packages/plugin-ltcg/__tests__/**/*.test.ts` |

### Phase 3: Update Configs

1. Update root `vitest.config.ts` to use `projects`
2. Update import paths in moved test files
3. Update path aliases if needed

### Phase 4: Migrate Plugin from Bun to Vitest

1. Remove Bun test scripts from `packages/plugin-ltcg/package.json`
2. Add vitest as devDependency
3. Update any Bun-specific test APIs to Vitest equivalents

### Phase 5: Cleanup

1. Delete old `__tests__/` folders inside `src/` directories
2. Delete root `tests/` folder
3. Update CI workflow
4. Update documentation

---

## File Moves (Detailed)

### apps/web

```
FROM: apps/web/src/components/game/controls/__tests__/PhaseSkipButtons.test.tsx
TO:   apps/web/__tests__/components/game/controls/PhaseSkipButtons.test.tsx

FROM: apps/web/src/components/game/controls/__tests__/TimeoutDisplay.test.tsx
TO:   apps/web/__tests__/components/game/controls/TimeoutDisplay.test.tsx

FROM: apps/web/src/components/dialogs/__tests__/OptionalTriggerPrompt.test.tsx
TO:   apps/web/__tests__/components/dialogs/OptionalTriggerPrompt.test.tsx

FROM: apps/web/src/components/ui/__tests__/button.test.tsx
TO:   apps/web/__tests__/components/ui/button.test.tsx

FROM: apps/web/src/hooks/economy/__tests__/useShop.test.ts
TO:   apps/web/__tests__/hooks/economy/useShop.test.ts

FROM: apps/web/src/hooks/game/__tests__/useGameState.test.ts
TO:   apps/web/__tests__/hooks/game/useGameState.test.ts

FROM: apps/web/src/hooks/game/__tests__/useMatchmaking.test.ts
TO:   apps/web/__tests__/hooks/game/useMatchmaking.test.ts

FROM: apps/web/src/hooks/social/__tests__/useGlobalChat.test.ts
TO:   apps/web/__tests__/hooks/social/useGlobalChat.test.ts

FROM: apps/web/src/types/__tests__/utils.test.ts
TO:   apps/web/__tests__/types/utils.test.ts
```

### convex

```
FROM: convex/admin/admin.test.ts
TO:   convex/__tests__/admin/admin.test.ts

FROM: convex/agents.test.ts
TO:   convex/__tests__/agents.test.ts

FROM: convex/core/decks.test.ts
TO:   convex/__tests__/core/decks.test.ts

FROM: convex/economy/marketplace.test.ts
TO:   convex/__tests__/economy/marketplace.test.ts

FROM: convex/economy/shop.test.ts
TO:   convex/__tests__/economy/shop.test.ts

FROM: convex/gameplay/chainResolver.test.ts
TO:   convex/__tests__/gameplay/chainResolver.test.ts

FROM: convex/gameplay/effectSystem/continuousEffects.test.ts
TO:   convex/__tests__/gameplay/effectSystem/continuousEffects.test.ts

FROM: convex/gameplay/effectSystem/effectExecution.test.ts
TO:   convex/__tests__/gameplay/effectSystem/effectExecution.test.ts

FROM: convex/gameplay/effectSystem/executor.test.ts
TO:   convex/__tests__/gameplay/effectSystem/executor.test.ts

FROM: convex/gameplay/effectSystem/targeting.test.ts
TO:   convex/__tests__/gameplay/effectSystem/targeting.test.ts

FROM: convex/gameplay/gameEngine/turns.test.ts
TO:   convex/__tests__/gameplay/gameEngine/turns.test.ts

FROM: convex/lib/roles.test.ts
TO:   convex/__tests__/lib/roles.test.ts

FROM: convex/lib/xpHelpers.test.ts
TO:   convex/__tests__/lib/xpHelpers.test.ts

FROM: tests/integration/indexes.test.ts
TO:   convex/__tests__/integration/indexes.integration.test.ts

FROM: tests/integration/invariants.test.ts
TO:   convex/__tests__/integration/invariants.integration.test.ts

FROM: tests/fixtures/decks.ts
TO:   convex/__tests__/fixtures/decks.ts

FROM: tests/fixtures/users.ts
TO:   convex/__tests__/fixtures/users.ts
```

### packages/plugin-ltcg

```
All tests in packages/plugin-ltcg/src/__tests__/ move to packages/plugin-ltcg/__tests__/
All tests in packages/plugin-ltcg/src/actions/*.test.ts move to packages/plugin-ltcg/__tests__/actions/
All tests in packages/plugin-ltcg/src/client/__tests__/ move to packages/plugin-ltcg/__tests__/client/
All tests in packages/plugin-ltcg/src/evaluators/*.test.ts move to packages/plugin-ltcg/__tests__/evaluators/
All tests in packages/plugin-ltcg/src/providers/__tests__/ move to packages/plugin-ltcg/__tests__/providers/
All tests in packages/plugin-ltcg/src/services/__tests__/ move to packages/plugin-ltcg/__tests__/services/
```

---

## References

- [Turborepo Testing Guide](https://turbo.build/repo/docs/handbook/testing)
- [Vitest 3.2 Projects](https://vitest.dev/guide/projects)
- [Vitest Monorepo Setup 2025](https://www.thecandidstartup.org/2025/09/08/vitest-3-monorepo-setup.html)
