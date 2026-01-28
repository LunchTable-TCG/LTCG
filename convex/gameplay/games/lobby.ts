import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { mutation } from "../../_generated/server";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { ELO_SYSTEM } from "../../lib/constants";
import { getCurrentUser, requireAuthMutation, requireAuthQuery } from "../../lib/convexAuth";
import { ErrorCode, createError } from "../../lib/errorCodes";
import { checkRateLimitWrapper } from "../../lib/rateLimit";
import { validateLobbyCapacity, validateLobbyStatus } from "../../lib/validation";
import { recordGameStartHelper } from "../gameEvents";
import { initializeGameStateHelper } from "./lifecycle";

// ============================================================================
// CONSTANTS
// ============================================================================

const RATING_DEFAULTS = {
  DEFAULT_RATING: 1000,
  RANKED_RATING_WINDOW: 200,
} as const;

const RANK_THRESHOLDS = {
  Bronze: 0,
  Silver: 1200,
  Gold: 1400,
  Platinum: 1600,
  Diamond: 1800,
  Master: 2000,
  Legend: 2200,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate rank tier from rating
 */
function getRank(rating: number): string {
  if (rating >= RANK_THRESHOLDS.Legend) return "Legend";
  if (rating >= RANK_THRESHOLDS.Master) return "Master";
  if (rating >= RANK_THRESHOLDS.Diamond) return "Diamond";
  if (rating >= RANK_THRESHOLDS.Platinum) return "Platinum";
  if (rating >= RANK_THRESHOLDS.Gold) return "Gold";
  if (rating >= RANK_THRESHOLDS.Silver) return "Silver";
  return "Bronze";
}

/**
 * Generate random 6-character alphanumeric join code
 * Excludes ambiguous characters: O, 0, I, 1, l
 * Uses crypto.randomUUID() which is acceptable for non-game-state randomness
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // Use UUID to generate deterministic-enough join code
  const uuid = crypto.randomUUID().replace(/-/g, "");
  let code = "";
  for (let i = 0; i < 6; i++) {
    const charIndex =
      Number.parseInt(uuid.charAt(i * 2) + uuid.charAt(i * 2 + 1), 16) % chars.length;
    code += chars.charAt(charIndex);
  }
  return code;
}

/**
 * Update user presence status
 */
async function updatePresenceInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  username: string,
  status: "online" | "in_game" | "idle"
): Promise<void> {
  const existing = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      status,
      lastActiveAt: Date.now(),
    });
  } else {
    await ctx.db.insert("userPresence", {
      userId,
      username,
      status,
      lastActiveAt: Date.now(),
    });
  }
}

/**
 * Validate user can create or join a game
 * Checks: session, deck validity, not already in game, no existing lobby
 */
async function validateUserCanCreateGame(ctx: MutationCtx): Promise<{
  userId: Id<"users">;
  username: string;
  deckId: Id<"userDecks">;
  deckArchetype: string;
}> {
  // Validate session
  const { userId, username } = await requireAuthMutation(ctx);

  // Get user and active deck
  const user = await ctx.db.get(userId);
  if (!user) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "User not found",
    });
  }

  if (!user.activeDeckId) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "No active deck selected. Please select a deck in your Binder",
    });
  }

  // Get active deck (all users have a deck after signup)
  const deck = await ctx.db.get(user.activeDeckId);
  if (!deck || deck.userId !== userId || !deck.isActive) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Your deck is no longer valid. Please select a new deck in your Binder",
    });
  }

  // Validate deck has minimum cards
  const deckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", user.activeDeckId!))
    .collect();

  const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
  if (totalCards < 30) {
    throw createError(ErrorCode.VALIDATION_INVALID_DECK, {
      reason: `Your deck must have at least 30 cards. Currently has ${totalCards}`,
      totalCards,
      requiredCards: 30,
    });
  }

  // Check user doesn't already have an active lobby (check this FIRST for better error messages)
  const existingLobby = await ctx.db
    .query("gameLobbies")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
    .first();

  if (existingLobby) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "You already have an active lobby",
    });
  }

  // Check user presence status
  const presence = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (presence?.status === "in_game") {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "You are already in a game",
    });
  }

  // Get deck archetype
  const deckArchetype = deck.deckArchetype || "neutral";

  return {
    userId,
    username,
    deckId: user.activeDeckId!,
    deckArchetype,
  };
}

// ============================================================================
// LOBBY MUTATIONS
// ============================================================================

