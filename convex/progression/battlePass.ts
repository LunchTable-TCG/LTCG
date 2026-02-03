/**
 * Battle Pass System
 *
 * Manages battle pass progression, tier rewards, and premium pass purchases.
 * Integrates with the existing XP system to grant battle pass XP alongside player XP.
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { TOKEN } from "../lib/constants";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import {
  battlePassProgressValidator,
  battlePassStatusValidator,
  battlePassTierValidator,
  claimBattlePassRewardValidator,
} from "../lib/returnValidators";
import { fromRawAmount } from "../lib/solana/tokenBalance";
import { buildTokenTransferTransaction } from "../lib/solana/tokenTransfer";

// Module-scope typed helper to avoid TS2589 "Type instantiation is excessively deep"
// biome-ignore lint/suspicious/noExplicitAny: Convex deep type workaround
const internalAny = internal as any;

// ============================================================================
// Types
// ============================================================================

type RewardType = "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";

interface BattlePassReward {
  type: RewardType;
  amount?: number;
  cardId?: Id<"cardDefinitions">;
  packProductId?: string;
  titleName?: string;
  avatarUrl?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build an unsigned token transfer transaction to treasury
 *
 * Creates an SPL transfer transaction from buyer to treasury wallet
 * for battle pass premium purchases.
 *
 * @param buyerWallet - Buyer's wallet address
 * @param amount - Amount in human-readable format
 * @returns Unsigned transaction result
 */
async function buildTreasuryTransferTransaction(
  buyerWallet: string,
  amount: number
) {
  if (!TOKEN.TREASURY_WALLET) {
    throw new Error(
      "Treasury wallet not configured. Set LTCG_TREASURY_WALLET environment variable."
    );
  }

  return buildTokenTransferTransaction({
    from: buyerWallet,
    to: TOKEN.TREASURY_WALLET,
    amount,
  });
}

/**
 * Get the currently active battle pass
 */
async function getActiveBattlePass(ctx: QueryCtx | MutationCtx) {
  return await ctx.db
    .query("battlePassSeasons")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .first();
}

/**
 * Get or create user's battle pass progress
 */
async function getOrCreateBattlePassProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  battlePassId: Id<"battlePassSeasons">
): Promise<Doc<"battlePassProgress">> {
  const existing = await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user_battlepass", (q) =>
      q.eq("userId", userId).eq("battlePassId", battlePassId)
    )
    .first();

  if (existing) return existing;

  // Create new progress record
  const now = Date.now();
  const progressId = await ctx.db.insert("battlePassProgress", {
    userId,
    battlePassId,
    currentXP: 0,
    currentTier: 0,
    isPremium: false,
    claimedFreeTiers: [],
    claimedPremiumTiers: [],
    createdAt: now,
    updatedAt: now,
  });

  const newProgress = await ctx.db.get(progressId);
  if (!newProgress) {
    throw createError(ErrorCode.LIBRARY_XP_CREATION_FAILED, { userId });
  }
  return newProgress;
}

/**
 * Get user's battle pass progress (read-only)
 */
async function getBattlePassProgress(
  ctx: QueryCtx,
  userId: Id<"users">,
  battlePassId: Id<"battlePassSeasons">
) {
  return await ctx.db
    .query("battlePassProgress")
    .withIndex("by_user_battlepass", (q) =>
      q.eq("userId", userId).eq("battlePassId", battlePassId)
    )
    .first();
}

/**
 * Calculate tier from XP
 */
function calculateTierFromXP(xp: number, xpPerTier: number, maxTiers: number) {
  if (xpPerTier <= 0) return 0;
  return Math.min(Math.floor(xp / xpPerTier), maxTiers);
}

/**
 * Grant a battle pass reward to the user
 */
