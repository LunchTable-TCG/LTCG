import { internalMutation } from "../_generated/server";

export const deleteAllAuthData = internalMutation({
  handler: async (ctx) => {
    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    // Delete all auth accounts
    const accounts = await ctx.db.query("authAccounts").collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }

    // Delete all auth sessions
    const sessions = await ctx.db.query("authSessions").collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all auth refresh tokens
    const refreshTokens = await ctx.db.query("authRefreshTokens").collect();
    for (const token of refreshTokens) {
      await ctx.db.delete(token._id);
    }

    return {
      usersDeleted: users.length,
      accountsDeleted: accounts.length,
      sessionsDeleted: sessions.length,
      tokensDeleted: refreshTokens.length,
    };
  },
});
