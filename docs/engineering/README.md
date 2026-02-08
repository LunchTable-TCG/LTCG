# Engineering Memory System

This folder is the persistent project memory loop for execution quality.

Use it to capture:

- observations and working patterns
- mistakes and their preventions
- architectural/product decisions and rationale
- active action queue for follow-ups

## Files

- `docs/engineering/observations.md`: notes, wins, patterns, and heuristics
- `docs/engineering/mistakes.md`: incidents, wrong assumptions, and prevention rules
- `docs/engineering/decisions.md`: explicit decisions and tradeoffs
- `docs/engineering/action-queue.md`: queued improvements and unresolved items

## Fast Workflow

1. Before a substantial task, review recent memory:

```bash
bun run eng:start
# or:
bun run eng:review
```

2. During or after execution, log key items:

```bash
bun run eng:log -- observation "Pattern validated" "Provider-first debugging reduced iteration time"
bun run eng:log -- mistake "Missed env validation" "Assumed key existed; runtime failed" "Add schema guard in config.ts"
bun run eng:log -- decision "Polling fallback policy" "Use polling when callback URL is absent" "Keep adaptive intervals enabled"
bun run eng:log -- todo "Add endpoint contract tests" "Cover /api/agents/games/actions/* in integration suite"
```

3. Keep entries concise, actionable, and prevention-oriented.

## Standards

- Write facts and decisions, not narratives.
- Every mistake entry must include a prevention.
- Every decision entry must include rationale and impact.
- Update this memory continuously to improve execution quality over time.