async function grantReward(
  ctx: MutationCtx,
  userId: Id<"users">,
  reward: BattlePassReward,
  tier: number,
  isPremium: boolean
) {
  const trackType = isPremium ? "Premium" : "Free";
  const description = `Battle Pass Tier ${tier} (${trackType})`;

  switch (reward.type) {
    case "gold":
      if (reward.amount && reward.amount > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId,
          goldDelta: reward.amount,
          transactionType: "reward",
          description,
          metadata: { tier, isPremium },
        });
      }
      break;

    case "gems":
      if (reward.amount && reward.amount > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId,
          gemsDelta: reward.amount,
          transactionType: "reward",
          description,
          metadata: { tier, isPremium },
        });
      }
      break;

    case "xp":
      // Award player XP directly (not battle pass XP)
      if (reward.amount && reward.amount > 0) {
        const user = await ctx.db.get(userId);
        if (user) {
          await ctx.db.patch(userId, {
            xp: (user.xp || 0) + reward.amount,
          });
        }
      }
      break;

    case "card":
      if (reward.cardId) {
        // Add card to player's collection
        const existingCard = await ctx.db
          .query("playerCards")
          .withIndex("by_user_card", (q) =>
            q.eq("userId", userId).eq("cardDefinitionId", reward.cardId!)
          )
          .first();

        if (existingCard) {
          await ctx.db.patch(existingCard._id, {
            quantity: existingCard.quantity + 1,
            lastUpdatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("playerCards", {
            userId,
            cardDefinitionId: reward.cardId,
            quantity: 1,
            isFavorite: false,
            acquiredAt: Date.now(),
            lastUpdatedAt: Date.now(),
          });
        }
      }
      break;

    case "pack":
      // For pack rewards, we'll add them to the user's inbox to claim
      // This requires opening the pack which has randomness
      if (reward.packProductId && reward.amount) {
        await ctx.db.insert("userInbox", {
          userId,
          type: "reward",
          title: `Battle Pass Pack Reward`,
          message: `You earned ${reward.amount} pack(s) from Battle Pass Tier ${tier}!`,
          data: {
            rewardType: "packs",
            packProductId: reward.packProductId,
            packCount: reward.amount,
            claimed: false,
          },
          isRead: false,
          createdAt: Date.now(),
        });
      }
      break;

    case "title":
      // Titles could be stored in a user_titles table or as badges
      if (reward.titleName) {
        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "milestone",
          badgeId: `battlepass_title_${reward.titleName.toLowerCase().replace(/\s+/g, "_")}`,
          displayName: reward.titleName,
          description: `Earned from Battle Pass Tier ${tier}`,
          earnedAt: Date.now(),
        });
      }
      break;

    case "avatar":
      // Avatar rewards could be stored in user preferences or a dedicated table
      // For now, we'll track it as a badge
      if (reward.avatarUrl) {
        await ctx.db.insert("playerBadges", {
          userId,
          badgeType: "milestone",
          badgeId: `battlepass_avatar_tier_${tier}`,
          displayName: `Battle Pass Avatar (Tier ${tier})`,
          description: `Exclusive avatar from Battle Pass`,
          iconUrl: reward.avatarUrl,
          earnedAt: Date.now(),
        });
      }
      break;
  }
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current battle pass status for the user
 */
export const getBattlePassStatus = query({
  args: {},
  returns: battlePassStatusValidator,
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      return null;
    }

    // Get user progress
    const progress = await getBattlePassProgress(ctx, userId, battlePass._id);

    // Get linked season info
    const season = await ctx.db.get(battlePass.seasonId);

    return {
      battlePassId: battlePass._id,
      seasonId: battlePass.seasonId,
      name: battlePass.name,
      description: battlePass.description,
      seasonName: season?.name,
      status: battlePass.status,
      totalTiers: battlePass.totalTiers,
      xpPerTier: battlePass.xpPerTier,
      premiumPrice: battlePass.premiumPrice,
      tokenPrice: battlePass.tokenPrice,
      startDate: battlePass.startDate,
      endDate: battlePass.endDate,
      // User progress
      currentXP: progress?.currentXP ?? 0,
      currentTier: progress?.currentTier ?? 0,
      isPremium: progress?.isPremium ?? false,
      claimedFreeTiers: progress?.claimedFreeTiers ?? [],
      claimedPremiumTiers: progress?.claimedPremiumTiers ?? [],
      // Calculate XP to next tier
      xpToNextTier:
        progress && progress.currentTier < battlePass.totalTiers
          ? battlePass.xpPerTier - (progress.currentXP % battlePass.xpPerTier)
          : 0,
      // Days remaining
      daysRemaining: Math.max(
        0,
        Math.ceil((battlePass.endDate - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    };
  },
});

/**
 * Get all tiers for the current battle pass
 */
export const getBattlePassTiers = query({
  args: {
    battlePassId: v.optional(v.id("battlePassSeasons")),
  },
  returns: v.array(battlePassTierValidator),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    // Get battle pass (active one if not specified)
    let battlePassId = args.battlePassId;
    if (!battlePassId) {
      const activeBattlePass = await getActiveBattlePass(ctx);
      if (!activeBattlePass) return [];
      battlePassId = activeBattlePass._id;
    }

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) return [];

    // Get user progress
    const progress = await getBattlePassProgress(ctx, userId, battlePassId);

    // Get all tiers
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePassId))
      .collect();

    // Sort by tier number
    tiers.sort((a, b) => a.tier - b.tier);

    // Enrich with user progress info
    return tiers.map((tier) => ({
      tier: tier.tier,
      freeReward: tier.freeReward,
      premiumReward: tier.premiumReward,
      isMilestone: tier.isMilestone,
      isUnlocked: progress ? progress.currentTier >= tier.tier : false,
      freeRewardClaimed: progress?.claimedFreeTiers.includes(tier.tier) ?? false,
      premiumRewardClaimed: progress?.claimedPremiumTiers.includes(tier.tier) ?? false,
      canClaimFree:
        progress !== null &&
        progress.currentTier >= tier.tier &&
        !progress.claimedFreeTiers.includes(tier.tier) &&
        tier.freeReward !== undefined,
      canClaimPremium:
        progress !== null &&
        progress.isPremium &&
        progress.currentTier >= tier.tier &&
        !progress.claimedPremiumTiers.includes(tier.tier) &&
        tier.premiumReward !== undefined,
    }));
  },
});

