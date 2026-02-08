import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { requireRole } from "../lib/roles";

/**
 * Email Lists & Subscribers Management
 * Manages subscriber lists for marketing emails
 */

// ============================================================================
// LIST OPERATIONS
// ============================================================================

// List all email lists
export const listLists = query({
  args: {},
  handler: async (ctx) => {
    await requireAuthQuery(ctx);
    return await ctx.db.query("emailLists").collect();
  },
});

// Get a single list with subscriber count
export const getList = query({
  args: { id: v.id("emailLists") },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);
    const list = await ctx.db.get(args.id);
    if (!list) return null;

    const activeSubscribers = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_list", (q) => q.eq("listId", args.id).eq("isActive", true))
      .collect();

    return {
      ...list,
      activeSubscriberCount: activeSubscribers.length,
    };
  },
});

// Create a new email list
export const createList = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const now = Date.now();
    return await ctx.db.insert("emailLists", {
      name: args.name,
      description: args.description,
      subscriberCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a list
export const updateList = mutation({
  args: {
    id: v.id("emailLists"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete a list and all its subscribers
export const deleteList = mutation({
  args: { id: v.id("emailLists") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Delete all subscribers in the list
    const subscribers = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_list", (q) => q.eq("listId", args.id))
      .collect();

    for (const sub of subscribers) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.id);
    return { success: true, deletedSubscribers: subscribers.length };
  },
});

// ============================================================================
// SUBSCRIBER OPERATIONS
// ============================================================================

// List subscribers in a list
export const listSubscribers = query({
  args: {
    listId: v.id("emailLists"),
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const q = ctx.db
      .query("emailSubscribers")
      .withIndex("by_list", (q) =>
        args.activeOnly !== false
          ? q.eq("listId", args.listId).eq("isActive", true)
          : q.eq("listId", args.listId)
      );

    if (args.limit) {
      return await q.take(args.limit);
    }
    return await q.collect();
  },
});

// Add a single subscriber
export const addSubscriber = mutation({
  args: {
    listId: v.id("emailLists"),
    email: v.string(),
    name: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    // Check if already subscribed to this list
    const existing = await ctx.db
      .query("emailSubscribers")
      .withIndex("by_email_list", (q) => q.eq("email", args.email).eq("listId", args.listId))
      .first();

    if (existing) {
      if (existing.isActive) {
        throw new Error("Email already subscribed to this list");
      }
      // Reactivate unsubscribed user
      await ctx.db.patch(existing._id, {
        isActive: true,
        name: args.name,
        tags: args.tags,
        unsubscribedAt: undefined,
      });
      return existing._id;
    }

    const subscriberId = await ctx.db.insert("emailSubscribers", {
      email: args.email,
      name: args.name,
      listId: args.listId,
      tags: args.tags,
      isActive: true,
      subscribedAt: Date.now(),
    });

    // Update list count
    const list = await ctx.db.get(args.listId);
    if (list) {
      await ctx.db.patch(args.listId, {
        subscriberCount: list.subscriberCount + 1,
        updatedAt: Date.now(),
      });
    }

    return subscriberId;
  },
});

// Bulk import subscribers
export const bulkImportSubscribers = mutation({
  args: {
    listId: v.id("emailLists"),
    subscribers: v.array(
      v.object({
        email: v.string(),
        name: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    let added = 0;
    let skipped = 0;
    const now = Date.now();

    for (const sub of args.subscribers) {
      const existing = await ctx.db
        .query("emailSubscribers")
        .withIndex("by_email_list", (q) => q.eq("email", sub.email).eq("listId", args.listId))
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("emailSubscribers", {
        email: sub.email,
        name: sub.name,
        listId: args.listId,
        tags: sub.tags,
        isActive: true,
        subscribedAt: now,
      });
      added++;
    }

    // Update list count
    const list = await ctx.db.get(args.listId);
    if (list) {
      await ctx.db.patch(args.listId, {
        subscriberCount: list.subscriberCount + added,
        updatedAt: Date.now(),
      });
    }

    return { added, skipped, total: args.subscribers.length };
  },
});

// Remove/unsubscribe a subscriber
export const removeSubscriber = mutation({
  args: {
    subscriberId: v.id("emailSubscribers"),
    hardDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);
    await requireRole(ctx, userId, "admin");

    const subscriber = await ctx.db.get(args.subscriberId);
    if (!subscriber) throw new Error("Subscriber not found");

    if (args.hardDelete) {
      await ctx.db.delete(args.subscriberId);
    } else {
      await ctx.db.patch(args.subscriberId, {
        isActive: false,
        unsubscribedAt: Date.now(),
      });
    }

    // Update list count
    const list = await ctx.db.get(subscriber.listId);
    if (list && subscriber.isActive) {
      await ctx.db.patch(subscriber.listId, {
        subscriberCount: Math.max(0, list.subscriberCount - 1),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Get all player emails (for sending to registered users)
export const getPlayerEmails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthQuery(ctx);

    const users = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("email"), undefined))
      .take(args.limit ?? 10000);

    return users.flatMap((u) => {
      if (!u.email) return [];
      return [
        {
          id: u._id,
          email: u.email,
          name: u.username ?? u.name ?? "Player",
        },
      ];
    });
  },
});
