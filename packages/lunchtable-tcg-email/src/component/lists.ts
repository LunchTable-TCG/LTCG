import { v } from "convex/values";
import { mutation, query } from "./_generated/server.js";

export const createList = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
  },
  returns: v.id("emailLists"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const listId = await ctx.db.insert("emailLists", {
      name: args.name,
      description: args.description,
      subscriberCount: 0,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });

    return listId;
  },
});

export const getLists = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const lists = await ctx.db.query("emailLists").collect();
    return lists;
  },
});

export const getList = query({
  args: {
    listId: v.id("emailLists"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    return list;
  },
});

export const updateList = mutation({
  args: {
    listId: v.id("emailLists"),
    updates: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.listId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const addSubscriber = mutation({
  args: {
    listId: v.id("emailLists"),
    email: v.string(),
    name: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.id("emailSubscribers"),
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if subscriber already exists for this list
    const existing = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email_list", (q) =>
        q.eq("email", args.email).eq("listId", args.listId)
      )
      .first();

    if (existing) {
      // If exists and is inactive, reactivate
      if (!existing.isActive) {
        await ctx.db.patch(existing._id, {
          isActive: true,
          subscribedAt: now,
          unsubscribedAt: undefined,
        });

        // Increment subscriber count
        const list = await ctx.db.get(args.listId);
        if (list) {
          await ctx.db.patch(args.listId, {
            subscriberCount: list.subscriberCount + 1,
            updatedAt: now,
          });
        }

        return existing._id;
      }
      return existing._id;
    }

    // Create new subscriber
    const subscriberId = await ctx.db.insert("emailSubscribers", {
      email: args.email,
      name: args.name,
      listId: args.listId,
      tags: args.tags,
      isActive: true,
      subscribedAt: now,
    });

    // Increment subscriber count
    const list = await ctx.db.get(args.listId);
    if (list) {
      await ctx.db.patch(args.listId, {
        subscriberCount: list.subscriberCount + 1,
        updatedAt: now,
      });
    }

    return subscriberId;
  },
});

export const removeSubscriber = mutation({
  args: {
    subscriberId: v.id("emailSubscribers"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const subscriber = await ctx.db.get(args.subscriberId);

    if (!subscriber) {
      return null;
    }

    // Mark as inactive
    await ctx.db.patch(args.subscriberId, {
      isActive: false,
      unsubscribedAt: now,
    });

    // Decrement subscriber count
    const list = await ctx.db.get(subscriber.listId);
    if (list) {
      await ctx.db.patch(subscriber.listId, {
        subscriberCount: Math.max(0, list.subscriberCount - 1),
        updatedAt: now,
      });
    }

    return null;
  },
});

export const getSubscribers = query({
  args: {
    listId: v.id("emailLists"),
    activeOnly: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const activeOnly = args.activeOnly ?? true;

    const subscribers = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_list", (q) =>
        q.eq("listId", args.listId).eq("isActive", activeOnly)
      )
      .collect();

    return subscribers;
  },
});
