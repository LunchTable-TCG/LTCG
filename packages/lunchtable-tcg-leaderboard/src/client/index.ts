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
