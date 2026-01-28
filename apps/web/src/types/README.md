# Types Directory

**Central type definitions and utilities for the LTCG web application**

---

## Directory Structure

```
types/
├── README.md                    # This file
├── index.ts                     # Barrel export (use this for imports)
│
├── Core Type Files
├── common.ts                    # Base hook patterns, enums
├── game.ts                      # Game-specific types
├── progression.ts               # Achievements, quests, badges
├── social.ts                    # Friends, leaderboards
├── story.ts                     # Story mode types
├── ui.ts                        # Display/UI types
├── generated.ts                 # Auto-generated from validators
│
├── Utilities (NEW!)
├── utils.ts                     # Type utility helpers (50+ utilities)
│
├── Documentation
├── UTILS_GUIDE.md              # Complete guide with examples
├── QUICK_REFERENCE.md          # One-page cheat sheet
├── UTILITY_STATS.md            # Migration opportunities & stats
├── MIGRATION_EXAMPLE.md        # Real-world before/after example
│
└── Tests
    └── __tests__/
        └── utils.test.ts       # Comprehensive test suite (29 tests)
```

---

## Quick Start

### Importing Types

All types are exported from the barrel file for convenience:

```typescript
import type {
  // Common patterns
  Optional,
  Nullable,
  Maybe,
  NullableId,

  // Existing types
  Quest,
  Achievement,
  Friend,
  StoryChapter,
} from "@/types";

import {
  // Type guards
  isDefined,
  isNonEmptyArray,

  // Result helpers
  ok,
  err,
  isOk,
} from "@/types";
```

### Most Common Utilities

```typescript
// 1. Optional values (can be undefined)
data: Optional<User>

// 2. Nullable values (can be null)
user: Nullable<User>

// 3. Nullable Convex IDs
deckId: NullableId<"userDecks">

// 4. Type-safe undefined check
if (isDefined(value)) {
  // TypeScript knows value is defined
}

// 5. Non-empty array check
if (isNonEmptyArray(arr)) {
  const first = arr[0]; // Safe!
}
```

---

## Documentation Index

### For Developers

1. **Getting Started** → [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md)
   - One-page cheat sheet
   - Most common utilities
   - Quick examples

2. **Detailed Guide** → [`UTILS_GUIDE.md`](./UTILS_GUIDE.md)
   - Complete documentation
   - Every utility explained
   - Before/after comparisons
   - Best practices

3. **Migration Guide** → [`MIGRATION_EXAMPLE.md`](./MIGRATION_EXAMPLE.md)
   - Real-world example
   - Step-by-step migration
   - Improvement analysis

### For Team Leads

4. **Statistics & Planning** → [`UTILITY_STATS.md`](./UTILITY_STATS.md)
   - Codebase analysis
   - Migration opportunities
   - Prioritized rollout plan
   - ROI estimates

---

## Type Utility Categories

### 1. Nullability (Most Used)

| Utility | Purpose | Example |
|---------|---------|---------|
| `Optional<T>` | Can be undefined | `Optional<string>` |
| `Nullable<T>` | Can be null | `Nullable<User>` |
| `Maybe<T>` | Can be null or undefined | `Maybe<Id>` |
| `NullableId<T>` | Convex ID that can be null | `NullableId<"users">` |
| `OptionalId<T>` | Convex ID that can be undefined | `OptionalId<"games">` |

### 2. Type Guards (Essential)

| Guard | Purpose | Example |
|-------|---------|---------|
| `isDefined()` | Filter null/undefined | `if (isDefined(x))` |
| `isNonEmptyArray()` | Check array has items | `if (isNonEmptyArray(arr))` |
| `isString()` | Check for string | `if (isString(x))` |
| `hasKey()` | Check object key | `if (hasKey(obj, "id"))` |

### 3. Object Transformations

