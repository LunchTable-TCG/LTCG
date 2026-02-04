# Row-Level Security (RLS) Migration Guide

This guide walks you through implementing Row-Level Security for additional tables in the LTCG codebase.

## Table of Contents

1. [Overview](#overview)
2. [When to Use RLS](#when-to-use-rls)
3. [Architecture](#architecture)
4. [Step-by-Step Migration](#step-by-step-migration)
5. [Testing Checklist](#testing-checklist)
6. [Troubleshooting](#troubleshooting)
7. [Examples](#examples)

## Overview

Row-Level Security (RLS) provides automatic, database-layer enforcement of access control. Instead of manually checking permissions in every query/mutation, RLS rules are defined once and applied automatically to all database operations.

**Current Status:**
- ✅ **Implemented**: `adminRoles`, `apiKeys`, `playerCards`, `deckCards`, `userDecks`
- ⏳ **Recommended for RLS**: See [Candidate Tables](#candidate-tables)

**Files Modified:**
- `convex/lib/rowLevelSecurity.ts` - RLS rule definitions
- `convex/lib/customFunctions.ts` - RLS query/mutation builders
- `convex/examples/rlsExamples.ts` - Usage examples

## When to Use RLS

### ✅ USE RLS FOR:

- **User-Owned Data**: Tables where users should only see/modify their own records
  - Examples: `playerCards`, `userDecks`, `apiKeys`, `userSettings`

- **Sensitive Information**: Tables containing private or security-critical data
  - Examples: `tokenTransactions`, `walletConnections`, `premiumSubscriptions`

- **Multi-Tenant Isolation**: Tables that need strict data separation between users
  - Examples: `agents`, `battlePassProgress`, `userRewards`

- **Audit/Compliance**: Tables where access control must be enforced at the DB layer
  - Examples: `moderationActions`, `adminRoles`, `accountDeletions`

### ❌ DON'T USE RLS FOR:

- **Public Data**: Tables that all users can read
  - Examples: `cardDefinitions`, `gameTemplates`, `publicLeaderboards`

- **Admin-Only Tables**: Tables that only admins access (use `adminQuery`/`adminMutation`)
  - Examples: `systemConfig`, `featureFlags`, `serverMetrics`

- **Complex Cross-User Logic**: Tables with relationships requiring custom permission checks
  - Examples: `games` (multiple participants), `chatMessages` (channel-based)

- **Performance-Critical Paths**: Tables in hot paths where overhead matters
  - Examples: Real-time game state updates (use manual checks if needed)

## Architecture

### How RLS Works

```
User Request
    ↓
Convex Function (rlsQuery or rlsMutation)
    ↓
Custom Auth Context (authenticates user, gets userId)
    ↓
RLS Rules (createRLSRules(ctx, userId))
    ↓
Database Wrapper (wrapDatabaseReader/Writer)
    ↓
Database Operation
    ↓
RLS Filtering/Validation
    ↓
Response to User
```

### Integration with Existing Systems

RLS is designed to work seamlessly with existing infrastructure:

1. **Custom Auth Context** (`convex/lib/customFunctions.ts`)
   - `rlsQuery` and `rlsMutation` extend existing `authedQuery` and `authedMutation`
   - All auth logic (Privy, session validation) works identically
   - `ctx.auth` provides the same user information

2. **Triggers** (`convex/infrastructure/triggers.ts`)
   - RLS is transparent to triggers
   - Triggers receive the original database operations
   - Audit logging continues to work without modification

3. **Error Handling** (`convex/lib/errorCodes.ts`)
   - RLS throws standard Convex errors
   - Use existing `createError()` patterns
   - Permission errors are `AUTHZ_INSUFFICIENT_PERMISSIONS`

## Step-by-Step Migration

### 1. Identify Candidate Tables

Review your schema and identify tables that need access control:

```typescript
// Example: playerCards table needs RLS
playerCards: defineTable({
  userId: v.id("users"),          // ✅ Has userId - good RLS candidate
  cardDefinitionId: v.id("cardDefinitions"),
  quantity: v.number(),
  isFavorite: v.boolean(),
  acquiredAt: v.number(),
  lastUpdatedAt: v.number(),
})
```

#### Candidate Tables

Based on the schema, these tables are good candidates for RLS:

**High Priority** (Contains sensitive user data):
- `tokenTransactions` - User's financial transactions
- `walletConnections` - User's wallet addresses
- `premiumSubscriptions` - User's subscription status
- `agents` - User's AI agents
- `battlePassProgress` - User's progress data
- `userRewards` - User's rewards and achievements
- `userSettings` - User's preferences
- `notificationSettings` - User's notification preferences

**Medium Priority** (User-specific but less sensitive):
- `userStats` - User's game statistics
- `userAchievements` - User's achievements
- `storyProgress` - User's story mode progress
- `xpTransactions` - User's XP history
- `gameInvitations` - User's game invites
- `friendRequests` - User's friend requests

**Low Priority** (Complex relationships or edge cases):
- `games` - Multiple participants, needs custom logic
- `gameParticipants` - Related to games
- `chatMessages` - Channel-based permissions, not user-based
- `moderationActions` - Admin-only, use adminQuery instead

### 2. Define RLS Rules

Add rules to `convex/lib/rowLevelSecurity.ts`:

```typescript
export async function createRLSRules(
  ctx: QueryCtx | MutationCtx,
  authUserId: Id<"users">
): Promise<Rules<QueryCtx | MutationCtx, DataModel>> {
  const userIsAdmin = await isAdmin(ctx, authUserId);
  const userIsSuperadmin = await isSuperadmin(ctx, authUserId);

  return {
    // ... existing rules ...

    // NEW TABLE RULES
    yourTable: {
      read: async (_, doc) => {
        // Allow superadmins to see all records
        if (userIsSuperadmin) return true;

        // Allow admins to see all records (for support)
        if (userIsAdmin) return true;

        // Users can only see their own records
        return doc.userId === authUserId;
      },

      modify: async (_, doc) => {
        // Allow superadmins to modify any record
        if (userIsSuperadmin) return true;

        // Users can only modify their own records
        return doc.userId === authUserId;
      },

      insert: async (_, doc) => {
        // Allow superadmins to create records for anyone
        if (userIsSuperadmin) return true;

        // Users can only create records for themselves
        return doc.userId === authUserId;
      },
    },
  } satisfies Partial<Rules<QueryCtx | MutationCtx, DataModel>>;
}
```

### 3. Update Query/Mutation Imports

Change your function builders from `authedQuery`/`authedMutation` to `rlsQuery`/`rlsMutation`:

**Before:**
```typescript
import { authedQuery, authedMutation } from "../lib/customFunctions";

export const getMyData = authedQuery({
  args: {},
  handler: async (ctx) => {
    // Manual permission check
    const data = await ctx.db
      .query("yourTable")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
    return data;
  },
});
```

**After:**
```typescript
import { rlsQuery, rlsMutation } from "../lib/customFunctions";

export const getMyData = rlsQuery({
  args: {},
  handler: async (ctx) => {
    // RLS automatically filters to user's data
    const data = await ctx.db
      .query("yourTable")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .collect();
    return data;
  },
});
```

### 4. Remove Manual Permission Checks

RLS handles permission checking automatically, so you can remove redundant checks:

**Before:**
```typescript
export const updateMyData = authedMutation({
  args: { id: v.id("yourTable"), value: v.string() },
  handler: async (ctx, args) => {
    // Manual ownership check
    const record = await ctx.db.get(args.id);
    if (!record) {
      throw new Error("Not found");
    }
    if (record.userId !== ctx.auth.userId) {
      throw new Error("Unauthorized");
    }

    // Update
    await ctx.db.patch(args.id, { value: args.value });
  },
});
```

**After:**
```typescript
export const updateMyData = rlsMutation({
  args: { id: v.id("yourTable"), value: v.string() },
  handler: async (ctx, args) => {
    // RLS validates ownership automatically
    const record = await ctx.db.get(args.id);
    if (!record) {
      throw new Error("Not found");
    }

    // Update - will throw if user doesn't own the record
    await ctx.db.patch(args.id, { value: args.value });
  },
});
```

### 5. Handle Complex Relationships

For tables with foreign key relationships (like `deckCards` → `userDecks`), RLS can look up related tables:

```typescript
deckCards: {
  read: async (ctx, deckCard) => {
    if (userIsSuperadmin) return true;

    // Look up the deck to check ownership
    const deck = await ctx.db.get(deckCard.deckId);
    if (!deck) return false; // Orphaned record

    if (userIsAdmin) return true; // Admins can see all

    return deck.userId === authUserId; // Users see only their deck's cards
  },

  modify: async (ctx, deckCard) => {
    if (userIsSuperadmin) return true;

    const deck = await ctx.db.get(deckCard.deckId);
    if (!deck) return false;

    return deck.userId === authUserId;
  },

  insert: async (ctx, deckCard) => {
    if (userIsSuperadmin) return true;

    const deck = await ctx.db.get(deckCard.deckId);
    if (!deck) return false;

    return deck.userId === authUserId;
  },
},
```

### 6. Test Thoroughly

See [Testing Checklist](#testing-checklist) below.

## Testing Checklist

For each table you add RLS to, verify:

### ✅ Read Operations (Queries)

- [ ] User can read their own records
- [ ] User CANNOT read other users' records
- [ ] Admins can read all records (if intended)
- [ ] Superadmins can read all records
- [ ] Query with no results returns empty array (not error)

### ✅ Write Operations (Mutations)

- [ ] User can insert records for themselves
- [ ] User CANNOT insert records for other users
- [ ] User can modify their own records
- [ ] User CANNOT modify other users' records
- [ ] User can delete their own records
- [ ] User CANNOT delete other users' records
- [ ] Superadmins can perform all operations

### ✅ Edge Cases

- [ ] Orphaned records (foreign key points to deleted record) are handled
- [ ] Expired admin roles are properly excluded
- [ ] Error messages don't leak information about forbidden data
- [ ] Race conditions (concurrent updates) behave correctly

### ✅ Integration

- [ ] Triggers continue to work (audit logging, etc.)
- [ ] Frontend code receives expected data format
- [ ] Existing unit tests pass
- [ ] Performance is acceptable (add indexes if needed)

## Troubleshooting

### Query returns no results unexpectedly

**Symptom:** Query that should return data returns empty array.

**Diagnosis:**
1. Check RLS rules in `lib/rowLevelSecurity.ts`
2. Verify the authenticated user ID is correct
3. Test with a superadmin user to confirm data exists

**Fix:**
- Ensure RLS rule returns `true` for the user's data
- Check that `userId` field in the document matches `authUserId`
- Verify admin status caching is working correctly

### Mutation throws permission error

**Symptom:** Insert/update/delete throws unauthorized error.

**Diagnosis:**
1. Check the `insert` or `modify` rule for the table
2. Verify the document's `userId` matches `ctx.auth.userId`
3. Check if user has required admin role

**Fix:**
- Ensure `userId` in the document being inserted/modified matches the authenticated user
- For superadmin operations, verify the user has the correct role
- Check for typos in field names (e.g., `userId` vs `createdBy`)

### RLS rules executing too slowly

**Symptom:** Queries/mutations are noticeably slower after adding RLS.

**Diagnosis:**
1. Check if RLS rules are performing expensive queries
2. Look for missing database indexes
3. Profile the query/mutation execution time

**Fix:**
- Cache admin status checks (already done in `createRLSRules`)
- Add indexes for foreign key lookups (e.g., `by_user` index)
- Consider simplifying complex RLS rules
- For extremely hot paths, use manual checks instead of RLS

### Admin bypass not working

**Symptom:** Admin users are still blocked from accessing data.

**Diagnosis:**
1. Check if admin role is active and not expired
2. Verify `isAdmin()` function is called in RLS rules
3. Check admin role expiration timestamp

**Fix:**
- Ensure RLS rules include `if (userIsAdmin) return true;`
- Verify admin role has `isActive: true`
- Check `expiresAt` field is null or in the future

## Examples

### Example 1: Simple User-Owned Table

**Table:** `userSettings`

```typescript
// In schema.ts
userSettings: defineTable({
  userId: v.id("users"),
  theme: v.string(),
  language: v.string(),
  notifications: v.boolean(),
})
  .index("by_user", ["userId"]),

// In lib/rowLevelSecurity.ts
userSettings: {
  read: async (_, settings) => {
    if (userIsSuperadmin) return true;
    if (userIsAdmin) return true;
    return settings.userId === authUserId;
  },
  modify: async (_, settings) => {
    if (userIsSuperadmin) return true;
    return settings.userId === authUserId;
  },
  insert: async (_, settings) => {
    if (userIsSuperadmin) return true;
    return settings.userId === authUserId;
  },
},

// In userSettings.ts
export const getMySettings = rlsQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .first();
    return settings;
  },
});

export const updateMySettings = rlsMutation({
  args: {
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    notifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, args);
    } else {
      await ctx.db.insert("userSettings", {
        userId: ctx.auth.userId,
        theme: args.theme ?? "dark",
        language: args.language ?? "en",
        notifications: args.notifications ?? true,
      });
    }
  },
});
```

### Example 2: Financial Transactions (Read-Only for Users)

**Table:** `tokenTransactions`

```typescript
// In lib/rowLevelSecurity.ts
tokenTransactions: {
  read: async (_, tx) => {
    if (userIsSuperadmin) return true;
    if (userIsAdmin) return true; // Admins can view for support
    return tx.userId === authUserId;
  },
  modify: async (_, tx) => {
    // Only superadmins can modify transactions
    return userIsSuperadmin;
  },
  insert: async (_, tx) => {
    // Transactions are created by system, not users
    // Only superadmins can create manual transactions
    return userIsSuperadmin;
  },
},

// In tokenTransactions.ts
export const getMyTransactions = rlsQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("tokenTransactions")
      .withIndex("by_user", q => q.eq("userId", ctx.auth.userId))
      .order("desc")
      .take(args.limit ?? 50);
    return transactions;
  },
});

// Users cannot create transactions directly
// Transactions are created by internal mutations (rewards, purchases, etc.)
```

### Example 3: Relationship-Based Access

**Table:** `gameInvitations`

```typescript
// In schema.ts
gameInvitations: defineTable({
  gameId: v.id("games"),
  fromUserId: v.id("users"),
  toUserId: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
  createdAt: v.number(),
})
  .index("by_from_user", ["fromUserId"])
  .index("by_to_user", ["toUserId"])
  .index("by_game", ["gameId"]),

// In lib/rowLevelSecurity.ts
gameInvitations: {
  read: async (_, invite) => {
    if (userIsSuperadmin) return true;
    if (userIsAdmin) return true;

    // Users can see invitations they sent or received
    return invite.fromUserId === authUserId || invite.toUserId === authUserId;
  },
  modify: async (_, invite) => {
    if (userIsSuperadmin) return true;

    // Only the recipient can modify (accept/decline)
    return invite.toUserId === authUserId;
  },
  insert: async (_, invite) => {
    if (userIsSuperadmin) return true;

    // Only the sender can create invitations
    return invite.fromUserId === authUserId;
  },
},

// In gameInvitations.ts
export const getMyInvitations = rlsQuery({
  args: {},
  handler: async (ctx) => {
    const received = await ctx.db
      .query("gameInvitations")
      .withIndex("by_to_user", q => q.eq("toUserId", ctx.auth.userId))
      .filter(q => q.eq(q.field("status"), "pending"))
      .collect();

    const sent = await ctx.db
      .query("gameInvitations")
      .withIndex("by_from_user", q => q.eq("fromUserId", ctx.auth.userId))
      .collect();

    return { received, sent };
  },
});

export const respondToInvitation = rlsMutation({
  args: {
    inviteId: v.id("gameInvitations"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) {
      throw new Error("Invitation not found");
    }

    // RLS validates invite.toUserId === ctx.auth.userId
    await ctx.db.patch(args.inviteId, {
      status: args.accept ? "accepted" : "declined",
    });

    return { success: true };
  },
});
```

## Next Steps

1. **Prioritize tables**: Start with high-priority sensitive tables
2. **Implement incrementally**: Migrate 1-2 tables at a time
3. **Test thoroughly**: Use the testing checklist for each table
4. **Monitor performance**: Watch for slow queries after adding RLS
5. **Document decisions**: Update this guide with learnings

## Additional Resources

- **Examples**: See `convex/examples/rlsExamples.ts` for complete working examples
- **RLS Rules**: See `convex/lib/rowLevelSecurity.ts` for existing rule patterns
- **Custom Functions**: See `convex/lib/customFunctions.ts` for builder implementations
- **Convex Helpers Docs**: See convex-helpers documentation for advanced RLS patterns
