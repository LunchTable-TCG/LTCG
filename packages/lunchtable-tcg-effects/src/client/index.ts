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
 * Client for the @lunchtable-tcg/effects Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGEffects } from "@lunchtable-tcg/effects/client";
 *
 * const ltcgEffects = new LTCGEffects(components.ltcgEffects);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await ltcgEffects.effects.activate(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGEffects {
  public effects: EffectsClient;
  public chains: ChainsClient;
  public triggers: TriggersClient;

  constructor(private component: typeof api) {
    this.effects = new EffectsClient(component);
    this.chains = new ChainsClient(component);
    this.triggers = new TriggersClient(component);
  }
}

/**
 * Client for effect management.
 */
export class EffectsClient {
  constructor(private component: typeof api) {}

  async activate(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      sourceCardId: string;
      effectType: string;
      targets: string[];
      duration: string;
      data: any;
      appliedTurn?: number;
      appliedPhase?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.effects.activate, args);
  }

  async getActive(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.effects.getActive, args);
  }

  async getActiveForCard(
    ctx: RunQueryCtx,
    args: { gameId: string; sourceCardId: string }
  ) {
    return await ctx.runQuery(this.component.effects.getActiveForCard, args);
  }

  async getModifiers(
    ctx: RunQueryCtx,
    args: { gameId: string; targetCardId?: string }
  ) {
    return await ctx.runQuery(this.component.effects.getModifiers, args);
  }

  async remove(ctx: RunMutationCtx, args: { effectId: string }) {
    return await ctx.runMutation(this.component.effects.remove, {
      effectId: args.effectId as any,
    });
  }

  async cleanupExpired(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      currentTurn: number;
      currentPhase: string;
    }
  ) {
    return await ctx.runMutation(this.component.effects.cleanupExpired, args);
  }

  async removeAllForGame(ctx: RunMutationCtx, args: { gameId: string }) {
    return await ctx.runMutation(
      this.component.effects.removeAllForGame,
      args
    );
  }

  async checkOPT(
    ctx: RunQueryCtx,
    args: {
      gameId: string;
      cardId: string;
      effectId: string;
      turnNumber: number;
    }
  ) {
    return await ctx.runQuery(this.component.effects.checkOPT, args);
  }

  async markUsed(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      cardId: string;
      effectId: string;
      turnNumber: number;
    }
  ) {
    return await ctx.runMutation(this.component.effects.markUsed, args);
  }

  async resetForTurn(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      currentTurn: number;
    }
  ) {
    return await ctx.runMutation(this.component.effects.resetForTurn, args);
  }
}

/**
 * Client for chain management.
 */
export class ChainsClient {
  constructor(private component: typeof api) {}

  async startChain(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      priorityPlayerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.chains.startChain, args);
  }

  async addToChain(
    ctx: RunMutationCtx,
    args: {
      chainId: string;
      cardId: string;
      playerId: string;
      effectId: string;
      spellSpeed: number;
      targets: string[];
    }
  ) {
    return await ctx.runMutation(this.component.chains.addToChain, {
      chainId: args.chainId as any,
      cardId: args.cardId,
      playerId: args.playerId,
      effectId: args.effectId,
      spellSpeed: args.spellSpeed,
      targets: args.targets,
    });
  }

  async resolveChain(ctx: RunMutationCtx, args: { chainId: string }) {
    return await ctx.runMutation(this.component.chains.resolveChain, {
      chainId: args.chainId as any,
    });
  }

  async getCurrentChain(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.chains.getCurrentChain, args);
  }

  async passPriority(
    ctx: RunMutationCtx,
    args: {
      chainId: string;
      nextPlayerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.chains.passPriority, {
      chainId: args.chainId as any,
      nextPlayerId: args.nextPlayerId,
    });
  }

  async negateLink(
    ctx: RunMutationCtx,
    args: {
      chainId: string;
      chainPosition: number;
    }
  ) {
    return await ctx.runMutation(this.component.chains.negateLink, {
      chainId: args.chainId as any,
      chainPosition: args.chainPosition,
    });
  }
}

/**
 * Client for trigger management.
 */
export class TriggersClient {
  constructor(private component: typeof api) {}

  async registerTrigger(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      sourceCardId: string;
      triggerEvent: string;
      callbackHandle: string;
      spellSpeed: number;
      isOptional?: boolean;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.triggers.registerTrigger, args);
  }

  async getTriggered(
    ctx: RunQueryCtx,
    args: {
      gameId: string;
      triggerEvent: string;
    }
  ) {
    return await ctx.runQuery(this.component.triggers.getTriggered, args);
  }

  async removeTrigger(ctx: RunMutationCtx, args: { triggerId: string }) {
    return await ctx.runMutation(this.component.triggers.removeTrigger, {
      triggerId: args.triggerId as any,
    });
  }

  async clearTriggersForCard(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      sourceCardId: string;
    }
  ) {
    return await ctx.runMutation(
      this.component.triggers.clearTriggersForCard,
      args
    );
  }

  async clearTriggersForGame(ctx: RunMutationCtx, args: { gameId: string }) {
    return await ctx.runMutation(
      this.component.triggers.clearTriggersForGame,
      args
    );
  }
}
