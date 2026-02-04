# Auto-Generated CRUD Utilities

## Overview

This directory contains auto-generated CRUD (Create, Read, Update, Delete) operations for simple admin/config tables using [convex-helpers](https://github.com/get-convex/convex-helpers).

## Files

- **`crudGenerated.ts`** - Generated CRUD operations for newsArticles, systemConfig, and featureFlags
- **`crudBuilders.ts`** - Custom query/mutation builders with role-based auth
- **`CRUD_GUIDE.md`** - Comprehensive guide with detailed examples and patterns
- **`CRUD_EXAMPLES.ts`** - Working code examples showing usage patterns
- **`CRUD_README.md`** - This file

## Quick Start

### Using CRUD in React Components

```typescript
import { useConvexQuery, useConvexMutation } from "@/lib/convexHelpers";
import { api } from "@convex/_generated/api";

function NewsAdmin() {
  // List articles with pagination
  const { page, cursor, hasMore } = useConvexQuery(
    api.admin.crudGenerated.newsArticlesCRUD.paginate,
    { numItems: 10, cursor: null }
  ) ?? { page: [], cursor: null, hasMore: false };

  // Create article mutation
  const createArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.create
  );

  // Update article mutation
  const updateArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.update
  );

  // Delete article mutation
  const deleteArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.destroy
  );

  const handleCreate = async () => {
    await createArticle({
      title: "New Article",
      slug: "new-article",
      excerpt: "Brief summary",
      content: "Full content",
      category: "update",
      authorId: currentUser.userId,
      isPublished: false,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const handleUpdate = async (id: Id<"newsArticles">) => {
    await updateArticle({
      id,
      patch: { isPublished: true, publishedAt: Date.now() },
    });
  };

  const handleDelete = async (id: Id<"newsArticles">) => {
    await deleteArticle({ id });
  };

  return (
    <div>
      {page.map((article) => (
        <ArticleCard
          key={article._id}
          article={article}
          onUpdate={() => handleUpdate(article._id)}
          onDelete={() => handleDelete(article._id)}
        />
      ))}
      <button onClick={handleCreate}>Create Article</button>
    </div>
  );
}
```

## Available CRUD Operations

### newsArticles

**Access:** Public read, Admin write

**Operations:**
- `create` - Create new article (admin only)
- `read` - Get article by ID (public)
- `update` - Update article fields (admin only)
- `destroy` - Delete article (admin only)
- `paginate` - List articles with cursor pagination (public)

### systemConfig

**Access:** Admin only (read and write)

**Operations:**
- `create` - Create config value (admin only)
- `read` - Get config by ID (admin only)
- `update` - Update config value (admin only)
- `destroy` - Delete config (admin only)
- `paginate` - List configs (admin only)

### featureFlags

**Access:** Public read, Admin write

**Operations:**
- `create` - Create feature flag (admin only)
- `read` - Get flag by ID (public)
- `update` - Update flag settings (admin only)
- `destroy` - Delete flag (admin only)
- `paginate` - List all flags (public)

## Generated Methods

Each CRUD object provides these methods:

### create
```typescript
const id = await crud.create(ctx, {
  field1: value1,
  field2: value2,
  // ... all required fields
});
// Returns: Id<"tableName">
```

### read
```typescript
const doc = await crud.read(ctx, { id });
// Returns: Doc<"tableName"> | null
```

### update
```typescript
await crud.update(ctx, {
  id,
  patch: {
    field1: newValue,
    // Only fields to update
  },
});
```

### destroy
```typescript
await crud.destroy(ctx, { id });
```

### paginate
```typescript
const { page, cursor, hasMore } = await crud.paginate(ctx, {
  numItems: 10,
  cursor: null, // or previous cursor
});
```

## When to Use CRUD vs Custom Queries/Mutations

### ✅ Use CRUD for:
- Simple create/read/update/delete operations
- Getting documents by ID
- Listing entire tables with pagination
- No complex business logic needed

### ❌ Write Custom Queries for:
- Filtering by fields (category, status, etc)
- Finding by non-ID fields (slug, name, key)
- Complex filtering logic
- Aggregations or computed fields
- Joins across multiple tables

**Example:**
```typescript
// Custom query for filtering
export const listNewsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_category", (q) => q.eq("category", category))
      .collect();
  },
});
```

### ❌ Write Custom Mutations for:
- Validation beyond schema
- Side effects (notifications, analytics)
- Complex state transitions
- Multi-table updates
- Conditional logic

**Example:**
```typescript
// Custom mutation with validation
export const publishArticle = mutation({
  args: { id: v.id("newsArticles") },
  handler: async (ctx, { id }) => {
    const article = await ctx.db.get(id);
    if (!article.title || !article.content) {
      throw new Error("Missing required fields");
    }
    await ctx.db.patch(id, {
      isPublished: true,
      publishedAt: Date.now(),
    });
    // Send notification, update analytics, etc
  },
});
```

## Access Control

CRUD operations use custom builders with built-in role-based auth:

- **`publicQuery`** - No auth required
- **`authQuery`** - Requires authentication
- **`adminQuery`** - Requires admin role or higher
- **`adminMutation`** - Requires admin role for writes

Auth is enforced automatically - you don't need to check permissions manually.

## Tables NOT Using CRUD

These tables require custom logic and should NOT use CRUD:

- ❌ `users` - Complex auth, stats, economy, moderation
- ❌ `games` - Game lifecycle, state management
- ❌ `userDecks` - Deck validation, card ownership
- ❌ `treasury/wallets` - Financial operations, blockchain
- ❌ `tournaments` - State machines, bracket generation
- ❌ `quests/achievements` - Progress tracking, rewards
- ❌ `shopItems` - Inventory, purchase validation
- ❌ `leaderboards` - Ranking calculations, decay

## Adding New CRUD Tables

Before adding CRUD for a table, verify:

1. ✅ Table has simple data model
2. ✅ No complex business logic required
3. ✅ No side effects on create/update/delete
4. ✅ Validation handled by schema
5. ✅ Primarily admin-managed
6. ✅ No complex relationships

Then:

1. Add CRUD export to `crudGenerated.ts`:
   ```typescript
   export const myTableCRUD = crud(
     schema,
     "myTable",
     publicQuery,    // or adminQuery for private
     adminMutation
   );
   ```

2. Document access control and usage
3. Add examples to `CRUD_EXAMPLES.ts`
4. Update this README

## Architecture Notes

### Why No Triggers?

CRUD mutations do NOT include database triggers (audit logs, etc) because:
1. Triggers wrap the `db` object causing type incompatibility with `crud()`
2. Simple admin tables don't need complex trigger logic
3. Audit logs should be in dedicated functions for critical operations

### Auth Implementation

Auth is verified BEFORE CRUD operations run:
1. Custom builders call `verifyAuth()` or `verifyRole()`
2. Verification throws error if insufficient permissions
3. CRUD operation proceeds only if auth succeeds
4. Type-safe and automatic - no manual checks needed

## Further Reading

- [`CRUD_GUIDE.md`](./CRUD_GUIDE.md) - Detailed guide with all patterns
- [`CRUD_EXAMPLES.ts`](./CRUD_EXAMPLES.ts) - Working code examples
- [`crudBuilders.ts`](../lib/crudBuilders.ts) - Auth builder implementation
- [convex-helpers docs](https://github.com/get-convex/convex-helpers)

## Support

For questions or issues:
1. Check `CRUD_GUIDE.md` for detailed patterns
2. Review `CRUD_EXAMPLES.ts` for working code
3. Consult convex-helpers documentation
4. Ask in team chat
