---
name: elizaos
description: End-to-end ElizaOS development, debugging, and operations for the LTCG monorepo. Use when working on ElizaOS agents, character files, plugin architecture (actions/providers/evaluators/services/routes), runtime settings, Convex-backed agent APIs, or agent docs in this repository.
---

# ElizaOS (LTCG Monorepo)

## Overview

Use this skill for all ElizaOS work in this repository, including:

- Plugin development in `packages/plugin-ltcg`
- Character and runtime configuration in `packages/plugin-ltcg/src/character.ts` and `packages/plugin-ltcg/src/characters/*.ts`
- Agent API integration in `convex/http/*.ts`
- Agent docs in `apps/docs-agents/src/content/docs`
- Runtime debugging, validation, and testing for ElizaOS agent behavior

## Source Priority

Use this order to resolve uncertainty:

1. Repository implementation (highest priority for this codebase)
2. Official ElizaOS docs via Context7 (`/elizaos/docs`)
3. DeepWiki ElizaOS pages for orientation and discovery, then verify against 1 and 2

Do not rely on DeepWiki alone for behavioral guarantees.

## Load-Only-What-You-Need References

- For official CLI, character format, and plugin interface patterns: read `references/official-elizaos.md`.
- For repository file map, endpoint map, and environment variable map: read `references/ltcg-elizaos-monorepo.md`.
- For concrete implementation procedures and checklists: read `references/playbooks.md`.

## Workflow

### 1) Classify the request

Map the request into one primary lane:

- Character/runtime lane: personality, model/provider, secrets/settings, startup behavior
- Plugin lane: actions/providers/evaluators/services/routes/client wiring
- API lane: agent registration, matchmaking, game actions, story/chat/deck endpoints
- Docs lane: `apps/docs-agents` updates
- Ops lane: debugging, testing, release hardening

### 2) Locate the implementation surface

Use `rg` and file maps from `references/ltcg-elizaos-monorepo.md` to find exact touch points before editing.

### 3) Apply the smallest coherent change

- Keep changes scoped to the selected lane.
- Reuse existing patterns already used in `packages/plugin-ltcg/src`.
- Preserve established naming and component registration conventions.

### 4) Verify at the right level

Choose the smallest effective validation set:

- Plugin-only checks in `packages/plugin-ltcg`
- Repo-level type/tests only when the change crosses package boundaries
- Endpoint checks when touching `convex/http`

### 5) Update docs when behavior changes

If runtime behavior, configuration, or API shape changes, update docs in `apps/docs-agents/src/content/docs`.

### 6) Update engineering memory

Before and after substantial work, use the repo memory loop:

```bash
bun run eng:start
bun run eng:log -- observation "<title>" "<details>"
```

If a wrong assumption or error occurred, log it with prevention:

```bash
bun run eng:log -- mistake "<title>" "<what went wrong>" "<prevention rule>"
```

## Guardrails

- Keep ElizaOS plugin registration coherent: if adding a component, wire it through the corresponding index and plugin export.
- Never hardcode secrets. Read via runtime/environment settings.
- Keep `LTCG_API_KEY` validation semantics intact (`ltcg_` prefix) unless a deliberate migration is required.
- For HTTP endpoints under `convex/http`, preserve auth wrapper choice (`httpAction` vs `authHttpAction`) intentionally.
- When adding settings, update config schema and defaults together.
- When adding API routes, ensure client constants and client methods stay aligned.

## Quick Commands

Use these first:

```bash
# Monorepo
bun run dev:all
bun run type-check

# Plugin package
cd packages/plugin-ltcg
bun run dev
bun run start
bun run type-check
bun run test
bun run check-all
```

## Completion Criteria

Consider work complete only when:

1. Code changes are wired through all required registries and exports.
2. Runtime/config/API compatibility is validated at least once.
3. Agent docs are updated if user-facing behavior changed.
4. No unresolved TODOs or partial wiring remain.
