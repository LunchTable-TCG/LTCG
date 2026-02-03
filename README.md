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

## Quick Start

### First-Time Setup (Recommended)

Use the interactive setup wizard:

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Convex and Privy credentials

# 3. Run setup wizard
bun run setup:wizard
```

The wizard will:
- ✅ Validate environment
- ✅ Seed all game data (cards, story, configs)
- ✅ Guide you through creating your first admin user

**See [SETUP.md](./SETUP.md) for complete setup documentation.**

### Manual Setup

If you prefer manual control:

```bash
# 1. Install dependencies
bun install

# 2. Set up environment variables
cp .env.example .env.local

# 3. Deploy Convex
npx convex dev

# 4. Run complete setup
bun run setup

# 5. Create superadmin (replace with your Privy user ID)
bun run setup:superadmin --privyUserId "did:privy:YOUR_ID"

# 6. Start development
bun run dev
```

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Convex](https://www.convex.dev) account
- [Privy](https://www.privy.io) account (for authentication)

### Environment Variables

See [.env.example](./.env.example) for complete list. Required:

```bash
# Convex
CONVEX_DEPLOYMENT=dev:your-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Privy Authentication
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
```

## Scripts

```bash
# Setup & Seeding
bun run setup:wizard      # 🧙 Interactive setup wizard (recommended)
bun run setup             # Complete automated setup
bun run setup:quick       # Quick setup (dev only, essential data)
bun run setup:superadmin  # Create superadmin user
bun run setup:status      # Check setup status
bun run validate:env      # Validate environment variables
bun run seed:cards        # Seed only cards (155+)
bun run seed:story        # Seed only story content
bun run seed:configs      # Seed only configurations

# Development
bun run dev               # Start Convex + web app
bun run dev:admin         # Start admin dashboard
bun run dev:all           # Start everything (incl. Claude agent)

# Building
bun run build             # Build all apps
bun run build:web         # Build web app only
bun run build:admin       # Build admin only

# Testing
bun run test              # Run unit tests (watch)
bun run test:once         # Run tests once
bun run test:e2e          # Run E2E tests
bun run test:all          # Run all tests

# Code Quality
bun run lint              # Lint all packages
bun run format            # Format with Biome
bun run type-check        # TypeScript check all packages
bun run type-safety       # Comprehensive type safety check

# Migrations
bun run migrate:admins    # Migrate admin roles schema
bun run migrate:treasury  # Migrate treasury wallets schema
```

## Documentation

### Getting Started
- **[SETUP.md](./SETUP.md)** - Complete setup guide with troubleshooting
- **[scripts/README.md](./scripts/README.md)** - Available scripts and utilities

### Technical Documentation
See [docs/](./docs/) for detailed documentation:

- [Schema Documentation](./docs/schema.md) - Database schema
- [API Reference](./docs/api/core.md) - Core API docs
- [Testing Guide](./docs/testing.md) - Test suite docs
- [CI/CD Setup](./docs/CI_CD_SETUP.md) - GitHub Actions configuration

## Deployment

Both apps are configured for Vercel deployment:

- **Web App:** Configure root directory as `apps/web`
- **Admin App:** Configure root directory as `apps/admin`

See [docs/CI_CD_SETUP.md](./docs/CI_CD_SETUP.md) for GitHub Actions configuration.

## License

MIT
