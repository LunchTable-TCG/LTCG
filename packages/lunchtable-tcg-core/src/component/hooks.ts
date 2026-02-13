import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const register = mutation({
  args: {
    event: v.string(),
    callbackHandle: v.string(),
    filter: v.optional(v.any()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("hooks", {
      event: args.event,
      callbackHandle: args.callbackHandle,
      filter: args.filter,
    });
    return id as string;
  },
});

export const unregister = mutation({
  args: {
    id: v.id("hooks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

export const getForEvent = query({
  args: {
    event: v.string(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("hooks")
      .withIndex("by_event", (q) => q.eq("event", args.event))
      .collect();
  },
});

export const clearAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const allHooks = await ctx.db.query("hooks").collect();
    for (const hook of allHooks) {
      await ctx.db.delete(hook._id);
    }
    return null;
  },
});
