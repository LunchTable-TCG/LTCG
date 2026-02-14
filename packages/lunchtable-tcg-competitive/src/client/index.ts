import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = {
  runQuery: GenericQueryCtx<GenericDataModel>["runQuery"];
};

type RunMutationCtx = {
  runMutation: GenericMutationCtx<GenericDataModel>["runMutation"];
};

export type { RunQueryCtx, RunMutationCtx };

// Re-export the component API type for UseApi
export type { api };

/**
 * Client for the @lunchtable-tcg/competitive Convex component.
 *
 * Combines leaderboard and tournament functionality into a single component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGCompetitive } from "@lunchtable-tcg/competitive";
 *
 * const competitive = new LTCGCompetitive(components.ltcgCompetitive);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await competitive.rankings.getTopPlayers(ctx, { ... });
 *     await competitive.tournaments.create(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGCompetitive {
  // Leaderboard sub-clients
  public rankings: RankingsClient;
  public snapshots: SnapshotsClient;
  public matches: MatchesClient;

  // Tournament sub-clients
  public tournaments: TournamentsClient;
  public participants: ParticipantsClient;
  public brackets: BracketsClient;
  public history: HistoryClient;

  constructor(private component: typeof api) {
    this.rankings = new RankingsClient(component);
    this.snapshots = new SnapshotsClient(component);
    this.matches = new MatchesClient(component);
    this.tournaments = new TournamentsClient(component);
    this.participants = new ParticipantsClient(component);
    this.brackets = new BracketsClient(component);
    this.history = new HistoryClient(component);
  }
}

/**
 * Client for leaderboard rankings operations.
 */
export class RankingsClient {
  constructor(private component: typeof api) {}

  async getTopPlayers(
    ctx: RunQueryCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerSegment?: "all" | "humans" | "ai";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getTopPlayers, args);
  }

  async getPlayerRank(
    ctx: RunQueryCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerId: string;
      playerSegment?: "all" | "humans" | "ai";
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getPlayerRank, args);
  }

  async getAroundPlayer(
    ctx: RunQueryCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerId: string;
      playerSegment?: "all" | "humans" | "ai";
      range?: number;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getAroundPlayer, args);
  }

  async getLeaderboard(
    ctx: RunQueryCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerSegment?: "all" | "humans" | "ai";
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getLeaderboard, args);
  }
}

/**
 * Client for leaderboard snapshots operations.
 */
export class SnapshotsClient {
  constructor(private component: typeof api) {}

  async createSnapshot(
    ctx: RunMutationCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerSegment: "all" | "humans" | "ai";
      rankings: Array<{
        userId: string;
        username: string;
        rank: number;
        rating: number;
        level?: number;
        wins: number;
        losses: number;
        winRate: number;
        isAiAgent: boolean;
      }>;
    }
  ) {
    return await ctx.runMutation(this.component.snapshots.createSnapshot, args);
  }

  async getSnapshots(
    ctx: RunQueryCtx,
    args?: {
      leaderboardType?: "ranked" | "casual" | "story";
      playerSegment?: "all" | "humans" | "ai";
    }
  ) {
    return await ctx.runQuery(this.component.snapshots.getSnapshots, args ?? {});
  }

  async getSnapshotById(
    ctx: RunQueryCtx,
    args: {
      id: string;
    }
  ) {
    return await ctx.runQuery(this.component.snapshots.getSnapshotById, {
      id: args.id as any,
    });
  }

  async getSnapshot(
    ctx: RunQueryCtx,
    args: {
      leaderboardType: "ranked" | "casual" | "story";
      playerSegment: "all" | "humans" | "ai";
    }
  ) {
    return await ctx.runQuery(this.component.snapshots.getSnapshot, args);
  }
}

/**
 * Client for match history operations.
 */
export class MatchesClient {
  constructor(private component: typeof api) {}

  async recordMatch(
    ctx: RunMutationCtx,
    args: {
      winnerId: string;
      loserId: string;
      gameType: "ranked" | "casual" | "story";
      winnerRatingBefore: number;
      winnerRatingAfter: number;
      loserRatingBefore: number;
      loserRatingAfter: number;
      xpAwarded?: number;
    }
  ) {
    return await ctx.runMutation(this.component.matches.recordMatch, args);
  }