/**
 * Get user's battle pass progress
 */
export const getUserBattlePassProgress = query({
  args: {
    battlePassId: v.optional(v.id("battlePassSeasons")),
  },
  returns: battlePassProgressValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);

    let battlePassId = args.battlePassId;
    if (!battlePassId) {
      const activeBattlePass = await getActiveBattlePass(ctx);
      if (!activeBattlePass) return null;
      battlePassId = activeBattlePass._id;
    }

    const progress = await getBattlePassProgress(ctx, userId, battlePassId);
    if (!progress) return null;

    const battlePass = await ctx.db.get(battlePassId);
    if (!battlePass) return null;

    return {
      battlePassId: progress.battlePassId,
      currentXP: progress.currentXP,
      currentTier: progress.currentTier,
      isPremium: progress.isPremium,
      premiumPurchasedAt: progress.premiumPurchasedAt,
      claimedFreeTiers: progress.claimedFreeTiers,
      claimedPremiumTiers: progress.claimedPremiumTiers,
      lastXPGainAt: progress.lastXPGainAt,
      xpPerTier: battlePass.xpPerTier,
      totalTiers: battlePass.totalTiers,
      xpToNextTier:
        progress.currentTier < battlePass.totalTiers
          ? battlePass.xpPerTier - (progress.currentXP % battlePass.xpPerTier)
          : 0,
      tierProgress:
        battlePass.xpPerTier > 0
          ? (progress.currentXP % battlePass.xpPerTier) / battlePass.xpPerTier
          : 0,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Claim a battle pass tier reward
 */
export const claimBattlePassReward = mutation({
  args: {
    tier: v.number(),
    track: v.union(v.literal("free"), v.literal("premium")),
  },
  returns: claimBattlePassRewardValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // Get user progress
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);

    // Validate tier is unlocked
    if (progress.currentTier < args.tier) {
      throw createError(ErrorCode.QUEST_NOT_COMPLETED, {
        reason: `Tier ${args.tier} not unlocked yet`,
      });
    }

    // Get tier definition
    const tierDef = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass_tier", (q) =>
        q.eq("battlePassId", battlePass._id).eq("tier", args.tier)
      )
      .first();

    if (!tierDef) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: `Tier ${args.tier} not found`,
      });
    }

    // Validate track and claim status
    if (args.track === "free") {
      if (!tierDef.freeReward) {
        throw createError(ErrorCode.NOT_FOUND_QUEST, {
          reason: `No free reward for tier ${args.tier}`,
        });
      }
      if (progress.claimedFreeTiers.includes(args.tier)) {
        throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
          reason: "Free reward already claimed",
        });
      }
    } else {
      // Premium track
      if (!progress.isPremium) {
        throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GEMS, {
          reason: "Premium pass required",
        });
      }
      if (!tierDef.premiumReward) {
        throw createError(ErrorCode.NOT_FOUND_QUEST, {
          reason: `No premium reward for tier ${args.tier}`,
        });
      }
      if (progress.claimedPremiumTiers.includes(args.tier)) {
        throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
          reason: "Premium reward already claimed",
        });
      }
    }

    // Grant the reward
    const reward =
      args.track === "free" ? tierDef.freeReward! : tierDef.premiumReward!;
    await grantReward(ctx, userId, reward, args.tier, args.track === "premium");

    // Mark as claimed
    if (args.track === "free") {
      await ctx.db.patch(progress._id, {
        claimedFreeTiers: [...progress.claimedFreeTiers, args.tier],
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(progress._id, {
        claimedPremiumTiers: [...progress.claimedPremiumTiers, args.tier],
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      tier: args.tier,
      track: args.track,
      reward: {
        type: reward.type,
        amount: reward.amount,
      },
    };
  },
});

/**
 * Purchase premium battle pass
 */
export const purchasePremiumPass = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    unlockedRewards: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // Get user progress
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);

    // Check if already premium
    if (progress.isPremium) {
      throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
        reason: "Premium pass already purchased",
      });
    }

    // Charge gems
    await adjustPlayerCurrencyHelper(ctx, {
      userId,
      gemsDelta: -battlePass.premiumPrice,
      transactionType: "purchase",
      description: `Premium Battle Pass: ${battlePass.name}`,
      referenceId: battlePass._id,
    });

    // Upgrade to premium
    await ctx.db.patch(progress._id, {
      isPremium: true,
      premiumPurchasedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Count how many premium rewards are now available to claim
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePass._id))
      .collect();

    const unlockedRewards = tiers.filter(
      (t) =>
        t.tier <= progress.currentTier &&
        t.premiumReward !== undefined &&
        !progress.claimedPremiumTiers.includes(t.tier)
    ).length;

    return {
      success: true,
      message: `Premium pass purchased! ${unlockedRewards} premium rewards ready to claim.`,
      unlockedRewards,
    };
  },
});

