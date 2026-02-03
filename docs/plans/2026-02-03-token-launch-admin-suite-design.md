# LunchTable Token Launch Admin Suite

**Date:** 2026-02-03
**Status:** Approved
**Author:** Claude + Human collaboration

## Overview

Full admin suite for the LunchTable Token (LTCG) launch on pump.fun, including:

- **Treasury Wallet System** - Privy server wallets for fee collection, distribution, and liquidity management
- **Token Launch Control Center** - Pre-launch configuration, checklist, team approvals, and launch coordination
- **Token Analytics Dashboard** - Real-time monitoring of holders, trading, price, and bonding curve progress
- **Multi-Channel Alerting** - Configurable alerts via in-app, push, Slack, and Discord

## Architecture

### Directory Structure

```
apps/admin/src/app/
├── token/                      # Token Launch Control Center
│   ├── page.tsx               # Overview dashboard
│   ├── config/                # Token configuration
│   ├── launch/                # Launch checklist & control
│   └── team/                  # Team coordination & approvals
├── treasury/                   # Treasury Management
│   ├── page.tsx               # Treasury overview
│   ├── wallets/               # Wallet management
│   ├── transactions/          # Transaction history
│   └── policies/              # Spending policies
├── analytics/
│   └── token/                 # Token Analytics (post-launch)
│       ├── page.tsx           # Main dashboard
│       ├── holders/           # Holder analytics
│       ├── trading/           # Trading metrics
│       └── bonding/           # Bonding curve progress
└── alerts/                     # Alert Configuration
    ├── page.tsx               # Alert rules
    └── channels/              # Notification channels

convex/
├── treasury/                   # Treasury operations
│   ├── wallets.ts             # Privy server wallet management
│   ├── transactions.ts        # Transaction tracking
│   └── policies.ts            # Spending policies
├── tokenLaunch/               # Launch management
│   ├── config.ts              # Token configuration
│   ├── checklist.ts           # Launch checklist
│   └── approvals.ts           # Multi-admin approvals
├── tokenAnalytics/            # Analytics ingestion
│   ├── webhooks.ts            # Helius webhook handlers
│   ├── holders.ts             # Holder tracking
│   ├── trades.ts              # Trade recording
│   └── metrics.ts             # Aggregated metrics
└── alerts/                     # Alert system
    ├── rules.ts               # Alert rule definitions
    ├── channels.ts            # Channel configuration
    ├── dispatch.ts            # Multi-channel dispatch
    └── history.ts             # Alert history
```

---

## Database Schema

### Treasury Tables

```typescript
// Treasury wallets managed via Privy
treasuryWallets: defineTable({
  privyWalletId: v.string(),
  address: v.string(),
  name: v.string(),
  purpose: v.union(
    v.literal("fee_collection"),
    v.literal("distribution"),
    v.literal("liquidity"),
    v.literal("reserves")
  ),
  balance: v.optional(v.number()),
  tokenBalance: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
  policyId: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("frozen"), v.literal("archived")),
  createdBy: v.id("admins"),
  createdAt: v.number(),
})
  .index("by_purpose", ["purpose"])
  .index("by_address", ["address"]),

// All treasury transactions
treasuryTransactions: defineTable({
  walletId: v.id("treasuryWallets"),
  type: v.union(
    v.literal("fee_received"),
    v.literal("distribution"),
    v.literal("liquidity_add"),
    v.literal("liquidity_remove"),
    v.literal("transfer_internal"),
    v.literal("transfer_external")
  ),
  amount: v.number(),
  tokenMint: v.string(),
  signature: v.optional(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("submitted"),
    v.literal("confirmed"),
    v.literal("failed")
  ),
  metadata: v.optional(v.any()),
  initiatedBy: v.optional(v.id("admins")),
  approvedBy: v.optional(v.array(v.id("admins"))),
  createdAt: v.number(),
  confirmedAt: v.optional(v.number()),
})
  .index("by_wallet", ["walletId"])
  .index("by_status", ["status"])
  .index("by_type", ["type"]),

// Spending policies
treasuryPolicies: defineTable({
  name: v.string(),
  privyPolicyId: v.string(),
  rules: v.object({
    maxTransactionAmount: v.optional(v.number()),
    dailyLimit: v.optional(v.number()),
    allowedRecipients: v.optional(v.array(v.string())),
    requiresApproval: v.boolean(),
    minApprovers: v.optional(v.number()),
  }),
  createdBy: v.id("admins"),
  createdAt: v.number(),
}),
```

### Token Launch Tables

