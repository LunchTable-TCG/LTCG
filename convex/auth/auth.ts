/**
 * Authentication module
 *
 * Uses Privy for authentication. JWT tokens are verified by Convex
 * via ctx.auth.getUserIdentity().
 *
 * User data is stored in Convex users table with privyId as the key.
 */

import { query } from "../_generated/server";

/**
 * Get the currently logged in user's full profile
 * Uses Privy JWT verification
 */
export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Look up user by Privy DID
    const user = await ctx.db
      .query("users")
      .withIndex("privyId", (q) => q.eq("privyId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return user;
  },
});
