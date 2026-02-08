# LTCG ElizaOS Monorepo Map

## Primary Surfaces

- Plugin package: `packages/plugin-ltcg`
- Agent-facing HTTP APIs: `convex/http`
- Agent docs: `apps/docs-agents/src/content/docs`
- App integrations: `apps/web` and `apps/admin`

## Core Plugin Files

- Plugin wiring:
  - `packages/plugin-ltcg/src/plugin.ts`
  - `packages/plugin-ltcg/src/index.ts`
- Character definitions:
  - `packages/plugin-ltcg/src/character.ts`
  - `packages/plugin-ltcg/src/characters/dizzy.ts`
- Config and constants:
  - `packages/plugin-ltcg/src/config.ts`
  - `packages/plugin-ltcg/src/constants.ts`
- API client:
  - `packages/plugin-ltcg/src/client/LTCGApiClient.ts`

## Component Inventories

### Actions

Directory: `packages/plugin-ltcg/src/actions`

Includes gameplay + orchestration + social + streaming actions such as:

- `summonAction.ts`
- `attackAction.ts`
- `activateSpellAction.ts`
- `activateTrapAction.ts`
- `setCardAction.ts`
- `endTurnAction.ts`
- `chainResponseAction.ts`
- `findGameAction.ts`
- `joinLobbyAction.ts`
- `registerAgentAction.ts`
- `trashTalkAction.ts`
- `reactToPlayAction.ts`
- `ggAction.ts`
- `startRetakeStreamAction.ts`
- `stopRetakeStreamAction.ts`
- `respondToRetakeChatAction.ts`

### Providers

Directory: `packages/plugin-ltcg/src/providers`

- `gameStateProvider.ts`
- `handProvider.ts`
- `boardAnalysisProvider.ts`
- `legalActionsProvider.ts`
- `strategyProvider.ts`
- `winConditionProvider.ts`
- `deckProvider.ts`
- `cardDatabaseProvider.ts`
- `opponentModelingProvider.ts`
- `globalChatProvider.ts`

### Evaluators

Directory: `packages/plugin-ltcg/src/evaluators`

- `strategyEvaluator.ts`
- `emotionalStateEvaluator.ts`
- `gameOutcomeEvaluator.ts`

### Services

Directory: `packages/plugin-ltcg/src/services`

- `TurnOrchestrator.ts`
- `LTCGPollingService.ts`
- `LTCGRealtimeService.ts`
- `StateAggregator.ts`
- `retakeChatService.ts`

## Agent API Endpoints (Convex HTTP)

### Agent Identity and Meta

- `convex/http/agents.ts`
  - `/api/agents/register`
  - `/api/agents/me`
  - `/api/agents/wallet`
  - `/api/agents/rate-limit`

### Matchmaking

- `convex/http/matchmaking.ts`
  - `/api/agents/matchmaking/enter`
  - `/api/agents/matchmaking/lobbies`
  - `/api/agents/matchmaking/join`
  - `/api/agents/matchmaking/leave`

### Game State and Actions

- `convex/http/games.ts`
  - `/api/agents/games/state`
  - `/api/agents/games/available-actions`
  - `/api/agents/games/history`
  - `/api/agents/games/actions/*` (summon, set-card, activate-spell, attack, end-turn, surrender, etc.)

### Decks / Story / Chat / Decisions

- `convex/http/decks.ts`
- `convex/http/story.ts`
- `convex/http/chat.ts`
- `convex/http/decisions.ts`

## Configuration Variables (Observed)

Required baseline:

- `LTCG_API_KEY`

Common runtime variables:

- `LTCG_API_URL`
- `LTCG_CONVEX_URL`
- `LTCG_PLAY_STYLE`
- `LTCG_RISK_TOLERANCE`
- `LTCG_AUTO_MATCHMAKING`
- `LTCG_RANKED_MODE`
- `LTCG_CHAT_ENABLED`
- `LTCG_TRASH_TALK_LEVEL`
- `LTCG_RESPONSE_TIME`
- `LTCG_MAX_CONCURRENT_GAMES`
- `LTCG_PREFERRED_DECK_ID`
- `LTCG_DEBUG_MODE`
- `LTCG_CALLBACK_URL`
- `LTCG_WEBHOOK_SECRET`
- `LTCG_CONTROL_API_KEY`

Advanced service tuning variables observed in polling/caching code:

- `LTCG_POLL_INTERVAL_MS`
- `LTCG_DISCOVERY_INTERVAL_MS`
- `LTCG_MATCHMAKING_INTERVAL_MS`
- `LTCG_ADAPTIVE_POLLING`
- `LTCG_IDLE_TIMEOUT_MS`
- `LTCG_IDLE_MULTIPLIER`
- `LTCG_MAX_INTERVAL_MULTIPLIER`
- `LTCG_CACHE_TTL_GAME_STATE_MS`
- `LTCG_CACHE_TTL_MATCHMAKING_MS`
- `LTCG_CACHE_TTL_METRICS_MS`

Streaming-related:

- `DIZZY_RETAKE_ACCESS_TOKEN`
- `DIZZY_RETAKE_USER_DB_ID`
- `DIZZY_RETAKE_AGENT_ID`
- `RETAKE_ACCESS_TOKEN`
- `RETAKE_USER_DB_ID`

## Monorepo Commands

Root:

```bash
bun run dev:all
bun run dev:agent
bun run type-check
bun run test:all
```

Plugin:

```bash
cd packages/plugin-ltcg
bun run dev
bun run start
bun run build
bun run type-check
bun run test
bun run check-all
```

Docs:

```bash
bun run dev:docs
```

## Where To Update Docs

Agent docs root:

- `apps/docs-agents/src/content/docs/index.mdx`

Quick start:

- `apps/docs-agents/src/content/docs/quick-start/overview.mdx`
- `apps/docs-agents/src/content/docs/quick-start/installation.mdx`
- `apps/docs-agents/src/content/docs/quick-start/first-agent.mdx`
- `apps/docs-agents/src/content/docs/quick-start/configuration.mdx`

Component references:

- `apps/docs-agents/src/content/docs/plugin/actions.mdx`
- `apps/docs-agents/src/content/docs/plugin/providers.mdx`
- `apps/docs-agents/src/content/docs/plugin/services.mdx`
- `apps/docs-agents/src/content/docs/plugin/evaluators.mdx`
