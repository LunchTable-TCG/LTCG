/**
 * Type utility helpers
 *
 * Common type transformations and helpers used throughout the application.
 * These utilities reduce boilerplate and improve type safety across the codebase.
 */

import type { Id } from "@convex/_generated/dataModel";

// =============================================================================
// Nullability Utilities
// =============================================================================

/**
 * Make a type nullable (allows null but not undefined)
 * @example
 * ```typescript
 * type UserId = Nullable<Id<"users">>; // Id<"users"> | null
 * const id: UserId = null; // valid
 * const id2: UserId = undefined; // error
 * ```
 */
export type Nullable<T> = T | null;

/**
 * Make a type optional (allows undefined but not null)
 * @example
 * ```typescript
 * type OptionalEmail = Optional<string>; // string | undefined
 * const email: OptionalEmail = undefined; // valid
 * const email2: OptionalEmail = null; // error
 * ```
 */
export type Optional<T> = T | undefined;

/**
 * Make a type nullable or undefined
 * @example
 * ```typescript
 * type MaybeUser = Maybe<User>; // User | null | undefined
 * const user: MaybeUser = null; // valid
 * const user2: MaybeUser = undefined; // valid
 * ```
 */
export type Maybe<T> = T | null | undefined;

/**
 * Remove null and undefined from a type
 * @example
 * ```typescript
 * type DefiniteUser = NonNullish<User | null | undefined>; // User
 * function processUser(user: Maybe<User>) {
 *   if (isDefined(user)) {
 *     // user is now NonNullish<User>
 *   }
 * }
 * ```
 */
export type NonNullish<T> = NonNullable<T>;

// =============================================================================
// Object Utilities
// =============================================================================

/**
 * Make specific properties of T required while keeping others as-is
 * @example
 * ```typescript
 * interface User {
 *   id?: string;
 *   name?: string;
 *   email?: string;
 * }
 * type UserWithId = RequireProps<User, "id">;
 * // { id: string; name?: string; email?: string; }
 * ```
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties of T optional while keeping others as-is
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 * type PartialUser = MakeOptional<User, "email">;
 * // { id: string; name: string; email?: string; }
 * ```
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make all properties of T optional except specified ones
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 * type PartialUserWithId = OptionalExcept<User, "id">;
 * // { id: string; name?: string; email?: string; }
 * ```
 */
export type OptionalExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Make all properties readonly and deeply immutable
 * @example
 * ```typescript
 * interface User {
 *   profile: { name: string };
 * }
 * type ReadonlyUser = DeepReadonly<User>;
 * // { readonly profile: { readonly name: string } }
 * ```
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object
    ? T[P] extends Function
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

/**
 * Make all properties mutable (remove readonly)
 * @example
 * ```typescript
 * type ReadonlyUser = { readonly name: string };
 * type MutableUser = Mutable<ReadonlyUser>; // { name: string }
 * ```
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Pick properties from T that are assignable to U
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 * type StringProps = PickByType<User, string>; // { name: string }
 * ```
 */
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

/**
 * Omit properties from T that are assignable to U
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   age: number;
 *   isActive: boolean;
 * }
 * type NonStringProps = OmitByType<User, string>;
 * // { age: number; isActive: boolean }
 * ```
 */
export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P];
};

// =============================================================================
// Convex ID Utilities
// =============================================================================

/**
 * Extract the table name from a Convex ID type
 * @example
 * ```typescript
 * type TableName = ExtractTableName<Id<"users">>; // "users"
 * ```
 */
export type ExtractTableName<T> = T extends Id<infer U> ? U : never;

/**
 * Create a union of multiple Convex ID types
 * @example
 * ```typescript
 * type GameEntityId = UnionIds<["users", "games", "decks"]>;
 * // Id<"users"> | Id<"games"> | Id<"decks">
 * ```
 */
export type UnionIds<T extends readonly string[]> = {
  // @ts-ignore - T[K] is constrained to string but TypeScript can't verify it's a table name
  [K in keyof T]: T[K] extends string ? Id<T[K]> : never;
}[number];

/**
 * Make a Convex ID optional (allows undefined)
 * @example
 * ```typescript
 * type OptionalDeckId = OptionalId<"userDecks">;
 * // Id<"userDecks"> | undefined
 * ```
 */
// @ts-ignore - T is constrained to string but TypeScript can't verify it's a table name
export type OptionalId<T extends string> = Optional<Id<T>>;

/**
 * Make a Convex ID nullable (allows null)
 * @example
 * ```typescript
 * type NullableDeckId = NullableId<"userDecks">;
 * // Id<"userDecks"> | null
 * ```
 */
// @ts-ignore - T is constrained to string but TypeScript can't verify it's a table name
export type NullableId<T extends string> = Nullable<Id<T>>;

/**
 * Make a Convex ID maybe (allows null or undefined)
 * @example
 * ```typescript
 * type MaybeDeckId = MaybeId<"userDecks">;
 * // Id<"userDecks"> | null | undefined
 * ```
 */
