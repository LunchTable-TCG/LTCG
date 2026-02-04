# Row-Level Security (RLS) Implementation

> Automatic database-layer access control for sensitive tables

## Quick Start

```typescript
// Import RLS-enabled builders
import { rlsQuery, rlsMutation } from "../lib/customFunctions";

// Use instead of authedQuery/authedMutation
export const getMyApiKeys = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // RLS automatically filters to user's data
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
  },
});
```

## What is RLS?

Row-Level Security (RLS) enforces access control at the database layer. Instead of manually checking permissions in every function, RLS rules are defined once and applied automatically to all database operations.

**Benefits:**
- **Security**: Impossible to forget permission checks
- **Consistency**: Same rules apply everywhere
- **Simplicity**: Less boilerplate code
- **Composability**: Works with triggers, pagination, filters

**How it works:**
1. Define access rules for each table (`lib/rowLevelSecurity.ts`)
2. Use `rlsQuery`/`rlsMutation` instead of `authedQuery`/`authedMutation`
3. RLS automatically filters/validates all database operations
4. No manual permission checks needed

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Request: "Get my API keys"                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ rlsQuery (customFunctions.ts)                               │
│ - Authenticates user via Privy                              │
│ - Extracts userId from auth context                         │
│ - Creates RLS rules for this user                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ RLS Rules (rowLevelSecurity.ts)                             │
│ - Check if user is admin/superadmin                         │
│ - Define read/modify/insert permissions                     │
│ - Return rule functions                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Database Wrapper (convex-helpers)                           │
│ - Wraps ctx.db with wrapDatabaseReader                      │
│ - Intercepts all db.query() calls                           │
│ - Applies RLS rules to filter results                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Query Execution                                              │
│ - Query runs: ctx.db.query("apiKeys").collect()             │
│ - RLS filters: Only keys where userId === authUserId        │
│ - Returns: [key1, key2, key3] (only user's keys)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Trigger Execution (if mutation)                             │
│ - Triggers see the original operation                       │
│ - Audit logs created with correct data                      │
│ - RLS is transparent to triggers                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Response to Client                                           │
│ - Filtered/validated data returned                          │
│ - User only sees authorized data                            │
└─────────────────────────────────────────────────────────────┘
```

## Files Overview

### Core Implementation

| File | Purpose |
|------|---------|
| `lib/rowLevelSecurity.ts` | RLS rule definitions for all tables |
| `lib/customFunctions.ts` | `rlsQuery` and `rlsMutation` builders |

### Documentation & Examples

| File | Purpose |
|------|---------|
| `lib/RLS_README.md` | This file - overview and architecture |
| `RLS_MIGRATION_GUIDE.md` | Step-by-step guide for adding RLS to new tables |
| `examples/rlsExamples.ts` | Working code examples for common patterns |
| `__tests__/rls.test.ts` | Test patterns and examples |

## Currently Protected Tables

RLS is currently enabled for these tables:

| Table | Read Access | Modify Access |
|-------|-------------|---------------|
| `adminRoles` | Own role only (admins see all) | Superadmins only |
| `apiKeys` | Own keys only (admins see all) | Own keys only (superadmins see all) |
| `playerCards` | Own cards only (admins see all) | Own cards only (superadmins see all) |
| `deckCards` | Own deck's cards (admins see all) | Own deck's cards (superadmins see all) |
| `userDecks` | Own decks only (admins see all) | Own decks only (superadmins see all) |

## Adding RLS to New Tables

See `RLS_MIGRATION_GUIDE.md` for detailed instructions.

**Quick steps:**

1. **Define rules** in `lib/rowLevelSecurity.ts`:
   ```typescript
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
   ```

2. **Use RLS builders** in your functions:
   ```typescript
   import { rlsQuery, rlsMutation } from "../lib/customFunctions";

   export const getMyData = rlsQuery({ /* ... */ });
   export const updateMyData = rlsMutation({ /* ... */ });
   ```

3. **Test thoroughly** (see testing section below)

## When to Use RLS

### ✅ Good Use Cases

- **User-owned data**: `playerCards`, `userDecks`, `apiKeys`
- **Sensitive information**: `tokenTransactions`, `walletConnections`
- **Privacy-critical**: User settings, preferences, personal data
- **Compliance**: Data that must have DB-layer access control

### ❌ Don't Use RLS For

- **Public data**: `cardDefinitions`, `gameTemplates`
- **Admin-only tables**: Use `adminQuery`/`adminMutation` instead
- **Complex permissions**: Cross-user logic, custom relationships
- **Performance-critical**: Hot paths where overhead matters

## Testing RLS

### Manual Testing

1. Create test users in different roles (user, admin, superadmin)
2. Test each endpoint with each role
3. Verify users only see/modify their own data
4. Verify admins have appropriate access
5. Verify superadmins can access everything

### Automated Testing

See `__tests__/rls.test.ts` for test patterns.

**Test checklist:**
- [ ] User can read their own data
- [ ] User cannot read other users' data
- [ ] User can modify their own data
- [ ] User cannot modify other users' data
- [ ] Admins have correct access level
- [ ] Superadmins have full access
- [ ] Triggers still work correctly
- [ ] Errors don't leak information

## Troubleshooting

### Query returns empty array

**Problem:** Query that should return data returns `[]`.

**Solutions:**
1. Verify RLS rule returns `true` for user's data
2. Check authenticated user ID is correct
3. Test with superadmin to confirm data exists
4. Check for typos in `userId` field name

### Mutation throws permission error

**Problem:** Insert/update throws "Unauthorized" or similar.

**Solutions:**
1. Ensure document's `userId` matches `ctx.auth.userId`
2. Check RLS `insert`/`modify` rule logic
3. Verify user has required admin role
4. Check for expired admin roles

### Slow performance

**Problem:** Queries are noticeably slower with RLS.

**Solutions:**
1. Verify admin checks are cached (already done)
2. Add database indexes for foreign key lookups
3. Simplify complex RLS rules
4. Consider manual checks for hot paths

### Admin bypass not working

**Problem:** Admin still can't access data.

**Solutions:**
1. Verify admin role is `isActive: true`
2. Check `expiresAt` is null or in future
3. Ensure RLS rules check `userIsAdmin`
4. Verify admin role is "admin" or "superadmin" (not "moderator")

## Permission Levels

RLS enforces three permission levels:

### Regular User
- Can read their own data
- Can modify their own data
- Cannot access other users' data

### Admin
- Can read all data (for support)
- **Cannot** modify other users' data (prevents abuse)
- Explicit admin-only operations use `adminMutation`

### Superadmin
- Can read all data
- Can modify all data
- Full bypass of all restrictions

**Note:** Regular "admin" role is intentionally restricted for most tables. Only superadmins can modify user data directly.

## Security Best Practices

1. **Never trust client input**: RLS validates server-side
2. **Test all roles**: User, admin, superadmin
3. **Audit admin actions**: Use triggers for audit logs
4. **Expire admin roles**: Set `expiresAt` for temporary access
5. **Review RLS rules**: Periodically audit rule logic
6. **Don't leak info**: Error messages shouldn't reveal forbidden data

## Integration with Existing Systems

### ✅ Compatible With

- **Triggers** (`infrastructure/triggers.ts`): RLS is transparent to triggers
- **Custom Auth** (`lib/convexAuth.ts`): Uses existing auth context
- **Admin Functions** (`lib/customFunctions.ts`): Works alongside adminQuery/adminMutation
- **Pagination**: RLS filters work with Convex pagination
- **Relationships**: RLS can check foreign keys (e.g., deckCards → userDecks)

### ⚠️ Considerations

- **HTTP Endpoints**: RLS requires authenticated context (use internal queries for HTTP)
- **Internal Mutations**: Consider using raw mutations for system operations
- **Cron Jobs**: Use internal functions, not RLS functions
- **Migrations**: Use raw DB access, not RLS-wrapped

## Performance

RLS adds minimal overhead:

- **Read operations**: ~1-5% slowdown (negligible)
- **Write operations**: ~5-10% slowdown (RLS rule execution)
- **Admin checks**: Cached per context (no redundant queries)
- **Foreign key lookups**: May add additional queries (use indexes)

For 99% of use cases, the security benefits far outweigh the minimal performance cost.

## Examples

See `examples/rlsExamples.ts` for complete working examples:

- User-owned data (API keys, player cards)
- Relationship-based access (deck cards)
- Admin bypass patterns
- Complex filtering
- Error handling

## Next Steps

1. **Review examples**: Read `examples/rlsExamples.ts`
2. **Identify tables**: Which tables need RLS?
3. **Define rules**: Add to `lib/rowLevelSecurity.ts`
4. **Migrate endpoints**: Replace authedQuery/authedMutation
5. **Test thoroughly**: Use testing checklist
6. **Monitor**: Watch for unexpected errors or performance issues

## Additional Resources

- **Convex Helpers Docs**: [Row-Level Security](https://github.com/get-convex/convex-helpers)
- **Migration Guide**: `RLS_MIGRATION_GUIDE.md`
- **Test Patterns**: `__tests__/rls.test.ts`
- **Live Examples**: `examples/rlsExamples.ts`

---

**Questions?** Check the migration guide or test examples for detailed patterns.