// ============================================================================
// TOKEN-BASED PREMIUM PASS PURCHASE
// ============================================================================

/**
 * Initiate token purchase for premium battle pass
 * Step 1: Build unsigned Solana transaction
 *
 * Creates a pending purchase record and returns an unsigned SPL transfer
 * transaction for the frontend to sign via Privy wallet.
 */
export const initiatePremiumPassTokenPurchase = mutation({
  args: {},
  returns: v.object({
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    transactionBase64: v.string(),
    expiresAt: v.number(),
    tokenPrice: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // 1. Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // 2. Verify battle pass has token price configured
    if (!battlePass.tokenPrice || battlePass.tokenPrice <= 0) {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "Token purchase is not available for this battle pass",
      });
    }

    // 3. Get user progress and check if already premium
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);
    if (progress.isPremium) {
      throw createError(ErrorCode.QUEST_ALREADY_CLAIMED, {
        reason: "Premium pass already purchased",
      });
    }

    // 4. Verify user has wallet connected
    const user = await ctx.db.get(userId);
    if (!user?.walletAddress) {
      throw createError(ErrorCode.ECONOMY_WALLET_NOT_CONNECTED);
    }

    // 5. Check for existing pending purchase for this battle pass
    const existingPending = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_battle_pass", (q) => q.eq("battlePassId", battlePass._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("buyerId"), userId),
          q.or(
            q.eq(q.field("status"), "awaiting_signature"),
            q.eq(q.field("status"), "submitted")
          )
        )
      )
      .first();

    if (existingPending) {
      // Check if it's expired
      if (existingPending.expiresAt > Date.now()) {
        throw createError(ErrorCode.ECONOMY_TOKEN_TRANSACTION_PENDING, {
          reason: "A premium pass purchase is already pending",
        });
      }
      // Mark expired purchase as expired
      await ctx.db.patch(existingPending._id, {
        status: "expired",
      });
    }

    // 6. Validate treasury wallet is configured
    if (!TOKEN.TREASURY_WALLET) {
      throw createError(ErrorCode.SYSTEM_INTERNAL_ERROR, {
        reason: "Treasury wallet not configured",
      });
    }

    // 7. Build unsigned SPL transfer transaction to treasury
    const tokenPrice = battlePass.tokenPrice;
    const humanReadablePrice = fromRawAmount(BigInt(tokenPrice));

    const txResult = await buildTreasuryTransferTransaction(
      user.walletAddress,
      humanReadablePrice
    );

    const now = Date.now();
    const expiresAt = now + TOKEN.PURCHASE_EXPIRY_MS;

    // 8. Create pending purchase record
    const pendingPurchaseId = await ctx.db.insert("pendingTokenPurchases", {
      buyerId: userId,
      battlePassId: battlePass._id,
      purchaseType: "battle_pass",
      amount: tokenPrice,
      buyerWallet: user.walletAddress,
      sellerWallet: TOKEN.TREASURY_WALLET,
      status: "awaiting_signature",
      createdAt: now,
      expiresAt,
    });

    return {
      pendingPurchaseId,
      transactionBase64: txResult.transaction,
      expiresAt,
      tokenPrice,
    };
  },
});

