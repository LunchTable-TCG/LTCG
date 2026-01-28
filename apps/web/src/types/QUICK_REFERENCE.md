# Type Utilities Quick Reference

**One-page cheat sheet for common type utilities**

---

## Import Statement

```typescript
import type {
  // Most commonly used
  Optional,
  Nullable,
  Maybe,
  NullableId,
  OptionalId,
  NonEmptyArray,
  AsyncFunction,
} from "@/types";

import {
  // Runtime helpers
  isDefined,
  isNonEmptyArray,
  ok,
  err,
  isOk,
} from "@/types";
```

---

## Top 10 Most Useful Utilities

### 1. `Optional<T>` - Values that can be undefined

```typescript
// Before: string | undefined
// After:  Optional<string>

function getName(): Optional<string> {
  return user?.name;
}
```

### 2. `Nullable<T>` - Values that can be null

```typescript
// Before: User | null
// After:  Nullable<User>

let user: Nullable<User> = null;
```

### 3. `Maybe<T>` - Values that can be null OR undefined

```typescript
// Before: User | null | undefined
// After:  Maybe<User>

function findUser(id: string): Maybe<User> {
  return cache.get(id);
}
```

### 4. `NullableId<T>` - Convex IDs that can be null

```typescript
// Before: Id<"userDecks"> | null
// After:  NullableId<"userDecks">

function useDeck(deckId: NullableId<"userDecks">) {
  // ...
}
```

### 5. `isDefined()` - Type guard for non-null/undefined

```typescript
const value: Optional<string> = getValue();

if (isDefined(value)) {
  // TypeScript knows value is string here
  console.log(value.length);
}
```

### 6. `isNonEmptyArray()` - Type guard for arrays with elements

```typescript
const cards: Card[] = getCards();

if (isNonEmptyArray(cards)) {
  // TypeScript knows cards[0] exists
  const first = cards[0]; // Safe!
}
```

### 7. `Result<T, E>` - Type-safe error handling

```typescript
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return err("Division by zero");
  return ok(a / b);
}

const result = divide(10, 2);
if (isOk(result)) {
  console.log(result.value); // 5
}
```

### 8. `AsyncFunction<P, R>` - Type-safe async functions

```typescript
// Before: (id: string) => Promise<User>
// After:  AsyncFunction<[string], User>

type FetchUser = AsyncFunction<[string], User>;
```

### 9. `OptionalExcept<T, K>` - Partial with required keys

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Make everything optional except id
type UpdateUser = OptionalExcept<User, "id">;
// { id: string; name?: string; email?: string; }
```

### 10. `ValueOf<T>` - Extract union from object values

```typescript
const Status = {
  ACTIVE: "active",
  IDLE: "idle",
  OFFLINE: "offline",
} as const;

type StatusValue = ValueOf<typeof Status>;
// "active" | "idle" | "offline"
```

---

## Common Patterns

### Hook Return Types

```typescript
import type { Optional, AsyncFunction } from "@/types";

interface UseDataReturn {
  // Query results (can be undefined while loading)
  data: Optional<User>;

  // Mutations (always return promises)
  updateUser: AsyncFunction<[Partial<User>], void>;
  deleteUser: AsyncFunction<[], void>;

  isLoading: boolean;
  error: Optional<string>;
}
```

### Component Props

```typescript
import type { NullableId, Optional } from "@/types";

interface CardProps {
  // Required ID
  cardId: Id<"cards">;

  // Optional ID (deck context)
  deckId: NullableId<"userDecks">;

  // Optional props
  onSelect: Optional<(id: string) => void>;
  className: Optional<string>;
}
```

### Form Data

```typescript
import type { RequireProps } from "@/types";

interface UserData {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
}

// Registration requires email and password
type RegistrationData = RequireProps<UserData, "email" | "password">;
```

### API Responses

```typescript
import type { Result } from "@/types";
import { ok, err } from "@/types";

