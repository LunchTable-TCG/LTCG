# Migration Guide: convex-helpers makeMigration

This guide documents how to write database migrations using the `convex-helpers` `makeMigration` helper for better progress tracking, error handling, and resumability.

## Why Migrate from Workpool Pattern?

### Old Approach (Workpool-based)

```typescript
// ❌ Old pattern - manual workpool management
export default internalMutation({
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect(); // Load ALL at once

    let enqueuedCount = 0;
    for (const user of users) {
      if (needsUpdate(user)) {
        await migrationsPool.enqueueMutation(
          ctx,
          internal.migrations.updateUser,
          { userId: user._id }
        );
        enqueuedCount++;
      }
    }

    return { enqueued: enqueuedCount }; // Manual progress tracking
  },
});

// Separate worker mutation required
export const updateUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return { error: "Not found" };

    if (user.field !== undefined) return { skipped: true }; // Manual idempotency

    await ctx.db.patch(userId, { field: newValue });
    return { success: true };
  },
});
```

**Issues:**
- Loads all documents at once (memory issues for large tables)
- Manual progress tracking
- No automatic resumability if interrupted
- Requires separate worker mutation
- No built-in status monitoring
- Manual batch size management
- Complex error handling

### New Approach (makeMigration)

```typescript
// ✅ New pattern - convex-helpers migration
import { migration } from "../migrations";

export default migration({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Skip documents that don't need updates (idempotent)
    if (user.field !== undefined) {
      return null; // null = skip
    }

    // Return the fields to patch
    return {
      field: newValue,
    };
  },
});
```

**Benefits:**
- Automatic batch processing (100 documents per batch by default)
- Built-in progress tracking via `migrations` table
- Resumable from cursor if interrupted
- Status monitoring via `npx convex run migrations:status`
- Error handling with automatic cursor tracking
- Simpler implementation (no separate worker needed)
- Dry run support for testing

## Setup (Already Done)

The following setup is already complete in this project:

1. **Schema Update** - `convex/schema.ts` includes `migrations` table:
   ```typescript
   import { migrationsTable } from "convex-helpers/server/migrations";

   export default defineSchema({
     migrations: migrationsTable,
     // ... other tables
   });
   ```

2. **Migration Wrapper** - `convex/migrations.ts` exports configured helper:
   ```typescript
   import { makeMigration } from "convex-helpers/server/migrations";
   import { internalMutation } from "./functions";

   export const migration = makeMigration(internalMutation, {
     migrationTable: "migrations",
   });
   ```

## Writing a New Migration

### Basic Pattern

```typescript
import { migration } from "../migrations";

export default migration({
  table: "tableName",
  migrateOne: async (ctx, document) => {
    // 1. Check if document needs migration (idempotent)
    if (document.newField !== undefined) {
      return null; // Skip this document
    }

    // 2. Return fields to patch
    return {
      newField: computeValue(document),
    };
  },
});
```

### Migration with Transformations

```typescript
import { migration } from "../migrations";

export default migration({
  table: "cards",
  migrateOne: async (ctx, card) => {
    const newValue = transformOldValue(card.oldField);

    // Skip if already migrated
    if (card.newField === newValue) {
      return null;
    }

    console.log(`Migrating card ${card.name}: ${card.oldField} → ${newValue}`);

    return {
      newField: newValue,
    };
  },
});
```

### Migration with Lookups

```typescript
import { migration } from "../migrations";

export default migration({
  table: "orders",
  migrateOne: async (ctx, order) => {
    if (order.userId) {
      return null; // Already has userId
    }

    // Look up related data
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", order.userEmail))
      .first();

    if (!user) {
      console.warn(`No user found for order ${order._id}`);
      return null; // Skip this order
    }

    return {
      userId: user._id,
    };
  },
});
```

### Migration with Complex Logic

```typescript
import { migration } from "../migrations";

export default migration({
  table: "users",
  migrateOne: async (ctx, user) => {
    // Complex conditions
    const needsMigration =
      user.legacyField === undefined &&
      user.createdAt < Date.parse("2024-01-01");

    if (!needsMigration) {
      return null;
    }

    // Complex transformations
    const stats = await calculateUserStats(ctx, user._id);

    return {
      legacyField: stats.total,
      migratedAt: Date.now(),
    };
  },
});
```

## Running Migrations

### Run a Single Migration

```bash
# Run the migration directly
npx convex run migrations/addLeaderboardFields

# Or with custom batch size
npx convex run migrations:start --batchSize 50
```