/**
 * Create a new game lobby
 * Creates a waiting lobby for other players to join
 *
 * @param mode - Game mode: "casual" or "ranked"
 * @param isPrivate - Optional flag for private lobby with join code
 * @returns Lobby ID and join code (if private)
 */
export const createLobby = mutation({
  args: {
    mode: v.union(v.literal("casual"), v.literal("ranked")),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isPrivate = args.isPrivate || false;

    // Validate user can create game
    const { userId, username, deckArchetype } = await validateUserCanCreateGame(ctx);

    // Generate join code for private matches
    const joinCode = isPrivate ? generateJoinCode() : undefined;

    // Calculate rank
    const rating = RATING_DEFAULTS.DEFAULT_RATING;
    const rank = getRank(rating);

    // Set max rating diff for ranked matches
    const maxRatingDiff = args.mode === "ranked" ? RATING_DEFAULTS.RANKED_RATING_WINDOW : undefined;

    // Create lobby
    const lobbyId = await ctx.db.insert("gameLobbies", {
      hostId: userId,
      hostUsername: username,
      hostRank: rank,
      hostRating: rating,
      deckArchetype,
      mode: args.mode,
      status: "waiting",
      isPrivate,
      joinCode,
      maxRatingDiff,
      createdAt: Date.now(),
    });

    // Update user presence to in_game
    await updatePresenceInternal(ctx, userId, username, "in_game");

    return {
      lobbyId,
      joinCode,
    };
  },
});

/**
 * Join an existing lobby
 * Matches player with host and starts the game
 *
 * @param lobbyId - The lobby ID to join
 * @param joinCode - Optional join code for private lobbies
 * @returns Game ID, lobby ID, and opponent username
 */
export const joinLobby = mutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate session first (light check)
    const { userId } = await requireAuthMutation(ctx);

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Lobby not found or no longer available",
      });
    }

    // Validate lobby status is waiting
    validateLobbyStatus(lobby, ["waiting"]);

    // Validate lobby has capacity (max 2 players)
    validateLobbyCapacity(lobby, 2);

    // Check user is not the host (do this BEFORE full validation for better error messages)
    if (lobby.hostId === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You cannot join your own lobby",
      });
    }

    // Now do full validation
    const { username, deckArchetype } = await validateUserCanCreateGame(ctx);

    // Validate join code for private lobbies
    if (lobby.isPrivate) {
      if (!args.joinCode) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Join code required for private match",
        });
      }
      if (args.joinCode.toUpperCase() !== lobby.joinCode) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Invalid join code for private match",
        });
      }
    }

    // Validate rating for ranked matches
    if (lobby.mode === "ranked" && lobby.maxRatingDiff) {
      const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
      const ratingDiff = Math.abs(lobby.hostRating - opponentRating);
      if (ratingDiff > lobby.maxRatingDiff) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Your rating is too far from the host's rating for ranked match",
        });
      }
    }

    // Calculate opponent rank
    const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
    const opponentRank = getRank(opponentRating);

    // Generate game ID
    const gameId = crypto.randomUUID();

    // Deterministically decide who goes first based on game ID
    // This ensures consistent results if the mutation is retried
    const seed = `${gameId}-first-turn`;
    const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const goesFirst = hash % 2 === 0 ? lobby.hostId : userId;
    const now = Date.now();

    // Update lobby with opponent info and start game
    await ctx.db.patch(args.lobbyId, {
      opponentId: userId,
      opponentUsername: username,
      opponentRank,
      status: "active",
      startedAt: now,
      gameId,
      currentTurnPlayerId: goesFirst,
      turnStartedAt: now,
      lastMoveAt: now,
      turnNumber: 1,
    });

    // Update both players' presence to in_game
    await updatePresenceInternal(ctx, userId, username, "in_game");
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "in_game");

    // Initialize game state for reconnection
    await initializeGameStateHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId,
      hostId: lobby.hostId,
      opponentId: userId,
      currentTurnPlayerId: goesFirst,
    });

    // Record game start event for spectators
    await recordGameStartHelper(ctx, {
      lobbyId: args.lobbyId,
      gameId,
      hostId: lobby.hostId,
      hostUsername: lobby.hostUsername,
      opponentId: userId,
      opponentUsername: username,
    });

    return {
      gameId,
      lobbyId: args.lobbyId,
      opponentUsername: lobby.hostUsername,
    };
  },
});

