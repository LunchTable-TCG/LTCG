import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export const syncUser = mutation({
  args: {
    privyId: v.string(),
    email: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", args.privyId))
      .first();

    if (existing) {
      if (args.email || args.username) {
        await ctx.db.patch(existing._id, {
          ...(args.email && { email: args.email }),
          ...(args.username && { username: args.username }),
        });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      privyId: args.privyId,
      username: args.username ?? `player_${Date.now()}`,
      email: args.email,
      createdAt: Date.now(),
    });
  },
});

export const currentUser = query({
  args: { privyId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", args.privyId))
      .first();
  },
});

export async function getUser(ctx: QueryCtx | MutationCtx, privyId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_privyId", (q) => q.eq("privyId", privyId))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}
