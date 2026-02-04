/**
 * Tournament Admin Module
 *
 * CRUD operations for managing tournaments with participant management.
 * Requires admin role or higher.
 */

import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { adjustPlayerCurrencyHelper } from "../economy/economy";
import { mutation } from "../functions";
import { requireAuthMutation, requireAuthQuery } from "../lib/convexAuth";
import { ErrorCode, createError } from "../lib/errorCodes";
import { scheduleAuditLog } from "../lib/internalHelpers";
import { tournamentPrizePoolValidator, tournamentStatusValidator } from "../lib/returnValidators";
import { requireRole } from "../lib/roles";

// =============================================================================
// Types & Validators
// =============================================================================

const tournamentFormatValidator = v.literal("single_elimination");
const tournamentModeValidator = v.union(v.literal("ranked"), v.literal("casual"));
const maxPlayersValidator = v.union(v.literal(8), v.literal(16), v.literal(32));

// =============================================================================
// ADMIN QUERIES
// =============================================================================

/**
 * List all tournaments with filters
 * Returns tournaments with participant counts, prize pools, and metadata
 */
export const listTournaments = query({
  args: {
    status: v.optional(tournamentStatusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const tournaments = await (async () => {
      if (args.status) {
        return await ctx.db
          .query("tournaments")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .collect();
      }
      return await ctx.db.query("tournaments").collect();
    })();

    type Tournament = (typeof tournaments)[number];

    // Sort by creation date descending (newest first)
    tournaments.sort((a: Tournament, b: Tournament) => b.createdAt - a.createdAt);

    // Apply pagination
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    const paginated = tournaments.slice(offset, offset + limit);

    // Enrich with additional data
    const enriched = await Promise.all(
      paginated.map(async (t: Tournament) => {
        const creator = await ctx.db.get(t.createdBy);

        // Calculate total prize distributed (for completed tournaments)
        let totalPrizeDistributed = 0;
        if (t.status === "completed") {
          const participants = await ctx.db
            .query("tournamentParticipants")
            .withIndex("by_tournament", (q) => q.eq("tournamentId", t._id))
            .collect();
          totalPrizeDistributed = participants.reduce((sum, p) => sum + (p.prizeAwarded || 0), 0);
        }

        // Calculate potential total prize
        const potentialPrize = t.prizePool.first + t.prizePool.second + t.prizePool.thirdFourth * 2;

        return {
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
          checkInStartsAt: t.checkInStartsAt,
          checkInEndsAt: t.checkInEndsAt,
          scheduledStartAt: t.scheduledStartAt,
          actualStartedAt: t.actualStartedAt,
          completedAt: t.completedAt,
          currentRound: t.currentRound,
          totalRounds: t.totalRounds,
          registeredCount: t.registeredCount,
          checkedInCount: t.checkedInCount,
          winnerId: t.winnerId,
          winnerUsername: t.winnerUsername,
          secondPlaceId: t.secondPlaceId,
          secondPlaceUsername: t.secondPlaceUsername,
          createdBy: t.createdBy,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          // Enriched fields
          creatorUsername: (creator as Doc<"users"> | null)?.username || "Unknown",
          potentialPrize,
          totalPrizeDistributed,
        };
      })
    );

    return {
      tournaments: enriched,
      totalCount: tournaments.length,
      hasMore: offset + limit < tournaments.length,
    };
  },
});

/**
 * Get tournament details for admin
 * Returns full tournament details with participants, matches, and stats
 */
export const getTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, { tournamentId }) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const tournament = await ctx.db.get(tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Get creator info
    const creator = await ctx.db.get(tournament.createdBy);

    // Get all participants
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    // Get all matches
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournamentId))
      .collect();

    // Calculate stats
    const stats = {
      registeredCount: participants.filter((p) => p.status !== "refunded").length,
      checkedInCount: participants.filter(
        (p) =>
          p.status === "checked_in" ||
          p.status === "active" ||
          p.status === "eliminated" ||
          p.status === "winner"
      ).length,
      activeCount: participants.filter((p) => p.status === "active").length,
      eliminatedCount: participants.filter((p) => p.status === "eliminated").length,
      forfeitCount: participants.filter((p) => p.status === "forfeit").length,
      refundedCount: participants.filter((p) => p.status === "refunded").length,
      totalMatchesPlayed: matches.filter((m) => m.status === "completed" || m.status === "forfeit")
        .length,
      pendingMatches: matches.filter((m) => m.status === "pending" || m.status === "ready").length,
      activeMatches: matches.filter((m) => m.status === "active").length,
      totalPrizeDistributed: participants.reduce((sum, p) => sum + (p.prizeAwarded || 0), 0),
      potentialPrize:
        tournament.prizePool.first +
        tournament.prizePool.second +
        tournament.prizePool.thirdFourth * 2,
      totalEntryFees: tournament.entryFee * tournament.registeredCount,
    };

    // Enrich participants with user data
    const enrichedParticipants = await Promise.all(
      participants.map(async (p) => {
        const user = await ctx.db.get(p.userId);
        return {
          ...p,
          currentElo: tournament.mode === "ranked" ? user?.rankedElo : user?.casualRating,
        };
      })
    );

    return {
      ...tournament,
      creatorUsername: creator?.username || "Unknown",
      stats,
      participants: enrichedParticipants,
      matches: matches.sort((a, b) => {
        // Sort by round, then match number
        if (a.round !== b.round) return a.round - b.round;
        return a.matchNumber - b.matchNumber;
      }),
    };
  },
});

