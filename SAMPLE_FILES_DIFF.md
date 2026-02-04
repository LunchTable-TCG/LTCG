# Sample Files - Exact Changes Made

This document shows the exact import changes made to each sample file.

## 1. convex/presence.ts

**Location:** Root level (depth 0)
**Import path:** `"./functions"`

### Before
```typescript
import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuthMutation, requireAuthQuery } from "./lib/convexAuth";
import { ErrorCode, createError } from "./lib/errorCodes";
import type { UserStatus } from "./lib/types";
```

### After
```typescript
import { Presence } from "@convex-dev/presence";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { mutation, internalMutation } from "./functions";
import { requireAuthMutation, requireAuthQuery } from "./lib/convexAuth";
import { ErrorCode, createError } from "./lib/errorCodes";
import type { UserStatus } from "./lib/types";
```

### Changes
- Removed `mutation` and `internalMutation` from `_generated/server` import
- Kept `query` in `_generated/server`
- Added new import: `import { mutation, internalMutation } from "./functions";`

---

## 2. convex/stripe/portal.ts

**Location:** One level deep (depth 1)
**Import path:** `"../functions"`

### Before
```typescript
import { mutation } from "../_generated/server";
import { stripe } from "../lib/stripe";
```

### After
```typescript
import { mutation } from "../functions";
import { stripe } from "../lib/stripe";
```

### Changes
- Changed import source from `"../_generated/server"` to `"../functions"`

---

## 3. convex/stripe/checkout.ts

**Location:** One level deep (depth 1)
**Import path:** `"../functions"`

### Before
```typescript
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { STRIPE_PRICE_IDS, stripe } from "../lib/stripe";
```

### After
```typescript
import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { STRIPE_PRICE_IDS, stripe } from "../lib/stripe";
```

### Changes
- Removed `mutation` from `_generated/server` import
- Kept `query` in `_generated/server`
- Added new import: `import { mutation } from "../functions";`

---

## 4. convex/stripe/webhooks.ts

**Location:** One level deep (depth 1)
**Import path:** `"../functions"`

### Before
```typescript
import { v } from "convex/values";
import type Stripe from "stripe";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";
```

### After
```typescript
import { v } from "convex/values";
import type Stripe from "stripe";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../functions";
```

### Changes
- Changed `internalMutation` import source from `"../_generated/server"` to `"../functions"`
- Kept type import `MutationCtx` in `_generated/server` (types always stay)

---

## 5. convex/gameplay/games/spectator.ts

**Location:** Two levels deep (depth 2)
**Import path:** `"../../functions"`

### Before
```typescript
import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { SPECTATOR } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { spectatorCounter } from "../../infrastructure/shardedCounters";
```

### After
```typescript
import { v } from "convex/values";
import { mutation } from "../../functions";
import { SPECTATOR } from "../../lib/constants";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { spectatorCounter } from "../../infrastructure/shardedCounters";
```

### Changes
- Changed import source from `"../../_generated/server"` to `"../../functions"`

---

## 6. convex/gameplay/games/lifecycle.ts

**Location:** Two levels deep (depth 2)
**Import path:** `"../../functions"`

### Before
```typescript
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import { completedGamesCounter } from "../../infrastructure/shardedCounters";
import { requireAuthMutation } from "../../lib/convexAuth";
import { shuffleArray } from "../../lib/deterministicRandom";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { recordEventHelper, recordGameEndHelper } from "../gameEvents";
import { updateAgentStatsAfterGame, updatePlayerStatsAfterGame } from "./stats";
```

### After
```typescript
import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { mutation, internalMutation } from "../../functions";
import { completedGamesCounter } from "../../infrastructure/shardedCounters";
import { requireAuthMutation } from "../../lib/convexAuth";
import { shuffleArray } from "../../lib/deterministicRandom";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { recordEventHelper, recordGameEndHelper } from "../gameEvents";
import { updateAgentStatsAfterGame, updatePlayerStatsAfterGame } from "./stats";
```

### Changes
- Removed `mutation` and `internalMutation` from `_generated/server` import (only had 1 import line)
- Kept type import `MutationCtx` in `_generated/server`
- Added new import: `import { mutation, internalMutation } from "../../functions";`
- Reordered imports to group types together

---

## Pattern Summary

### Directory Depth → Import Path

| Depth | Example | Path to functions.ts |
|-------|---------|---------------------|
| 0 | `convex/presence.ts` | `"./functions"` |
| 1 | `convex/stripe/portal.ts` | `"../functions"` |
| 2 | `convex/gameplay/games/spectator.ts` | `"../../functions"` |
| 3 | `convex/gameplay/gameEngine/phases.ts` | `"../../../functions"` |

### What Moves, What Stays

**Move to `functions.ts`:**
- ✅ `mutation`
- ✅ `internalMutation`

**Stay in `_generated/server`:**
- ✅ `query`
- ✅ `internalQuery`
- ✅ `action`
- ✅ `internalAction`
- ✅ Type imports (`MutationCtx`, `QueryCtx`, `Id<>`, etc.)

### Import Organization

**Recommended order:**
1. External packages (npm modules)
2. Convex values/utilities
3. Internal Convex generated (api, dataModel, server)
4. Functions.ts imports
5. Internal modules (lib, helpers, etc.)

**Example:**
```typescript
// External
import { v } from "convex/values";

// Convex generated
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { query } from "../_generated/server";

// Functions wrapper
import { mutation, internalMutation } from "../functions";

// Internal
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode } from "../lib/errorCodes";
```