| Utility | Purpose | Example |
|---------|---------|---------|
| `RequireProps<T, K>` | Make props required | `RequireProps<User, "id">` |
| `MakeOptional<T, K>` | Make props optional | `MakeOptional<User, "email">` |
| `OptionalExcept<T, K>` | Partial with exceptions | `OptionalExcept<User, "id">` |
| `PickByType<T, U>` | Pick by value type | `PickByType<User, string>` |

### 4. Functions

| Utility | Purpose | Example |
|---------|---------|---------|
| `AsyncFunction<P, R>` | Async function type | `AsyncFunction<[string], User>` |
| `AsyncReturnType<T>` | Extract async return | `AsyncReturnType<typeof fn>` |
| `VoidFunction<P>` | Void return function | `VoidFunction<[Event]>` |

### 5. Result Types (Error Handling)

| Type/Function | Purpose |
|---------------|---------|
| `Result<T, E>` | Success or failure |
| `ok(value)` | Create success |
| `err(error)` | Create failure |
| `isOk(result)` | Check success |
| `isErr(result)` | Check failure |

---

## Usage Patterns

### Hook Return Types

```typescript
import type { Optional, AsyncFunction } from "@/types";

interface UseDataReturn {
  // Queries (undefined while loading)
  data: Optional<User>;
  friends: Optional<Friend[]>;

  // Mutations (always return promises)
  updateUser: AsyncFunction<[Partial<User>], void>;
  deleteFriend: AsyncFunction<[Id<"users">], void>;

  isLoading: boolean;
  error: Optional<string>;
}
```

### Component Props

```typescript
import type { NullableId, Optional } from "@/types";

interface CardProps {
  cardId: Id<"cards">;
  deckId: NullableId<"userDecks">; // Can be null
  onSelect: Optional<(id: string) => void>; // Can be undefined
}
```

### Error Handling

```typescript
import type { Result } from "@/types";
import { ok, err, isOk } from "@/types";

async function fetchUser(id: string): Promise<Result<User, Error>> {
  try {
    const user = await api.getUser(id);
    return ok(user);
  } catch (error) {
    return err(error as Error);
  }
}

// Usage
const result = await fetchUser("123");
if (isOk(result)) {
  console.log(result.value); // User
} else {
  console.error(result.error); // Error
}
```

---

## File Descriptions

### Core Type Files

- **`common.ts`** - Base hook patterns (`BaseHookReturn`, `MutationHookReturn`), enums (`GameMode`, `PlayerStatus`), common interfaces
- **`game.ts`** - Game-specific types (`HandCard`, `BoardCard`, `GraveyardCard`)
- **`progression.ts`** - Progression system (`Achievement`, `Quest`, `Badge`, `Notification`)
- **`social.ts`** - Social features (`Friend`, `FriendRequest`, `LeaderboardEntry`)
- **`story.ts`** - Story mode (`StoryChapter`, `StoryStage`)
- **`ui.ts`** - Display/UI types with validation (`CardDisplay`, `DeckDisplay`, etc.)
- **`generated.ts`** - Auto-generated from Convex validators (do not edit manually)

### Utility Files

- **`utils.ts`** - 50+ type utilities and helpers
  - 727 lines of TypeScript
  - Comprehensive JSDoc documentation
  - Zero runtime cost

### Documentation

- **`UTILS_GUIDE.md`** - Complete guide (867 lines)
  - Every utility explained
  - Examples for each
  - Migration patterns
  - Best practices

- **`QUICK_REFERENCE.md`** - Cheat sheet (399 lines)
  - One-page reference
  - Top 10 utilities
  - Common patterns
  - Quick examples

- **`UTILITY_STATS.md`** - Statistics & planning (511 lines)
  - Codebase analysis
  - 80+ migration opportunities identified
  - Prioritized rollout plan
  - Time estimates

- **`MIGRATION_EXAMPLE.md`** - Real example (500+ lines)
  - Complete before/after code
  - Line-by-line comparison
  - Improvement metrics
  - Migration checklist

---