async function fetchUser(id: string): Promise<Result<User, ApiError>> {
  try {
    const user = await api.getUser(id);
    return ok(user);
  } catch (error) {
    return err({ code: "NOT_FOUND", message: "User not found" });
  }
}
```

---

## Type Guards Reference

```typescript
import {
  isDefined,      // Filters null and undefined
  isNull,         // Checks for null only
  isUndefined,    // Checks for undefined only
  isString,       // Checks for string
  isNumber,       // Checks for number (excludes NaN)
  isBoolean,      // Checks for boolean
  isFunction,     // Checks for function
  isObject,       // Checks for object (not null, not array)
  isNonEmptyArray,// Checks for array with length > 0
  hasKey,         // Checks if object has key
} from "@/types";

// Usage
if (isDefined(value)) { /* value is defined */ }
if (isNonEmptyArray(arr)) { /* arr[0] is safe */ }
if (hasKey(obj, "userId")) { /* obj.userId exists */ }
```

---

## Object Utilities Reference

```typescript
import type {
  RequireProps,    // Make specific props required
  MakeOptional,    // Make specific props optional
  OptionalExcept,  // Make all optional except specified
  DeepReadonly,    // Deep readonly
  PickByType,      // Pick properties by type
  OmitByType,      // Omit properties by type
} from "@/types";

// Examples
type WithId = RequireProps<User, "id">;
type Partial = MakeOptional<User, "email">;
type Update = OptionalExcept<User, "id">;
type Immutable = DeepReadonly<Config>;
type Strings = PickByType<User, string>;
type NonStrings = OmitByType<User, string>;
```

---

## Array Utilities Reference

```typescript
import type {
  ArrayElement,    // Extract element type
  NonEmptyArray,   // Array with at least one element
  ImmutableArray,  // Readonly array
  Tuple,          // Fixed-length tuple
} from "@/types";

// Examples
type Users = User[];
type User = ArrayElement<Users>;

type Players = NonEmptyArray<Player>; // [Player, ...Player[]]
type ReadonlyCards = ImmutableArray<Card>;
type Coords = Tuple<number, 3>; // [number, number, number]
```

---

## Function Utilities Reference

```typescript
import type {
  AsyncReturnType,  // Extract async return type
  FirstParameter,   // Extract first param
  VoidFunction,     // Void return function
  AsyncFunction,    // Async function
} from "@/types";

// Examples
async function getUser(): Promise<User> { ... }
type Result = AsyncReturnType<typeof getUser>; // User

function process(id: string, data: any) { ... }
type Id = FirstParameter<typeof process>; // string

type Handler = VoidFunction<[Event]>; // (event: Event) => void
type Fetcher = AsyncFunction<[string], User>; // (id: string) => Promise<User>
```

---

## Convex ID Utilities Reference

```typescript
import type {
  OptionalId,      // Id<T> | undefined
  NullableId,      // Id<T> | null
  MaybeId,         // Id<T> | null | undefined
  UnionIds,        // Union of multiple IDs
} from "@/types";

// Examples
type UserId = OptionalId<"users">;
type DeckId = NullableId<"userDecks">;
type GameId = MaybeId<"games">;
type EntityId = UnionIds<["users", "games", "decks"]>;
```

---

## Migration Tips

### 1. Start with function parameters
```typescript
// Before
function process(id: Id<"users"> | null) {}

// After
function process(id: NullableId<"users">) {}
```

### 2. Update hook return types
```typescript
// Before
data: User | undefined;

// After
data: Optional<User>;
```

### 3. Use type guards
```typescript
// Before
if (value !== null && value !== undefined) {}

// After
if (isDefined(value)) {}
```

### 4. Adopt Result types for errors
```typescript
// Before
async function fetch() {
  try {
    return await api.call();
  } catch (e) {
    throw e;
  }
}

// After
async function fetch(): Promise<Result<Data, Error>> {
  try {
    return ok(await api.call());
  } catch (e) {
    return err(e as Error);
  }
}
```

---

## Performance

✅ Zero runtime cost
✅ No bundle size impact
✅ Type-checking only
✅ Fully tree-shakeable

---

## See Also

- **Full Guide:** `UTILS_GUIDE.md`
- **Statistics:** `UTILITY_STATS.md`
- **Tests:** `__tests__/utils.test.ts`
- **Source:** `utils.ts`
