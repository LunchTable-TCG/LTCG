import { v } from "convex/values";
import { query, mutation } from "./_generated/server.js";

export const getAgentWebhooks = query({
  args: {
    agentId: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("webhooks"),
      _creationTime: v.number(),
      agentId: v.string(),
      events: v.array(v.string()),
      url: v.string(),
      secret: v.optional(v.string()),
      isActive: v.boolean(),
      lastTriggered: v.optional(v.number()),
      failureCount: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .collect();
  },
});

export const createWebhook = mutation({
  args: {
    agentId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    secret: v.optional(v.string()),
  },
  returns: v.id("webhooks"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhooks", {
      agentId: args.agentId,
      url: args.url,
      events: args.events,
      secret: args.secret,
      isActive: true,
      failureCount: 0,
    });
  },
});

export const updateWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
    updates: v.object({
      url: v.optional(v.string()),
      events: v.optional(v.array(v.string())),
      secret: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, args.updates);
    return null;
  },
});

export const deleteWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.webhookId);
    return null;
  },
});

export const recordTrigger = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      lastTriggered: Date.now(),
      failureCount: 0,
    });
    return null;
  },
});

export const recordFailure = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) return null;

    await ctx.db.patch(args.webhookId, {
      failureCount: webhook.failureCount + 1,
    });
    return null;
  },
});