/**
 * Get tournament statistics across all tournaments
 * Returns aggregate stats for admin dashboard
 */
export const getTournamentStats = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const tournaments = await ctx.db.query("tournaments").collect();

    const totalTournaments = tournaments.length;
    const activeTournaments = tournaments.filter(
      (t) => t.status === "registration" || t.status === "checkin" || t.status === "active"
    ).length;
    const completedTournaments = tournaments.filter((t) => t.status === "completed").length;
    const cancelledTournaments = tournaments.filter((t) => t.status === "cancelled").length;

    // Calculate total prize distributed
    let totalPrizeDistributed = 0;
    let totalEntryFeesCollected = 0;

    for (const t of tournaments.filter((t) => t.status === "completed")) {
      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", t._id))
        .collect();
      totalPrizeDistributed += participants.reduce((sum, p) => sum + (p.prizeAwarded || 0), 0);
      totalEntryFeesCollected += t.entryFee * t.registeredCount;
    }

    // Get status breakdown
    const statusCounts = {
      registration: tournaments.filter((t) => t.status === "registration").length,
      checkin: tournaments.filter((t) => t.status === "checkin").length,
      active: tournaments.filter((t) => t.status === "active").length,
      completed: completedTournaments,
      cancelled: cancelledTournaments,
    };

    // Get recent tournaments (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentTournaments = tournaments.filter((t) => t.createdAt >= weekAgo).length;

    return {
      totalTournaments,
      activeTournaments,
      completedTournaments,
      cancelledTournaments,
      totalPrizeDistributed,
      totalEntryFeesCollected,
      statusCounts,
      recentTournaments,
    };
  },
});

/**
 * Get tournament leaderboard
 * Shows participants sorted by placement or current round
 */