  async getPlayerMatches(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      gameType?: "ranked" | "casual" | "story";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.matches.getPlayerMatches, args);
  }

  async getRecentMatches(
    ctx: RunQueryCtx,
    args?: {
      gameType?: "ranked" | "casual" | "story";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.matches.getRecentMatches, args ?? {});
  }

  async getHeadToHead(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      opponentId: string;
      gameType?: "ranked" | "casual" | "story";
    }
  ) {
    return await ctx.runQuery(this.component.matches.getHeadToHead, args);
  }
}

/**
 * Client for tournament management.
 */
export class TournamentsClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      name: string;
      description?: string;
      format: "single_elimination";
      maxPlayers: 4 | 8 | 16 | 32;
      entryFee: number;
      mode: "ranked" | "casual";
      prizePool: {
        first: number;
        second: number;
        thirdFourth: number;
      };
      registrationStartsAt: number;
      registrationEndsAt: number;
      checkInStartsAt: number;
      checkInEndsAt: number;
      scheduledStartAt: number;
      createdBy: string;
      creatorType?: "admin" | "user";
      visibility?: "public" | "private";
      joinCode?: string;
      autoStartOnFull?: boolean;
      expiresAt?: number;
    }
  ) {
    return await ctx.runMutation(this.component.tournaments.create, args);
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.tournaments.getById, {
      id: args.id as any,
    });
  }

  async getActive(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.tournaments.getActive, {});
  }

  async getByCreator(
    ctx: RunQueryCtx,
    args: {
      createdBy: string;
      status?: "registration" | "checkin" | "active" | "completed" | "cancelled";
    }
  ) {
    return await ctx.runQuery(this.component.tournaments.getByCreator, args);
  }

  async updateStatus(
    ctx: RunMutationCtx,
    args: {
      id: string;
      status: "registration" | "checkin" | "active" | "completed" | "cancelled";
    }
  ) {
    return await ctx.runMutation(this.component.tournaments.updateStatus, {
      id: args.id as any,
      status: args.status,
    });
  }

  async updateSettings(
    ctx: RunMutationCtx,
    args: {
      id: string;
      settings: {
        name?: string;
        description?: string;
        registrationStartsAt?: number;
        registrationEndsAt?: number;
        checkInStartsAt?: number;
        checkInEndsAt?: number;
        scheduledStartAt?: number;
        visibility?: "public" | "private";
        autoStartOnFull?: boolean;
        expiresAt?: number;
      };
    }
  ) {
    return await ctx.runMutation(this.component.tournaments.updateSettings, {
      id: args.id as any,
      settings: args.settings,
    });
  }

  async advanceRound(ctx: RunMutationCtx, args: { id: string }) {
    return await ctx.runMutation(this.component.tournaments.advanceRound, {
      id: args.id as any,
    });
  }
}

/**
 * Client for tournament participant management.
 */
export class ParticipantsClient {
  constructor(private component: typeof api) {}

  async register(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
      username: string;
      seedRating: number;
    }
  ) {
    return await ctx.runMutation(this.component.participants.register, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
      username: args.username,
      seedRating: args.seedRating,
    });
  }

  async unregister(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.participants.unregister, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
    });
  }

  async getParticipants(ctx: RunQueryCtx, args: { tournamentId: string }) {
    return await ctx.runQuery(this.component.participants.getParticipants, {
      tournamentId: args.tournamentId as any,
    });
  }

  async getUserTournaments(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(
      this.component.participants.getUserTournaments,
      args
    );
  }

  async updateStatus(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
      status: "registered" | "checked_in" | "active" | "eliminated" | "winner" | "forfeit" | "refunded";
      currentRound?: number;
      eliminatedInRound?: number;
      finalPlacement?: number;
    }
  ) {
    return await ctx.runMutation(this.component.participants.updateStatus, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
      status: args.status,
      currentRound: args.currentRound,
      eliminatedInRound: args.eliminatedInRound,
      finalPlacement: args.finalPlacement,
    });
  }

  async eliminate(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
      eliminatedInRound: number;
    }
  ) {
    return await ctx.runMutation(this.component.participants.eliminate, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
      eliminatedInRound: args.eliminatedInRound,
    });
  }

  async checkIn(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
    }
  ) {
    return await ctx.runMutation(this.component.participants.checkIn, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
    });
  }

  async awardPrize(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      userId: string;
      prizeAmount: number;
    }
  ) {
    return await ctx.runMutation(this.component.participants.awardPrize, {
      tournamentId: args.tournamentId as any,
      userId: args.userId,
      prizeAmount: args.prizeAmount,
    });
  }
}

