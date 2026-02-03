# Stripe Collective Tithe Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace gem/token battle pass purchases with Stripe subscription system for "Joining the Collective" ($4.20/month or $36.90/year).

**Architecture:** Add Stripe subscription tables to Convex schema, create checkout/webhook flow, update premium access logic to query subscription status, remove old purchase system, build admin dashboard.

**Tech Stack:** Stripe API, Convex (backend), Next.js 15 (frontend), TypeScript, Privy (auth)

---

## Prerequisites

**Required Environment Variables:**

Add to `.env.local`:
```bash
# Stripe (use test mode keys initially)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs (create these in Stripe Dashboard first)
STRIPE_PRICE_MONTHLY_ID=price_...   # $4.20/month
STRIPE_PRICE_YEARLY_ID=price_...    # $36.90/year

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Stripe Dashboard Setup (do this first):**
1. Create product: "Collective Tithe"
2. Create two prices: $4.20/month (recurring), $36.90/year (recurring)
3. Configure webhook: Point to `/api/stripe/webhook` endpoint
4. Select events: `customer.subscription.*`, `invoice.payment_*`
5. Copy webhook signing secret to env vars

**Install Dependencies:**

```bash
bun add stripe
```

---

## Phase 1: Schema & Infrastructure

### Task 1: Add Stripe Tables to Schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add Stripe customer table**

Add after existing tables:

```typescript
stripeCustomers: defineTable({
  userId: v.id("users"),
  stripeCustomerId: v.string(), // "cus_..."
  email: v.string(),
  createdAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_stripe_customer", ["stripeCustomerId"]),
```

**Step 2: Add Stripe subscription table**

```typescript
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
```

**Step 3: Add webhook events table**

```typescript
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

**Step 4: Remove premium pricing from battle pass schema**

Find the `battlePassSeasons` table and remove these fields:
```typescript
// DELETE these lines:
premiumPrice: v.number(),
tokenPrice: v.optional(v.number()),
```

**Step 5: Verify schema compiles**

Run: `bunx convex dev`
Expected: Schema compiles, migrations run successfully

**Step 6: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(stripe): add subscription tables and remove battle pass pricing"
```

---

### Task 2: Create Stripe Utilities

**Files:**
- Create: `convex/lib/stripe.ts`

**Step 1: Create Stripe client utility**

```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

export const STRIPE_PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY_ID!,
  YEARLY: process.env.STRIPE_PRICE_YEARLY_ID!,
} as const;

if (!STRIPE_PRICE_IDS.MONTHLY || !STRIPE_PRICE_IDS.YEARLY) {
  throw new Error("Missing Stripe price IDs in environment variables");
}
```

**Step 2: Commit**

```bash
git add convex/lib/stripe.ts
git commit -m "feat(stripe): add stripe client utility"
```

---

### Task 3: Create Checkout Session Functions

**Files:**
- Create: `convex/stripe/checkout.ts`

**Step 1: Write test for customer creation**

Create: `convex/stripe/checkout.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import { stripe } from "../lib/stripe";

// Mock Stripe
vi.mock("../lib/stripe", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      list: vi.fn(),
    },
  },
  STRIPE_PRICE_IDS: {
    MONTHLY: "price_monthly_test",
    YEARLY: "price_yearly_test",
  },
}));

