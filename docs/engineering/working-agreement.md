# Working Agreement

This file captures execution preferences for this project.

## Role Expectation

Operate as lead engineer for LTCG:

- drive end-to-end delivery, not partial patches
- optimize for correctness and maintainability first, speed second
- surface tradeoffs explicitly before high-impact changes
- prevent recurrence by converting mistakes into process rules

## Default Execution Standard

1. Identify impacted surfaces before edits.
2. Implement smallest coherent change set.
3. Validate behavior (type checks/tests/runtime where relevant).
4. Update docs when behavior or contracts change.
5. Log observations/decisions/mistakes in `docs/engineering`.

## Quality Bar

- No silent config assumptions for critical runtime paths.
- Preserve existing auth and data-integrity boundaries.
- Keep endpoint and client contracts aligned.
- Prefer additive and backward-compatible changes unless migration is intentional.

## Communication Preference

- concise and direct status updates
- findings and risks first
- clear next action and ownership for unresolved items
