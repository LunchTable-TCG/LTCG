# Economy & Token Integration Design

**Date:** 2026-02-04
**Status:** Approved
**Domain:** lunchtable.cards

## Overview

Complete shop economy system with native token integration, card variants, gem packages, packs, gold economy, and rotating sales system.

---

## 1. Card Variant System

Separate **power tier** (gameplay) from **variant** (collectible value).

### Rarity Tiers (Gameplay Power)
| Tier | Drop Rate |
|------|-----------|
| Common | 55% |
| Uncommon | 28% |
| Rare | 12% |
| Epic | 4% |
| Legendary | 1% |

### Variants (Collectible Scarcity)
| Variant | Drop Modifier | Supply | Visual |
|---------|---------------|--------|--------|
| Standard | Base rate | Unlimited | Normal art |
| Foil | 10% of base | Unlimited | Holographic shimmer |
| Alternate Art | 2% of base | Unlimited | Different illustration |
| Full Art | 0.5% of base | Unlimited | Extended borderless art |
| Numbered | Fixed mint | #/500 per card | Serial number + cert |
| 1st Edition | Launch window | Time-limited | "1st Ed" stamp |

### Schema: Card Inventory
```typescript
cardInventory: defineTable({
  userId: v.id("users"),
  cardDefinitionId: v.id("cardDefinitions"),
  quantity: v.number(),
  variant: literals("standard", "foil", "alt_art", "full_art", "numbered", "first_edition"),
  serialNumber: v.optional(v.number()), // For numbered variants
  acquiredAt: v.number(),
  source: literals("pack", "marketplace", "reward", "trade", "event"),
})
  .index("by_user", ["userId"])
  .index("by_user_card", ["userId", "cardDefinitionId"])
  .index("by_user_card_variant", ["userId", "cardDefinitionId", "variant"])
  .index("by_variant", ["variant"])
```

---

## 2. Gem Packages (Token → Gems)

Dynamic pricing based on native token market price.

### Packages
| ID | Name | Gems | USD Value | Bonus % |
|----|------|------|-----------|---------|
| gem_starter | Starter | 300 | $2.99 | 0% |
| gem_basic | Basic | 650 | $4.99 | 8% |
| gem_standard | Standard | 1,200 | $9.99 | 20% |
| gem_plus | Plus | 2,700 | $19.99 | 35% |
| gem_premium | Premium | 6,500 | $49.99 | 30% |
| gem_mega | Mega | 14,000 | $99.99 | 40% |
| gem_ultra | Ultra | 40,000 | $249.99 | 60% |
| gem_whale | Whale | 100,000 | $499.99 | 100% |
| gem_titan | Titan | 250,000 | $999.99 | 150% |
| gem_apex | Apex | 800,000 | $2,499.99 | 220% |
| gem_legendary | Legendary | 2,000,000 | $4,999.99 | 300% |
| gem_ultimate | Ultimate | 5,000,000 | $9,999.99 | 400% |

### Schema: Gem Packages
```typescript
gemPackages: defineTable({
  packageId: v.string(),
  name: v.string(),
  description: v.string(),
  gems: v.number(),
  usdPrice: v.number(), // In cents (299 = $2.99)
  bonusPercent: v.number(),
  isActive: v.boolean(),
  sortOrder: v.number(),
})
  .index("by_package_id", ["packageId"])
  .index("by_active", ["isActive", "sortOrder"])
```

### Schema: Token Gem Purchases
```typescript
tokenGemPurchases: defineTable({
  userId: v.id("users"),
  packageId: v.string(),
  gemsReceived: v.number(),
  usdValue: v.number(), // In cents
  tokenAmount: v.number(), // Tokens paid (in smallest unit)
  tokenPriceUsd: v.number(), // Token price at time of purchase (in cents)
  solanaSignature: v.string(),
  status: literals("pending", "confirmed", "failed"),
  createdAt: v.number(),
  confirmedAt: v.optional(v.number()),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_signature", ["solanaSignature"])
  .index("by_status", ["status", "createdAt"])
```

### Price Oracle Integration
- Primary: Jupiter Price API
- Fallback: Birdeye API
- Cache token price for 60 seconds
- Slippage tolerance: 2%

---

## 3. Pack Types

### Packs
| ID | Name | Cards | Gems | Gold | Guaranteed | Variant Boost |
|----|------|-------|------|------|------------|---------------|
| pack_basic | Basic Pack | 5 | 150 | 500 | 1 Uncommon+ | 1x |
| pack_standard | Standard Pack | 5 | 300 | 1,000 | 1 Rare+ | 1.5x Foil |
| pack_premium | Premium Pack | 5 | 600 | 2,500 | 1 Epic+ | 2x Foil, 1.5x Alt |
| pack_legendary | Legendary Pack | 5 | 1,500 | — | 1 Legendary | 3x Foil, 2x Alt |
| pack_archetype | Archetype Pack | 5 | 400 | 1,500 | Specific archetype | 2x Foil |
| pack_collector | Collector Pack | 3 | 2,000 | — | All Rare+ | 5x all variants |
| pack_ultimate | Ultimate Pack | 10 | 5,000 | — | 2 Epic+, 1 Legendary | 10x Foil, 5x Alt, 2x Full Art |

