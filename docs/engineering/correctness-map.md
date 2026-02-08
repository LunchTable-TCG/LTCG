# Correctness Program Map

## Goal

Methodically validate and harden production-critical behavior across:

- Streaming (web routes + Convex session state + LiveKit integration)
- Gameplay and matchmaking HTTP APIs
- MCP contract/runtime compatibility
- ElizaOS plugin integration paths
- CI/type gates that protect the above

## Execution Plan

1. Build subsystem map + contract matrix
2. Audit streaming behavior and auth boundaries, then patch
3. Audit gameplay/matchmaking action correctness and contract consistency
4. Audit MCP and ElizaOS integration correctness
5. Verify with strict type/build checks and targeted tests

## File Map

### Streaming: API Routes

- `apps/web/app/api/streaming/start/route.ts`
- `apps/web/app/api/streaming/stop/route.ts`
- `apps/web/app/api/streaming/status/route.ts`
- `apps/web/app/api/streaming/sessions/route.ts`
- `apps/web/app/api/streaming/cleanup/route.ts`
- `apps/web/app/api/streaming/room/route.ts`
- `apps/web/app/api/streaming/configure-agent/route.ts`
- `apps/web/app/api/streaming/update-destinations/route.ts`
- `apps/web/app/api/streaming/link-game/route.ts`
- `apps/web/app/api/streaming/validate-overlay/route.ts`
- `apps/web/app/api/streaming/test-env/route.ts`

### Streaming: Runtime/Domain

- `apps/web/src/lib/streaming/livekit.ts`
- `apps/web/src/lib/streaming/encryption.ts`
- `apps/web/src/lib/streaming/tokens.ts`
- `apps/web/src/lib/streaming/validateConfig.ts`
- `apps/web/src/lib/streaming/serverAuth.ts`
- `apps/web/src/hooks/useStreaming.ts`
- `apps/web/src/components/streaming/StreamingSettingsPanel.tsx`
- `apps/web/src/components/streaming/AgentStreamingSettingsPanel.tsx`
- `apps/web/src/components/streaming/LiveStreamingRoom.tsx`
- `convex/streaming/sessions.ts`
- `convex/streaming/http.ts`
- `convex/streaming/livekit.ts`
- `convex/agents/streaming.ts`

### Gameplay + Matchmaking: HTTP Surfaces

- `convex/http/matchmaking.ts`
- `convex/http/games.ts`
- `convex/http/middleware/auth.ts`
- `convex/http/middleware/responses.ts`

### Gameplay Engine/Rules

- `convex/gameplay/games/lobby.ts`
- `convex/gameplay/games/lifecycle.ts`
- `convex/gameplay/games/queries.ts`
- `convex/gameplay/legalMoves.ts`
- `convex/gameplay/phaseManager.ts`
- `convex/gameplay/chainResolver.ts`
- `convex/gameplay/gameEngine/*`
- `convex/gameplay/effectSystem/*`

### MCP

- `packages/mcp-server/src/server-setup.ts`
- `packages/mcp-server/src/http-transport.ts`
- `packages/mcp-server/src/index.ts`
- `packages/mcp-server/src/http-server.ts`
- `packages/mcp-server/src/start-http-server.ts`

### ElizaOS Plugin

- `packages/plugin-ltcg/src/client/LTCGApiClient.ts`
- `packages/plugin-ltcg/src/actions/*`
- `packages/plugin-ltcg/src/services/*`
- `packages/plugin-ltcg/src/api/controlRoutes.ts`
- `packages/plugin-ltcg/src/plugin.ts`

### CI/Quality Gates

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `playwright.config.ts`
- `tsconfig.json`

## Contract Matrix (Primary)

- Streaming start/stop/update:
  - User: authenticated owner only
  - Agent: internal secret or configured agent API key
- Agent streaming config:
  - Authenticated owner only
- Matchmaking:
  - `enter` accepts `isPrivate`
  - `join` accepts `lobbyId` or `joinCode`
- Game state/actions:
  - State/legal moves use `gameId`
  - Chain pass uses `/chain-response` with `pass=true`
- MCP:
  - Tool schema and runtime payloads must match HTTP contracts

## Progress

- Completed:
  - Streaming secret/document hardening
  - MCP Node/Bun runtime parity and tool contract alignment
  - ElizaOS plugin type restoration
  - Streaming write-route auth binding + agent ownership enforcement
  - Plugin gameplay client compatibility layer for cardId-first backend contracts
  - LiveKit internal mutation path correction (`internal.livekit.internal.mutations.*`)
  - Agent stream local fallback alignment (`localhost:3333`)
  - Stream session tracking for start/stop actions in elizaOS plugin
  - Convex streaming session write/auth hardening (owner-or-internal enforcement)
  - Streaming session read split (`getSession` owner/internal + `getSessionPublic` for overlay/status)
  - Streaming route internal-auth propagation and Convex user-token binding
  - Streaming API route regression suite added (`/start`, `/stop`, `/update-destinations`, `/status`)
  - MCP HTTP transport rewrite to public SDK `Transport` flow (no private handler internals)
  - MCP HTTP config hardening (`MCP_API_KEY` required, explicit CORS origins required)
  - MCP HTTP auth/session regression test coverage (initialize/session/parse/auth paths)
  - ElizaOS orchestration/action prompts migrated to cardId-first decision contracts with legacy index fallback
  - ElizaOS providers/evaluators aligned to cardId-first selection and scoring (`legalActionsProvider`, `strategyEvaluator`)
  - Win-condition analysis output aligned to cardId-first identifiers (`winConditionProvider` lethal and threat paths)
  - CardId-first regression tests added for provider/evaluator contracts (`legalActionsProvider`, `strategyEvaluator`, `winConditionProvider`)
  - Plugin service type-check blockers fixed to keep validation gates green (`LTCGRealtimeService`, `LTCGPollingService`)
  - Root/web/admin/convex/plugin type-checks green
- In progress:
  - None
