# Mutation Import Migration Guide

## Overview

This guide explains how to migrate all Convex mutation and internalMutation imports to use the trigger-wrapped versions from `functions.ts`. This enables automatic audit logging for all database operations.

## Why This Migration?

The codebase has a trigger system that automatically logs database mutations to the audit log. However, it only works when mutations are imported from `convex/functions.ts` instead of directly from `convex/_generated/server`.

**Current state:**
- Files import `mutation` and `internalMutation` from `_generated/server` (bypasses triggers)
- Audit logging doesn't happen automatically

**Goal state:**
- Files import `mutation` and `internalMutation` from `functions.ts` (enables triggers)
- All database operations are automatically logged

## Sample Files Updated

The following files have been updated as examples demonstrating the pattern:

### Root Level (`convex/*.ts`)
- **File:** `convex/presence.ts`
- **Depth:** 0 directories deep
- **Import path:** `"./functions"`
- **Before:**
  ```typescript
  import { internalMutation, mutation, query } from "./_generated/server";
  ```
- **After:**
  ```typescript
  import { query } from "./_generated/server";
  import { mutation, internalMutation } from "./functions";
  ```

### One Level Deep (`convex/stripe/*.ts`)

#### `convex/stripe/portal.ts`
- **Depth:** 1 directory deep
- **Import path:** `"../functions"`
- **Before:**
  ```typescript
  import { mutation } from "../_generated/server";
  ```
- **After:**
  ```typescript
  import { mutation } from "../functions";
  ```

#### `convex/stripe/checkout.ts`
- **Before:**
  ```typescript
  import { mutation, query } from "../_generated/server";
  ```
- **After:**
  ```typescript
  import { query } from "../_generated/server";
  import { mutation } from "../functions";
  ```

#### `convex/stripe/webhooks.ts`
- **Before:**
  ```typescript
  import type { MutationCtx } from "../_generated/server";
  import { internalMutation } from "../_generated/server";
  ```
- **After:**
  ```typescript
  import type { MutationCtx } from "../_generated/server";
  import { internalMutation } from "../functions";
  ```

### Two Levels Deep (`convex/gameplay/games/*.ts`)

#### `convex/gameplay/games/spectator.ts`
- **Depth:** 2 directories deep
- **Import path:** `"../../functions"`
- **Before:**
  ```typescript
  import { mutation } from "../../_generated/server";
  ```
- **After:**
  ```typescript
  import { mutation } from "../../functions";
  ```

#### `convex/gameplay/games/lifecycle.ts`
- **Before:**
  ```typescript
  import type { MutationCtx } from "../../_generated/server";
  import { internalMutation, mutation } from "../../_generated/server";
  ```
- **After:**
  ```typescript
  import type { MutationCtx } from "../../_generated/server";
  import { mutation, internalMutation } from "../../functions";
  ```

## Import Path Rules

The relative path to `functions.ts` depends on directory depth:

| Directory Depth | Example File | Import Path |
|----------------|--------------|-------------|
| 0 (root) | `convex/presence.ts` | `"./functions"` |
| 1 | `convex/stripe/portal.ts` | `"../functions"` |
| 2 | `convex/gameplay/games/spectator.ts` | `"../../functions"` |
| 3 | `convex/gameplay/gameEngine/phases.ts` | `"../../../functions"` |

## Key Principles

1. **Only mutation and internalMutation need to change**
   - `query`, `internalQuery`, `action`, `internalAction` remain in `_generated/server`
   - Type imports like `MutationCtx`, `QueryCtx` remain in `_generated/server`

2. **Keep imports organized**
   - Group `_generated/server` imports together
   - Add `functions.ts` import as a separate line
   - Maintain alphabetical order when practical

3. **Type-only imports stay in _generated/server**
   ```typescript
   // Correct
   import type { MutationCtx } from "../_generated/server";
   import { mutation } from "../functions";
   ```

## Migration Options

### Option 1: Automated Migration (Recommended)

Use the provided Node.js script to automatically update all files:

```bash
# Dry run (preview changes without modifying files)
node scripts/migrate-mutation-imports.js

# Apply changes
node scripts/migrate-mutation-imports.js --apply
```

**Advantages:**
- Fast and consistent
- Handles all edge cases
- Provides detailed output

**Disadvantages:**
- Requires review of complex import statements
- May need manual fixes for unusual cases

### Option 2: Manual Migration by Directory

Update files manually in batches by directory depth:

