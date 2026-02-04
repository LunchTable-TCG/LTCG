# Migration Scripts

This directory contains scripts for migrating Convex mutation imports to use trigger-wrapped versions.

## Available Scripts

### 1. migrate-mutation-imports.js (Recommended)

**Purpose:** Automated migration of all mutation imports in the codebase.

**Features:**
- Automatic detection of files requiring migration
- Dry-run mode to preview changes
- Apply mode to execute changes
- Handles all directory depths
- Preserves other imports (query, action, types)
- Detailed progress reporting

**Usage:**

```bash
# Dry run (preview changes)
node scripts/migrate-mutation-imports.js

# Apply changes
node scripts/migrate-mutation-imports.js --apply
```

**Requirements:**
- Node.js (ES modules support)
- Run from project root directory

**What it does:**
1. Scans all `.ts` files in `convex/` directory
2. Identifies files importing `mutation` or `internalMutation` from `_generated/server`
3. Calculates correct relative path to `functions.ts`
4. Splits imports:
   - Keeps `query`, `action`, types in `_generated/server`
   - Moves `mutation`, `internalMutation` to `functions.ts`
5. Updates files in-place (when `--apply` flag used)

**Output:**
```
Mutation Import Migration

Running in DRY RUN mode (no files will be modified)
Use --apply flag to apply changes

Found 144 TypeScript files in convex/

Processing: convex/presence.ts
  → Imports mutation: true
  → Imports internalMutation: true
  → Functions path: ./functions
  → Would update (dry run)

...

Migration Summary:
Total files scanned: 144
Files updated: 93
Files with errors: 0
Files skipped: 51
```

---

### 2. migrate-mutation-imports.sh

**Purpose:** Shell script for analysis and validation.

**Usage:**

```bash
# Run analysis
./scripts/migrate-mutation-imports.sh
```

**What it does:**
- Scans for files with `_generated/server` imports
- Identifies which import `mutation` or `internalMutation`
- Calculates correct import paths
- Provides recommendations
- Does NOT modify files (analysis only)

**Requirements:**
- Bash shell
- Standard Unix tools (grep, sed, find)

---

## Which Script to Use?

| Scenario | Recommended Script |
|----------|-------------------|
| **Automated migration** | `migrate-mutation-imports.js --apply` |
| **Preview changes** | `migrate-mutation-imports.js` (dry run) |
| **Analysis only** | `migrate-mutation-imports.sh` |
| **Manual migration** | Use sample files as reference |

---

## Migration Process

### Step 1: Preview Changes

```bash
node scripts/migrate-mutation-imports.js
```

Review the output to see what will be changed.

### Step 2: Run Tests (Before)

```bash
npm run typecheck
npm test
```

Ensure everything passes before migration.

### Step 3: Apply Migration

```bash
node scripts/migrate-mutation-imports.js --apply
```

### Step 4: Verify Changes

```bash
# Type check
npm run typecheck

# Build
npx convex dev

# Run tests
npm test
```

### Step 5: Test Audit Logging

1. Run a mutation in dev environment
2. Check audit logs:
   ```typescript
   const logs = await ctx.db.query("auditLogs").order("desc").take(10);
   ```
3. Verify entries appear

---

## Troubleshooting

### Issue: Script fails with module error

**Problem:** Node.js doesn't recognize ES modules.

**Solution:** Ensure your Node.js version supports ES modules (Node 14+), or add `"type": "module"` to `package.json`.

### Issue: Script reports errors for some files

**Problem:** Complex import statements or unusual patterns.

**Solution:** Review those files manually using the sample files as reference. Check `SAMPLE_FILES_DIFF.md` for exact patterns.

### Issue: Type errors after migration

**Problem:** Type imports moved to wrong location.

**Solution:** Type imports (`MutationCtx`, `QueryCtx`, etc.) should stay in `_generated/server`:
```typescript
// Correct
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../functions";
```

### Issue: Relative path incorrect

**Problem:** Wrong number of `../` in import path.

**Solution:** Count directory depth:
- `convex/*.ts` → `./functions`
- `convex/admin/*.ts` → `../functions`
- `convex/gameplay/games/*.ts` → `../../functions`

---

## Rollback

If issues occur after migration:

### Option 1: Git Reset

```bash
# Revert all changes
git checkout convex/

# Or revert specific files
git checkout convex/admin/roles.ts
```

### Option 2: Manual Rollback

For each file, reverse the changes:

**Change:**
```typescript
import { query } from "../_generated/server";
import { mutation } from "../functions";
```

**Back to:**
```typescript
import { mutation, query } from "../_generated/server";
```

---

## Testing Checklist

After running migration:

- [ ] All files processed without errors
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Convex build succeeds (`npx convex dev`)
- [ ] Tests pass (`npm test`)
- [ ] Audit logs appear after test mutations
- [ ] No runtime errors in dev environment

---

## Additional Resources

- **Migration Guide:** `../MUTATION_MIGRATION_GUIDE.md`
- **Sample Files:** `../SAMPLE_FILES_DIFF.md`
- **Progress Tracking:** `../MIGRATION_CHECKLIST.md`
- **Quick Reference:** `../QUICK_REFERENCE_MUTATION_MIGRATION.md`

---

## Support

For issues or questions:
1. Check the migration guide
2. Review sample files for patterns
3. Use dry-run mode to preview changes
4. Test incrementally in small batches