// @ts-ignore - T is constrained to string but TypeScript can't verify it's a table name
export type MaybeId<T extends string> = Maybe<Id<T>>;

// =============================================================================
// Array Utilities
// =============================================================================

/**
 * Get the element type from an array type
 * @example
 * ```typescript
 * type Users = User[];
 * type User = ArrayElement<Users>; // User
 * ```
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : T;

/**
 * Make an array type readonly (immutable)
 * @example
 * ```typescript
 * type ReadonlyUsers = ImmutableArray<User>; // readonly User[]
 * ```
 */
export type ImmutableArray<T> = readonly T[];

/**
 * Non-empty array type (at least one element required)
 * @example
 * ```typescript
 * type Players = NonEmptyArray<User>; // [User, ...User[]]
 * const players: Players = []; // error
 * const players2: Players = [user]; // valid
 * ```
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Tuple of specific length filled with type T
 * @example
 * ```typescript
 * type Coordinates = Tuple<number, 3>; // [number, number, number]
 * ```
 */
export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

// =============================================================================
// Function Utilities
// =============================================================================

/**
 * Extract return type from async function
 * @example
 * ```typescript
 * async function fetchUser(): Promise<User> { ... }
 * type UserResult = AsyncReturnType<typeof fetchUser>; // User
 * ```
 */
// Intentional 'any' - generic constraint for variadic function parameters
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : never;

/**
 * Extract parameters from a function type as tuple
 * @example
 * ```typescript
 * function greet(name: string, age: number) { ... }
 * type Params = FunctionParams<typeof greet>; // [string, number]
 * ```
 */
// Intentional 'any' - generic constraint for variadic function parameters
export type FunctionParams<T extends (...args: any) => any> = Parameters<T>;

/**
 * Create a function type with void return
 * @example
 * ```typescript
 * type Handler = VoidFunction<[string, number]>;
 * // (args_0: string, args_1: number) => void
 * ```
 */
// Intentional 'any[]' - generic constraint for tuple/array parameters with default
export type VoidFunction<P extends any[] = []> = (...args: P) => void;

/**
 * Create an async function type
 * @example
 * ```typescript
 * type FetchUser = AsyncFunction<[string], User>;
 * // (args_0: string) => Promise<User>
 * ```
 */
// Intentional 'any[]' - generic constraint for tuple/array parameters
export type AsyncFunction<P extends any[], R> = (...args: P) => Promise<R>;

/**
 * Extract the first parameter type from a function
 * @example
 * ```typescript
 * function process(id: string, data: object) { ... }
 * type FirstParam = FirstParameter<typeof process>; // string
 * ```
 */
// Intentional 'any' - generic constraint for variadic function parameters
export type FirstParameter<T extends (...args: any) => any> = Parameters<T>[0];

// =============================================================================
// Union & Intersection Utilities
// =============================================================================

/**
 * Create a union from object values
 * @example
 * ```typescript
 * const Status = { Active: "active", Idle: "idle" } as const;
 * type StatusValue = ValueOf<typeof Status>; // "active" | "idle"
 * ```
 */
export type ValueOf<T> = T[keyof T];

/**
 * Extract keys from T that have value type V
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   age: number;
 *   email: string;
 * }
 * type StringKeys = KeysOfType<User, string>; // "name" | "email"
 * ```
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Make a union exhaustive (force handling of all cases)
 * @example
 * ```typescript
 * type Action = "create" | "update" | "delete";
 * function handle(action: Action): Exhaustive<Action> {
 *   switch (action) {
 *     case "create": return;
 *     case "update": return;
 *     // missing "delete" will cause type error
 *   }
 * }
 * ```
 */
export type Exhaustive<T extends string, U extends T = T> = U;

/**
 * Convert union to intersection
 * @example
 * ```typescript
 * type A = { a: string };
 * type B = { b: number };
 * type Combined = UnionToIntersection<A | B>; // { a: string } & { b: number }
 * ```
 */
// Intentional 'any' - distributive conditional check required for union distribution
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// =============================================================================
// Conditional Utilities
// =============================================================================

/**
 * If T is never, return F, otherwise return T
 * @example
 * ```typescript
 * type Result = IfNever<never, string>; // string
 * type Result2 = IfNever<number, string>; // number
 * ```
 */
export type IfNever<T, F> = [T] extends [never] ? F : T;

/**
 * If T extends U, return A, otherwise return B
 * @example
 * ```typescript
 * type Result = IfExtends<string, string | number, "yes", "no">; // "yes"
 * ```
 */
export type IfExtends<T, U, A, B> = T extends U ? A : B;

/**
 * If T is any, return A, otherwise return B
 * @example
 * ```typescript
 * type Result = IfAny<any, "any", "not_any">; // "any"
 * ```
 */
export type IfAny<T, A, B> = 0 extends 1 & T ? A : B;

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Convert string to uppercase type
 * @example
 * ```typescript
 * type Upper = Uppercase<"hello">; // "HELLO"
 * ```
 */