export const getTournamentLeaderboard = query({
  args: {
    tournamentId: v.id("tournaments"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuthQuery(ctx);
    await requireRole(ctx, userId, "moderator");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Sort: winner first, then by final placement, then by current round (desc), then by seed rating
    const sorted = participants
      .filter((p) => p.status !== "refunded")
      .sort((a, b) => {
        // Winner always first
        if (a.status === "winner") return -1;
        if (b.status === "winner") return 1;

        // Then by final placement (lower is better)
        if (a.finalPlacement && b.finalPlacement) {
          return a.finalPlacement - b.finalPlacement;
        }
        if (a.finalPlacement) return -1;
        if (b.finalPlacement) return 1;

        // Active players by current round (higher is better)
        if (a.currentRound && b.currentRound) {
          return b.currentRound - a.currentRound;
        }

        // Fall back to seed rating
        return b.seedRating - a.seedRating;
      });

    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;
    const paginated = sorted.slice(offset, offset + limit);

    // Count matches for each participant
    const matches = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const leaderboard = paginated.map((p, index) => {
      const playerMatches = matches.filter(
        (m) => m.player1Id === p.userId || m.player2Id === p.userId
      );
      const matchesPlayed = playerMatches.filter(
        (m) => m.status === "completed" || m.status === "forfeit"
      ).length;
      const matchesWon = playerMatches.filter((m) => m.winnerId === p.userId).length;

      return {
        rank: offset + index + 1,
        participantId: p._id,
        userId: p.userId,
        username: p.username,
        status: p.status,
        seedRating: p.seedRating,
        currentRound: p.currentRound,
        finalPlacement: p.finalPlacement,
        prizeAwarded: p.prizeAwarded,
        matchesPlayed,
        matchesWon,
        winRate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
      };
    });

    return {
      leaderboard,
      totalCount: sorted.length,
      hasMore: offset + limit < sorted.length,
    };
  },
});

// =============================================================================
// ADMIN MUTATIONS
// =============================================================================

/**
 * Create a new tournament (admin only)
 * Uses enhanced validation and audit logging
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    format: v.optional(tournamentFormatValidator),
    maxPlayers: maxPlayersValidator,
    entryFee: v.number(),
    mode: tournamentModeValidator,
    prizePool: tournamentPrizePoolValidator,
    registrationStartsAt: v.number(),
    registrationEndsAt: v.number(),
    scheduledStartAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const now = Date.now();

    // Validate name
    if (args.name.length < 3 || args.name.length > 100) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Tournament name must be between 3 and 100 characters",
      });
    }

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

    // Calculate check-in window
    const MIN_CHECKIN_DURATION_MS = 15 * 60 * 1000; // 15 minutes
    const BRACKET_GENERATION_BUFFER_MS = 1 * 60 * 1000; // 1 minute
    const checkInStartsAt = args.registrationEndsAt;
    const checkInEndsAt = args.scheduledStartAt - BRACKET_GENERATION_BUFFER_MS;

    if (checkInEndsAt - checkInStartsAt < MIN_CHECKIN_DURATION_MS) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason:
          "Check-in period must be at least 15 minutes. Increase time between registration end and scheduled start.",
      });
    }

    // Validate entry fee
    if (args.entryFee < 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Entry fee cannot be negative",
      });
    }

    // Validate prize pool
    if (args.prizePool.first < 0 || args.prizePool.second < 0 || args.prizePool.thirdFourth < 0) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Prize amounts cannot be negative",
      });
    }

    const totalPrizes =
      args.prizePool.first + args.prizePool.second + args.prizePool.thirdFourth * 2;
    const totalEntryFees = args.entryFee * args.maxPlayers;

    // Warn if prize pool exceeds entry fees (admin adding extra prizes)
    const prizeExceedsEntryFees = totalPrizes > totalEntryFees && args.entryFee > 0;

    const format = args.format ?? "single_elimination";

    // Create tournament
    const tournamentId = await ctx.db.insert("tournaments", {
      name: args.name,
      description: args.description,
      format,
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
      createdBy: adminId,
      createdAt: now,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "create_tournament",
      metadata: {
        tournamentId,
        name: args.name,
        maxPlayers: args.maxPlayers,
        entryFee: args.entryFee,
        mode: args.mode,
        totalPrizes,
        prizeExceedsEntryFees,
      },
      success: true,
    });

    return {
      tournamentId,
      message: `Created tournament "${args.name}"`,
      warning: prizeExceedsEntryFees
        ? `Prize pool (${totalPrizes}) exceeds max entry fees (${totalEntryFees})`
        : undefined,
    };
  },
});

/**
 * Update tournament settings (only before it starts)
 * Allows updating name, description, timing, and prize pool
 */
export const updateTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    updates: v.object({
      name: v.optional(v.string()),
      description: v.optional(v.string()),
      entryFee: v.optional(v.number()),
      prizePool: v.optional(tournamentPrizePoolValidator),
      registrationStartsAt: v.optional(v.number()),
      registrationEndsAt: v.optional(v.number()),
      scheduledStartAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Only allow updates during registration phase
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot update tournament in "${tournament.status}" status. Only tournaments in registration phase can be updated.`,
      });
    }

    const now = Date.now();
    const updateData: Partial<Doc<"tournaments">> = { updatedAt: now };
    const updatedFields: string[] = [];

    // Process each update
    if (args.updates.name !== undefined) {
      if (args.updates.name.length < 3 || args.updates.name.length > 100) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Tournament name must be between 3 and 100 characters",
        });
      }
      updateData.name = args.updates.name;
      updatedFields.push("name");
    }

    if (args.updates.description !== undefined) {
      updateData.description = args.updates.description;
      updatedFields.push("description");
    }

    if (args.updates.entryFee !== undefined) {
      if (args.updates.entryFee < 0) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Entry fee cannot be negative",
        });
      }
      // Don't allow entry fee changes if anyone has registered
      if (tournament.registeredCount > 0) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Cannot change entry fee after players have registered",
        });
      }
      updateData.entryFee = args.updates.entryFee;
      updatedFields.push("entryFee");
    }

    if (args.updates.prizePool !== undefined) {
      if (
        args.updates.prizePool.first < 0 ||
        args.updates.prizePool.second < 0 ||
        args.updates.prizePool.thirdFourth < 0
      ) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Prize amounts cannot be negative",
        });
      }
      updateData.prizePool = args.updates.prizePool;
      updatedFields.push("prizePool");
    }

    // Handle timing updates
    const MIN_CHECKIN_DURATION_MS = 15 * 60 * 1000;
    const BRACKET_GENERATION_BUFFER_MS = 1 * 60 * 1000;

    const newRegistrationStartsAt =
      args.updates.registrationStartsAt ?? tournament.registrationStartsAt;
    const newRegistrationEndsAt = args.updates.registrationEndsAt ?? tournament.registrationEndsAt;
    const newScheduledStartAt = args.updates.scheduledStartAt ?? tournament.scheduledStartAt;

    // Validate timing if any timing field changed
    if (
      args.updates.registrationStartsAt !== undefined ||
      args.updates.registrationEndsAt !== undefined ||
      args.updates.scheduledStartAt !== undefined
    ) {
      if (newRegistrationStartsAt >= newRegistrationEndsAt) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Registration start must be before registration end",
        });
      }
      if (newRegistrationEndsAt >= newScheduledStartAt) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Registration must end before tournament starts",
        });
      }

      const newCheckInStartsAt = newRegistrationEndsAt;
      const newCheckInEndsAt = newScheduledStartAt - BRACKET_GENERATION_BUFFER_MS;

      if (newCheckInEndsAt - newCheckInStartsAt < MIN_CHECKIN_DURATION_MS) {
        throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
          reason: "Check-in period must be at least 15 minutes",
        });
      }

      if (args.updates.registrationStartsAt !== undefined) {
        updateData.registrationStartsAt = args.updates.registrationStartsAt;
        updatedFields.push("registrationStartsAt");
      }
      if (args.updates.registrationEndsAt !== undefined) {
        updateData.registrationEndsAt = args.updates.registrationEndsAt;
        updateData.checkInStartsAt = newCheckInStartsAt;
        updatedFields.push("registrationEndsAt");
      }
      if (args.updates.scheduledStartAt !== undefined) {
        updateData.scheduledStartAt = args.updates.scheduledStartAt;
        updateData.checkInEndsAt = newCheckInEndsAt;
        updatedFields.push("scheduledStartAt");
      }
    }

    if (updatedFields.length === 0) {
      return { success: true, message: "No changes made" };
    }

    await ctx.db.patch(args.tournamentId, updateData);

    await scheduleAuditLog(ctx, {
      adminId,
      action: "update_tournament",
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        updatedFields,
      },
      success: true,
    });

    return {
      success: true,
      message: `Updated tournament "${tournament.name}": ${updatedFields.join(", ")}`,
    };
  },
});

/**
 * Cancel a tournament
 * Cancels the tournament and refunds entry fees to all participants
 */
export const cancelTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Can't cancel already completed or cancelled tournaments
    if (tournament.status === "completed") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Cannot cancel a completed tournament",
      });
    }
    if (tournament.status === "cancelled") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Tournament is already cancelled",
      });
    }

    const now = Date.now();
    let refundedCount = 0;
    let totalRefunded = 0;

    // Refund all participants
    if (tournament.entryFee > 0) {
      const participants = await ctx.db
        .query("tournamentParticipants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .collect();

      for (const participant of participants) {
        if (participant.status !== "refunded") {
          await adjustPlayerCurrencyHelper(ctx, {
            userId: participant.userId,
            goldDelta: tournament.entryFee,
            transactionType: "refund",
            description: `Tournament cancelled: ${tournament.name} - ${args.reason}`,
            referenceId: args.tournamentId,
          });

          await ctx.db.patch(participant._id, {
            status: "refunded",
          });

          refundedCount++;
          totalRefunded += tournament.entryFee;
        }
      }
    }

    // Update tournament status
    await ctx.db.patch(args.tournamentId, {
      status: "cancelled",
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "cancel_tournament",
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        reason: args.reason,
        refundedCount,
        totalRefunded,
        previousStatus: tournament.status,
      },
      success: true,
    });

    return {
      success: true,
      message: `Cancelled tournament "${tournament.name}"`,
      refundedCount,
      totalRefunded,
    };
  },
});

/**
 * Grant free tournament entry to a user
 * Registers a user without charging entry fee
 */
export const grantTournamentEntry = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Can only grant entry during registration
    if (tournament.status !== "registration") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot grant entry - tournament is in "${tournament.status}" status`,
      });
    }

    // Check if tournament is full
    if (tournament.registeredCount >= tournament.maxPlayers) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Tournament is full",
      });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw createError(ErrorCode.NOT_FOUND_USER);
    }

    // Check if already registered
    const existingParticipant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .first();

    if (existingParticipant) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User is already registered for this tournament",
      });
    }

    // Check if user has active deck
    if (!user.activeDeckId) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User must have an active deck to enter tournaments",
      });
    }

    const now = Date.now();
    const username = user.username || user.name || "Unknown";
    const rating =
      tournament.mode === "ranked" ? user.rankedElo || 1000 : user.casualRating || 1000;

    // Create participant record (no entry fee charged)
    const participantId = await ctx.db.insert("tournamentParticipants", {
      tournamentId: args.tournamentId,
      userId: args.userId,
      username,
      registeredAt: now,
      seedRating: rating,
      status: "registered",
    });

    // Update tournament count
    await ctx.db.patch(args.tournamentId, {
      registeredCount: tournament.registeredCount + 1,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "grant_tournament_entry",
      targetUserId: args.userId,
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        participantId,
        reason: args.reason,
        entryFeeWaived: tournament.entryFee,
        username,
      },
      success: true,
    });

    return {
      success: true,
      participantId,
      message: `Granted free entry to "${username}" for tournament "${tournament.name}"`,
      entryFeeWaived: tournament.entryFee,
    };
  },
});

