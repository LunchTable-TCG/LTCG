// convex/stripe/checkout.ts
"use node";

import { v } from "convex/values";
import { components } from "../_generated/api";
import { action } from "../_generated/server";
import { stripeClient } from "./client";

/**
 * Create a Stripe Checkout session for battle pass subscription.
 * Uses @convex-dev/stripe component for checkout management.
 */
export const createCheckoutSession = action({
  args: {
    planInterval: v.union(v.literal("month"), v.literal("year")),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Extract user info from Privy identity
    const privyId = identity.subject;
    const email = identity.email ?? undefined;
    const name = identity.name ?? identity.nickname ?? undefined;

    // Get or create Stripe customer
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: privyId,
      email,
      name,
    });

    // Get price ID based on plan interval
    const priceId =
      args.planInterval === "month"
        ? process.env["STRIPE_PRICE_MONTHLY_ID"]
        : process.env["STRIPE_PRICE_YEARLY_ID"];

    if (!priceId) {
      throw new Error(
        `Missing STRIPE_PRICE_${args.planInterval.toUpperCase()}_ID environment variable`
      );
    }

    // Get base URL for redirects
    const baseUrl = process.env["APP_URL"] ?? process.env["CONVEX_SITE_URL"];
    if (!baseUrl) {
      throw new Error("Missing APP_URL or CONVEX_SITE_URL environment variable");
    }

    // Create checkout session
    const session = await stripeClient.createCheckoutSession(ctx, {
      priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${baseUrl}/battle-pass?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/battle-pass`,
      subscriptionMetadata: {
        userId: privyId,
        planInterval: args.planInterval,
      },
    });

    if (!session.url) {
      throw new Error("Failed to create checkout session URL");
    }

    return {
      checkoutUrl: session.url as string,
      sessionId: session.sessionId,
    };
  },
});

/**
 * Verify a checkout session completed successfully.
 */
export const verifyCheckoutSession = action({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    hasSubscription: v.optional(v.boolean()),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Query subscriptions for this user via component
    const subscriptions = await ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, {
      userId: identity.subject,
    });

    const hasActiveSubscription = subscriptions.some(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    return {
      success: hasActiveSubscription,
      hasSubscription: hasActiveSubscription,
    };
  },
});
