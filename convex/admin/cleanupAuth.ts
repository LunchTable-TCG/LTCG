import { internalMutation } from "../functions";

/**
 * Delete all user data from Convex
 * Note: Auth sessions are managed by Privy externally
 */
export const deleteAllAuthData = internalMutation({
  handler: async (ctx) => {
    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      usersDeleted: users.length,
    };
  },
});
