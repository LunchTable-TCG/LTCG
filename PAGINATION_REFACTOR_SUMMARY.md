# Pagination Refactor Summary

This document summarizes the pagination standardization work completed on 2026-02-03.

## Overview

Standardized pagination across the codebase by:
1. Refactoring manual cursor pagination to use `convex-helpers` `paginator` where appropriate
2. Documenting when to use each pagination strategy
3. Creating a comprehensive migration guide

## Files Changed

### 1. `/convex/economy/tokenMarketplace.ts`

**Refactored**: `getTokenTransactionHistory` query

**Before**: Manual cursor pagination using `.take(limit + 1)` pattern
```typescript
export const getTokenTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 100);
    const transactionsQuery = ctx.db
      .query("tokenTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc");

    // Manual cursor handling
    let transactions: Awaited<ReturnType<typeof transactionsQuery.take>>;
    if (args.cursor) {
      const cursorTimestamp = Number.parseInt(args.cursor, 10);
      transactions = await transactionsQuery
        .filter((q) => q.lt(q.field("createdAt"), cursorTimestamp))
        .take(limit + 1);
    } else {
      transactions = await transactionsQuery.take(limit + 1);
    }

    // Manual hasMore calculation
    const hasMore = transactions.length > limit;
    if (hasMore) {
      transactions = transactions.slice(0, limit);
    }

    const nextCursor = hasMore && lastTx ? lastTx.createdAt.toString() : undefined;

    return { transactions, nextCursor, hasMore };
  },
});
```

**After**: Using `convex-helpers` `paginator`
```typescript
export const getTokenTransactionHistory = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    const result = await paginator(ctx.db, schema)
      .query("tokenTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((tx) => ({
        _id: tx._id,
        transactionType: tx.transactionType,
        // ... field mapping
      })),
    };
  },
});
```

**Benefits**:
- 20 lines reduced to 12 lines
- No manual cursor management
- No manual hasMore calculation
- Cleaner, more maintainable code
- Standardized with other paginated queries

**Breaking Change**: Client code needs to update to use `paginationOpts` instead of `limit`/`cursor`.

### 2. `/convex/admin/admin.ts`

**Analysis**: `getAuditLog` query

**Decision**: Keep manual pagination

**Reason**: This query uses complex `.filter()` operations for:
- Date range filtering (`startDate`, `endDate`)
- Cross-field filtering (action + adminId combinations)
- Dynamic index selection based on filters

The `paginator` from `convex-helpers` explicitly does not support `.filter()` operations. Manual pagination is the appropriate pattern here.

**Pattern documented** in the pagination guide as "Manual Cursor Pagination (For Complex Filtering)".

## Files Created

### 1. `/convex/PAGINATION_GUIDE.md`

Comprehensive guide documenting:
- When to use built-in `.paginate()`
- When to use `convex-helpers` `paginator`
- When to use manual cursor pagination
- Migration checklists
- Client-side integration patterns
- Performance considerations
- Decision tree for choosing pagination strategy

### 2. `/PAGINATION_REFACTOR_SUMMARY.md` (this file)

Summary of changes made during refactoring.

## Migration Impact

### Backend Changes Required

#### tokenMarketplace.ts
- ✅ `getTokenTransactionHistory` - refactored to use `paginator`

### Frontend Changes Required

If any frontend code calls `getTokenTransactionHistory`, it needs to update:

**Before**:
```typescript
const result = useQuery(api.tokenMarketplace.getTokenTransactionHistory, {
  limit: 20,
  cursor: nextCursor,
});

// Access: result.transactions, result.nextCursor, result.hasMore
```

**After**:
```typescript
const [paginationOpts, setPaginationOpts] = useState({
  numItems: 20,
  cursor: null,
});

const result = useQuery(api.tokenMarketplace.getTokenTransactionHistory, {
  paginationOpts,
});

// Access: result.page, result.continueCursor, result.isDone
```

## Pagination Patterns in Codebase

### Already using built-in `.paginate()`
- `convex/social/globalChat.ts` - Chat messages
- `convex/economy/economy.ts` - `getTransactionHistoryPaginated`
- `convex/economy/shop.ts` - Shop purchases
- `convex/core/decks.ts` - Deck listings

### Now using `convex-helpers` `paginator`
- `convex/economy/tokenMarketplace.ts` - `getTokenTransactionHistory`

### Using manual cursor pagination (appropriate)
- `convex/admin/admin.ts` - `getAuditLog` (complex filtering)
- `convex/economy/economy.ts` - `getTransactionHistory` (legacy, has paginated version)

## Testing Recommendations

1. **Unit Tests**
   - Test `getTokenTransactionHistory` with various `paginationOpts`
   - Verify `continueCursor` works for loading more results
   - Test empty results

2. **Integration Tests**
   - Test client-side pagination flow
   - Verify cursor persistence across page loads
   - Test edge cases (last page, single item, etc.)

3. **Performance Tests**
   - Compare query execution time before/after
   - Verify index usage hasn't changed
   - Check database read units

## Future Work

### Potential Candidates for Refactoring

1. **`convex/economy/economy.ts:284-333`** - `getTransactionHistory`
   - Currently uses legacy manual pagination
   - Has a newer paginated version (`getTransactionHistoryPaginated`)
   - Consider deprecating the old version

2. **Any new pagination implementations**
   - Use the decision tree in `PAGINATION_GUIDE.md`
   - Default to built-in `.paginate()` unless there's a specific reason not to

### Documentation Updates

- Add link to `PAGINATION_GUIDE.md` in main `README.md`
- Update contributing guide to reference pagination standards
- Add pagination examples to onboarding docs

## Rollback Plan

If issues arise with the refactored `getTokenTransactionHistory`:

1. Revert `/convex/economy/tokenMarketplace.ts` to commit before refactor
2. Remove new imports (`paginator`, `paginationOptsValidator`, `schema`)
3. Restore original function signature with `limit` and `cursor` args
4. Redeploy backend

The changes are isolated to a single function, making rollback straightforward.

## Questions & Answers

**Q: Why not refactor `getAuditLog` in `admin.ts`?**
A: It uses `.filter()` extensively for complex date ranges and cross-field filtering. The `paginator` from `convex-helpers` doesn't support `.filter()`, so manual pagination is the correct pattern here.

**Q: What's the difference between `paginator` and built-in `.paginate()`?**
A: Built-in `.paginate()` is reactive and automatically stitches pages together when new data arrives. `paginator` allows multiple pagination calls in a single query/mutation and works inside components, but doesn't have automatic page stitching. See `PAGINATION_GUIDE.md` for full comparison.

**Q: Should we always use `paginator` going forward?**
A: No. Use built-in `.paginate()` for standard queries (it's the recommended approach). Only use `paginator` when you need multiple pagination calls per query/mutation or need to paginate inside components.

**Q: Are cursors encrypted?**
A: Built-in `.paginate()` uses encrypted cursors. `paginator` from `convex-helpers` uses unencrypted cursors (base64-encoded index keys). Both are secure for public APIs.

## Related Resources

- [Convex Pagination Docs](https://docs.convex.dev/database/pagination)
- [convex-helpers GitHub](https://github.com/get-convex/convex-helpers)
- [Stack: Pagination Best Practices](https://stack.convex.dev/pagination)
- Internal: `/convex/PAGINATION_GUIDE.md`
