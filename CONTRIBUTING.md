# Contributing to LTCG

Thank you for your interest in contributing to LTCG! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites

- **Bun 1.3.5+** - Fast JavaScript runtime
- **Node.js 18+** - For compatibility
- **Git** - Version control
- **VS Code** (recommended) - With recommended extensions

### Initial Setup

1. Clone the repository:
```bash
git clone https://github.com/ltcg/ltcg.git
cd ltcg
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the setup wizard:
```bash
bun run setup:wizard
```

5. Start development servers:
```bash
bun run dev:all  # Start all services (Convex, web, admin, agent)
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Making Changes

1. Create a new branch from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes following our [Code Standards](#code-standards)

3. Run quality checks:
```bash
bun run lint        # Lint code
bun run type-check  # TypeScript validation
bun run test:unit   # Run unit tests
```

4. Commit your changes (hooks will run automatically):
```bash
git add .
git commit -m "feat: add new feature"
```

5. Push and create a pull request:
```bash
git push origin feature/your-feature-name
```

## Code Standards

### Style Guide

We use **Biome** for formatting and linting:
- Auto-formats on save (VS Code)
- Auto-formats on commit (Git hooks)
- Runs in CI pipeline

### TypeScript

- Strict mode enabled
- Prefer type inference over explicit types (see CLAUDE.md)
- Use Zod for runtime validation
- Document complex types with JSDoc

### File Organization

```
apps/
├── web/          # Main application
├── admin/        # Admin dashboard
packages/
├── core/         # Shared types, utils, validators, config
├── plugin-ltcg/  # ElizaOS plugin
convex/           # Backend (Convex database)
```

### Naming Conventions

- **Files**: kebab-case (`user-profile.tsx`)
- **Components**: PascalCase (`UserProfile`)
- **Functions**: camelCase (`getUserProfile`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Commit Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, semicolons, etc.
- `refactor`: Code change (not a bug fix or feature)
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Build process, tooling, etc.
- `ci`: CI configuration changes
- `build`: Build system changes

### Examples

```bash
feat: add battle pass progression tracking
fix: resolve wallet connection timeout issue
docs: update README with new setup instructions
refactor: simplify card effect validation logic
```

### Commit Hooks

Pre-commit hooks automatically:
- Format code with Biome
- Lint staged files
- Run related tests

Pre-push hooks:
- Run full type checking

These are configured via Husky and cannot be skipped without `--no-verify` (not recommended).

## Pull Request Process

1. **Fill out the PR template** completely
2. **Link related issues** using keywords (Closes #123)
3. **Request reviews** from relevant team members
4. **Address feedback** promptly
5. **Squash commits** if requested
6. **Wait for CI** to pass before merging

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No new warnings
- [ ] All CI checks pass
- [ ] Conventional commit format used

## Testing

### Running Tests

```bash
# Unit tests
bun run test:unit
bun run test:unit:watch    # Watch mode

# Integration tests
bun run test:integration

# E2E tests
bun run test:e2e
bun run test:e2e:ui        # With Playwright UI

# All tests
bun run test:all

# Coverage
bun run test:coverage
```

### Writing Tests

- Place tests next to source files (`*.test.ts`)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 70%+ coverage

### Test Structure

```typescript
import { describe, it, expect } from "vitest";

describe("UserProfile", () => {
  it("should render user name", () => {
    // Arrange
    const user = { name: "John Doe" };
    
    // Act
    const result = renderProfile(user);
    
    // Assert
    expect(result).toContain("John Doe");
  });
});
```

## Project Structure

### Monorepo Layout

```
ltcg/
├── apps/
│   ├── web/              # Next.js web app
│   ├── admin/            # Admin dashboard
│   └── docs/             # Documentation site
├── packages/
│   ├── core/             # Shared code
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utility functions
│   │   ├── validators/   # Zod schemas
│   │   └── config/       # Shared configs
│   └── plugin-ltcg/      # ElizaOS plugin
├── convex/               # Backend logic
│   ├── admin/            # Admin functions
│   ├── core/             # Core game logic
│   ├── gameplay/         # Game mechanics
│   ├── progression/      # Player progression
│   └── schema.ts         # Database schema
├── scripts/              # Build/dev scripts
├── e2e/                  # End-to-end tests
└── docs/                 # Additional documentation
```

### Key Files

- `turbo.json` - Monorepo task configuration
- `biome.json` - Linting/formatting rules
- `.lintstagedrc.json` - Pre-commit checks
- `commitlint.config.js` - Commit message validation

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/ltcg/ltcg/issues)
- **Discussions**: Start a [GitHub Discussion](https://github.com/ltcg/ltcg/discussions)
- **Documentation**: See `/docs` folder and README files

## Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something great together.

---

Thank you for contributing to LTCG! 🎮