### Check Migration Status

```bash
# View status of all migrations
npx convex run migrations:status
```

**Example output:**
```json
[
  {
    "name": "migrations/addLeaderboardFields",
    "isDone": true,
    "processed": 1234,
    "cursor": null
  },
  {
    "name": "migrations/updateArchetypes",
    "isDone": false,
    "processed": 567,
    "cursor": "eyJ..."
  }
]
```

### Cancel a Running Migration

```bash
npx convex run migrations:cancel
```

### Run Multiple Migrations Sequentially

```typescript
// convex/migrations.ts
export const runAll = internalMutation({
  handler: async (ctx) => {
    await startMigrationsSerially(ctx, [
      internal.migrations.addLeaderboardFields,
      internal.migrations.updateArchetypes,
      internal.migrations.migrateAdminRoles,
    ]);
  },
});
```

```bash
npx convex run migrations:runAll
```

## Advanced Patterns

### Dry Run (Preview Changes)

The `makeMigration` helper supports dry runs:

```typescript
import { startMigration } from "convex-helpers/server/migrations";
import { internal } from "./_generated/api";

export const preview = internalMutation({
  handler: async (ctx) => {
    await startMigration(ctx, internal.migrations.myMigration, {
      startCursor: null,
      batchSize: 10,
      dryRun: true, // Preview without committing changes
    });
  },
});
```

### Custom Batch Size

```typescript
// Larger batches for simple migrations
await startMigration(ctx, internal.migrations.simpleMigration, {
  batchSize: 500,
});

// Smaller batches for complex migrations with lookups
await startMigration(ctx, internal.migrations.complexMigration, {
  batchSize: 50,
});
```

### Resume from Specific Cursor

```typescript
// Resume a migration from a specific point
await startMigration(ctx, internal.migrations.myMigration, {
  startCursor: "eyJfaWQiOi...", // From status query
  batchSize: 100,
});
```

## Migration Checklist

When creating a new migration:

- [ ] Import `migration` from `../migrations`
- [ ] Use `migration({ table, migrateOne })` pattern
- [ ] Return `null` to skip documents (idempotent)
- [ ] Return object with fields to patch
- [ ] Add console.log for important transformations
- [ ] Test with small batch first (`batchSize: 10`)
- [ ] Check status with `migrations:status`
- [ ] Document what the migration does
- [ ] Mark as idempotent (safe to run multiple times)

## Migrating Existing Migrations

To migrate an existing workpool-based migration:

1. **Extract the transformation logic** from the worker mutation
2. **Move it into `migrateOne`** function
3. **Replace workpool enqueue** with `migration()` wrapper
4. **Remove the worker mutation** (no longer needed)
5. **Keep old code commented** for reference
6. **Test the migration** with a small batch

See refactored examples:
- `convex/migrations/addLeaderboardFields.ts`
- `convex/migrations/updateArchetypes.ts`
- `convex/migrations/migrateAdminRoles.ts`

## When to Keep Workpool Pattern

The `makeMigration` helper is ideal for most migrations, but consider keeping the workpool pattern for:

1. **Migrations that require strict ordering** between documents
2. **Migrations with complex multi-step workflows** that span multiple mutations
3. **Migrations that need custom retry logic** beyond what makeMigration provides
4. **Migrations that operate on multiple tables simultaneously**

For simple document transformations, always prefer `makeMigration`.

## Troubleshooting

### Migration Not Progressing

Check the status:
```bash
npx convex run migrations:status
```

If stuck, check Convex dashboard logs for errors.

### Migration Failed Mid-Way

Migrations are resumable. Simply run the migration again - it will resume from the last cursor.

### Migration Running Too Slowly

Increase batch size:
```typescript
await startMigration(ctx, internal.migrations.myMigration, {
  batchSize: 500, // Default is 100
});
```

### Need to Re-run Migration

Migrations are idempotent if you check for existing fields:
```typescript
migrateOne: async (ctx, doc) => {
  if (doc.newField !== undefined) {
    return null; // Skip already migrated
  }
  return { newField: value };
}
```

To force re-run, remove the idempotency check (use with caution).

## Additional Resources

- [convex-helpers migrations docs](https://github.com/get-convex/convex-helpers#migrations)
- [Convex migrations guide](https://docs.convex.dev/database/advanced/migrations)
- Project migration wrapper: `convex/migrations.ts`
- Example migrations: `convex/migrations/*.ts`