export type UppercaseString<T extends string> = Uppercase<T>;

/**
 * Convert string to lowercase type
 * @example
 * ```typescript
 * type Lower = LowercaseString<"HELLO">; // "hello"
 * ```
 */
export type LowercaseString<T extends string> = Lowercase<T>;

/**
 * Convert string to capitalize type
 * @example
 * ```typescript
 * type Cap = CapitalizeString<"hello">; // "Hello"
 * ```
 */
export type CapitalizeString<T extends string> = Capitalize<T>;

/**
 * Split string into tuple
 * @example
 * ```typescript
 * type Parts = Split<"user.profile.name", ".">; // ["user", "profile", "name"]
 * ```
 */
export type Split<S extends string, D extends string> = S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

// =============================================================================
// Branded Types (Nominal Typing)
// =============================================================================

/**
 * Create a branded type for nominal typing
 * @example
 * ```typescript
 * type UserId = Brand<string, "UserId">;
 * type ProductId = Brand<string, "ProductId">;
 *
 * const userId: UserId = "123" as UserId;
 * const productId: ProductId = userId; // error - different brands
 * ```
 */
export type Brand<T, B> = T & { __brand: B };

/**
 * Helper to create branded value
 * @example
 * ```typescript
 * type UserId = Brand<string, "UserId">;
 * const userId = brand<UserId>("user123");
 * ```
 */
// Generic constraint requires 'unknown' for the base type - allows any branded type
export function brand<T extends Brand<unknown, unknown>>(value: unknown): T {
  return value as T;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if value is defined (not null or undefined)
 * @example
 * ```typescript
 * const value: string | undefined = getValue();
 * if (isDefined(value)) {
 *   // value is string
 * }
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty array
 * @example
 * ```typescript
 * const items: User[] = getUsers();
 * if (isNonEmptyArray(items)) {
 *   // items is [User, ...User[]]
 *   const first = items[0]; // safe access
 * }
 * ```
 */
export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if object has a specific key
 * @example
 * ```typescript
 * const obj = { name: "John" };
 * if (hasKey(obj, "name")) {
 *   // obj is Record<"name", unknown>
 * }
 * ```
 */
export function hasKey<K extends string>(obj: object, key: K): obj is Record<K, unknown> {
  return key in obj;
}

/**
 * Check if value is null
 * @example
 * ```typescript
 * if (isNull(value)) {
 *   // value is null
 * }
 * ```
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Check if value is undefined
 * @example
 * ```typescript
 * if (isUndefined(value)) {
 *   // value is undefined
 * }
 * ```
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Check if value is a function
 * @example
 * ```typescript
 * if (isFunction(value)) {
 *   value(); // safe to call
 * }
 * ```
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

/**
 * Check if value is a string
 * @example
 * ```typescript
 * if (isString(value)) {
 *   // value is string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number
 * @example
 * ```typescript
 * if (isNumber(value)) {
 *   // value is number
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Check if value is a boolean
 * @example
 * ```typescript
 * if (isBoolean(value)) {
 *   // value is boolean
 * }
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Check if value is an object (not null, not array)
 * @example
 * ```typescript
 * if (isObject(value)) {
 *   // value is Record<string, unknown>
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// =============================================================================
// Result/Either Types
// =============================================================================

/**
 * Success result type
 * @example
 * ```typescript
 * type UserResult = Result<User, Error>;
 * const success: UserResult = { ok: true, value: user };
 * ```
 */
export type Success<T> = { ok: true; value: T };

/**
 * Failure result type
 * @example
 * ```typescript
 * type UserResult = Result<User, Error>;
 * const failure: UserResult = { ok: false, error: new Error("Not found") };
 * ```
 */
export type Failure<E> = { ok: false; error: E };

/**
 * Result type for operations that can succeed or fail
 * @example
 * ```typescript
 * function fetchUser(id: string): Result<User, Error> {
 *   try {
 *     const user = getUser(id);
 *     return { ok: true, value: user };
 *   } catch (error) {
 *     return { ok: false, error: error as Error };
 *   }
 * }
 * ```
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Helper to create success result
 * @example
 * ```typescript
 * const result = ok(user);
 * ```
 */
export function ok<T>(value: T): Success<T> {
  return { ok: true, value };
}

/**
 * Helper to create failure result
 * @example
 * ```typescript
 * const result = err(new Error("Failed"));
 * ```
 */
export function err<E>(error: E): Failure<E> {
  return { ok: false, error };
}

/**
 * Check if result is success
 * @example
 * ```typescript
 * const result = fetchUser("123");
 * if (isOk(result)) {
 *   console.log(result.value); // User
 * }
 * ```
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.ok === true;
}

/**
 * Check if result is failure
 * @example
 * ```typescript
 * const result = fetchUser("123");
 * if (isErr(result)) {
 *   console.error(result.error); // Error
 * }
 * ```
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.ok === false;
}
