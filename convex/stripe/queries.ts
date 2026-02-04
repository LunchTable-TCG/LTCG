// convex/stripe/queries.ts
import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";

/**
 * Get current user's active subscription.
 * Uses @convex-dev/stripe component for data access.
 */
export const getCurrentSubscription = query({
  args: {},
  returns: v.union(
    v.object({
      stripeSubscriptionId: v.string(),
      status: v.string(),
      priceId: v.optional(v.string()),
      currentPeriodEnd: v.optional(v.number()),
      cancelAtPeriodEnd: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Query subscriptions via component
    const subscriptions = await ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, {
      userId: identity.subject,
    });

    // Find active subscription
    const active = subscriptions.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    );

    if (!active) {
      return null;
    }

    return {
      stripeSubscriptionId: active.stripeSubscriptionId,
      status: active.status,
      priceId: active.priceId,
      currentPeriodEnd: active.currentPeriodEnd,
      cancelAtPeriodEnd: active.cancelAtPeriodEnd,
    };
  },
});

/**
 * Check if user has active premium subscription.
 */
export const hasActiveSubscription = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const subscriptions = await ctx.runQuery(components.stripe.public.listSubscriptionsByUserId, {
      userId: identity.subject,
    });

    return subscriptions.some((sub) => sub.status === "active" || sub.status === "trialing");
  },
});