/**
 * Remove participant from tournament
 * Removes a participant and optionally refunds their entry fee
 */
export const removeParticipant = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    reason: v.string(),
    refundEntry: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Find participant
    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User is not a participant in this tournament",
      });
    }

    if (participant.status === "refunded") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Participant has already been removed and refunded",
      });
    }

    const now = Date.now();
    let refundAmount = 0;

    // Handle refund if requested and applicable
    if (args.refundEntry && tournament.entryFee > 0) {
      await adjustPlayerCurrencyHelper(ctx, {
        userId: args.userId,
        goldDelta: tournament.entryFee,
        transactionType: "refund",
        description: `Removed from tournament: ${tournament.name} - ${args.reason}`,
        referenceId: args.tournamentId,
      });
      refundAmount = tournament.entryFee;
    }

    // If tournament is active and player is in a match, handle forfeit
    if (
      tournament.status === "active" &&
      (participant.status === "active" || participant.status === "checked_in")
    ) {
      // Find any active/ready matches this player is in
      const matches = await ctx.db
        .query("tournamentMatches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
        .filter((q) =>
          q.and(
            q.or(q.eq(q.field("player1Id"), args.userId), q.eq(q.field("player2Id"), args.userId)),
            q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "ready"))
          )
        )
        .collect();

      for (const match of matches) {
        // Forfeit the match - opponent wins
        const winnerId = match.player1Id === args.userId ? match.player2Id : match.player1Id;
        if (winnerId) {
          const winner = await ctx.db.get(winnerId);
          await ctx.db.patch(match._id, {
            status: "forfeit",
            winnerId,
            winnerUsername: winner?.username || winner?.name,
            loserId: args.userId,
            loserUsername: participant.username,
            winReason: "opponent_forfeit",
            completedAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // Update participant status
    await ctx.db.patch(participant._id, {
      status: "refunded",
    });

    // Update tournament count
    await ctx.db.patch(args.tournamentId, {
      registeredCount: Math.max(0, tournament.registeredCount - 1),
      checkedInCount:
        participant.status === "checked_in" || participant.status === "active"
          ? Math.max(0, tournament.checkedInCount - 1)
          : tournament.checkedInCount,
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "remove_tournament_participant",
      targetUserId: args.userId,
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        participantId: participant._id,
        username: participant.username,
        previousStatus: participant.status,
        reason: args.reason,
        refunded: args.refundEntry,
        refundAmount,
      },
      success: true,
    });

    return {
      success: true,
      message: `Removed "${participant.username}" from tournament "${tournament.name}"`,
      refunded: args.refundEntry,
      refundAmount,
    };
  },
});

