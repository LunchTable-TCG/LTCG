# Agent Guide

Use Bun for all repo commands. Node/npm/pnpm/yarn are not the default here.

## Setup

- `bun install`
- `cp .env.example .env.local`
- Set required env vars in `.env.local`:
- `CONVEX_DEPLOYMENT`
- `NEXT_PUBLIC_CONVEX_URL`

## Development

- `bun run dev` (Convex + web + admin)
- `bun run dev:all` (Convex + web + admin + agent)
- `bun run dev:convex`
- `bun run dev:web`
- `bun run dev:admin`
- `bun run dev:agent` (agent package)

## Build + Start

- `bun run build`
- `bun run build:web`
- `bun run build:admin`
- `bun run start` (web)
- `bun run start:admin`

## Tests

- `bun run test` (Vitest watch)
- `bun run test:once`
- `bun run test:unit`
- `bun run test:convex`
- `bun run test:integration`
- `bun run test:e2e`
- `bun run test:e2e:ui`
- `bun run test:e2e:debug`
- `bun run test:e2e:headed`
- `bun run test:ci`

## Code Quality

- `bun run lint`
- `bun run format`
- `bun run type-check`

## Cards + Content

- Card source of truth: `data/cards/*.json`
- Load/sync cards into Convex DB:
- `bunx convex run migrations/loadAllCards:previewLoad`
- `bunx convex run migrations/loadAllCards:loadAllCards '{"dryRun": true}'`
- `bunx convex run migrations/loadAllCards:loadAllCards '{"clearExisting": true}'`
- Apply hand-authored abilities (incl. Agent Agenda abilities):
- `bunx convex run migrations/manualAbilities:applyManualAbilities`

## Shop (Limited Drops)

- Upsert the inactive "Agent Agenda Pack" shop product:
- `bunx convex run admin/shopSetup:upsertAgentAgenda`
- TODO: Add a safe toggle mutation for `shopProducts.isActive` (currently toggle via dashboard/manual patch).

## Notes

- If `bun install` fails with tempdir permission errors in sandboxed envs, retry with `TMPDIR=/tmp`.
- `packages/plugin-ltcg` is not a root workspace; install deps separately:
- `cd packages/plugin-ltcg && bun install`
