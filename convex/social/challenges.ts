import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
import { adjustPlayerCurrencyHelper } from "../economy/economy";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;
import { mutation } from "../functions";
import { ELO_SYSTEM } from "../lib/constants";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { getRankFromRating } from "../lib/helpers";
import { getNotificationSetting } from "../lib/preferenceHelpers";
import { type WagerCurrency, formatWagerAmount, isValidWagerTier } from "../lib/wagerTiers";

/**
 * Challenge System
 *
 * Send game challenges to other players.
 * Creates a game lobby that the challenged player can join.
 */

/**
 * Send a challenge to another player
 *
 * Creates a game lobby with the challenged player.
 * The challenged player will see the lobby invitation.
 *
 * @param opponentUsername - Username of player to challenge
 * @param mode - Game mode (casual or ranked)
 * @returns Lobby ID for the created challenge
 */
export const sendChallenge = mutation({
  args: {
    opponentUsername: v.string(),
    mode: v.union(v.literal("casual"), v.literal("ranked")),
    wagerAmount: v.optional(v.number()), // Gold to wager (0 or undefined = no wager)
    cryptoWagerCurrency: v.optional(v.union(v.literal("sol"), v.literal("usdc"))),
    cryptoWagerTier: v.optional(v.number()), // Must be a valid tier for the currency
  },
  returns: v.id("gameLobbies"),
  handler: async (ctx, args) => {
    const wagerAmount = args.wagerAmount ?? 0;
    const isCryptoWager = !!args.cryptoWagerCurrency && !!args.cryptoWagerTier;

    // Validate authentication
    const user = await requireAuthMutation(ctx);

    // Find opponent user
    const opponent = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", args.opponentUsername))
      .first();

    if (!opponent) {
      throw createError(ErrorCode.NOT_FOUND_USER, {
        username: args.opponentUsername,
      });
    }

    // Prevent self-challenge
    if (opponent._id === user.userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot challenge yourself",
      });
    }

    // Check if opponent is already in a game
    const existingLobby = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("hostId"), opponent._id), q.eq(q.field("opponentId"), opponent._id)),
          q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active"))
        )
      )
      .first();

    if (existingLobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `${args.opponentUsername} is already in a game`,
      });
    }

    // Validate crypto wager tier
    if (isCryptoWager) {
      const currency = args.cryptoWagerCurrency as WagerCurrency;
      const tier = args.cryptoWagerTier as number;
      if (!isValidWagerTier(tier, currency)) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: `Invalid wager tier: ${tier} ${currency.toUpperCase()}`,
        });
      }
      // Require wallet connected for crypto wagers
      const hostUser = await ctx.db.get(user.userId);
      if (!hostUser?.walletAddress) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Connect a Solana wallet to create crypto wager challenges",
        });
      }
    }

    // Validate gold wager amount
    if (!isCryptoWager && wagerAmount < 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Wager amount cannot be negative",
      });
    }

    // If there's a gold wager (NOT crypto), debit the challenger's gold
    if (!isCryptoWager && wagerAmount > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId: user.userId,
        goldDelta: -wagerAmount,
        transactionType: "wager",
        description: `Wager for challenge against ${args.opponentUsername}`,
        metadata: {
          opponentUsername: args.opponentUsername,
          mode: args.mode,
        },
      });
    }

    // Get host's deck info for lobby metadata
    const hostUser = await ctx.db.get(user.userId);
    const hostDeck = hostUser?.activeDeckId ? await ctx.db.get(hostUser.activeDeckId) : null;

    // Calculate host rank
    const hostRankedElo = hostUser?.rankedElo ?? ELO_SYSTEM.DEFAULT_RATING;
    const hostRank = getRankFromRating(hostRankedElo);

    // Calculate opponent rank
    const opponentRankedElo = opponent?.rankedElo ?? ELO_SYSTEM.DEFAULT_RATING;
    const opponentRank = getRankFromRating(opponentRankedElo);

    // Create game lobby as a challenge
    const now = Date.now();
    const hostUserData = hostUser || (await ctx.db.get(user.userId));
    const lobbyId = await ctx.db.insert("gameLobbies", {
      hostId: user.userId,
      hostUsername: user.username,
      hostRank,
      hostRating: hostRankedElo,
      deckArchetype: hostDeck?.deckArchetype || "fire",
      opponentId: opponent._id, // Pre-assign opponent (indicates this is a challenge)
      opponentUsername: opponent.username || args.opponentUsername,
      opponentRank,
      status: "waiting",
      mode: args.mode,
      isPrivate: true, // Challenge lobbies are private
      allowSpectators: true,
      maxSpectators: 10,
      spectatorCount: 0,
      createdAt: now,
      // Gold wager system (unchanged)
      wagerAmount: !isCryptoWager && wagerAmount > 0 ? wagerAmount : undefined,
      wagerPaid: false,
      // Crypto wager system (SOL/USDC)
      ...(isCryptoWager
        ? {
            cryptoWagerCurrency: args.cryptoWagerCurrency,
            cryptoWagerTier: args.cryptoWagerTier,
            cryptoHostWallet: hostUserData?.walletAddress,
            cryptoHostDeposited: false,
            cryptoOpponentDeposited: false,
            cryptoSettled: false,
          }
        : {}),
    });

    // Build notification text
    const senderName = user.username || "Player";
    let wagerText = "!";
    let notifTitle = "Game Challenge!";
    if (isCryptoWager) {
      const formatted = formatWagerAmount(
        args.cryptoWagerTier as number,
        args.cryptoWagerCurrency as WagerCurrency
      );
      wagerText = ` with a ${formatted} wager!`;
      notifTitle = "Crypto Wager Challenge!";
    } else if (wagerAmount > 0) {
      wagerText = ` with a ${wagerAmount.toLocaleString()} gold wager!`;
      notifTitle = "Wager Challenge!";
    }

    // Send inbox notification to challenged player
    const wantsMatchNotifs = await getNotificationSetting(ctx, opponent._id, "matchInvites");
    if (wantsMatchNotifs) {
      await ctx.scheduler.runAfter(0, internalAny.social.inbox.createInboxMessage, {
        userId: opponent._id,
        type: "challenge" as const,
        title: notifTitle,
        message: `${senderName} has challenged you to a ${args.mode} match${wagerText}`,
        data: {
          challengerId: user.userId,
          challengerUsername: senderName,
          lobbyId,
          mode: args.mode,
          wagerAmount: !isCryptoWager && wagerAmount > 0 ? wagerAmount : undefined,
          cryptoWagerCurrency: isCryptoWager ? args.cryptoWagerCurrency : undefined,
          cryptoWagerTier: isCryptoWager ? args.cryptoWagerTier : undefined,
        },
        senderId: user.userId,
        senderUsername: senderName,
        // Challenge expires in 60 seconds (matches lobby expiration)
        expiresAt: now + 60 * 1000,
      });
    }

    return lobbyId;
  },
});
