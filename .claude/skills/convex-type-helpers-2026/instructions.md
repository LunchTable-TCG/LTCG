---
name: convex-type-helpers-2026
description: "Convex TypeScript type helpers and patterns to avoid TS2589 (type instantiation excessively deep) errors"
allowed-tools: [Bash, Read, Write, Edit, Glob]
---

# Convex Type Helpers & TS2589 Fixes (2026)

Solutions for TypeScript type instantiation errors when working with Convex generated types.

## The Problem: TS2589

**Error**: "Type instantiation is excessively deep and possibly infinite"

**Cause**: Convex generates deeply nested TypeScript types that can exceed TypeScript's recursion limits, especially when:
- Using `@convex-dev/aggregate` or other component libraries
- Composing multiple Convex function definitions
- Inline object literals in function calls
- Query builder chains with complex DataModel types

---

## Solution 1: Module-Level Type Boundary (Recommended)

Create a centralized helper file to break type inference at module boundaries.

```typescript
// lib/convexHelpers.ts
import { api } from "@convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";

// ✅ Cast once at module level
export const apiAny = api as any;

// ✅ Wrapper helpers prevent repeated type inference
export function useConvexMutation(path: any) {
  return useMutation(path);
}

export function useConvexQuery(path: any, args?: any) {
  return useQuery(path, args);
}

export function useConvexAction(path: any) {
  return useAction(path);
}
```

**Usage in components:**

```typescript
// components/MyComponent.tsx
import { apiAny, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";

export function MyComponent() {
  const myMutation = useConvexMutation(apiAny.myModule.myFunction);
  const myQuery = useConvexQuery(apiAny.myModule.myQuery, { id: "123" });

  // ✅ No TS2589 errors!
  return <div>...</div>;
}
```

**Why this works:** TypeScript computes the type once at the module boundary instead of re-inferring it in each component.

---

## Solution 2: Extract Inline Objects

Don't inline complex objects into Convex function calls.

**❌ Anti-pattern:**

```typescript
// ❌ BAD: Inline object causes type explosion
return aggregateData.count(ctx, {
  namespace: args.campaignId,
  bounds: {},
});
```

**✅ Solution:**

```typescript
// ✅ GOOD: Extract to variable
const opts = {
  namespace: args.campaignId,
  bounds: {},
};
return aggregateData.count(ctx, opts);

// ✅ BETTER: Add explicit type boundary
const opts: { namespace: typeof args.campaignId; bounds: {} } = {
  namespace: args.campaignId,
  bounds: {},
};
return aggregateData.count(ctx, opts);
```

---

## Solution 3: Colocate Aggregate Definitions

For `@convex-dev/aggregate`, keep definitions and queries together.

**❌ Anti-pattern:**

```typescript
// aggregates/campaigns.ts
export const campaignAggregate = defineAggregate(...);

// queries/campaigns.ts (separate file)
import { campaignAggregate } from "../aggregates/campaigns";
export const getCampaignCount = query(...); // ❌ TS2589 here
```

**✅ Solution:**

```typescript
// aggregates/campaigns.ts
import { Aggregator } from "@convex-dev/aggregate";
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

// Define aggregate
export const campaignAggregate = new Aggregator("campaigns", {
  schema: {
    campaignId: v.string(),
    eventType: v.string(),
  },
});

// ✅ Query in same file
export const getCampaignCount = internalQuery({
  args: { campaignId: v.string() },
  handler: async (ctx, args) => {
    const opts = {
      namespace: args.campaignId,
      bounds: {},
    };
    return campaignAggregate.count(ctx, opts);
  },
});
```

---

## Complete Example: lib/convexHelpers.ts

```typescript
// lib/convexHelpers.ts
import { api } from "@convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";

/**
 * Type-cast API to avoid TS2589 errors.
 * Use this instead of `api as any` in components.
 */
export const apiAny = api as any;

/**
 * Wrapper for useMutation to avoid type instantiation errors.
 * @param path - Path to mutation function (e.g., apiAny.myModule.myMutation)
 */
export function useConvexMutation(path: any) {
  return useMutation(path);
}

/**
 * Wrapper for useQuery to avoid type instantiation errors.
 * @param path - Path to query function (e.g., apiAny.myModule.myQuery)
 * @param args - Query arguments
 */
export function useConvexQuery(path: any, args?: any) {
  return useQuery(path, args);
}

/**
 * Wrapper for useAction to avoid type instantiation errors.
 * @param path - Path to action function (e.g., apiAny.myModule.myAction)
 */
export function useConvexAction(path: any) {
  return useAction(path);
}

/**
 * Type helper for admin batch operations.
 * @param operation - Name of batch operation
 */
export function useAdminBatchOperation(operation: keyof typeof apiAny.admin.batchAdmin) {
  return useConvexMutation(apiAny.admin.batchAdmin[operation]);
}

/**
 * Batch mutation wrapper with error handling.
 * @param operationPath - Path to mutation
 */
export function useBatchMutation(operationPath: any) {
  const mutation = useConvexMutation(operationPath);

  return async (args: any) => {
    try {
      const result = await mutation(args);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  };
}
```

---

## Component Examples

