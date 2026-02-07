import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { tournamentRateLimiter } from "../infrastructure/rateLimiters";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";

// ============================================================================
// Constants
// ============================================================================

const USER_TOURNAMENT_LIMITS = {
  MAX_ACTIVE_PER_USER: 1,
  MIN_BUY_IN: 0,
  MAX_BUY_IN: 100000,
  EXPIRY_HOURS: 24,
  PAYOUT_FIRST: 0.6,
  PAYOUT_SECOND: 0.3,
  TREASURY_FEE: 0.1,
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 50,
} as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate random 6-character alphanumeric join code
 * Excludes ambiguous characters: O, 0, I, 1, l
 */
function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
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
 * Calculate prize distribution for user tournaments
 */
function calculatePrizeDistribution(buyIn: number, participantCount: number) {
  const totalPool = buyIn * participantCount;
  const firstPrize = Math.floor(totalPool * USER_TOURNAMENT_LIMITS.PAYOUT_FIRST);
  const secondPrize = Math.floor(totalPool * USER_TOURNAMENT_LIMITS.PAYOUT_SECOND);
  // Treasury gets remainder (catches rounding, ~10%)
  const treasuryFee = totalPool - firstPrize - secondPrize;

  return {
    totalPool,
    first: firstPrize,
    second: secondPrize,
    thirdFourth: 0, // No 3rd/4th prizes in user tournaments
    treasuryFee,
  };
}

/**
 * Check if user already has an active hosted tournament
 */
