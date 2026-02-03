# LTCG Monorepo Hardening Design

**Date:** 2026-02-03
**Status:** Approved for Implementation
**Owner:** Development Team

## Executive Summary

This document outlines a comprehensive transformation of the LTCG monorepo to achieve enterprise-grade type safety, security, architecture, and developer experience. The design addresses current technical debt including 213 type escape hatches, missing security layers, and inconsistent monorepo patterns.

## Current State Analysis

### Strengths
- ✅ Strict TypeScript enabled across all workspaces
- ✅ Bun-based monorepo with modern tooling
- ✅ Comprehensive test coverage (Vitest + Playwright)
- ✅ Biome for fast linting/formatting

### Gaps
- ⚠️ 213 uses of `apiAny` and `as any` type escapes
- ⚠️ No shared packages for common code
- ⚠️ Path aliases crossing workspace boundaries
- ⚠️ No Content Security Policy headers
- ⚠️ Environment variables scattered across locations
- ⚠️ No automated CI/CD pipeline
- ⚠️ Limited developer documentation

---

## 1. Monorepo Architecture

### Proposed Structure

```
LTCG/
├── apps/
│   ├── web/              # Next.js user app
│   ├── admin/            # Next.js admin panel
│   └── docs/             # [NEW] Documentation site
├── packages/
│   ├── types/            # [NEW] @ltcg/types - Shared TypeScript types
│   ├── ui/               # [NEW] @ltcg/ui - Shared React components
│   ├── config/           # [NEW] @ltcg/config - Shared configs
│   ├── utils/            # [NEW] @ltcg/utils - Shared utilities
│   ├── validators/       # [NEW] @ltcg/validators - Zod schemas
│   └── plugin-ltcg/      # Existing plugin
├── convex/               # Convex backend (stays at root)
├── data/                 # Static data
└── tooling/              # [NEW] Development tools
    ├── eslint-config/    # Custom ESLint rules
    └── typescript/       # Base tsconfig extends
```

### Package Boundaries

**@ltcg/types**
- Shared TypeScript interfaces
- Convex type helpers (`TypedQuery`, `TypedMutation`, `TypedAction`)
- API contracts between frontend/backend

**@ltcg/ui**
- Shared React components (Button, Card, Dialog, etc.)
- Theme configuration
- Radix UI wrappers

**@ltcg/config**
- Base tsconfig.json
- Biome configuration
- Shared constants

**@ltcg/utils**
- Pure utility functions
- Date/time helpers
- Formatting functions

**@ltcg/validators**
- Zod schemas for runtime validation
- Convex validator bridges
- Input sanitization

### Benefits
1. Single source of truth for types
2. Consistent UI across apps
3. Centralized configuration
4. Reusable validation logic
5. Clear dependency graph

---

## 2. Type Safety Hardening

### Problem: Type Escape Hatches

Current codebase has 213 instances of `apiAny` and `as any`:

```typescript
// Current problematic pattern
import { apiAny } from "@/lib/convexHelpers";
const user = useQuery(apiAny.core.users.currentUser, {});
// user has type 'any' - no safety!
```

### Solution: Typed Wrappers

**Create typed helpers in @ltcg/types:**

```typescript
// packages/types/src/convex.ts
import type { FunctionReference } from "convex/server";

export type TypedQuery<Args, Return> = FunctionReference<
  "query",
  "public",
  Args,
  Return
>;

export type TypedMutation<Args, Return> = FunctionReference<
  "mutation",
  "public",
  Args,
  Return
>;

export type TypedAction<Args, Return> = FunctionReference<
  "action",
  "public",
  Args,
  Return
>;
```

**Replace convexHelpers.ts:**

```typescript
// apps/web/src/lib/convex.ts
import { useQuery, useMutation, useAction } from "convex/react";
import type { TypedQuery, TypedMutation, TypedAction } from "@ltcg/types";

export function useConvexQuery<Args, Return>(
  query: TypedQuery<Args, Return>,
  args: Args
) {
  return useQuery(query, args);
}

export function useConvexMutation<Args, Return>(
  mutation: TypedMutation<Args, Return>
) {
  return useMutation(mutation);
}

export function useConvexAction<Args, Return>(
  action: TypedAction<Args, Return>
) {
  return useAction(action);
}
```

### Runtime Validation with Convex Returns

**Add returns validators to all Convex functions:**

```typescript
// convex/core/users.ts - BEFORE
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.get(userId);
    return user; // Type: any
  },
});

// AFTER - with returns validator
export const currentUser = query({
  args: {},
  returns: v.union(v.null(), v.object({
    _id: v.id("users"),
    username: v.string(),
    email: v.string(),
    privyUserId: v.string(),
    role: v.string(),
    stats: v.object({
      level: v.number(),
      xp: v.number(),
      gold: v.number(),
    }),
  })),
  handler: async (ctx) => {
    const user = await ctx.db.get(userId);
    return user; // Now type-checked at runtime!
  },
});
```

### Zod Schema Validation

**Create shared validators:**

