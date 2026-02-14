import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import type { api } from "../component/_generated/api.js";

type RunQueryCtx = { runQuery: GenericQueryCtx<GenericDataModel>["runQuery"] };
type RunMutationCtx = { runMutation: GenericMutationCtx<GenericDataModel>["runMutation"] };

export type { RunQueryCtx, RunMutationCtx };
export type { api };

export class LTCGSeasons {
  public seasons: SeasonsClient;

  constructor(private component: typeof api) {
    this.seasons = new SeasonsClient(component);
  }
}

class SeasonsClient {
  constructor(private component: typeof api) {}

  async getActiveSeason(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.seasons.getActiveSeason, {});
  }
  async getSeasons(ctx: RunQueryCtx, status?: string) {
    return await ctx.runQuery(this.component.seasons.getSeasons, { status: status as any });
  }
  async getSeason(ctx: RunQueryCtx, seasonId: string) {
    return await ctx.runQuery(this.component.seasons.getSeason, { seasonId: seasonId as any });
  }
  async getSeasonByNumber(ctx: RunQueryCtx, number: number) {
    return await ctx.runQuery(this.component.seasons.getSeasonByNumber, { number });
  }
  async createSeason(ctx: RunMutationCtx, args: {
    name: string; number: number; startDate: number; endDate: number;
    description?: string; rankResetType: string; softResetPercentage?: number;
    rewards?: any[]; createdBy: string;
  }) {
    return await ctx.runMutation(this.component.seasons.createSeason, args as any);
  }
  async updateSeason(ctx: RunMutationCtx, seasonId: string, updates: any) {
    return await ctx.runMutation(this.component.seasons.updateSeason, { seasonId: seasonId as any, ...updates });
  }
  async deleteSeason(ctx: RunMutationCtx, seasonId: string) {
    return await ctx.runMutation(this.component.seasons.deleteSeason, { seasonId: seasonId as any });
  }
  async createSnapshot(ctx: RunMutationCtx, args: {
    seasonId: string; seasonNumber: number; userId: string; username: string;
    finalElo: number; tier: string; rank: number; gamesPlayed: number;
    wins: number; losses: number;
  }) {
    return await ctx.runMutation(this.component.seasons.createSnapshot, { ...args, seasonId: args.seasonId as any });
  }
  async getSeasonSnapshots(ctx: RunQueryCtx, seasonId: string, limit?: number) {
    return await ctx.runQuery(this.component.seasons.getSeasonSnapshots, { seasonId: seasonId as any, limit });
  }
  async markRewardsDistributed(ctx: RunMutationCtx, snapshotId: string) {
    return await ctx.runMutation(this.component.seasons.markRewardsDistributed, { snapshotId: snapshotId as any });
  }
  async getUserSnapshots(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.seasons.getUserSnapshots, { userId });
  }
}
