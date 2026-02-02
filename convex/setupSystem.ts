import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Bootstrap Superadmin
 *
 * Creates the initial superadmin role for a user by their Privy ID.
 * This is meant to be run ONCE during initial setup to bootstrap the first superadmin.
 *
 * Usage: Run via Convex dashboard Functions tab:
 *   setupSystem:bootstrapSuperadmin({ privyId: "did:privy:xxxxx" })
 *
 * SECURITY: This is an internal mutation - can only be called from dashboard or other internal functions.
 */
export const bootstrapSuperadmin = internalMutation({
  args: {
    privyId: v.string(), // Privy DID (e.g., "did:privy:k174wm867ebaravhvxb23a4drn806hv9")
  },
  handler: async (ctx, args) => {
    // Normalize the Privy ID - add prefix if not present
    const privyIdWithPrefix = args.privyId.startsWith("did:privy:")
      ? args.privyId
      : `did:privy:${args.privyId}`;

    // Find user by Privy ID (try both with and without prefix)
    let user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyIdWithPrefix))
      .first();

    if (!user) {
      // Try without prefix
      user = await ctx.db
        .query("users")
        .withIndex("privyId", (q) => q.eq("privyId", args.privyId))
        .first();
    }

    if (!user) {
      return {
        success: false,
        error: `User not found with Privy ID: ${args.privyId} (also tried: ${privyIdWithPrefix})`,
      };
    }

    return await createSuperadminRole(ctx, user._id, user.username || user.email || args.privyId);
  },
});

async function createSuperadminRole(
  ctx: { db: any },
  userId: any,
  identifier: string
) {
  // Check if user already has an active admin role
  const existingRole = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .first();

  if (existingRole) {
    if (existingRole.role === "superadmin") {
      return {
        success: true,
        message: `User ${identifier} is already a superadmin`,
        userId,
      };
    }

    // Deactivate existing role to upgrade to superadmin
    await ctx.db.patch(existingRole._id, {
      isActive: false,
      revokedAt: Date.now(),
    });
  }

  // Create superadmin role (self-granted for bootstrap)
  await ctx.db.insert("adminRoles", {
    userId,
    role: "superadmin",
    grantedBy: userId, // Self-granted during bootstrap
    grantedAt: Date.now(),
    isActive: true,
    grantNote: "Initial superadmin bootstrap",
  });

  return {
    success: true,
    message: `Successfully granted superadmin role to ${identifier}`,
    userId,
  };
}

/**
 * Setup System User
 *
 * Creates a special system user for sending system messages.
 * Run this once during database initialization.
 *
 * Usage: Call via Convex dashboard or action
 */
export const createSystemUser = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if system user already exists
    const existingSystemUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", "system"))
      .first();

    if (existingSystemUser) {
      return {
        success: true,
        message: "System user already exists",
        userId: existingSystemUser._id,
      };
    }

    // Create system user
    const systemUserId = await ctx.db.insert("users", {
      privyId: "system:internal", // Internal system ID (not a Privy DID)
      username: "system",
      email: "system@localhost",
      name: "System",
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "System user created successfully",
      userId: systemUserId,
    };
  },
});

/**
 * Initialize Progression System
 *
 * Seeds quest and achievement definitions
 * Run this once during database initialization
 */
// Extract references to avoid TS2589 "Type instantiation is excessively deep"
const seedQuestsRef = internal.progression.quests.seedQuests;
const seedAchievementsRef = internal.progression.achievements.seedAchievements;

export const initializeProgressionSystem = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Seed quest definitions
    await ctx.scheduler.runAfter(0, seedQuestsRef);

    // Seed achievement definitions
    await ctx.scheduler.runAfter(0, seedAchievementsRef);

    return {
      success: true,
      message: "Progression system initialized",
    };
  },
});