#### Batch 1: Root Level Files
```bash
# Find files to update
grep -l "from \"\./_generated/server\"" convex/*.ts | grep -v "_generated"

# Update pattern:
# from "./_generated/server" → keep query/action
# Add: import { mutation, internalMutation } from "./functions";
```

#### Batch 2: One Level Deep
```bash
# Find files
grep -rl "from \"\.\./_generated/server\"" convex/*/ | grep -v "_generated"

# Update pattern:
# from "../_generated/server" → keep query/action
# Add: import { mutation, internalMutation } from "../functions";
```

#### Batch 3: Two Levels Deep
```bash
# Find files
grep -rl "from \"\.\.\/\.\./_generated/server\"" convex/*/*/ | grep -v "_generated"

# Update pattern:
# from "../../_generated/server" → keep query/action
# Add: import { mutation, internalMutation } from "../../functions";
```

### Option 3: Manual Migration with Search

Use your editor's search and replace:

1. Search for: `from ".*_generated/server"`
2. For each result:
   - Note which of `mutation`, `internalMutation` are imported
   - Calculate relative path to `functions.ts`
   - Split import into two lines (one for `_generated/server`, one for `functions`)

## Testing After Migration

After migrating a batch of files:

1. **Type Check:**
   ```bash
   npm run typecheck
   # or
   bun run typecheck
   ```

2. **Build:**
   ```bash
   npx convex dev
   ```

3. **Verify Triggers Work:**
   - Make a database change via a migrated mutation
   - Check the audit log to confirm it was recorded
   - Query: `ctx.db.query("auditLogs").order("desc").take(10)`

4. **Run Tests:**
   ```bash
   npm test
   # or
   bun test
   ```

## Verification Checklist

- [ ] All files in sample batch updated
- [ ] Type checking passes
- [ ] Convex build succeeds
- [ ] Audit logs appear after mutations
- [ ] Tests pass
- [ ] No runtime errors in dev environment

## Common Issues

### Issue: Type import errors

**Problem:**
```typescript
// ❌ Wrong - MutationCtx is not exported from functions.ts
import { mutation, MutationCtx } from "../functions";
```

**Solution:**
```typescript
// ✅ Correct - Keep types in _generated/server
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../functions";
```

### Issue: Mixed imports

**Problem:**
```typescript
// ❌ Confusing - mutations split across two sources
import { mutation } from "../_generated/server";
import { internalMutation } from "../functions";
```

**Solution:**
```typescript
// ✅ Correct - All mutations from functions.ts
import { mutation, internalMutation } from "../functions";
```

### Issue: Incorrect relative path

**Problem:**
```typescript
// In convex/gameplay/games/spectator.ts
import { mutation } from "../functions"; // ❌ Wrong depth
```

**Solution:**
```typescript
// In convex/gameplay/games/spectator.ts
import { mutation } from "../../functions"; // ✅ Correct depth
```

## Files Requiring Updates

Total files with mutation imports: **~99 files**

Sample breakdown by directory:
- Root level (`convex/*.ts`): ~10 files
- Admin (`convex/admin/*.ts`): ~20 files
- Gameplay (`convex/gameplay/**/*.ts`): ~15 files
- Social (`convex/social/*.ts`): ~8 files
- Economy (`convex/economy/*.ts`): ~6 files
- Progression (`convex/progression/*.ts`): ~8 files
- Infrastructure (`convex/infrastructure/*.ts`): ~5 files
- Other directories: ~27 files

## Progress Tracking

Create a checklist to track migration progress:

```markdown
### Root Level
- [x] presence.ts

### Stripe
- [x] checkout.ts
- [x] portal.ts
- [x] webhooks.ts

### Gameplay
- [x] games/spectator.ts
- [x] games/lifecycle.ts
- [ ] games/lobby.ts
- [ ] games/cleanup.ts
- [ ] ... (add remaining files)

### Admin
- [ ] ... (add all admin files)

### Social
- [ ] ... (add all social files)

... etc
```

## Support

If you encounter issues during migration:

1. Check this guide for common patterns
2. Review the sample files for examples
3. Use the automated script for consistency
4. Test incrementally to catch issues early

## Resources

- **Trigger System:** `convex/infrastructure/triggers.ts`
- **Functions Wrapper:** `convex/functions.ts`
- **Migration Script:** `scripts/migrate-mutation-imports.js`
- **Sample Files:** See "Sample Files Updated" section above