### Boxes
| ID | Name | Contains | Gems | Discount | Bonus |
|----|------|----------|------|----------|-------|
| box_basic | Basic Box | 10 Basic Packs | 1,350 | 10% | +2 bonus cards |
| box_standard | Standard Box | 10 Standard Packs | 2,700 | 10% | +3 bonus cards |
| box_premium | Premium Box | 10 Premium Packs | 5,100 | 15% | +5 bonus cards (Rare+) |
| box_collector | Collector Box | 6 Collector Packs | 10,800 | 10% | +1 guaranteed Full Art |
| box_ultimate | Ultimate Box | 5 Ultimate Packs | 22,500 | 10% | +1 Numbered lottery ticket |

### Updated Pack Config Schema
```typescript
packConfig: v.optional(
  v.object({
    cardCount: v.number(),
    guaranteedRarity: v.optional(literals("common", "uncommon", "rare", "epic", "legendary")),
    guaranteedCount: v.optional(v.number()), // How many guaranteed slots
    archetype: v.optional(v.string()),
    variantMultipliers: v.optional(v.object({
      foil: v.number(),      // e.g., 1.5 = 150% of base foil rate
      altArt: v.number(),
      fullArt: v.number(),
    })),
    allRareOrBetter: v.optional(v.boolean()), // For collector packs
  })
)
```

---

## 4. Gold Economy

### Earning Sources
| Activity | Gold |
|----------|------|
| Win (Ranked) | 50-100 (ELO based) |
| Win (Casual) | 25 |
| Loss (any) | 10 |
| Daily Login | 50-200 (streak) |
| Daily Quest (Easy) | 100 |
| Daily Quest (Medium) | 200 |
| Daily Quest (Hard) | 400 |
| Weekly Quest | 1,000 |
| Achievement | 100-5,000 |
| Season Rank Reward | 500-10,000 |

### Gems → Gold Bundles
| ID | Name | Gems | Gold | Rate |
|----|------|------|------|------|
| gold_pouch | Gold Pouch | 100 | 400 | 4:1 |
| gold_sack | Gold Sack | 250 | 1,100 | 4.4:1 |
| gold_chest | Gold Chest | 500 | 2,500 | 5:1 |
| gold_vault | Gold Vault | 1,000 | 5,500 | 5.5:1 |
| gold_hoard | Gold Hoard | 2,500 | 15,000 | 6:1 |

---

## 5. F2P Value Path

### Free Rewards
| Reward | Frequency | Contents |
|--------|-----------|----------|
| Daily Free Pack | Every 24h | 3-card mini pack |
| Weekly Jackpot | Sunday reset | Lottery ticket (0.1% Full Art, 0.01% Numbered) |
| Season End Drop | Season end | 1 Premium Pack |
| Event Drops | Special events | Limited packs |

### Variant Odds on Gold Packs
| Pack | Foil | Alt Art | Full Art |
|------|------|---------|----------|
| Basic | 0.5% | 0.05% | 0.005% |
| Standard | 1% | 0.1% | 0.01% |
| Premium | 1.5% | 0.2% | 0.02% |

### Achievement Milestones
- 100 wins → 1 Collector Pack
- 500 wins → 1 Ultimate Pack
- 1000 wins → 1 Numbered lottery entry
- Season Champion → Exclusive numbered card

### Schema: Daily Rewards
```typescript
dailyRewards: defineTable({
  userId: v.id("users"),
  rewardType: literals("daily_pack", "weekly_jackpot", "login_streak"),
  claimedAt: v.number(),
  reward: v.object({
    type: literals("pack", "gold", "gems", "card"),
    amount: v.optional(v.number()),
    packId: v.optional(v.string()),
    cardId: v.optional(v.id("cardDefinitions")),
    variant: v.optional(v.string()),
  }),
})
  .index("by_user_type", ["userId", "rewardType"])
  .index("by_user_date", ["userId", "claimedAt"])
```

### Schema: Pity Counter
Add to users table:
```typescript
pityCounter: v.optional(v.object({
  packsSinceEpic: v.number(),    // Resets on Epic+ pull
  packsSinceLegendary: v.number(), // Resets on Legendary pull
  packsSinceFullArt: v.number(),  // Resets on Full Art pull
}))
```

Pity thresholds:
- Epic guaranteed every 150 packs
- Legendary guaranteed every 500 packs
- Full Art guaranteed every 1000 packs

---

## 6. Sales System

