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
      achievementId: string;
      name: string;
      description: string;
      category: "wins" | "games_played" | "collection" | "social" | "story" | "ranked" | "special";
      rarity: "common" | "rare" | "epic" | "legendary";
      icon: string;
      requirementType: string;
      targetValue: number;
      rewards?: {
        gold?: number;
        xp?: number;
        gems?: number;
        badge?: string;
        cardDefinitionId?: string;
      };
      isSecret: boolean;
      isActive: boolean;
      createdAt: number;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.defineAchievement, args);
  }

  async getDefinitions(
    ctx: RunQueryCtx,
    args?: {
      category?: "wins" | "games_played" | "collection" | "social" | "story" | "ranked" | "special";
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
      achievementId: string;
      currentProgress?: number;
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
      achievementId: string;
      delta: number;
    }
  ) {
    return await ctx.runMutation(this.component.achievements.updateProgress, args);
  }

  async checkAndGrant(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      achievementId: string;
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
      questId: string;
      name: string;
      description: string;
      questType: "daily" | "weekly" | "achievement";
      requirementType: string;
      targetValue: number;
      rewards: {
        gold: number;
        xp: number;
        gems?: number;
      };
      filters?: {
        gameMode?: "ranked" | "casual" | "story";
        archetype?: string;
        cardType?: string;
      };
      isActive: boolean;
      createdAt: number;
    }
  ) {
    return await ctx.runMutation(this.component.quests.defineQuest, args);
  }

  async getActiveQuests(
    ctx: RunQueryCtx,
    args?: {
      questType?: "daily" | "weekly" | "achievement";
    }
  ) {
    return await ctx.runQuery(this.component.quests.getActiveQuests, args ?? {});
  }

  async getPlayerQuests(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      includeClaimed?: boolean;
    }
  ) {
    return await ctx.runQuery(this.component.quests.getPlayerQuests, args);
  }

  async startQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questId: string;
      expiresAt?: number;
    }
  ) {
    return await ctx.runMutation(this.component.quests.startQuest, args);
  }

  async updateQuestProgress(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questId: string;
      delta: number;
    }
  ) {
    return await ctx.runMutation(this.component.quests.updateQuestProgress, args);
  }

  async claimQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questId: string;
    }
  ) {
    return await ctx.runMutation(this.component.quests.claimQuest, args);
  }

  async abandonQuest(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      questId: string;
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
      seasonId: string;
      name: string;
      description?: string;
      totalTiers: number;
      xpPerTier: number;
      startDate: number;
      endDate: number;
      createdBy: string;
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
      battlePassId: string;
      tier: number;
      freeReward?: {
        type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
        amount?: number;
        cardId?: string;
        packProductId?: string;
        titleName?: string;
        avatarUrl?: string;
      };
      premiumReward?: {
        type: "gold" | "gems" | "xp" | "card" | "pack" | "title" | "avatar";
        amount?: number;
        cardId?: string;
        packProductId?: string;
        titleName?: string;
        avatarUrl?: string;
      };
      isMilestone: boolean;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.defineTier, args);
  }

  async getTiers(ctx: RunQueryCtx, args: { battlePassId: string }) {
    return await ctx.runQuery(this.component.battlepass.getTiers, args);
  }

  async getPlayerProgress(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      battlePassId?: string;
    }
  ) {
    return await ctx.runQuery(this.component.battlepass.getPlayerProgress, args);
  }

  async addXP(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      battlePassId?: string;
      amount: number;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.addXP, args);
  }

  async claimTier(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      battlePassId?: string;
      tier: number;
      isPremium: boolean;
    }
  ) {
    return await ctx.runMutation(this.component.battlepass.claimTier, args);
  }

  async upgradeToPremium(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      battlePassId?: string;
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
