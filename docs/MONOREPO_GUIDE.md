# LTCG Monorepo Guide

Complete guide to working with the LTCG monorepo structure, adding packages, managing dependencies, and understanding the build system.

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Package Management](#package-management)
- [Adding New Packages](#adding-new-packages)
- [Dependency Management](#dependency-management)
- [Build System](#build-system)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

## Monorepo Structure

### Overview

LTCG uses a **Bun workspace monorepo** managed by **Turborepo** for task orchestration.

```
ltcg/
├── apps/               # Applications
│   ├── web/            # Main Next.js app
│   ├── admin/          # Admin dashboard
│   └── docs/           # Documentation site
├── packages/           # Shared packages
│   ├── core/           # Shared code
│   └── plugin-ltcg/    # ElizaOS plugin
├── convex/             # Backend (not a workspace package)
├── scripts/            # Build/dev scripts
└── e2e/                # End-to-end tests
```

### Workspace Configuration

**Root `package.json`:**
```json
{
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

**Why Convex isn't a workspace:**
- Convex has its own deployment system
- Managed separately from monorepo builds
- Has dedicated CLI (convex dev, convex deploy)

## Package Management

### Workspace Dependencies

Packages can depend on each other using workspace protocol:

```json
// apps/web/package.json
{
  "dependencies": {
    "@ltcg/core": "workspace:*"
  }
}
```

This creates a symlink to the local package during development.

### Adding Dependencies

**Root level (for all packages):**
```bash
bun add -D vitest  # Adds to root devDependencies
```

**Specific package:**
```bash
cd apps/web
bun add next  # Adds to web app only
```

**Specific package from root:**
```bash
bun add next --cwd apps/web
```

### Removing Dependencies

```bash
# From root
bun remove typescript

# From specific package
bun remove next --cwd apps/web
```

### Updating Dependencies

```bash
# Update all packages
bun update

# Update specific package
bun update next

# Update in specific workspace
bun update next --cwd apps/web
```

## Adding New Packages

### Creating a New Shared Package

1. **Create directory structure:**
```bash
mkdir -p packages/my-package/src
cd packages/my-package
```

2. **Initialize package.json:**
```json
{
  "name": "@ltcg/my-package",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.8.0"
  }
}
```

3. **Create tsconfig.json:**
```json
{
  "extends": "@ltcg/core/config/tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

4. **Create src/index.ts:**
```typescript
export * from "./myModule";
```

5. **Add to Turbo:**

Update `turbo.json` if the package has build tasks:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

6. **Install dependencies:**
```bash
cd ../..
bun install
```

### Creating a New App

1. **Use Next.js scaffold:**
```bash
cd apps
bunx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
```

2. **Add workspace dependencies:**
```json
{
  "dependencies": {
    "@ltcg/core": "workspace:*"
  }
}
```

3. **Configure TypeScript:**
```json
{
  "extends": "@ltcg/core/config/tsconfig.nextjs.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]
}
```

4. **Add Turbo tasks:**

Update root `turbo.json`:
```json
{
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"]
    }
  }
}
```

5. **Add dev script to root:**

Update root `package.json`:
```json
{
  "scripts": {
    "dev:my-app": "cd apps/my-app && bun run dev"
  }
}
```

## Dependency Management

### Dependency Types

**Production Dependencies:**
```bash
bun add react  # Code needed in production
```

**Development Dependencies:**
```bash
bun add -D typescript  # Build tools, testing
```

**Peer Dependencies:**
```json
// Used by shared packages to avoid duplication
{
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

### Hoisting

Bun automatically hoists dependencies to root `node_modules/`:
- Saves disk space
- Faster installs
- Consistent versions

**Exception:** Packages with conflicting versions get nested.

### Lock File

**bun.lock** (binary format):
- Faster than JSON
- Deterministic installs
- Committed to git

Never manually edit `bun.lock`. Regenerate with:
```bash
rm bun.lock
bun install
```

## Build System

### Turborepo Tasks

Turborepo orchestrates builds across packages:

**Task Execution Order:**
```
turbo build
├── packages/core build (first)
└── apps/web build (depends on core)
    └── apps/admin build (parallel with web)
```

**Key Concepts:**

1. **Task Dependencies** (`dependsOn`):
   ```json
   {
     "build": {
       "dependsOn": ["^build"]  // ^ means dependencies' build
     }
   }
   ```

2. **Caching** (`outputs`):
   ```json
   {
     "build": {
       "outputs": ["dist/**", ".next/**"]
     }
   }
   ```
   Turbo caches these outputs and skips rebuilds if inputs haven't changed.

3. **Inputs**:
   ```json
   {
     "build": {
       "inputs": ["src/**", "package.json", "tsconfig.json"]
     }
   }
   ```
   Only these files trigger cache invalidation.

### Running Tasks

**Single task across all packages:**
```bash
turbo build          # Build all packages
turbo test           # Test all packages
turbo lint           # Lint all packages
```

**Single task in specific package:**
```bash
turbo build --filter=web
turbo test --filter=@ltcg/core
```

**Multiple tasks:**
```bash
turbo build test     # Run build, then test
```

**Parallel execution:**
```bash
turbo build --parallel  # Ignore dependencies, run all at once
```

**Force rebuild (ignore cache):**
```bash
turbo build --force
```

### Cache Debugging

**See what would be cached:**
```bash
turbo build --dry-run
```

**See cache hits/misses:**
```bash
turbo build --summarize
```

**Clear cache:**
```bash
rm -rf node_modules/.cache/turbo
```

## Common Tasks

### Adding a New Component Library

**Scenario:** You want to create `@ltcg/ui` for shared UI components.

1. Create package:
```bash
mkdir -p packages/ui/src/components
cd packages/ui
```

2. Initialize package.json:
```json
{
  "name": "@ltcg/ui",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./components/*": "./src/components/*.tsx"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.8.0"
  }
}
```

3. Create components:
```typescript
// src/components/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}

// src/index.ts
export * from "./components/Button";
```

4. Use in apps:
```json
// apps/web/package.json
{
  "dependencies": {
    "@ltcg/ui": "workspace:*"
  }
}
```

```typescript
// apps/web/app/page.tsx
import { Button } from "@ltcg/ui";

export default function Page() {
  return <Button>Click me</Button>;
}
```

### Migrating External Dependencies to Monorepo

**Scenario:** You have duplicated code in web and admin.

1. Move code to `packages/core/src/utils/`:
```typescript
// packages/core/src/utils/formatting.ts
export function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}
```

2. Export from package:
```typescript
// packages/core/src/utils/index.ts
export * from "./formatting";
```

3. Update apps to use shared code:
```typescript
// Before (in apps/web and apps/admin)
function formatCurrency(amount: number) { ... }

// After
import { formatCurrency } from "@ltcg/core/utils";
```

4. Remove duplicated code from apps.

### Sharing Configuration

**Scenario:** Both web and admin use the same Tailwind config.

1. Move to `@ltcg/core/config/`:
```typescript
// packages/core/src/config/tailwind.base.ts
import type { Config } from "tailwindcss";

export const tailwindBaseConfig: Partial<Config> = {
  // shared config
};
```

2. Extend in apps:
```typescript
// apps/web/tailwind.config.ts
import { createTailwindPreset } from "@ltcg/core/config";

export default createTailwindPreset({
  content: ["./src/**/*.{ts,tsx}"]
});
```

## Troubleshooting

### "Cannot find module '@ltcg/core'"

**Cause:** Workspace link not established.

**Fix:**
```bash
bun install  # Re-link workspaces
```

### "Type error: Cannot find name 'X'"

**Cause:** Package hasn't been built.

**Fix:**
```bash
turbo build --filter=@ltcg/core
```

### "Dependency X has multiple versions"

**Cause:** Different packages require different versions.

**Fix:**
```bash
# Check versions
bun why X

# Force single version in root package.json
{
  "resolutions": {
    "X": "1.2.3"
  }
}
```

### Circular Dependencies

**Symptom:** "Circular dependency detected" error.

**Fix:** Restructure imports or move shared code to a lower-level package.

**Example:**
```
Before: core → web → core (circular!)
After:  utils → core → web (linear)
```

### Cache Issues

**Symptom:** Changes not reflected after rebuild.

**Fix:**
```bash
# Clear Next.js cache
rm -rf apps/web/.next
rm -rf apps/admin/.next

# Clear Turbo cache
rm -rf node_modules/.cache/turbo

# Clear Bun cache
bun pm cache rm

# Rebuild
turbo build --force
```

### Slow Installs

**Cause:** Network issues or large dependency tree.

**Fix:**
```bash
# Use local cache
bun install --offline

# Clear and reinstall
rm -rf node_modules bun.lock
bun install
```

## Best Practices

1. **Keep shared code in `@ltcg/core`**
   - Don't create packages for single functions
   - Use packages for major modules (ui, utils, config)

2. **Use workspace protocol consistently**
   ```json
   "dependencies": {
     "@ltcg/core": "workspace:*"  // ✅ Good
     "@ltcg/core": "^0.1.0"       // ❌ Bad (breaks symlinking)
   }
   ```

3. **Don't import from `dist/`**
   ```typescript
   import { foo } from "@ltcg/core";        // ✅ Good
   import { foo } from "@ltcg/core/dist";   // ❌ Bad
   ```

4. **Build packages before using them**
   ```bash
   turbo build  # Ensures all packages are built
   ```

5. **Use Turbo for all tasks**
   ```bash
   turbo test       # ✅ Good (uses cache)
   bun run test     # ❌ Bad (no cache, no orchestration)
   ```

---

For more information, see:
- [Bun Workspaces](https://bun.sh/docs/install/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