### Basic Usage

```typescript
// components/GrantGoldForm.tsx
"use client";

import { useState } from "react";
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";
import { toast } from "sonner";

export function GrantGoldForm() {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const batchGrantGold = useConvexMutation(apiAny.admin.batchAdmin.batchGrantGold);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await batchGrantGold({
        playerIds: ["player1", "player2"],
        amount: Number.parseInt(amount, 10),
        reason: "Season reward",
      });

      toast.success(`Granted ${amount} gold successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button type="submit" disabled={isSubmitting}>
        Grant Gold
      </button>
    </form>
  );
}
```

### Query with Arguments

```typescript
// components/UserProfile.tsx
"use client";

import { apiAny, useConvexQuery } from "@/lib/convexHelpers";

export function UserProfile({ userId }: { userId: string }) {
  const user = useConvexQuery(apiAny.users.get, { id: userId });

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (user === null) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

### Using Admin Batch Helper

```typescript
// components/BatchOperations.tsx
"use client";

import { useAdminBatchOperation } from "@/lib/convexHelpers";

export function BatchOperations() {
  const batchGrantGold = useAdminBatchOperation("batchGrantGold");
  const batchResetRatings = useAdminBatchOperation("batchResetRatings");

  const handleGrantGold = async () => {
    await batchGrantGold({
      playerIds: ["player1"],
      amount: 1000,
      reason: "Admin grant",
    });
  };

  const handleResetRatings = async () => {
    await batchResetRatings({
      playerIds: ["player1"],
      reason: "Season reset",
    });
  };

  return (
    <div>
      <button onClick={handleGrantGold}>Grant Gold</button>
      <button onClick={handleResetRatings}>Reset Ratings</button>
    </div>
  );
}
```

### With Error Handling Wrapper

```typescript
// components/SafeBatchOperation.tsx
"use client";

import { apiAny, useBatchMutation } from "@/lib/convexHelpers";
import { toast } from "sonner";

export function SafeBatchOperation() {
  const grantGold = useBatchMutation(apiAny.admin.batchAdmin.batchGrantGold);

  const handleSubmit = async () => {
    const result = await grantGold({
      playerIds: ["player1"],
      amount: 1000,
      reason: "Reward",
    });

    if (result.success) {
      toast.success("Operation completed");
    } else {
      toast.error(result.error);
    }
  };

  return <button onClick={handleSubmit}>Grant Gold</button>;
}
```

---

## TSConfig Settings

```json
// convex/tsconfig.json
{
  "compilerOptions": {
    "skipLibCheck": true,  // Skip type checking in node_modules
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

## Quick Fixes Checklist

When you encounter TS2589:

1. ✅ **Import helpers** from `lib/convexHelpers.ts`
2. ✅ **Replace** `useMutation(api.*)` with `useConvexMutation(apiAny.*)`
3. ✅ **Replace** `useQuery(api.*)` with `useConvexQuery(apiAny.*)`
4. ✅ **Extract** inline objects to variables before passing to functions
5. ✅ **Colocate** aggregate definitions with their queries
6. ✅ **Add** `skipLibCheck: true` to tsconfig if needed

---

## Common Patterns

### Pattern 1: Batch Operations Module

```typescript
// lib/batchOperations.ts
import { apiAny, useConvexMutation } from "./convexHelpers";

export function useBatchGold() {
  return useConvexMutation(apiAny.admin.batchAdmin.batchGrantGold);
}

export function useBatchPremium() {
  return useConvexMutation(apiAny.admin.batchAdmin.batchGrantPremium);
}

export function useBatchResetRatings() {
  return useConvexMutation(apiAny.admin.batchAdmin.batchResetRatings);
}
```

### Pattern 2: Query Hooks Module

```typescript
// lib/queryHooks.ts
import { apiAny, useConvexQuery } from "./convexHelpers";

export function useUser(userId: string) {
  return useConvexQuery(apiAny.users.get, { id: userId });
}

export function useUserDecks(userId: string) {
  return useConvexQuery(apiAny.decks.list, { userId });
}

export function useLeaderboard(limit = 10) {
  return useConvexQuery(apiAny.leaderboard.get, { limit });
}
```

---

## Migration Guide

**Before (with TS2589 errors):**

```typescript
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

export function MyComponent() {
  const myMutation = useMutation(api.myModule.myFunction); // ❌ TS2589
}
```

**After (fixed):**

```typescript
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";

export function MyComponent() {
  const myMutation = useConvexMutation(apiAny.myModule.myFunction); // ✅ No errors
}
```

**Bulk migration:**

1. Create `lib/convexHelpers.ts` with helpers
2. Search project for `useMutation(api.`
3. Replace with `useConvexMutation(apiAny.`
4. Add import: `import { apiAny, useConvexMutation } from "@/lib/convexHelpers"`
5. Remove old import: `import { api } from "@convex/_generated/api"`

---

## Resources

- **Convex Type Fixes Skill**: `/.claude/skills/convex-type-fixes/`
- **Convex Best Practices**: `/.claude/skills/convex-best-practices-2026/`
- **TypeScript Deep Dive**: https://basarat.gitbook.io/typescript/
