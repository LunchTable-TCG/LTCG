# Stripe Collective Tithe Integration Design

**Date:** 2026-02-03
**Status:** Approved
**Type:** Feature Addition - Subscription System

## Overview

Replace gem/token battle pass purchases with Stripe subscription-only model for "Joining the Collective" (battle pass premium access). Users subscribe at $4.20/month or $36.90/year for continuous premium benefits across all active seasons.

## Business Requirements

### Current State
- Battle pass called "Joining the Collective"
- One-time purchase per season with gems or LTCG tokens
- Premium track grants bonus rewards, XP multipliers, exclusive content
- F2P game with premium perks model

### Target State
- **Stripe subscription ONLY** for Joining the Collective
- Two pricing tiers: $4.20/month, $36.90/year
- Active subscription = automatic premium access across all seasons
- Subscription lapse = immediate premium revocation
- No free trial (users can evaluate via free tier)
- Gems/tokens remain for other purchases (marketplace, shop)

### Key Decisions
1. ✅ Remove gem and token payment options for battle pass entirely
2. ✅ Subscription auto-unlocks new seasons while active
3. ✅ Immediate access revocation on subscription end
4. ✅ No migration needed (clean slate, no real purchases yet)
5. ✅ No free trial period
6. ✅ Stripe Checkout hosted flow (PCI compliant)

## Technical Architecture

### Database Schema Changes

#### New Tables

```typescript
stripeCustomers: defineTable({
  userId: v.id("users"),
  stripeCustomerId: v.string(), // "cus_..."
  email: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_stripe_customer", ["stripeCustomerId"]),

stripeSubscriptions: defineTable({
  userId: v.id("users"),
  stripeCustomerId: v.string(),
  stripeSubscriptionId: v.string(), // "sub_..."
  status: v.union(
    v.literal("active"),
    v.literal("canceled"),
    v.literal("past_due"),
    v.literal("unpaid"),
    v.literal("incomplete"),
    v.literal("trialing"),
  ),
  planInterval: v.union(v.literal("month"), v.literal("year")),
  planAmount: v.number(), // 420 or 3690 (cents)
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
  cancelAtPeriodEnd: v.boolean(),
  canceledAt: v.optional(v.number()),
})
  .index("by_user", ["userId"])
  .index("by_stripe_subscription", ["stripeSubscriptionId"])
  .index("by_status", ["status"]),

stripeWebhookEvents: defineTable({
  stripeEventId: v.string(), // "evt_..."
  type: v.string(),
  processed: v.boolean(),
  receivedAt: v.number(),
  error: v.optional(v.string()),
})
  .index("by_stripe_event", ["stripeEventId"])
  .index("by_processed", ["processed"]),
```

#### Modified Tables

**battlePassSeasons:**
- ❌ Remove `premiumPrice` (gems)
- ❌ Remove `tokenPrice` (LTCG tokens)
- ✅ Keep all other fields (tiers, XP, rewards, dates)

**battlePassProgress:**
- No schema changes
- `isPremium` now determined by subscription status query
- Existing admin-granted premium users remain unchanged

### Subscription Flow

#### 1. User Journey

```
User clicks "Join the Collective"
  ↓
Select plan: Monthly ($4.20) or Yearly ($36.90)
  ↓
Call createCheckoutSession mutation
  ↓
Redirect to Stripe Checkout (hosted page)
  ↓
User enters payment details
  ↓
On success: redirect to /battle-pass?session_id=xxx
  ↓
Frontend verifies session, shows "Welcome to the Collective!"
  ↓
Webhook fires (parallel): customer.subscription.created
  ↓
Backend creates subscription record, grants premium access
```

#### 2. Backend Functions

**Checkout Session Creation** (`convex/stripe/checkout.ts`):
```typescript
createCheckoutSession({priceId, userId})
  - Get or create Stripe customer
  - Create Stripe Checkout session
  - Return checkout URL
  - Set success_url and cancel_url
```

