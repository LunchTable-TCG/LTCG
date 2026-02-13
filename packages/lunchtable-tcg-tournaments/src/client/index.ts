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
 * Client for the @lunchtable-tcg/tournaments Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGTournaments } from "@lunchtable-tcg/tournaments/client";
 *
 * const tournaments = new LTCGTournaments(components.ltcgTournaments);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await tournaments.tournaments.create(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGTournaments {
  public tournaments: TournamentsClient;
  public participants: ParticipantsClient;
  public brackets: BracketsClient;
  public history: HistoryClient;

  constructor(private component: typeof api) {
    this.tournaments = new TournamentsClient(component);
    this.participants = new ParticipantsClient(component);
    this.brackets = new BracketsClient(component);
    this.history = new HistoryClient(component);
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
      organizerId: string;
      format: string;
      maxPlayers: number;
      entryFee?: number;
      entryCurrency?: string;
      prizePool?: any;
      startTime: number;
      checkInDeadline?: number;
      totalRounds?: number;
      rules?: any;
      metadata?: any;
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

  async getByOrganizer(ctx: RunQueryCtx, args: { organizerId: string }) {
    return await ctx.runQuery(this.component.tournaments.getByOrganizer, args);
  }

  async updateStatus(
    ctx: RunMutationCtx,
    args: {
      id: string;
      status: string;
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
        maxPlayers?: number;
        entryFee?: number;
        entryCurrency?: string;
        prizePool?: any;
        startTime?: number;
        checkInDeadline?: number;
        totalRounds?: number;
        rules?: any;
        metadata?: any;
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
      playerId: string;
      playerName?: string;
      deckId?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.participants.register, {
      tournamentId: args.tournamentId as any,
      playerId: args.playerId,
      playerName: args.playerName,
      deckId: args.deckId,
      metadata: args.metadata,
    });
  }

  async unregister(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      playerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.participants.unregister, {
      tournamentId: args.tournamentId as any,
      playerId: args.playerId,
    });
  }

  async getParticipants(ctx: RunQueryCtx, args: { tournamentId: string }) {
    return await ctx.runQuery(this.component.participants.getParticipants, {
      tournamentId: args.tournamentId as any,
    });
  }

  async getPlayerTournaments(ctx: RunQueryCtx, args: { playerId: string }) {
    return await ctx.runQuery(
      this.component.participants.getPlayerTournaments,
      args
    );
  }

  async updateResult(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      playerId: string;
      wins?: number;
      losses?: number;
      tiebreaker?: number;
    }
  ) {
    return await ctx.runMutation(this.component.participants.updateResult, {
      tournamentId: args.tournamentId as any,
      playerId: args.playerId,
      wins: args.wins,
      losses: args.losses,
      tiebreaker: args.tiebreaker,
    });
  }

  async eliminate(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      playerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.participants.eliminate, {
      tournamentId: args.tournamentId as any,
      playerId: args.playerId,
    });
  }

  async checkIn(
    ctx: RunMutationCtx,
    args: {
      tournamentId: string;
      playerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.participants.checkIn, {
      tournamentId: args.tournamentId as any,
      playerId: args.playerId,
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
      player1Id?: string;
      player2Id?: string;
      scheduledTime?: number;
      nextMatchId?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.brackets.createMatch, {
      tournamentId: args.tournamentId as any,
      round: args.round,
      matchNumber: args.matchNumber,
      player1Id: args.player1Id,
      player2Id: args.player2Id,
      scheduledTime: args.scheduledTime,
      nextMatchId: args.nextMatchId,
      metadata: args.metadata,
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
      loserId?: string;
      score?: string;
      gameId?: string;
    }
  ) {
    return await ctx.runMutation(this.component.brackets.reportResult, {
      id: args.id as any,
      winnerId: args.winnerId,
      loserId: args.loserId,
      score: args.score,
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
      status: string;
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
      tournamentId: string;
      tournamentName: string;
      playerId: string;
      placement: number;
      wins: number;
      losses: number;
      prizeWon?: any;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.history.recordHistory, args);
  }

  async getPlayerHistory(ctx: RunQueryCtx, args: { playerId: string }) {
    return await ctx.runQuery(this.component.history.getPlayerHistory, args);
  }

  async getRecentHistory(ctx: RunQueryCtx, args?: { limit?: number }) {
    return await ctx.runQuery(this.component.history.getRecentHistory, args ?? {});
  }

  async getTournamentHistory(ctx: RunQueryCtx, args: { tournamentId: string }) {
    return await ctx.runQuery(this.component.history.getTournamentHistory, args);
  }

  async getPlayerStats(ctx: RunQueryCtx, args: { playerId: string }) {
    return await ctx.runQuery(this.component.history.getPlayerStats, args);
  }
}
