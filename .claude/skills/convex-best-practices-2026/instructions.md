---
name: convex-best-practices-2026
description: "Convex development best practices for 2026 - function patterns, schema design, authentication, components, testing, and performance optimization"
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, mcp__context7__query-docs]
---

# Convex Development Best Practices (2026)

Based on official Convex documentation and Context7 library data (January 2026).

## Core Principles

1. **Thin API Layer** - Delegate to model functions
2. **Internal Functions** - Use `internalQuery` and `internalMutation` for composition
3. **Index-First** - Always use indexes, never raw `.filter()` on database queries
4. **Type Safety** - Leverage TypeScript and Convex generated types
5. **Test-Driven** - Use `convex-test` for comprehensive testing

---

## Function Patterns

### ✅ Recommended: Thin API with Model Layer

**Pattern:** Separate API functions (external) from business logic (internal/model).

```typescript
// convex/model/conversations.ts
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export async function addSummary(
  ctx: MutationCtx,
  { conversationId, summary }: { conversationId: Id<"conversations">; summary: string }
) {
  await ensureHasAccess(ctx, { conversationId });
  await ctx.db.patch(conversationId, { summary });
}

export async function listMessages(
  ctx: QueryCtx,
  { conversationId }: { conversationId: Id<"conversations"> }
) {
  await ensureHasAccess(ctx, { conversationId });
  return await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .collect();
}

export async function generateSummary(
  messages: Doc<"messages">[],
  conversationId: Id<"conversations">
): Promise<string> {
  // Call external AI service
  const summary = await callAISummaryService(messages);
  return summary;
}
```

```typescript
// convex/conversations.ts
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import * as Conversations from "./model/conversations";

// Thin API layer - delegates to model
export const addSummary = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    summary: v.string(),
  },
  handler: async (ctx, { conversationId, summary }) => {
    await Conversations.addSummary(ctx, { conversationId, summary });
  },
});

export const listMessages = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return Conversations.listMessages(ctx, { conversationId });
  },
});

// Action composes internal functions
export const summarizeConversation = action({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.runQuery(internal.conversations.listMessages, {
      conversationId,
    });
    const summary = await Conversations.generateSummary(messages, conversationId);
    await ctx.runMutation(internal.conversations.addSummary, {
      conversationId,
      summary,
    });
  },
});
```

**Why This Works:**
- Reusable model functions across multiple API endpoints
- Internal functions can call each other without HTTP overhead
- Business logic separate from API layer
- Easier to test

---

## Schema Design & Indexing

### ✅ Always Use Indexes, Never Filter

**❌ Anti-pattern: Using `.filter()` on database queries**

```typescript
// ❌ BAD: Table scan, slow for large datasets
const tomsMessages = await ctx.db
  .query("messages")
  .filter((q) => q.eq(q.field("author"), "Tom"))
  .collect();
```

**✅ Option 1: Use an index**

```typescript
// ✅ GOOD: Fast indexed lookup
const tomsMessages = await ctx.db
  .query("messages")
  .withIndex("by_author", (q) => q.eq("author", "Tom"))
  .collect();

// Schema definition:
defineTable({
  author: v.string(),
  content: v.string(),
  // ...
}).index("by_author", ["author"])
```

**✅ Option 2: Filter in memory (for small datasets)**

```typescript
// ✅ GOOD: Acceptable if dataset is small
const allMessages = await ctx.db.query("messages").collect();
const tomsMessages = allMessages.filter((m) => m.author === "Tom");
```

**When to use each:**
- **Index**: Large datasets (>100 records), frequent queries, need pagination
- **Memory filter**: Small datasets (<50 records), one-off queries, complex filters not supported by indexes

### ✅ Avoid Redundant Indexes with Composite Indexes

**❌ Anti-pattern: Multiple overlapping indexes**

```typescript
// ❌ BAD: Two indexes when one would suffice
defineTable({
  team: v.id("teams"),
  user: v.id("users"),
  // ...
})
  .index("by_team", ["team"])
  .index("by_team_and_user", ["team", "user"]);
```

**✅ Good: Single composite index handles both cases**

```typescript
// ✅ GOOD: One index serves both query patterns
defineTable({
  team: v.id("teams"),
  user: v.id("users"),
  // ...
}).index("by_team_and_user", ["team", "user"]);

// Query all team members (prefix match)
const allTeamMembers = await ctx.db
  .query("teamMembers")
  .withIndex("by_team_and_user", (q) => q.eq("team", teamId))
  .collect();

// Query specific user in team
const specificMember = await ctx.db
  .query("teamMembers")
  .withIndex("by_team_and_user", (q) => q.eq("team", teamId).eq("user", userId))
  .unique();
```