```typescript
// Token configuration
tokenConfig: defineTable({
  name: v.string(),
  symbol: v.string(),
  description: v.string(),
  imageUrl: v.optional(v.string()),
  twitter: v.optional(v.string()),
  telegram: v.optional(v.string()),
  website: v.optional(v.string()),
  initialSupply: v.optional(v.number()),
  targetMarketCap: v.optional(v.number()),
  mintAddress: v.optional(v.string()),
  bondingCurveAddress: v.optional(v.string()),
  launchedAt: v.optional(v.number()),
  graduatedAt: v.optional(v.number()),
  status: v.union(
    v.literal("draft"),
    v.literal("ready"),
    v.literal("launched"),
    v.literal("graduated")
  ),
  updatedAt: v.number(),
}),

// Launch checklist items
launchChecklist: defineTable({
  category: v.union(
    v.literal("treasury"),
    v.literal("token"),
    v.literal("marketing"),
    v.literal("technical"),
    v.literal("team")
  ),
  item: v.string(),
  description: v.optional(v.string()),
  isRequired: v.boolean(),
  isCompleted: v.boolean(),
  completedBy: v.optional(v.id("admins")),
  completedAt: v.optional(v.number()),
  evidence: v.optional(v.string()),
  order: v.number(),
})
  .index("by_category", ["category"])
  .index("by_completed", ["isCompleted"]),

// Multi-admin launch approvals
launchApprovals: defineTable({
  adminId: v.id("admins"),
  approved: v.boolean(),
  comments: v.optional(v.string()),
  approvedAt: v.number(),
})
  .index("by_admin", ["adminId"]),

// Launch schedule
launchSchedule: defineTable({
  scheduledAt: v.optional(v.number()),
  timezone: v.string(),
  countdownEnabled: v.boolean(),
  status: v.union(
    v.literal("not_scheduled"),
    v.literal("scheduled"),
    v.literal("countdown"),
    v.literal("go"),
    v.literal("launched"),
    v.literal("aborted")
  ),
  launchTxSignature: v.optional(v.string()),
  abortReason: v.optional(v.string()),
}),
```

### Token Analytics Tables

```typescript
// Real-time token metrics
tokenMetrics: defineTable({
  timestamp: v.number(),
  price: v.number(),
  priceUsd: v.number(),
  marketCap: v.number(),
  volume24h: v.number(),
  txCount24h: v.number(),
  holderCount: v.number(),
  liquidity: v.number(),
  bondingCurveProgress: v.number(),
  graduationEta: v.optional(v.number()),
})
  .index("by_timestamp", ["timestamp"]),

// Holder snapshots
tokenHolders: defineTable({
  address: v.string(),
  balance: v.number(),
  percentOwnership: v.number(),
  firstPurchaseAt: v.number(),
  lastActivityAt: v.number(),
  totalBought: v.number(),
  totalSold: v.number(),
  isPlatformWallet: v.boolean(),
  label: v.optional(v.string()),
})
  .index("by_balance", ["balance"])
  .index("by_address", ["address"]),

// Individual trades
tokenTrades: defineTable({
  signature: v.string(),
  type: v.union(v.literal("buy"), v.literal("sell")),
  traderAddress: v.string(),
  tokenAmount: v.number(),
  solAmount: v.number(),
  pricePerToken: v.number(),
  timestamp: v.number(),
  isWhale: v.boolean(),
})
  .index("by_timestamp", ["timestamp"])
  .index("by_trader", ["traderAddress"])
  .index("by_type", ["type"]),

// Aggregated stats
tokenStatsRollup: defineTable({
  period: v.union(v.literal("hour"), v.literal("day")),
  periodStart: v.number(),
  volume: v.number(),
  buyVolume: v.number(),
  sellVolume: v.number(),
  txCount: v.number(),
  buyCount: v.number(),
  sellCount: v.number(),
  uniqueTraders: v.number(),
  highPrice: v.number(),
  lowPrice: v.number(),
  openPrice: v.number(),
  closePrice: v.number(),
  newHolders: v.number(),
  lostHolders: v.number(),
})
  .index("by_period", ["period", "periodStart"]),
```

### Alert Tables

```typescript
// Alert rule definitions
alertRules: defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  isEnabled: v.boolean(),
  triggerType: v.union(
    v.literal("price_change"),
    v.literal("price_threshold"),
    v.literal("volume_spike"),
    v.literal("whale_activity"),
    v.literal("holder_milestone"),
    v.literal("bonding_progress"),
    v.literal("treasury_balance"),
    v.literal("transaction_failed"),
    v.literal("graduation")
  ),
  conditions: v.object({
    threshold: v.optional(v.number()),
    direction: v.optional(v.union(v.literal("above"), v.literal("below"), v.literal("change"))),
    timeframeMinutes: v.optional(v.number()),
    percentChange: v.optional(v.number()),
  }),
  severity: v.union(
    v.literal("info"),
    v.literal("warning"),
    v.literal("critical")
  ),
  cooldownMinutes: v.number(),
  lastTriggeredAt: v.optional(v.number()),
  createdBy: v.id("admins"),
  createdAt: v.number(),
})
  .index("by_type", ["triggerType"])
  .index("by_enabled", ["isEnabled"]),

// Notification channels
alertChannels: defineTable({
  type: v.union(
    v.literal("in_app"),
    v.literal("push"),
    v.literal("slack"),
    v.literal("discord"),
    v.literal("email")
  ),
  name: v.string(),
  isEnabled: v.boolean(),
  config: v.object({
    webhookUrl: v.optional(v.string()),
    email: v.optional(v.string()),
    minSeverity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
  }),
  createdAt: v.number(),
})
  .index("by_type", ["type"]),

// Alert history
alertHistory: defineTable({
  ruleId: v.id("alertRules"),
  severity: v.string(),
  title: v.string(),
  message: v.string(),
  data: v.optional(v.any()),
  channelsNotified: v.array(v.string()),
  acknowledgedBy: v.optional(v.id("admins")),
  acknowledgedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_rule", ["ruleId"])
  .index("by_acknowledged", ["acknowledgedBy"])
  .index("by_created", ["createdAt"]),
```

