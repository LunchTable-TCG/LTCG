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
 * Client for the @lunchtable-tcg/combat Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGCombat } from "@lunchtable-tcg/combat/client";
 *
 * const combat = new LTCGCombat(components.ltcgCombat);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await combat.battle.declareAttack(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGCombat {
  public battle: BattleClient;
  public log: BattleLogClient;

  constructor(private component: typeof api) {
    this.battle = new BattleClient(component);
    this.log = new BattleLogClient(component);
  }
}

/**
 * Client for battle management.
 */
export class BattleClient {
  constructor(private component: typeof api) {}

  async declareAttack(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      attackerId: string;
      targetId: string;
      attackerPlayerId: string;
      attackerStats: {
        attack: number;
        defense: number;
      };
      targetStats?: {
        attack: number;
        defense: number;
        position?: string;
      };
    }
  ) {
    return await ctx.runMutation(this.component.combat.declareAttack, args);
  }

  async advanceBattlePhase(
    ctx: RunMutationCtx,
    args: {
      battleId: string;
    }
  ) {
    return await ctx.runMutation(this.component.combat.advanceBattlePhase, {
      battleId: args.battleId as any,
    });
  }

  async addModifier(
    ctx: RunMutationCtx,
    args: {
      battleId: string;
      source: string;
      stat: string;
      delta: number;
    }
  ) {
    return await ctx.runMutation(this.component.combat.addModifier, {
      battleId: args.battleId as any,
      source: args.source,
      stat: args.stat,
      delta: args.delta,
    });
  }

  async resolveBattle(
    ctx: RunMutationCtx,
    args: {
      battleId: string;
      turn: number;
    }
  ) {
    return await ctx.runMutation(this.component.combat.resolveBattle, {
      battleId: args.battleId as any,
      turn: args.turn,
    });
  }

  async getActiveBattles(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.combat.getActiveBattles, args);
  }

  async getBattleById(ctx: RunQueryCtx, args: { battleId: string }) {
    return await ctx.runQuery(this.component.combat.getBattleById, {
      battleId: args.battleId as any,
    });
  }
}

/**
 * Client for battle log retrieval.
 */
export class BattleLogClient {
  constructor(private component: typeof api) {}

  async getForGame(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.battleLog.getForGame, args);
  }

  async getForTurn(ctx: RunQueryCtx, args: { gameId: string; turn: number }) {
    return await ctx.runQuery(this.component.battleLog.getForTurn, args);
  }

  async getSummary(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.battleLog.getSummary, args);
  }
}
