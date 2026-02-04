import { mutation } from "../functions";
import { stripe } from "../lib/stripe";

export const createBillingPortalSession = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

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

    // Get base URL from environment
    const baseUrl = process.env["CONVEX_SITE_URL"] || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: `${baseUrl}/battle-pass`,
    });

    return {
      portalUrl: session.url,
    };
  },
});
