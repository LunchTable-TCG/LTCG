import { v } from "convex/values";
import type { Id } from "../../_generated/dataModel";
import { internalMutation, mutation } from "../../_generated/server";
import type { MutationCtx } from "../../_generated/server";
import { requireAuthMutation } from "../../lib/convexAuth";
import { createTraceContext, logMatchmaking, logger, performance } from "../../lib/debug";
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
  return validateUserCanCreateGameInternal(ctx, userId, username);
}

/**
 * Internal version of validateUserCanCreateGame that accepts userId directly
 * Used by API key authenticated endpoints
 */
async function validateUserCanCreateGameInternal(
  ctx: MutationCtx,
  userId: Id<"users">,
  username: string
): Promise<{
  userId: Id<"users">;
  username: string;
  deckId: Id<"userDecks">;
  deckArchetype: string;
}> {
  // Get user and active deck
  const user = await ctx.db.get(userId);
  if (!user) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "User not found",
    });
  }

  const activeDeckId = user.activeDeckId;
  if (!activeDeckId) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "No active deck selected. Please select a deck in your Binder",
    });
  }

  // Get active deck (all users have a deck after signup)
  const deck = await ctx.db.get(activeDeckId);
  if (!deck || deck.userId !== userId || !deck.isActive) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Your deck is no longer valid. Please select a new deck in your Binder",
    });
  }

  // Validate deck has required card count (30-60 cards)
  const deckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", activeDeckId))
    .collect();

  const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0);
  const MIN_DECK_SIZE = 30;
  const MAX_DECK_SIZE = 60;

  if (totalCards < MIN_DECK_SIZE) {
    throw createError(ErrorCode.VALIDATION_INVALID_DECK, {
      reason: `Your deck must have at least ${MIN_DECK_SIZE} cards. Currently has ${totalCards}`,
      totalCards,
      requiredCards: MIN_DECK_SIZE,
    });
  }
  if (totalCards > MAX_DECK_SIZE) {
    throw createError(ErrorCode.VALIDATION_INVALID_DECK, {
      reason: `Your deck cannot exceed ${MAX_DECK_SIZE} cards. Currently has ${totalCards}`,
      totalCards,
      maxCards: MAX_DECK_SIZE,
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

  return {
    userId,
    username,
    deckId: activeDeckId,
    deckArchetype: deck.deckArchetype || "unknown",
  };
}

async function assertDeckHasNoAgentsInRanked(ctx: MutationCtx, deckId: Id<"userDecks">) {
  const deckCards = await ctx.db
    .query("deckCards")
    .withIndex("by_deck", (q) => q.eq("deckId", deckId))
    .collect();

  const cardDefs = await Promise.all(deckCards.map((dc) => ctx.db.get(dc.cardDefinitionId)));
  const hasAgent = cardDefs.some((c) => c?.cardType === "agent");

  if (hasAgent) {
    throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
      reason: "Agent cards are not legal in Ranked.",
    });
  }
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
    // Spectator settings
    allowSpectators: v.optional(v.boolean()), // default: true
    maxSpectators: v.optional(v.number()), // default: 100
  },
  handler: async (ctx, args) => {
    const opId = `createLobby_${Date.now()}`;
    performance.start(opId);

    const isPrivate = args.isPrivate || false;

    logger.mutation("createLobby", "pending", { mode: args.mode, isPrivate });

    try {
      // Validate user can create game
      logger.debug("Validating user can create game");
      const { userId, username, deckId, deckArchetype } = await validateUserCanCreateGame(ctx);

      if (args.mode === "ranked") {
        await assertDeckHasNoAgentsInRanked(ctx, deckId);
      }

      const traceCtx = createTraceContext("createLobby", { userId, username, mode: args.mode });
      logMatchmaking("lobby_create_start", userId, traceCtx);

      // Generate join code for private matches
      const joinCode = isPrivate ? generateJoinCode() : undefined;
      if (joinCode) {
        logger.debug("Generated join code for private lobby", { joinCode, ...traceCtx });
      }

      // Calculate rank
      const rating = RATING_DEFAULTS.DEFAULT_RATING;
      const rank = getRank(rating);

      // Set max rating diff for ranked matches
      const maxRatingDiff =
        args.mode === "ranked" ? RATING_DEFAULTS.RANKED_RATING_WINDOW : undefined;

      // Create lobby
      logger.dbOperation("insert", "gameLobbies", traceCtx);
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

        // Spectator settings (defaults: allow spectators, max 100)
        allowSpectators: args.allowSpectators ?? true,
        maxSpectators: args.maxSpectators ?? 100,
        spectatorCount: 0,
      });

      logger.info("Lobby created successfully", { ...traceCtx, lobbyId, rank, rating });

      // Update user presence to in_game
      await updatePresenceInternal(ctx, userId, username, "in_game");
      logger.debug("Updated user presence to in_game", traceCtx);

      logMatchmaking("lobby_create_complete", userId, { ...traceCtx, lobbyId });
      performance.end(opId, { userId, lobbyId });

      return {
        lobbyId,
        joinCode,
      };
    } catch (error) {
      logger.error("Failed to create lobby", error as Error, { mode: args.mode, isPrivate });
      performance.end(opId, { error: true });
      throw error;
    }
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
    const opId = `joinLobby_${Date.now()}`;
    performance.start(opId);

    // Validate session first (light check)
    const { userId } = await requireAuthMutation(ctx);

    logger.mutation("joinLobby", userId, { lobbyId: args.lobbyId, hasJoinCode: !!args.joinCode });

    const traceCtx = createTraceContext("joinLobby", { userId, lobbyId: args.lobbyId });
    logMatchmaking("lobby_join_attempt", userId, traceCtx);

    try {
      // Get lobby
      logger.dbOperation("get", "gameLobbies", traceCtx);
      const lobby = await ctx.db.get(args.lobbyId);
      if (!lobby) {
        logger.warn("Lobby not found", traceCtx);
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Lobby not found or no longer available",
        });
      }

      logger.debug("Found lobby", {
        ...traceCtx,
        hostId: lobby.hostId,
        status: lobby.status,
        mode: lobby.mode,
      });

      // Validate lobby status is waiting
      validateLobbyStatus(lobby, ["waiting"]);

      // Validate lobby has capacity (max 2 players)
      validateLobbyCapacity(lobby, 2);

      // Check user is not the host (do this BEFORE full validation for better error messages)
      if (lobby.hostId === userId) {
        logger.warn("User attempted to join own lobby", traceCtx);
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "You cannot join your own lobby",
        });
      }

      // Now do full validation
      logger.debug("Validating user can join game", traceCtx);
      const { username, deckId } = await validateUserCanCreateGame(ctx);

      if (lobby.mode === "ranked") {
        await assertDeckHasNoAgentsInRanked(ctx, deckId);
      }

      // Validate join code for private lobbies
      if (lobby.isPrivate) {
        logger.debug("Validating join code for private lobby", traceCtx);
        if (!args.joinCode) {
          logger.warn("Join code missing for private lobby", traceCtx);
          throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
            reason: "Join code required for private match",
          });
        }
        if (args.joinCode.toUpperCase() !== lobby.joinCode) {
          logger.warn("Invalid join code provided", traceCtx);
          throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
            reason: "Invalid join code for private match",
          });
        }
        logger.debug("Join code validated successfully", traceCtx);
      }

      // Validate rating for ranked matches
      if (lobby.mode === "ranked" && lobby.maxRatingDiff) {
        const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
        const ratingDiff = Math.abs(lobby.hostRating - opponentRating);
        logger.debug("Validating rating difference", {
          ...traceCtx,
          hostRating: lobby.hostRating,
          opponentRating,
          ratingDiff,
          maxDiff: lobby.maxRatingDiff,
        });
        if (ratingDiff > lobby.maxRatingDiff) {
          logger.warn("Rating difference too large for ranked match", {
            ...traceCtx,
            ratingDiff,
            maxDiff: lobby.maxRatingDiff,
          });
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
      logger.info("Generated game ID", { ...traceCtx, gameId });

      // Deterministically decide who goes first based on game ID
      // This ensures consistent results if the mutation is retried
      const seed = `${gameId}-first-turn`;
      const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const goesFirst = hash % 2 === 0 ? lobby.hostId : userId;
      const now = Date.now();

      logger.info("Determined first player", {
        ...traceCtx,
        gameId,
        goesFirst,
        isHost: goesFirst === lobby.hostId,
      });

      // Update lobby with opponent info and start game
      logger.dbOperation("patch", "gameLobbies", { ...traceCtx, gameId });
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

      logger.info("Lobby updated to active status", { ...traceCtx, gameId });

      // Update both players' presence to in_game
      await updatePresenceInternal(ctx, userId, username, "in_game");
      await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "in_game");
      logger.debug("Updated player presence for both players", traceCtx);

      // Initialize game state for reconnection
      logger.debug("Initializing game state", { ...traceCtx, gameId });
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

      logMatchmaking("lobby_join_success", userId, { ...traceCtx, gameId, hostId: lobby.hostId });
      logger.info("Game started successfully", {
        ...traceCtx,
        gameId,
        hostId: lobby.hostId,
        opponentId: userId,
      });

      performance.end(opId, { userId, lobbyId: args.lobbyId, gameId });

      return {
        gameId,
        lobbyId: args.lobbyId,
        opponentUsername: lobby.hostUsername,
      };
    } catch (error) {
      logger.error("Failed to join lobby", error as Error, { userId, lobbyId: args.lobbyId });
      logMatchmaking("lobby_join_failed", userId, {
        lobbyId: args.lobbyId,
        error: (error as Error).message,
      });
      performance.end(opId, { error: true });
      throw error;
    }
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
    const {
      userId,
      username,
      deckId,
      deckArchetype: _deckArchetype,
    } = await validateUserCanCreateGame(ctx);

    if (lobby.mode === "ranked") {
      await assertDeckHasNoAgentsInRanked(ctx, deckId);
    }

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
  handler: async (ctx) => {
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
  handler: async (ctx) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // SECURITY: Rate limit lobby actions to prevent spam
    // Max 20 actions per minute per user (configured in lib/rateLimit.ts)
    await checkRateLimitWrapper(ctx, "LOBBY_ACTION", userId);

    // Find user's lobby (as host or opponent)
    // Query by hostId and opponentId separately using indexes for efficiency
    const [hostLobby, opponentLobby] = await Promise.all([
      ctx.db
        .query("gameLobbies")
        .withIndex("by_host", (q) => q.eq("hostId", userId))
        .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
        .first(),
      ctx.db
        .query("gameLobbies")
        .withIndex("by_opponent", (q) => q.eq("opponentId", userId))
        .filter((q) => q.or(q.eq(q.field("status"), "waiting"), q.eq(q.field("status"), "active")))
        .first(),
    ]);

    const lobby = hostLobby || opponentLobby;
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

// ============================================================================
// INTERNAL MUTATIONS (for API key authenticated endpoints)
// ============================================================================

/**
 * Internal mutation for creating a lobby with userId directly
 * Used by HTTP handlers with API key authentication
 */
export const createLobbyInternal = internalMutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("casual"), v.literal("ranked")),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const opId = `createLobbyInternal_${Date.now()}`;
    performance.start(opId);

    const isPrivate = args.isPrivate || false;

    logger.mutation("createLobbyInternal", "pending", {
      mode: args.mode,
      isPrivate,
      userId: args.userId,
    });

    try {
      // Get user to get username
      const user = await ctx.db.get(args.userId);
      if (!user) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "User not found",
        });
      }
      const username = user.username || `Agent_${args.userId.slice(-6)}`;

      // Validate user can create game (without auth check)
      logger.debug("Validating user can create game");
      const { deckId, deckArchetype } = await validateUserCanCreateGameInternal(
        ctx,
        args.userId,
        username
      );

      if (args.mode === "ranked") {
        await assertDeckHasNoAgentsInRanked(ctx, deckId);
      }

      const traceCtx = createTraceContext("createLobbyInternal", {
        userId: args.userId,
        username,
        mode: args.mode,
      });
      logMatchmaking("lobby_create_start", args.userId, traceCtx);

      // Generate join code for private matches
      const joinCode = isPrivate ? generateJoinCode() : undefined;
      if (joinCode) {
        logger.debug("Generated join code for private lobby", { joinCode, ...traceCtx });
      }

      // Calculate rank
      const rating = RATING_DEFAULTS.DEFAULT_RATING;
      const rank = getRank(rating);

      // Set max rating diff for ranked matches
      const maxRatingDiff =
        args.mode === "ranked" ? RATING_DEFAULTS.RANKED_RATING_WINDOW : undefined;

      // Create lobby
      logger.dbOperation("insert", "gameLobbies", traceCtx);
      const lobbyId = await ctx.db.insert("gameLobbies", {
        hostId: args.userId,
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

      logger.info("Lobby created successfully", { ...traceCtx, lobbyId, rank, rating });

      // Update user presence to in_game
      await updatePresenceInternal(ctx, args.userId, username, "in_game");
      logger.debug("Updated user presence to in_game", traceCtx);

      logMatchmaking("lobby_create_complete", args.userId, { ...traceCtx, lobbyId });
      performance.end(opId, { userId: args.userId, lobbyId });

      return {
        _id: lobbyId,
        lobbyId,
        joinCode,
        status: "waiting",
        mode: args.mode,
        createdAt: Date.now(),
      };
    } catch (error) {
      logger.error("Failed to create lobby", error as Error, { mode: args.mode, isPrivate });
      performance.end(opId, { error: true });
      throw error;
    }
  },
});

