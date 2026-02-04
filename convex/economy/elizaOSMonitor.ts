/**
 * ElizaOS Token Monitor
 *
 * Silently checks user wallets for ElizaOS token balance.
 * When detected, unlocks the hidden "Agent Believer" achievement
 * and grants the exclusive Agent Card reward.
 *
 * This runs as:
 * 1. A check triggered on user login/wallet connect
 * 2. A scheduled cron job to check active users periodically
 */

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { ELIZAOS_TOKEN, SOLANA } from "../lib/constants";

// =============================================================================
// Types
// =============================================================================

interface WalletCheckResult {
  checked: boolean;
  skipped?: boolean;
  reason?: string;
  hasToken?: boolean;
  balance?: number;
  achievementUnlocked?: boolean;
  error?: string;
}

// =============================================================================
// Internal Queries
// =============================================================================

/**
 * Get users who haven't been checked for ElizaOS token yet
 * or haven't been checked in the last 24 hours
 */
export const getUsersToCheck = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Get users with connected wallets
    const usersWithWallets = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("walletAddress"), undefined))
      .take(limit * 2); // Take more to account for filtering

    // Filter to users who haven't been checked recently
    const usersToCheck = [];
    for (const user of usersWithWallets) {
      // Check if they already have the achievement unlocked
      const existingAchievement = await ctx.db
        .query("userAchievements")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.eq(q.field("achievementId"), ELIZAOS_TOKEN.HOLDER_ACHIEVEMENT_ID))
        .first();

      // Skip users who already have the achievement
      if (existingAchievement?.isUnlocked) continue;

      // Check last ElizaOS check timestamp
      const lastCheck = user.lastElizaOSCheck;
      if (!lastCheck || lastCheck < twentyFourHoursAgo) {
        usersToCheck.push({
          userId: user._id,
          walletAddress: user.walletAddress,
        });
      }

      if (usersToCheck.length >= limit) break;
    }

    return usersToCheck;
  },
});

/**
 * Check if user already has ElizaOS achievement
 */
export const hasElizaOSAchievement = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const achievement = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("achievementId"), ELIZAOS_TOKEN.HOLDER_ACHIEVEMENT_ID))
      .first();

    return achievement?.isUnlocked ?? false;
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Record that we checked a user's wallet for ElizaOS token
 */
export const recordWalletCheck = internalMutation({
  args: {
    userId: v.id("users"),
    hasToken: v.boolean(),
    balance: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastElizaOSCheck: Date.now(),
      hasElizaOSToken: args.hasToken,
      elizaOSBalance: args.balance,
    });
  },
});

/**
 * Unlock the ElizaOS holder achievement for a user
 */
export const unlockElizaOSAchievement = internalMutation({
  args: {
    userId: v.id("users"),
    balance: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if achievement definition exists
    const achievementDef = await ctx.db
      .query("achievementDefinitions")
      .withIndex("by_achievement_id", (q) =>
        q.eq("achievementId", ELIZAOS_TOKEN.HOLDER_ACHIEVEMENT_ID)
      )
      .first();

    if (!achievementDef) {
      console.log(
        `[ElizaOS Monitor] Achievement ${ELIZAOS_TOKEN.HOLDER_ACHIEVEMENT_ID} not found. Run seedElizaOSAchievement first.`
      );
      return { success: false, reason: "Achievement not seeded" };
    }

    // Check if user already has this achievement
    const existingProgress = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("achievementId"), ELIZAOS_TOKEN.HOLDER_ACHIEVEMENT_ID))
      .first();

    if (existingProgress?.isUnlocked) {
      return { success: false, reason: "Already unlocked" };
    }

    // Unlock the achievement using the standard progress system
    // This will trigger all the reward granting logic including the Agent Card
    await ctx.scheduler.runAfter(0, internal.progression.achievements.updateAchievementProgress, {
      userId: args.userId,
      event: {
        type: "hold_elizaos_token",
        value: 1,
      },
    });

    // Update user record
    await ctx.db.patch(args.userId, {
      lastElizaOSCheck: Date.now(),
      hasElizaOSToken: true,
      elizaOSBalance: args.balance,
    });

    console.log(`[ElizaOS Monitor] Unlocked Agent Believer achievement for user ${args.userId}`);

    return { success: true };
  },
});