describe("Stripe Checkout", () => {
  it("creates a new Stripe customer if none exists", async () => {
    const mockCreate = vi.mocked(stripe.customers.create);
    const mockList = vi.mocked(stripe.customers.list);

    mockList.mockResolvedValue({
      data: [],
      has_more: false,
      object: "list",
      url: "/v1/customers",
    });

    mockCreate.mockResolvedValue({
      id: "cus_test123",
      email: "test@example.com",
      object: "customer",
    } as any);

    // Test will be implemented after function exists
    expect(mockCreate).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test convex/stripe/checkout.test.ts`
Expected: Test setup passes (no implementation yet)

**Step 3: Create checkout session function**

Create: `convex/stripe/checkout.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { stripe, STRIPE_PRICE_IDS } from "../lib/stripe";

export const createCheckoutSession = mutation({
  args: {
    planInterval: v.union(v.literal("month"), v.literal("year")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has active subscription
    const existingSub = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingSub) {
      throw new Error("User already has an active subscription");
    }

    // Get or create Stripe customer
    let stripeCustomer = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!stripeCustomer) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || identity.email || undefined,
        metadata: {
          convexUserId: user._id,
        },
      });

      const stripeCustomerId = await ctx.db.insert("stripeCustomers", {
        userId: user._id,
        stripeCustomerId: customer.id,
        email: customer.email || "",
        createdAt: Date.now(),
      });

      stripeCustomer = await ctx.db.get(stripeCustomerId);
    }

    if (!stripeCustomer) {
      throw new Error("Failed to create Stripe customer");
    }

    // Determine price ID based on plan interval
    const priceId =
      args.planInterval === "month"
        ? STRIPE_PRICE_IDS.MONTHLY
        : STRIPE_PRICE_IDS.YEARLY;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/battle-pass?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/battle-pass`,
      metadata: {
        userId: user._id,
      },
    });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  },
});
```

**Step 4: Create session verification function**

Add to `convex/stripe/checkout.ts`:

```typescript
export const verifyCheckoutSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const session = await stripe.checkout.sessions.retrieve(args.sessionId);

    if (session.payment_status !== "paid") {
      return {
        success: false,
        message: "Payment not completed",
      };
    }

    // Get subscription
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const subscription = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return {
      success: true,
      hasSubscription: !!subscription,
    };
  },
});
```

**Step 5: Run Convex dev to verify**

Run: `bunx convex dev`
Expected: Functions compile successfully

**Step 6: Commit**

```bash
git add convex/stripe/checkout.ts convex/stripe/checkout.test.ts
git commit -m "feat(stripe): add checkout session creation and verification"
```

---

### Task 4: Create Billing Portal Function

**Files:**
- Create: `convex/stripe/portal.ts`

**Step 1: Create billing portal session function**

```typescript
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { stripe } from "../lib/stripe";

export const createBillingPortalSession = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const stripeCustomer = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!stripeCustomer) {
      throw new Error("No Stripe customer found");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/battle-pass`,
    });

    return {
      portalUrl: session.url,
    };
  },
});
```

**Step 2: Verify compiles**

Run: `bunx convex dev`
Expected: Functions compile successfully

**Step 3: Commit**

```bash
git add convex/stripe/portal.ts
git commit -m "feat(stripe): add billing portal session creation"
```

---

## Phase 2: Webhook Processing

### Task 5: Create Webhook Event Processor

**Files:**
- Create: `convex/stripe/webhooks.ts`

**Step 1: Create internal mutation for processing events**

```typescript
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import type Stripe from "stripe";

export const processStripeEvent = internalMutation({
  args: {
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const event = args.event as Stripe.Event;

    // Check for duplicate event
    const existingEvent = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_stripe_event", (q) => q.eq("stripeEventId", event.id))
      .first();

    if (existingEvent) {
      console.log(`Duplicate event ${event.id}, skipping`);
      return { processed: false, reason: "duplicate" };
    }

    // Log event
    await ctx.db.insert("stripeWebhookEvents", {
      stripeEventId: event.id,
      type: event.type,
      processed: false,
      receivedAt: Date.now(),
    });

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionChange(ctx, event.data.object as Stripe.Subscription);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(ctx, event.data.object as Stripe.Subscription);
          break;

        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(ctx, event.data.object as Stripe.Invoice);
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(ctx, event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      // Mark as processed
      const eventRecord = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripe_event", (q) => q.eq("stripeEventId", event.id))
        .first();

      if (eventRecord) {
        await ctx.db.patch(eventRecord._id, { processed: true });
      }

      return { processed: true };
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);

      const eventRecord = await ctx.db
        .query("stripeWebhookEvents")
        .withIndex("by_stripe_event", (q) => q.eq("stripeEventId", event.id))
        .first();

      if (eventRecord) {
        await ctx.db.patch(eventRecord._id, {
          processed: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      throw error;
    }
  },
});

async function handleSubscriptionChange(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const stripeCustomer = await ctx.db
    .query("stripeCustomers")
    .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", customerId))
    .first();

  if (!stripeCustomer) {
    throw new Error(`No user found for Stripe customer ${customerId}`);
  }

  // Get subscription price details
  const priceId = subscription.items.data[0]?.price.id;
  const amount = subscription.items.data[0]?.price.unit_amount || 0;
  const interval = subscription.items.data[0]?.price.recurring?.interval as "month" | "year";

  // Upsert subscription record
  const existingSub = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", subscription.id)
    )
    .first();

  const subscriptionData = {
    userId: stripeCustomer.userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as any,
    planInterval: interval,
    planAmount: amount,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? subscription.canceled_at * 1000 : undefined,
  };

  if (existingSub) {
    await ctx.db.patch(existingSub._id, subscriptionData);
  } else {
    await ctx.db.insert("stripeSubscriptions", subscriptionData);
  }

  // Grant premium access if active
  if (subscription.status === "active") {
    await grantPremiumAccess(ctx, stripeCustomer.userId);
  }
}

async function handleSubscriptionDeleted(
  ctx: any,
  subscription: Stripe.Subscription
) {
  const existingSub = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", subscription.id)
    )
    .first();

  if (existingSub) {
    await ctx.db.patch(existingSub._id, {
      status: "canceled",
      canceledAt: Date.now(),
    });

    // Revoke premium access
    await revokePremiumAccess(ctx, existingSub.userId);
  }
}

