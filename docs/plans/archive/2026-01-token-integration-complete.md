# Token Integration Task Graph - LTCG

## Overview

Integrate a pump.fun Solana token as a third currency into LTCG, enabling a self-driving economy where tokens are spent directly on cards via P2P marketplace.

## Economic Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    TWO-TIER CURRENCY SYSTEM                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TIER 1: GOLD (Free Currency)                                   │
│  ───────────────────────────                                    │
│  • Earned through: Wins, quests, story mode, achievements       │
│  • Spent on: Basic packs, Gold marketplace, casual tournaments  │
│  • Real value: None (inflationary, controlled by game)          │
│                                                                  │
│  TIER 2: TOKEN (Premium Currency)                               │
│  ────────────────────────────────                               │
│  • Obtained through: Purchase on DEX OR sell cards for tokens   │
│  • Spent on: Token marketplace (P2P card trades)                │
│  • Real value: Yes (pump.fun token, tradeable)                  │
│                                                                  │
│  KEY PRINCIPLE: No free tokens. Ever.                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Self-Driving Economy Flywheel

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│                     ┌──────────────┐                            │
│                     │   DEX/CEX    │                            │
│                     │  (pump.fun)  │                            │
│                     └──────┬───────┘                            │
│                            │ Buy tokens                          │
│                            ▼                                     │
│    ┌─────────────────────────────────────────────────────┐      │
│    │              TOKEN MARKETPLACE                       │      │
│    │                                                      │      │
│    │   BUYER ─────── Tokens ──────► SELLER              │      │
│    │          ◄────── Cards ────────                     │      │
│    │                                                      │      │
│    │   (5% fee to Treasury)                              │      │
│    └─────────────────────────────────────────────────────┘      │
│                            │                                     │
│                            │ Seller now has tokens               │
│                            ▼                                     │
│    ┌─────────────────────────────────────────────────────┐      │
│    │   Seller can:                                        │      │
│    │   • Buy other cards with tokens                      │      │
│    │   • Sell tokens on DEX for real money               │      │
│    │   • Hold tokens (speculation)                        │      │
│    └─────────────────────────────────────────────────────┘      │
│                            │                                     │
│    ┌─────────────────────────────────────────────────────┐      │
│    │   Where do cards come from?                          │      │
│    │   • Play games (wins drop cards)                     │      │
│    │   • Buy Gold packs (free currency)                   │      │
│    │   • Story mode rewards                               │      │
│    │   • Quest/achievement rewards                        │      │
│    └─────────────────────────────────────────────────────┘      │
│                                                                  │
│   The cycle is SELF-DRIVING because:                            │
│   • Card demand → Token demand → Token value                    │
│   • Gameplay produces cards → Sell for tokens → Real value      │
│   • No protocol intervention needed after launch                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Solana Library | `@solana/web3.js` 1.x | Privy uses 1.x; Anchor compatibility |
| Custody Model | Non-custodial (Privy embedded) | No custody liability; users control keys |
| Token Storage | On-chain (not deposited) | Simpler; users spend directly from wallet |
| Marketplace | Dual currency (Gold OR Token) | Preserves existing Gold economy |
| Fee Model | 5% to treasury wallet | Same as Gold; sustainable protocol revenue |

---

## Task Graph

### Phase 1: Foundation (No Dependencies)

| Task | Files | Description |
|------|-------|-------------|
| **T1.1** Schema Changes | `/convex/schema.ts` | Add walletAddress to users; new tokenBalanceCache, tokenTransactions, pendingTokenPurchases tables; add currencyType to marketplaceListings |
| **T1.2** Environment Config | `/convex/lib/constants.ts`, `.env.example` | Add TOKEN config (mint, decimals, treasury, fees); add SOLANA_RPC_URL |
| **T1.3** Error Codes | `/convex/lib/errorCodes.ts` | Add TOKEN error codes (12xxx range) |

### Phase 2: Backend Core (After Phase 1)

| Task | Dependencies | Files | Description |
|------|--------------|-------|-------------|
| **T2.1** Solana Utilities | T1.2 | `/convex/lib/solana/*.ts` | Connection factory, balance reading, transfer tx building |
| **T2.2** Wallet Management | T1.1 | `/convex/wallet/userWallet.ts` | saveConnectedWallet, getUserWallet mutations |
| **T2.3** Balance Cache | T1.1, T2.1 | `/convex/economy/tokenBalance.ts` | getTokenBalance query, refreshTokenBalance action |

### Phase 3: Token Marketplace Backend (After Phase 2)

