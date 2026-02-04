// convex/stripe/portal.ts
"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { stripeClient } from "./client";

/**
 * Create a Stripe Customer Portal session for subscription management.
 * Uses the @convex-dev/stripe component to manage customer lookup/creation.
 */
export const createBillingPortalSession = action({
  args: {},
  returns: v.object({
    portalUrl: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get base URL for return redirect
    const baseUrl = process.env["APP_URL"] ?? process.env["CONVEX_SITE_URL"];
    if (!baseUrl) {
      throw new Error("Missing APP_URL or CONVEX_SITE_URL environment variable");
    }

    // Get or create customer using the component
    // The component stores customers in its own tables and links via userId
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: identity.subject,
      email: identity.email ?? undefined,
      name: identity.name ?? undefined,
    });

    // Create portal session using the customer ID from the component
    const session = await stripeClient.createCustomerPortalSession(ctx, {
      customerId: customer.customerId,
      returnUrl: `${baseUrl}/battle-pass`,
    });

    return {
      portalUrl: session.url,
    };
  },
});
