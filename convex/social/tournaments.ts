/**
 * Tournament System
 *
 * Implements single-elimination bracket tournaments with:
 * - Registration with entry fees
 * - Check-in period before start
 * - Seeded bracket generation (by rating)
 * - Automatic match creation when both players ready
 * - Winner advancement through bracket
 * - Prize pool distribution (1st, 2nd, 3rd-4th)
 *
 * Tournament lifecycle:
 * 1. registration - Players can register (pay entry fee)
 * 2. checkin - Registration closed, players must check in
 * 3. active - Tournament in progress, matches being played
 * 4. completed - Tournament finished, prizes distributed
 * 5. cancelled - Tournament cancelled, refunds issued
 */

import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalQuery, query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { internalMutation, mutation } from "../functions";
import { requireAdminMutation, requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { getRankFromRating } from "../lib/helpers";
import {
  tournamentBracketValidator,
  tournamentCheckInResponseValidator,
  tournamentDetailsValidator,
  tournamentHistoryEntryValidator,
  tournamentRegistrationResponseValidator,
  tournamentSummaryValidator,
  userTournamentStatsValidator,
} from "../lib/returnValidators";

// ============================================================================
// CONSTANTS
// ============================================================================

const TOURNAMENT = {
  /** Minimum time before tournament start for registration to close (15 min) */
  MIN_CHECKIN_DURATION_MS: 15 * 60 * 1000,

  /** Maximum time to wait for a player to join their match (5 min) */
  MATCH_NO_SHOW_TIMEOUT_MS: 5 * 60 * 1000,

  /** Time between check-in end and tournament start (for bracket generation) */
  BRACKET_GENERATION_BUFFER_MS: 1 * 60 * 1000,
} as const;

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all active/upcoming tournaments
 * Returns tournaments in registration, checkin, or active status
 */
export const getActiveTournaments = query({
  args: {},
  returns: v.array(tournamentSummaryValidator),
  handler: async (ctx) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "registration"),
          q.eq(q.field("status"), "checkin"),
          q.eq(q.field("status"), "active")
        )
      )
      .order("asc")
      .take(50);

    return tournaments.map((t) => ({
      _id: t._id,
      name: t.name,
      description: t.description,
      format: t.format,
      maxPlayers: t.maxPlayers,
      entryFee: t.entryFee,
      mode: t.mode,
      prizePool: t.prizePool,
      status: t.status,
      registrationStartsAt: t.registrationStartsAt,
      registrationEndsAt: t.registrationEndsAt,
      scheduledStartAt: t.scheduledStartAt,
      registeredCount: t.registeredCount,
      checkedInCount: t.checkedInCount,
      currentRound: t.currentRound,
      totalRounds: t.totalRounds,
      winnerId: t.winnerId,
      winnerUsername: t.winnerUsername,
    }));
  },
});

/**
 * Get tournament details including user's registration status
 */
export const getTournamentDetails = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: tournamentDetailsValidator,
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Check if user is registered
    let isRegistered = false;
    let isCheckedIn = false;
    let userParticipantId: Id<"tournamentParticipants"> | undefined;
    let userStatus: Doc<"tournamentParticipants">["status"] | undefined;

    try {
      const { userId } = await requireAuthQuery(ctx);
      const participant = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament_user", (q) =>
          q.eq("tournamentId", tournamentId).eq("userId", userId)
        )
        .first();

      if (participant) {
        isRegistered = true;
        isCheckedIn = participant.status === "checked_in" || participant.status === "active";
        userParticipantId = participant._id;
        userStatus = participant.status;
      }
    } catch {
      // User not authenticated, that's okay
    }

    return {
      _id: tournament._id,
      name: tournament.name,
      description: tournament.description,
      format: tournament.format,
      maxPlayers: tournament.maxPlayers,
      entryFee: tournament.entryFee,
      mode: tournament.mode,
      prizePool: tournament.prizePool,
      status: tournament.status,
      registrationStartsAt: tournament.registrationStartsAt,
      registrationEndsAt: tournament.registrationEndsAt,
      checkInStartsAt: tournament.checkInStartsAt,
      checkInEndsAt: tournament.checkInEndsAt,
      scheduledStartAt: tournament.scheduledStartAt,
      actualStartedAt: tournament.actualStartedAt,
      completedAt: tournament.completedAt,
      currentRound: tournament.currentRound,
      totalRounds: tournament.totalRounds,
      registeredCount: tournament.registeredCount,
      checkedInCount: tournament.checkedInCount,
      winnerId: tournament.winnerId,
      winnerUsername: tournament.winnerUsername,
      secondPlaceId: tournament.secondPlaceId,
      secondPlaceUsername: tournament.secondPlaceUsername,
      createdAt: tournament.createdAt,
      isRegistered,
      isCheckedIn,
      userParticipantId,
      userStatus,
    };
  },
});