**Benefits:**
- Reduced storage overhead
- Faster writes (fewer indexes to update)
- Simpler schema maintenance

### Index Design Guidelines

1. **Most selective field first** (unless query patterns dictate otherwise)
2. **Composite indexes** for multi-field queries
3. **Search indexes** for full-text search (use `.withSearchIndex()`)
4. **Order matters** - `["team", "user"]` ≠ `["user", "team"]`

---

## Testing with convex-test (2026)

### Setup

```typescript
// convex/myModule.test.ts
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

describe("My Module Tests", () => {
  it("tests a query", async () => {
    const t = convexTest(schema);

    // Call public function
    const result = await t.query(api.myModule.myQuery, { a: 1, b: 2 });
    expect(result).toBe(3);

    // Call internal function
    const internalResult = await t.query(internal.myModule.internalQuery, { x: 5 });
    expect(internalResult).toBe(10);
  });

  it("tests a mutation with identity", async () => {
    const t = convexTest(schema);

    // Create test user
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { username: "testuser" });
    });

    // Set identity for auth
    t.withIdentity({ subject: userId });

    // Call mutation
    const result = await t.mutation(api.myModule.createDeck, {
      name: "Test Deck"
    });

    expect(result).toBeDefined();
  });

  it("tests an action", async () => {
    const t = convexTest(schema);

    const result = await t.action(api.myModule.doSomething, { data: "test" });
    expect(result.success).toBe(true);
  });
});
```

### Testing Patterns

**1. Authorization Matrix**

```typescript
describe("Authorization", () => {
  it("rejects unauthenticated access", async () => {
    const t = convexTest(schema);

    await expect(
      t.query(api.protected.getData, {})
    ).rejects.toThrow(/unauthorized/i);
  });

  it("rejects wrong user access", async () => {
    const t = convexTest(schema);

    const user1 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { username: "user1" });
    });
    const user2 = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { username: "user2" });
    });

    // User1 creates resource
    t.withIdentity({ subject: user1 });
    const resourceId = await t.mutation(api.resources.create, { name: "My Resource" });

    // User2 tries to access
    t.withIdentity({ subject: user2 });
    await expect(
      t.query(api.resources.get, { id: resourceId })
    ).rejects.toThrow(/unauthorized/i);
  });
});
```

**2. Data Invariants**

```typescript
describe("Data Invariants", () => {
  it("enforces balance never goes negative", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { balance: 100 });
    });

    t.withIdentity({ subject: userId });

    await expect(
      t.mutation(api.economy.purchase, { cost: 150 })
    ).rejects.toThrow(/insufficient balance/i);
  });
});
```

**3. Concurrency/Race Conditions**

```typescript
describe("Concurrency", () => {
  it("prevents double-spend", async () => {
    const t = convexTest(schema);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", { balance: 100 });
    });

    t.withIdentity({ subject: userId });

    // Two simultaneous purchases
    const results = await Promise.allSettled([
      t.mutation(api.economy.purchase, { cost: 60 }),
      t.mutation(api.economy.purchase, { cost: 60 }),
    ]);

    // At most one should succeed
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    expect(succeeded).toBeLessThanOrEqual(1);
  });
});
```

---

## Authentication Patterns

### Using @convex-dev/auth (2026)

**Setup:**

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [GitHub, Google],
});
```

**Protecting Queries/Mutations:**

```typescript
// convex/myModule.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMyData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("data")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(userId, { name });
  },
});
```

---

## Component Usage

### @convex-dev/aggregate

**Best Practice:** Keep aggregate definitions and queries together to avoid TS2589 errors.

```typescript
// convex/analytics/emailEvents.ts
import { Aggregator } from "@convex-dev/aggregate";
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Define aggregate
export const aggregateEmailEvents = new Aggregator("emailEventsSent", {
  schema: {
    campaignId: v.string(),
    sentAt: v.number(),
  },
});

// Query using aggregate (same file)
export const getCampaignCount = internalQuery({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    // Extract to variable to avoid TS2589
    const opts = {
      namespace: args.campaignId,
      bounds: {},
    };
    return aggregateEmailEvents.count(ctx, opts);
  },
});
```

### @convex-dev/ratelimiter

```typescript
import { RateLimiter } from "@convex-dev/ratelimiter";
import { mutation } from "./_generated/server";

const rateLimiter = new RateLimiter("api_calls", {
  rateLimit: 10,  // 10 calls
  period: 60000,  // per 60 seconds
});

