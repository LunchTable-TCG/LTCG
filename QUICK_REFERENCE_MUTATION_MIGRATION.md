# Quick Reference: Mutation Import Migration

## TL;DR

Change mutation imports from `_generated/server` to `functions.ts` to enable audit logging.

## Before & After

```typescript
// ❌ BEFORE (no audit logging)
import { mutation, query } from "../_generated/server";

// ✅ AFTER (audit logging enabled)
import { query } from "../_generated/server";
import { mutation } from "../functions";
```

## Path by Directory Depth

| Location | Example File | Import Path |
|----------|--------------|-------------|
| `convex/*.ts` | `presence.ts` | `"./functions"` |
| `convex/admin/*.ts` | `admin/roles.ts` | `"../functions"` |
| `convex/gameplay/games/*.ts` | `gameplay/games/lobby.ts` | `"../../functions"` |

## Quick Migration

### Option 1: Automated (Recommended)

```bash
# Preview changes
node scripts/migrate-mutation-imports.js

# Apply changes
node scripts/migrate-mutation-imports.js --apply
```

### Option 2: Manual Search & Replace

**Search:** `from ".*_generated/server"`

**For each match:**
1. Check if importing `mutation` or `internalMutation`
2. Calculate relative path to `functions.ts`
3. Split imports:
   - Keep `query`, `action`, types in `_generated/server`
   - Move `mutation`, `internalMutation` to `functions.ts`

## Common Patterns

### Pattern 1: Only mutation
```typescript
// Before
import { mutation } from "../_generated/server";

// After
import { mutation } from "../functions";
```

### Pattern 2: Mutation + Query
```typescript
// Before
import { mutation, query } from "../_generated/server";

// After
import { query } from "../_generated/server";
import { mutation } from "../functions";
```

### Pattern 3: Mutation + Types
```typescript
// Before
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

// After
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../functions";
```

### Pattern 4: Both mutation types
```typescript
// Before
import { internalMutation, mutation, query } from "../_generated/server";

// After
import { query } from "../_generated/server";
import { mutation, internalMutation } from "../functions";
```

## Don't Change These

- `query` → stays in `_generated/server`
- `internalQuery` → stays in `_generated/server`
- `action` → stays in `_generated/server`
- `internalAction` → stays in `_generated/server`
- Type imports (`MutationCtx`, `QueryCtx`, etc.) → stay in `_generated/server`

## Sample Files

Check these for examples:
- `convex/presence.ts` (root level)
- `convex/stripe/portal.ts` (one level deep)
- `convex/gameplay/games/spectator.ts` (two levels deep)

## Testing

```bash
# Type check
npm run typecheck

# Build
npx convex dev

# Verify audit logs appear after mutations
```

## Full Documentation

See `MUTATION_MIGRATION_GUIDE.md` for comprehensive details.
