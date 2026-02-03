# LTCG Admin Setup Guide

Complete guide for setting up the LTCG admin system from scratch.

## Prerequisites

1. **Node.js/Bun** installed
2. **Convex account** with a project deployed
3. **Privy account** configured for authentication
4. **Solana RPC** endpoint (optional, for treasury features)
5. **Environment variables** configured (see `.env.example`)

## Quick Start (Automated)

### 1. Complete Setup (Production)

Run the complete automated setup for a fresh deployment:

```bash
bun run setup
```

This will:
- ✅ Create system user
- ✅ Seed default configurations
- ✅ Seed AI configurations
- ✅ Setup treasury policies
- ✅ Seed starter cards (155+ cards)
- ✅ Seed story chapters and stages
- ✅ Initialize progression system (quests & achievements)
- ✅ Setup alert channels and rules

**Time:** ~30-60 seconds

### 2. Create First Superadmin

After setup completes, create your first admin user:

```bash
# Get your Privy user ID from dashboard or after logging in
bun run setup:superadmin --privyUserId "did:privy:YOUR_USER_ID"
```

### 3. Verify Setup

Check that everything is configured correctly:

```bash
bun run setup:status
```

Expected output:
```json
{
  "isSetupComplete": true,
  "needsSuperadmin": false,
  "details": {
    "systemUser": true,
    "configs": 15,
    "aiConfigs": 5,
    "treasuryPolicies": 3,
    "starterCards": 155,
    "storyChapters": 5,
    "storyStages": 50,
    "quests": 20,
    "achievements": 30,
    "alertChannels": 4,
    "alertRules": 6,
    "superadmins": 1,
    "admins": 1
  }
}
```

## Development Setup

### Quick Setup (Essential Data Only)

For rapid development iteration, use quick setup:

```bash
bun run setup:quick
```

This seeds only:
- System user
- Configs (system + AI)
- Starter cards

**Time:** ~5-10 seconds

### Individual Seed Commands

Run specific seed functions as needed:

```bash
# Seed only cards
bun run seed:cards

# Seed only story content
bun run seed:story

# Seed only configurations
bun run seed:configs
```

## Manual Setup (Advanced)

If you prefer manual control, run functions individually:

### Step 1: System Bootstrap

```bash
# Create system user
npx convex run setupSystem:createSystemUser --prod

# Create your superadmin
npx convex run setupSystem:bootstrapSuperadmin \
  --privyUserId "did:privy:YOUR_USER_ID" --prod
```

### Step 2: Configuration

```bash
# System configs
npx convex run admin/config:seedDefaultConfigs --prod

# AI configs
npx convex run admin/aiConfig:seedAIDefaultConfigs --prod

# Treasury policies
npx convex run treasury/policies:setupDefaultPolicies --prod
```

### Step 3: Game Content

```bash
# Starter cards
npx convex run scripts/seedStarterCards:seedStarterCards --prod

# Story chapters
npx convex run scripts/seedStoryChapters:seedStoryChapters --prod
```

### Step 4: Progression & Alerts

```bash
# Quests and achievements
npx convex run setupSystem:initializeProgressionSystem --prod

# Alert channels
npx convex run alerts/channels:setupDefaults --prod

# Alert rules
npx convex run alerts/rules:setupDefaults --prod
```

## Environment Variables

Required environment variables (see `.env.example`):

### Convex
```env
CONVEX_DEPLOYMENT=       # Your Convex deployment name
NEXT_PUBLIC_CONVEX_URL=  # Your Convex URL
```

### Privy Authentication
```env
NEXT_PUBLIC_PRIVY_APP_ID=  # Privy app ID
PRIVY_APP_SECRET=          # Privy app secret (server-side)
PRIVY_APP_ID=              # Privy app ID (server-side)
```

### Solana (Optional)
```env
NEXT_PUBLIC_SOLANA_RPC=    # Solana RPC endpoint
NEXT_PUBLIC_SOLANA_NETWORK= # mainnet-beta | devnet | testnet
```

### Token Configuration
```env
NEXT_PUBLIC_LTCG_TOKEN_MINT=      # LTCG token mint address
NEXT_PUBLIC_LTCG_TOKEN_DECIMALS=6 # Token decimals
```

## Admin Roles Hierarchy

The system uses a hierarchical role system:

1. **Superadmin** (highest privileges)
   - Can grant/revoke all roles including other superadmins
   - Full system access

2. **Admin**
   - Manage users, content, economy
   - Cannot manage other admins

3. **Moderator**
   - Content moderation
   - User management (limited)

