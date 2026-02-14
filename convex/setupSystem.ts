import { v } from "convex/values";
import { internalMutation } from "./functions";

/**
 * Bootstrap Superadmin
 *
 * Creates the initial superadmin role for a user by their Privy ID.
 * NOTE: adminRoles table has moved to the admin component.
 * This is a stub — re-wire to use the admin component client.
 */
export const bootstrapSuperadmin = internalMutation({
  args: {
    privyId: v.string(),
  },
  handler: async (ctx, args) => {
    const privyIdWithPrefix = args.privyId.startsWith("did:privy:")
      ? args.privyId
      : `did:privy:${args.privyId}`;

    let user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", privyIdWithPrefix))
      .first();

    if (!user) {
      user = await ctx.db
        .query("users")
        .withIndex("privyId", (q) => q.eq("privyId", args.privyId))
        .first();
    }

    if (!user) {
      return {
        success: false,
        error: `User not found with Privy ID: ${args.privyId}`,
      };
    }

    // TODO: Use admin component client to create superadmin role
    // await adminClient.roles.create({ userId: user._id, role: "superadmin" });
    return {
      success: true,
      message: `User ${user.username || user.email || args.privyId} found. Wire admin component to grant role.`,
      userId: user._id,
    };
  },
});

/**
 * Setup System User
 *
 * Creates a special system user for sending system messages.
 */
export const createSystemUser = internalMutation({
  args: {},
  handler: async (ctx) => {
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

    const systemUserId = await ctx.db.insert("users", {
      privyId: "system:internal",
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
