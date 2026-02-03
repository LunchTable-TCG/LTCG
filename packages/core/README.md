# @ltcg/core

> Shared TypeScript types, utilities, validators, and configurations for the LTCG monorepo

## Overview

`@ltcg/core` is the foundational package for the LTCG monorepo, providing a single source of truth for shared code across all applications. It eliminates code duplication, improves type safety, and ensures consistency in configuration and utilities.

## Features

- **Type-Safe Convex Functions**: Eliminates `apiAny` and `as any` type escapes
- **Shared Configurations**: Standardized Tailwind, PostCSS, and Vitest setups
- **Pure Utilities**: Reusable functions with no side effects
- **Runtime Validation**: Zod schemas for input validation
- **Zero External Dependencies**: Minimal footprint (Tailwind/Vitest configs only)

## Installation

This package is automatically available to all workspace packages in the monorepo. No installation needed.

```json
// package.json in workspace packages
{
  "dependencies": {
    "@ltcg/core": "workspace:*"
  }
}
```

## Structure

```
@ltcg/core/
├── types/          # TypeScript types and Convex wrappers
│   └── convex.ts   # Type-safe Convex function references
├── utils/          # Pure utility functions
├── validators/     # Zod schemas for validation
└── config/         # Shared configurations
    ├── tailwind.base.ts    # Tailwind preset
    ├── postcss.config.ts   # PostCSS config
    └── vitest.config.ts    # Vitest config
```

## Usage

### Importing from Main Entry

```typescript
// Import everything from the main entry point
import { TypedQuery, TypedMutation, createTailwindPreset } from "@ltcg/core";
```

### Importing from Specific Modules

```typescript
// More explicit imports for better tree-shaking
import type { TypedQuery, TypedMutation } from "@ltcg/core/types";
import { createTailwindPreset } from "@ltcg/core/config";
```

## API Reference

### Types Module (`@ltcg/core/types`)

Type-safe wrappers for Convex function references that eliminate the need for `apiAny`.

#### TypedQuery

Type-safe query reference for read-only Convex operations.

```typescript
import type { TypedQuery } from "@ltcg/core/types";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

// Define type-safe query
interface User {
  id: string;
  name: string;
  email: string;
}

const currentUser: TypedQuery<{}, User | null> = api.users.currentUser;

// Use with React hooks - full type safety
const user = useQuery(currentUser, {});
// user has type: User | null | undefined
```

#### TypedMutation

Type-safe mutation reference for write operations.

```typescript
import type { TypedMutation } from "@ltcg/core/types";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

interface CreateUserArgs {
  name: string;
  email: string;
}

const createUser: TypedMutation<CreateUserArgs, Id<"users">> = api.users.create;

// Use with React hooks
const create = useMutation(createUser);
const userId = await create({ name: "Alice", email: "alice@example.com" });
// userId has type: Id<"users">
```

#### TypedAction

Type-safe action reference for operations with side effects.

```typescript
import type { TypedAction } from "@ltcg/core/types";
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";

interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  messageId: string;
  sentAt: number;
}

const sendEmail: TypedAction<SendEmailArgs, SendEmailResult> = api.email.send;

// Use with React hooks
const send = useAction(sendEmail);
const result = await send({
  to: "user@example.com",
  subject: "Welcome",
  body: "Hello!",
});
// result has type: SendEmailResult
```

#### Internal Types

For system/admin operations that can only be called from other Convex functions:

```typescript
import type {
  TypedInternalQuery,
  TypedInternalMutation,
  TypedInternalAction,
} from "@ltcg/core/types";

// These can only be called via ctx.runQuery/runMutation/runAction
const getAdminStats: TypedInternalQuery<{}, AdminStats> = api.admin.getStats;
const resetUserData: TypedInternalMutation<{ userId: string }, void> =
  api.admin.resetUserData;
```

### Config Module (`@ltcg/core/config`)

Shared configurations for build tools and testing frameworks.

#### Tailwind Configuration

```typescript
// tailwind.config.ts
import { createTailwindPreset } from "@ltcg/core/config";

export default createTailwindPreset({
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
});
```

**Features:**

- CSS variables-based theming (`hsl(var(--primary))`)
- Dark mode support (`darkMode: "class"`)
- Consistent border radius tokens
- Pre-configured animations (accordion, etc.)

**Base Colors:**

- `border`, `input`, `ring`
- `background`, `foreground`
- `primary`, `secondary`, `destructive`
- `muted`, `accent`
- `popover`, `card`

#### PostCSS Configuration

```typescript
// postcss.config.js
import { postcssConfig } from "@ltcg/core/config";

export default postcssConfig;
```

**Included Plugins:**

- `@tailwindcss/postcss`: Tailwind CSS v4
- `autoprefixer`: Cross-browser vendor prefixes

#### Vitest Configuration

```typescript
// vitest.config.ts
import { createVitestConfig } from "@ltcg/core/config";
import { mergeConfig } from "vitest/config";

export default mergeConfig(
  createVitestConfig({
    testDir: "src",
    setupFiles: ["./test/setup.ts"],
  }),
  {
    // Your custom overrides
  }
);
```

**Features:**

