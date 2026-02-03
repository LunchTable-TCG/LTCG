# Custom Auth - Quick Reference Card

## Import

```typescript
// For authenticated endpoints
import { authedQuery, authedMutation, authedAction } from "../lib/customFunctions";

// For admin-only endpoints
import { adminQuery, adminMutation, adminAction } from "../lib/customFunctions";
```

## Basic Usage

### Query (Authenticated User)
```typescript
export const myQuery = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { userId, user } = ctx.auth;
    // userId and user are automatically available!
  }
});
```

### Mutation (Authenticated User)
```typescript
export const myMutation = authedMutation({
  args: { bio: v.string() },
  handler: async (ctx, args) => {
    const { userId } = ctx.auth;
    await ctx.db.patch(userId, { bio: args.bio });
  }
});
```

### Action (Authenticated User)
```typescript
export const myAction = authedAction({
  args: {},
  handler: async (ctx) => {
    const { user } = ctx.auth;
    // Can access external APIs, run queries, etc.
  }
});
```

### Admin Mutation
```typescript
export const adminOnly = adminMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId, adminRole } = ctx.auth;
    // userId is the admin user
    // adminRole contains admin permissions
  }
});
```

## Available Context

### `ctx.auth` (Regular Auth)
```typescript
{
  userId: Id<"users">,     // User ID
  user: Doc<"users">,      // Full user document
  privyId: string,         // Privy DID (did:privy:xxx)
  username: string         // Username
}
```

### `ctx.auth` (Admin Auth)
```typescript
{
  // All of the above, plus:
  adminRole: Doc<"adminRoles">  // Admin role document
}
```

## Migration Cheat Sheet

| Old | New |
|-----|-----|
| `mutation({...})` | `authedMutation({...})` |
| `query({...})` | `authedQuery({...})` |
| `action({...})` | `authedAction({...})` |
| `const { userId } = await requireAuthMutation(ctx)` | `const { userId } = ctx.auth` |
| `const { userId } = await requireAuthQuery(ctx)` | `const { userId } = ctx.auth` |
| `const user = await ctx.db.get(userId)` | `const { user } = ctx.auth` |

## When to Use Which

| Endpoint Type | Function |
|--------------|----------|
| User viewing own data | `authedQuery` |
| User modifying own data | `authedMutation` |
| User external API call | `authedAction` |
| Admin viewing data | `adminQuery` |
| Admin modifying data | `adminMutation` |
| Admin external API call | `adminAction` |
| Public data (no auth) | `query` |
| Internal/scheduled | `internalMutation` |

## Common Patterns

### Access User Info
```typescript
const { username, user } = ctx.auth;
const email = user.email;
```

### Use in DB Query
```typescript
const { userId } = ctx.auth;
const decks = await ctx.db
  .query("decks")
  .withIndex("by_owner", q => q.eq("ownerId", userId))
  .collect();
```

### Check Admin Role
```typescript
// Use adminMutation instead of manual check
const { adminRole } = ctx.auth;
const permissions = adminRole.role; // "admin" | "moderator" | "superadmin"
```

## Error Handling

Errors are thrown automatically before your handler runs:
- `ErrorCode.AUTH_REQUIRED` - User not authenticated
- `ErrorCode.AUTHZ_ADMIN_REQUIRED` - User not an admin (admin endpoints only)

No need to check `if (!userId)` - it's guaranteed to exist.

## Full Documentation

- Complete guide: `convex/lib/MIGRATION_GUIDE_CUSTOM_AUTH.md`
- Overview: `convex/lib/README_CUSTOM_AUTH.md`
- Implementation: `convex/lib/customFunctions.ts`

## Examples

See these files for working examples:
- `convex/social/friends.ts` - authedMutation
- `convex/admin/roles.ts` - adminMutation
- `convex/core/decks.ts` - authedQuery