/**
 * Join a lobby using a join code
 * Finds and joins a private lobby by its 6-character join code
 *
 * @param joinCode - The 6-character alphanumeric join code
 * @returns Game ID, lobby ID, and opponent username
 */
export const joinLobbyByCode = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize join code
    const normalizedCode = args.joinCode.trim().toUpperCase();

    // Find lobby by join code
    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_join_code", (q) => q.eq("joinCode", normalizedCode))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Invalid or expired join code",
      });
    }

    // Use joinLobby logic
    // Re-validate and join
    const { userId, username, deckArchetype } = await validateUserCanCreateGame(ctx);

    // Check user is not the host
    if (lobby.hostId === userId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You cannot join your own lobby",
      });
    }

    // Check lobby doesn't already have opponent
    if (lobby.opponentId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This lobby is no longer available",
      });
    }

    // Calculate opponent rank
    const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
    const opponentRank = getRank(opponentRating);

    // Generate game ID
    const gameId = crypto.randomUUID();

    // Deterministically decide who goes first based on game ID
    // This ensures consistent results if the mutation is retried
    const seed = `${gameId}-first-turn`;
    const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const goesFirst = hash % 2 === 0 ? lobby.hostId : userId;
    const now = Date.now();

    // Update lobby
    await ctx.db.patch(lobby._id, {
      opponentId: userId,
      opponentUsername: username,
      opponentRank,
      status: "active",
      startedAt: now,
      gameId,
      currentTurnPlayerId: goesFirst,
      turnStartedAt: now,
      lastMoveAt: now,
      turnNumber: 1,
    });

    // Update both players' presence
    await updatePresenceInternal(ctx, userId, username, "in_game");
    await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "in_game");

    // Initialize game state for reconnection
    await initializeGameStateHelper(ctx, {
      lobbyId: lobby._id,
      gameId,
      hostId: lobby.hostId,
      opponentId: userId,
      currentTurnPlayerId: goesFirst,
    });

    // Record game start event for spectators
    await recordGameStartHelper(ctx, {
      lobbyId: lobby._id,
      gameId,
      hostId: lobby.hostId,
      hostUsername: lobby.hostUsername,
      opponentId: userId,
      opponentUsername: username,
    });

    return {
      gameId,
      lobbyId: lobby._id,
      opponentUsername: lobby.hostUsername,
    };
  },
});

/**
 * Cancel user's waiting lobby
 * Cancels the user's lobby before anyone joins
 *
 * @returns Success status
 */
export const cancelLobby = mutation({
  args: {},
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit lobby actions to prevent spam
    // Max 20 actions per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "LOBBY_ACTION", userId);

    // Find user's waiting lobby
    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No active lobby to cancel",
      });
    }

    // Update lobby status
    await ctx.db.patch(lobby._id, {
      status: "cancelled",
    });

    // Update host presence to online
    await updatePresenceInternal(ctx, userId, username, "online");

    return { success: true };
  },
});

/**
 * Leave a lobby (as host or opponent)
 * Cannot be used once game is active
 *
 * @returns Success status
 */
export const leaveLobby = mutation({
  args: {},
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit lobby actions to prevent spam
    // Max 20 actions per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "LOBBY_ACTION", userId);

    // Find user's lobby (as host or opponent)
    // Query by hostId and opponentId separately using indexes for efficiency
    const [hostLobby, opponentLobbies] = await Promise.all([
      ctx.db
        .query("gameLobbies")
        .withIndex("by_host", (q) => q.eq("hostId", userId))
        .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
        .first(),
      ctx.db
        .query("gameLobbies")
        .filter((q) =>
          q.and(
            q.eq(q.field("opponentId"), userId),
            q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active"))
          )
        )
        .collect(),
    ]);

    const lobby = hostLobby || opponentLobbies[0];
    if (!lobby) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "No active lobby to leave",
      });
    }

    // Cannot leave active game
    if (lobby.status === "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot leave an active game (game in progress)",
      });
    }

    // If user is host
    if (lobby.hostId === userId) {
      await ctx.db.patch(lobby._id, {
        status: "cancelled",
      });
    } else if (lobby.opponentId === userId) {
      // If user is opponent, remove them from lobby
      await ctx.db.patch(lobby._id, {
        opponentId: undefined,
        opponentUsername: undefined,
        opponentRank: undefined,
      });
    }

    // Update user presence to online
    await updatePresenceInternal(ctx, userId, username, "online");

    return { success: true };
  },
});
