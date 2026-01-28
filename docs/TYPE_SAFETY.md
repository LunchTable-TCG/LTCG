# Type Safety & Hardening Guide (2026)

Comprehensive guide for maintaining complete type safety across the LTCG monorepo.

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Configuration](#typescript-configuration)
3. [Type Safety Principles](#type-safety-principles)
4. [Convex Type Safety](#convex-type-safety)
5. [API Boundaries & Validation](#api-boundaries--validation)
6. [Error Handling](#error-handling)
7. [Common Patterns](#common-patterns)
8. [Migration Guide](#migration-guide)
9. [CI/CD Integration](#cicd-integration)

---

## Overview

The LTCG monorepo enforces **strict type safety** across all packages:
- ✅ **Root**: Strict TypeScript with all safety flags enabled
- ✅ **Apps (web, admin)**: Maximum type safety with indexed access checks
- ✅ **Convex backend**: Strict typing with runtime validation
- ✅ **Biome linting**: Error on `any` types and unsafe patterns

**Type Safety Metrics** (Current):
- TypeScript strict mode: ✅ Enabled
- noUncheckedIndexedAccess: ✅ Enabled
- noImplicitAny: ✅ Enabled
- Biome noExplicitAny: ✅ Error
- Known `any` types: ~371 occurrences (tracked for migration)

---

## TypeScript Configuration

### Strict Flags Enabled

All `tsconfig.json` files enforce:

```json
{
  "compilerOptions": {
    /* Strict Type-Checking Options */
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    /* Additional Checks */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### What Each Flag Does

| Flag | Purpose | Example |
|------|---------|---------|
| `noUncheckedIndexedAccess` | Array/object access returns `T \| undefined` | `arr[0]` is `string \| undefined`, not `string` |
| `noImplicitAny` | No implicit `any` types allowed | Must explicitly type parameters |
| `strictNullChecks` | `null` and `undefined` are distinct types | Can't assign `null` to `string` |
| `noUnusedLocals` | Error on unused variables | Catch dead code |
| `noUnusedParameters` | Error on unused function parameters | Use `_param` if intentionally unused |
| `noImplicitReturns` | All code paths must return | Prevents missing return statements |
| `noFallthroughCasesInSwitch` | Switch cases must break/return | Prevents accidental fall-through |
| `noPropertyAccessFromIndexSignature` | Use bracket notation for index signatures | `obj[key]` instead of `obj.key` |

---

## Type Safety Principles

### 1. Never Use `any`

**❌ Bad:**
```typescript
function processData(data: any) {
  return data.value;
}
```

**✅ Good:**
```typescript
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}

// Or with generics:
function processData<T extends { value: string }>(data: T): string {
  return data.value;
}
```

### 2. Handle `undefined` from Index Access

With `noUncheckedIndexedAccess` enabled:

**❌ Bad:**
```typescript
const users: User[] = [{ name: "Alice" }];
const firstUser = users[0]; // User | undefined
console.log(firstUser.name); // ❌ Error: Object is possibly 'undefined'
```

**✅ Good - Option 1: Guard**
```typescript
const firstUser = users[0];
if (firstUser) {
  console.log(firstUser.name); // ✅ Safe
}
```

**✅ Good - Option 2: Optional Chaining**
```typescript
console.log(users[0]?.name); // ✅ Safe, returns string | undefined
```

**✅ Good - Option 3: Non-null Assertion (when guaranteed)**
```typescript
// Only if you're 100% sure the array has elements
const firstUser = users[0]!;
console.log(firstUser.name); // ✅ But use sparingly
```

### 3. Use Type Guards

```typescript
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as User).name === "string"
  );
}

function processUnknown(value: unknown) {
  if (isUser(value)) {
    console.log(value.name); // ✅ Type is narrowed to User
  }
}
```

### 4. Avoid Type Assertions

**❌ Bad:**
```typescript
const data = fetchData() as UserData; // Unsafe, could be wrong
```

**✅ Good:**
```typescript
import { z } from "zod";

const UserDataSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

type UserData = z.infer<typeof UserDataSchema>;

const data = UserDataSchema.parse(fetchData()); // ✅ Runtime validation
```

---

## Convex Type Safety

### Schema Validators

**Always use Convex validators** for all database fields:

```typescript
// convex/schema.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    age: v.number(),
    metadata: v.optional(v.object({
      bio: v.string(),
      avatar: v.string(),
    })),
  }).index("by_email", ["email"]),
});
```

### Function Argument Validation

**Always validate function arguments:**

```typescript
// ✅ GOOD: Full validation
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    age: v.number(),
  },
  handler: async (ctx, args) => {
    // args is fully typed: { name: string, email: string, age: number }
    await ctx.db.insert("users", args);
  },
});
```

### Avoid `any` in Convex Helpers

**Current pattern** (from `apps/admin/src/lib/convexHelpers.ts`):

```typescript
// This is acceptable for fixing TS2589 errors
export const apiAny = api as any;

