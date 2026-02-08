# ElizaOS Playbooks For LTCG

## 0) Continuous Learning Loop

Use project memory files every substantial task:

1. Review recent context:

```bash
bun run eng:start
```

2. Log outcomes:

```bash
bun run eng:log -- observation "Title" "Details"
bun run eng:log -- decision "Title" "Details" "Impact"
```

3. Convert mistakes into preventions:

```bash
bun run eng:log -- mistake "Title" "What went wrong" "Prevention rule"
```

## 1) Add or Modify an Action

### Files to inspect first

- `packages/plugin-ltcg/src/actions/index.ts`
- `packages/plugin-ltcg/src/plugin.ts`
- Similar action file in `packages/plugin-ltcg/src/actions`

### Steps

1. Implement or update the action file in `packages/plugin-ltcg/src/actions`.
2. Wire exports in `packages/plugin-ltcg/src/actions/index.ts`.
3. Confirm action is reachable through plugin registration in `packages/plugin-ltcg/src/plugin.ts`.
4. If action touches HTTP API contracts, update:
   - `packages/plugin-ltcg/src/constants.ts`
   - `packages/plugin-ltcg/src/client/LTCGApiClient.ts`
5. Add or adjust tests in `packages/plugin-ltcg/__tests__` or `packages/plugin-ltcg/src/__tests__`.
6. Update docs in `apps/docs-agents/src/content/docs/plugin/actions.mdx` if behavior changed.

### Validation

```bash
cd packages/plugin-ltcg
bun run type-check
bun run test
```

## 2) Add or Modify a Provider

### Files to inspect first

- `packages/plugin-ltcg/src/providers/index.ts`
- `packages/plugin-ltcg/src/plugin.ts`
- `packages/plugin-ltcg/src/providers/strategyProvider.ts` (common patterns)

### Steps

1. Implement provider in `packages/plugin-ltcg/src/providers`.
2. Wire exports and provider list.
3. Verify provider output shape is stable for orchestrator usage.
4. Add tests.
5. Update docs in `apps/docs-agents/src/content/docs/plugin/providers.mdx`.

## 3) Add or Modify an Evaluator

### Files to inspect first

- `packages/plugin-ltcg/src/evaluators/index.ts`
- `packages/plugin-ltcg/src/plugin.ts`

### Steps

1. Implement evaluator logic.
2. Wire evaluator exports.
3. Verify integration points with strategy/orchestration flow.
4. Add tests.
5. Update `apps/docs-agents/src/content/docs/plugin/evaluators.mdx`.

## 4) Add or Modify a Service

### Files to inspect first

- `packages/plugin-ltcg/src/services/types.ts`
- `packages/plugin-ltcg/src/plugin.ts`
- Existing services in `packages/plugin-ltcg/src/services`

### Steps

1. Implement service and lifecycle handling.
2. Register service in plugin `services` array.
3. If service is exposed to routes, update:
   - `packages/plugin-ltcg/src/api/routes.ts`
   - `packages/plugin-ltcg/src/api/controlRoutes.ts`
4. Add tests.
5. Update docs in `apps/docs-agents/src/content/docs/plugin/services.mdx`.

## 5) Modify Character Runtime Behavior

### Files to inspect first

- `packages/plugin-ltcg/src/character.ts`
- `packages/plugin-ltcg/src/characters/dizzy.ts`
- `packages/plugin-ltcg/src/config.ts`

### Steps

1. Keep plugin ordering intentional; preserve required plugins.
2. Add new settings to schema/defaults when introducing config.
3. Prefer env/runtime settings over hardcoded credentials.
4. Validate with local startup command.

### Validation

```bash
cd packages/plugin-ltcg
elizaos start --character src/characters/dizzy.ts --dev
```

## 6) Modify Convex Agent API

### Files to inspect first

- `convex/http/agents.ts`
- `convex/http/matchmaking.ts`
- `convex/http/games.ts`
- `convex/http/decks.ts`
- `convex/http/story.ts`
- `convex/http/chat.ts`

### Steps

1. Choose auth mode intentionally (`httpAction` or `authHttpAction`).
2. Add request validation and explicit error codes.
3. Keep endpoint names consistent with plugin client constants.
4. Update client methods and docs when contracts change.

### Validation

Run type and integration checks appropriate to changed surfaces:

```bash
bun run type-check
bun run test:convex
bun run test:integration
```

## 7) Debugging Checklist

1. Confirm required env vars are present (`LTCG_API_KEY`, provider keys, and URL overrides if needed).
2. Run with debug logging (`LOG_LEVEL=debug` and/or `LTCG_DEBUG_MODE=true`).
3. Verify endpoint availability for registration, matchmaking, and game-state fetch.
4. Check provider outputs before blaming action logic.
5. If webhook mode is enabled, verify callback URL validity; otherwise verify polling fallback is active.
6. Inspect service startup ordering and runtime service registration.

## 8) High-Confidence Change Checklist

Before completion:

1. Types pass.
2. Tests pass for touched lane.
3. New config keys are validated and documented.
4. API changes are reflected in client constants/methods.
5. Docs under `apps/docs-agents` match behavior.
