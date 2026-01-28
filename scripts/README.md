# Type Generation Scripts

This directory contains automation scripts for the LTCG project.

## generate-types.ts

Auto-generates TypeScript types from Convex validators to eliminate manual `Infer<typeof>` type extraction.

### Purpose

Instead of manually writing type definitions like:

```typescript
import type { Infer } from "convex/values";
import type { userProfileValidator } from "../../../../convex/lib/returnValidators";

export type UserProfile = Infer<typeof userProfileValidator>;
```

This script automatically generates all types from validators defined in `convex/lib/returnValidators.ts`.

### Usage

```bash
# Generate types manually
bun run generate:types

# Types are automatically generated before dev/build
bun run dev   # runs predev hook -> generates types
bun run build # runs prebuild hook -> generates types
```

### Output

Generated file: `apps/web/src/types/generated.ts`

This file is:
- **Auto-generated** - Do not edit manually
- **Git-ignored** - Not committed to version control
- **Regenerated** - Runs before every dev/build

### How It Works

1. Parses `convex/lib/returnValidators.ts` for all validator exports
2. Extracts validator names (e.g., `userProfileValidator`)
3. Converts to PascalCase type names (e.g., `UserProfile`)
4. Generates type definitions using `Infer<typeof validatorName>`
5. Writes to `apps/web/src/types/generated.ts`

### Example Generated Types

From validator:
```typescript
export const userProfileValidator = v.object({
  _id: v.id("users"),
  username: v.optional(v.string()),
  level: v.number(),
  // ...
});
```

Generated type:
```typescript
export type UserProfile = Infer<typeof userProfileValidator>;
```

### Integration

Types are automatically re-exported from `apps/web/src/types/index.ts`:

```typescript
// All generated types available
export type * from "./generated";
```

Domain-specific type files use generated types:

```typescript
// apps/web/src/types/progression.ts
export type { Achievement, UserQuest as Quest } from "./generated";

// apps/web/src/types/social.ts
export type { LeaderboardEntry, FriendInfo as Friend } from "./generated";
```

### Adding New Validators

1. Add validator to `convex/lib/returnValidators.ts`:
   ```typescript
   export const myNewValidator = v.object({
     // fields...
   });
   ```

2. Run type generator:
   ```bash
   bun run generate:types
   ```

3. Import generated type:
   ```typescript
   import type { MyNew } from "@/types/generated";
   ```

### Naming Convention

Validator names must follow the pattern: `<name>Validator`

Examples:
- `userProfileValidator` → `UserProfile`
- `leaderboardEntryValidator` → `LeaderboardEntry`
- `achievementValidator` → `Achievement`

### Benefits

- **Zero Manual Maintenance**: Types update automatically when validators change
- **Single Source of Truth**: Validators define both runtime validation and TypeScript types
- **Type Safety**: Guaranteed type-validator alignment
- **Developer Experience**: No more forgetting to update types when validators change
- **Consistency**: All validator-based types follow the same pattern

### Statistics

Current generation (as of latest run):
- **47 validators** processed
- **47 type definitions** generated
- **3 type files** updated (progression.ts, social.ts, story.ts)
- **0 manual type definitions** replaced

### Troubleshooting

**Types not updating?**
```bash
# Manually regenerate
bun run generate:types
```

**Import errors?**
```bash
# Check generated file exists
ls -la apps/web/src/types/generated.ts

# Regenerate if missing
bun run generate:types
```

**Wrong type name?**
- Ensure validator name ends with `Validator`
- Check naming convention matches pattern
- Verify export statement in returnValidators.ts