export function useConvexMutation(path: any) {
  return useMutation(path);
}
```

**Better pattern** (for new code):

```typescript
import { FunctionReference } from "convex/server";

export function useConvexMutation<T extends FunctionReference<"mutation">>(path: T) {
  return useMutation(path);
}
```

### Type-Safe Convex Queries

```typescript
// ✅ GOOD: Properly typed query
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<User | null> => {
    return await ctx.db.get(args.userId);
  },
});
```

---

## API Boundaries & Validation

### Input Validation with Zod

For external API endpoints and user input:

```typescript
// lib/validators.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(13).max(120),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { CreateUserSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ✅ Runtime validation
    const validatedData = CreateUserSchema.parse(body);

    // validatedData is now properly typed
    const user = await createUser(validatedData);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Type-Safe API Responses

```typescript
// lib/api/types.ts
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Usage
export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function createErrorResponse(error: string, details?: unknown): ApiError {
  return { success: false, error, details };
}
```

```typescript
// app/api/users/[id]/route.ts
import type { ApiResponse } from "@/lib/api/types";
import { createSuccessResponse, createErrorResponse } from "@/lib/api/responses";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<User>>> {
  try {
    const user = await getUser(params.id);

    if (!user) {
      return NextResponse.json(
        createErrorResponse("User not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(user));
  } catch (error) {
    return NextResponse.json(
      createErrorResponse("Internal server error"),
      { status: 500 }
    );
  }
}
```

---

## Error Handling

### Type-Safe Error Classes

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}
```

### Type-Safe Error Handling

```typescript
// lib/errorHandling.ts
import { AppError, ValidationError, AuthenticationError, NotFoundError } from "./errors";
import { ZodError } from "zod";