/**
 * Internal mutation for joining a lobby with userId directly
 * Used by HTTP handlers with API key authentication
 */
export const joinLobbyInternal = internalMutation({
  args: {
    userId: v.id("users"),
    lobbyId: v.id("gameLobbies"),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const opId = `joinLobbyInternal_${Date.now()}`;
    performance.start(opId);

    // Get user to get username
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User not found",
      });
    }
    const username = user.username || `Agent_${args.userId.slice(-6)}`;

    logger.mutation("joinLobbyInternal", args.userId, {
      lobbyId: args.lobbyId,
      hasJoinCode: !!args.joinCode,
    });

    const traceCtx = createTraceContext("joinLobbyInternal", {
      userId: args.userId,
      lobbyId: args.lobbyId,
    });
    logMatchmaking("lobby_join_attempt", args.userId, traceCtx);

    try {
      // Get lobby
      logger.dbOperation("get", "gameLobbies", traceCtx);
      const lobby = await ctx.db.get(args.lobbyId);
      if (!lobby) {
        logger.warn("Lobby not found", traceCtx);
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Lobby not found or no longer available",
        });
      }

      logger.debug("Found lobby", {
        ...traceCtx,
        hostId: lobby.hostId,
        status: lobby.status,
        mode: lobby.mode,
      });

      // Validate lobby status is waiting
      validateLobbyStatus(lobby, ["waiting"]);

      // Validate lobby has capacity (max 2 players)
      validateLobbyCapacity(lobby, 2);

      // Check user is not the host
      if (lobby.hostId === args.userId) {
        logger.warn("User attempted to join own lobby", traceCtx);
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "You cannot join your own lobby",
        });
      }

      // Now do full validation
      logger.debug("Validating user can join game", traceCtx);
      const { deckId } = await validateUserCanCreateGameInternal(ctx, args.userId, username);

      if (lobby.mode === "ranked") {
        await assertDeckHasNoAgentsInRanked(ctx, deckId);
      }

      // Validate join code for private lobbies
      if (lobby.isPrivate) {
        logger.debug("Validating join code for private lobby", traceCtx);
        if (!args.joinCode) {
          logger.warn("Join code missing for private lobby", traceCtx);
          throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
            reason: "Join code required for private match",
          });
        }
        if (args.joinCode.toUpperCase() !== lobby.joinCode) {
          logger.warn("Invalid join code provided", traceCtx);
          throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
            reason: "Invalid join code for private match",
          });
        }
        logger.debug("Join code validated successfully", traceCtx);
      }

      // Validate rating for ranked matches
      if (lobby.mode === "ranked" && lobby.maxRatingDiff) {
        const opponentRating = RATING_DEFAULTS.DEFAULT_RATING;
        const ratingDiff = Math.abs(lobby.hostRating - opponentRating);
        logger.debug("Validating rating difference", {
          ...traceCtx,
          hostRating: lobby.hostRating,
          opponentRating,
          ratingDiff,
          maxDiff: lobby.maxRatingDiff,
        });
        if (ratingDiff > lobby.maxRatingDiff) {
          logger.warn("Rating difference too large for ranked match", {
            ...traceCtx,
            ratingDiff,
            maxDiff: lobby.maxRatingDiff,
          });
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
      logger.info("Generated game ID", { ...traceCtx, gameId });

      // Deterministically decide who goes first based on game ID
      const seed = `${gameId}-first-turn`;
      const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const goesFirst = hash % 2 === 0 ? lobby.hostId : args.userId;
      const now = Date.now();

      logger.info("Determined first player", {
        ...traceCtx,
        gameId,
        goesFirst,
        isHost: goesFirst === lobby.hostId,
      });

      // Update lobby with opponent info and start game
      logger.dbOperation("patch", "gameLobbies", { ...traceCtx, gameId });
      await ctx.db.patch(args.lobbyId, {
        opponentId: args.userId,
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

      logger.info("Lobby updated to active status", { ...traceCtx, gameId });

      // Update both players' presence to in_game
      await updatePresenceInternal(ctx, args.userId, username, "in_game");
      await updatePresenceInternal(ctx, lobby.hostId, lobby.hostUsername, "in_game");
      logger.debug("Updated player presence for both players", traceCtx);

      // Initialize game state for reconnection
      logger.debug("Initializing game state", { ...traceCtx, gameId });
      await initializeGameStateHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId,
        hostId: lobby.hostId,
        opponentId: args.userId,
        currentTurnPlayerId: goesFirst,
      });

      // Record game start event for spectators
      await recordGameStartHelper(ctx, {
        lobbyId: args.lobbyId,
        gameId,
        hostId: lobby.hostId,
        hostUsername: lobby.hostUsername,
        opponentId: args.userId,
        opponentUsername: username,
      });

      logMatchmaking("lobby_join_success", args.userId, {
        ...traceCtx,
        gameId,
        hostId: lobby.hostId,
      });
      logger.info("Game started successfully", {
        ...traceCtx,
        gameId,
        hostId: lobby.hostId,
        opponentId: args.userId,
      });

      performance.end(opId, { userId: args.userId, lobbyId: args.lobbyId, gameId });

      return {
        gameId,
        lobbyId: args.lobbyId,
        opponentUsername: lobby.hostUsername,
        mode: lobby.mode,
      };
    } catch (error) {
      logger.error("Failed to join lobby", error as Error, {
        userId: args.userId,
        lobbyId: args.lobbyId,
      });
      logMatchmaking("lobby_join_failed", args.userId, {
        lobbyId: args.lobbyId,
        error: (error as Error).message,
      });
      performance.end(opId, { error: true });
      throw error;
    }
  },
});

/**
 * Internal mutation for cancelling a lobby with userId directly
 * Used by HTTP handlers with API key authentication
 */
export const cancelLobbyInternal = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get user to get username
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User not found",
      });
    }
    const username = user.username || `Agent_${args.userId.slice(-6)}`;

    // Find user's waiting lobby
    const lobby = await ctx.db
      .query("gameLobbies")
      .withIndex("by_host", (q) => q.eq("hostId", args.userId))
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
    await updatePresenceInternal(ctx, args.userId, username, "online");

    return { success: true, lobbyId: lobby._id };
  },
});
