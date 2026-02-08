# Action Queue

## How to use

Append entries with:

```bash
bun run eng:log -- todo "Task title" "Task details"
```

Keep this list focused on actionable follow-ups uncovered during implementation.

## [2026-02-07 13:31 UTC] Todo: Capture post-task retro every major change

- Branch: `main`
- Commit: `79cdb9d`
- Details: After each substantial request, log at least one decision or observation and any mistake with prevention

## [2026-02-07 17:42 UTC] Todo: Add malformed payload contract tests for cardId resolvers

- Branch: `main`
- Commit: `79cdb9d`
- Details: Add tests where `availableCards` contains mixed/invalid entries to ensure `legalActionsProvider` resolvers degrade safely and keep cardId-capable rows.

## [2026-02-07 17:42 UTC] Todo: Add integration tests for cardId-first action execution path

- Branch: `main`
- Commit: `79cdb9d`
- Details: Test `TurnOrchestrator` + key actions (`summon`, `attack`, `activate_spell`, `chain`) to verify cardId parameters are passed to `LTCGApiClient` with legacy fallback.

## [2026-02-07 17:42 UTC] Todo: Add provider/evaluator drift guard in CI

- Branch: `main`
- Commit: `79cdb9d`
- Details: Include new provider/evaluator cardId tests in the fast CI matrix so contract regressions fail early before broader e2e runs.

## [2026-02-07 19:48 UTC] Todo: Authenticated Playwright smoke for streaming pages

- Branch: `main`
- Commit: `79cdb9d`
- Details: Current browser pass was blocked by auth middleware for /streaming/live and overlay token requirements; add seeded auth cookie/session for CI smoke.
- Next: Will validate visual regressions for setup + overlay under real auth context.
