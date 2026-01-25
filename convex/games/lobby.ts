import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import { validateSession } from "../lib/validators";
import { ELO_SYSTEM } from "../lib/constants";

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
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
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
 * Checks: session, active deck, deck validity, not already in game, no existing lobby
 */
async function validateUserCanCreateGame(
  ctx: QueryCtx | MutationCtx,
  token: string
): Promise<{
  userId: Id<"users">;
  username: string;
  deckId: Id<"userDecks">;
  deckArchetype: string;
}> {
  // Validate session
  const { userId, username } = await validateSession(ctx, token);

  // Check user has active deck set
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.activeDeckId) {
    throw new Error("You must select an active deck in your Binder before creating a game");
  }

  // Get active deck
  const deck = await ctx.db.get(user.activeDeckId);
  if (!deck || deck.userId !== userId || !deck.isActive) {
    throw new Error("Your active deck is no longer valid. Please select a new deck in your Binder");
  }

  // Validate deck has minimum cards
  const deckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", user.activeDeckId!))
    .collect();

  const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
  if (totalCards < 30) {
    throw new Error(`Your active deck must have at least 30 cards. Currently has ${totalCards}.`);
  }

  // Check user doesn't already have an active lobby (check this FIRST for better error messages)
  const existingLobby = await ctx.db
    .query("gameLobbies")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .filter((q) =>
      q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active"))
    )
    .first();

  if (existingLobby) {
    throw new Error("You already have an active lobby");
  }

  // Check user presence status
  const presence = await ctx.db
    .query("userPresence")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (presence?.status === "in_game") {
    throw new Error("You are already in a game");
  }

  // Get deck archetype
  const deckArchetype = deck.deckArchetype || "neutral";

  return {
    userId,
    username,
    deckId: user.activeDeckId,
    deckArchetype,
  };
}

// ============================================================================
// LOBBY MUTATIONS
// ============================================================================

/**
 * Create a new game lobby
 */
export const createLobby = mutation({
  args: {
    token: v.string(),
    mode: v.union(v.literal("casual"), v.literal("ranked")),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const isPrivate = args.isPrivate || false;

    // Validate user can create game
    const { userId, username, deckArchetype } = await validateUserCanCreateGame(ctx, args.token);

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
 */
export const joinLobby = mutation({
  args: {
    token: v.string(),
    lobbyId: v.id("gameLobbies"),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate session first (light check)
    const { userId } = await validateSession(ctx, args.token);

    // Get lobby
    const lobby = await ctx.db.get(args.lobbyId);
    if (!lobby) {
      throw new Error("Lobby not found or no longer available");
    }

    // Check lobby is waiting
    if (lobby.status !== "waiting") {
      throw new Error("Lobby is not accepting players");
    }

    // Check user is not the host (do this BEFORE full validation for better error messages)
    if (lobby.hostId === userId) {
      throw new Error("You cannot join your own lobby");
    }

    // Now do full validation
    const { username, deckArchetype } = await validateUserCanCreateGame(ctx, args.token);

    // Check lobby doesn't already have opponent (race condition)
    if (lobby.opponentId) {
      throw new Error("This lobby is no longer available");
    }

    // Validate join code for private lobbies
    if (lobby.isPrivate) {
      if (!args.joinCode) {
        throw new Error("Join code required for private match");
      }
      if (args.joinCode.toUpperCase() !== lobby.joinCode) {
        throw new Error("Invalid join code for private match");
      }
    }

    // Validate rating for ranked matches
    if (lobby.mode === "ranked" && lobby.maxRatingDiff) {
      const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
      const ratingDiff = Math.abs(lobby.hostRating - opponentRating);
      if (ratingDiff > lobby.maxRatingDiff) {
        throw new Error("Your rating is too far from the host's rating for ranked match");
      }
    }

    // Calculate opponent rank
    const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
    const opponentRank = getRank(opponentRating);

    // Generate game ID
    const gameId = crypto.randomUUID();

    // Randomly decide who goes first
    const goesFirst = Math.random() < 0.5 ? lobby.hostId : userId;
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
    await ctx.runMutation(internal.games.initializeGameState, {
      lobbyId: args.lobbyId,
      gameId,
      hostId: lobby.hostId,
      opponentId: userId,
      currentTurnPlayerId: goesFirst,
    });

    // Record game start event for spectators
    await ctx.runMutation(api.gameEvents.recordGameStart, {
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
 */
export const joinLobbyByCode = mutation({
  args: {
    token: v.string(),
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
      throw new Error("Invalid or expired join code");
    }

    // Use joinLobby logic
    // Re-validate and join
    const { userId, username, deckArchetype } = await validateUserCanCreateGame(ctx, args.token);

    // Check user is not the host
    if (lobby.hostId === userId) {
      throw new Error("You cannot join your own lobby");
    }

    // Check lobby doesn't already have opponent
    if (lobby.opponentId) {
      throw new Error("This lobby is no longer available");
    }

    // Calculate opponent rank
    const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
    const opponentRank = getRank(opponentRating);

    // Generate game ID
    const gameId = crypto.randomUUID();

    // Randomly decide who goes first
    const goesFirst = Math.random() < 0.5 ? lobby.hostId : userId;
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
    await ctx.runMutation(internal.games.initializeGameState, {
      lobbyId: lobby._id,
      gameId,
      hostId: lobby.hostId,
      opponentId: userId,
      currentTurnPlayerId: goesFirst,
    });

    // Record game start event for spectators
    await ctx.runMutation(api.gameEvents.recordGameStart, {
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
 */
export const cancelLobby = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    // Find user's waiting lobby
    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", userId))
      .filter((q) => q.eq(q.field("status"), "waiting"))
      .first();

    if (!lobby) {
      throw new Error("No active lobby to cancel");
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
 */
export const leaveLobby = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { userId, username } = await validateSession(ctx, args.token);

    // Find user's lobby (as host or opponent)
    const lobbies = await ctx.db
      .query("gameLobbies")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("hostId"), userId),
            q.eq(q.field("opponentId"), userId)
          ),
          q.or(
            q.eq(q.field("status"), "waiting"),
            q.eq(q.field("status"), "active")
          )
        )
      )
      .collect();

    const lobby = lobbies[0];
    if (!lobby) {
      throw new Error("No active lobby to leave");
    }

    // Cannot leave active game
    if (lobby.status === "active") {
      throw new Error("Cannot leave an active game (game in progress)");
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