| Task | Dependencies | Files | Description |
|------|--------------|-------|-------------|
| **T3.1** Token Listings | T2.2, T2.3 | `/convex/economy/tokenMarketplace.ts` | createTokenListing, getTokenListings, cancelTokenListing |
| **T3.2** Purchase Flow | T3.1 | `/convex/economy/tokenMarketplace.ts` | initiateTokenPurchase, submitSignedTransaction, pollConfirmation |
| **T3.3** Fee Collection | T3.2 | `/convex/economy/tokenMarketplace.ts` | Atomic transfer: buyer→seller + buyer→treasury |

### Phase 4: Frontend Wallet (After Phase 2)

| Task | Dependencies | Files | Description |
|------|--------------|-------|-------------|
| **T4.1** Wallet Hook | T2.2 | `/apps/web/src/hooks/wallet/useGameWallet.ts` | Connect/disconnect Privy or external wallet |
| **T4.2** Balance Hook | T2.3 | `/apps/web/src/hooks/economy/useTokenBalance.ts` | Subscribe to cached balance, refresh function |
| **T4.3** Wallet UI | T4.1 | `/apps/web/src/components/wallet/*.tsx` | WalletConnect, WalletDisplay components |

### Phase 5: Frontend Marketplace (After Phase 3 + 4)

| Task | Dependencies | Files | Description |
|------|--------------|-------|-------------|
| **T5.1** Currency Selector | T4.2, T4.3 | `/apps/web/src/components/marketplace/CurrencySelector.tsx` | Toggle Gold/Token view |
| **T5.2** Token Listing UI | T3.1, T4.1 | `/apps/web/src/components/marketplace/TokenListingDialog.tsx` | Create token listing dialog |
| **T5.3** Purchase Flow UI | T3.2, T5.1 | `/apps/web/src/components/marketplace/TokenPurchaseFlow.tsx` | Multi-step purchase with Privy signing |

### Phase 6: Integration (After Phase 5)

| Task | Dependencies | Files | Description |
|------|--------------|-------|-------------|
| **T6.1** Marketplace Page | T5.1, T5.2, T5.3 | `/apps/web/app/(app)/marketplace/page.tsx` | Integrate currency selector, token listings |
| **T6.2** Header Wallet | T4.3 | `/apps/web/src/components/layout/Header.tsx` | Add wallet button + balance to header |
| **T6.3** Cron Jobs | T3.2, T2.3 | `/convex/crons.ts` | expireStalePurchases, refreshActiveBalances |

---

## Dependency Graph

```
Phase 1 (Foundation) - PARALLEL:
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  T1.1 Schema  │  │  T1.2 Config  │  │ T1.3 Errors   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
Phase 2 (Backend) - PARALLEL:
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│ T2.1 Solana Utils │  │ T2.2 Wallet Mgmt  │  │ T2.3 Balance Cache│
└─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                      │
              ▼                                      ▼
Phase 3 (Backend):                    Phase 4 (Frontend):
┌───────────────────┐                 ┌───────────────────┐
│ T3.1 Token Listing│                 │  T4.1 Wallet Hook │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          ▼                           ┌─────────┴─────────┐
┌───────────────────┐                 │                   │
│ T3.2 Purchase Flow│                 ▼                   ▼
└─────────┬─────────┘         ┌─────────────┐    ┌─────────────┐
          │                   │T4.2 Balance │    │ T4.3 Wallet │
          ▼                   │    Hook     │    │     UI      │
┌───────────────────┐         └─────────────┘    └─────────────┘
│T3.3 Fee Collection│                 │                   │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          └──────────────────┬──────────────────┘
                             │
                             ▼
Phase 5 (Frontend Marketplace):
┌───────────────────┐  ┌───────────────────┐
│T5.1 Currency Sel. │  │T5.2 Listing Dialog│
└─────────┬─────────┘  └─────────┬─────────┘
          │                      │
          └──────────┬───────────┘
                     │
                     ▼
          ┌───────────────────┐
          │T5.3 Purchase Flow │
          │       UI          │
          └─────────┬─────────┘
                    │
                    ▼
Phase 6 (Integration) - PARALLEL:
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│T6.1 Marketplace Pg│  │T6.2 Header Wallet │  │  T6.3 Cron Jobs   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
```

---

## Execution Plan

### Wave 1 (3 agents - Parallel)
- **Agent A**: T1.1 (Schema)
- **Agent B**: T1.2 (Config)
- **Agent C**: T1.3 (Errors)