async function handlePaymentSucceeded(ctx: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", subscriptionId)
    )
    .first();

  if (subscription) {
    // Update period dates (renewal)
    const period = invoice.lines.data[0]?.period;
    if (period) {
      await ctx.db.patch(subscription._id, {
        currentPeriodStart: period.start * 1000,
        currentPeriodEnd: period.end * 1000,
        status: "active",
      });
    }
  }
}

async function handlePaymentFailed(ctx: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) =>
      q.eq("stripeSubscriptionId", subscriptionId)
    )
    .first();

  if (subscription) {
    await ctx.db.patch(subscription._id, {
      status: "past_due",
    });
  }
}

async function grantPremiumAccess(ctx: any, userId: string) {
  // Get all active battle pass seasons
  const activeSeasons = await ctx.db
    .query("battlePassSeasons")
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();

  for (const season of activeSeasons) {
    // Check if user has progress for this season
    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", userId).eq("seasonId", season._id)
      )
      .first();

    if (progress) {
      // Update existing progress
      await ctx.db.patch(progress._id, { isPremium: true });
    } else {
      // Create new progress with premium
      await ctx.db.insert("battlePassProgress", {
        userId,
        seasonId: season._id,
        currentXP: 0,
        currentTier: 0,
        isPremium: true,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
      });
    }
  }
}

async function revokePremiumAccess(ctx: any, userId: string) {
  // Get all battle pass progress for user
  const allProgress = await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const progress of allProgress) {
    await ctx.db.patch(progress._id, { isPremium: false });
  }
}
```

**Step 2: Verify compiles**

Run: `bunx convex dev`
Expected: Functions compile successfully

**Step 3: Commit**

```bash
git add convex/stripe/webhooks.ts
git commit -m "feat(stripe): add webhook event processor"
```

---

### Task 6: Create Webhook API Route

**Files:**
- Create: `apps/web/app/api/stripe/webhook/route.ts`

**Step 1: Create webhook endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    // Process event in Convex
    await convex.mutation(api.stripe.webhooks.processStripeEvent, {
      event: event as any,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
```

**Step 2: Test webhook endpoint locally**

Run Stripe CLI:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Trigger test event:
```bash
stripe trigger customer.subscription.created
```

Expected: Event logged in Convex, subscription record created

**Step 3: Commit**

```bash
git add apps/web/app/api/stripe/webhook/route.ts
git commit -m "feat(stripe): add webhook API endpoint"
```

---

## Phase 3: Premium Access Logic

### Task 7: Update Battle Pass Premium Checks

**Files:**
- Modify: `convex/progression/battlePass.ts`

**Step 1: Add subscription check helper**

Add to top of file after imports:

```typescript
import type { QueryCtx, MutationCtx } from "../_generated/server";

async function hasActiveSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("status"), "active"))
    .first();

  return subscription !== null;
}
```

**Step 2: Update getBattlePassProgress function**

Find the `getBattlePassProgress` query and modify:

```typescript
export const getBattlePassProgress = query({
  args: {
    seasonId: v.optional(v.id("battlePassSeasons")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    // Get active season if not specified
    let seasonId = args.seasonId;
    if (!seasonId) {
      const activeSeason = await ctx.db
        .query("battlePassSeasons")
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      if (!activeSeason) {
        return null;
      }

      seasonId = activeSeason._id;
    }

    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_season", (q) =>
        q.eq("userId", user._id).eq("seasonId", seasonId)
      )
      .first();

    if (!progress) {
      return null;
    }

    // Check subscription status
    const isPremium = await hasActiveSubscription(ctx, user._id);

    return {
      ...progress,
      isPremium, // Override with subscription status
    };
  },
});
```