async function hasActiveHostedTournament(ctx: MutationCtx, userId: Id<"users">): Promise<boolean> {
  const activeTournament = await ctx.db
    .query("tournaments")
    .withIndex("by_creator", (q) => q.eq("createdBy", userId).eq("status", "registration"))
    .first();

  return activeTournament !== null;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new user-hosted tournament
 * - Validates user can host (not already hosting)
 * - Validates buy-in range
 * - Generates join code for private tournaments
 * - Deducts buy-in from creator
 * - Auto-registers creator as first participant
 */
export const createUserTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    maxPlayers: v.union(v.literal(4), v.literal(8), v.literal(16), v.literal(32)),
    buyIn: v.number(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);

    // Rate limit: 1 tournament creation per minute
    await tournamentRateLimiter.limit(ctx, "createUserTournament", { key: userId });
    const now = Date.now();

    // Validate name
    const trimmedName = args.name.trim();
    if (
      trimmedName.length < USER_TOURNAMENT_LIMITS.NAME_MIN_LENGTH ||
      trimmedName.length > USER_TOURNAMENT_LIMITS.NAME_MAX_LENGTH
    ) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Tournament name must be ${USER_TOURNAMENT_LIMITS.NAME_MIN_LENGTH}-${USER_TOURNAMENT_LIMITS.NAME_MAX_LENGTH} characters`,
      });
    }

    // Validate buy-in
    if (
      args.buyIn < USER_TOURNAMENT_LIMITS.MIN_BUY_IN ||
      args.buyIn > USER_TOURNAMENT_LIMITS.MAX_BUY_IN
    ) {
      throw createError(ErrorCode.TOURNAMENT_INVALID_BUY_IN);
    }

    // Check if user already has an active hosted tournament
    if (await hasActiveHostedTournament(ctx, userId)) {
      throw createError(ErrorCode.TOURNAMENT_ALREADY_HOSTING);
    }

    // Check if user has an active deck
    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }
    if (!user.activeDeckId) {
      throw createError(ErrorCode.TOURNAMENT_NO_ACTIVE_DECK);
    }

    // Validate user has enough gold for buy-in
    if (args.buyIn > 0) {
      const currency = await ctx.db
        .query("playerCurrency")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

      if (!currency || currency.gold < args.buyIn) {
        throw createError(ErrorCode.ECONOMY_INSUFFICIENT_GOLD);
      }
    }

    // Generate join code for private tournaments
    const joinCode = args.visibility === "private" ? generateJoinCode() : undefined;

    // Calculate expiry time (24 hours from now)
    const expiresAt = now + USER_TOURNAMENT_LIMITS.EXPIRY_HOURS * 60 * 60 * 1000;

    // Calculate prize distribution preview
    const prizes = calculatePrizeDistribution(args.buyIn, args.maxPlayers);

    // Create the tournament
    const tournamentId = await ctx.db.insert("tournaments", {
      name: trimmedName,
      description: args.description,
      format: "single_elimination",
      maxPlayers: args.maxPlayers,
      entryFee: args.buyIn,
      mode: args.mode,
      prizePool: {
        first: prizes.first,
        second: prizes.second,
        thirdFourth: 0,
      },
      status: "registration",
      // User tournament timing - registration open now, no check-in phase
      registrationStartsAt: now,
      registrationEndsAt: expiresAt,
      checkInStartsAt: expiresAt, // Will be updated when full
      checkInEndsAt: expiresAt, // Will be updated when full
      scheduledStartAt: expiresAt, // Will be updated when full
      currentRound: 0,
      registeredCount: 0,
      checkedInCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      // User tournament specific fields
      creatorType: "user",
      visibility: args.visibility,
      joinCode,
      autoStartOnFull: true,
      expiresAt,
    });

    // Deduct buy-in from creator if applicable
    if (args.buyIn > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: -args.buyIn,
        transactionType: "tournament_entry",
        description: `Tournament entry: ${trimmedName}`,
        referenceId: tournamentId,
        metadata: {
          tournamentId,
          tournamentName: trimmedName,
        },
      });
    }

    // Get user's rating for seeding
    const seedRating =
      args.mode === "ranked" ? (user.rankedElo ?? 1000) : (user.casualRating ?? 1000);

    // Auto-register creator as first participant
    await ctx.db.insert("tournamentParticipants", {
      tournamentId,
      userId,
      username,
      registeredAt: now,
      seedRating,
      status: "registered",
    });

    // Update registered count
    await ctx.db.patch(tournamentId, {
      registeredCount: 1,
      updatedAt: now,
    });

    return {
      tournamentId,
      joinCode,
      message:
        args.visibility === "private"
          ? `Tournament created! Share code: ${joinCode}`
          : "Tournament created! Waiting for players to join.",
    };
  },
});

/**
 * Join a user tournament by ID or join code
 */
export const joinUserTournament = mutation({
  args: {
    tournamentId: v.optional(v.id("tournaments")),
    joinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, username } = await requireAuthMutation(ctx);
    const now = Date.now();

    // Must provide either tournamentId or joinCode
    if (!args.tournamentId && !args.joinCode) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Please provide a tournament ID or join code",
      });
    }

    // Find tournament
    let tournament;
    if (args.tournamentId) {
      tournament = await ctx.db.get(args.tournamentId);
    } else if (args.joinCode) {
      const normalizedCode = args.joinCode.toUpperCase().trim();
      tournament = await ctx.db
        .query("tournaments")
        .withIndex("by_join_code", (q) => q.eq("joinCode", normalizedCode))
        .first();

      if (!tournament) {
        throw createError(ErrorCode.TOURNAMENT_CODE_NOT_FOUND);
      }
    }

    if (!tournament) {
      throw createError(ErrorCode.TOURNAMENT_NOT_FOUND);
    }

    // Only allow joining user-created tournaments via this endpoint
    if (tournament.creatorType !== "user") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is for user-created tournaments only",
      });
    }

    // Check if private tournament requires code
    if (tournament.visibility === "private" && !args.joinCode) {
      throw createError(ErrorCode.TOURNAMENT_PRIVATE_REQUIRES_CODE);
    }

    // Check tournament status
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.TOURNAMENT_NOT_IN_REGISTRATION);
    }

    // Check if tournament has expired
    if (tournament.expiresAt && now > tournament.expiresAt) {
      throw createError(ErrorCode.TOURNAMENT_EXPIRED);
    }

    // Check if tournament is full
    if (tournament.registeredCount >= tournament.maxPlayers) {
      throw createError(ErrorCode.TOURNAMENT_FULL);
    }

    // Check if already registered
    const existingParticipant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", tournament._id).eq("userId", userId)
      )
      .first();

    if (existingParticipant) {
      throw createError(ErrorCode.TOURNAMENT_ALREADY_REGISTERED);
    }

    // Check if user has an active deck
    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }
    if (!user.activeDeckId) {
      throw createError(ErrorCode.TOURNAMENT_NO_ACTIVE_DECK);
    }

    // Deduct buy-in if applicable
    if (tournament.entryFee > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: -tournament.entryFee,
        transactionType: "tournament_entry",
        description: `Tournament entry: ${tournament.name}`,
        referenceId: tournament._id,
        metadata: {
          tournamentId: tournament._id,
          tournamentName: tournament.name,
        },
      });
    }

    // Get user's rating for seeding
    const seedRating =
      tournament.mode === "ranked" ? (user.rankedElo ?? 1000) : (user.casualRating ?? 1000);

    // Register participant
    await ctx.db.insert("tournamentParticipants", {
      tournamentId: tournament._id,
      userId,
      username,
      registeredAt: now,
      seedRating,
      status: "registered",
    });

    // Update registered count
    const newCount = tournament.registeredCount + 1;
    await ctx.db.patch(tournament._id, {
      registeredCount: newCount,
      updatedAt: now,
    });

    // Check if tournament is now full - auto-start
    if (newCount >= tournament.maxPlayers) {
      // Schedule auto-start (immediate)
      await ctx.scheduler.runAfter(0, internal.social.userTournaments.autoStartTournament, {
        tournamentId: tournament._id,
      });
    }

    return {
      success: true,
      message: `Successfully joined "${tournament.name}"!`,
      isFull: newCount >= tournament.maxPlayers,
    };
  },
});

/**
 * Leave a user tournament before it starts
 * - Creator cannot leave (must cancel instead)
 * - Refunds buy-in
 */
export const leaveUserTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const { userId } = await requireAuthMutation(ctx);
    const now = Date.now();

    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.TOURNAMENT_NOT_FOUND);
    }

    // Only user tournaments
    if (tournament.creatorType !== "user") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is for user-created tournaments only",
      });
    }

    // Can only leave during registration
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.TOURNAMENT_NOT_IN_REGISTRATION);
    }

    // Creator cannot leave (must cancel instead)
    if (tournament.createdBy === userId) {
      throw createError(ErrorCode.TOURNAMENT_HOST_CANNOT_LEAVE);
    }

    // Find participant record
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", tournamentId).eq("userId", userId)
      )
      .first();

    if (!participant) {
      throw createError(ErrorCode.TOURNAMENT_NOT_REGISTERED);
    }

    // Refund buy-in if applicable
    if (tournament.entryFee > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: tournament.entryFee,
        transactionType: "tournament_refund",
        description: `Tournament refund: ${tournament.name}`,
        referenceId: tournamentId,
        metadata: {
          tournamentId,
          tournamentName: tournament.name,
          reason: "player_left",
        },
      });
    }

    // Delete participant record
    await ctx.db.delete(participant._id);

    // Update registered count
    await ctx.db.patch(tournamentId, {
      registeredCount: tournament.registeredCount - 1,
      updatedAt: now,
    });

    return {
      success: true,
      message: `Left "${tournament.name}" and received refund`,
    };
  },
});

/**
 * Cancel a user tournament (host only)
 * - Refunds all participants
 */
export const cancelUserTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const { userId } = await requireAuthMutation(ctx);
    const now = Date.now();

    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.TOURNAMENT_NOT_FOUND);
    }

    // Only user tournaments
    if (tournament.creatorType !== "user") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "This endpoint is for user-created tournaments only",
      });
    }

    // Only host can cancel
    if (tournament.createdBy !== userId) {
      throw createError(ErrorCode.TOURNAMENT_NOT_HOST);
    }

    // Can only cancel during registration
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot cancel a tournament that has already started",
      });
    }

    // Refund all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    for (const participant of participants) {
      if (tournament.entryFee > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId: participant.userId,
          goldDelta: tournament.entryFee,
          transactionType: "tournament_refund",
          description: `Tournament cancelled: ${tournament.name}`,
          referenceId: tournamentId,
          metadata: {
            tournamentId,
            tournamentName: tournament.name,
            reason: "cancelled_by_host",
          },
        });
      }

      // Mark participant as refunded
      await ctx.db.patch(participant._id, {
        status: "refunded",
      });
    }

    // Update tournament status
    await ctx.db.patch(tournamentId, {
      status: "cancelled",
      updatedAt: now,
    });

    return {
      success: true,
      message: `Tournament cancelled. ${participants.length} player(s) refunded.`,
    };
  },
});

/**
 * Auto-start tournament when full (internal)
 * - Marks all players as checked_in
 * - Recalculates prize pool from actual buy-ins
 * - Triggers bracket generation
 */
export const autoStartTournament = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) return;

    // Verify still in registration and full
    if (tournament.status !== "registration") return;
    if (tournament.registeredCount < tournament.maxPlayers) return;

    const now = Date.now();

    // Get all registered participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_status", (q) =>
        q.eq("tournamentId", tournamentId).eq("status", "registered")
      )
      .collect();

    // Mark all as checked_in (they just registered, they're present)
    for (const participant of participants) {
      await ctx.db.patch(participant._id, {
        status: "checked_in",
      });
    }

    // Recalculate prize pool from actual participants
    const actualPrizes = calculatePrizeDistribution(tournament.entryFee, participants.length);

    // Update tournament for immediate start
    await ctx.db.patch(tournamentId, {
      status: "checkin",
      checkedInCount: participants.length,
      prizePool: {
        first: actualPrizes.first,
        second: actualPrizes.second,
        thirdFourth: 0,
      },
      checkInEndsAt: now + 1000, // 1 second from now
      scheduledStartAt: now + 1000,
      updatedAt: now,
    });

    // Schedule the actual start (uses existing tournament start logic)
    await ctx.scheduler.runAfter(1000, internal.social.tournaments.startTournament, {
      tournamentId,
    });
  },
});

// ============================================================================
// Queries
// ============================================================================

/**
 * Get public user tournaments in registration phase
 */
export const getPublicUserTournaments = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_visibility_status", (q) =>
        q.eq("visibility", "public").eq("status", "registration")
      )
      .order("desc")
      .take(limit);

    // Filter to only user tournaments and enrich with creator info
    const userTournaments = [];
    for (const t of tournaments) {
      if (t.creatorType !== "user") continue;

      const creator = await ctx.db.get(t.createdBy);
      userTournaments.push({
        ...t,
        creatorUsername: creator?.username ?? "Unknown",
        slotsRemaining: t.maxPlayers - t.registeredCount,
        prizeBreakdown: calculatePrizeDistribution(t.entryFee, t.maxPlayers),
      });
    }

    return userTournaments;
  },
});

/**
 * Get user's currently hosted tournament
 */
export const getMyHostedTournament = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_creator", (q) => q.eq("createdBy", auth.userId).eq("status", "registration"))
      .first();

    if (!tournament || tournament.creatorType !== "user") {
      return null;
    }

    // Get participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();

    return {
      ...tournament,
      participants: participants.map((p) => ({
        username: p.username,
        registeredAt: p.registeredAt,
      })),
      prizeBreakdown: calculatePrizeDistribution(tournament.entryFee, tournament.maxPlayers),
    };
  },
});

/**
 * Get tournament by join code (for preview before joining)
 */
export const getTournamentByCode = query({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, { joinCode }) => {
    const normalizedCode = joinCode.toUpperCase().trim();

    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_join_code", (q) => q.eq("joinCode", normalizedCode))
      .first();

    if (!tournament || tournament.creatorType !== "user") {
      return null;
    }

    const creator = await ctx.db.get(tournament.createdBy);

    return {
      _id: tournament._id,
      name: tournament.name,
      description: tournament.description,
      maxPlayers: tournament.maxPlayers,
      registeredCount: tournament.registeredCount,
      entryFee: tournament.entryFee,
      mode: tournament.mode,
      status: tournament.status,
      creatorUsername: creator?.username ?? "Unknown",
      slotsRemaining: tournament.maxPlayers - tournament.registeredCount,
      prizeBreakdown: calculatePrizeDistribution(tournament.entryFee, tournament.maxPlayers),
      expiresAt: tournament.expiresAt,
    };
  },
});

/**
 * Get tournaments the user is registered for
 */
export const getMyRegisteredTournaments = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuthQuery(ctx);

    const participations = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_user", (q) => q.eq("userId", auth.userId))
      .collect();

    const tournaments = [];
    for (const p of participations) {
      const tournament = await ctx.db.get(p.tournamentId);
      if (!tournament) continue;

      // Only include user tournaments that are still active
      if (tournament.creatorType !== "user") continue;
      if (tournament.status === "cancelled" || tournament.status === "completed") continue;

      const creator = await ctx.db.get(tournament.createdBy);
      tournaments.push({
        _id: tournament._id,
        name: tournament.name,
        maxPlayers: tournament.maxPlayers,
        registeredCount: tournament.registeredCount,
        entryFee: tournament.entryFee,
        mode: tournament.mode,
        status: tournament.status,
        creatorUsername: creator?.username ?? "Unknown",
        isHost: tournament.createdBy === auth.userId,
        joinCode: tournament.createdBy === auth.userId ? tournament.joinCode : undefined,
        registeredAt: p.registeredAt,
        participantStatus: p.status,
      });
    }

    return tournaments;
  },
});

// ============================================================================
// Internal Functions (for cron jobs)
// ============================================================================

/**
 * Get expired user tournaments that need to be cancelled
 * Called by cron job to find tournaments past their expiry time
 */
export const getExpiredTournaments = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all user tournaments in registration that have expired
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "registration"))
      .collect();

    // Filter to user tournaments that have expired
    const expiredIds = tournaments
      .filter((t) => t.creatorType === "user" && t.expiresAt && t.expiresAt < now)
      .map((t) => t._id);

    return expiredIds;
  },
});

/**
 * Expire a user tournament and refund all participants
 * Called by cron job for tournaments that didn't fill in time
 */
export const expireTournament = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) return;

    // Only expire user tournaments in registration
    if (tournament.creatorType !== "user") return;
    if (tournament.status !== "registration") return;

    const now = Date.now();

    // Refund all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    for (const participant of participants) {
      if (tournament.entryFee > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId: participant.userId,
          goldDelta: tournament.entryFee,
          transactionType: "tournament_refund",
          description: `Tournament expired: ${tournament.name}`,
          referenceId: tournamentId,
          metadata: {
            tournamentId,
            tournamentName: tournament.name,
            reason: "expired",
          },
        });
      }

      // Mark participant as refunded
      await ctx.db.patch(participant._id, {
        status: "refunded",
      });
    }

    // Update tournament status
    await ctx.db.patch(tournamentId, {
      status: "cancelled",
      updatedAt: now,
    });

    console.log(
      `Expired tournament ${tournament.name} (${tournamentId}), refunded ${participants.length} participants`
    );
  },
});
