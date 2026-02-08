# Mistakes and Preventive Rules

## How to use

Append entries with:

```bash
bun run eng:log -- mistake "Title" "What went wrong" "Prevention rule"
```

Every entry should convert a mistake into a concrete prevention rule.

## [2026-02-07 13:43 UTC] Mistake: Inflated function metric

- Branch: `main`
- Commit: `79cdb9d`
- Details: Initial function count treated generated/build artifacts as potentially relevant and was not normalized by exclusion patterns.
- Prevention: Normalize all volume metrics by excluding generated/dist/node_modules before using them in quality conclusions.

## [2026-02-07 14:18 UTC] Mistake: Validated sub-project checks before root gate

- Branch: `main`
- Commit: `79cdb9d`
- Details: I initially validated web/admin/plugin individually and only later confirmed the root type-check command still failed due non-product folders.
- Prevention: Always run the exact CI command before declaring gate restoration complete.

## [2026-02-07 15:40 UTC] Mistake: Over-trusting type-check for runtime-correct generated API paths

- Branch: `main`
- Commit: `79cdb9d`
- Details: TS passed because any-casts masked bad generated API paths in livekit modules.
- Prevention: When any-casts are required, add focused runtime integration checks for critical paths (webhook -> mutation, token mint -> audit insert).

## [2026-02-07 16:02 UTC] Mistake: Assumed Streamable HTTP middleware availability

- Branch: `main`
- Commit: `79cdb9d`
- Details: Context7 guidance references newer MCP middleware packages, but this repo pins @modelcontextprotocol/sdk@0.5.0 without those transports.
- Prevention: Always check installed SDK version/capabilities before selecting integration patterns.

## [2026-02-07 16:37 UTC] Mistake: Underestimated TS2589 blast radius in generated Convex API typing

- Branch: `main`
- Commit: `79cdb9d`
- Details: Switching one hook to a new generated query surfaced deep type instantiation across neighboring hooks; needed explicit any-boundary shims on useQuery call sites.
- Prevention: When touching generated Convex API hook usage, run web type-check immediately and apply local any boundaries only where needed.

## [2026-02-07 16:56 UTC] Mistake: Used invalid --silent flag with root type-check

- Branch: `main`
- Commit: `79cdb9d`
- Details: I appended --silent to bun script invocation which propagated to tsc and failed validation.
- Prevention: Run project-level checks via existing scripts as-is, or call bunx tsc directly for scoped checks.

## [2026-02-07 17:36 UTC] Mistake: Did not backfill boardIndex on cardId-only change/flip

- Branch: `main`
- Commit: `79cdb9d`
- Details: CHANGE_POSITION and FLIP_SUMMON selected monsters by cardId but forwarded undefined boardIndex to API client.
- Prevention: Always derive secondary identifiers (boardIndex/handIndex) once a primary cardId match is found.

## [2026-02-07 17:41 UTC] Mistake: Introduced Bun-only test API into web unit test project

- Branch: `main`
- Commit: `79cdb9d`
- Details: Initial streaming route contract suite imported bun:test, causing vitest project execution to fail during bun run test:unit.
- Prevention: For apps/web tests, default to vitest imports/mocks and verify with bun run test:unit before expanding CI gates.

## [2026-02-07 19:57 UTC] Mistake: TurnOrchestrator executeAction return contract drift

- Branch: `main`
- Commit: `79cdb9d`
- Details: CardId integration tests assumed boolean return while runtime returns { success: boolean }.
- Prevention: Assert result.success in integration tests and keep contract shape aligned across services/tests.

## [2026-02-08 02:18 UTC] Mistake: typedapi-depth-on-profile-page

- Branch: `main`
- Commit: `79cdb9d`
- Details: Importing typed helpers in this page triggered TS2589 recursion during web typecheck.
- Prevention: Use @/lib/convexApiWrapper for page-level hooks in heavy routes and rerun tsc immediately after adding new queries/mutations.

## [2026-02-08 04:24 UTC] Mistake: controlRoutes-top-level-return

- Branch: `main`
- Commit: `79cdb9d`
- Details: A misplaced agentId validation block was accidentally appended at module scope in controlRoutes.ts, causing parse/type/test failure.
- Prevention: After each patch touching large route files, run immediate syntax check (tsc --noEmit) before additional edits and inspect file tail with nl -ba to ensure no orphan blocks remain.
