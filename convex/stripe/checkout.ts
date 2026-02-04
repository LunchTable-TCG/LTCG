import { v } from "convex/values";
import { query } from "../_generated/server";
import { mutation } from "../functions";
import { STRIPE_PRICE_IDS, stripe } from "../lib/stripe";

export const createCheckoutSession = mutation({
  args: {
    planInterval: v.union(v.literal("month"), v.literal("year")),
  },
  handler: async (ctx, args) => {
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
      args.planInterval === "month" ? STRIPE_PRICE_IDS.MONTHLY : STRIPE_PRICE_IDS.YEARLY;

    // Get base URL from environment
    const baseUrl = process.env["CONVEX_SITE_URL"] || "http://localhost:3000";

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
      success_url: `${baseUrl}/battle-pass?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/battle-pass`,
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
    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

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