**Session Verification** (`convex/stripe/checkout.ts`):
```typescript
verifyCheckoutSession({sessionId})
  - Retrieve session from Stripe
  - Verify payment status
  - Confirm subscription created
  - Return subscription details
```

**Billing Portal** (`convex/stripe/portal.ts`):
```typescript
createBillingPortalSession({userId})
  - Get user's Stripe customer ID
  - Create portal session
  - Return portal URL (for cancel/update payment)
```

### Webhook Integration

#### Endpoint
`/apps/web/app/api/stripe/webhook/route.ts` (Next.js API route)

#### Events Handled

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create subscription record, grant premium |
| `customer.subscription.updated` | Update subscription status, handle plan changes |
| `customer.subscription.deleted` | Mark canceled, revoke premium immediately |
| `invoice.payment_succeeded` | Update period dates, log successful billing |
| `invoice.payment_failed` | Update status to past_due, Stripe auto-retries |

#### Processing Flow

```typescript
1. Verify Stripe signature (security)
2. Parse event payload
3. Check for duplicate (stripeWebhookEvents table)
4. Call internal mutation: processStripeEvent(event)
5. Mark event as processed
6. Return 200 OK (fast response required)
```

#### Idempotency
- Check `stripeEventId` before processing
- Prevents duplicate webhook handling
- Critical for subscription state consistency

### Premium Access Logic

#### Core Check Function

```typescript
async function hasActiveSubscription(ctx, userId) {
  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  return subscription !== null;
}
```

#### Functions to Update

1. **getBattlePassProgress** - Query subscription, return isPremium
2. **claimReward** - Validate premium tier access via subscription
3. **earnBattlePassXP** - Apply premium XP multiplier if subscribed
4. **Any isPremium check** - Replace with hasActiveSubscription()

#### Functions to Remove

- ❌ `initiatePremiumPassTokenPurchase`
- ❌ `submitPremiumPassTransaction`
- ❌ `pollPremiumPassConfirmation`
- ❌ `usePremiumPassTokenPurchase` (frontend hook)
- ❌ Related UI components for gem/token purchase

#### New Season Auto-Unlock

```typescript
// When admin activates new season:
activateNewSeason({seasonId})
  - Query all active subscribers
  - Create battlePassProgress for each with isPremium: true
  - Auto-grant premium without user action
```

### Admin Interface

#### Removed Features
- Premium price input (gems)
- Token price input
- Purchase statistics (gems/tokens spent)

#### New Subscription Management Page

**Path:** `/apps/admin/src/app/subscriptions/page.tsx`

**Features:**
- **Overview Stats**: Active subscribers, MRR, ARR, churn rate
- **Subscriber List**: User, plan, status, next billing date
- **Actions**: View in Stripe, cancel subscription, grant free access
- **Event Log**: Recent webhook events with filtering

#### Admin Functions (`convex/admin/subscriptions.ts`)

```typescript
// Grant free subscription (testing/support)
grantFreeSubscription({userId, durationMonths})

// View user details
getUserSubscriptionDetails({userId})

// Admin cancel
adminCancelSubscription({userId, immediate})
```

## Security Considerations

### Webhook Security
- ✅ Verify `stripe-signature` header on all webhook requests
- ✅ Use `stripe.webhooks.constructEvent()` for validation
- ✅ Reject requests without valid signature

### Customer Validation
- ✅ Verify stripeCustomerId belongs to requesting userId
- ✅ Check ownership before subscription queries/mutations
- ✅ Prevent cross-user subscription access

### Idempotency
- ✅ Deduplicate webhook events via stripeEventId
- ✅ Handle race conditions from simultaneous webhooks
- ✅ Atomic database operations

### Rate Limiting
- ✅ Checkout session creation: 10 per user per hour
- ✅ Prevent checkout spam abuse

## Environment Configuration

### Required Variables

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...

# Product/Price IDs
STRIPE_PRICE_MONTHLY_ID=price_...   # $4.20/month
STRIPE_PRICE_YEARLY_ID=price_...    # $36.90/year