export const apiCall = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const allowed = await rateLimiter.check(ctx, userId);
    if (!allowed) {
      throw new Error("Rate limit exceeded");
    }

    // Proceed with operation
  },
});
```

---

## Performance Optimization

### 1. Pagination Instead of Large Collects

**❌ Anti-pattern:**

```typescript
// ❌ BAD: Load all records at once
const allMessages = await ctx.db.query("messages").collect();
```

**✅ Good:**

```typescript
// ✅ GOOD: Paginate results
export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { conversationId, paginationOpts }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .paginate(paginationOpts);
  },
});
```

### 2. Batch Operations

Use `Promise.all()` for parallel independent operations:

```typescript
// ✅ GOOD: Parallel queries
const [user, teams, messages] = await Promise.all([
  ctx.db.get(userId),
  ctx.db.query("teams").withIndex("by_member", (q) => q.eq("memberId", userId)).collect(),
  ctx.db.query("messages").withIndex("by_author", (q) => q.eq("authorId", userId)).take(10),
]);
```

### 3. Denormalize When Appropriate

**Trade-off:** Storage vs Query Performance

```typescript
// Option A: Normalized (requires join)
// messages: { authorId: Id<"users"> }
// users: { username: string }

// Option B: Denormalized (faster queries, more storage)
// messages: { authorId: Id<"users">, authorUsername: string }
```

Use denormalization for:
- Frequently accessed data
- Data that rarely changes
- Hot paths requiring low latency

---

## Common Pitfalls to Avoid

### ❌ 1. Using `.filter()` on Database Queries

Always use indexes for database filtering.

### ❌ 2. Inline Object Literals in Component Calls

```typescript
// ❌ BAD: Causes TS2589
return aggregate.count(ctx, { namespace: id, bounds: {} });

// ✅ GOOD: Extract to variable
const opts = { namespace: id, bounds: {} };
return aggregate.count(ctx, opts);
```

### ❌ 3. Calling External APIs in Queries/Mutations

```typescript
// ❌ BAD: Non-deterministic query
export const getData = query({
  handler: async (ctx) => {
    const response = await fetch("https://api.example.com/data");
    return response.json();
  },
});

// ✅ GOOD: Use actions for external API calls
export const getData = action({
  handler: async (ctx) => {
    const response = await fetch("https://api.example.com/data");
    const data = await response.json();

    // Store in database via mutation
    await ctx.runMutation(internal.myModule.storeData, { data });
    return data;
  },
});
```

### ❌ 4. Missing Authentication Checks

Always validate user identity in protected functions:

```typescript
// ❌ BAD: No auth check
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.delete(userId);
  },
});

// ✅ GOOD: Verify auth and ownership
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) throw new Error("Unauthorized");

    // Verify ownership or admin role
    if (currentUserId !== userId && !await isAdmin(ctx, currentUserId)) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(userId);
  },
});
```

### ❌ 5. Not Handling Race Conditions

Use optimistic concurrency control:

```typescript
// ✅ GOOD: Check-then-update pattern
export const purchase = mutation({
  args: { itemId: v.id("items"), cost: v.number() },
  handler: async (ctx, { itemId, cost }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Check balance
    if (user.balance < cost) {
      throw new Error("Insufficient balance");
    }

    // Atomic update
    await ctx.db.patch(userId, {
      balance: user.balance - cost,
    });

    // Record purchase
    await ctx.db.insert("purchases", {
      userId,
      itemId,
      cost,
      timestamp: Date.now(),
    });
  },
});
```

---

## Quick Reference

### Function Types

| Type | Use Case | Can Call | Deterministic |
|------|----------|----------|---------------|
| `query` | Read data | DB reads, other queries | ✅ Yes |
| `mutation` | Write data | DB reads/writes, other mutations | ✅ Yes |
| `action` | External APIs | Anything (runQuery, runMutation, fetch) | ❌ No |
| `internalQuery` | Internal reads | Same as query | ✅ Yes |
| `internalMutation` | Internal writes | Same as mutation | ✅ Yes |

### When to Use Each

- **Query**: Fetch data for UI, read-only operations
- **Mutation**: Update database, ensure consistency
- **Action**: Call external APIs, send emails, process payments
- **Internal**: Compose functions, shared logic, Actions calling DB

---

## Resources

- **Official Docs**: https://docs.convex.dev
- **Best Practices**: https://docs.convex.dev/understanding/best-practices
- **Testing Guide**: https://docs.convex.dev/testing/convex-test
- **Context7 Convex**: /llmstxt/convex_dev_llms-full_txt
