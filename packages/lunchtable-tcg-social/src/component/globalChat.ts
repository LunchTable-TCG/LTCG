import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Send a message to global chat.
 */
export const sendMessage = mutation({
  args: {
    userId: v.string(),
    username: v.string(),
    message: v.string(),
    isSystem: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("globalChatMessages", {
      userId: args.userId,
      username: args.username,
      message: args.message,
      createdAt: Date.now(),
      isSystem: args.isSystem ?? false,
    });
    return id;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get recent global chat messages.
 */
export const getRecentMessages = query({
  args: {
    limit: v.optional(v.number()),
    before: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("globalChatMessages")
      .withIndex("by_created")
      .order("desc");

    if (args.before) {
      const filtered = q.filter((f) =>
        f.lt(f.field("createdAt"), args.before!)
      );
      return await filtered.take(args.limit ?? 50);
    }

    return await q.take(args.limit ?? 50);
  },
});

/**
 * Get global chat messages by a specific user.
 */
export const getByUser = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("globalChatMessages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit ?? 50);
  },
});