/**
 * Force start a tournament
 * Bypasses check-in phase and starts the tournament immediately
 */
export const forceStartTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    // Can only force start registration or checkin tournaments
    if (tournament.status !== "registration" && tournament.status !== "checkin") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot force start - tournament is in "${tournament.status}" status`,
      });
    }

    // Get participants who are registered or checked in
    const participants = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const eligibleParticipants = participants.filter(
      (p) => p.status === "registered" || p.status === "checked_in"
    );

    if (eligibleParticipants.length < 2) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot start tournament with fewer than 2 participants (currently ${eligibleParticipants.length})`,
      });
    }

    const now = Date.now();

    // Mark all registered participants as checked_in
    for (const p of eligibleParticipants) {
      if (p.status === "registered") {
        await ctx.db.patch(p._id, {
          status: "checked_in",
          checkedInAt: now,
        });
      }
    }

    // Mark participants who didn't register/check-in as forfeit (shouldn't happen in force start)
    const noShowParticipants = participants.filter(
      (p) => p.status !== "registered" && p.status !== "checked_in" && p.status !== "refunded"
    );
    for (const p of noShowParticipants) {
      await ctx.db.patch(p._id, {
        status: "forfeit",
        finalPlacement: tournament.maxPlayers,
      });
    }

    // Update tournament to active status (bracket generation will happen via cron or internal mutation)
    await ctx.db.patch(args.tournamentId, {
      status: "checkin",
      checkInEndsAt: now, // Set check-in to end now, triggering bracket generation
      updatedAt: now,
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "force_start_tournament",
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        reason: args.reason,
        previousStatus: tournament.status,
        eligibleParticipants: eligibleParticipants.length,
      },
      success: true,
    });

    return {
      success: true,
      message: `Force started tournament "${tournament.name}" with ${eligibleParticipants.length} participants`,
      participantCount: eligibleParticipants.length,
    };
  },
});