# App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Stripe Dashboard Setup

1. Create product: "Collective Tithe"
2. Create prices: $4.20/month, $36.90/year (recurring)
3. Configure webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Select events: `customer.subscription.*`, `invoice.payment_*`
5. Copy webhook signing secret to env vars

## Deployment Strategy

### Phase 1: Infrastructure
1. Add new Convex schema tables
2. Deploy backend functions (checkout, portal, webhooks)
3. Deploy Next.js webhook API route
4. Test with Stripe test mode + test cards

### Phase 2: UI Updates
1. Remove gem/token purchase UI
2. Add subscription plan selection
3. Add "Manage Subscription" button (billing portal)
4. Update premium status indicators

### Phase 3: Admin Tools
1. Build subscription management dashboard
2. Add admin grant/cancel functions
3. Remove old purchase analytics

### Phase 4: Testing
1. Test checkout flow (monthly/yearly)
2. Test webhook processing (created/updated/deleted)
3. Test payment failures and retries
4. Test new season auto-unlock
5. Test subscription cancellation

### Phase 5: Go Live
1. Create production Stripe products/prices
2. Switch to live API keys
3. Update webhook endpoint to production URL
4. Monitor first 24h closely

## Testing Checklist

### Checkout Flow
- [ ] Monthly subscription checkout completes
- [ ] Yearly subscription checkout completes
- [ ] Success redirect shows correct status
- [ ] Cancel redirect returns to battle pass page

### Webhook Processing
- [ ] subscription.created grants premium access
- [ ] subscription.updated handles status changes
- [ ] subscription.deleted revokes premium immediately
- [ ] invoice.payment_succeeded updates billing period
- [ ] invoice.payment_failed marks past_due
- [ ] Duplicate events are deduplicated

### Premium Access
- [ ] Active subscription grants premium rewards
- [ ] Can claim premium tier rewards
- [ ] Premium XP multiplier applied
- [ ] Canceled subscription blocks premium claims
- [ ] Reactivated subscription restores access

### New Season
- [ ] Active subscribers auto-unlock new season
- [ ] Non-subscribers start on free tier
- [ ] Admin-granted premium still works

### Admin Interface
- [ ] Subscription list shows accurate data
- [ ] Can view user subscription details
- [ ] Can cancel user subscription
- [ ] Can grant free subscription
- [ ] Event log displays webhook events

### Edge Cases
- [ ] User with no wallet can subscribe
- [ ] Payment method update via billing portal
- [ ] Subscription plan change (month ↔ year)
- [ ] Immediate cancellation vs end-of-period
- [ ] Past_due → active recovery flow

## Metrics to Track

### Business Metrics
- Active subscribers (count)
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate (cancellations / active subscribers)
- Monthly vs Yearly split (%)
- ARPU (Average Revenue Per User)

### Technical Metrics
- Checkout conversion rate
- Webhook processing latency
- Failed webhook events (errors)
- Payment failure rate
- Subscription status distribution

## Future Enhancements

### Post-MVP Considerations
- [ ] Add 7-day free trial option
- [ ] Email notifications (renewal, payment failed, etc.)
- [ ] In-game subscription status UI
- [ ] Referral program (invite friends, get free month)
- [ ] Gift subscriptions
- [ ] Stripe Tax for international compliance
- [ ] Apple/Google In-App Purchase integration (mobile)

## References

- Stripe Docs: https://stripe.com/docs/billing/subscriptions/overview
- Convex-Stripe Demo: https://github.com/get-convex/convex-stripe-demo
- Stripe Checkout: https://stripe.com/docs/payments/checkout
- Stripe Webhooks: https://stripe.com/docs/webhooks

## Approval

- [x] Architecture validated (2026-02-03)
- [x] Schema design approved
- [x] User flow confirmed
- [x] Security considerations reviewed
- [x] Ready for implementation

---

**Next Steps:**
1. Create detailed implementation plan with task breakdown
2. Set up git worktree for isolated development
3. Begin Phase 1: Infrastructure setup
