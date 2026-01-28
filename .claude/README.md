# LTCG Project - Claude Skills & Documentation (2026)

Comprehensive skills and documentation for building the LTCG (Let Them Cook Game) trading card game with modern 2026 best practices.

## 📚 Available Skills

### Core Framework Skills (2026 Standards)

All skills updated with current 2026 documentation from official sources via Context7 and Deepwiki.

#### 1. Convex Backend Development

**Skill**: `convex-best-practices-2026`

**Use for**: Convex function patterns, schema design, authentication, components, testing, and performance optimization.

**Key Topics**:
- Thin API layer with internal functions
- Index-first database queries
- Testing with convex-test
- Component usage (@convex-dev/aggregate, ratelimiter)
- Common pitfalls and anti-patterns

**Invoke**: Automatically applied when working with Convex files, or invoke with `/convex-best-practices-2026`

---

#### 2. Next.js 15 App Router

**Skill**: `nextjs15-app-router-2026`

**Use for**: Next.js 15 App Router best practices, Server/Client Components, data fetching, caching, and performance.

**Key Topics**:
- Server Components by default, strategic "use client" boundaries
- Data fetching strategies (static, dynamic, revalidated)
- Route Handlers vs direct backend access
- Middleware patterns
- Caching layers (Request memoization, Data cache, Full Route cache, Router cache)
- Performance optimization

**Invoke**: Automatically applied when working in `apps/` directories, or invoke with `/nextjs15-app-router-2026`

---

#### 3. React 19 Patterns

**Skill**: `react19-patterns-2026`

**Use for**: React 19 hooks, useEffect guidelines, performance optimization, Server Actions, TypeScript integration.

**Key Topics**:
- Rules of Hooks (top-level only, never conditional)
- useEffect best practices (when to use, when NOT to use)
- useMemo and useCallback patterns
- Server Actions with useTransition
- TypeScript integration (typed props, hooks, generics)
- Common anti-patterns to avoid

**Invoke**: Automatically applied when working with React components, or invoke with `/react19-patterns-2026`

---

#### 4. Testing (Vitest 4 + Playwright)

**Skill**: `testing-2026`

**Use for**: Modern testing practices with Vitest 4 for unit/integration tests and Playwright for E2E testing.

**Key Topics**:
- Test pyramid (Unit → Integration → E2E)
- Vitest 4 configuration and mocking strategies
- Testing React components with Vitest Browser Mode
- Playwright E2E test organization
- Selector strategies (getByRole, data-testid)
- Authentication and session management
- Network mocking
- CI/CD integration

**Invoke**: Automatically applied when creating/modifying test files, or invoke with `/testing-2026`

---

#### 5. Convex Type Helpers (TS2589 Fixes)

**Skill**: `convex-type-helpers-2026`

**Use for**: Solutions for TypeScript type instantiation errors when working with Convex.

**Key Topics**:
- Module-level type boundaries with `lib/convexHelpers.ts`
- Extract inline objects to avoid type explosions
- Colocate aggregate definitions
- Component examples with helpers
- Migration guide from standard API to typed helpers

**Invoke**: Automatically applied when encountering TS2589 errors, or invoke with `/convex-type-helpers-2026`

---

### Legacy/General Skills

These skills are symlinked from `.agents/skills/` and cover general development topics:

- `clean-code` - Pragmatic coding standards
- `coding-standards` - Universal TypeScript/JavaScript patterns
- `typescript` - TypeScript 5.8+ patterns
- `architecture` - Architectural decision-making framework
- `test-write` - Senior test engineer comprehensive testing system
- `convex-optimization` - Convex optimization problem-solving (math/operations research)
- And many more... (see `.claude/skills/` directory)

---

## 🚀 How to Use Skills

### Automatic Application

Skills are automatically applied based on:
- **File context**: Working in `.tsx` files triggers React skills, `convex/` triggers Convex skills
- **Error detection**: TS2589 errors trigger type helper skills
- **Test files**: `.test.ts`, `.spec.ts` trigger testing skills

### Manual Invocation

Invoke skills explicitly with slash commands:

```
/convex-best-practices-2026
/nextjs15-app-router-2026
/react19-patterns-2026
/testing-2026
/convex-type-helpers-2026
```

### In Prompts

Reference skills in your requests:

```
"Using Convex best practices from /convex-best-practices-2026, implement a new query for leaderboard"

"Following Next.js 15 patterns, create a new dashboard page with Server Components"

"Apply React 19 patterns to refactor this useEffect hook"
```

---

## 📖 Project-Specific Implementation

### Convex Setup

**Type Helpers Already Configured:**