/**
 * Get tournament bracket (matches organized by round)
 */
export const getTournamentBracket = query({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: tournamentBracketValidator,
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Get all matches for this tournament
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    // Get all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    // Group matches by round
    const totalRounds = tournament.totalRounds || calculateTotalRounds(tournament.maxPlayers);

    // Build rounds array with full match documents
    const rounds = [];
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatches = matches
        .filter((m) => m.round === r)
        .sort((a, b) => a.matchNumber - b.matchNumber);

      rounds.push({
        roundNumber: r,
        roundName: getRoundName(r, totalRounds),
        matches: roundMatches,
      });
    }

    return {
      tournament: {
        _id: tournament._id,
        name: tournament.name,
        description: tournament.description,
        format: tournament.format,
        maxPlayers: tournament.maxPlayers,
        entryFee: tournament.entryFee,
        mode: tournament.mode,
        prizePool: tournament.prizePool,
        status: tournament.status,
        registrationStartsAt: tournament.registrationStartsAt,
        registrationEndsAt: tournament.registrationEndsAt,
        scheduledStartAt: tournament.scheduledStartAt,
        registeredCount: tournament.registeredCount,
        checkedInCount: tournament.checkedInCount,
        currentRound: tournament.currentRound,
        totalRounds: tournament.totalRounds,
        winnerId: tournament.winnerId,
        winnerUsername: tournament.winnerUsername,
      },
      rounds,
      participants: participants.map((p) => ({
        _id: p._id,
        tournamentId: p.tournamentId,
        userId: p.userId,
        username: p.username,
        registeredAt: p.registeredAt,
        seedRating: p.seedRating,
        status: p.status,
        checkedInAt: p.checkedInAt,
        currentRound: p.currentRound,
        bracket: p.bracket,
        eliminatedInRound: p.eliminatedInRound,
        finalPlacement: p.finalPlacement,
        prizeAwarded: p.prizeAwarded,
      })),
    };
  },
});

/**
 * Get user's tournament history
 */
export const getUserTournamentHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(tournamentHistoryEntryValidator),
  handler: async (ctx, { limit = 20 }) => {
    const { userId } = await requireAuthQuery(ctx);

    const history = await ctx.db
      .query("tournamentHistory")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return history.map((h) => ({
      _id: h._id,
      tournamentId: h.tournamentId,
      tournamentName: h.tournamentName,
      maxPlayers: h.maxPlayers,
      placement: h.placement,
      prizeWon: h.prizeWon,
      matchesPlayed: h.matchesPlayed,
      matchesWon: h.matchesWon,
      completedAt: h.completedAt,
    }));
  },
});

/**
 * Get user's tournament stats
 */
export const getUserTournamentStats = query({
  args: {},
  returns: userTournamentStatsValidator,
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);

    const history = await ctx.db
      .query("tournamentHistory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (history.length === 0) {
      return {
        tournamentsPlayed: 0,
        tournamentsWon: 0,
        totalPrizeWon: 0,
        totalMatchesPlayed: 0,
        totalMatchesWon: 0,
        bestPlacement: undefined,
        winRate: 0,
      };
    }

    const tournamentsWon = history.filter((h) => h.placement === 1).length;
    const totalPrizeWon = history.reduce((sum, h) => sum + h.prizeWon, 0);
    const totalMatchesPlayed = history.reduce((sum, h) => sum + h.matchesPlayed, 0);
    const totalMatchesWon = history.reduce((sum, h) => sum + h.matchesWon, 0);
    const bestPlacement = Math.min(...history.map((h) => h.placement));

    return {
      tournamentsPlayed: history.length,
      tournamentsWon,
      totalPrizeWon,
      totalMatchesPlayed,
      totalMatchesWon,
      bestPlacement,
      winRate: totalMatchesPlayed > 0 ? (totalMatchesWon / totalMatchesPlayed) * 100 : 0,
    };
  },
});

// ============================================================================
// PUBLIC MUTATIONS
// ============================================================================

/**
 * Register for a tournament
 * Deducts entry fee and adds player to participant list
 */
