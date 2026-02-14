import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const roleValidator = v.union(
  v.literal("moderator"),
  v.literal("admin"),
  v.literal("superadmin")
);

const roleHierarchy: Record<string, number> = {
  moderator: 1,
  admin: 2,
  superadmin: 3,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a user's active admin role.
 */
export const getRole = query({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

/**
 * List all admins, optionally filtered by role.
 */
export const listAdmins = query({
  args: { role: v.optional(roleValidator) },
  returns: v.any(),
  handler: async (ctx, args) => {
    if (args.role) {
      return await ctx.db
        .query("adminRoles")
        .withIndex("by_role", (q) => q.eq("role", args.role!).eq("isActive", true))
        .collect();
    }

    const all = await ctx.db
      .query("adminRoles")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return all;
  },
});

/**
 * Check if a user has the required role level.
 * Returns true if user's role >= requiredRole in hierarchy.
 */
export const hasRole = query({
  args: {
    userId: v.string(),
    requiredRole: roleValidator,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const role = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!role) return false;

    const userLevel = roleHierarchy[role.role] ?? 0;
    const requiredLevel = roleHierarchy[args.requiredRole] ?? 0;

    return userLevel >= requiredLevel;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Grant an admin role to a user.
 */
export const grantRole = mutation({
  args: {
    userId: v.string(),
    role: roleValidator,
    grantedBy: v.string(),
    expiresAt: v.optional(v.number()),
    grantNote: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // Check for existing active role
    const existing = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existing) {
      // Deactivate old role
      await ctx.db.patch(existing._id, {
        isActive: false,
        revokedAt: Date.now(),
        revokedBy: args.grantedBy,
      });
    }

    const id = await ctx.db.insert("adminRoles", {
      userId: args.userId,
      role: args.role,
      grantedBy: args.grantedBy,
      grantedAt: Date.now(),
      isActive: true,
      expiresAt: args.expiresAt,
      grantNote: args.grantNote,
    });

    return id;
  },
});

/**
 * Revoke a user's admin role.
 */
export const revokeRole = mutation({
  args: {
    userId: v.string(),
    revokedBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("adminRoles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!existing) {
      throw new Error("User does not have an active admin role");
    }

    await ctx.db.patch(existing._id, {
      isActive: false,
      revokedAt: Date.now(),
      revokedBy: args.revokedBy,
    });

    return null;
  },
});

/**
 * Cleanup expired roles.
 */
export const cleanupExpiredRoles = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();

    const expiredRoles = await ctx.db
      .query("adminRoles")
      .withIndex("by_expiration", (q) => q.eq("isActive", true))
      .collect();

    let cleaned = 0;
    for (const role of expiredRoles) {
      if (role.expiresAt && role.expiresAt <= now) {
        await ctx.db.patch(role._id, {
          isActive: false,
          revokedAt: now,
        });
        cleaned++;
      }
    }

    return cleaned;
  },
});
