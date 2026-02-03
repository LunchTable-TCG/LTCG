import { query } from "../_generated/server";

export const getCurrentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const privyId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyId))
      .first();

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
