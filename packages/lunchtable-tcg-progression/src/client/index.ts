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
 * Client for the @lunchtable-tcg/progression Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGProgression } from "@lunchtable-tcg/progression/client";
 *
 * const progression = new LTCGProgression(components.ltcgProgression);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await progression.achievements.grantAchievement(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGProgression {
  public achievements: AchievementsClient;
  public quests: QuestsClient;
  public battlePass: BattlePassClient;
  public xp: XPClient;

  constructor(private component: typeof api) {
    this.achievements = new AchievementsClient(component);
    this.quests = new QuestsClient(component);
    this.battlePass = new BattlePassClient(component);
    this.xp = new XPClient(component);
  }
}

/**
 * Client for achievement system.
 */
export class AchievementsClient {
  constructor(private component: typeof api) {}

  async defineAchievement(
    ctx: RunMutationCtx,
    args: {
      key: string;
      name: string;
      description: string;
      category: string;
      iconUrl?: string;
      requirement: any;
      reward?: any;
      isHidden?: boolean;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.defineAchievement, args);
  }

  async getDefinitions(
    ctx: RunQueryCtx,
    args?: {
      category?: string;
    }
  ) {
    return await ctx.runQuery(this.component.achievements.getDefinitions, args ?? {});
  }

  async getDefinitionById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.achievements.getDefinitionById, {
      id: args.id as any,
    });
  }

  async grantAchievement(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      achievementKey: string;
      progress?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.grantAchievement, args);
  }

  async getPlayerAchievements(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.achievements.getPlayerAchievements, args);
  }

  async updateProgress(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      achievementKey: string;
      delta: number;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.updateProgress, args);
  }

  async checkAndGrant(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      achievementKey: string;
      currentValue: number;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.checkAndGrant, args);
  }
}

/**
 * Client for quest system.
 */
export class QuestsClient {
  constructor(private component: typeof api) {}

  async defineQuest(
    ctx: RunMutationCtx,
    args: {
      key: string;
      name: string;
      description: string;
      type: string;
      requirement: any;
      reward: any;
      isActive: boolean;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.quests.defineQuest, args);
  }

  async getActiveQuests(
    ctx: RunQueryCtx,
    args?: {
      type?: string;
    }
  ) {
    return await ctx.runQuery(this.component.quests.getActiveQuests, args ?? {});
  }

  async getPlayerQuests(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      includeCompleted?: boolean;
    }
  ) {
    return await ctx.runQuery(this.component.quests.getPlayerQuests, args);
  }

  async startQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questKey: string;
      expiresAt?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.quests.startQuest, args);
  }

  async updateQuestProgress(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questKey: string;
      delta: number;
    }
  ) {
    return await ctx.runMutation(this.component.quests.updateQuestProgress, args);
  }

  async completeQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questKey: string;
    }
  ) {
    return await ctx.runMutation(this.component.quests.completeQuest, args);
  }

  async abandonQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questKey: string;
    }
  ) {
    return await ctx.runMutation(this.component.quests.abandonQuest, args);
  }
}

/**
 * Client for battle pass system.
 */
export class BattlePassClient {
  constructor(private component: typeof api) {}

  async createSeason(
    ctx: RunMutationCtx,
    args: {
      name: string;
      startDate: number;
      endDate: number;
      totalTiers: number;
      premiumPrice?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.createSeason, args);
  }

  async getCurrentSeason(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.battlepass.getCurrentSeason, {});
  }

  async defineTier(
    ctx: RunMutationCtx,
    args: {
      seasonId: string;
      tier: number;
      xpRequired: number;
      freeReward?: any;
      premiumReward?: any;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.defineTier, args);
  }

  async getTiers(ctx: RunQueryCtx, args: { seasonId: string }) {
    return await ctx.runQuery(this.component.battlepass.getTiers, args);
  }

  async getPlayerProgress(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      seasonId?: string;
    }
  ) {
    return await ctx.runQuery(this.component.battlepass.getPlayerProgress, args);
  }

  async addXP(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      seasonId?: string;
      amount: number;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.addXP, args);
  }

  async claimTier(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      seasonId?: string;
      tier: number;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.claimTier, args);
  }

  async upgradeToPremium(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      seasonId?: string;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.upgradeToPremium, args);
  }
}

/**
 * Client for player XP and leveling.
 */
export class XPClient {
  constructor(private component: typeof api) {}

  async addXP(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      amount: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.xp.addXP, args);
  }

  async getPlayerXP(ctx: RunQueryCtx, args: { userId: string }) {
    return await ctx.runQuery(this.component.xp.getPlayerXP, args);
  }

  async getLeaderboard(
    ctx: RunQueryCtx,
    args?: {
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.xp.getLeaderboard, args ?? {});
  }
}