/**
 * Submit signed transaction for premium pass purchase
 * Step 2: Record signature and schedule confirmation polling
 */
export const submitPremiumPassTransaction = mutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    signedTransactionBase64: v.string(),
    transactionSignature: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the pending purchase
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Pending purchase not found",
      });
    }

    // Validate buyer
    if (pending.buyerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only submit your own transactions",
      });
    }

    // Validate this is a battle pass purchase
    if (pending.purchaseType !== "battle_pass" || !pending.battlePassId) {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "Invalid purchase type",
      });
    }

    // Validate status
    if (pending.status !== "awaiting_signature") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: `Invalid status: ${pending.status}. Expected: awaiting_signature`,
      });
    }

    // Check if expired
    if (pending.expiresAt < Date.now()) {
      await ctx.db.patch(args.pendingPurchaseId, {
        status: "expired",
      });
      throw createError(ErrorCode.ECONOMY_TOKEN_TRANSACTION_EXPIRED);
    }

    // Update status to submitted and record signature
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "submitted",
      transactionSignature: args.transactionSignature,
    });

    // Schedule polling for transaction confirmation
    await ctx.scheduler.runAfter(
      3000, // Poll after 3 seconds
      internalAny.progression.battlePass.pollPremiumPassConfirmation,
      {
        pendingPurchaseId: args.pendingPurchaseId,
        pollAttempt: 1,
      }
    );

    return { success: true };
  },
});

/**
 * Internal: Poll for premium pass transaction confirmation
 */