```typescript
// packages/validators/src/user.ts
import { z } from "zod";

export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be 20 characters or less")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

export const userProfileSchema = z.object({
  username: usernameSchema,
  email: z.string().email(),
  privyUserId: z.string(),
  role: z.enum(["player", "admin", "superadmin"]),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
```

### Migration Strategy

1. **Phase 1**: Create `@ltcg/types` package with typed wrappers
2. **Phase 2**: Add `returns` validators to high-traffic Convex functions
3. **Phase 3**: Create codemod to replace `apiAny` usage
4. **Phase 4**: Manual review and fix remaining type escapes
5. **Phase 5**: Add ESLint rule to prevent future `as any` usage

**Success Metrics:**
- Zero `as any` or `apiAny` in codebase
- All Convex functions have `returns` validators
- TypeScript strict mode with no errors

---

## 3. Security Hardening

### 3.1 Environment & Secrets Management

**Centralized validation:**

```typescript
// packages/config/src/env.ts
import { z } from "zod";

const serverEnvSchema = z.object({
  CONVEX_DEPLOYMENT: z.string().min(1),
  CONVEX_DEPLOY_KEY: z.string().min(1),
  PRIVY_APP_SECRET: z.string().min(1),
  PRIVY_APP_ID: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: z.string().optional(),
});

// Validate at startup - fail fast if misconfigured
export const serverEnv = serverEnvSchema.parse(process.env);
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
});
```

### 3.2 Content Security Policy

**Add security headers:**

```typescript
// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.vercel-insights.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: blob:;
  font-src 'self' data:;
  connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://auth.privy.io;
  frame-src 'self' https://auth.privy.io;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s{2,}/g, ' ').trim();

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", CSP_HEADER);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}
```

### 3.3 Input Sanitization

**Create sanitization utilities:**

```typescript
// packages/utils/src/sanitize.ts
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br"],
    ALLOWED_ATTR: [],
  });
}

export const sanitizeUsername = (input: string): string => {
  return input.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
};

export const sanitizeSearchQuery = (query: string): string => {
  return query
    .replace(/[';\"\\]/g, "")
    .replace(/--/g, "")
    .slice(0, 100);
};

// Zod schemas with sanitization
export const usernameSchema = z.string()
  .min(3).max(20)
  .regex(/^[a-zA-Z0-9_]+$/)
  .transform(sanitizeUsername);

export const userMessageSchema = z.string()
  .min(1).max(500)
  .transform(sanitizeHtml);
```

### 3.4 Rate Limiting

**Configure rate limits:**

```typescript
// convex/lib/rateLimit.ts
import { RateLimiter } from "@convex-dev/ratelimiter";

export const rateLimiter = new RateLimiter({
  chat: { kind: "token bucket", rate: 10, period: 60_000, capacity: 10 },
  packOpening: { kind: "token bucket", rate: 5, period: 60_000, capacity: 5 },
  matchmaking: { kind: "token bucket", rate: 20, period: 60_000, capacity: 20 },
  admin: { kind: "token bucket", rate: 100, period: 60_000, capacity: 100 },
  global: { kind: "fixed window", rate: 1000, period: 60_000 },
});

// Usage
export const sendMessage = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    await rateLimiter.limit(ctx, "chat", { key: userId });
    const sanitized = sanitizeHtml(args.message);
    // Process message...
  },
});
```

### 3.5 Dependency Security

**Automated scanning:**

```json
// package.json
{
  "scripts": {
    "security:audit": "bun pm audit",
    "security:check": "bunx audit-ci --moderate",
    "security:update": "bun pm update --latest"
  }
}
```

**GitHub Action:**

```yaml
# .github/workflows/security.yml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 1'
  pull_request:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run security:check
```

---

## 4. CI/CD Pipeline

### 4.1 Pre-commit Hooks

**Install Husky + lint-staged:**

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

```json
// .lintstagedrc.json
{
  "*.{ts,tsx}": [
    "biome check --write --files-ignore-unknown=true",
    "bun run type-check"
  ],
  "*.{json,md}": ["biome format --write"],
  "apps/web/**/*.{ts,tsx}": ["vitest related --run"],
  "convex/**/*.ts": ["vitest run convex"]
}
```

### 4.2 GitHub Actions CI

**Main CI workflow:**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run type-check
      - run: bun run lint:biome

  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run test:unit
      - run: bun run test:convex

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bunx playwright install --with-deps chromium
      - run: bun run test:e2e

  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [web, admin]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build:${{ matrix.app }}
```

### 4.3 Automated Deployments

**Production deployment:**

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile

      - name: Deploy Convex
        run: bunx convex deploy --prod
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'

      - name: Smoke tests
        run: bun run test:e2e:smoke
```

**Preview deployments:**

```yaml
# .github/workflows/deploy-preview.yml
name: Deploy Preview
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile

      - name: Deploy Convex Preview
        run: bunx convex deploy

      - name: Deploy Vercel Preview
        id: vercel
        uses: amondnet/vercel-action@v25

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `🚀 Preview: ${{ steps.vercel.outputs.preview-url }}`
            })
```

### 4.4 Turbo Build Caching

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": false
    },
    "lint": {},
    "type-check": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 5. Documentation & Developer Experience

