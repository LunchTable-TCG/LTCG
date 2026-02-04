# Convex Pagination Guide

This guide documents the three pagination strategies used in the LTCG codebase and when to use each one.

## Overview

| Strategy | Use Case | Pros | Cons |
|----------|----------|------|------|
| **Built-in `.paginate()`** | Standard queries without complex filtering | Reactive, automatic page stitching, encrypted cursors | Single call per query/mutation, can't use in components |
| **convex-helpers `paginator`** | Queries needing multiple pagination calls or component usage | Multiple calls per query, works in components | No automatic page stitching, unencrypted cursors, no `.filter()` support |
| **Manual cursor pagination** | Complex filtering with `.filter()` or custom logic | Full control, supports any query pattern | Manual cursor management, more code |

## 1. Built-in `.paginate()` (Preferred for Standard Queries)

The built-in Convex pagination is the **recommended approach** for most use cases.

### When to Use
- Standard queries without complex filtering
- Single pagination call per query
- Need reactive page stitching (when new items appear, pages adjust automatically)
- Want encrypted cursors

### Example

```typescript
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getMessages = query({
  args: {
    paginationOpts: paginationOptsValidator,
    channelId: v.optional(v.id("channels")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("messages")
      .withIndex("by_created")
      .order("desc");

    // Filters that can use indexes work fine
    if (args.channelId) {
      query = query.filter((q) => q.eq(q.field("channelId"), args.channelId));
    }

    return await query.paginate(args.paginationOpts);
  },
});
```

### Client Usage

```typescript
const { results, status, loadMore } = usePaginatedQuery(
  api.messages.getMessages,
  { channelId: "channel123" },
  { initialNumItems: 50 }
);
```

### Codebase Examples
- `convex/social/globalChat.ts:121-130` - Chat messages with reversed page order
- `convex/economy/economy.ts:339-359` - Currency transactions with optional filtering
- `convex/economy/shop.ts` - Shop purchases
- `convex/core/decks.ts` - Deck listings

## 2. convex-helpers `paginator` (For Advanced Use Cases)

Use the `paginator` from `convex-helpers/server/pagination` when you need more flexibility.

### When to Use
- Need to paginate **multiple queries** in a single query/mutation
- Using pagination **inside Convex components**
- Don't need reactive page stitching
- Query is simple (no `.filter()` calls)

### Limitations
- **No `.filter()` support** - filter the returned `page` in TypeScript instead
- No automatic page stitching - must manually handle `endCursor`
- Unencrypted cursors
- System tables not supported

### Example

```typescript
import { paginator } from "convex-helpers/server/pagination";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import schema from "./schema";

export const getTokenTransactionHistory = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Use paginator for clean cursor-based pagination
    const result = await paginator(ctx.db, schema)
      .query("tokenTransactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Transform the page if needed
    return {
      ...result,
      page: result.page.map((tx) => ({
        _id: tx._id,
        transactionType: tx.transactionType,
        amount: tx.amount,
        // ... other fields
      })),
    };
  },
});
```

### Multi-Pagination Example

```typescript
export const getDashboardData = query({
  args: {
    messagesPaginationOpts: paginationOptsValidator,
    activityPaginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Paginate multiple queries in one call
    const [messages, activity] = await Promise.all([
      paginator(ctx.db, schema)
        .query("messages")
        .withIndex("by_created")
        .order("desc")
        .paginate(args.messagesPaginationOpts),

      paginator(ctx.db, schema)
        .query("activity")
        .withIndex("by_timestamp")
        .order("desc")
        .paginate(args.activityPaginationOpts),
    ]);

    return { messages, activity };
  },
});
```

### Codebase Examples
- `convex/economy/tokenMarketplace.ts:1058-1089` - Token transaction history

## 3. Manual Cursor Pagination (For Complex Filtering)

Use manual cursor pagination when you need `.filter()` with complex conditions.

### When to Use
- Complex filtering that can't be expressed via indexes
- Date range queries with dynamic filters
- Multi-field filtering that doesn't map to indexes
- Need backward compatibility with existing cursor format

### Pattern

```typescript
export const getFilteredLogs = query({
  args: {
    limit: v.number(),
    cursor: v.optional(v.number()), // timestamp cursor
    action: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { limit, cursor, action, startDate, endDate } = args;

    // Build query with best available index
    let query = ctx.db
      .query("adminAuditLogs")
      .withIndex(action ? "by_action" : "by_timestamp")
      .order("desc");

    // Apply cursor-based pagination
    if (cursor) {
      query = query.filter((q) => q.lt(q.field("timestamp"), cursor));
    }

    // Apply date range filters
    if (startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
    }
    if (endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), endDate));
    }

    // Fetch limit + 1 to check for more pages
    const items = await query.take(limit + 1);

    // Determine if there are more results
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;

    // Get next cursor (timestamp of last result)
    const nextCursor = hasMore && results.length > 0
      ? results[results.length - 1]?.timestamp
      : undefined;

    return {
      results,
      nextCursor,
      hasMore,
    };
  },
});
```

### Post-Query Enrichment Pattern

When you need to enrich paginated results with data from other tables:

```typescript
// Fetch logs with limit + 1 to check for more pages
const logs = await query.take(limit + 1);

// Determine if there are more results
const hasMore = logs.length > limit;
const results = hasMore ? logs.slice(0, limit) : logs;

// Get next cursor BEFORE enrichment
const nextCursor = hasMore && results.length > 0
  ? results[results.length - 1]?.timestamp
  : undefined;

// Enrich results AFTER pagination logic
const enrichedResults = await Promise.all(
  results.map(async (log) => {
    const admin = await ctx.db.get(log.adminId);
    const targetUser = log.targetUserId
      ? await ctx.db.get(log.targetUserId)
      : null;

    return {
      ...log,
      adminUsername: admin?.username || "Unknown",
      targetUsername: targetUser?.username || undefined,
    };
  })
);

return {
  logs: enrichedResults,
  nextCursor,
  hasMore,
};
```

### Codebase Examples
- `convex/admin/admin.ts:487-592` - Admin audit logs with complex filtering and enrichment
- `convex/economy/economy.ts:284-333` - Transaction history with currency type filtering (legacy, prefer paginated version)

## Migration Checklist

When refactoring from manual pagination to built-in or paginator:

### From Manual → Built-in `.paginate()`

1. **Check filters**: Ensure no `.filter()` calls that can't be replaced with index filters
2. **Replace args**:
   ```typescript
   // Before
   args: { limit: v.optional(v.number()), cursor: v.optional(v.string()) }

   // After
   args: { paginationOpts: paginationOptsValidator }
   ```
3. **Remove manual pagination logic**: Delete `take(limit + 1)`, slicing, `hasMore` calculation
4. **Use `.paginate()`**:
   ```typescript
   return await query.paginate(args.paginationOpts);
   ```

### From Manual → `paginator`

1. **Import dependencies**:
   ```typescript
   import { paginator } from "convex-helpers/server/pagination";
   import { paginationOptsValidator } from "convex/server";
   import schema from "./schema";
   ```
2. **Replace args** (same as built-in)
3. **Verify no `.filter()` calls** - paginator doesn't support them
4. **Replace query**:
   ```typescript
   const result = await paginator(ctx.db, schema)
     .query("tableName")
     .withIndex("indexName", (q) => q.eq("field", value))
     .order("desc")
     .paginate(args.paginationOpts);
   ```

## Client-Side Integration

### Built-in Pagination (Reactive)

```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function MessageList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.getMessages,
    {},
    { initialNumItems: 50 }
  );

  return (
    <div>
      {results?.map((msg) => <Message key={msg._id} message={msg} />)}
      {status === "CanLoadMore" && (
        <button onClick={() => loadMore(50)}>Load More</button>
      )}
    </div>
  );
}
```

### paginator / Manual Pagination (Non-Reactive)

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

function TransactionList() {
  const [paginationOpts, setPaginationOpts] = useState({
    numItems: 20,
    cursor: null,
  });

  const result = useQuery(
    api.tokenMarketplace.getTokenTransactionHistory,
    { paginationOpts }
  );

  const loadMore = () => {
    if (result?.continueCursor) {
      setPaginationOpts({
        numItems: 20,
        cursor: result.continueCursor,
      });
    }
  };

  return (
    <div>
      {result?.page.map((tx) => <Transaction key={tx._id} tx={tx} />)}
      {result?.isDone === false && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

## Performance Considerations

### Index Selection

Always use the most specific index available:

```typescript
// Good - uses specific index
.query("adminAuditLogs")
.withIndex("by_admin", (q) => q.eq("adminId", adminId))

// Less efficient - uses broader index + filter
.query("adminAuditLogs")
.withIndex("by_timestamp")
.filter((q) => q.eq(q.field("adminId"), adminId))
```

### Limit Sizes

Choose appropriate page sizes based on data size and query complexity:

- **Small items** (messages, notifications): 50-100 items
- **Medium items** (transactions, cards): 20-50 items
- **Large items** (with enrichment, complex data): 10-20 items
- **Admin/reporting** (slow queries): 25-50 items with timeout warnings

### Enrichment

Enrich AFTER pagination to avoid fetching unnecessary data:

```typescript
// Good - enrich only the page
const items = await query.take(limit + 1);
const hasMore = items.length > limit;
const results = hasMore ? items.slice(0, limit) : items;
const enriched = await Promise.all(results.map(enrichFn));

// Bad - enriches ALL items including the extra one
const items = await query.take(limit + 1);
const enriched = await Promise.all(items.map(enrichFn)); // Wastes 1 enrichment
const hasMore = enriched.length > limit;
```

## Decision Tree

```
Need pagination?
│
├─ Complex filtering with .filter()?
│  └─ YES → Use Manual Cursor Pagination
│
├─ Multiple paginated queries in one call?
│  └─ YES → Use paginator from convex-helpers
│
├─ Need pagination in component?
│  └─ YES → Use paginator from convex-helpers
│
└─ Standard query?
   └─ Use Built-in .paginate() ✅ (preferred)
```

## Resources

- [Convex Pagination Docs](https://docs.convex.dev/database/pagination)
- [convex-helpers pagination](https://stack.convex.dev/pagination)
- [Stack: Pagination Best Practices](https://stack.convex.dev/pagination)