export const registerForTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: tournamentRegistrationResponseValidator,
  handler: async (ctx, { tournamentId }) => {
    const { userId, username } = await requireAuthMutation(ctx);
    const now = Date.now();

    // Get tournament
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Validate tournament is in registration phase
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Tournament is not accepting registrations (status: ${tournament.status})`,
      });
    }

    // Validate registration window
    if (now < tournament.registrationStartsAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Registration has not started yet",
      });
    }
    if (now > tournament.registrationEndsAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Registration has ended",
      });
    }

    // Check if tournament is full
    if (tournament.registeredCount >= tournament.maxPlayers) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Tournament is full",
      });
    }

    // Check if already registered
    const existingParticipant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", tournamentId).eq("userId", userId)
      )
      .first();

    if (existingParticipant) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are already registered for this tournament",
      });
    }

    // Check if user has active deck
    const user = await ctx.db.get(userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    if (!user.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You must have an active deck to register for tournaments",
      });
    }

    // Deduct entry fee if applicable
    if (tournament.entryFee > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId,
        goldDelta: -tournament.entryFee,
        transactionType: "purchase",
        description: `Tournament entry fee: ${tournament.name}`,
        referenceId: tournamentId,
      });
    }

    // Get player's rating for seeding
    const rating =
      tournament.mode === "ranked" ? user.rankedElo || 1000 : user.casualRating || 1000;

    // Create participant record
    const participantId = await ctx.db.insert("tournamentParticipants", {
      tournamentId,
      userId,
      username,
      registeredAt: now,
      seedRating: rating,
      status: "registered",
    });

    // Update tournament count
    await ctx.db.patch(tournamentId, {
      registeredCount: tournament.registeredCount + 1,
      updatedAt: now,
    });

    return {
      success: true,
      participantId,
      message:
        tournament.entryFee > 0
          ? `Registered! ${tournament.entryFee} gold deducted.`
          : "Registered successfully!",
    };
  },
});

/**
 * Check in to a tournament
 * Must be called during check-in period before tournament starts
 */
export const checkInToTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  returns: tournamentCheckInResponseValidator,
  handler: async (ctx, { tournamentId }) => {
    const { userId } = await requireAuthMutation(ctx);
    const now = Date.now();

    // Get tournament
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Validate tournament is in check-in phase
    if (tournament.status !== "checkin") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Tournament is not in check-in phase (status: ${tournament.status})`,
      });
    }

    // Validate check-in window
    if (now < tournament.checkInStartsAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Check-in has not started yet",
      });
    }
    if (now > tournament.checkInEndsAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Check-in has ended",
      });
    }

    // Get participant record
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", tournamentId).eq("userId", userId)
      )
      .first();

    if (!participant) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You are not registered for this tournament",
      });
    }

    if (participant.status === "checked_in") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "You have already checked in",
      });
    }

    if (participant.status !== "registered") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot check in with status: ${participant.status}`,
      });
    }

    // Update participant status
    await ctx.db.patch(participant._id, {
      status: "checked_in",
      checkedInAt: now,
    });

    // Update tournament count
    await ctx.db.patch(tournamentId, {
      checkedInCount: tournament.checkedInCount + 1,
      updatedAt: now,
    });

    return {
      success: true,
      message: "Checked in successfully! The tournament will start shortly.",
    };
  },
});

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

/**
 * Create a new tournament (admin only)
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    maxPlayers: v.union(v.literal(8), v.literal(16), v.literal(32)),
    entryFee: v.number(),
    mode: v.union(v.literal("ranked"), v.literal("casual")),
    prizePool: v.object({
      first: v.number(),
      second: v.number(),
      thirdFourth: v.number(),
    }),
    registrationStartsAt: v.number(),
    registrationEndsAt: v.number(),
    scheduledStartAt: v.number(),
  },
  returns: v.id("tournaments"),
  handler: async (ctx, args) => {
    const { userId } = await requireAdminMutation(ctx);
    const now = Date.now();

    // Validate timing
    if (args.registrationStartsAt >= args.registrationEndsAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Registration start must be before registration end",
      });
    }
    if (args.registrationEndsAt >= args.scheduledStartAt) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Registration must end before tournament starts",
      });
    }

    // Calculate check-in window (registration end to scheduled start)
    const checkInStartsAt = args.registrationEndsAt;
    const checkInEndsAt = args.scheduledStartAt - TOURNAMENT.BRACKET_GENERATION_BUFFER_MS;

    if (checkInEndsAt - checkInStartsAt < TOURNAMENT.MIN_CHECKIN_DURATION_MS) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Check-in period must be at least 15 minutes",
      });
    }

    // Validate entry fee and prize pool
    if (args.entryFee < 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Entry fee cannot be negative",
      });
    }

    const totalPrizes =
      args.prizePool.first + args.prizePool.second + args.prizePool.thirdFourth * 2;
    const totalEntryFees = args.entryFee * args.maxPlayers;

    if (totalPrizes > totalEntryFees && args.entryFee > 0) {
      // Allow if admin wants to add extra prizes, but warn
      console.warn(
        `Tournament prize pool (${totalPrizes}) exceeds max entry fees (${totalEntryFees})`
      );
    }

    // Create tournament
    const tournamentId = await ctx.db.insert("tournaments", {
      name: args.name,
      description: args.description,
      format: "single_elimination",
      maxPlayers: args.maxPlayers,
      entryFee: args.entryFee,
      mode: args.mode,
      prizePool: args.prizePool,
      status: "registration",
      registrationStartsAt: args.registrationStartsAt,
      registrationEndsAt: args.registrationEndsAt,
      checkInStartsAt,
      checkInEndsAt,
      scheduledStartAt: args.scheduledStartAt,
      currentRound: 0,
      registeredCount: 0,
      checkedInCount: 0,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return tournamentId;
  },
});

// ============================================================================
// INTERNAL MUTATIONS (Called by cron jobs and game end handlers)
// ============================================================================

/**
 * Transition tournament from registration to check-in phase
 * Called by cron when registrationEndsAt is reached
 */
export const transitionToCheckIn = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) return;

    if (tournament.status !== "registration") return;

    const now = Date.now();
    if (now < tournament.registrationEndsAt) return;

    // Check minimum players (need at least 2)
    if (tournament.registeredCount < 2) {
      // Cancel tournament and refund entry fees
      await cancelTournamentInternal(ctx, tournamentId, "Not enough players registered");
      return;
    }

    await ctx.db.patch(tournamentId, {
      status: "checkin",
      updatedAt: now,
    });
  },
});

/**
 * Start tournament - generate bracket and create first round matches
 * Called by cron when checkInEndsAt is reached
 */
export const startTournament = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, { tournamentId }) => {
    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) return;

    if (tournament.status !== "checkin") return;

    const now = Date.now();
    if (now < tournament.checkInEndsAt) return;

    // Get checked-in participants
    const checkedInParticipants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_status", (q) =>
        q.eq("tournamentId", tournamentId).eq("status", "checked_in")
      )
      .collect();

    // Mark no-shows as forfeit
    const registeredOnly = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_status", (q) =>
        q.eq("tournamentId", tournamentId).eq("status", "registered")
      )
      .collect();

    for (const noShow of registeredOnly) {
      await ctx.db.patch(noShow._id, {
        status: "forfeit",
        finalPlacement: tournament.maxPlayers, // Worst placement
      });

      // Refund entry fee for no-shows (they didn't get to play)
      if (tournament.entryFee > 0) {
        await adjustPlayerCurrencyHelper(ctx, {
          userId: noShow.userId,
          goldDelta: tournament.entryFee,
          transactionType: "refund",
          description: `Tournament no-show refund: ${tournament.name}`,
          referenceId: tournamentId,
        });
      }
    }

    // Need at least 2 checked-in players
    if (checkedInParticipants.length < 2) {
      await cancelTournamentInternal(ctx, tournamentId, "Not enough players checked in");
      return;
    }

    // Generate bracket
    const totalRounds = calculateTotalRounds(checkedInParticipants.length);
    const bracketSize = 2 ** totalRounds; // Next power of 2

    // Sort by rating for seeding (higher rating = better seed)
    const seededParticipants = [...checkedInParticipants].sort(
      (a, b) => b.seedRating - a.seedRating
    );

    // Assign bracket positions using standard seeding
    // Seed 1 vs Seed 8, Seed 4 vs Seed 5, Seed 3 vs Seed 6, Seed 2 vs Seed 7
    const bracketPositions = generateSeedPositions(bracketSize);

    for (let i = 0; i < seededParticipants.length; i++) {
      const participant = seededParticipants[i];
      if (!participant) continue;

      await ctx.db.patch(participant._id, {
        status: "active",
        bracket: bracketPositions[i],
        currentRound: 1,
      });
    }

    // Create all matches for the bracket
    await createBracketMatches(
      ctx,
      tournamentId,
      bracketSize,
      seededParticipants,
      bracketPositions
    );

    // Update tournament
    await ctx.db.patch(tournamentId, {
      status: "active",
      currentRound: 1,
      totalRounds,
      actualStartedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Report match result - called when a game ends
 * Advances winner, eliminates loser, and creates next match if needed
 */
export const reportMatchResult = internalMutation({
  args: {
    lobbyId: v.id("gameLobbies"),
    winnerId: v.id("users"),
    loserId: v.id("users"),
  },
  handler: async (ctx, { lobbyId, winnerId, loserId }) => {
    // Find the tournament match for this lobby
    const match = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_lobby", (q) => q.eq("lobbyId", lobbyId))
      .first();

    if (!match) {
      // Not a tournament match, ignore
      return;
    }

    await completeMatchInternal(ctx, match._id, winnerId, loserId, "game_win");
  },
});

/**
 * Forfeit a no-show player in a match
 * Called by cron when match timeout is reached
 */
export const forfeitNoShowMatch = internalMutation({
  args: {
    matchId: v.id("tournamentMatches"),
    noShowPlayerId: v.id("users"),
  },
  handler: async (ctx, { matchId, noShowPlayerId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return;

    if (match.status !== "ready" && match.status !== "active") return;

    // Determine winner (the player who showed up)
    const winnerId = match.player1Id === noShowPlayerId ? match.player2Id : match.player1Id;
    if (!winnerId) return; // Both players missing?

    await completeMatchInternal(ctx, matchId, winnerId, noShowPlayerId, "opponent_no_show");
  },
});

/**
 * Get tournaments that need status transitions
 * Called by cron to find tournaments needing phase changes
 */
export const getTournamentsNeedingTransition = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();

    // Find registration tournaments that need to transition to check-in
    const needCheckIn = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "registration"))
      .filter((q) => q.lte(q.field("registrationEndsAt"), now))
      .collect();

    // Find check-in tournaments that need to start
    const needStart = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "checkin"))
      .filter((q) => q.lte(q.field("checkInEndsAt"), now))
      .collect();

    return {
      needCheckIn: needCheckIn.map((t) => t._id),
      needStart: needStart.map((t) => t._id),
    };
  },
});

/**
 * Get matches that have timed out (no-shows)
 */
export const getTimedOutMatches = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const timeout = TOURNAMENT.MATCH_NO_SHOW_TIMEOUT_MS;

    // Find ready matches that have been waiting too long
    const readyMatches = await ctx.db
      .query("tournamentMatches")
      .filter((q) =>
        q.and(q.eq(q.field("status"), "ready"), q.lt(q.field("createdAt"), now - timeout))
      )
      .collect();

    return readyMatches.map((m) => ({
      matchId: m._id,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      createdAt: m.createdAt,
    }));
  },
});

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Complete a match and advance the winner
 */
async function completeMatchInternal(
  ctx: MutationCtx,
  matchId: Id<"tournamentMatches">,
  winnerId: Id<"users">,
  loserId: Id<"users">,
  winReason: "game_win" | "opponent_forfeit" | "opponent_no_show" | "bye"
) {
  const match = await ctx.db.get(matchId);
  if (!match) return;

  const tournament = await ctx.db.get(match.tournamentId);
  if (!tournament) return;

  const now = Date.now();

  // Get winner and loser usernames
  const winner = await ctx.db.get(winnerId);
  const loser = await ctx.db.get(loserId);

  // Update match
  await ctx.db.patch(matchId, {
    status: "completed",
    winnerId,
    winnerUsername: winner?.username || winner?.name,
    loserId,
    loserUsername: loser?.username || loser?.name,
    winReason,
    completedAt: now,
    updatedAt: now,
  });

  // Update loser participant - eliminated
  const loserParticipant = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament_user", (q) =>
      q.eq("tournamentId", match.tournamentId).eq("userId", loserId)
    )
    .first();

  if (loserParticipant) {
    // Calculate placement based on round eliminated
    const placement = calculatePlacement(match.round, tournament.totalRounds || 1);

    await ctx.db.patch(loserParticipant._id, {
      status: "eliminated",
      eliminatedInRound: match.round,
      finalPlacement: placement,
    });
  }

  // Check if this was the final match
  const totalRounds = tournament.totalRounds || calculateTotalRounds(tournament.maxPlayers);
  if (match.round === totalRounds) {
    // Tournament complete!
    await completeTournamentInternal(ctx, match.tournamentId, winnerId, loserId);
    return;
  }

  // Advance winner to next round
  await advanceWinnerInternal(ctx, match, winnerId);

  // Check if we can start the next round
  await checkRoundProgressInternal(ctx, match.tournamentId, match.round);
}

/**
 * Advance winner to next match
 */
async function advanceWinnerInternal(
  ctx: MutationCtx,
  completedMatch: Doc<"tournamentMatches">,
  winnerId: Id<"users">
) {
  const winner = await ctx.db.get(winnerId);
  const now = Date.now();

  // Find the next match that this winner should go to
  const nextRound = completedMatch.round + 1;
  const nextMatchNumber = Math.ceil(completedMatch.matchNumber / 2);

  const nextMatch = await ctx.db
    .query("tournamentMatches")
    .withIndex("by_tournament_round", (q) =>
      q.eq("tournamentId", completedMatch.tournamentId).eq("round", nextRound)
    )
    .filter((q) => q.eq(q.field("matchNumber"), nextMatchNumber))
    .first();

  if (!nextMatch) return;

  // Determine if winner goes to player1 or player2 slot
  const isPlayer1 = completedMatch.matchNumber % 2 === 1;

  const winnerParticipant = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament_user", (q) =>
      q.eq("tournamentId", completedMatch.tournamentId).eq("userId", winnerId)
    )
    .first();

  const updateData: Partial<Doc<"tournamentMatches">> = {
    updatedAt: now,
  };

  if (isPlayer1) {
    updateData.player1Id = winnerId;
    updateData.player1Username = winner?.username || winner?.name;
    updateData.player1ParticipantId = winnerParticipant?._id;
  } else {
    updateData.player2Id = winnerId;
    updateData.player2Username = winner?.username || winner?.name;
    updateData.player2ParticipantId = winnerParticipant?._id;
  }

  // Check if both players are now set
  const updatedPlayer1 = isPlayer1 ? winnerId : nextMatch.player1Id;
  const updatedPlayer2 = isPlayer1 ? nextMatch.player2Id : winnerId;

  if (updatedPlayer1 && updatedPlayer2) {
    updateData.status = "ready";
  }

  await ctx.db.patch(nextMatch._id, updateData);

  // Update winner's participant record
  if (winnerParticipant) {
    await ctx.db.patch(winnerParticipant._id, {
      currentRound: nextRound,
    });
  }

  // If match is ready, create game lobby
  if (updateData.status === "ready") {
    await createMatchGameLobby(ctx, nextMatch._id);
  }
}

/**
 * Check if all matches in current round are complete
 */
async function checkRoundProgressInternal(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  completedRound: number
) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return;

  const now = Date.now();

  // Check if all matches in this round are complete
  const roundMatches = await ctx.db
    .query("tournamentMatches")
    .withIndex("by_tournament_round", (q) =>
      q.eq("tournamentId", tournamentId).eq("round", completedRound)
    )
    .collect();

  const allComplete = roundMatches.every((m) => m.status === "completed" || m.status === "forfeit");

  if (allComplete && completedRound < (tournament.totalRounds || 1)) {
    // Move to next round
    await ctx.db.patch(tournamentId, {
      currentRound: completedRound + 1,
      updatedAt: now,
    });
  }
}

/**
 * Complete the tournament and distribute prizes
 */
async function completeTournamentInternal(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  winnerId: Id<"users">,
  secondPlaceId: Id<"users">
) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return;

  const now = Date.now();

  const winner = await ctx.db.get(winnerId);
  const secondPlace = await ctx.db.get(secondPlaceId);

  // Update winner participant
  const winnerParticipant = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament_user", (q) =>
      q.eq("tournamentId", tournamentId).eq("userId", winnerId)
    )
    .first();

  if (winnerParticipant) {
    await ctx.db.patch(winnerParticipant._id, {
      status: "winner",
      finalPlacement: 1,
      prizeAwarded: tournament.prizePool.first,
      prizeAwardedAt: now,
    });
  }

  // Update second place participant
  const secondParticipant = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament_user", (q) =>
      q.eq("tournamentId", tournamentId).eq("userId", secondPlaceId)
    )
    .first();

  if (secondParticipant) {
    await ctx.db.patch(secondParticipant._id, {
      finalPlacement: 2,
      prizeAwarded: tournament.prizePool.second,
      prizeAwardedAt: now,
    });
  }

  // Distribute prizes
  await distributePrizesInternal(ctx, tournamentId);

  // Update tournament status
  await ctx.db.patch(tournamentId, {
    status: "completed",
    winnerId,
    winnerUsername: winner?.username || winner?.name,
    secondPlaceId,
    secondPlaceUsername: secondPlace?.username || secondPlace?.name,
    completedAt: now,
    updatedAt: now,
  });

  // Create tournament history records for all participants
  await createTournamentHistoryRecords(ctx, tournamentId);
}

/**
 * Distribute prizes to winners
 */
async function distributePrizesInternal(ctx: MutationCtx, tournamentId: Id<"tournaments">) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return;

  const participants = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
    .collect();

  for (const participant of participants) {
    const placement = participant.finalPlacement;
    if (!placement) continue;

    let prize = 0;
    if (placement === 1) {
      prize = tournament.prizePool.first;
    } else if (placement === 2) {
      prize = tournament.prizePool.second;
    } else if (placement === 3 || placement === 4) {
      prize = tournament.prizePool.thirdFourth;
    }

    if (prize > 0 && !participant.prizeAwardedAt) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId: participant.userId,
        goldDelta: prize,
        transactionType: "reward",
        description: `Tournament prize (${getPlacementString(placement)}): ${tournament.name}`,
        referenceId: tournamentId,
      });

      await ctx.db.patch(participant._id, {
        prizeAwarded: prize,
        prizeAwardedAt: Date.now(),
      });
    }
  }
}

/**
 * Cancel tournament and refund entry fees
 */
async function cancelTournamentInternal(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  reason: string
) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return;

  const now = Date.now();

  // Refund all participants
  if (tournament.entryFee > 0) {
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    for (const participant of participants) {
      if (participant.status !== "refunded") {
        await adjustPlayerCurrencyHelper(ctx, {
          userId: participant.userId,
          goldDelta: tournament.entryFee,
          transactionType: "refund",
          description: `Tournament cancelled: ${tournament.name} - ${reason}`,
          referenceId: tournamentId,
        });

        await ctx.db.patch(participant._id, {
          status: "refunded",
        });
      }
    }
  }

  await ctx.db.patch(tournamentId, {
    status: "cancelled",
    updatedAt: now,
  });
}

/**
 * Create tournament history records for all participants
 */
async function createTournamentHistoryRecords(ctx: MutationCtx, tournamentId: Id<"tournaments">) {
  const tournament = await ctx.db.get(tournamentId);
  if (!tournament) return;

  const participants = await ctx.db
    .query("tournamentParticipants")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
    .collect();

  const matches = await ctx.db
    .query("tournamentMatches")
    .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
    .collect();

  for (const participant of participants) {
    // Count matches this player was in
    const playerMatches = matches.filter(
      (m) => m.player1Id === participant.userId || m.player2Id === participant.userId
    );
    const matchesPlayed = playerMatches.filter(
      (m) => m.status === "completed" || m.status === "forfeit"
    ).length;
    const matchesWon = playerMatches.filter((m) => m.winnerId === participant.userId).length;

    await ctx.db.insert("tournamentHistory", {
      userId: participant.userId,
      tournamentId,
      tournamentName: tournament.name,
      maxPlayers: tournament.maxPlayers,
      placement: participant.finalPlacement || tournament.maxPlayers,
      prizeWon: participant.prizeAwarded || 0,
      matchesPlayed,
      matchesWon,
      completedAt: tournament.completedAt || Date.now(),
    });
  }
}

/**
 * Create bracket matches for single elimination
 */
async function createBracketMatches(
  ctx: MutationCtx,
  tournamentId: Id<"tournaments">,
  bracketSize: number,
  participants: Doc<"tournamentParticipants">[],
  bracketPositions: number[]
) {
  const totalRounds = Math.log2(bracketSize);
  const now = Date.now();

  // Create a map of bracket position to participant
  const positionToParticipant = new Map<number, Doc<"tournamentParticipants">>();
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const position = bracketPositions[i];
    if (participant && position !== undefined) {
      positionToParticipant.set(position, participant);
    }
  }

  // Create all matches for all rounds
  let bracketPosition = 1;
  const matchesByRound: Map<number, Id<"tournamentMatches">[]> = new Map();

  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / 2 ** round;
    const roundMatches: Id<"tournamentMatches">[] = [];

    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      // For first round, assign players from bracket positions
      // For later rounds, set source matches
      let player1Id: Id<"users"> | undefined;
      let player1Username: string | undefined;
      let player1ParticipantId: Id<"tournamentParticipants"> | undefined;
      let player2Id: Id<"users"> | undefined;
      let player2Username: string | undefined;
      let player2ParticipantId: Id<"tournamentParticipants"> | undefined;
      let player1SourceMatchId: Id<"tournamentMatches"> | undefined;
      let player2SourceMatchId: Id<"tournamentMatches"> | undefined;
      let status: "pending" | "ready" = "pending";

      if (round === 1) {
        // First round - assign players from bracket positions
        const pos1 = (matchNum - 1) * 2 + 1;
        const pos2 = (matchNum - 1) * 2 + 2;

        const p1 = positionToParticipant.get(pos1);
        const p2 = positionToParticipant.get(pos2);

        if (p1) {
          player1Id = p1.userId;
          player1Username = p1.username;
          player1ParticipantId = p1._id;
        }
        if (p2) {
          player2Id = p2.userId;
          player2Username = p2.username;
          player2ParticipantId = p2._id;
        }

        // Handle byes (when we have fewer players than bracket size)
        if (player1Id && player2Id) {
          status = "ready";
        } else if (player1Id && !player2Id) {
          // Player 1 gets a bye - will be handled after all matches created
          status = "ready";
        } else if (!player1Id && player2Id) {
          // Player 2 gets a bye - will be handled after all matches created
          status = "ready";
        }
      } else {
        // Later rounds - set source matches
        const prevRoundMatches = matchesByRound.get(round - 1);
        if (prevRoundMatches) {
          const sourceMatch1Index = (matchNum - 1) * 2;
          const sourceMatch2Index = (matchNum - 1) * 2 + 1;

          if (prevRoundMatches[sourceMatch1Index]) {
            player1SourceMatchId = prevRoundMatches[sourceMatch1Index];
          }
          if (prevRoundMatches[sourceMatch2Index]) {
            player2SourceMatchId = prevRoundMatches[sourceMatch2Index];
          }
        }
      }

      const matchId = await ctx.db.insert("tournamentMatches", {
        tournamentId,
        round,
        matchNumber: matchNum,
        bracketPosition: bracketPosition++,
        player1Id,
        player1Username,
        player1ParticipantId,
        player2Id,
        player2Username,
        player2ParticipantId,
        player1SourceMatchId,
        player2SourceMatchId,
        status,
        createdAt: now,
        updatedAt: now,
      });

      roundMatches.push(matchId);
    }

    matchesByRound.set(round, roundMatches);
  }

  // Handle byes in first round
  const firstRoundMatches = matchesByRound.get(1) || [];
  for (const matchId of firstRoundMatches) {
    const match = await ctx.db.get(matchId);
    if (!match) continue;

    // Check for byes
    if (match.player1Id && !match.player2Id) {
      // Player 1 gets a bye - auto-advance
      await completeMatchInternal(ctx, matchId, match.player1Id, match.player1Id, "bye");
    } else if (!match.player1Id && match.player2Id) {
      // Player 2 gets a bye - auto-advance
      await completeMatchInternal(ctx, matchId, match.player2Id, match.player2Id, "bye");
    } else if (match.player1Id && match.player2Id) {
      // Both players present - create game lobby
      await createMatchGameLobby(ctx, matchId);
    }
  }
}

/**
 * Create game lobby for a tournament match
 */
async function createMatchGameLobby(ctx: MutationCtx, matchId: Id<"tournamentMatches">) {
  const match = await ctx.db.get(matchId);
  if (!match || !match.player1Id || !match.player2Id) return;

  const tournament = await ctx.db.get(match.tournamentId);
  if (!tournament) return;

  const player1 = await ctx.db.get(match.player1Id);
  const player2 = await ctx.db.get(match.player2Id);
  if (!player1 || !player2) return;

  const now = Date.now();
  const gameId = crypto.randomUUID();
  const goesFirst = Math.random() < 0.5 ? match.player1Id : match.player2Id;

  const player1Rating =
    tournament.mode === "ranked" ? player1.rankedElo || 1000 : player1.casualRating || 1000;
  const player2Rating =
    tournament.mode === "ranked" ? player2.rankedElo || 1000 : player2.casualRating || 1000;

  // Get player deck archetype (for lobby display)
  const player1Deck = player1.activeDeckId ? await ctx.db.get(player1.activeDeckId) : null;

  const lobbyId = await ctx.db.insert("gameLobbies", {
    hostId: match.player1Id,
    hostUsername: player1.username || player1.name || "Unknown",
    hostRank: getRankFromRating(player1Rating),
    hostRating: player1Rating,
    deckArchetype: player1Deck?.deckArchetype || "fire",
    mode: tournament.mode,
    status: "waiting", // Players need to join
    isPrivate: true, // Tournament matches are private
    opponentId: match.player2Id,
    opponentUsername: player2.username || player2.name || "Unknown",
    opponentRank: getRankFromRating(player2Rating),
    gameId,
    currentTurnPlayerId: goesFirst,
    turnStartedAt: now,
    lastMoveAt: now,
    turnNumber: 1,
    createdAt: now,
    allowSpectators: true,
  });

  // Update match with lobby info
  await ctx.db.patch(matchId, {
    lobbyId,
    gameId,
    status: "active",
    startedAt: now,
    updatedAt: now,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateTotalRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount));
}

function calculatePlacement(eliminatedInRound: number, totalRounds: number): number {
  // Round 1 loss = tied for last
  // Semi-final loss = 3rd-4th
  // Final loss = 2nd
  const roundsFromFinal = totalRounds - eliminatedInRound;

  if (roundsFromFinal === 0) return 2; // Lost final
  if (roundsFromFinal === 1) return 3; // Lost semi-final (3rd or 4th)

  // For earlier rounds, calculate based on bracket size
  return 2 ** roundsFromFinal + 1;
}

function getRoundName(round: number, totalRounds: number): string {
  const roundsFromFinal = totalRounds - round;

  if (roundsFromFinal === 0) return "Finals";
  if (roundsFromFinal === 1) return "Semifinals";
  if (roundsFromFinal === 2) return "Quarterfinals";

  return `Round ${round}`;
}

function getPlacementString(placement: number): string {
  if (placement === 1) return "1st Place";
  if (placement === 2) return "2nd Place";
  if (placement === 3) return "3rd Place";
  if (placement === 4) return "4th Place";
  return `${placement}th Place`;
}

/**
 * Generate seeded bracket positions for fair matchups
 * Uses standard tournament seeding where:
 * - Seed 1 plays lowest seed in their bracket half
 * - Seed 2 plays lowest seed in other bracket half
 * - Seeds are distributed to ensure top seeds meet latest if both advance
 */
function generateSeedPositions(bracketSize: number): number[] {
  const positions: number[] = [];

  // Generate standard seeding order
  // For 8 players: [1,8,4,5,2,7,3,6]
  // For 16 players: [1,16,8,9,4,13,5,12,2,15,7,10,3,14,6,11]
  const generateSeeds = (start: number, end: number): number[] => {
    if (end - start < 1) return [start];
    if (end - start === 1) return [start, end];

    const mid = Math.floor((start + end) / 2);
    const left = generateSeeds(start, mid);
    const right = generateSeeds(mid + 1, end);

    const result: number[] = [];
    for (let i = 0; i < left.length; i++) {
      const leftSeed = left[i];
      const rightSeed = right[right.length - 1 - i];
      if (leftSeed !== undefined) result.push(leftSeed);
      if (rightSeed !== undefined) result.push(rightSeed);
    }
    return result;
  };

  const seedOrder = generateSeeds(1, bracketSize);

  // Convert seeds to bracket positions
  // Seed 1 goes to position determined by seedOrder
  for (const seed of seedOrder) {
    positions.push(seed);
  }

  return positions;
}