### Wave 2 (3 agents - Parallel)
- **Agent A**: T2.1 (Solana Utils)
- **Agent B**: T2.2 (Wallet Mgmt)
- **Agent C**: T2.3 (Balance Cache)

### Wave 3 (4 agents - Parallel)
- **Agent A**: T3.1 (Token Listings)
- **Agent B**: T4.1 (Wallet Hook)
- **Agent C**: T4.2 (Balance Hook)
- **Agent D**: T4.3 (Wallet UI)

### Wave 4 (3 agents - Sequential dependencies)
- **Agent A**: T3.2 (Purchase Flow) → T3.3 (Fee Collection)
- **Agent B**: T5.1 (Currency Selector)
- **Agent C**: T5.2 (Listing Dialog)

### Wave 5 (1 agent - Sequential)
- **Agent A**: T5.3 (Purchase Flow UI)

### Wave 6 (3 agents - Parallel)
- **Agent A**: T6.1 (Marketplace Page)
- **Agent B**: T6.2 (Header Wallet)
- **Agent C**: T6.3 (Cron Jobs)

---

## Schema Changes Detail

```typescript
// convex/schema.ts additions

// 1. Users table - add wallet fields
users: defineTable({
  // ... existing fields ...
  walletAddress: v.optional(v.string()),
  walletType: v.optional(v.union(v.literal("privy_embedded"), v.literal("external"))),
  walletConnectedAt: v.optional(v.number()),
})
  .index("walletAddress", ["walletAddress"]),

// 2. Token balance cache
tokenBalanceCache: defineTable({
  userId: v.id("users"),
  walletAddress: v.string(),
  tokenMint: v.string(),
  balance: v.number(), // Raw lamports
  lastVerifiedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_wallet", ["walletAddress"]),

// 3. Token transactions
tokenTransactions: defineTable({
  userId: v.id("users"),
  transactionType: v.union(
    v.literal("marketplace_purchase"),
    v.literal("marketplace_sale"),
    v.literal("platform_fee")
  ),
  amount: v.number(),
  signature: v.optional(v.string()),
  status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
  referenceId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_user_time", ["userId", "createdAt"])
  .index("by_signature", ["signature"]),

// 4. Pending purchases (double-spend prevention)
pendingTokenPurchases: defineTable({
  buyerId: v.id("users"),
  listingId: v.id("marketplaceListings"),
  amount: v.number(),
  buyerWallet: v.string(),
  sellerWallet: v.string(),
  status: v.union(
    v.literal("awaiting_signature"),
    v.literal("submitted"),
    v.literal("confirmed"),
    v.literal("failed"),
    v.literal("expired")
  ),
  transactionSignature: v.optional(v.string()),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_listing", ["listingId"])
  .index("by_status", ["status"]),

// 5. Marketplace listings - add currency type
marketplaceListings: defineTable({
  // ... existing fields ...
  currencyType: v.optional(v.union(v.literal("gold"), v.literal("token"))), // Default: gold
  tokenPrice: v.optional(v.number()),
})
```

---

## Constants Configuration

```typescript
// convex/lib/constants.ts additions

export const TOKEN = {
  MINT_ADDRESS: process.env.LTCG_TOKEN_MINT!,
  DECIMALS: 6,
  TREASURY_WALLET: process.env.LTCG_TREASURY_WALLET!,
  PLATFORM_FEE_PERCENT: 0.05, // 5%
  MIN_LISTING_PRICE: 1_000_000, // 1 token
  BALANCE_CACHE_TTL_MS: 60_000, // 1 minute
  PURCHASE_EXPIRY_MS: 300_000, // 5 minutes
} as const;
```

---

## Error Codes

```typescript
// convex/lib/errorCodes.ts additions

// Token Errors (12xxx)
ECONOMY_INSUFFICIENT_TOKENS: "ECONOMY_12001",
ECONOMY_WALLET_NOT_CONNECTED: "ECONOMY_12002",
ECONOMY_WALLET_VERIFICATION_FAILED: "ECONOMY_12003",
ECONOMY_TOKEN_TRANSACTION_PENDING: "ECONOMY_12004",
ECONOMY_TOKEN_TRANSACTION_FAILED: "ECONOMY_12005",
ECONOMY_TOKEN_TRANSACTION_EXPIRED: "ECONOMY_12006",
ECONOMY_TOKEN_BALANCE_STALE: "ECONOMY_12007",
```

---

## Environment Variables

```bash
# Add to .env.example

# Solana Configuration
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=your_helius_api_key

# Token Configuration
LTCG_TOKEN_MINT=your_pump_fun_token_mint_address
LTCG_TREASURY_WALLET=your_treasury_wallet_address
```

