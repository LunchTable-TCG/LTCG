import { internalMutation } from "./_generated/server";

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
