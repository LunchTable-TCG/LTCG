# @ltcg/core

Shared types, utilities, and validators for LTCG monorepo.

## Purpose

Provides a single source of truth for shared code across LTCG applications, eliminating duplication and improving type safety.

## Structure

```
src/
├── types/       # TypeScript types and Convex wrappers
├── utils/       # Pure utility functions
├── validators/  # Zod schemas for validation
└── config/      # Shared configuration
```

## Usage

### Import from main entry

```typescript
import { TypedQuery, TypedMutation } from "@ltcg/core";
```

### Import from specific modules

```typescript
import { TypedQuery } from "@ltcg/core/types";
import { sanitizeHtml } from "@ltcg/core/utils";
import { userSchema } from "@ltcg/core/validators";
```

## Typed Convex Functions

Replaces `apiAny` with type-safe wrappers:

```typescript
// Before
import { apiAny } from "@/lib/convexHelpers";
const user = useQuery(apiAny.core.users.currentUser, {});
// user has type 'any' - no safety!

// After
import type { TypedQuery } from "@ltcg/core/types";
import { api } from "@convex/_generated/api";

const currentUser: TypedQuery<{}, User | null> = api.core.users.currentUser;
const user = useQuery(currentUser, {});
// user has proper type!
```

## Development

```bash
# Build
bun run build

# Watch mode
bun run dev

# Type check
bun run type-check
```

## Adding New Code

When adding shared code, follow these guidelines:

1. **types/**: Add TypeScript interfaces, type helpers, and Convex function types
2. **utils/**: Add pure functions with no side effects
3. **validators/**: Add Zod schemas for runtime validation
4. **config/**: Add constants and configuration values

Export from the appropriate module's `index.ts` file.
