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

export type { api };

/**
 * Client for the @lunchtable-tcg/leaderboard Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGLeaderboard } from "@lunchtable-tcg/leaderboard/client";
 *
 * const leaderboard = new LTCGLeaderboard(components.leaderboard);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await leaderboard.rankings.submitScore(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGLeaderboard {
  public rankings: RankingsClient;
  public snapshots: SnapshotsClient;
  public matches: MatchesClient;

  constructor(private component: typeof api) {
    this.rankings = new RankingsClient(component);
    this.snapshots = new SnapshotsClient(component);
    this.matches = new MatchesClient(component);
  }
}

/**
 * Client for leaderboard rankings operations.
 */
export class RankingsClient {
  constructor(private component: typeof api) {}

  async submitScore(
    ctx: RunMutationCtx,
    args: {
      boardId: string;
      playerId: string;
      playerName?: string;
      score: number;
      wins?: number;
      losses?: number;
      streak?: number;
      rating?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.rankings.submitScore, args);
  }

  async getTopPlayers(
    ctx: RunQueryCtx,
    args: {
      boardId: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getTopPlayers, args);
  }

  async getPlayerRank(
    ctx: RunQueryCtx,
    args: {
      boardId: string;
      playerId: string;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getPlayerRank, args);
  }

  async getAroundPlayer(
    ctx: RunQueryCtx,
    args: {
      boardId: string;
      playerId: string;
      range?: number;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getAroundPlayer, args);
  }

  async getByCategory(
    ctx: RunQueryCtx,
    args: {
      boardId: string;
    }
  ) {
    return await ctx.runQuery(this.component.rankings.getByCategory, args);
  }

  async resetCategory(
    ctx: RunMutationCtx,
    args: {
      boardId: string;
    }
  ) {
    return await ctx.runMutation(this.component.rankings.resetCategory, args);
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
      boardId: string;
      period: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.snapshots.createSnapshot, args);
  }

  async getSnapshots(
    ctx: RunQueryCtx,
    args: {
      boardId: string;
      period?: string;
      startDate?: number;
      endDate?: number;
    }
  ) {
    return await ctx.runQuery(this.component.snapshots.getSnapshots, args);
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
      loserName?: string;
      winnerName?: string;
      winnerRatingChange?: number;
      loserRatingChange?: number;
      gameMode: string;
      gameId?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.matches.recordMatch, args);
  }

  async getPlayerMatches(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      gameMode?: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.matches.getPlayerMatches, args);
  }

  async getRecentMatches(
    ctx: RunQueryCtx,
    args: {
      gameMode?: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.matches.getRecentMatches, args);
  }

  async getHeadToHead(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      opponentId: string;
      gameMode?: string;
    }
  ) {
    return await ctx.runQuery(this.component.matches.getHeadToHead, args);
  }
}
