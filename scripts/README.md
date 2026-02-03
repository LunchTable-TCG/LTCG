# Scripts Directory

Utility scripts for LTCG project setup, validation, and maintenance.

## Available Scripts

### Setup & Validation

#### `validate-env.ts`
Validates that all required environment variables are configured.

**Usage:**
```bash
bun run validate:env
```

**Checks:**
- ✅ Required variables (Convex, Privy)
- ⚪ Optional variables (Solana, Storage, Feature flags)
- Provides helpful error messages for missing config

#### `setup-wizard.ts`
Interactive wizard that guides through first-time setup.

**Usage:**
```bash
bun run setup:wizard
```

**Steps:**
1. ✅ Check prerequisites (Bun, Convex CLI)
2. ✅ Validate environment variables
3. ✅ Verify Convex deployment
4. ✅ Run complete setup (seed all data)
5. ✅ Verify setup status
6. 📝 Show next steps (create superadmin, start dev)

**When to use:**
- First time setting up the project
- After cloning the repository
- When setting up a new deployment

### Type Safety

#### `type-safety-check.ts`
Comprehensive TypeScript type safety check across all packages.

**Usage:**
```bash
bun run type-safety
```

**Checks:**
- Root types
- Web app types
- Admin app types
- Convex backend types
- Plugin types

## NPM Scripts Reference

### Setup Commands

| Command | Description |
|---------|-------------|
| `bun run setup:wizard` | 🧙 Interactive setup wizard (recommended for first-time) |
| `bun run setup` | Complete automated setup |
| `bun run setup:complete` | Run all setup functions in correct order |
| `bun run setup:quick` | Quick setup (essential data only, for dev) |
| `bun run setup:superadmin` | Create first superadmin user (requires --privyUserId) |
| `bun run setup:status` | Check what's been set up and what's missing |
| `bun run setup:reset` | ⚠️ DANGER: Delete all seeded data (dev/test only) |

### Seed Commands

| Command | Description |
|---------|-------------|
| `bun run seed:cards` | Seed only starter cards (155+ cards) |
| `bun run seed:story` | Seed only story chapters and stages |
| `bun run seed:configs` | Seed only system configurations |

### Migration Commands

| Command | Description |
|---------|-------------|
| `bun run migrate:admins` | Migrate admin roles to new schema |
| `bun run migrate:treasury` | Migrate treasury wallets (add creationStatus) |

### Validation Commands

| Command | Description |
|---------|-------------|
| `bun run validate:env` | Check environment variables |

## First-Time Setup Flow

For a fresh deployment, follow this order:

```bash
# 1. Interactive wizard (recommended)
bun run setup:wizard

# OR manual setup:

# 1. Validate environment
bun run validate:env

# 2. Run complete setup
bun run setup

# 3. Create superadmin
bun run setup:superadmin --privyUserId "did:privy:YOUR_ID"

# 4. Verify everything
bun run setup:status

# 5. Start development
bun run dev
```

## Development Workflow

### Quick Iteration Setup

For rapid development, use quick setup:

```bash
# Seed only essential data
bun run setup:quick

# Start dev servers
bun run dev
```

### Reset and Re-seed

To clear and re-seed data during development:

```bash
# Clear all seeded data
bun run setup:reset

# Re-run quick setup
bun run setup:quick
```

## Production Deployment

For production, ensure you use `--prod` flag:

```bash
# Setup production deployment
npx convex run setup:setupComplete --prod

# Create production superadmin
npx convex run setup:setupSuperadmin \
  --privyUserId "YOUR_PROD_PRIVY_ID" --prod

# Verify production setup
npx convex run setup:checkSetupStatus --prod
```

## Troubleshooting

### "Environment validation failed"

**Solution:**
1. Copy `.env.example` to `.env.local`
2. Fill in required values
3. Run `bun run validate:env` again

### "No Convex deployment detected"

**Solution:**
1. Run `npx convex dev`
2. Follow prompts to create deployment
3. Re-run setup

### "Setup failed"

**Solution:**
1. Check Convex logs: `npx convex logs`
2. Try individual seed commands to isolate issue
3. Verify environment variables are correct
4. Check SETUP.md for detailed troubleshooting

## Script Development

When adding new scripts:

1. **Create TypeScript file** in `scripts/` directory
2. **Add shebang** if making executable: `#!/usr/bin/env bun`
3. **Add npm script** to `package.json`
4. **Document here** with usage and examples
5. **Test** with both dev and prod flags

### Example Script Template

```typescript
/**
 * Script Name
 *
 * Description of what this script does.
 */

async function main() {
  console.log("🚀 Starting script...");

  try {
    // Your logic here

    console.log("✅ Script completed successfully");
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

main();
```

## Related Documentation

- [SETUP.md](../SETUP.md) - Complete setup guide
- [.env.example](../.env.example) - Environment variables template
- [convex/setup.ts](../convex/setup.ts) - Convex setup functions

## Support

For issues with scripts:
1. Check script output for specific errors
2. Review SETUP.md troubleshooting section
3. Check Convex logs: `npx convex logs`
4. Verify environment configuration
