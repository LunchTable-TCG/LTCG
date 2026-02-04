import { v } from "convex/values";
import type Stripe from "stripe";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../functions";

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

async function handleSubscriptionChange(ctx: MutationCtx, subscription: Stripe.Subscription) {
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
  const amount = subscription.items.data[0]?.price.unit_amount || 0;
  const interval = subscription.items.data[0]?.price.recurring?.interval as "month" | "year";

  // Upsert subscription record
  const existingSub = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", subscription.id))
    .first();

  // Type assertion for Stripe webhook payload properties
  // biome-ignore lint/suspicious/noExplicitAny: Stripe SDK types don't match webhook payload structure
  const subData = subscription as any;

  const subscriptionData = {
    userId: stripeCustomer.userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status as
      | "active"
      | "canceled"
      | "past_due"
      | "unpaid"
      | "incomplete"
      | "trialing",
    planInterval: interval,
    planAmount: amount,
    currentPeriodStart: subData.current_period_start * 1000,
    currentPeriodEnd: subData.current_period_end * 1000,
    cancelAtPeriodEnd: subData.cancel_at_period_end,
    canceledAt: subData.canceled_at ? subData.canceled_at * 1000 : undefined,
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

async function handleSubscriptionDeleted(ctx: MutationCtx, subscription: Stripe.Subscription) {
  const existingSub = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", subscription.id))
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

async function handlePaymentSucceeded(ctx: MutationCtx, invoice: Stripe.Invoice) {
  // Type assertion for Stripe webhook payload properties
  // biome-ignore lint/suspicious/noExplicitAny: Stripe SDK types don't match webhook payload structure
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;

  if (!subscriptionId) return;

  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", subscriptionId))
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

async function handlePaymentFailed(ctx: MutationCtx, invoice: Stripe.Invoice) {
  // Type assertion for Stripe webhook payload properties
  // biome-ignore lint/suspicious/noExplicitAny: Stripe SDK types don't match webhook payload structure
  const invoiceData = invoice as any;
  const subscriptionId = invoiceData.subscription as string;

  if (!subscriptionId) return;

  const subscription = await ctx.db
    .query("stripeSubscriptions")
    .withIndex("by_stripe_subscription", (q) => q.eq("stripeSubscriptionId", subscriptionId))
    .first();

  if (subscription) {
    await ctx.db.patch(subscription._id, {
      status: "past_due",
    });
  }
}

async function grantPremiumAccess(ctx: MutationCtx, userId: Id<"users">) {
  // Get all active battle pass seasons
  const activeSeasons = await ctx.db
    .query("battlePassSeasons")
    .filter((q) => q.eq(q.field("status"), "active"))
    .collect();

  for (const season of activeSeasons) {
    // Check if user has progress for this season
    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) => q.eq("userId", userId).eq("battlePassId", season._id))
      .first();

    if (progress) {
      // Update existing progress
      await ctx.db.patch(progress._id, { isPremium: true });
    } else {
      // Create new progress with premium
      await ctx.db.insert("battlePassProgress", {
        userId,
        battlePassId: season._id,
        currentXP: 0,
        currentTier: 0,
        isPremium: true,
        claimedFreeTiers: [],
        claimedPremiumTiers: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }
}

async function revokePremiumAccess(ctx: MutationCtx, userId: Id<"users">) {
  // Get all battle pass progress for user
  const allProgress = await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const progress of allProgress) {
    await ctx.db.patch(progress._id, { isPremium: false });
  }
}
