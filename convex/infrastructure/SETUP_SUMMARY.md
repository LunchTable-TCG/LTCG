# Audit Logging Trigger System - Setup Summary

## What Was Created

### 1. Database Schema (`convex/schema.ts`)
Added the `auditLog` table with the following structure:

```typescript
auditLog: {
  table: string;                    // Table name (e.g., "users")
  operation: "insert" | "patch" | "delete";
  documentId: string;               // ID of modified document
  userId?: Id<"users">;             // User who made the change
  timestamp: number;                // When the change occurred
  changedFields?: string[];         // Fields that changed (patch only)
  oldValue?: any;                   // Previous value
  newValue?: any;                   // New value
}
```

**Indexes for efficient queries:**
- `by_table` - Query by table name
- `by_document` - Query history of specific document
- `by_user` - Query actions by user
- `by_operation` - Query by operation type
- `by_timestamp` - Query by time range

### 2. Trigger Configuration (`convex/infrastructure/triggers.ts`)
Automatic triggers configured for:
- **users** table - Tracks all user account changes
- **tokenTransactions** table - Tracks economy changes
- **moderationActions** table - Tracks admin actions

### 3. Wrapped Mutation Functions (`convex/functions.ts`)
Provides mutation wrappers that enable triggers:
```typescript
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
```

### 4. Query Functions (`convex/infrastructure/auditLog.ts`)
Read access to audit logs:
- `getRecentAuditLogs` - Get recent log entries
- `getAuditLogsByTable` - Filter by table name
- `getAuditLogsByDocument` - Get document history
- `getAuditLogsByUser` - Get user's actions
- `getAuditLogsByOperation` - Filter by operation type
- `getAuditLogsByTimeRange` - Filter by date range
- `getAuditStatistics` - Get aggregate statistics

### 5. Documentation
- `TRIGGERS_README.md` - Comprehensive documentation
- `SETUP_SUMMARY.md` - This file

## How to Enable Triggers

### Step 1: Start Convex Development Server

First, ensure the Convex development server is running to generate TypeScript types:

```bash
bun run dev:convex
```

This will regenerate the types in `convex/_generated/` to include the new `auditLog` table.

### Step 2: Update Mutation Imports

To enable triggers, update your mutation files to import from `convex/functions.ts`:

**Before:**
```typescript
import { mutation } from "./_generated/server";
```

**After:**
```typescript
import { mutation } from "./functions";
// Or from subdirectories:
import { mutation } from "../functions";
```

### Step 3: Find Files to Update

Run this command to find all files that need updating:

```bash
grep -r "from.*_generated/server" convex/ | grep "mutation"
```

### Step 4: Test Triggers

Once you've updated mutation imports, test that triggers are working:

1. Make a change to a monitored table (users, tokenTransactions, or moderationActions)
2. Query the audit log to verify the change was logged:

```typescript
import { api } from "../convex/_generated/api";

const recentLogs = useQuery(api.infrastructure.auditLog.getRecentAuditLogs, {
  limit: 10
});
```

## Usage Examples

### Query Audit Logs in Your App

```typescript
import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";

// Get recent logs
const recentLogs = useQuery(api.infrastructure.auditLog.getRecentAuditLogs, {
  limit: 50
});

// Get all user table changes
const userChanges = useQuery(api.infrastructure.auditLog.getAuditLogsByTable, {
  table: "users",
  limit: 100
});

// Get history for a specific user
const userHistory = useQuery(api.infrastructure.auditLog.getAuditLogsByDocument, {
  table: "users",
  documentId: userId,
});

// Get statistics for last 7 days
const stats = useQuery(api.infrastructure.auditLog.getAuditStatistics, {
  startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
  endTime: Date.now(),
});
```

### Add Triggers for Additional Tables

To audit additional tables, edit `convex/infrastructure/triggers.ts`:

```typescript
triggers.register("yourTable", async (ctx, change) => {
  const userId = change.newDoc?.userId ?? change.oldDoc?.userId;

  await ctx.db.insert("auditLog", {
    table: "yourTable",
    operation: normalizeOperation(change.operation),
    documentId: change.id,
    userId,
    timestamp: Date.now(),
    changedFields: getChangedFields(change),
    oldValue: change.oldDoc,
    newValue: change.newDoc,
  });
});
```

## Important Notes

### ⚠️ Triggers Only Work with Wrapped Mutations

Triggers **ONLY** run when using mutations from `convex/functions.ts`:

✅ **Correct** - Triggers will run:
```typescript
import { mutation } from "./functions";
```

❌ **Wrong** - Triggers won't run:
```typescript
import { mutation } from "./_generated/server";
```

### 🔄 What Doesn't Trigger Audits

Triggers do **NOT** run when:
- Editing data in the Convex dashboard
- Importing data via `npx convex import`
- Using unwrapped mutations from `_generated/server`

### 🔒 Atomic Execution

- Triggers run in the same transaction as the mutation
- If a trigger throws an error, the entire mutation is aborted
- All triggers run even if an earlier one throws (first error is rethrown)

### 📊 Performance Considerations

1. **Storage** - Audit logs can grow large. Consider implementing a cleanup cron job to archive old logs
2. **Data Size** - `oldValue`/`newValue` store full documents. For large documents, consider storing only IDs
3. **Write Contention** - Every write to audited tables creates an audit log entry

## Optional: ESLint Rule

To prevent accidental use of unwrapped mutations, add this ESLint rule:

```json
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [{
        "group": ["*/_generated/server"],
        "importNames": ["mutation", "internalMutation"],
        "message": "Use wrapped mutations from ./functions instead"
      }]
    }]
  }
}
```

## Files Modified

1. ✅ `convex/schema.ts` - Added `auditLog` table
2. ✅ `convex/infrastructure/triggers.ts` - NEW: Trigger definitions
3. ✅ `convex/functions.ts` - NEW: Wrapped mutation functions
4. ✅ `convex/infrastructure/auditLog.ts` - NEW: Query functions
5. ✅ `convex/infrastructure/TRIGGERS_README.md` - NEW: Full documentation
6. ✅ `convex/infrastructure/SETUP_SUMMARY.md` - NEW: This file

## Next Steps

1. **Run Convex Dev Server** - `bun run dev:convex` (generates types)
2. **Update Mutation Imports** - Change imports to use `./functions`
3. **Test** - Verify audit logs are being created
4. **Optional**: Set up ESLint rule to enforce wrapped mutations
5. **Optional**: Create a cron job to archive old audit logs

## Troubleshooting

### Triggers Not Running

**Problem:** Changes aren't appearing in audit logs

**Solutions:**
1. Verify you're using `import { mutation } from "./functions"`
2. Check Convex logs for trigger errors
3. Ensure `convex dev` regenerated types after schema changes

### TypeScript Errors

**Problem:** `auditLog` table not found in types

**Solution:** Run `bun run dev:convex` to regenerate types

### Performance Issues

**Problem:** Mutations slower since enabling triggers

**Solutions:**
1. Store only IDs instead of full documents in `oldValue`/`newValue`
2. Use selective triggers (only audit critical operations)
3. Consider async processing with `ctx.scheduler` for heavy operations

## Resources

- [convex-helpers Triggers Documentation](https://github.com/get-convex/convex-helpers#triggers)
- [Convex Custom Functions](https://docs.convex.dev/functions/custom-functions)
- See `TRIGGERS_README.md` for comprehensive documentation
