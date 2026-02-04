# Row-Level Security (RLS) - Quick Start Guide

Get started with RLS in 5 minutes.

## What You Get

Automatic database-layer access control that:
- ✅ Prevents users from accessing other users' data
- ✅ Enforces permissions without manual checks
- ✅ Works seamlessly with existing triggers and auth
- ✅ Adds minimal performance overhead

## 1. Import the Builders

```typescript
// Replace this:
import { authedQuery, authedMutation } from "../lib/customFunctions";

// With this:
import { rlsQuery, rlsMutation } from "../lib/customFunctions";
```

## 2. Use in Your Functions

### Before (Manual Checks)

```typescript
export const getMyApiKeys = authedQuery({
  args: {},
  handler: async (ctx) => {
    // Query user's data
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
    return keys;
  },
});

export const revokeApiKey = authedMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    // Manual ownership check
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("Not found");
    if (key.userId !== ctx.auth.userId) {
      throw new Error("Unauthorized"); // Easy to forget!
    }

    await ctx.db.patch(args.keyId, { isActive: false });
  },
});
```

### After (Automatic RLS)

```typescript
export const getMyApiKeys = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // RLS automatically filters to user's keys
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
    return keys;
  },
});

export const revokeApiKey = rlsMutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("Not found");

    // No manual check needed - RLS enforces ownership!
    await ctx.db.patch(args.keyId, { isActive: false });
  },
});
```

## 3. Already Protected Tables

These tables already have RLS rules defined:

| Table | Rules Defined | Ready to Use |
|-------|---------------|--------------|
| `adminRoles` | ✅ | Yes |
| `apiKeys` | ✅ | Yes |
| `playerCards` | ✅ | Yes |
| `deckCards` | ✅ | Yes |
| `userDecks` | ✅ | Yes |

Just replace `authedQuery`/`authedMutation` with `rlsQuery`/`rlsMutation`.

## 4. Test It Works

### Test Read Filtering

```typescript
// As User A
const keys = await client.query(api.yourModule.getMyApiKeys);
// Returns only User A's keys

// As User B
const keys = await client.query(api.yourModule.getMyApiKeys);
// Returns only User B's keys (different data!)
```

### Test Write Protection

```typescript
// User A tries to revoke User B's key
await client.mutation(api.yourModule.revokeApiKey, {
  keyId: userBKeyId // User B's key
});
// ❌ Throws error: Permission denied
```

### Test Admin Bypass

```typescript
// As admin
const keys = await client.query(api.yourModule.getMyApiKeys);
// Returns ALL keys (admin can see everything)
```

## 5. Add RLS to New Tables

### Step 1: Define Rules

Add to `convex/lib/rowLevelSecurity.ts`:

```typescript
export async function createRLSRules(
  ctx: QueryCtx | MutationCtx,
  authUserId: Id<"users">
): Promise<Rules<QueryCtx | MutationCtx, DataModel>> {
  const userIsAdmin = await isAdmin(ctx, authUserId);
  const userIsSuperadmin = await isSuperadmin(ctx, authUserId);

  return {
    // ... existing rules ...

    // NEW TABLE
    yourTable: {
      read: async (_, doc) => {
        if (userIsSuperadmin) return true;
        if (userIsAdmin) return true;
        return doc.userId === authUserId;
      },
      modify: async (_, doc) => {
        if (userIsSuperadmin) return true;
        return doc.userId === authUserId;
      },
      insert: async (_, doc) => {
        if (userIsSuperadmin) return true;
        return doc.userId === authUserId;
      },
    },
  };
}
```

### Step 2: Use RLS Builders

```typescript
import { rlsQuery, rlsMutation } from "../lib/customFunctions";

export const getMyData = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // Automatically filtered to user's data
    return await ctx.db
      .query("yourTable")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
  },
});

export const updateMyData = rlsMutation({
  args: { id: v.id("yourTable"), value: v.string() },
  handler: async (ctx, args) => {
    // Automatically validated for ownership
    await ctx.db.patch(args.id, { value: args.value });
  },
});
```

### Step 3: Test Thoroughly

- [ ] User can read their own data
- [ ] User cannot read other users' data
- [ ] User can modify their own data
- [ ] User cannot modify other users' data
- [ ] Admins have correct access
- [ ] Superadmins have full access

## Permission Levels

| Role | Read | Write | Notes |
|------|------|-------|-------|
| **User** | Own data only | Own data only | Default behavior |
| **Admin** | All data | Own data only | For support/moderation |
| **Superadmin** | All data | All data | Full bypass |

**Note:** Regular admins intentionally cannot modify user data (prevents abuse).

## What Tables Need RLS?

### ✅ Good Candidates

- User-owned data: `apiKeys`, `playerCards`, `userDecks`
- Sensitive info: `tokenTransactions`, `walletConnections`
- Privacy data: `userSettings`, `premiumSubscriptions`

### ❌ Don't Use RLS

- Public data: `cardDefinitions`, `gameTemplates`
- Admin-only: Use `adminQuery`/`adminMutation`
- Complex permissions: Manual checks may be clearer

## Common Patterns

### Pattern 1: Simple User Ownership

```typescript
read: async (_, doc) => {
  if (userIsSuperadmin) return true;
  if (userIsAdmin) return true;
  return doc.userId === authUserId;
}
```

### Pattern 2: Relationship-Based Access

```typescript
read: async (ctx, deckCard) => {
  if (userIsSuperadmin) return true;

  const deck = await ctx.db.get(deckCard.deckId);
  if (!deck) return false;

  if (userIsAdmin) return true;
  return deck.userId === authUserId;
}
```

### Pattern 3: Read-Only for Users

```typescript
read: async (_, tx) => {
  if (userIsSuperadmin) return true;
  if (userIsAdmin) return true;
  return tx.userId === authUserId;
},
modify: async (_, tx) => {
  // Only superadmins can modify financial records
  return userIsSuperadmin;
}
```

## Troubleshooting

### Query returns empty array

**Problem:** Expected data but got `[]`.

**Fix:** Check RLS rule returns `true` for the user's data.

```typescript
// Check your rule:
read: async (_, doc) => {
  return doc.userId === authUserId; // Make sure this is true!
}
```

### Mutation throws permission error

**Problem:** "Permission denied" when trying to update.

**Fix:** Ensure document's `userId` matches authenticated user.

```typescript
// Wrong:
await ctx.db.insert("yourTable", {
  userId: someOtherUserId, // ❌ Will throw error
});

// Correct:
await ctx.db.insert("yourTable", {
  userId: ctx.auth.userId, // ✅ Matches authenticated user
});
```

## Next Steps

1. **Try the examples**: See `convex/examples/rlsExamples.ts`
2. **Read the docs**: See `convex/lib/RLS_README.md`
3. **Migration guide**: See `convex/RLS_MIGRATION_GUIDE.md`
4. **Test patterns**: See `convex/__tests__/rls.test.ts`

## Resources

- **Overview**: `lib/RLS_README.md` - Architecture and concepts
- **Migration**: `RLS_MIGRATION_GUIDE.md` - Detailed instructions
- **Examples**: `examples/rlsExamples.ts` - Working code
- **Tests**: `__tests__/rls.test.ts` - Test patterns

---

**Got it?** Start by replacing `authedQuery` with `rlsQuery` for tables with RLS rules defined!