- Happy DOM test environment
- Code coverage with v8 provider
- 70% coverage thresholds
- Test file patterns: `**/*.{test,spec}.{ts,tsx}`

### Utils Module (`@ltcg/core/utils`)

Currently a placeholder for shared utility functions. Add pure functions as needed.

```typescript
import { /* utilities */ } from "@ltcg/core/utils";
```

### Validators Module (`@ltcg/core/validators`)

Currently a placeholder for Zod validation schemas. Add schemas as needed.

```typescript
import { /* schemas */ } from "@ltcg/core/validators";
```

## Migration Guide

### Before: Using `apiAny`

```typescript
// Old approach with type escapes
import { apiAny, useConvexQuery } from "@/lib/convexHelpers";

const user = useConvexQuery(apiAny.core.users.currentUser, {});
// user has type 'any' - no type safety!

const create = useConvexMutation(apiAny.core.users.create);
// No parameter checking, no return type
```

### After: Using Typed Convex Functions

```typescript
// New approach with full type safety
import type { TypedQuery, TypedMutation } from "@ltcg/core/types";
import { api } from "@convex/_generated/api";
import { useQuery, useMutation } from "convex/react";

interface User {
  id: string;
  name: string;
}

const currentUser: TypedQuery<{}, User | null> = api.core.users.currentUser;
const user = useQuery(currentUser, {});
// user has type: User | null | undefined

interface CreateUserArgs {
  name: string;
}

const createUserMutation: TypedMutation<CreateUserArgs, Id<"users">> =
  api.core.users.create;
const create = useMutation(createUserMutation);
// Full type checking on parameters and return value
```

## Development

### Scripts

```bash
# Build the package
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run type-check

# Run tests (when added)
bun run test
```

### Adding New Shared Code

Follow these guidelines when adding code to `@ltcg/core`:

#### 1. Types (`types/`)

Add TypeScript interfaces, type helpers, and Convex function types.

```typescript
// types/game.ts
export interface Card {
  id: string;
  name: string;
  type: "monster" | "spell" | "trap";
}

export interface GameState {
  currentPhase: "draw" | "main" | "battle" | "end";
  turnNumber: number;
}
```

Export from `types/index.ts`:

```typescript
export * from "./convex";
export * from "./game";
```

#### 2. Utils (`utils/`)

Add pure functions with no side effects.

```typescript
// utils/string.ts
/**
 * Truncates a string to a maximum length.
 *
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns The truncated string with ellipsis if needed
 */
export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
```

Export from `utils/index.ts`:

```typescript
export * from "./string";
```

#### 3. Validators (`validators/`)

Add Zod schemas for runtime validation.

```typescript
// validators/user.ts
import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

export type UserInput = z.infer<typeof userSchema>;
```

Export from `validators/index.ts`:

```typescript
export * from "./user";
```

#### 4. Config (`config/`)

Add configuration constants and build tool presets.

```typescript
// config/constants.ts
export const MAX_USERNAME_LENGTH = 50;
export const API_TIMEOUT = 30000;
```

Export from `config/index.ts`:

```typescript
export * from "./constants";
export * from "./tailwind.base";
export * from "./postcss.config";
export * from "./vitest.config";
```

### Best Practices

1. **Keep it Pure**: Utils should be pure functions with no side effects
2. **Document Everything**: Add JSDoc comments to all public APIs
3. **Type Everything**: Use TypeScript for full type safety
4. **Test Everything**: Add tests for utilities and validators
5. **Export Properly**: Always re-export from module `index.ts` files

## TypeScript Configuration

This package uses the monorepo's shared TypeScript configuration:

```json
{
  "extends": "@ltcg/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

## Dependencies

### Production Dependencies

None (zero runtime dependencies for core types and utils)

### Development Dependencies

- `typescript`: Type checking
- `tailwindcss`: Tailwind config types
- `vitest`: Test config types
- `zod`: Validator types (when validators are added)

## Troubleshooting

### TypeScript Errors

**Issue: "Cannot find module '@ltcg/core'"**

Solution: Ensure the package is built and the workspace is configured correctly.

```bash
# Build the package
bun run build

# Or run from monorepo root
bun run build --filter @ltcg/core
```

**Issue: "Type instantiation is excessively deep" (TS2589)**

Solution: This typically happens with complex Convex API types. Use the typed wrappers:

```typescript
// Instead of:
const result = useQuery(api.very.deeply.nested.query, {});

// Use:
const typedQuery: TypedQuery<Args, Return> = api.very.deeply.nested.query;
const result = useQuery(typedQuery, {});
```

### Import Errors

**Issue: "Module not found" when importing from subpath**

Solution: Ensure your `package.json` has correct exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./utils": "./src/utils/index.ts",
    "./validators": "./src/validators/index.ts",
    "./config": "./src/config/index.ts"
  }
}
```

## Contributing

When contributing to `@ltcg/core`:

1. Ensure code is applicable to multiple packages (not app-specific)
2. Add comprehensive JSDoc comments
3. Add tests for new utilities and validators
4. Update this README with new exports
5. Follow existing patterns and conventions

## License

MIT

## Support

For issues or questions:

- Open an issue in the monorepo
- Check existing documentation
- Review examples in other packages

---

Built for the LTCG monorepo with love and type safety.