## Testing

### Test Suite: `__tests__/utils.test.ts`

**Coverage:**
- 29 test cases
- 76 assertions
- 100% passing

**Categories:**
- Compile-time type tests
- Runtime type guards
- Result type patterns
- Integration scenarios

**Run tests:**
```bash
bun test src/types/__tests__/utils.test.ts
```

---

## Best Practices

### 1. Import from Barrel

✅ **Good:**
```typescript
import type { Optional, NullableId } from "@/types";
```

❌ **Avoid:**
```typescript
import type { Optional } from "@/types/utils";
```

### 2. Use Semantic Names

```typescript
// ✅ Clear intent
data: Optional<User>        // Can be undefined
userId: Nullable<string>    // Can be null
searchTerm: Maybe<string>   // Can be null or undefined

// ❌ Ambiguous
data: User | undefined
userId: string | null
```

### 3. Combine Type Guards

```typescript
import { isDefined, isNonEmptyArray } from "@/types";

if (isDefined(data) && isNonEmptyArray(data.items)) {
  // TypeScript knows both are defined and non-empty
  const first = data.items[0]; // Safe!
}
```

### 4. Use Result Types for Operations

```typescript
// ✅ Explicit error handling
async function operation(): Promise<Result<Data, Error>> {
  // ... implementation
}

// ❌ Implicit error handling
async function operation(): Promise<Data> {
  // ... implementation (can throw)
}
```

---

## Migration Strategy

### Phase 1: New Code (Immediate)
- Use utilities in all new files
- Apply to new hooks and components
- Set team standard

### Phase 2: High-Traffic Files (Week 1-2)
- Migrate frequently edited hooks
- Update common components
- Apply to shared utilities

### Phase 3: Gradual Refactoring (Ongoing)
- Refactor during feature work
- Update during bug fixes
- Clean up during reviews

**See [`UTILITY_STATS.md`](./UTILITY_STATS.md) for detailed rollout plan.**

---

## FAQ

### Q: Do these utilities add runtime overhead?

**A:** No. All type utilities are compile-time only and completely erased in the JavaScript output. Zero runtime cost.

### Q: Can I mix old and new patterns?

**A:** Yes. The utilities are compatible with existing code. Migrate incrementally.

### Q: What's the difference between `Optional`, `Nullable`, and `Maybe`?

**A:**
- `Optional<T>` = `T | undefined` (use for function parameters)
- `Nullable<T>` = `T | null` (use for database values)
- `Maybe<T>` = `T | null | undefined` (use when both are possible)

### Q: Should I use `Result<T, E>` everywhere?

**A:** Use `Result` for operations that can fail in expected ways (validation, API calls). For unexpected errors, throwing is still appropriate.

### Q: How do I contribute new utilities?

**A:**
1. Add to `utils.ts` with JSDoc examples
2. Add test cases in `__tests__/utils.test.ts`
3. Update documentation
4. Export from `index.ts`

---

## Statistics

| Metric | Value |
|--------|-------|
| Total utilities | 50+ |
| Type guards | 10 |
| Documentation lines | 2,500+ |
| Test cases | 29 |
| Test assertions | 76 |
| Migration opportunities | 80+ |

---

## Resources

- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/
- **Utility Types:** https://www.typescriptlang.org/docs/handbook/utility-types.html
- **Type Guards:** https://www.typescriptlang.org/docs/handbook/2/narrowing.html

---

## Contributing

When adding new types:
1. Place in appropriate category file
2. Export from `index.ts` barrel
3. Add type guards if applicable
4. Document with JSDoc examples
5. Add test cases

When adding utilities:
1. Add to `utils.ts` with full documentation
2. Write test cases
3. Update `UTILS_GUIDE.md`
4. Update this README

---

## License

Part of the LTCG monorepo. Internal use only.

---

**Last Updated:** 2026-01-28
**Maintainer:** Engineering Team
**Version:** 1.0.0