---

## Privy SPL Token Transfer Pattern

From [Privy Docs](https://docs.privy.io/recipes/solana/send-spl-tokens):

```typescript
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { useSignAndSendTransaction, useWallets } from '@privy-io/react-auth/solana';

// Build transfer transaction
async function createSPLTransferTransaction(
  fromAddress: string,
  toAddress: string,
  tokenMintAddress: string,
  amount: number,
  decimals: number = 6
) {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(toAddress);
  const mintPubkey = new PublicKey(tokenMintAddress);

  const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  const tokenAmount = amount * Math.pow(10, decimals);
  const transferInstruction = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    fromPubkey,
    tokenAmount
  );

  const transaction = new Transaction().add(transferInstruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  return { transaction, connection };
}

// Sign and send with Privy
const { wallets } = useWallets();
const { signAndSendTransaction } = useSignAndSendTransaction();

const signature = await signAndSendTransaction({
  transaction,
  wallet: wallets[0]
});
```

---

## Verification Checklist

- [x] **Phase 1**: Schema deploys, env vars set ✅
- [x] **Phase 2**: Can read balance, save wallet ✅
- [x] **Phase 3**: Can create listing, initiate purchase, confirm tx ✅
- [x] **Phase 4**: Wallet connects, balance displays ✅
- [x] **Phase 5**: Currency selector works, purchase flow completes ✅
- [x] **Phase 6**: Full integration, crons running ✅

## Implementation Status: COMPLETE ✅

All 18 tasks across 6 phases have been implemented:

| Phase | Tasks | Status |
|-------|-------|--------|
| 1. Foundation | T1.1, T1.2, T1.3 | ✅ Complete |
| 2. Backend Core | T2.1, T2.2, T2.3 | ✅ Complete |
| 3. Token Marketplace | T3.1, T3.2, T3.3 | ✅ Complete |
| 4. Frontend Wallet | T4.1, T4.2, T4.3 | ✅ Complete |
| 5. Frontend Marketplace | T5.1, T5.2, T5.3 | ✅ Complete |
| 6. Integration | T6.1, T6.2, T6.3 | ✅ Complete |

### Files Created/Modified

**Convex Backend:**
- `/convex/schema.ts` - Added wallet fields and token tables
- `/convex/lib/constants.ts` - Added TOKEN and SOLANA config
- `/convex/lib/errorCodes.ts` - Added token error codes (12xxx)
- `/convex/lib/solana/` - New directory with connection, tokenBalance, tokenTransfer utilities
- `/convex/wallet/userWallet.ts` - Wallet management mutations
- `/convex/economy/tokenBalance.ts` - Balance caching system
- `/convex/economy/tokenMarketplace.ts` - Token marketplace backend
- `/convex/economy/tokenMaintenance.ts` - Cron job handlers
- `/convex/infrastructure/crons.ts` - Added token maintenance crons

**Frontend:**
- `/apps/web/src/hooks/wallet/useGameWallet.ts` - Wallet connection hook
- `/apps/web/src/hooks/economy/useTokenBalance.ts` - Balance subscription hook
- `/apps/web/src/components/wallet/` - WalletConnect, WalletDisplay, WalletButton
- `/apps/web/src/components/marketplace/CurrencySelector.tsx` - Currency toggle
- `/apps/web/src/components/marketplace/TokenListingDialog.tsx` - Create token listing
- `/apps/web/src/components/marketplace/TokenPurchaseFlow.tsx` - Purchase flow UI
- `/apps/web/app/(app)/shop/page.tsx` - Integrated token marketplace
- `/apps/web/src/components/layout/Navbar.tsx` - Added wallet button to header

### End-to-End Test
1. User A lists card for 100 tokens
2. User B (with 110 tokens) buys card
3. ✅ User B receives card
4. ✅ User A receives 100 tokens
5. ✅ Treasury receives 5 tokens (5% fee)
6. ✅ All database records correct

---

## References

- [Privy SPL Token Transfer](https://docs.privy.io/recipes/solana/send-spl-tokens)
- [Privy SOL Transfer](https://docs.privy.io/recipes/solana/send-sol)
- [Solana Kit (web3.js 2.0)](https://blog.triton.one/intro-to-the-new-solana-kit-formerly-web3-js-2/) - Note: Using 1.x for Privy compatibility
- [Helius RPC](https://www.helius.dev/)
- [Privy MCP Server](https://github.com/incentivai-io/privy-mcp-server)
