# Decisions

## How to use

Append entries with:

```bash
bun run eng:log -- decision "Decision title" "Decision details" "Impact/tradeoff"
```

Capture decisions that affect architecture, runtime behavior, APIs, or process.

## [2026-02-07 13:30 UTC] Decision: Adopt engineering memory loop

- Branch: `main`
- Commit: `79cdb9d`
- Details: Created persistent notes system with scripts and project rules
- Impact: Improves execution continuity and reduces repeated mistakes

## [2026-02-07 13:49 UTC] Decision: Audit scoring approach

- Branch: `main`
- Commit: `79cdb9d`
- Details: Score completeness by domain feature surface + build/test evidence + TODO debt rather than docs claims alone.
- Impact: Prevents optimistic assessment when implementation and CI drift from documentation.

## [2026-02-07 14:18 UTC] Decision: Scope root typecheck to maintained codepaths

- Branch: `main`
- Commit: `79cdb9d`
- Details: Updated root tsconfig excludes for convex-tests/e2e/integrations/skills so CI type-check validates maintained app/package surfaces rather than example sandboxes.
- Impact: Restored strict CI typecheck gating without forcing unrelated sample-code remediation.

## [2026-02-07 17:05 UTC] Decision: Fix pre-existing plugin service compile blockers encountered in validation

- Branch: `main`
- Commit: `79cdb9d`
- Details: While validating this pass, LTCGRealtimeService and LTCGPollingService contained type mismatches unrelated to current prompt migration; patched class-field and typing issues to restore compile path.
- Impact: Impact: keeps type-check signal trustworthy and prevents unrelated noise from masking regressions

## [2026-02-07 17:16 UTC] Decision: Prioritize deterministic contract tests over broad snapshot tests

- Branch: `main`
- Commit: `79cdb9d`
- Details: Focused assertions on cardId-rich text/data markers and evaluator allow/filter behavior give stronger signal than large snapshot fixtures for these fast-changing prompts.
- Impact: Impact: tighter failure diagnostics when action-selection contracts regress

## [2026-02-07 17:36 UTC] Decision: Guard streaming and MCP contract drift in PR CI

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added dedicated CI jobs for streaming route/auth contracts and MCP HTTP transport contracts, with PR gating.
- Impact: Prevents regressions in spectator/stream controls and transport auth/session behavior.

## [2026-02-07 17:41 UTC] Decision: Use dual-runner-safe test style for streaming contracts

- Branch: `main`
- Commit: `79cdb9d`
- Details: Streaming contract tests now use vitest APIs while still runnable under bun test, reducing runner lock-in and keeping CI flexibility.
- Impact: Prevents false negatives when CI paths mix bun test and vitest project runs.

## [2026-02-07 19:48 UTC] Decision: Centralized streaming platform contract

- Branch: `main`
- Commit: `79cdb9d`
- Details: Introduced shared web streaming platform metadata/types and propagated kick support through Convex validators, API routes, and UI state types.
- Impact: Prevents platform drift between frontend/backend and reduces future rollout risk for new channels.

## [2026-02-07 19:59 UTC] Decision: Agent channel parity via explicit Twitch/Kick actions

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added START_TWITCH_STREAM and START_KICK_STREAM actions to ElizaOS plugin and wired them into ltcgActions exports.
- Impact: Agent-driven go-live flow now matches web platform matrix and avoids channel-specific lifecycle gaps.

## [2026-02-07 20:26 UTC] Decision: Centralized agent streaming channel contract

- Branch: `main`
- Commit: `79cdb9d`
- Details: Added shared agentStreaming module for platform-specific credential rules, runtime/env lookup, session persistence, and standardized start flow across Retake/X/Pump.fun/Twitch/Kick.
- Impact: Reduces per-action drift and makes multi-channel lifecycle changes single-point updates.

## [2026-02-07 23:33 UTC] Decision: Retake contract-first streaming integration

- Branch: `main`
- Commit: `79cdb9d`
- Details: Switched Retake chat ingest to /api/agent/stream/comments with payload normalization, kept backward compatibility for RTMP response shapes (url/key and rtmp_url/stream_key), and introduced stream audience runtime context provider.
- Impact: Prevents endpoint drift, improves live audience awareness in agent responses, and keeps existing deployments compatible.

## [2026-02-08 00:32 UTC] Decision: Non-UI agent streaming config path

- Branch: `main`
- Commit: `79cdb9d`
- Details: configure-agent API now accepts internal/agent-authenticated requests by passing internal auth through to Convex mutation, enabling script/flag driven setup without dashboard UI.
- Impact: Developers can bootstrap agent streaming via automation while retaining user ownership checks for normal UI flows.
