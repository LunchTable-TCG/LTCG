# Observations

## How to use

Append short entries using:

```bash
bun run eng:log -- observation "Title" "Details"
```

Use this file for patterns, wins, and technical observations worth repeating.

## [2026-02-07 13:30 UTC] Observation: ElizaOS skill is globally linked

- Branch: `main`
- Commit: `79cdb9d`
- Details: Linked ~/.codex/skills/elizaos to repo skill for immediate availability

## [2026-02-07 13:34 UTC] Observation: Repo scope and tooling baseline

- Branch: `main`
- Commit: `79cdb9d`
- Details: Monorepo has 1,583 files, Bun+Turbo workspace, Next.js apps, large Convex backend, plugin package, docs apps, and CI pipelines (ci/e2e/deploy/nightly).

## [2026-02-07 13:43 UTC] Observation: Repo audit baseline

- Branch: `main`
- Commit: `79cdb9d`
- Details: Monorepo has major surfaces across web/admin/convex/plugin/mcp; current measured TS files: web 340, admin 221, convex 340, plugin-ltcg 155, mcp-server 5, with 94 test files and large route footprint (web 63, admin 88).

## [2026-02-07 13:43 UTC] Observation: Quality gate status

- Branch: `main`
- Commit: `79cdb9d`
- Details: type-check currently fails in web/admin/convex/root with concrete type drift and missing imports; lint:biome failed due missing platform-specific biome binary in local node_modules.

## [2026-02-07 13:43 UTC] Observation: High-risk drift points

- Branch: `main`
- Commit: `79cdb9d`
- Details: GlobalChat and agents decisions API in web show schema/API contract drift; convex content publishing has TS4111/missing internalQuery import; root tsc scope includes integrations/skills examples causing noisy failures.

## [2026-02-07 13:49 UTC] Observation: Critical security findings

- Branch: `main`
- Commit: `79cdb9d`
- Details: Streaming docs currently expose concrete LiveKit API credentials and encryption/JWT secrets in plain text, and /api/streaming/test-env is unauthenticated while returning key material metadata.

## [2026-02-07 13:49 UTC] Observation: MCP transport runtime drift

- Branch: `main`
- Commit: `79cdb9d`
- Details: mcp-server advertises Node support but HTTP mode uses Bun.serve in src/index.ts and src/http-server.ts; runtime confirmed Node+MCP_TRANSPORT=http crashes with ReferenceError: Bun is not defined.

## [2026-02-07 13:49 UTC] Observation: CI/test configuration drift

- Branch: `main`
- Commit: `79cdb9d`
- Details: playwright/e2e workflows target localhost:3000 while web dev script runs on 3333; typecheck workflow suppresses failures with '|| echo', reducing gate effectiveness.

## [2026-02-07 14:18 UTC] Observation: Streaming hardening and MCP runtime parity

- Branch: `main`
- Commit: `79cdb9d`
- Details: Locked /api/streaming/test-env behind INTERNAL_API_SECRET, removed live secrets from streaming docs, fixed MCP tool contracts (isPrivate/joinCode/gameId/pass), and added Node-compatible HTTP startup for mcp-server.
- Next: Add regression checks for streaming debug routes and MCP HTTP startup under Node.

## [2026-02-07 15:40 UTC] Observation: Gameplay contract drift centered in plugin client

- Branch: `main`
- Commit: `79cdb9d`
- Details: elizaOS plugin callers use legacy handIndex/boardIndex payloads while Convex HTTP actions are cardId-first; hardened LTCGApiClient now adapts legacy payloads and resolves IDs when needed.
- Next: Keep contract adaptation at the client boundary until all actions/providers migrate to cardId-native prompts.

## [2026-02-07 15:40 UTC] Observation: LiveKit internal mutation path typo risk

- Branch: `main`
- Commit: `79cdb9d`
- Details: Convex LiveKit webhook/token flows referenced internalAny.livekit.internalAny.* which can break webhook/event persistence at runtime; patched to internalAny.livekit.internal.*.
- Next: Prefer typed API references where possible and add runtime smoke checks for webhook mutation paths.


