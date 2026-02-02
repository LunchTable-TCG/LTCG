import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

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
  },
  returns: v.id("gameLobbies"),
  handler: async (ctx, args) => {
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

    // Get host's deck info for lobby metadata
    const hostUser = await ctx.db.get(user.userId);
    const hostDeck = hostUser?.activeDeckId ? await ctx.db.get(hostUser.activeDeckId) : null;

    // Calculate host rank
    const hostRankedElo = hostUser?.rankedElo ?? 1000;
    const hostRank = calculateRankFromElo(hostRankedElo);

    // Calculate opponent rank
    const opponentRankedElo = opponent?.rankedElo ?? 1000;
    const opponentRank = calculateRankFromElo(opponentRankedElo);

    // Create game lobby as a challenge
    const now = Date.now();
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
    });

    // Send inbox notification to challenged player
    await ctx.scheduler.runAfter(0, internal.social.inbox.createInboxMessage, {
      userId: opponent._id,
      type: "challenge" as const,
      title: "Game Challenge!",
      message: `${user.username} has challenged you to a ${args.mode} match!`,
      data: {
        challengerId: user.userId,
        challengerUsername: user.username,
        lobbyId,
        mode: args.mode,
      },
      senderId: user.userId,
      senderUsername: user.username,
      // Challenge expires in 24 hours
      expiresAt: now + 24 * 60 * 60 * 1000,
    });

    return lobbyId;
  },
});

/**
 * Helper function to calculate rank from ELO
 */
function calculateRankFromElo(elo: number): string {
  if (elo < 1000) return "Bronze";
  if (elo < 1400) return "Bronze";
  if (elo < 1600) return "Silver";
  if (elo < 2000) return "Silver";
  if (elo < 2200) return "Gold";
  if (elo < 2600) return "Gold";
  if (elo < 2800) return "Platinum";
  if (elo < 3200) return "Platinum";
  if (elo < 3400) return "Diamond";
  if (elo < 3800) return "Diamond";
  if (elo < 4000) return "Master";
  if (elo < 4400) return "Master";
  return "Legend";
}
