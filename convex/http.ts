import { registerRoutes } from "@convex-dev/stripe";
import type Stripe from "stripe";

import { components } from "./_generated/api";
import { payments } from "./lib/componentClients";
import router from "./router";

import * as livekitWebhook from "./livekit/http/webhook";

// Privy handles auth externally - no auth routes needed here
const http = router;

// ============================================================================
// Stripe Webhook (via @convex-dev/stripe component)
// ============================================================================

// Helper: derive planInterval from Stripe recurring interval
function toPlanInterval(interval: string | undefined): "month" | "year" {
  return interval === "year" ? "year" : "month";
}

// Helper: map Stripe subscription status to LTCG payment component status
function toSubscriptionStatus(
  status: string
): "active" | "canceled" | "past_due" | "unpaid" | "incomplete" | "trialing" {
  const validStatuses = [
    "active",
    "canceled",
    "past_due",
    "unpaid",
    "incomplete",
    "trialing",
  ] as const;
  const found = validStatuses.find((s) => s === status);
  return found ?? "incomplete";
}

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
  events: {
    // ── Subscription Created ──────────────────────────────────────────
    "customer.subscription.created": async (ctx, event) => {
      // Idempotency guard — Stripe may retry webhooks
      const alreadyProcessed = await ctx.runQuery(payments.stripe.isEventProcessed(event.id));
      if (alreadyProcessed) return;

      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn(
          "Stripe subscription.created missing metadata.userId — skipping LTCG sync",
          subscription.id
        );
        return;
      }

      const item = subscription.items.data[0];
      const stripeCustomerId = subscription.customer as string;

      // Record webhook event for idempotency tracking
      const eventRef = payments.stripe.recordWebhookEvent(event.id, event.type);
      await ctx.runMutation(eventRef);

      // Ensure customer record exists in LTCG payments component
      const customerRef = payments.stripe.getOrCreateStripeCustomer(
        userId,
        subscription.metadata?.email ?? "",
        stripeCustomerId
      );
      await ctx.runMutation(customerRef);

      // Upsert subscription into LTCG payments component
      const upsertRef = payments.stripe.upsertSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        status: toSubscriptionStatus(subscription.status),
        planInterval: toPlanInterval(item?.price?.recurring?.interval),
        planAmount: item?.price?.unit_amount ?? 0,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        canceledAt: subscription.canceled_at ?? undefined,
      });
      await ctx.runMutation(upsertRef);
    },

    // ── Subscription Updated ──────────────────────────────────────────
    "customer.subscription.updated": async (ctx, event) => {
      const alreadyProcessed = await ctx.runQuery(payments.stripe.isEventProcessed(event.id));
      if (alreadyProcessed) return;

      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn(
          "Stripe subscription.updated missing metadata.userId — skipping LTCG sync",
          subscription.id
        );
        return;
      }

      const item = subscription.items.data[0];
      const stripeCustomerId = subscription.customer as string;

      // Record webhook event
      const eventRef = payments.stripe.recordWebhookEvent(event.id, event.type);
      await ctx.runMutation(eventRef);

      // Upsert subscription with latest data
      const upsertRef = payments.stripe.upsertSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        status: toSubscriptionStatus(subscription.status),
        planInterval: toPlanInterval(item?.price?.recurring?.interval),
        planAmount: item?.price?.unit_amount ?? 0,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        canceledAt: subscription.canceled_at ?? undefined,
      });
      await ctx.runMutation(upsertRef);
    },

    // ── Subscription Deleted ──────────────────────────────────────────
    "customer.subscription.deleted": async (ctx, event) => {
      const alreadyProcessed = await ctx.runQuery(payments.stripe.isEventProcessed(event.id));
      if (alreadyProcessed) return;

      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.warn(
          "Stripe subscription.deleted missing metadata.userId — skipping LTCG sync",
          subscription.id
        );
        return;
      }

      const stripeCustomerId = subscription.customer as string;

      // Record webhook event
      const eventRef = payments.stripe.recordWebhookEvent(event.id, event.type);
      await ctx.runMutation(eventRef);

      // Mark subscription as canceled in LTCG payments component
      const upsertRef = payments.stripe.upsertSubscription({
        userId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        status: "canceled",
        planInterval: toPlanInterval(subscription.items.data[0]?.price?.recurring?.interval),
        planAmount: subscription.items.data[0]?.price?.unit_amount ?? 0,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: true,
        canceledAt: subscription.canceled_at ?? Date.now() / 1000,
      });
      await ctx.runMutation(upsertRef);
    },

    // ── Checkout Session Completed ────────────────────────────────────
    "checkout.session.completed": async (ctx, event) => {
      const alreadyProcessed = await ctx.runQuery(payments.stripe.isEventProcessed(event.id));
      if (alreadyProcessed) return;

      const session = event.data.object as Stripe.Checkout.Session;

      // Only sync subscription-mode sessions to LTCG payments
      if (session.mode !== "subscription") return;

      const userId = session.metadata?.userId;
      const stripeCustomerId = session.customer as string | undefined;

      if (!userId || !stripeCustomerId) {
        console.warn(
          "Stripe checkout.session.completed missing userId or customerId — skipping LTCG sync",
          session.id
        );
        return;
      }

      // Record webhook event
      const eventRef = payments.stripe.recordWebhookEvent(event.id, event.type);
      await ctx.runMutation(eventRef);

      // Ensure customer record exists in LTCG payments component
      const customerRef = payments.stripe.getOrCreateStripeCustomer(
        userId,
        session.customer_email ?? session.customer_details?.email ?? "",
        stripeCustomerId
      );
      await ctx.runMutation(customerRef);
    },
  },
});

// ============================================================================
// LiveKit Webhook
// ============================================================================

// POST /livekit/webhook - Receive LiveKit room/participant/track events
http.route({
  path: "/livekit/webhook",
  method: "POST",
  handler: livekitWebhook.livekitWebhook,
});

export default http;