/**
 * Disqualify a participant from an active tournament
 * Marks them as eliminated with forfeit status
 */
export const disqualifyParticipant = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId: adminId } = await requireAuthMutation(ctx);
    await requireRole(ctx, adminId, "admin");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) {
      throw createError(ErrorCode.NOT_FOUND_GENERAL, { entity: "Tournament" });
    }

    if (tournament.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "Can only disqualify participants in active tournaments",
      });
    }

    const participant = await ctx.db
      .query("tournamentParticipants")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", args.userId)
      )
      .first();

    if (!participant) {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: "User is not a participant in this tournament",
      });
    }

    if (participant.status !== "active") {
      throw createError(ErrorCode.VALIDATION_INVALID_INPUT, {
        reason: `Cannot disqualify participant with status "${participant.status}"`,
      });
    }

    const now = Date.now();

    // Find active/ready match and forfeit it
    const activeMatch = await ctx.db
      .query("tournamentMatches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .filter((q) =>
        q.and(
          q.or(q.eq(q.field("player1Id"), args.userId), q.eq(q.field("player2Id"), args.userId)),
          q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "ready"))
        )
      )
      .first();

    if (activeMatch) {
      const winnerId =
        activeMatch.player1Id === args.userId ? activeMatch.player2Id : activeMatch.player1Id;

      if (winnerId) {
        const winner = await ctx.db.get(winnerId);
        await ctx.db.patch(activeMatch._id, {
          status: "forfeit",
          winnerId,
          winnerUsername: winner?.username || winner?.name,
          loserId: args.userId,
          loserUsername: participant.username,
          winReason: "opponent_forfeit",
          completedAt: now,
          updatedAt: now,
        });
      }
    }

    // Update participant status
    await ctx.db.patch(participant._id, {
      status: "forfeit",
      eliminatedInRound: participant.currentRound,
      finalPlacement: calculateWorstPlacement(tournament.maxPlayers),
    });

    await scheduleAuditLog(ctx, {
      adminId,
      action: "disqualify_tournament_participant",
      targetUserId: args.userId,
      metadata: {
        tournamentId: args.tournamentId,
        tournamentName: tournament.name,
        username: participant.username,
        reason: args.reason,
        currentRound: participant.currentRound,
        hadActiveMatch: !!activeMatch,
      },
      success: true,
    });

    return {
      success: true,
      message: `Disqualified "${participant.username}" from tournament "${tournament.name}"`,
    };
  },
});

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Calculate worst possible placement for disqualified players
 */
function calculateWorstPlacement(maxPlayers: number): number {
  return maxPlayers;
}