### 5.1 Auto-Generated API Docs

```json
// typedoc.json
{
  "entryPoints": [
    "packages/types/src/index.ts",
    "packages/utils/src/index.ts",
    "packages/validators/src/index.ts"
  ],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"]
}
```

### 5.2 Development Guide

Create comprehensive guides:
- `docs/DEVELOPMENT.md` - Setup and workflows
- `docs/ARCHITECTURE.md` - System design
- `docs/TESTING.md` - Testing strategy
- `docs/DEPLOYMENT.md` - Deployment process
- `CONTRIBUTING.md` - PR process and standards

### 5.3 VSCode Configuration

```json
// .vscode/settings.json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

```json
// .vscode/extensions.json
{
  "recommendations": [
    "biomejs.biome",
    "oven.bun-vscode",
    "ms-playwright.playwright",
    "bradlc.vscode-tailwindcss",
    "get-convex.convex"
  ]
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Establish monorepo structure

- [ ] Create `packages/types` with package.json
- [ ] Create `packages/ui` with package.json
- [ ] Create `packages/config` with package.json
- [ ] Create `packages/utils` with package.json
- [ ] Create `packages/validators` with package.json
- [ ] Set up base tsconfig inheritance in `packages/config`
- [ ] Configure Turbo for monorepo builds
- [ ] Set up Husky + lint-staged

**Success Criteria:**
- All packages discoverable via workspace protocol
- `bun install` resolves all workspace dependencies
- Pre-commit hooks run successfully

### Phase 2: Type Safety (Week 2)
**Goal:** Eliminate type escapes

- [ ] Create typed Convex wrappers in `@ltcg/types`
- [ ] Add `returns` validators to top 20 Convex functions
- [ ] Create codemod to replace `apiAny` usage
- [ ] Run codemod on `apps/web`
- [ ] Run codemod on `apps/admin`
- [ ] Manual review and fixes
- [ ] Add ESLint rule to prevent `as any`

**Success Criteria:**
- Zero `apiAny` or `as any` in codebase
- Type-check passes with no errors
- All modified code has proper types

### Phase 3: Security (Week 3)
**Goal:** Harden security posture

- [ ] Create environment validator in `@ltcg/config`
- [ ] Add CSP headers to Next.js apps
- [ ] Create sanitization utilities in `@ltcg/utils`
- [ ] Apply sanitization to all user inputs
- [ ] Configure rate limiting in Convex
- [ ] Set up dependency scanning in CI
- [ ] Add secret scanning with TruffleHog

**Success Criteria:**
- CSP headers in production
- All user inputs validated and sanitized
- Rate limits active on all mutations
- Weekly security scans running

### Phase 4: CI/CD (Week 4)
**Goal:** Automate testing and deployment

- [ ] Create GitHub Actions workflows
- [ ] Set up preview deployments
- [ ] Configure Dependabot
- [ ] Add automated changelog generation
- [ ] Configure build caching with Turbo
- [ ] Set up smoke tests

**Success Criteria:**
- All PRs get preview deployments
- Main branch auto-deploys to production
- CI runs in < 5 minutes
- Dependabot creates weekly PRs

### Phase 5: Documentation (Week 5)
**Goal:** Improve developer experience

- [ ] Generate API documentation
- [ ] Write DEVELOPMENT.md guide
- [ ] Create ARCHITECTURE.md
- [ ] Set up VSCode workspace config
- [ ] Create CONTRIBUTING.md
- [ ] Add inline code documentation

**Success Criteria:**
- New developers can onboard in < 1 hour
- All packages have API docs
- VSCode workspace configured

---

## Success Metrics

### Type Safety
- **Before:** 213 type escapes, ~60% type coverage
- **After:** 0 type escapes, 95%+ type coverage

### Security
- **Before:** No CSP, limited validation, no scanning
- **After:** CSP enforced, all inputs validated, weekly scans

### Developer Experience
- **Before:** Manual testing, no CI, scattered docs
- **After:** Automated CI/CD, preview deploys, comprehensive docs

### Build Performance
- **Before:** ~8 min CI, no caching
- **After:** <5 min CI with Turbo caching

---

## Risks & Mitigation

### Risk: Breaking changes during migration
**Mitigation:** Incremental rollout, comprehensive tests, feature flags

### Risk: Team learning curve
**Mitigation:** Documentation, pair programming, gradual adoption

### Risk: CI costs
**Mitigation:** Turbo caching, matrix parallelization, optimize workflows

### Risk: Type migration complexity
**Mitigation:** Automated codemod, batch processing, validation at each step

---

## Conclusion

This comprehensive hardening transforms LTCG from a functional monorepo into an enterprise-grade codebase with:

✅ **Type Safety:** Zero escape hatches, full inference
✅ **Security:** CSP, validation, rate limiting, scanning
✅ **Architecture:** Shared packages, clean boundaries
✅ **CI/CD:** Automated testing, preview deploys, fast feedback
✅ **DX:** Documentation, tooling, onboarding guides

Implementation timeline: 5 weeks
Expected effort: 120-160 developer hours
Long-term maintenance savings: 40-60 hours/month
