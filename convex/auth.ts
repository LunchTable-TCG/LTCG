import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Extracts user identity from JWT via ctx.auth.getUserIdentity().
 * Throws if not authenticated.
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const privyId = identity.subject;
  return { privyId, identity };
}

/**
 * Resolves the full user document from the authenticated JWT.
 * Throws if not authenticated or user not found.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const { privyId } = await requireAuth(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_privyId", (q) => q.eq("privyId", privyId))
    .first();
  if (!user) throw new Error("User not found. Complete signup first.");
  return user;
}

/**
 * Syncs or creates a user based on JWT identity.
 * Uses JWT subject as privyId, no longer accepts it as an arg.
 */
export const syncUser = mutation({
  args: {
    email: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    walletType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { privyId, identity } = await requireAuth(ctx);
    const email = args.email ?? identity.email ?? undefined;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", privyId))
      .first();

    if (existing) {
      // Update email if provided and changed
      if (email && email !== existing.email) {
        await ctx.db.patch(existing._id, { email });
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      privyId,
      username: `player_${Date.now()}`,
      email,
      createdAt: Date.now(),
    });
  },
});

/**
 * Returns the current user based on JWT identity.
 * Returns null if not authenticated or user not found.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", identity.subject))
      .first();
  },
});

/**
 * Returns onboarding status for the authenticated user.
 */
export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_privyId", (q) => q.eq("privyId", identity.subject))
      .first();
    if (!user)
      return { exists: false, hasUsername: false, hasStarterDeck: false };
    return {
      exists: true,
      hasUsername: !user.username.startsWith("player_"),
      hasStarterDeck: !!user.activeDeckId,
    };
  },
});

/**
 * Sets the username for the authenticated user.
 * Validates format and uniqueness.
 */
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    // Validate: 3-20 chars, alphanumeric + underscores
    const trimmed = args.username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      throw new Error(
        "Username must be 3-20 characters, alphanumeric and underscores only."
      );
    }
    // Check uniqueness
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", trimmed))
      .first();
    if (taken && taken._id !== user._id) {
      throw new Error("Username is already taken.");
    }
    await ctx.db.patch(user._id, { username: trimmed });
    return { success: true };
  },
});

/**
 * Legacy helper for backward compatibility.
 * Still used internally by game.ts during migration.
 */
export async function getUser(ctx: QueryCtx | MutationCtx, privyId: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("by_privyId", (q) => q.eq("privyId", privyId))
    .first();
  if (!user) throw new Error("User not found");
  return user;
}