The project already has `apps/admin/src/lib/convexHelpers.ts` with:
- `apiAny` cast to avoid TS2589 errors
- `useConvexMutation` wrapper
- `useConvexQuery` wrapper
- `useConvexAction` wrapper

**Usage Example:**

```typescript
// ✅ GOOD: Use project helpers
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";

export function MyComponent() {
  const myMutation = useConvexMutation(apiAny.myModule.myFunction);
}
```

**Don't use:**

```typescript
// ❌ BAD: Causes TS2589
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";

export function MyComponent() {
  const myMutation = useMutation(api.myModule.myFunction); // Type error!
}
```

---

### Testing Setup

**Already Configured:**

- Vitest 4.0.18 for unit tests
- convex-test 0.0.41 for Convex function testing
- Playwright 1.57.0 for E2E tests
- Testing Library for React component testing

**Run Tests:**

```bash
# Unit tests
bun run test:unit
bun run test:unit:watch

# Convex tests
bun run test:convex
bun run test:convex:watch

# Integration tests
bun run test:integration
bun run test:integration:watch

# E2E tests
bun run test:e2e
bun run test:e2e:ui
bun run test:e2e:debug

# All tests
bun run test:all

# CI pipeline
bun run test:ci
```

**Test Files:**
- Unit: `apps/web/src/**/*.test.tsx`
- Convex: `convex/**/*.test.ts`
- Integration: `tests/integration/**/*.test.ts`
- E2E: `e2e/**/*.spec.ts`

---

## 🎯 Common Workflows

### 1. Creating a New Convex Function

```bash
# Claude will automatically apply convex-best-practices-2026 skill

# Best practices applied:
# - Thin API layer pattern
# - Internal functions for composition
# - Index-first queries
# - Proper authentication checks
# - Testing with convex-test
```

**Request example:**

```
"Create a new Convex query to fetch user leaderboard with pagination,
following Convex best practices"
```

### 2. Building a Next.js Page

```bash
# Claude will automatically apply nextjs15-app-router-2026 skill

# Best practices applied:
# - Server Component by default
# - Strategic "use client" boundaries
# - Proper data fetching (static, dynamic, or revalidated)
# - Type-safe params and searchParams
# - Metadata for SEO
```

**Request example:**

```
"Create a new dashboard page at /app/dashboard/page.tsx with
Server Components and proper caching"
```

### 3. Refactoring a React Component

```bash
# Claude will automatically apply react19-patterns-2026 skill

# Best practices applied:
# - Fix useEffect anti-patterns
# - Apply proper memoization (only when needed)
# - Correct hook usage (top-level only)
# - TypeScript integration
# - Performance optimization
```

**Request example:**

```
"Refactor this component to follow React 19 best practices,
especially the useEffect usage"
```

### 4. Writing Tests

```bash
# Claude will automatically apply testing-2026 skill

# Best practices applied:
# - Proper test organization (Arrange/Act/Assert)
# - Mock strategies (MSW for API, vi.mock for modules)
# - Selector strategies (getByRole, data-testid)
# - Async handling
# - Proper cleanup
```

**Request example:**

```
"Write comprehensive tests for this authentication flow using
Vitest and Playwright following 2026 best practices"
```

### 5. Fixing TypeScript Errors

```bash
# Claude will automatically apply convex-type-helpers-2026 skill when detecting TS2589

# Fixes applied:
# - Replace useMutation with useConvexMutation
# - Replace api with apiAny
# - Extract inline objects
# - Add type boundaries
```

**Request example:**

```
"Fix the TS2589 error in BatchForms.tsx"
```

---

## 🔧 Customization

### Adding New Skills

1. Create skill directory: `.claude/skills/my-skill/`
2. Add `instructions.md` with skill content
3. Optionally add `skill.yaml` with metadata:

```yaml
name: my-skill
description: "My custom skill description"
triggers:
  - "my keyword"
  - "my pattern"
invocable: true
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep]
```

### Updating Existing Skills

Skills are regular markdown files. Edit `.claude/skills/*/instructions.md` to update.

**Regenerate with latest docs:**

```bash
# Use Context7 to fetch latest library documentation
# Example from this project:

mcp__context7__resolve-library-id --libraryName "convex"
mcp__context7__query-docs --libraryId "/llmstxt/convex_dev_llms-full_txt" --query "latest patterns"
```

---

## 📝 Documentation Sources

All 2026 skills are based on:

### Primary Sources (via Context7 MCP)
- **Convex**: `/llmstxt/convex_dev_llms-full_txt` (5561 code snippets, High reputation, Score: 64.3)
- **Next.js**: `/vercel/next.js/v15.1.8` (2136 code snippets, High reputation, Score: 92.9)
- **React**: `/websites/react_dev` (2197 code snippets, High reputation, Score: 91.7)
- **Vitest**: `/vitest-dev/vitest/v4.0.7` (2776 code snippets, High reputation, Score: 90.4)
- **Playwright**: `/microsoft/playwright/v1.51.0` (3711 code snippets, High reputation, Score: 80.6)

### Verification
All skills verified against official documentation as of January 2026.

---

## 🆘 Troubleshooting

### TS2589 Errors

**Solution**: Use Convex type helpers from `lib/convexHelpers.ts`

```typescript
// ✅ Import from helpers
import { apiAny, useConvexMutation } from "@/lib/convexHelpers";

// ✅ Use wrapper
const myMutation = useConvexMutation(apiAny.myModule.myFunction);
```

### Skills Not Loading

**Check**:
1. Skill directory exists in `.claude/skills/`
2. `instructions.md` file exists
3. Symlinks are valid (for inherited skills)

**Fix broken symlinks:**

```bash
cd .claude/skills
ls -la  # Check for broken symlinks
rm broken-symlink
ln -s ../../.agents/skills/skill-name skill-name
```

### Outdated Documentation

Skills were generated in January 2026. To refresh:

1. Use Context7 MCP to fetch latest docs
2. Update `instructions.md` with new patterns
3. Commit changes

---

## 🔄 Maintenance

### Regular Updates

Skills should be refreshed:
- **Monthly**: Check for major framework releases
- **Quarterly**: Regenerate all skills with latest Context7 data
- **As needed**: When encountering deprecated patterns

### Version Tracking

Framework versions used in skills:
- Convex: Latest (January 2026)
- Next.js: 15.1.8
- React: 19 (latest stable)
- Vitest: 4.0.7
- Playwright: v1.51.0

---

## 📚 Additional Resources

### Global Claude Configuration

**Lean Starting Context** (~8-10K tokens vs previous 25-30K):

Project inherits minimal global rules from `~/.claude/`:
- Core essentials (`~/.claude/shared-rules/core/essentials.md`)
  - Verification strategy (when to use MCP tools)
  - MCP tool usage (Deepwiki, Context7, WebSearch)
  - Git conventions
  - Response style
  - Convex type handling basics
  - Common library→repo mappings

**Knowledge Map**: See `~/.claude/KNOWLEDGE_MAP.md` for complete index of:
- All available global skills
- Framework-specific resources
- MCP tool documentation
- Verification strategies
- Quick reference guides

**Global Skills** (on-demand, zero context cost):
- `/react` - React 19.2+
- `/nextjs` - Next.js 16
- `/typescript` - TypeScript 5.8+
- `/convex` - Convex backend
- `/bun` - Bun 1.3+
- `/vercel-ai-sdk` - Vercel AI SDK 6
- `/convex-type-fixes` - Fix TS2589 errors

See `~/.claude/CLAUDE.md` and `~/.claude/KNOWLEDGE_MAP.md` for full configuration.

### Skill Documentation

Each skill has comprehensive inline documentation. Read the `instructions.md` file for:
- When to use the skill
- Key concepts and patterns
- Code examples
- Common pitfalls
- Quick reference tables

---

## 🎓 Learning Path

For new developers joining the project:

1. **Start with**: `convex-best-practices-2026` - Understand backend patterns
2. **Then**: `nextjs15-app-router-2026` - Learn frontend architecture
3. **Next**: `react19-patterns-2026` - Master component patterns
4. **Finally**: `testing-2026` - Write comprehensive tests

Each skill builds on the previous one and follows the data flow: **Backend → Frontend → Components → Tests**

---

## 📊 Project Stats

- **Total Skills**: 50+ (including inherited skills)
- **2026 Updated Skills**: 5 (Core framework skills)
- **Code Examples**: 15,000+ (across all Context7 sources)
- **Documentation Sources**: 5 primary + 50+ supporting
- **Last Updated**: January 2026

---

## 🤝 Contributing

When adding new patterns or updating skills:

1. Verify against official documentation (use Context7/Deepwiki)
2. Include code examples
3. Document common pitfalls
4. Add to appropriate skill or create new one
5. Update this README with changes

---

## 📞 Support

For questions about skills or patterns:
1. Check the relevant skill's `instructions.md`
2. Reference official documentation links in each skill
3. Use Context7 MCP to fetch latest patterns: `/context7-auto-research`

---

**Last Updated**: January 28, 2026
**Maintained By**: Claude Code with Context7 MCP integration
**Framework Versions**: Convex (latest), Next.js 15.1.8, React 19, Vitest 4.0.7, Playwright 1.51.0