**Step 3: Update claimReward function**

Find the `claimReward` mutation and update premium validation:

```typescript
// Find this section and replace:
if (tier.trackType === "premium" && !progress.isPremium) {
  throw new ConvexError({
    code: "PREMIUM_REQUIRED",
    message: "Premium battle pass required to claim this reward",
  });
}

// Replace with:
if (tier.trackType === "premium") {
  const isPremium = await hasActiveSubscription(ctx, user._id);
  if (!isPremium) {
    throw new ConvexError({
      code: "PREMIUM_REQUIRED",
      message: "Active subscription required to claim premium rewards",
    });
  }
}
```

**Step 4: Update earnBattlePassXP function**

Find where XP is calculated and add premium bonus:

```typescript
// Find XP calculation section and add:
const isPremium = await hasActiveSubscription(ctx, user._id);
const xpMultiplier = isPremium ? 1.5 : 1.0; // 50% bonus for premium
const xpToAdd = Math.floor(baseXP * xpMultiplier);
```

**Step 5: Verify functions compile**

Run: `bunx convex dev`
Expected: All functions compile successfully

**Step 6: Commit**

```bash
git add convex/progression/battlePass.ts
git commit -m "feat(stripe): update battle pass to use subscription-based premium access"
```

---

### Task 8: Remove Old Purchase Functions

**Files:**
- Modify: `convex/progression/battlePass.ts`
- Delete: `apps/web/src/hooks/progression/usePremiumPassTokenPurchase.ts`

**Step 1: Remove token purchase functions**

Delete these functions from `convex/progression/battlePass.ts`:
- `initiatePremiumPassTokenPurchase`
- `submitPremiumPassTransaction`
- `pollPremiumPassConfirmation`

**Step 2: Remove pending purchase queries**

Delete any queries related to `pendingTokenPurchases` for battle pass:
- `getPendingPremiumPassPurchase`
- Any mutations that handle battle pass token transactions

**Step 3: Delete frontend hook**

```bash
rm apps/web/src/hooks/progression/usePremiumPassTokenPurchase.ts
```

**Step 4: Verify no broken imports**

