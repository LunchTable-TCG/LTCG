# Migration Workpool Refactoring

## Overview

All 6 migration files in `convex/migrations/` have been refactored to use workpool for better reliability, progress tracking, and parallel execution.

## Changes Made

### 1. Infrastructure Setup

**Created `/convex/infrastructure/workpools.ts`**
- Defines 4 workpool instances for different job types
- `migrationsPool`: Parallelism of 3, with automatic retries enabled

**Updated `/convex/convex.config.ts`**
- Added workpool component to the app configuration

### 2. Migration Files Refactored

All migrations now follow the same pattern:

#### Before (Old Pattern)
```typescript
export default internalMutation({
  handler: async (ctx) => {
    const items = await ctx.db.query("table").collect();
    for (const item of items) {
      await ctx.db.patch(item._id, { ... });
    }
    return { success: true, updated: items.length };
  },
});
```

#### After (New Pattern with Workpool)
```typescript
export default internalMutation({
  handler: async (ctx) => {
    const items = await ctx.db.query("table").collect();

    let enqueuedCount = 0;
    for (const item of items) {
      await migrationsPool.enqueueMutation(
        ctx,
        internal.migrations.fileName.workerFunction,
        { itemId: item._id }
      );
      enqueuedCount++;
    }

    return {
      success: true,
      enqueued: enqueuedCount,
      message: `Enqueued ${enqueuedCount} jobs. Check workpool status for progress.`
    };
  },
});

// Worker mutation - processes one item
export const workerFunction = internalMutation({
  args: { itemId: v.id("table") },
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return { success: false, error: "Not found" };

    // Idempotency check
    if (alreadyMigrated(item)) {
      return { success: true, skipped: true };
    }

    await ctx.db.patch(itemId, { ... });
    return { success: true, updated: true };
  },
});
```

### 3. Files Refactored

#### addLeaderboardFields.ts
- **Main migration**: Enqueues jobs for users missing leaderboard fields
- **Worker**: `updateUserLeaderboardFields` - Updates a single user's leaderboard fields
- **Idempotency**: Checks if `rankedElo` is already set

#### loadAllCards.ts
- **Main migration**: Enqueues upsert jobs for all card definitions
- **Worker**: `upsertCard` - Creates or updates a single card
- **Features**: Supports dry run and clearExisting options

#### manualAbilities.ts
- **Main migration**: Enqueues ability update jobs for each card
- **Worker**: `updateCardAbility` - Updates a single card's ability
- **Logging**: Warns about cards not found in database

#### migrateAdminRoles.ts
- **Main migration**: Enqueues updates for admin roles missing grantedBy
- **Worker**: `updateAdminRole` - Sets grantedBy for a single admin role
- **Idempotency**: Checks if `grantedBy` is already set

#### updateArchetypes.ts
- **Main migration**: Enqueues archetype updates for cards using old archetype names
- **Worker**: `updateCardArchetype` - Updates a single card's archetype
- **Mapping**: fire → infernal_dragons, water → abyssal_horrors, etc.

#### updateShopProducts.ts
- **Main migration**: Enqueues archetype updates for shop products
- **Worker**: `updateProductArchetype` - Updates a single product's packConfig archetype
- **Mapping**: Same as card archetypes

## Benefits of Workpool Pattern

### 1. **Better Reliability**
- Automatic retries on transient failures (OCC conflicts, network issues)
- Failed jobs can be retried without re-running entire migration
- Each item is processed independently

### 2. **Progress Tracking**
- Workpool dashboard shows job status in real-time
- Can monitor completion percentage
- Failed jobs are clearly identified

### 3. **Controlled Parallelism**
- `maxParallelism: 3` prevents overwhelming the database
- Multiple items processed concurrently within limits
- Better performance than sequential processing

### 4. **Idempotency**
- Each worker checks if work is already done before making changes
- Safe to re-run migrations without duplicating work
- Worker returns `{ skipped: true }` if already processed

### 5. **Better Logging**
- Main migration logs total items found and jobs enqueued
- Workers log individual successes/failures with item details
- Clear separation of concerns

## Running Migrations

### Before (Direct Execution)
```bash
bunx convex run migrations:addLeaderboardFields
# Waits for entire migration to complete
```

### After (Workpool Execution)
```bash
bunx convex run migrations:addLeaderboardFields
# Returns immediately after enqueueing jobs
# Jobs complete asynchronously in background
```

### Monitoring Progress
1. Check Convex Dashboard → Functions → `workpool` component
2. View job queue status and completion rate
3. Review failed jobs and retry if needed

## Migration Status Tracking

All migrations now return:
```typescript
{
  success: true,
  enqueued: number,        // Jobs enqueued
  skipped: number,         // Items already migrated
  total: number,           // Total items checked
  message: string          // Human-readable status
}
```

Worker mutations return:
```typescript
{
  success: boolean,
  updated?: boolean,       // Item was updated
  skipped?: boolean,       // Item already migrated
  error?: string          // Error message if failed
}
```

## Error Handling

### Worker Errors
- Caught and logged to console with item details
- Job marked as failed in workpool
- Can be retried individually
- Doesn't stop other jobs from processing

### Main Migration Errors
- Returns immediately with error status
- Jobs already enqueued will continue processing
- Safe to re-run after fixing issue

## Performance Comparison

### Old Pattern (Sequential)
- 1000 users × 50ms per user = 50 seconds
- Single point of failure
- No progress visibility

### New Pattern (Workpool, parallelism=3)
- 1000 users ÷ 3 × 50ms = ~17 seconds
- Individual failures don't block others
- Real-time progress tracking
- Automatic retries on transient failures

## Notes

- All migrations remain **idempotent** - safe to re-run
- Workers perform double-checks before making changes
- Workpool retries are automatic (configured in workpools.ts)
- Migration logs include timestamps and detailed progress info