// =============================================================================
// Internal Actions (for RPC calls)
// =============================================================================

/**
 * Check a single user's wallet for ElizaOS token balance
 */
export const checkUserWallet = internalAction({
  args: {
    userId: v.id("users"),
    walletAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already has achievement
    const hasAchievement = await ctx.runQuery(
      internal.economy.elizaOSMonitor.hasElizaOSAchievement,
      {
        userId: args.userId,
      }
    );

    if (hasAchievement) {
      return { checked: true, skipped: true, reason: "Already has achievement" };
    }

    try {
      // Fetch token balance from Solana RPC
      const balance = await fetchElizaOSBalance(args.walletAddress);

      // Record the check
      await ctx.runMutation(internal.economy.elizaOSMonitor.recordWalletCheck, {
        userId: args.userId,
        hasToken: balance >= ELIZAOS_TOKEN.HOLDER_THRESHOLD,
        balance,
      });

      // If they have enough tokens, unlock the achievement
      if (balance >= ELIZAOS_TOKEN.HOLDER_THRESHOLD) {
        await ctx.runMutation(internal.economy.elizaOSMonitor.unlockElizaOSAchievement, {
          userId: args.userId,
          balance,
        });

        return {
          checked: true,
          hasToken: true,
          balance,
          achievementUnlocked: true,
        };
      }

      return {
        checked: true,
        hasToken: false,
        balance,
        achievementUnlocked: false,
      };
    } catch (error) {
      console.error(`[ElizaOS Monitor] Failed to check wallet ${args.walletAddress}:`, error);
      return { checked: false, error: String(error) };
    }
  },
});

/**
 * Batch check multiple users for ElizaOS token
 * Called by cron job
 */
export const batchCheckWallets = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get users to check
    const usersToCheck = await ctx.runQuery(internal.economy.elizaOSMonitor.getUsersToCheck, {
      limit: 50, // Process 50 users per cron run
    });

    if (usersToCheck.length === 0) {
      return { checked: 0, message: "No users to check" };
    }

    let checked = 0;
    let achievementsUnlocked = 0;
    const errors: string[] = [];

    for (const user of usersToCheck) {
      if (!user.walletAddress) continue;

      try {
        const result = await ctx.runAction(internal.economy.elizaOSMonitor.checkUserWallet, {
          userId: user.userId,
          walletAddress: user.walletAddress,
        });

        if (result.checked) {
          checked++;
          if (result.achievementUnlocked) {
            achievementsUnlocked++;
          }
        }
      } catch (error) {
        errors.push(`User ${user.userId}: ${error}`);
      }
    }

    return {
      checked,
      achievementsUnlocked,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Check a user's wallet on login/connect
 * Called when user connects their wallet
 */
export const checkOnWalletConnect = internalAction({
  args: {
    userId: v.id("users"),
    walletAddress: v.string(),
  },
  handler: async (ctx, args): Promise<WalletCheckResult> => {
    const result = await ctx.runAction(internal.economy.elizaOSMonitor.checkUserWallet, {
      userId: args.userId,
      walletAddress: args.walletAddress,
    });
    return result as WalletCheckResult;
  },
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetch ElizaOS token balance for a wallet address
 */
async function fetchElizaOSBalance(walletAddress: string): Promise<number> {
  const rpcUrl = SOLANA.RPC_URL;

  try {
    // Get token accounts for the wallet
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [walletAddress, { mint: ELIZAOS_TOKEN.MINT_ADDRESS }, { encoding: "jsonParsed" }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const accounts = data.result?.value ?? [];

    if (accounts.length === 0) {
      return 0;
    }

    // Sum balances from all token accounts (usually just one)
    let totalBalance = 0;
    for (const account of accounts) {
      const tokenAmount = account.account?.data?.parsed?.info?.tokenAmount;
      if (tokenAmount) {
        totalBalance += Number(tokenAmount.amount);
      }
    }

    return totalBalance;
  } catch (error) {
    console.error(`[ElizaOS Monitor] RPC error for ${walletAddress}:`, error);
    throw error;
  }
}