### Sale Types
| Type | Duration | Discount | Frequency |
|------|----------|----------|-----------|
| Flash Sale | 4 hours | 20-30% | 2-3x/week |
| Weekend Deal | Fri-Sun | 15% | Weekly |
| New Set Launch | 1 week | Bonus cards | Per set |
| Holiday Event | 3-7 days | Themed packs | Major holidays |
| Anniversary | 1 week | 25% + free pack | Yearly |
| Returning Player | 48h | 40% first purchase | After 14+ days |

### Schema: Shop Sales
```typescript
shopSales: defineTable({
  saleId: v.string(),
  name: v.string(),
  description: v.string(),
  saleType: literals("flash", "weekend", "launch", "holiday", "anniversary", "returning"),
  discountPercent: v.optional(v.number()),
  bonusCards: v.optional(v.number()),
  bonusGems: v.optional(v.number()),
  applicableProducts: v.array(v.string()), // Product IDs, empty = all
  startsAt: v.number(),
  endsAt: v.number(),
  isActive: v.boolean(),
  priority: v.number(), // Higher priority sales override lower
  conditions: v.optional(v.object({
    minPurchase: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    perUserLimit: v.optional(v.number()),
    returningPlayerOnly: v.optional(v.boolean()),
    newPlayerOnly: v.optional(v.boolean()),
  })),
  usageCount: v.number(),
})
  .index("by_sale_id", ["saleId"])
  .index("by_active_time", ["isActive", "startsAt", "endsAt"])
  .index("by_type", ["saleType", "isActive"])
```

### Schema: Sale Usage Tracking
```typescript
saleUsage: defineTable({
  userId: v.id("users"),
  saleId: v.string(),
  usedAt: v.number(),
  productId: v.string(),
  discountApplied: v.number(),
})
  .index("by_user_sale", ["userId", "saleId"])
  .index("by_sale", ["saleId", "usedAt"])
```

---

## 7. Implementation Checklist

### Phase 1: Schema Updates
- [ ] Add variant field to cardInventory
- [ ] Create gemPackages table
- [ ] Create tokenGemPurchases table
- [ ] Create shopSales table
- [ ] Create saleUsage table
- [ ] Create dailyRewards table
- [ ] Add pityCounter to users
- [ ] Update packConfig with variant multipliers

### Phase 2: Backend Functions
- [ ] `purchaseGemsWithToken` - Token→Gems with price oracle
- [ ] `getTokenPrice` - Fetch current token price
- [ ] `claimDailyPack` - Free daily pack
- [ ] `claimWeeklyJackpot` - Lottery system
- [ ] `getActiveSales` - Current sales query
- [ ] `applySaleDiscount` - Calculate discounted price
- [ ] Update `openPack` - Variant selection logic
- [ ] Update `purchasePack` - Sale application

### Phase 3: Admin Functions
- [ ] `adminCreateSale` - Create new sale
- [ ] `adminUpdateSale` - Modify sale
- [ ] `adminEndSale` - Early termination
- [ ] `adminCreateGemPackage` - Manage gem packages
- [ ] `adminMintNumberedCards` - Mint numbered variants

### Phase 4: Price Oracle
- [ ] Jupiter API integration
- [ ] Birdeye fallback
- [ ] Price caching (60s TTL)
- [ ] Slippage protection

### Phase 5: Frontend
- [ ] Gem purchase flow with wallet signing
- [ ] Sale badges and countdown timers
- [ ] Daily/weekly reward claim UI
- [ ] Variant display in inventory
- [ ] Pack opening animation with variant reveals

---

## 8. Token Flow

```
User wants gems
    ↓
Frontend: Get token price from backend
    ↓
Backend: Fetch from Jupiter/Birdeye, cache 60s
    ↓
Frontend: Show "X tokens for Y gems"
    ↓
User: Clicks purchase
    ↓
Frontend: Build transaction (user wallet → treasury wallet)
    ↓
User: Signs with Privy embedded wallet
    ↓
Frontend: Submit to Solana
    ↓
Backend: Poll for confirmation (5 min timeout)
    ↓
Confirmed: Credit gems to user
Failed/Timeout: No gems credited, user keeps tokens
```

---

## 9. Constants

```typescript
// convex/lib/constants.ts additions

export const VARIANT_BASE_RATES = {
  foil: 0.10,      // 10% chance when pulling any card
  altArt: 0.02,    // 2%
  fullArt: 0.005,  // 0.5%
} as const;

export const PITY_THRESHOLDS = {
  epic: 150,
  legendary: 500,
  fullArt: 1000,
} as const;

export const DAILY_PACK_CARDS = 3;
export const WEEKLY_JACKPOT_FULL_ART_CHANCE = 0.001; // 0.1%
export const WEEKLY_JACKPOT_NUMBERED_CHANCE = 0.0001; // 0.01%

export const TOKEN_PRICE_CACHE_TTL = 60_000; // 60 seconds
export const TOKEN_SLIPPAGE_TOLERANCE = 0.02; // 2%
export const TOKEN_PURCHASE_TIMEOUT = 300_000; // 5 minutes
```

---

**Next Steps:** Schema migration → Backend functions → Admin panel → Frontend UI
