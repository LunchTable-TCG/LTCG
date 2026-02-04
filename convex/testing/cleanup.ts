import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, mutation } from "../functions";
import { ErrorCode, createError } from "../lib/errorCodes";

/**
 * Validate that the caller is in a test environment.
 * Throws an error if not in test mode.
 */
function requireTestEnvironment() {
  const isTestEnv =
    process.env["NODE_ENV"] === "test" || process.env["CONVEX_TEST_MODE"] === "true";
  if (!isTestEnv) {
    throw createError(ErrorCode.AUTH_REQUIRED, {
      reason: "Test mutations are only available in test environment",
    });
  }
}

/**
 * Helper function that performs the actual cleanup logic
 * Can be called from both single-user and bulk cleanup mutations
 */
async function cleanupTestUserHelper(ctx: MutationCtx, userId: Id<"users">) {
  // 1. Delete user's decks and deck cards
  const decks = await ctx.db
    .query("userDecks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const deck of decks) {
    // Delete cards in deck
    const deckCards = await ctx.db
      .query("deckCards")
      .withIndex("by_deck", (q) => q.eq("deckId", deck._id))
      .collect();
    for (const card of deckCards) {
      await ctx.db.delete(card._id);
    }
    // Delete deck
    await ctx.db.delete(deck._id);
  }

  // 2. Delete user's card inventory
  const playerCards = await ctx.db
    .query("playerCards")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const card of playerCards) {
    await ctx.db.delete(card._id);
  }

  // 3. Delete game lobbies where user is host or opponent
  const hostLobbies = await ctx.db
    .query("gameLobbies")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .collect();
  for (const lobby of hostLobbies) {
    await ctx.db.delete(lobby._id);
  }

  // 4. Delete game states
  const hostGameStates = await ctx.db
    .query("gameStates")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .collect();
  for (const state of hostGameStates) {
    await ctx.db.delete(state._id);
  }
  const opponentGameStates = await ctx.db
    .query("gameStates")
    .withIndex("by_opponent", (q) => q.eq("opponentId", userId))
    .collect();
  for (const state of opponentGameStates) {
    await ctx.db.delete(state._id);
  }

  // 5. Delete match history (as winner or loser)
  const winnerMatches = await ctx.db
    .query("matchHistory")
    .withIndex("by_winner", (q) => q.eq("winnerId", userId))
    .collect();
  for (const match of winnerMatches) {
    await ctx.db.delete(match._id);
  }
  const loserMatches = await ctx.db
    .query("matchHistory")
    .withIndex("by_loser", (q) => q.eq("loserId", userId))
    .collect();
  for (const match of loserMatches) {
    await ctx.db.delete(match._id);
  }

  // 6. Delete matchmaking queue entries
  const queueEntries = await ctx.db
    .query("matchmakingQueue")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const entry of queueEntries) {
    await ctx.db.delete(entry._id);
  }

  // 7. Delete user preferences
  const preferences = await ctx.db
    .query("userPreferences")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const pref of preferences) {
    await ctx.db.delete(pref._id);
  }

  // 8. Delete user presence
  const presence = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const p of presence) {
    await ctx.db.delete(p._id);
  }

  // 9. Delete global chat messages
  const chatMessages = await ctx.db
    .query("globalChatMessages")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const msg of chatMessages) {
    await ctx.db.delete(msg._id);
  }

  // 10. Delete user reports (as reporter or reported)
  const reportsAsReporter = await ctx.db
    .query("userReports")
    .withIndex("by_reporter", (q) => q.eq("reporterId", userId))
    .collect();
  for (const report of reportsAsReporter) {
    await ctx.db.delete(report._id);
  }
  const reportsAsReported = await ctx.db
    .query("userReports")
    .withIndex("by_reported_user", (q) => q.eq("reportedUserId", userId))
    .collect();
  for (const report of reportsAsReported) {
    await ctx.db.delete(report._id);
  }

  // 11. Delete admin roles
  const adminRoles = await ctx.db
    .query("adminRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const role of adminRoles) {
    await ctx.db.delete(role._id);
  }

  // 12. Delete admin audit logs
  const auditLogs = await ctx.db
    .query("adminAuditLogs")
    .withIndex("by_admin", (q) => q.eq("adminId", userId))
    .collect();
  for (const log of auditLogs) {
    await ctx.db.delete(log._id);
  }

  // 13. Delete agents and related data
  const agents = await ctx.db
    .query("agents")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const agent of agents) {
    // Delete API keys for agent
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();
    for (const key of apiKeys) {
      await ctx.db.delete(key._id);
    }
    // Delete agent decisions
    const decisions = await ctx.db
      .query("agentDecisions")
      .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
      .collect();
    for (const decision of decisions) {
      await ctx.db.delete(decision._id);
    }
    // Delete agent
    await ctx.db.delete(agent._id);
  }
  // Also delete API keys by userId index
  const apiKeys = await ctx.db
    .query("apiKeys")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const key of apiKeys) {
    await ctx.db.delete(key._id);
  }

  // 14. Delete currency data
  const currency = await ctx.db
    .query("playerCurrency")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const c of currency) {
    await ctx.db.delete(c._id);
  }
  const transactions = await ctx.db
    .query("currencyTransactions")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .collect();
  for (const tx of transactions) {
    await ctx.db.delete(tx._id);
  }

  // 15. Delete pack opening history
  const packHistory = await ctx.db
    .query("packOpeningHistory")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .collect();
  for (const pack of packHistory) {
    await ctx.db.delete(pack._id);
  }

  // 16. Delete marketplace listings and bids
  const listings = await ctx.db
    .query("marketplaceListings")
    .withIndex("by_seller", (q) => q.eq("sellerId", userId))
    .collect();
  for (const listing of listings) {
    // Delete bids on this listing
    const bids = await ctx.db
      .query("auctionBids")
      .withIndex("by_listing", (q) => q.eq("listingId", listing._id))
      .collect();
    for (const bid of bids) {
      await ctx.db.delete(bid._id);
    }
    await ctx.db.delete(listing._id);
  }
  // Delete bids by user
  const userBids = await ctx.db
    .query("auctionBids")
    .withIndex("by_bidder", (q) => q.eq("bidderId", userId))
    .collect();
  for (const bid of userBids) {
    await ctx.db.delete(bid._id);
  }

  // 17. Delete token data
  const tokenBalances = await ctx.db
    .query("tokenBalanceCache")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const balance of tokenBalances) {
    await ctx.db.delete(balance._id);
  }
  const tokenTransactions = await ctx.db
    .query("tokenTransactions")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .collect();
  for (const tx of tokenTransactions) {
    await ctx.db.delete(tx._id);
  }
  const pendingPurchases = await ctx.db
    .query("pendingTokenPurchases")
    .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
    .collect();
  for (const purchase of pendingPurchases) {
    await ctx.db.delete(purchase._id);
  }

  // 18. Delete promo redemptions
  const promoRedemptions = await ctx.db
    .query("promoRedemptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const redemption of promoRedemptions) {
    await ctx.db.delete(redemption._id);
  }

  // 19. Delete story progress and related data
  const storyProgress = await ctx.db
    .query("storyProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const progress of storyProgress) {
    // Delete battle attempts for this progress
    const attempts = await ctx.db
      .query("storyBattleAttempts")
      .withIndex("by_progress", (q) => q.eq("progressId", progress._id))
      .collect();
    for (const attempt of attempts) {
      await ctx.db.delete(attempt._id);
    }
    await ctx.db.delete(progress._id);
  }
  const storyBattleAttempts = await ctx.db
    .query("storyBattleAttempts")
    .withIndex("by_user_time", (q) => q.eq("userId", userId))
    .collect();
  for (const attempt of storyBattleAttempts) {
    await ctx.db.delete(attempt._id);
  }
  const stageProgress = await ctx.db
    .query("storyStageProgress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const stage of stageProgress) {
    await ctx.db.delete(stage._id);
  }

  // 20. Delete XP data
  const xpData = await ctx.db
    .query("playerXP")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const xp of xpData) {
    await ctx.db.delete(xp._id);
  }

  // 21. Delete badges
  const badges = await ctx.db
    .query("playerBadges")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const badge of badges) {
    await ctx.db.delete(badge._id);
  }

  // 22. Delete notifications
  const notifications = await ctx.db
    .query("playerNotifications")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const notification of notifications) {
    await ctx.db.delete(notification._id);
  }

  // 23. Delete quests and achievements
  const userQuests = await ctx.db
    .query("userQuests")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const quest of userQuests) {
    await ctx.db.delete(quest._id);
  }
  const userAchievements = await ctx.db
    .query("userAchievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const achievement of userAchievements) {
    await ctx.db.delete(achievement._id);
  }

  // 24. Delete friendships
  const friendshipsAsUser = await ctx.db
    .query("friendships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const friendship of friendshipsAsUser) {
    await ctx.db.delete(friendship._id);
  }
  const friendshipsAsFriend = await ctx.db
    .query("friendships")
    .withIndex("by_friend", (q) => q.eq("friendId", userId))
    .collect();
  for (const friendship of friendshipsAsFriend) {
    await ctx.db.delete(friendship._id);
  }

  // 25. Delete file metadata
  const fileMetadata = await ctx.db
    .query("fileMetadata")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const file of fileMetadata) {
    await ctx.db.delete(file._id);
  }

  // 26. Finally delete the user
  await ctx.db.delete(userId);

  return { success: true, userId };
}