export const pollPremiumPassConfirmation = internalAction({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    pollAttempt: v.number(),
  },
  handler: async (ctx, args) => {
    const { pendingPurchaseId, pollAttempt } = args;

    // Get pending purchase
    const pending = await ctx.runQuery(
      internalAny.progression.battlePass.getPendingPremiumPurchase,
      { pendingPurchaseId }
    );

    if (!pending) {
      console.error(
        `[pollPremiumPassConfirmation] Pending purchase not found: ${pendingPurchaseId}`
      );
      return;
    }

    // Check if already in terminal state
    if (pending.status !== "submitted") {
      console.log(
        `[pollPremiumPassConfirmation] Already in terminal state: ${pending.status}`
      );
      return;
    }

    // Check for timeout (2 minutes from submission)
    const now = Date.now();
    const timeoutMs = TOKEN.CONFIRMATION_TIMEOUT_MS;
    if (now - pending.createdAt > timeoutMs) {
      console.log(
        `[pollPremiumPassConfirmation] Timeout exceeded for ${pendingPurchaseId}`
      );
      await ctx.runMutation(
        internalAny.progression.battlePass.failPremiumPassPurchase,
        {
          pendingPurchaseId,
          reason: "Transaction confirmation timeout",
        }
      );
      return;
    }

    // Get transaction signature
    const signature = pending.transactionSignature;
    if (!signature) {
      // If no signature yet, maybe client is still submitting. Retry.
      if (pollAttempt < 20) {
        await ctx.scheduler.runAfter(
          3000,
          internalAny.progression.battlePass.pollPremiumPassConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
      } else {
        await ctx.runMutation(
          internalAny.progression.battlePass.failPremiumPassPurchase,
          {
            pendingPurchaseId,
            reason: "No transaction signature provided",
          }
        );
      }
      return;
    }

    try {
      // Query Solana RPC for transaction status
      const { getConnection } = await import("../lib/solana/connection");
      const connection = getConnection();

      // Use getSignatureStatus for faster polling
      const statusResult = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (!statusResult.value) {
        // Transaction not found yet - still pending
        console.log(
          `[pollPremiumPassConfirmation] Transaction ${signature} not found yet, retrying...`
        );
        await ctx.scheduler.runAfter(
          3000,
          internalAny.progression.battlePass.pollPremiumPassConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
        return;
      }

      const status = statusResult.value;

      // Check if transaction errored
      if (status.err) {
        console.error(
          "[pollPremiumPassConfirmation] Transaction failed:",
          status.err
        );
        await ctx.runMutation(
          internalAny.progression.battlePass.failPremiumPassPurchase,
          {
            pendingPurchaseId,
            reason: `Transaction failed: ${JSON.stringify(status.err)}`,
          }
        );
        return;
      }

      // Check confirmation status
      const confirmationStatus = status.confirmationStatus;
      if (
        confirmationStatus === "confirmed" ||
        confirmationStatus === "finalized"
      ) {
        console.log(
          `[pollPremiumPassConfirmation] Transaction confirmed: ${signature}`
        );
        await ctx.runMutation(
          internalAny.progression.battlePass.completePremiumPassPurchase,
          {
            pendingPurchaseId,
            transactionSignature: signature,
          }
        );
        return;
      }

      // Still processing - schedule another poll
      console.log(
        `[pollPremiumPassConfirmation] Transaction ${signature} status: ${confirmationStatus}, retrying...`
      );
      await ctx.scheduler.runAfter(
        3000,
        internalAny.progression.battlePass.pollPremiumPassConfirmation,
        { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
      );
    } catch (error) {
      console.error(
        "[pollPremiumPassConfirmation] Error polling transaction:",
        error
      );

      // On network error, retry a few times before failing
      if (pollAttempt < 10) {
        await ctx.scheduler.runAfter(
          5000, // Wait longer on error
          internalAny.progression.battlePass.pollPremiumPassConfirmation,
          { pendingPurchaseId, pollAttempt: pollAttempt + 1 }
        );
      } else {
        await ctx.runMutation(
          internalAny.progression.battlePass.failPremiumPassPurchase,
          {
            pendingPurchaseId,
            reason: `RPC error: ${error instanceof Error ? error.message : String(error)}`,
          }
        );
      }
    }
  },
});

/**
 * Internal: Get pending premium purchase for polling action
 */
export const getPendingPremiumPurchase = internalQuery({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.pendingPurchaseId);
  },
});

/**
 * Internal: Complete premium pass purchase after confirmation
 */
export const completePremiumPassPurchase = internalMutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    transactionSignature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      console.error(
        `[completePremiumPassPurchase] Pending purchase not found: ${args.pendingPurchaseId}`
      );
      return { success: false, error: "Pending purchase not found" };
    }

    // Validate this is a battle pass purchase
    if (!pending.battlePassId) {
      console.error(
        `[completePremiumPassPurchase] Not a battle pass purchase: ${args.pendingPurchaseId}`
      );
      return { success: false, error: "Not a battle pass purchase" };
    }

    // Validate status
    if (pending.status !== "submitted") {
      console.error(
        `[completePremiumPassPurchase] Invalid status: ${pending.status}`
      );
      return { success: false, error: `Invalid status: ${pending.status}` };
    }

    const battlePass = await ctx.db.get(pending.battlePassId);
    if (!battlePass) {
      console.error(
        `[completePremiumPassPurchase] Battle pass not found: ${pending.battlePassId}`
      );
      return { success: false, error: "Battle pass not found" };
    }

    // Get user progress
    const progress = await ctx.db
      .query("battlePassProgress")
      .withIndex("by_user_battlepass", (q) =>
        q.eq("userId", pending.buyerId).eq("battlePassId", pending.battlePassId!)
      )
      .first();

    if (!progress) {
      console.error(
        `[completePremiumPassPurchase] Progress not found for user: ${pending.buyerId}`
      );
      return { success: false, error: "Battle pass progress not found" };
    }

    // Check if already premium (shouldn't happen but safety check)
    if (progress.isPremium) {
      console.warn(
        `[completePremiumPassPurchase] User already has premium: ${pending.buyerId}`
      );
      // Still mark as confirmed to avoid retry
      await ctx.db.patch(args.pendingPurchaseId, {
        status: "confirmed",
        transactionSignature:
          args.transactionSignature ?? pending.transactionSignature,
      });
      return { success: true };
    }

    const now = Date.now();
    const signature = args.transactionSignature ?? pending.transactionSignature;

    // 1. Grant premium pass
    await ctx.db.patch(progress._id, {
      isPremium: true,
      premiumPurchasedAt: now,
      updatedAt: now,
    });

    // 2. Mark purchase as confirmed
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "confirmed",
      transactionSignature: signature,
    });

    // 3. Create token transaction record
    await ctx.db.insert("tokenTransactions", {
      userId: pending.buyerId,
      transactionType: "battle_pass_purchase",
      amount: -pending.amount,
      signature,
      status: "confirmed",
      referenceId: pending.battlePassId,
      description: `Premium Battle Pass: ${battlePass.name}`,
      createdAt: now,
      confirmedAt: now,
    });

    // 4. Schedule balance refresh
    await ctx.scheduler.runAfter(
      0,
      internalAny.economy.tokenBalance.refreshTokenBalance,
      {
        userId: pending.buyerId,
      }
    );

    console.log(
      `[completePremiumPassPurchase] Successfully completed purchase ${args.pendingPurchaseId}`
    );
    return { success: true };
  },
});

