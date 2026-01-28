# Type Utils Usage Guide

This guide demonstrates how to use the type utilities from `./utils.ts` to improve type safety and reduce boilerplate across the codebase.

## Table of Contents

1. [Nullability Utilities](#nullability-utilities)
2. [Object Utilities](#object-utilities)
3. [Convex ID Utilities](#convex-id-utilities)
4. [Array Utilities](#array-utilities)
5. [Function Utilities](#function-utilities)
6. [Union & Intersection Utilities](#union--intersection-utilities)
7. [Type Guards](#type-guards)
8. [Result Types](#result-types)
9. [Migration Examples](#migration-examples)

---

## Nullability Utilities

### `Nullable<T>`

**Before:**
```typescript
function processUser(userId: Id<"users"> | null) {
  // ...
}
```

**After:**
```typescript
import type { Nullable } from "@/types";

function processUser(userId: Nullable<Id<"users">>) {
  // ...
}
```

### `Optional<T>`

**Before:**
```typescript
interface HookReturn {
  data: User | undefined;
  error: string | undefined;
}
```

**After:**
```typescript
import type { Optional } from "@/types";

interface HookReturn {
  data: Optional<User>;
  error: Optional<string>;
}
```

### `Maybe<T>` - For values that can be null OR undefined

**Before:**
```typescript
function findUser(id: string): User | null | undefined {
  // ...
}
```

**After:**
```typescript
import type { Maybe } from "@/types";

function findUser(id: string): Maybe<User> {
  // ...
}
```

### `isDefined` - Type guard to narrow nullable values

**Before:**
```typescript
const user: User | undefined = getUser();
if (user !== null && user !== undefined) {
  console.log(user.name); // safe
}
```

**After:**
```typescript
import { isDefined } from "@/types";

const user: User | undefined = getUser();
if (isDefined(user)) {
  console.log(user.name); // TypeScript knows user is defined
}
```

---

## Object Utilities

### `RequireProps<T, K>` - Make specific properties required

**Before:**
```typescript
interface User {
  id?: string;
  name?: string;
  email?: string;
}

// Need a user with required id
type UserWithId = {
  id: string;
  name?: string;
  email?: string;
};
```

**After:**
```typescript
import type { RequireProps } from "@/types";

interface User {
  id?: string;
  name?: string;
  email?: string;
}

type UserWithId = RequireProps<User, "id">;
// { id: string; name?: string; email?: string }
```

### `MakeOptional<T, K>` - Make specific properties optional

**Before:**
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// For update operations, email is optional
type UserUpdate = {
  id: string;
  name: string;
  email?: string;
};
```

**After:**
```typescript
import type { MakeOptional } from "@/types";

interface User {
  id: string;
  name: string;
  email: string;
}

type UserUpdate = MakeOptional<User, "email">;
```

### `OptionalExcept<T, K>` - Make everything optional except specific keys

**Before:**
```typescript
interface GameState {
  gameId: string;
  turn: number;
  phase: string;
  currentPlayer: string;
}

// For partial updates, only gameId is required
type GameStateUpdate = {
  gameId: string;
  turn?: number;
  phase?: string;
  currentPlayer?: string;
};
```

**After:**
```typescript
import type { OptionalExcept } from "@/types";

interface GameState {
  gameId: string;
  turn: number;
  phase: string;
  currentPlayer: string;
}

type GameStateUpdate = OptionalExcept<GameState, "gameId">;
```

### `PickByType<T, U>` - Pick properties by their type

**Before:**
```typescript
interface CardData {
  name: string;
  attack: number;
  defense: number;
  description: string;
  cost: number;
}

// Get only string properties
type StringProps = {
  name: string;
  description: string;
};
```

**After:**
```typescript
import type { PickByType } from "@/types";

interface CardData {
  name: string;
  attack: number;
  defense: number;
  description: string;
  cost: number;
}

type StringProps = PickByType<CardData, string>;
// { name: string; description: string }
```

### `DeepReadonly<T>` - Make nested objects immutable

**Before:**
```typescript
interface Config {
  settings: {
    volume: number;
    theme: string;
  };
}

// Manual deep readonly
type ReadonlyConfig = {
  readonly settings: {
    readonly volume: number;
    readonly theme: string;
  };
};
```

**After:**
```typescript
import type { DeepReadonly } from "@/types";

interface Config {
  settings: {
    volume: number;
    theme: string;
  };
}

type ReadonlyConfig = DeepReadonly<Config>;
// All properties and nested properties are readonly
```

---

## Convex ID Utilities

### `NullableId<T>` - Nullable Convex IDs

**Before:**
```typescript
export function useDeck(deckId: Id<"userDecks"> | null) {
  // ...
}

export function useValidateDeck(deckId: Id<"userDecks"> | null) {
  // ...
}
```

**After:**
```typescript
import type { NullableId } from "@/types";

export function useDeck(deckId: NullableId<"userDecks">) {
  // ...
}

export function useValidateDeck(deckId: NullableId<"userDecks">) {
  // ...
}
```

### `OptionalId<T>` - Optional Convex IDs

**Before:**
```typescript
function fetchGame(gameId: Id<"games"> | undefined) {
  // ...
}
```

**After:**
```typescript
import type { OptionalId } from "@/types";

function fetchGame(gameId: OptionalId<"games">) {
  // ...
}
```

### `MaybeId<T>` - IDs that can be null or undefined

**Before:**
```typescript
function processLobby(lobbyId: Id<"gameLobbies"> | null | undefined) {
  // ...
}
```

**After:**
```typescript
import type { MaybeId } from "@/types";

function processLobby(lobbyId: MaybeId<"gameLobbies">) {
  // ...
}
```

### `UnionIds<T>` - Create union of multiple ID types

**Before:**
```typescript
type GameEntityId = Id<"users"> | Id<"games"> | Id<"decks"> | Id<"cards">;
```

**After:**
```typescript
import type { UnionIds } from "@/types";

type GameEntityId = UnionIds<["users", "games", "decks", "cards"]>;
```

---

## Array Utilities

### `NonEmptyArray<T>` - Arrays that must have at least one element

**Before:**
```typescript
function processDeck(cards: Card[]) {
  // Runtime check needed
  if (cards.length === 0) {
    throw new Error("Deck must have cards");
  }
  const firstCard = cards[0]; // Could be undefined
}
```

**After:**
```typescript
import type { NonEmptyArray } from "@/types";
import { isNonEmptyArray } from "@/types";

function processDeck(cards: NonEmptyArray<Card>) {
  const firstCard = cards[0]; // TypeScript knows this exists
}

// At call site with validation
const cards: Card[] = getCards();
if (isNonEmptyArray(cards)) {
  processDeck(cards); // Type-safe
}
```

### `ArrayElement<T>` - Extract array element type

**Before:**
```typescript
type Users = User[];
type User = Users[number]; // Verbose
```

**After:**
```typescript
import type { ArrayElement } from "@/types";

type Users = User[];
type User = ArrayElement<Users>;
```

### `ImmutableArray<T>` - Readonly arrays

**Before:**
```typescript
function displayCards(cards: readonly Card[]) {
  // ...
}
```

**After:**
```typescript
import type { ImmutableArray } from "@/types";

function displayCards(cards: ImmutableArray<Card>) {
  // ...
}
```

---

## Function Utilities

### `AsyncReturnType<T>` - Extract return type from async functions

**Before:**
```typescript
async function fetchUser(id: string): Promise<User> {
  // ...
}

type UserResult = Awaited<ReturnType<typeof fetchUser>>; // Verbose
```

**After:**
```typescript
import type { AsyncReturnType } from "@/types";

async function fetchUser(id: string): Promise<User> {
  // ...
}

type UserResult = AsyncReturnType<typeof fetchUser>; // User
```

### `FirstParameter<T>` - Extract first parameter type

**Before:**
```typescript
function processCard(card: Card, options: Options) {
  // ...
}

type CardParam = Parameters<typeof processCard>[0];
```

**After:**
```typescript
import type { FirstParameter } from "@/types";

function processCard(card: Card, options: Options) {
  // ...
}

type CardParam = FirstParameter<typeof processCard>; // Card
```

### `VoidFunction<P>` - Type-safe void functions

**Before:**
```typescript
type ClickHandler = (event: MouseEvent, data: string) => void;
```

**After:**
```typescript
import type { VoidFunction } from "@/types";

type ClickHandler = VoidFunction<[MouseEvent, string]>;
```

### `AsyncFunction<P, R>` - Type-safe async functions

**Before:**
```typescript
type FetchUser = (id: string) => Promise<User>;
```

**After:**
```typescript
import type { AsyncFunction } from "@/types";

type FetchUser = AsyncFunction<[string], User>;
```

---

## Union & Intersection Utilities

### `ValueOf<T>` - Extract union of object values

**Before:**
```typescript
const GamePhase = {
  DRAW: "draw",
  MAIN: "main",
  BATTLE: "battle",
  END: "end",
} as const;

type Phase = "draw" | "main" | "battle" | "end"; // Manual
```

**After:**
```typescript
import type { ValueOf } from "@/types";

const GamePhase = {
  DRAW: "draw",
  MAIN: "main",
  BATTLE: "battle",
  END: "end",
} as const;

type Phase = ValueOf<typeof GamePhase>; // "draw" | "main" | "battle" | "end"
```

### `KeysOfType<T, V>` - Get keys that have specific value type

**Before:**
```typescript
interface Stats {
  wins: number;
  losses: number;
  username: string;
  rating: number;
}

type NumericKeys = "wins" | "losses" | "rating"; // Manual
```

**After:**
```typescript
import type { KeysOfType } from "@/types";

interface Stats {
  wins: number;
  losses: number;
  username: string;
  rating: number;
}

type NumericKeys = KeysOfType<Stats, number>; // "wins" | "losses" | "rating"
```

---

## Type Guards

### Common Type Guards

```typescript
import {
  isDefined,
  isNull,
  isUndefined,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isFunction,
  isNonEmptyArray,
  hasKey,
} from "@/types";

// Check for defined values
const value: string | undefined = getValue();
if (isDefined(value)) {
  // value is string
}

// Check arrays
const items: Card[] = getCards();
if (isNonEmptyArray(items)) {
  // items is [Card, ...Card[]]
  const first = items[0]; // Safe access
}

// Check object keys
const obj: unknown = getData();
if (isObject(obj) && hasKey(obj, "userId")) {
  // obj is Record<"userId", unknown>
  console.log(obj.userId);
}

// Primitive checks
if (isString(value)) { /* value is string */ }
if (isNumber(value)) { /* value is number */ }
if (isBoolean(value)) { /* value is boolean */ }
```

---

## Result Types

### Using Result<T, E> for Error Handling

**Before:**
```typescript
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) {
    throw new Error("User not found");
  }
  return response.json();
}

// Usage - needs try/catch
try {
  const user = await fetchUser("123");
  console.log(user.name);
} catch (error) {
  console.error(error);
}
```

**After:**
```typescript
import type { Result } from "@/types";
import { ok, err, isOk, isErr } from "@/types";

async function fetchUser(id: string): Promise<Result<User, Error>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return err(new Error("User not found"));
    }
    const user = await response.json();
    return ok(user);
  } catch (error) {
    return err(error as Error);
  }
}

// Usage - no try/catch needed
const result = await fetchUser("123");
if (isOk(result)) {
  console.log(result.value.name); // Type-safe access
} else {
  console.error(result.error.message); // Type-safe error
}
```

---

## Migration Examples

### Example 1: Hook Return Types

**Before:**
```typescript
// apps/web/src/hooks/game/useSpectator.ts
export interface UseSpectatorReturn {
  activeGames: ReturnType<typeof useQuery<typeof api.gameplay.games.queries.listActiveGames>> | undefined;
  spectatorView: ReturnType<typeof useQuery<typeof api.gameplay.games.queries.getGameSpectatorView>> | undefined;
  joinAsSpectator: (lobbyId: Id<"gameLobbies">) => Promise<void>;
  leaveAsSpectator: (lobbyId: Id<"gameLobbies">) => Promise<void>;
  isLoading: boolean;
}
```

**After:**
```typescript
import type { Optional, AsyncFunction } from "@/types";

export interface UseSpectatorReturn {
  activeGames: Optional<ReturnType<typeof useQuery<typeof api.gameplay.games.queries.listActiveGames>>>;
  spectatorView: Optional<ReturnType<typeof useQuery<typeof api.gameplay.games.queries.getGameSpectatorView>>>;
  joinAsSpectator: AsyncFunction<[Id<"gameLobbies">], void>;
  leaveAsSpectator: AsyncFunction<[Id<"gameLobbies">], void>;
  isLoading: boolean;
}
```

### Example 2: Deck Builder Hook

**Before:**
```typescript
// apps/web/src/hooks/collection/useDeckBuilder.ts
export interface UseDeckBuilderReturn {
  decks: ReturnType<typeof useQuery<typeof api.decks.getUserDecks>> | undefined;
  isLoading: boolean;
  createDeck: (name: string) => Promise<Id<"userDecks">>;
  saveDeck: (deckId: Id<"userDecks">, cards: Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }>) => Promise<void>;
  renameDeck: (deckId: Id<"userDecks">, newName: string) => Promise<void>;
  deleteDeck: (deckId: Id<"userDecks">) => Promise<void>;
  duplicateDeck: (deckId: Id<"userDecks">, newName?: string) => Promise<Id<"userDecks">>;
  setActiveDeck: (deckId: Id<"userDecks">) => Promise<void>;
}

export function useDeck(deckId: Id<"userDecks"> | null) {
  // ...
}

export function useValidateDeck(deckId: Id<"userDecks"> | null) {
  // ...
}
```

**After:**
```typescript
import type { Optional, NullableId, AsyncFunction } from "@/types";

export interface UseDeckBuilderReturn {
  decks: Optional<ReturnType<typeof useQuery<typeof api.decks.getUserDecks>>>;
  isLoading: boolean;
  createDeck: AsyncFunction<[string], Id<"userDecks">>;
  saveDeck: AsyncFunction<[Id<"userDecks">, Array<{ cardDefinitionId: Id<"cardDefinitions">; quantity: number }>], void>;
  renameDeck: AsyncFunction<[Id<"userDecks">, string], void>;
  deleteDeck: AsyncFunction<[Id<"userDecks">], void>;
  duplicateDeck: AsyncFunction<[Id<"userDecks">, string?], Id<"userDecks">>;
  setActiveDeck: AsyncFunction<[Id<"userDecks">], void>;
}

export function useDeck(deckId: NullableId<"userDecks">) {
  // ...
}

export function useValidateDeck(deckId: NullableId<"userDecks">) {
  // ...
}
```

### Example 3: Friends Hook

**Before:**
```typescript
// apps/web/src/hooks/social/useFriends.ts
export interface UseFriendsReturn {
  friends: Friend[] | undefined;
  incomingRequests: FriendRequest[] | undefined;
  outgoingRequests: FriendRequest[] | undefined;
  blockedUsers: ReturnType<typeof useQuery<typeof api.social.friends.getBlockedUsers>> | undefined;
  // ... mutations
}

export function useSearchUsers(query: string, limit?: number): ReturnType<typeof useQuery<typeof api.social.friends.searchUsers>> | undefined {
  // ...
}
```

**After:**
```typescript
import type { Optional } from "@/types";

export interface UseFriendsReturn {
  friends: Optional<Friend[]>;
  incomingRequests: Optional<FriendRequest[]>;
  outgoingRequests: Optional<FriendRequest[]>;
  blockedUsers: Optional<ReturnType<typeof useQuery<typeof api.social.friends.getBlockedUsers>>>;
  // ... mutations
}

export function useSearchUsers(query: string, limit?: number): Optional<ReturnType<typeof useQuery<typeof api.social.friends.searchUsers>>> {
  // ...
}
```

---

## Best Practices

### 1. Prefer Semantic Names

Use the utility that best describes the intent:
- `Nullable<T>` when null is expected (database queries)
- `Optional<T>` when undefined is expected (function parameters)
- `Maybe<T>` when both are possible

### 2. Use Type Guards with Utilities

```typescript
import type { Maybe } from "@/types";
import { isDefined } from "@/types";

function process(value: Maybe<User>) {
  if (isDefined(value)) {
    // TypeScript knows value is User here
    console.log(value.name);
  }
}
```

### 3. Combine Utilities

```typescript
import type { Optional, NonEmptyArray } from "@/types";

// Optional non-empty array
type Cards = Optional<NonEmptyArray<Card>>;

// Nullable array of optional IDs
type DeckIds = Nullable<Array<OptionalId<"userDecks">>>;
```

### 4. Document Complex Types

```typescript
import type { RequireProps, MakeOptional } from "@/types";

/**
 * User data for registration form
 * - Email and password are required
 * - Profile fields are optional
 */
type RegistrationData = RequireProps<
  MakeOptional<User, "avatar" | "bio">,
  "email" | "password"
>;
```

### 5. Use Result Types for Error Handling

Instead of throwing errors, return `Result<T, E>` for better type safety:

```typescript
import type { Result } from "@/types";
import { ok, err, isOk } from "@/types";

function validateDeck(deck: Deck): Result<ValidDeck, ValidationError> {
  if (deck.cards.length < 40) {
    return err({ code: "DECK_TOO_SMALL", message: "Deck must have at least 40 cards" });
  }
  return ok(deck as ValidDeck);
}

// Usage
const result = validateDeck(myDeck);
if (isOk(result)) {
  // Use result.value
} else {
  // Handle result.error
}
```

---

## Performance Notes

All type utilities in this file are **zero-cost abstractions**. They:
- Only exist at compile time
- Are completely erased in the JavaScript output
- Have no runtime overhead
- Improve developer experience and type safety without affecting bundle size

---

## IDE Integration

These utilities work seamlessly with TypeScript's IntelliSense:
- Hover over types to see their resolved form
- Autocomplete works for all utility types
- JSDoc examples appear in tooltips
- Type errors provide clear, specific messages

---

## Further Reading

- [TypeScript Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Advanced Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [Type Guards and Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