## [2026-02-07 16:02 UTC] Observation: Streaming session writes now enforce actor scope

## [2026-02-07 16:02 UTC] Observation: MCP HTTP transport uses public SDK interface
- Branch: `main`

- Commit: `79cdb9d`
- Branch: `main`
- Commit: `79cdb9d`
- Details: Convex streaming session write mutations now require either INTERNAL_API_SECRET or an authenticated owner user context; direct unauthenticated mutation calls no longer succeed for session state changes.
- Details: Replaced private _requestHandlers/_serverInfo access in mcp-server HTTP transport with a per-session transport implementation that talks to Server via its public Transport contract.
- Next: Keep this pattern for future write surfaces: route-level auth + function-level auth guard.
- Next: Avoid private SDK fields to reduce breakage across SDK upgrades.

## [2026-02-07 16:37 UTC] Observation: Streaming read surfaces split into private/public contracts

- Branch: `main`
- Commit: `79cdb9d`
- Details: Introduced getSessionPublic for overlays/status/spectators and hardened getSession to owner-or-internal access with optional internalAuth for operational routes.
- Next: Use public query for viewer-facing surfaces; reserve private query for owner/internal workflows.

## [2026-02-07 16:37 UTC] Observation: Added MCP HTTP auth/session regression tests

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added packages/mcp-server/tests/http-transport.test.ts covering auth required, initialize session creation, session reuse, invalid session rejection, and JSON parse error behavior.
- Next: Run these tests on every MCP transport change before deployment.

## [2026-02-07 16:56 UTC] Observation: Eliza actions now align to cardId contracts

- Branch: `main`
- Commit: `79cdb9d`
- Details: TurnOrchestrator and core gameplay actions now prompt for cardId/attackerCardId/targetCardId first while preserving handIndex/boardIndex fallbacks for compatibility.
- Next: Next: remove remaining index-first references in providers/evaluators once model behavior stabilizes

## [2026-02-07 17:05 UTC] Observation: Provider/evaluator scoring now resolves cardId-first

- Branch: `main`
- Commit: `79cdb9d`
- Details: legalActionsProvider now surfaces cardId-rich options even when API returns raw IDs, and strategyEvaluator resolves attacker/target/summon/spell selections by cardId before index fallback.
- Next: Next: align winConditionProvider and any narration providers to cardId-first examples for full prompt consistency

## [2026-02-07 17:07 UTC] Observation: Win-condition analysis now emits cardId-rich lethal/threat paths

- Branch: `main`
- Commit: `79cdb9d`
- Details: winConditionProvider attack sequences and must-answer threat entries now include cardId + boardIndex, preventing index-only references in strategy context.
- Next: Next: add focused tests around provider text/data shape for cardId-first guarantees

## [2026-02-07 17:16 UTC] Observation: Added cardId-first regression tests for three core decision surfaces

- Branch: `main`
- Commit: `79cdb9d`
- Details: New tests now assert cardId-first output/selection behavior for legalActionsProvider, strategyEvaluator, and winConditionProvider, including legacy fallback paths.
- Next: Next: add negative-case coverage for malformed availableCards payloads and mixed board states

## [2026-02-07 17:36 UTC] Observation: CardId integration tests expose execution gaps

- Branch: `main`
- Commit: `79cdb9d`
- Details: New TurnOrchestrator cardId tests for SET_CARD/CHANGE_POSITION/FLIP_SUMMON immediately surfaced missing boardIndex propagation in runtime payloads.
- Next: Keep expanding cardId-first integration tests before widening feature surface.

## [2026-02-07 17:41 UTC] Observation: Streaming route contracts now runner-compatible

- Branch: `main`
- Commit: `79cdb9d`
- Details: Converted apps/web streaming API contract tests from bun:test to vitest APIs so bun test and vitest unit pipelines both execute the same suite.
- Next: Keep shared web tests on vitest primitives unless Bun-only behavior is required.