export function handleError(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof ZodError) {
    return {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      statusCode: 400,
    };
  }

  if (error instanceof Error) {
    console.error("Unhandled error:", error);
    return {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  console.error("Unknown error type:", error);
  return {
    message: "Unknown error",
    code: "UNKNOWN_ERROR",
    statusCode: 500,
  };
}
```

---

## Common Patterns

### Result Type Pattern

For functions that can fail:

```typescript
// lib/result.ts
export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { success: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// Usage
async function fetchUser(id: string): Promise<Result<User, string>> {
  try {
    const user = await db.users.findById(id);
    if (!user) {
      return err("User not found");
    }
    return ok(user);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Unknown error");
  }
}

// Consuming code
const result = await fetchUser("123");
if (result.success) {
  console.log(result.value.name); // ✅ Typed as User
} else {
  console.error(result.error); // ✅ Typed as string
}
```

### Option Type Pattern

For values that might not exist:

```typescript
// lib/option.ts
export type Option<T> = T | null | undefined;

export function isSome<T>(value: Option<T>): value is T {
  return value !== null && value !== undefined;
}

export function isNone<T>(value: Option<T>): value is null | undefined {
  return value === null || value === undefined;
}

export function unwrap<T>(value: Option<T>, message: string): T {
  if (isNone(value)) {
    throw new Error(message);
  }
  return value;
}

export function unwrapOr<T>(value: Option<T>, defaultValue: T): T {
  return isSome(value) ? value : defaultValue;
}
```

---

## Migration Guide

### Removing `any` Types

**Step 1: Identify `any` types**

```bash
# Find all files with 'any' types
bun run type-check:find-any

# Or manually:
grep -r "any" --include="*.ts" --include="*.tsx" apps/ convex/
```

**Step 2: Replace with proper types**

```typescript
// ❌ Before
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// ✅ After
interface DataItem {
  value: string;
}

function processData(data: DataItem[]): string[] {
  return data.map((item) => item.value);
}
```

**Step 3: Use `unknown` for truly unknown types**

```typescript
// ❌ Before
function handleError(error: any) {
  console.error(error);
}

// ✅ After
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
}
```

### Removing `@ts-ignore` and `@ts-expect-error`

**Step 1: Document why each exists**

```typescript
// ❌ Bad
// @ts-ignore
const value = someUnsafeOperation();

// ✅ Good (temporary)
// @ts-expect-error - TODO: Fix type mismatch with Convex generated types
// Issue: https://github.com/...
const value = someUnsafeOperation();
```

**Step 2: Create issues for each suppression**

Track each suppression as a technical debt item to be resolved.

**Step 3: Fix the root cause**

Instead of suppressing, fix the type issue properly.

---

## CI/CD Integration

### Type Check Scripts

```json
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit && cd apps/web && tsc --noEmit && cd ../admin && tsc --noEmit && cd ../../convex && tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "type-check:find-any": "grep -r \"any\" --include=\"*.ts\" --include=\"*.tsx\" --exclude-dir=\"node_modules\" --exclude-dir=\"_generated\" --exclude-dir=\".next\" .",
    "type-check:strict": "tsc --noEmit --strict --noUncheckedIndexedAccess",
    "lint:types": "biome check --reporter=github ."
  }
}
```

### GitHub Actions Workflow

```yaml
name: Type Safety Check

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Type check
        run: bun run type-check

      - name: Lint with Biome
        run: bun run lint:biome

      - name: Check for any types
        run: |
          COUNT=$(grep -r "any" --include="*.ts" --include="*.tsx" --exclude-dir="node_modules" --exclude-dir="_generated" --exclude-dir=".next" . | wc -l)
          echo "Found $COUNT occurrences of 'any'"
          # Fail if more than current baseline
          if [ $COUNT -gt 400 ]; then
            echo "::error::Too many 'any' types found. Current: $COUNT, Max allowed: 400"
            exit 1
          fi
```

### Pre-commit Hook

```bash
# .lefthook.yml or .husky/pre-commit
pre-commit:
  commands:
    type-check:
      run: bun run type-check
      stage_fixed: true
    biome-check:
      run: bun run lint:biome:fix
      stage_fixed: true
```

---

## Quick Reference

### Type Safety Checklist

Before merging code, ensure:

- [ ] No new `any` types introduced
- [ ] All function parameters have explicit types
- [ ] All function return types are explicit
- [ ] Index access uses guards or optional chaining
- [ ] External input is validated (Zod or Convex validators)
- [ ] Errors are properly typed and handled
- [ ] No `@ts-ignore` or `@ts-expect-error` without justification
- [ ] `bun run type-check` passes
- [ ] `bun run lint:biome` passes

### Common Type Utilities

```typescript
// Built-in TypeScript utilities
type Partial<T> = { [P in keyof T]?: T[P] }
type Required<T> = { [P in keyof T]-?: T[P] }
type Readonly<T> = { readonly [P in keyof T]: T[P] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type Record<K extends keyof any, T> = { [P in K]: T }
type Exclude<T, U> = T extends U ? never : T
type Extract<T, U> = T extends U ? T : never
type NonNullable<T> = T extends null | undefined ? never : T
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
type Parameters<T> = T extends (...args: infer P) => any ? P : never
```

---

## Resources

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/handbook/intro.html
- **Convex Types**: https://docs.convex.dev/using/convex-values
- **Zod Documentation**: https://zod.dev
- **Biome Documentation**: https://biomejs.dev

---

**Last Updated**: January 28, 2026
**Maintained By**: LTCG Development Team
**Status**: ✅ Fully Enforced