---

## Integrations

### Privy Server Wallets

Treasury wallets are created and managed via Privy's server wallet API:

- **Endpoint:** `POST https://api.privy.io/v1/wallets`
- **Chain:** Solana
- **Features:** Policy engine, multi-sig approvals, webhooks for balance changes

```typescript
// Create treasury wallet
const wallet = await privy.walletApi.create({
  chainType: "solana",
  policyIds: [policyId],
});
```

### Helius Webhooks

Real-time token transaction monitoring via Helius enhanced webhooks:

- **Endpoint:** `POST /webhooks/helius` (Convex HTTP action)
- **Events:** SWAP, TRANSFER, TOKEN_MINT, BURN
- **Filter:** LTCG token mint address

### Bitquery API

Historical data backfill for trades and holder history:

- **Endpoint:** `https://graphql.bitquery.io`
- **Data:** DEXTrades, token transfers, holder balances

### Notification Channels

- **Slack:** Incoming webhooks for team alerts
- **Discord:** Webhook embeds for community alerts
- **Push:** Web Push API for admin notifications

---

## Default Alert Rules

| Alert | Trigger | Severity | Channels |
|-------|---------|----------|----------|
| Whale Buy | Purchase > 1% supply | Critical | All |
| Whale Sell | Sale > 1% supply | Critical | All |
| Price Pump | +20% in 5 min | Warning | In-app, Push, Discord |
| Price Dump | -20% in 5 min | Critical | All |
| Graduation Near | 95% bonding progress | Warning | All |
| Graduated! | Token graduated | Critical | All |
| New ATH | Price all-time high | Info | In-app, Discord |
| Holder Milestone | Every 1000 holders | Info | In-app, Discord |
| Treasury Low | < 1 SOL balance | Critical | All |
| Failed Transaction | Any treasury tx failed | Critical | All |

---

## Environment Variables

```bash
# Privy Server Wallets
PRIVY_APP_ID=
PRIVY_APP_SECRET=

# Webhooks
HELIUS_API_KEY=
HELIUS_WEBHOOK_SECRET=

# Historical Data
BITQUERY_API_KEY=

# Notifications
SLACK_WEBHOOK_URL=
DISCORD_WEBHOOK_URL=

# Token Config (after launch)
LTCG_TOKEN_MINT=
```

---

## Implementation Phases

### Phase 1 - Foundation (Treasury + Schema)
1. Add all database tables to Convex schema
2. Implement Privy server wallet integration
3. Create treasury wallet management UI
4. Set up basic treasury transactions

### Phase 2 - Token Launch Control
1. Token configuration page
2. Launch checklist system
3. Multi-admin approval workflow
4. Launch control dashboard with countdown

### Phase 3 - Webhook Infrastructure
1. Configure Helius webhook endpoints
2. Implement transaction parsers
3. Set up real-time metrics aggregation
4. Add historical backfill from Bitquery

### Phase 4 - Analytics Dashboard
1. Token overview page with key metrics
2. Holder analytics with distribution charts
3. Trading view with live feed
4. Bonding curve progress tracker

### Phase 5 - Alerting System
1. Alert rules configuration UI
2. Channel setup (Slack/Discord webhooks)
3. Dispatch engine with severity routing
4. Alert history and acknowledgment

---

## File Estimates

- ~15 new Convex files (schema, queries, mutations, actions)
- ~25 new admin app pages/components
- ~5 new UI components (charts, live feed, etc.)

---

## Sources

- [Privy Server Wallets Documentation](https://docs.privy.io/guide/overview-server-wallets)
- [Privy Treasury Wallets Guide](https://docs.privy.io/recipes/wallets/treasury-wallets)
- [Privy Wallet API Reference](https://docs.privy.io/api-reference/wallets/create)
- [Bitquery Pump.fun API](https://docs.bitquery.io/docs/blockchain/Solana/Pumpfun/Pump-Fun-API/)
- [Moralis Pump.fun Support](https://docs.moralis.com/web3-data-api/solana/tutorials/introduction-to-pump-fun-api-support-in-moralis)
- [Helius Webhooks](https://docs.helius.dev/webhooks/getting-started)
