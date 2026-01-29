# Lunchtable Trading Card Game

A Yu-Gi-Oh! inspired multiplayer card game built with Convex, Next.js 15, and React 19.

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 4
- **Backend:** Convex (real-time database + serverless functions)
- **Auth:** Convex Auth + Solana wallet authentication
- **Runtime:** Bun 1.3+
- **Deployment:** Vercel

## Monorepo Structure

```
apps/
├── web/          # Main game client (port 3333)
└── admin/        # Admin dashboard (port 3001)

convex/           # Convex backend functions & schema
docs/             # Documentation
e2e/              # Playwright E2E tests
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Convex CLI](https://docs.convex.dev/getting-started)

### Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local

# Start development (Convex + web app)
bun run dev

# Or start all apps
bun run dev:all
```

### Environment Variables

```bash
# Required
CONVEX_DEPLOYMENT=     # Your Convex deployment
NEXT_PUBLIC_CONVEX_URL= # Convex URL for frontend

# Optional
NEXT_PUBLIC_SOLANA_RPC_URL= # Solana RPC for wallet auth
```

## Scripts

```bash
# Development
bun run dev           # Start Convex + web app
bun run dev:admin     # Start admin dashboard
bun run dev:all       # Start everything

# Building
bun run build         # Build all apps
bun run build:web     # Build web app only
bun run build:admin   # Build admin only

# Testing
bun run test          # Run unit tests (watch)
bun run test:once     # Run tests once
bun run test:e2e      # Run E2E tests

# Code Quality
bun run lint          # Lint all packages
bun run format        # Format with Biome
bun run type-check    # TypeScript check
```

## Documentation

See [docs/](./docs/) for detailed documentation:

- [Schema Documentation](./docs/schema.md) - Database schema
- [API Reference](./docs/api/core.md) - Core API docs
- [Testing Guide](./docs/testing.md) - Test suite docs

## Deployment

Both apps are configured for Vercel deployment:

- **Web App:** Configure root directory as `apps/web`
- **Admin App:** Configure root directory as `apps/admin`

See [docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md) for GitHub Actions configuration.

## License

MIT