/**
 * Internal: Fail premium pass purchase
 */
export const failPremiumPassPurchase = internalMutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      console.error(
        `[failPremiumPassPurchase] Pending purchase not found: ${args.pendingPurchaseId}`
      );
      return { success: false };
    }

    // Only fail if not already in terminal state
    if (
      pending.status !== "submitted" &&
      pending.status !== "awaiting_signature"
    ) {
      console.warn(
        `[failPremiumPassPurchase] Already in terminal state: ${pending.status}`
      );
      return { success: false };
    }

    await ctx.db.patch(args.pendingPurchaseId, {
      status: "failed",
    });

    console.log(
      `[failPremiumPassPurchase] Failed purchase ${args.pendingPurchaseId}: ${args.reason}`
    );
    return { success: true };
  },
});

/**
 * Cancel pending premium pass purchase
 *
 * User-facing mutation to cancel a pending purchase.
 * Only the buyer can cancel, and only if status is "awaiting_signature".
 */
export const cancelPremiumPassPurchase = mutation({
  args: {
    pendingPurchaseId: v.id("pendingTokenPurchases"),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get the pending purchase
    const pending = await ctx.db.get(args.pendingPurchaseId);
    if (!pending) {
      throw createError(ErrorCode.NOT_FOUND, {
        reason: "Pending purchase not found",
      });
    }

    // Validate buyer
    if (pending.buyerId !== userId) {
      throw createError(ErrorCode.AUTHZ_RESOURCE_FORBIDDEN, {
        reason: "You can only cancel your own purchases",
      });
    }

    // Validate this is a battle pass purchase
    if (pending.purchaseType !== "battle_pass") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: "This is not a battle pass purchase",
      });
    }

    // Validate status - can only cancel if awaiting signature
    if (pending.status !== "awaiting_signature") {
      throw createError(ErrorCode.ECONOMY_TOKEN_PURCHASE_INVALID, {
        reason: `Cannot cancel purchase with status: ${pending.status}`,
      });
    }

    // Update status to expired (cancelled)
    await ctx.db.patch(args.pendingPurchaseId, {
      status: "expired",
    });

    return { success: true };
  },
});

/**
 * Get pending premium pass purchases for the current user
 *
 * Returns all pending battle pass token purchases for the authenticated user,
 * useful for showing transaction status in the UI.
 */
export const getUserPendingPremiumPurchases = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const pending = await ctx.db
      .query("pendingTokenPurchases")
      .withIndex("by_buyer", (q) => q.eq("buyerId", userId))
      .filter((q) => q.eq(q.field("purchaseType"), "battle_pass"))
      .order("desc")
      .take(10);

    // Batch fetch battle passes
    const battlePassIds = [
      ...new Set(pending.filter((p) => p.battlePassId).map((p) => p.battlePassId!)),
    ];
    const battlePassPromises = battlePassIds.map((id) => ctx.db.get(id));
    const battlePasses = await Promise.all(battlePassPromises);
    const battlePassMap = new Map(
      battlePasses
        .filter((bp): bp is NonNullable<typeof bp> => bp !== null)
        .map((bp) => [bp._id, bp])
    );

    return pending.map((p) => {
      const battlePass = p.battlePassId ? battlePassMap.get(p.battlePassId) : null;
      return {
        _id: p._id,
        battlePassId: p.battlePassId,
        battlePassName: battlePass?.name ?? "Unknown",
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        expiresAt: p.expiresAt,
        transactionSignature: p.transactionSignature,
      };
    });
  },
});

