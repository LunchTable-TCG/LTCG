# CRUD Utilities Guide

Comprehensive guide for using auto-generated CRUD operations with convex-helpers.

## Overview

This project uses [convex-helpers](https://github.com/get-convex/convex-helpers) `crud` function to automatically generate Create, Read, Update, Delete (CRUD) operations for simple admin/config tables. This reduces boilerplate and ensures consistent patterns across admin tools.

## What is Auto-Generated CRUD?

The `crud` function from convex-helpers generates 5 standard database operations:

```typescript
{
  create,    // Insert new document
  read,      // Get document by ID
  update,    // Patch existing document
  destroy,   // Delete document
  paginate   // List documents with pagination
}
```

## When to Use CRUD Generation

### ✅ Good Candidates

Use CRUD generation for tables that:

- **Have simple data models** without complex relationships
- **Don't require business logic** in create/update/delete operations
- **Are primarily admin-managed** (news articles, config, feature flags)
- **Have straightforward validation** (handled by schema)

### ❌ Not Suitable

DO NOT use CRUD generation for tables that:

- **Require complex business logic** (game state, user stats, economy)
- **Need custom validation** beyond schema (deck validation, card ownership)
- **Have complex state transitions** (tournaments, matchmaking)
- **Involve financial operations** (treasury, wallets, payments)
- **Trigger side effects** (achievements, notifications, rewards)

## Selected Tables for CRUD

Based on schema analysis, these tables use CRUD generation:

### 1. newsArticles

**Why it's suitable:**
- Simple content management
- No complex business logic
- Admin-only writes, public reads

**Access Control:**
- Read: Public
- Write: Admin only

**Usage:**
```typescript
import { newsArticlesCRUD } from "@/convex/admin/crudGenerated";

// Create article
const articleId = await ctx.runMutation(newsArticlesCRUD.create, {
  title: "Season 2 Announced!",
  slug: "season-2-announced",
  excerpt: "Get ready for exciting new cards and features",
  content: "Full article content here...",
  category: "announcement",
  authorId: adminUser.userId,
  isPublished: false,
  isPinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Read article
const article = await ctx.runQuery(newsArticlesCRUD.read, {
  id: articleId
});

// Update article
await ctx.runMutation(newsArticlesCRUD.update, {
  id: articleId,
  patch: {
    isPublished: true,
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  }
});

// Delete article
await ctx.runMutation(newsArticlesCRUD.destroy, {
  id: articleId
});

// List articles with pagination
const result = await ctx.runQuery(newsArticlesCRUD.paginate, {
  numItems: 10,
  cursor: null, // or cursor from previous page
});
// result = { page: Doc[], cursor: string | null, hasMore: boolean }
```

### 2. systemConfig

**Why it's suitable:**
- Simple key-value store
- No complex validation beyond schema
- Admin-only access

**Access Control:**
- Read: Admin only
- Write: Admin only

**Usage:**
```typescript
import { systemConfigCRUD } from "@/convex/admin/crudGenerated";

// Create config value
const configId = await ctx.runMutation(systemConfigCRUD.create, {
  key: "economy.daily_reward_gold",
  value: 100,
  category: "economy",
  displayName: "Daily Reward Gold",
  description: "Amount of gold given for daily login",
  valueType: "number",
  minValue: 0,
  maxValue: 1000,
  updatedAt: Date.now(),
  updatedBy: adminUser.userId,
});

// Read config
const config = await ctx.runQuery(systemConfigCRUD.read, {
  id: configId
});

// Update config value
await ctx.runMutation(systemConfigCRUD.update, {
  id: configId,
  patch: {
    value: 150,
    updatedAt: Date.now(),
    updatedBy: adminUser.userId,
  }
});

// List all config values
const allConfigs = await ctx.runQuery(systemConfigCRUD.paginate, {
  numItems: 100,
  cursor: null,
});
```

### 3. featureFlags

**Why it's suitable:**
- Simple toggle/update operations
- No complex rollout logic in CRUD layer
- Public reads for feature checks

**Access Control:**
- Read: Public
- Write: Admin only

**Usage:**
```typescript
import { featureFlagsCRUD } from "@/convex/admin/crudGenerated";

// Create feature flag
const flagId = await ctx.runMutation(featureFlagsCRUD.create, {
  name: "marketplace_enabled",
  displayName: "Card Marketplace",
  description: "Enable the card trading marketplace",
  enabled: false,
  rolloutPercentage: 0,
  category: "economy",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  updatedBy: adminUser.userId,
});

// Enable feature flag
await ctx.runMutation(featureFlagsCRUD.update, {
  id: flagId,
  patch: {
    enabled: true,
    rolloutPercentage: 100,
    updatedAt: Date.now(),
  }
});

// Check feature flag (public read)
const flag = await ctx.runQuery(featureFlagsCRUD.read, {
  id: flagId
});
```

## Access Control Patterns

CRUD operations use custom query/mutation builders with built-in auth:

### Available Builders

Located in `convex/lib/crudBuilders.ts`:

```typescript
// Query Builders
publicQuery          // No auth required
authQuery            // Requires authentication
moderatorQuery       // Requires moderator role or higher
adminQuery           // Requires admin role or higher
superadminQuery      // Requires superadmin role

// Mutation Builders (include trigger support)
authMutation         // Requires authentication
moderatorMutation    // Requires moderator role or higher
adminMutation        // Requires admin role or higher
superadminMutation   // Requires superadmin role
```

### Creating Custom CRUD

```typescript
import { crud } from "convex-helpers/server/crud";
import schema from "../schema";
import { publicQuery, adminMutation } from "../lib/crudBuilders";

// Example: Public reads, admin writes
export const myCRUD = crud(
  schema,
  "myTable",
  publicQuery,     // Read access
  adminMutation    // Write access
);

// Example: Admin-only for everything
export const sensitiveDataCRUD = crud(
  schema,
  "sensitiveData",
  adminQuery,      // Read access
  adminMutation    // Write access
);
```

## Integration with Admin Dashboards

### React/Next.js Example

```typescript
// app/admin/news/page.tsx
"use client";

import { useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { api } from "@convex/_generated/api";

export default function NewsAdmin() {
  // List articles
  const articles = useConvexQuery(
    api.admin.crudGenerated.newsArticlesCRUD.paginate,
    { numItems: 20, cursor: null }
  );

  // Create mutation
  const createArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.create
  );

  // Update mutation
  const updateArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.update
  );

  // Delete mutation
  const deleteArticle = useConvexMutation(
    api.admin.crudGenerated.newsArticlesCRUD.destroy
  );

  const handleCreate = async () => {
    await createArticle({
      title: "New Article",
      slug: "new-article",
      excerpt: "Summary",
      content: "Full content",
      category: "update",
      authorId: currentUser.userId,
      isPublished: false,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div>
      {articles?.page.map(article => (
        <div key={article._id}>
          <h3>{article.title}</h3>
          <button onClick={() => updateArticle({
            id: article._id,
            patch: { isPublished: !article.isPublished }
          })}>
            Toggle Published
          </button>
          <button onClick={() => deleteArticle({ id: article._id })}>
            Delete
          </button>
        </div>
      ))}
      <button onClick={handleCreate}>Create Article</button>
    </div>
  );
}
```

## CRUD Methods Reference

### create()

Creates a new document.

```typescript
const id = await ctx.runMutation(crud.create, {
  // All required fields from schema
  field1: value1,
  field2: value2,
  // ...
});
// Returns: Id<"tableName">
```

### read()

Reads a single document by ID.

```typescript
const doc = await ctx.runQuery(crud.read, {
  id: documentId
});
// Returns: Doc<"tableName"> | null
```

### update()

Patches an existing document.

```typescript
await ctx.runMutation(crud.update, {
  id: documentId,
  patch: {
    field1: newValue1,
    field2: newValue2,
    // Only include fields to update
  }
});
// Returns: void
```

### destroy()

Deletes a document.

```typescript
await ctx.runMutation(crud.destroy, {
  id: documentId
});
// Returns: void
```

### paginate()

Lists documents with cursor-based pagination.

```typescript
const result = await ctx.runQuery(crud.paginate, {
  numItems: 10,          // Number of items per page
  cursor: null,          // null for first page, or cursor from previous result
});
// Returns: {
//   page: Doc<"tableName">[],
//   cursor: string | null,  // Pass to next call for next page
//   hasMore: boolean        // True if more pages available
// }

// Next page:
const nextPage = await ctx.runQuery(crud.paginate, {
  numItems: 10,
  cursor: result.cursor,
});
```

## Common Patterns

### Filtered Pagination

CRUD `paginate` doesn't support filtering. For filtered lists, write custom queries:

```typescript
// convex/admin/newsArticles.ts
import { query } from "../_generated/server";
import { adminQuery } from "../lib/crudBuilders";

export const listByCategory = adminQuery({
  args: { category: v.string() },
  handler: async (ctx, { category }) => {
    return await ctx.db
      .query("newsArticles")
      .withIndex("by_category", q => q.eq("category", category))
      .collect();
  }
});
```

### Validation in CRUD

CRUD uses schema validation only. For custom validation:

```typescript
// Option 1: Write custom mutation instead of using CRUD
export const createArticleWithValidation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Custom validation
    if (args.slug.includes(" ")) {
      throw new Error("Slug cannot contain spaces");
    }

    // Then insert
    return await ctx.db.insert("newsArticles", args);
  }
});

// Option 2: Use schema validators (preferred)
// In schema.ts, use v.string() with custom validators
```

### Soft Deletes

CRUD `destroy` permanently deletes. For soft deletes:

```typescript
// Don't use crud.destroy
// Instead, write custom mutation:
export const softDeleteArticle = mutation({
  args: { id: v.id("newsArticles") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, {
      deletedAt: Date.now(),
      isPublished: false,
    });
  }
});
```

## Adding New CRUD Tables

### Checklist

Before adding CRUD for a new table:

1. **Analyze complexity**
   - [ ] Table has simple data model
   - [ ] No complex business logic required
   - [ ] No side effects on create/update/delete
   - [ ] Validation handled by schema

2. **Determine access control**
   - [ ] Who can read? (public/auth/admin/superadmin)
   - [ ] Who can write? (auth/admin/superadmin)
   - [ ] Does read permission differ from write?

3. **Add CRUD export**
   ```typescript
   export const myTableCRUD = crud(
     schema,
     "myTable",
     [chooseQueryBuilder],
     [chooseMutationBuilder]
   );
   ```

4. **Document**
   - [ ] Add to `crudGenerated.ts` with comments
   - [ ] Update this guide with usage examples
   - [ ] Document access control rationale

5. **Test**
   - [ ] Test create operation
   - [ ] Test read operation
   - [ ] Test update operation
   - [ ] Test delete operation
   - [ ] Test pagination
   - [ ] Verify auth works correctly

## Tables NOT Using CRUD (Custom Logic Required)

These tables require custom mutations/queries:

- **users** - Complex auth, stats, economy, moderation
- **games** - Game lifecycle, state management
- **userDecks** - Deck validation, card ownership
- **treasury/wallets** - Financial operations, blockchain
- **tournaments** - State machines, bracket generation
- **quests/achievements** - Progress tracking, rewards
- **shop items** - Inventory, purchase validation
- **leaderboards** - Ranking calculations, decay

For these tables, write dedicated mutations in their respective directories.

## Troubleshooting

### "Insufficient permissions" error

Check that:
1. User is authenticated (for auth* builders)
2. User has correct role (for role-based builders)
3. Token hasn't expired
4. AdminRole in DB is active and not expired

### Type errors with CRUD operations

```typescript
// Make sure to import from correct path
import { newsArticlesCRUD } from "@/convex/admin/crudGenerated";

// Not from convex-helpers directly
// import { crud } from "convex-helpers/server/crud"; // ❌
```

### Pagination cursor issues

- First page: Use `cursor: null`
- Next pages: Use `cursor` from previous result
- Cursor is opaque string - don't modify it
- If `hasMore: false`, you're on the last page

### CRUD not in convex API

```typescript
// Ensure file is in convex/ directory
// Not in convex/_generated/
// Not in src/ or app/
```

## Best Practices

1. **Use CRUD sparingly** - Only for truly simple tables
2. **Document access control** - Explain why read/write permissions chosen
3. **Keep business logic separate** - Write custom functions for complex operations
4. **Validate in schema** - Use Convex validators, not CRUD-layer validation
5. **Prefer custom queries for filtering** - Don't hack around paginate limitations
6. **Test auth thoroughly** - Verify role checks work as expected
7. **Monitor trigger integration** - CRUD mutations include database triggers

## Related Files

- `convex/lib/crudBuilders.ts` - Custom query/mutation builders with auth
- `convex/admin/crudGenerated.ts` - Generated CRUD operations
- `convex/schema.ts` - Table definitions and validators
- `convex/lib/roles.ts` - Role-based access control
- `convex/infrastructure/triggers.ts` - Database triggers

## Further Reading

- [convex-helpers CRUD documentation](https://github.com/get-convex/convex-helpers)
- [Convex Custom Functions](https://docs.convex.dev/functions/custom-functions)
- [Convex Validators](https://docs.convex.dev/database/schemas)