## [2026-02-07 19:48 UTC] Observation: RTMP validation belongs at route boundaries

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added explicit platform/runtime checks and 400 responses in start/update/room/configure-agent routes; buildRtmpUrl now normalizes/validates protocol and keys.
- Next: Faster debugging for integrations (ElizaOS/actions) and fewer opaque 500s.

## [2026-02-07 20:26 UTC] Observation: Provider ingest variability requires override hooks

- Branch: `main`
- Commit: `79cdb9d`
- Details: Kept default ingest endpoints for Twitch/Kick but enabled optional custom RTMP overrides so region/provider-specific ingest differences do not block go-live.
- Next: Documented override env vars and added tests for override behavior.

## [2026-02-07 23:29 UTC] Observation: Retake skill contract alignment kickoff

- Branch: `main`
- Commit: `79cdb9d`
- Details: Align plugin-ltcg Retake start/rtmp/comments flows to retake.tv skill.md, add stream audience runtime context, and add tests for payload compatibility and runtime flags.

## [2026-02-07 23:33 UTC] Observation: Stream-awareness runtime context added

- Branch: `main`
- Commit: `79cdb9d`
- Details: Plugin now sets STREAMING_ACTIVE/PLATFORM/PLATFORMS_JSON and persists recent audience messages so LLM providers can produce viewer-aware commentary across Retake/X/Pump.fun/Twitch/Kick.

## [2026-02-08 00:32 UTC] Observation: Agent persistent stream lifecycle and overlay scenes

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added streamingPersistent agent config, kept streams live between games, relinked existing live sessions on next game start, and added overlay match-over/lobby scenes using session match snapshot fields.

## [2026-02-08 02:18 UTC] Observation: profile-image-upload-flow

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added authenticated Convex-storage profile image upload paths for user and agent profile pages; used 5MB and image type validation and wired UI controls in profile surfaces.

## [2026-02-08 04:24 UTC] Observation: plugin-ltcg-control-hardening

- Branch: `main`
- Commit: `79cdb9d`
- Details: Hardened control auth to fail-closed, prefixed plugin routes to /ltcg/* contract, secured webhook signature defaults, removed RTMP key logging, added timeout wrappers for retake and LTCG fetches, and aligned StateAggregator Convex URL resolution with runtime settings.

## [2026-02-08 04:32 UTC] Observation: plugin-ltcg-route-security-regression-tests

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added route-level regression tests for webhook secure-by-default behavior (503 when unsigned not allowed), explicit unsigned override path, and control start/stop unauthorized responses; verified with plugin type-check and targeted test suite.

## [2026-02-08 04:35 UTC] Observation: webhook-signature-canonicalization

- Branch: `main`
- Commit: `79cdb9d`
- Details: Updated plugin webhook route verification to sign canonical payload without signature field and keep legacy raw-body fallback; added route-level signed webhook acceptance test and cryptographic verifyWebhookSignature positive/negative tests.

## [2026-02-08 04:55 UTC] Observation: global-chat-mention-gating

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added GlobalChatService auto-reply loop with mention-only gating, alias support, cooldowns, and model-generated replies; wired config keys + plugin registration and added service tests proving no-reply without mention and reply-on-mention.

## [2026-02-09 14:57 UTC] Observation: LTCG agent testing workflow

- Branch: `main`
- Commit: `702e010`
- Details: To test the LTCG ElizaOS agent: 1) Build plugin: cd packages/plugin-ltcg && bun run build. 2) Start: elizaos start (from plugin dir). 3) Trigger story mode: curl -X POST http://localhost:3000/ltcg/control/story-mode -H 'Content-Type: application/json' -d '{"chapterNumber":1,"stageNumber":1}'. 4) Check status: curl http://localhost:3000/ltcg/control/status. 5) Logs: tee /tmp/ltcg-fg.log. Key: route URLs are /<plugin-name>/<path>, NOT just /<path>.