/**
 * Cleanup mutation for test users - removes all related data
 *
 * This mutation cascades through all tables that reference users to ensure
 * complete cleanup of test data. Test users are identified by privyId
 * starting with "did:privy:test-"
 * Only available in test environments (NODE_ENV=test or CONVEX_TEST_MODE=true).
 */
export const cleanupTestUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    requireTestEnvironment();
    return cleanupTestUserHelper(ctx, args.userId);
  },
});

/**
 * Bulk cleanup for all test users
 * Useful for CI environments to clean up after test runs
 */
export const cleanupAllTestUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all users with test privyId pattern (did:privy:test-*)
    const allUsers = await ctx.db.query("users").collect();
    const testUsers = allUsers.filter((user) => user.privyId?.startsWith("did:privy:test-"));

    let deletedCount = 0;
    const errors: string[] = [];

    for (const user of testUsers) {
      try {
        // Use the helper function directly for each test user
        await cleanupTestUserHelper(ctx, user._id);
        deletedCount++;
      } catch (error) {
        errors.push(`Failed to delete user ${user._id} (${user.privyId}): ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      deletedCount,
      totalTestUsers: testUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Cleanup test lobbies and game states
 * Useful for cleaning up orphaned game data
 */
export const cleanupTestGames = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all test users
    const allUsers = await ctx.db.query("users").collect();
    const testUserIds = new Set(
      allUsers.filter((user) => user.privyId?.startsWith("did:privy:test-")).map((user) => user._id)
    );

    // Delete lobbies where host is a test user
    const allLobbies = await ctx.db.query("gameLobbies").collect();
    const testLobbies = allLobbies.filter((lobby) => testUserIds.has(lobby.hostId));

    for (const lobby of testLobbies) {
      // Delete game events for this lobby
      const events = await ctx.db
        .query("gameEvents")
        .withIndex("by_lobby", (q) => q.eq("lobbyId", lobby._id))
        .collect();
      for (const event of events) {
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(lobby._id);
    }

    // Delete game states where host or opponent is a test user
    const allGameStates = await ctx.db.query("gameStates").collect();
    const testGameStates = allGameStates.filter(
      (state) => testUserIds.has(state.hostId) || testUserIds.has(state.opponentId)
    );

    for (const state of testGameStates) {
      await ctx.db.delete(state._id);
    }

    return {
      success: true,
      deletedLobbies: testLobbies.length,
      deletedGameStates: testGameStates.length,
    };
  },
});