/**
 * Client for tournament bracket and match management.
 */
export class BracketsClient {
  constructor(private component: typeof api) {}

  async createMatch(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      round: number;
      matchNumber: number;
      bracketPosition: number;
      player1Id?: string;
      player1Username?: string;
      player1ParticipantId?: string;
      player2Id?: string;
      player2Username?: string;
      player2ParticipantId?: string;
      player1SourceMatchId?: string;
      player2SourceMatchId?: string;
      scheduledAt?: number;
    }
  ) {
    return await ctx.runMutation(this.component.brackets.createMatch, {
      tournamentId: args.tournamentId as any,
      round: args.round,
      matchNumber: args.matchNumber,
      bracketPosition: args.bracketPosition,
      player1Id: args.player1Id,
      player1Username: args.player1Username,
      player1ParticipantId: args.player1ParticipantId as any,
      player2Id: args.player2Id,
      player2Username: args.player2Username,
      player2ParticipantId: args.player2ParticipantId as any,
      player1SourceMatchId: args.player1SourceMatchId as any,
      player2SourceMatchId: args.player2SourceMatchId as any,
      scheduledAt: args.scheduledAt,
    });
  }

  async getMatches(ctx: RunQueryCtx, args: { tournamentId: string }) {
    return await ctx.runQuery(this.component.brackets.getMatches, {
      tournamentId: args.tournamentId as any,
    });
  }

  async getMatchById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.brackets.getMatchById, {
      id: args.id as any,
    });
  }

  async getRoundMatches(
    ctx: RunQueryCtx,
    args: {
      tournamentId: string;
      round: number;
    }
  ) {
    return await ctx.runQuery(this.component.brackets.getRoundMatches, {
      tournamentId: args.tournamentId as any,
      round: args.round,
    });
  }

  async reportResult(
    ctx: RunMutationCtx,
    args: {
      id: string;
      winnerId: string;
      winnerUsername: string;
      loserId?: string;
      loserUsername?: string;
      winReason?: "game_win" | "opponent_forfeit" | "opponent_no_show" | "bye";
      gameId?: string;
    }
  ) {
    return await ctx.runMutation(this.component.brackets.reportResult, {
      id: args.id as any,
      winnerId: args.winnerId,
      winnerUsername: args.winnerUsername,
      loserId: args.loserId,
      loserUsername: args.loserUsername,
      winReason: args.winReason,
      gameId: args.gameId,
    });
  }

  async advanceBracket(
    ctx: RunMutationCtx,
    args: {
      matchId: string;
      nextMatchId: string;
    }
  ) {
    return await ctx.runMutation(this.component.brackets.advanceBracket, {
      matchId: args.matchId as any,
      nextMatchId: args.nextMatchId as any,
    });
  }

  async updateMatchStatus(
    ctx: RunMutationCtx,
    args: {
      id: string;
      status: "pending" | "ready" | "active" | "completed" | "forfeit";
    }
  ) {
    return await ctx.runMutation(this.component.brackets.updateMatchStatus, {
      id: args.id as any,
      status: args.status,
    });
  }
}

/**
 * Client for tournament history tracking.
 */
export class HistoryClient {
  constructor(private component: typeof api) {}

  async recordHistory(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      tournamentId: string;
      tournamentName: string;
      maxPlayers: number;
      placement: number;
      prizeWon: number;
      matchesPlayed: number;
      matchesWon: number;
    }
  ) {
    return await ctx.runMutation(this.component.history.recordHistory, {
      userId: args.userId,
      tournamentId: args.tournamentId as any,
      tournamentName: args.tournamentName,
      maxPlayers: args.maxPlayers,
      placement: args.placement,
      prizeWon: args.prizeWon,
      matchesPlayed: args.matchesPlayed,
      matchesWon: args.matchesWon,
    });
  }

  async getUserHistory(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.history.getUserHistory, args);
  }

  async getRecentHistory(ctx: RunQueryCtx, args?: { limit?: number }) {
    return await ctx.runQuery(this.component.history.getRecentHistory, args ?? {});
  }

  async getTournamentHistory(ctx: RunQueryCtx, args: { tournamentId: string }) {
    return await ctx.runQuery(this.component.history.getTournamentHistory, {
      tournamentId: args.tournamentId as any,
    });
  }

  async getUserStats(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.history.getUserStats, args);
  }
}