Run: `bun run build`
Expected: Build succeeds (we'll fix frontend UI in next phase)

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(stripe): remove old token/gem battle pass purchase system"
```

---

## Phase 4: Frontend UI

### Task 9: Create Subscription Plan Selection Component

**Files:**
- Create: `apps/web/src/components/battle-pass/SubscriptionPlans.tsx`

**Step 1: Create plan selection component**

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SubscriptionPlans() {
  const [selectedPlan, setSelectedPlan] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState(false);
  const createCheckout = useMutation(api.stripe.checkout.createCheckoutSession);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const result = await createCheckout({ planInterval: selectedPlan });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
      <Card
        className={`cursor-pointer transition-all ${
          selectedPlan === "month" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedPlan("month")}
      >
        <CardHeader>
          <CardTitle>Monthly</CardTitle>
          <CardDescription>Billed monthly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">$4.20</div>
          <div className="text-muted-foreground">/month</div>
        </CardContent>
      </Card>

      <Card
        className={`cursor-pointer transition-all ${
          selectedPlan === "year" ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedPlan("year")}
      >
        <CardHeader>
          <CardTitle>Yearly</CardTitle>
          <CardDescription>Billed annually - Save 27%</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">$36.90</div>
          <div className="text-muted-foreground">/year</div>
          <div className="text-sm text-green-500 mt-2">
            Save $13.50 compared to monthly
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2">
        <Button
          onClick={handleSubscribe}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Loading..." : "Join the Collective"}
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/battle-pass/SubscriptionPlans.tsx
git commit -m "feat(stripe): add subscription plan selection component"
```

---

### Task 10: Create Subscription Status Component

**Files:**
- Create: `apps/web/src/components/battle-pass/SubscriptionStatus.tsx`

**Step 1: Create status display component**

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SubscriptionStatus() {
  const subscription = useQuery(api.stripe.queries.getCurrentSubscription);
  const createPortalSession = useMutation(api.stripe.portal.createBillingPortalSession);

  if (!subscription) {
    return null;
  }

  const handleManageSubscription = async () => {
    try {
      const result = await createPortalSession({});
      if (result.portalUrl) {
        window.location.href = result.portalUrl;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
      alert("Failed to open subscription management. Please try again.");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription Status</CardTitle>
          <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
            {subscription.status}
          </Badge>
        </div>
        <CardDescription>
          {subscription.planInterval === "month" ? "Monthly" : "Yearly"} plan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Current Period</div>
          <div className="text-lg font-medium">
            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="text-sm text-yellow-600">
            Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
          </div>
        )}

        <Button onClick={handleManageSubscription} variant="outline" className="w-full">
          Manage Subscription
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create query for current subscription**

Create: `convex/stripe/queries.ts`

```typescript
import { query } from "../_generated/server";

export const getCurrentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      return null;
    }

    const subscription = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    return subscription;
  },
});
```

**Step 3: Commit**

```bash
git add apps/web/src/components/battle-pass/SubscriptionStatus.tsx convex/stripe/queries.ts
git commit -m "feat(stripe): add subscription status display component"
```

---

### Task 11: Update Battle Pass Page UI

**Files:**
- Modify: `apps/web/app/(app)/battle-pass/page.tsx`

**Step 1: Remove old purchase UI components**

Find and remove:
- Gem purchase button/modal
- Token purchase button/modal
- `usePremiumPassTokenPurchase` hook import

**Step 2: Add subscription components**

Add imports:
```typescript
import { SubscriptionPlans } from "@/components/battle-pass/SubscriptionPlans";
import { SubscriptionStatus } from "@/components/battle-pass/SubscriptionStatus";
```

**Step 3: Update premium unlock section**

Replace the premium unlock UI with:

```typescript
{!isPremium ? (
  <div className="mb-8">
    <h2 className="text-2xl font-bold mb-4">Join the Collective</h2>
    <SubscriptionPlans />
  </div>
) : (
  <SubscriptionStatus />
)}
```

**Step 4: Handle checkout success redirect**

Add useEffect to handle session_id param:

```typescript
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Inside component:
const searchParams = useSearchParams();
const [showSuccessMessage, setShowSuccessMessage] = useState(false);

useEffect(() => {
  const sessionId = searchParams.get("session_id");
  if (sessionId) {
    setShowSuccessMessage(true);
    // Clear URL params
    window.history.replaceState({}, "", "/battle-pass");

    // Hide message after 5 seconds
    setTimeout(() => setShowSuccessMessage(false), 5000);
  }
}, [searchParams]);

// Add success banner in JSX:
{showSuccessMessage && (
  <div className="mb-4 p-4 bg-green-500 text-white rounded-lg">
    Welcome to the Collective! Your premium access is now active.
  </div>
)}
```

**Step 5: Test UI locally**

Run: `bun run dev`
Navigate to: `http://localhost:3000/battle-pass`
Expected: Plan selection shown for non-premium, status shown for premium

**Step 6: Commit**

```bash
git add apps/web/app/\(app\)/battle-pass/page.tsx
git commit -m "feat(stripe): update battle pass page with subscription UI"
```

---

## Phase 5: Admin Interface

### Task 12: Create Admin Subscription Dashboard

**Files:**
- Create: `apps/admin/src/app/subscriptions/page.tsx`

**Step 1: Create admin queries**

Create: `convex/admin/subscriptions.ts`

```typescript
import { v } from "convex/values";
import { query, mutation, internalMutation } from "../_generated/server";

export const listSubscriptions = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check admin permission
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    let query = ctx.db.query("stripeSubscriptions");

    if (args.status) {
      query = query
        .withIndex("by_status", (q) => q.eq("status", args.status as any));
    }

    const subscriptions = await query
      .order("desc")
      .take(limit + offset);

    const paginatedSubs = subscriptions.slice(offset, offset + limit);

    // Enrich with user data
    const enriched = await Promise.all(
      paginatedSubs.map(async (sub) => {
        const user = await ctx.db.get(sub.userId);
        return {
          ...sub,
          user: user ? { id: user._id, email: user.email, username: user.username } : null,
        };
      })
    );

    return enriched;
  },
});

export const getSubscriptionStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const allSubscriptions = await ctx.db.query("stripeSubscriptions").collect();

    const activeSubscriptions = allSubscriptions.filter((s) => s.status === "active");
    const monthlyActive = activeSubscriptions.filter((s) => s.planInterval === "month");
    const yearlyActive = activeSubscriptions.filter((s) => s.planInterval === "year");

    const mrr = monthlyActive.reduce((sum, s) => sum + s.planAmount, 0) / 100;
    const arr = yearlyActive.reduce((sum, s) => sum + s.planAmount, 0) / 100;

    return {
      totalActive: activeSubscriptions.length,
      monthlyCount: monthlyActive.length,
      yearlyCount: yearlyActive.length,
      mrr,
      arr,
      totalRevenue: mrr * 12 + arr,
    };
  },
});

export const adminCancelSubscription = mutation({
  args: {
    subscriptionId: v.id("stripeSubscriptions"),
    immediate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user?.isAdmin) {
      throw new Error("Admin access required");
    }

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Cancel in Stripe
    const stripe = require("../lib/stripe").stripe;
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: !args.immediate,
    });

    if (args.immediate) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    return { success: true };
  },
});
```

**Step 2: Create admin dashboard page**

```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubscriptionsPage() {
  const stats = useQuery(api.admin.subscriptions.getSubscriptionStats);
  const subscriptions = useQuery(api.admin.subscriptions.listSubscriptions, {});

  if (!stats) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscription Management</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active Subscribers</CardTitle>
            <CardDescription>Currently subscribed users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalActive}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {stats.monthlyCount} monthly, {stats.yearlyCount} yearly
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MRR</CardTitle>
            <CardDescription>Monthly Recurring Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${stats.mrr.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ARR</CardTitle>
            <CardDescription>Annual Recurring Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">${stats.arr.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {!subscriptions ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((sub) => (
                <div key={sub._id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <div className="font-medium">{sub.user?.email || sub.user?.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {sub.planInterval === "month" ? "Monthly" : "Yearly"} - ${(sub.planAmount / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className={sub.status === "active" ? "text-green-600" : "text-gray-600"}>
                      {sub.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Add to admin navigation**

Modify: `apps/admin/src/components/Navigation.tsx`

Add link:
```typescript
<Link href="/subscriptions">Subscriptions</Link>
```

**Step 4: Commit**

```bash
git add apps/admin/src/app/subscriptions/page.tsx convex/admin/subscriptions.ts
git commit -m "feat(stripe): add admin subscription dashboard"
```

---

### Task 13: Update Battle Pass Admin (Remove Pricing)

**Files:**
- Modify: `apps/admin/src/app/battle-pass/[seasonId]/page.tsx`

**Step 1: Remove premium price fields**

Find and remove:
- Premium price (gems) input field
- Token price input field
- Related validation and state

**Step 2: Remove purchase analytics**

Remove sections showing:
- Gem purchase statistics
- Token purchase statistics
- Purchase conversion metrics

**Step 3: Add subscriber count**

Add query for active subscriber count:

```typescript
const subscriberCount = useQuery(api.admin.subscriptions.getSubscriptionStats);

// Display in stats section:
<div>
  <div className="text-sm text-muted-foreground">Active Subscribers</div>
  <div className="text-2xl font-bold">{subscriberCount?.totalActive || 0}</div>
</div>
```

**Step 4: Commit**

```bash
git add apps/admin/src/app/battle-pass/\[seasonId\]/page.tsx
git commit -m "refactor(admin): remove gem/token pricing from battle pass admin"
```

---

## Phase 6: Testing

### Task 14: Test Checkout Flow

**Manual Test:**

**Step 1: Start development servers**

```bash
# Terminal 1: Convex
bunx convex dev

# Terminal 2: Web app
cd apps/web
bun run dev

# Terminal 3: Stripe webhook forwarding
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

**Step 2: Test monthly subscription**

1. Navigate to `/battle-pass`
2. Click "Join the Collective"
3. Select "Monthly" plan
4. Use test card: `4242 4242 4242 4242`, any future date, any CVC
5. Complete checkout
6. Verify redirect to `/battle-pass?session_id=...`
7. Check Convex dashboard: `stripeSubscriptions` should have new record with `status: "active"`
8. Verify premium access granted in battle pass UI

**Step 3: Test yearly subscription**

Repeat above with "Yearly" plan

**Step 4: Test billing portal**

1. Click "Manage Subscription" button
2. Verify redirect to Stripe billing portal
3. Test: Update payment method
4. Test: Cancel subscription (select "cancel at period end")
5. Verify `cancelAtPeriodEnd: true` in Convex

**Step 5: Test webhook processing**

Check Stripe CLI output for webhook events:
```bash
✔️ customer.subscription.created
✔️ customer.subscription.updated
✔️ invoice.payment_succeeded
```

Verify `stripeWebhookEvents` table has records with `processed: true`

**Step 6: Document test results**

Create: `docs/testing/stripe-checkout-test-results.md`

Log results for each step.

**Step 7: Commit**

```bash
git add docs/testing/stripe-checkout-test-results.md
git commit -m "test(stripe): document checkout flow test results"
```

---

### Task 15: Test Premium Access Logic

**Manual Test:**

**Step 1: Verify premium rewards unlocked**

1. Subscribe via checkout flow
2. Navigate to battle pass page
3. Verify premium track visible
4. Earn XP (play games)
5. Unlock tier with premium reward
6. Claim premium reward
7. Verify reward received

**Step 2: Test subscription cancellation**

1. Open billing portal
2. Cancel subscription immediately
3. Verify premium access revoked
4. Try to claim premium reward
5. Verify error: "Active subscription required"

**Step 3: Test new season auto-unlock**

1. Have active subscription
2. Admin creates new season (status: "active")
3. Navigate to new season battle pass
4. Verify premium access automatically granted
5. Check `battlePassProgress` record has `isPremium: true`

**Step 4: Test XP multiplier**

1. Note current XP
2. Complete quest/match
3. Verify XP gain is 1.5x base (premium bonus)
4. Cancel subscription
5. Complete another quest/match
6. Verify XP gain is 1.0x base (no bonus)

**Step 5: Commit**

```bash
git add -A
git commit -m "test(stripe): verify premium access logic"
```

---

### Task 16: Test Admin Interface

**Manual Test:**

**Step 1: Test subscription dashboard**

1. Navigate to `/admin/subscriptions`
2. Verify stats display:
   - Active subscribers count
   - MRR calculated correctly
   - ARR calculated correctly
3. Verify subscription list shows all subscriptions
4. Check user emails/usernames displayed

**Step 2: Test admin cancel**

1. Click cancel button on a subscription
2. Select "Cancel at period end"
3. Verify Stripe subscription updated
4. Verify `cancelAtPeriodEnd: true` in Convex
5. Test immediate cancellation
6. Verify subscription deleted in Stripe
7. Verify premium access revoked

**Step 3: Test battle pass admin changes**

1. Navigate to `/admin/battle-pass/[seasonId]`
2. Verify no premium price fields
3. Verify no token price fields
4. Verify subscriber count displayed
5. Create/edit season
6. Verify save succeeds without pricing fields

**Step 4: Commit**

```bash
git add -A
git commit -m "test(admin): verify subscription management interface"
```

---

## Phase 7: Production Preparation

### Task 17: Environment Variables Documentation

**Files:**
- Create: `docs/deployment/stripe-env-setup.md`

**Step 1: Document all required env vars**

```markdown
# Stripe Environment Setup

## Required Variables

### Development (.env.local)

```bash
# Stripe Test Mode Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Test Product IDs
STRIPE_PRICE_MONTHLY_ID=price_test_monthly
STRIPE_PRICE_YEARLY_ID=price_test_yearly

# Local URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production

```bash
# Stripe Live Mode Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Live Product IDs
STRIPE_PRICE_MONTHLY_ID=price_live_monthly
STRIPE_PRICE_YEARLY_ID=price_live_yearly

# Production URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Setup Steps

1. Create Stripe account
2. Get API keys from Stripe Dashboard
3. Create "Collective Tithe" product
4. Create prices: $4.20/month, $36.90/year
5. Configure webhook endpoint
6. Copy webhook signing secret
7. Add all vars to Vercel/Railway environment
```

**Step 2: Commit**

```bash
git add docs/deployment/stripe-env-setup.md
git commit -m "docs(stripe): add environment setup guide"
```

---

### Task 18: Create Production Checklist

**Files:**
- Create: `docs/deployment/stripe-production-checklist.md`

**Step 1: Document production checklist**

```markdown
# Stripe Production Launch Checklist

## Pre-Launch

- [ ] Stripe account verified and activated for live mode
- [ ] Live API keys obtained and securely stored
- [ ] Production webhook endpoint configured in Stripe Dashboard
- [ ] Webhook signing secret added to production env vars
- [ ] Test mode thoroughly tested with test cards
- [ ] All environment variables updated to production values
- [ ] Database backup completed
- [ ] Rollback plan documented

## Stripe Dashboard Configuration

- [ ] Create live product: "Collective Tithe"
- [ ] Create live prices: $4.20/month, $36.90/year
- [ ] Enable Customer Portal
- [ ] Configure subscription settings:
  - [ ] Payment retry logic (recommended: 4 retries)
  - [ ] Email notifications enabled
  - [ ] Customer portal features (cancel, update payment)
- [ ] Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
- [ ] Select events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`

## Deployment

- [ ] Deploy backend with new Stripe functions
- [ ] Deploy frontend with subscription UI
- [ ] Deploy webhook endpoint
- [ ] Verify webhook endpoint is publicly accessible (HTTPS required)
- [ ] Test webhook delivery with Stripe CLI

## Post-Launch Testing

- [ ] Complete real subscription with real card (small amount)
- [ ] Verify subscription shows in Stripe Dashboard
- [ ] Verify subscription shows in admin dashboard
- [ ] Verify premium access granted correctly
- [ ] Test billing portal access
- [ ] Test subscription cancellation
- [ ] Monitor webhook events for first 24 hours

## Monitoring

- [ ] Set up error alerts for webhook failures
- [ ] Monitor subscription creation rate
- [ ] Track payment failure rate
- [ ] Monitor MRR/ARR metrics
- [ ] Set up daily subscription report

## Rollback Plan

If issues occur:
1. Revert frontend to hide subscription UI
2. Keep backend deployed (webhooks still work)
3. Existing subscriptions continue to function
4. Re-enable old purchase system if needed
5. Investigate and fix issues
6. Re-deploy when ready
```

**Step 2: Commit**

```bash
git add docs/deployment/stripe-production-checklist.md
git commit -m "docs(stripe): add production launch checklist"
```

---

## Final Steps

### Task 19: Update Project Documentation

**Files:**
- Modify: `README.md`

**Step 1: Add Stripe setup section**

Add after environment setup:

```markdown
## Stripe Integration

LTCG uses Stripe for subscription management ("Joining the Collective").

### Setup

1. Install dependencies: `bun install`
2. Get Stripe test keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
3. Add env vars to `.env.local` (see `docs/deployment/stripe-env-setup.md`)
4. Run Stripe webhook forwarding: `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`
5. Start dev server: `bun run dev`

### Testing

Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

See full test card list: https://stripe.com/docs/testing

### Production

See `docs/deployment/stripe-production-checklist.md` for launch steps.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Stripe setup instructions to README"
```

---

### Task 20: Final Verification

**Step 1: Run full build**

```bash
bun run build
```

Expected: Build succeeds with no errors

**Step 2: Run type check**

```bash
bun run type-check
```

Expected: No type errors

**Step 3: Run tests**

```bash
bun test
```

Expected: All tests pass

**Step 4: Verify Convex schema**

```bash
bunx convex dev
```

Expected: Schema compiles, all functions available

**Step 5: Manual smoke test**

1. Start all servers (Convex, web, Stripe CLI)
2. Complete full subscription flow
3. Verify premium access works
4. Test billing portal
5. Test cancellation
6. Verify admin dashboard

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat(stripe): complete Collective Tithe subscription integration

- Add Stripe subscription tables to schema
- Remove gem/token battle pass purchases
- Implement checkout and webhook processing
- Update premium access to use subscription status
- Add subscription management UI
- Build admin subscription dashboard
- Add comprehensive documentation

Closes #[issue-number]"
```

---

## Post-Implementation

**Next Steps:**

1. Create PR for review
2. Deploy to staging environment
3. Test with real Stripe test mode
4. Get stakeholder approval
5. Deploy to production following checklist
6. Monitor for 24 hours
7. Celebrate! 🎉

**Future Enhancements:**

- Email notifications for subscription events
- Referral program
- Gift subscriptions
- Free trial option
- In-app purchase integration (mobile)
- Prorated upgrades (monthly → yearly)

---

## Summary

This plan implements a complete Stripe subscription system for LTCG's "Joining the Collective" feature:

- **20 tasks** organized into 7 phases
- **Full test-driven development** approach
- **Bite-sized steps** (2-5 minutes each)
- **Frequent commits** after each task
- **Comprehensive testing** (manual and automated)
- **Production-ready** documentation and checklists

**Estimated Time:** 8-12 hours (full implementation)

**Critical Dependencies:**
- Stripe account with test/live API keys
- Stripe CLI for webhook testing
- Active Convex deployment
- Next.js app deployed with HTTPS

**Success Criteria:**
- ✅ Users can subscribe via Stripe Checkout
- ✅ Premium access granted automatically
- ✅ Subscriptions auto-renew correctly
- ✅ Cancellation revokes access immediately
- ✅ New seasons auto-unlock for subscribers
- ✅ Admin can view and manage all subscriptions
- ✅ Webhook events processed reliably
- ✅ No gem/token purchase options remain

Ready to implement! 🚀
