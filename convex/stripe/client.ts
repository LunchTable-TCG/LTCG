// convex/stripe/client.ts
import { StripeSubscriptions } from "@convex-dev/stripe";
import { components } from "../_generated/api";

/**
 * Stripe Subscriptions client using @convex-dev/stripe component.
 * Handles checkout sessions, billing portal, and subscription management.
 */
export const stripeClient = new StripeSubscriptions(components.stripe, {
  // Uses STRIPE_SECRET_KEY from environment by default
});