/**
 * Claim all available rewards (bulk claim)
 */
export const claimAllAvailableRewards = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    claimedFree: v.number(),
    claimedPremium: v.number(),
  }),
  handler: async (ctx) => {
    const { userId } = await requireAuthMutation(ctx);

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      throw createError(ErrorCode.NOT_FOUND_QUEST, {
        reason: "No active battle pass",
      });
    }

    // Get user progress
    const progress = await getOrCreateBattlePassProgress(ctx, userId, battlePass._id);

    // Get all tiers
    const tiers = await ctx.db
      .query("battlePassTiers")
      .withIndex("by_battlepass", (q) => q.eq("battlePassId", battlePass._id))
      .collect();

    let claimedFree = 0;
    let claimedPremium = 0;
    const newClaimedFreeTiers = [...progress.claimedFreeTiers];
    const newClaimedPremiumTiers = [...progress.claimedPremiumTiers];

    for (const tier of tiers) {
      if (tier.tier > progress.currentTier) continue;

      // Claim free reward if available
      if (
        tier.freeReward &&
        !progress.claimedFreeTiers.includes(tier.tier)
      ) {
        await grantReward(ctx, userId, tier.freeReward, tier.tier, false);
        newClaimedFreeTiers.push(tier.tier);
        claimedFree++;
      }

      // Claim premium reward if available and user is premium
      if (
        progress.isPremium &&
        tier.premiumReward &&
        !progress.claimedPremiumTiers.includes(tier.tier)
      ) {
        await grantReward(ctx, userId, tier.premiumReward, tier.tier, true);
        newClaimedPremiumTiers.push(tier.tier);
        claimedPremium++;
      }
    }

    // Update claimed tiers
    await ctx.db.patch(progress._id, {
      claimedFreeTiers: newClaimedFreeTiers,
      claimedPremiumTiers: newClaimedPremiumTiers,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      claimedFree,
      claimedPremium,
    };
  },
});

// ============================================================================
// Internal Mutations (called from XP system)
// ============================================================================

/**
 * Add battle pass XP to a user
 * Called internally when XP is earned from games, quests, etc.
 */
export const addBattlePassXP = internalMutation({
  args: {
    userId: v.id("users"),
    xpAmount: v.number(),
    source: v.string(), // "game_win", "quest_complete", "daily_bonus", etc.
  },
  handler: async (ctx, args) => {
    if (args.xpAmount <= 0) return { tiersGained: 0, newTier: 0 };

    // Get active battle pass
    const battlePass = await getActiveBattlePass(ctx);
    if (!battlePass) {
      return { tiersGained: 0, newTier: 0 };
    }

    // Get or create user progress
    const progress = await getOrCreateBattlePassProgress(
      ctx,
      args.userId,
      battlePass._id
    );

    const oldTier = progress.currentTier;
    const newXP = progress.currentXP + args.xpAmount;
    const newTier = calculateTierFromXP(
      newXP,
      battlePass.xpPerTier,
      battlePass.totalTiers
    );

    // Update progress
    await ctx.db.patch(progress._id, {
      currentXP: newXP,
      currentTier: newTier,
      lastXPGainAt: Date.now(),
      updatedAt: Date.now(),
    });

    const tiersGained = newTier - oldTier;

    // Create notification if tiers were gained
    if (tiersGained > 0) {
      await ctx.db.insert("playerNotifications", {
        userId: args.userId,
        type: "level_up",
        title: "Battle Pass Level Up!",
        message:
          tiersGained === 1
            ? `You reached Tier ${newTier}!`
            : `You gained ${tiersGained} tiers! Now at Tier ${newTier}.`,
        data: {
          type: "battle_pass_tier_up",
          oldTier,
          newTier,
          tiersGained,
        },
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return { tiersGained, newTier };
  },
});

/**
 * Get current battle pass for internal use
 */
export const getCurrentBattlePass = query({
  args: {},
  handler: async (ctx) => {
    return await getActiveBattlePass(ctx);
  },
});