4. **Support**
   - Read-only access
   - Ticket management

5. **Viewer**
   - Read-only dashboard access

### Promoting Users

Use the admin dashboard or Convex functions:

```bash
# Promote to admin
npx convex run admin/roles:grantRole \
  --targetUserId "USER_ID" \
  --role "admin" --prod

# Promote to superadmin (requires existing superadmin)
npx convex run admin/roles:grantRole \
  --targetUserId "USER_ID" \
  --role "superadmin" --prod
```

## Migrations

Run database migrations when needed:

```bash
# Migrate admin roles to new schema
bun run migrate:admins

# Migrate treasury wallets (add creationStatus)
bun run migrate:treasury
```

## Reset Everything (Dev/Test Only)

⚠️ **DANGER:** This deletes all seeded data!

```bash
bun run setup:reset
```

Then re-run setup:
```bash
bun run setup
```

## Troubleshooting

### Issue: "No superadmins found"

**Solution:** Run setup:superadmin with your Privy user ID:
```bash
bun run setup:superadmin --privyUserId "did:privy:YOUR_ID"
```

### Issue: "Setup incomplete"

**Solution:** Check status and re-run missing steps:
```bash
bun run setup:status
bun run setup:complete
```

### Issue: "Cards not found"

**Solution:** Re-seed cards:
```bash
bun run seed:cards
```

### Issue: "Privy authentication failed"

**Solution:** Verify environment variables:
1. Check `.env.local` has `PRIVY_APP_ID` and `PRIVY_APP_SECRET`
2. Ensure values match your Privy dashboard
3. Restart dev server after changes

### Issue: "Treasury wallet creation failed"

**Solution:** Check Privy credentials and run migration:
```bash
bun run migrate:treasury
```

## Testing the Setup

### 1. Start Development Servers

```bash
# Start all (convex + web + admin)
bun run dev

# Start only admin
bun run dev:admin
```

### 2. Login to Admin Dashboard

1. Navigate to `http://localhost:3001`
2. Login with Privy using your superadmin account
3. Verify you see the admin dashboard

### 3. Verify Features

Check these pages work:
- `/` - Dashboard with metrics
- `/users` - User management
- `/cards` - Card catalog (155+ cards)
- `/economy` - Economy settings
- `/treasury` - Treasury wallets (if configured)
- `/alerts` - Alert management

### 4. Run Tests

```bash
# Unit tests
bun run test:unit

# E2E tests (requires setup)
bun run test:e2e:smoke
```

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured on Vercel/hosting
- [ ] Convex production deployment created
- [ ] Privy production app configured
- [ ] Solana mainnet RPC configured (if using treasury)
- [ ] Run complete setup on production:
  ```bash
  convex run setup:setupComplete --prod
  ```
- [ ] Create superadmin on production:
  ```bash
  convex run setup:setupSuperadmin \
    --privyUserId "YOUR_PROD_PRIVY_ID" --prod
  ```
- [ ] Verify setup status:
  ```bash
  convex run setup:checkSetupStatus --prod
  ```

### Post-Deployment

1. Test admin login on production domain
2. Verify all features work
3. Set up monitoring/alerts
4. Document admin credentials securely

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Admin Dashboard (Next.js)        │
│  - User Management                       │
│  - Content Management                    │
│  - Economy Controls                      │
│  - Treasury Operations                   │
└──────────────┬──────────────────────────┘
               │
               │ Convex Client
               ↓
┌─────────────────────────────────────────┐
│         Convex Backend                   │
│  ┌────────────────────────────────────┐ │
│  │  Authentication (Privy)            │ │
│  │  - Role-based access control       │ │
│  │  - Session management              │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Core Systems                      │ │
│  │  - User management                 │ │
│  │  - Card catalog                    │ │
│  │  - Economy system                  │ │
│  │  - Progression (quests/achieve)    │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Treasury Management               │ │
│  │  - Wallet creation (Privy)         │ │
│  │  - Balance tracking                │ │
│  │  - Policy management               │ │
│  └────────────────────────────────────┘ │
│  ┌────────────────────────────────────┐ │
│  │  Monitoring & Alerts               │ │
│  │  - System health                   │ │
│  │  - Alert rules                     │ │
│  │  - Notification channels           │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Support

For issues or questions:
1. Check this guide first
2. Review Convex logs: `npx convex logs`
3. Check troubleshooting section above
4. Review admin audit logs in dashboard

## References

- [Convex Documentation](https://docs.convex.dev)
- [Privy Documentation](https://docs.privy.io)
- [Next.js Documentation](https://nextjs.org/docs)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
