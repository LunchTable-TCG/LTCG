import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const getOrCreateStripeCustomer = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    stripeCustomerId: v.string(),
  },
  returns: v.id("stripeCustomers"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("stripeCustomers", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      email: args.email,
      createdAt: Date.now(),
    });
  },
});

export const getStripeCustomer = query({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getStripeCustomerByStripeId = query({
  args: {
    stripeCustomerId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stripeCustomers")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();
  },
});

export const upsertSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid"),
      v.literal("incomplete"),
      v.literal("trialing")
    ),
    planInterval: v.union(v.literal("month"), v.literal("year")),
    planAmount: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_stripe_sub", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        planInterval: args.planInterval,
        planAmount: args.planAmount,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
      });
    } else {
      await ctx.db.insert("stripeSubscriptions", args);
    }

    return null;
  },
});

export const getSubscription = query({
  args: {
    userId: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const cancelSubscription = mutation({
  args: {
    subscriptionId: v.id("stripeSubscriptions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "canceled",
      canceledAt: Date.now(),
    });
    return null;
  },
});

export const recordWebhookEvent = mutation({
  args: {
    stripeEventId: v.string(),
    type: v.string(),
  },
  returns: v.id("stripeWebhookEvents"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("stripeWebhookEvents", {
      stripeEventId: args.stripeEventId,
      type: args.type,
      processed: false,
      createdAt: Date.now(),
    });
  },
});

export const isEventProcessed = query({
  args: {
    stripeEventId: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("stripeWebhookEvents")
      .withIndex("by_event_id", (q) => q.eq("stripeEventId", args.stripeEventId))
      .first();

    return event?.processed ?? false;
  },
});

export const markEventProcessed = mutation({
  args: {
    eventId: v.id("stripeWebhookEvents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      processed: true,
      processedAt: Date.now(),
    });
    return null;
  },
});
