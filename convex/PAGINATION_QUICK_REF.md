# Pagination Quick Reference

> **TL;DR**: Use built-in `.paginate()` unless you need multiple pagination calls or complex filtering.

## Decision Tree

```
Do you need pagination?
├─ Uses .filter() with complex logic? → Manual Cursor Pagination
├─ Need multiple paginated queries in one call? → convex-helpers paginator
├─ Need pagination in component? → convex-helpers paginator
└─ Standard query? → Built-in .paginate() ✅
```

## 1. Built-in `.paginate()` (Use This 90% of the Time)

```typescript
import { paginationOptsValidator } from "convex/server";

export const getMessages = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

**Client**:
```typescript
const { results, loadMore } = usePaginatedQuery(
  api.messages.getMessages,
  {},
  { initialNumItems: 50 }
);
```

## 2. convex-helpers `paginator` (Advanced Use Cases)

```typescript
import { paginator } from "convex-helpers/server/pagination";
import { paginationOptsValidator } from "convex/server";
import schema from "./schema";

export const getHistory = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await paginator(ctx.db, schema)
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

**Client**:
```typescript
const [opts, setOpts] = useState({ numItems: 20, cursor: null });
const result = useQuery(api.history.getHistory, { paginationOpts: opts });

const loadMore = () => {
  if (result?.continueCursor) {
    setOpts({ numItems: 20, cursor: result.continueCursor });
  }
};
```

## 3. Manual Cursor (Complex Filtering)

```typescript
export const getFiltered = query({
  args: {
    limit: v.number(),
    cursor: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("logs").withIndex("by_timestamp").order("desc");

    if (args.cursor) {
      query = query.filter((q) => q.lt(q.field("timestamp"), args.cursor));
    }
    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate));
    }
    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate));
    }

    const items = await query.take(args.limit + 1);
    const hasMore = items.length > args.limit;
    const results = hasMore ? items.slice(0, args.limit) : items;
    const nextCursor = hasMore ? results[results.length - 1]?.timestamp : undefined;

    return { results, nextCursor, hasMore };
  },
});
```

## Common Patterns

### Reversed Page Order (Chat)
```typescript
const result = await ctx.db
  .query("messages")
  .withIndex("by_created")
  .order("desc")  // Get newest first
  .paginate(args.paginationOpts);

return {
  ...result,
  page: result.page.reverse(),  // Display oldest first
};
```

### Post-Query Enrichment
```typescript
const items = await query.take(limit + 1);
const hasMore = items.length > limit;
const results = hasMore ? items.slice(0, limit) : items;

// Enrich AFTER slicing to avoid wasting work
const enriched = await Promise.all(
  results.map(async (item) => {
    const user = await ctx.db.get(item.userId);
    return { ...item, username: user?.username };
  })
);
```

### Field Mapping
```typescript
const result = await paginator(ctx.db, schema)
  .query("transactions")
  .paginate(args.paginationOpts);

return {
  ...result,
  page: result.page.map((tx) => ({
    id: tx._id,
    amount: tx.amount,
    // Only return fields needed by client
  })),
};
```

## Limits

| Pattern | Recommended Page Size |
|---------|----------------------|
| Small items (messages) | 50-100 |
| Medium items (transactions) | 20-50 |
| Large items (with enrichment) | 10-20 |
| Admin/reporting | 25-50 |

## Gotchas

❌ **Don't** filter after `.paginate()` - you'll get partial pages
```typescript
const result = await query.paginate(opts);
return result.page.filter(x => x.active); // ❌ Wrong!
```

✅ **Do** filter before `.paginate()`
```typescript
const result = await query
  .filter((q) => q.eq(q.field("active"), true))
  .paginate(opts);
```

❌ **Don't** use `paginator` with `.filter()`
```typescript
await paginator(ctx.db, schema)
  .query("logs")
  .filter((q) => q.gt(q.field("score"), 100))  // ❌ Not supported!
  .paginate(opts);
```

✅ **Do** filter the page in TypeScript
```typescript
const result = await paginator(ctx.db, schema)
  .query("logs")
  .paginate(opts);

return {
  ...result,
  page: result.page.filter(x => x.score > 100),  // ✅ Works
};
```

## Examples in Codebase

- Built-in: `convex/social/globalChat.ts:121`
- Paginator: `convex/economy/tokenMarketplace.ts:1068`
- Manual: `convex/admin/admin.ts:562`

## Full Documentation

See [PAGINATION_GUIDE.md](./PAGINATION_GUIDE.md) for complete details.
