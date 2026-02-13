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
 * Client for the @lunchtable-tcg/core Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGCore } from "@lunchtable-tcg/core/client";
 *
 * const ltcg = new LTCGCore(components.ltcgCore);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await ltcg.cards.register(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGCore {
  public cards: CardsClient;
  public decks: DecksClient;
  public game: GameClient;
  public matchmaking: MatchmakingClient;
  public events: EventsClient;
  public hooks: HooksClient;

  constructor(private component: typeof api) {
    this.cards = new CardsClient(component);
    this.decks = new DecksClient(component);
    this.game = new GameClient(component);
    this.matchmaking = new MatchmakingClient(component);
    this.events = new EventsClient(component);
    this.hooks = new HooksClient(component);
  }
}

/**
 * Client for card definition management.
 */
export class CardsClient {
  constructor(private component: typeof api) {}

  async register(
    ctx: RunMutationCtx,
    args: {
      name: string;
      cardType: string;
      attack?: number;
      defense?: number;
      level?: number;
      rarity: string;
      stereotype?: string;
      abilities?: any;
      description: string;
      imageUrl?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.cards.register, args);
  }

  async bulkImport(
    ctx: RunMutationCtx,
    args: {
      cards: Array<{
        name: string;
        cardType: string;
        attack?: number;
        defense?: number;
        level?: number;
        rarity: string;
        stereotype?: string;
        abilities?: any;
        description: string;
        imageUrl?: string;
        metadata?: any;
      }>;
    }
  ) {
    return await ctx.runMutation(this.component.cards.bulkImport, args);
  }

  async getAll(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.cards.getAll, {});
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.cards.getById, { id: args.id as any });
  }

  async getByName(ctx: RunQueryCtx, args: { name: string }) {
    return await ctx.runQuery(this.component.cards.getByName, args);
  }

  async getByType(ctx: RunQueryCtx, args: { cardType: string }) {
    return await ctx.runQuery(this.component.cards.getByType, args);
  }

  async update(
    ctx: RunMutationCtx,
    args: {
      id: string;
      fields: {
        name?: string;
        cardType?: string;
        attack?: number;
        defense?: number;
        level?: number;
        rarity?: string;
        stereotype?: string;
        abilities?: any;
        description?: string;
        imageUrl?: string;
        metadata?: any;
      };
    }
  ) {
    return await ctx.runMutation(this.component.cards.update, {
      id: args.id as any,
      fields: args.fields,
    });
  }

  async remove(ctx: RunMutationCtx, args: { id: string }) {
    return await ctx.runMutation(this.component.cards.remove, { id: args.id as any });
  }
}

/**
 * Client for deck management.
 */
export class DecksClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      ownerId: string;
      name: string;
      cards: string[];
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.decks.create, args);
  }

  async getForPlayer(ctx: RunQueryCtx, args: { ownerId: string }) {
    return await ctx.runQuery(this.component.decks.getForPlayer, args);
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.decks.getById, { id: args.id as any });
  }

  async update(
    ctx: RunMutationCtx,
    args: {
      id: string;
      ownerId: string;
      name?: string;
      cards?: string[];
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.decks.update, {
      id: args.id as any,
      ownerId: args.ownerId,
      name: args.name,
      cards: args.cards,
      metadata: args.metadata,
    });
  }

  async remove(ctx: RunMutationCtx, args: { id: string; ownerId: string }) {
    return await ctx.runMutation(this.component.decks.remove, {
      id: args.id as any,
      ownerId: args.ownerId,
    });
  }

  async setActive(ctx: RunMutationCtx, args: { id: string; ownerId: string }) {
    return await ctx.runMutation(this.component.decks.setActive, {
      id: args.id as any,
      ownerId: args.ownerId,
    });
  }

  async validate(
    ctx: RunQueryCtx,
    args: {
      id: string;
      rules: {
        minCards: number;
        maxCards: number;
        maxCopies: number;
        maxLegendaryCopies?: number;
      };
    }
  ) {
    return await ctx.runQuery(this.component.decks.validate, {
      id: args.id as any,
      rules: args.rules,
    });
  }

  async duplicate(
    ctx: RunMutationCtx,
    args: {
      id: string;
      ownerId: string;
      newName: string;
    }
  ) {
    return await ctx.runMutation(this.component.decks.duplicate, {
      id: args.id as any,
      ownerId: args.ownerId,
      newName: args.newName,
    });
  }
}

/**
 * Client for game lifecycle and state management.
 */
export class GameClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      players: Array<{
        id: string;
        deckId: string;
      }>;
      config: {
        startingLP: number;
        maxHandSize: number;
        phases: string[];
        drawPerTurn: number;
        maxFieldSlots?: number;
        maxBackrowSlots?: number;
        turnTimeLimit?: number;
        metadata?: any;
      };
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.game.create, args);
  }

  async getState(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.game.getState, {
      gameId: args.gameId as any,
    });
  }

  async getStateForPlayer(
    ctx: RunQueryCtx,
    args: { gameId: string; playerId: string }
  ) {
    return await ctx.runQuery(this.component.game.getStateForPlayer, {
      gameId: args.gameId as any,
      playerId: args.playerId,
    });
  }

  async advancePhase(
    ctx: RunMutationCtx,
    args: { gameId: string; playerId: string }
  ) {
    return await ctx.runMutation(this.component.game.advancePhase, {
      gameId: args.gameId as any,
      playerId: args.playerId,
    });
  }

  async drawCards(
    ctx: RunMutationCtx,
    args: { gameId: string; playerId: string; count: number }
  ) {
    return await ctx.runMutation(this.component.game.drawCards, {
      gameId: args.gameId as any,
      playerId: args.playerId,
      count: args.count,
    });
  }

  async modifyLP(
    ctx: RunMutationCtx,
    args: { gameId: string; playerId: string; delta: number }
  ) {
    return await ctx.runMutation(this.component.game.modifyLP, {
      gameId: args.gameId as any,
      playerId: args.playerId,
      delta: args.delta,
    });
  }

  async moveCard(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      playerId: string;
      instanceId: string;
      from: string;
      to: string;
      position?: number;
      isFaceDown?: boolean;
    }
  ) {
    return await ctx.runMutation(this.component.game.moveCard, {
      gameId: args.gameId as any,
      playerId: args.playerId,
      instanceId: args.instanceId,
      from: args.from,
      to: args.to,
      position: args.position,
      isFaceDown: args.isFaceDown,
    });
  }

  async endGame(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      winnerId?: string;
      reason: string;
    }
  ) {
    return await ctx.runMutation(this.component.game.endGame, {
      gameId: args.gameId as any,
      winnerId: args.winnerId,
      reason: args.reason,
    });
  }
}

/**
 * Client for matchmaking queue operations.
 */
export class MatchmakingClient {
  constructor(private component: typeof api) {}

  async joinQueue(
    ctx: RunMutationCtx,
    args: {
      playerId: string;
      deckId: string;
      rating: number;
      mode: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.matchmaking.joinQueue, args);
  }

  async leaveQueue(ctx: RunMutationCtx, args: { playerId: string }) {
    return await ctx.runMutation(this.component.matchmaking.leaveQueue, args);
  }

  async findMatch(
    ctx: RunMutationCtx,
    args: {
      mode: string;
      ratingRange: number;
    }
  ) {
    return await ctx.runMutation(this.component.matchmaking.findMatch, args);
  }

  async getQueueStatus(ctx: RunQueryCtx, args: { mode: string }) {
    return await ctx.runQuery(this.component.matchmaking.getQueueStatus, args);
  }

  async getPlayerQueueEntry(ctx: RunQueryCtx, args: { playerId: string }) {
    return await ctx.runQuery(this.component.matchmaking.getPlayerQueueEntry, args);
  }
}

/**
 * Client for game event logging and retrieval.
 */
export class EventsClient {
  constructor(private component: typeof api) {}

  async log(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      type: string;
      playerId?: string;
      data: any;
    }
  ) {
    return await ctx.runMutation(this.component.game.logEvent, {
      gameId: args.gameId as any,
      type: args.type,
      playerId: args.playerId,
      data: args.data,
    });
  }

  async getForGame(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.game.getEvents, {
      gameId: args.gameId as any,
    });
  }
}

/**
 * Client for event hooks system.
 */
export class HooksClient {
  constructor(private component: typeof api) {}

  async register(
    ctx: RunMutationCtx,
    args: {
      event: string;
      callbackHandle: string;
      filter?: any;
    }
  ) {
    return await ctx.runMutation(this.component.hooks.register, args);
  }

  async unregister(ctx: RunMutationCtx, args: { id: string }) {
    return await ctx.runMutation(this.component.hooks.unregister, {
      id: args.id as any,
    });
  }

  async getForEvent(ctx: RunQueryCtx, args: { event: string }) {
    return await ctx.runQuery(this.component.hooks.getForEvent, args);
  }

  async clearAll(ctx: RunMutationCtx) {
    return await ctx.runMutation(this.component.hooks.clearAll, {});
  }

  // Convenience methods for common hook types
  async onPhaseEnter(
    ctx: RunMutationCtx,
    args: {
      phase: string;
      callbackHandle: string;
    }
  ) {
    return this.register(ctx, {
      event: "phase_enter",
      callbackHandle: args.callbackHandle,
      filter: { phase: args.phase },
    });
  }

  async onTurnEnd(
    ctx: RunMutationCtx,
    args: {
      callbackHandle: string;
    }
  ) {
    return this.register(ctx, {
      event: "turn_end",
      callbackHandle: args.callbackHandle,
    });
  }

  async onCardPlayed(
    ctx: RunMutationCtx,
    args: {
      callbackHandle: string;
      cardType?: string;
    }
  ) {
    return this.register(ctx, {
      event: "card_played",
      callbackHandle: args.callbackHandle,
      filter: args.cardType ? { cardType: args.cardType } : undefined,
    });
  }

  async onBattleResolved(
    ctx: RunMutationCtx,
    args: {
      callbackHandle: string;
    }
  ) {
    return this.register(ctx, {
      event: "battle_resolved",
      callbackHandle: args.callbackHandle,
    });
  }

  async onGameEnd(
    ctx: RunMutationCtx,
    args: {
      callbackHandle: string;
    }
  ) {
    return this.register(ctx, {
      event: "game_end",
      callbackHandle: args.callbackHandle,
    });
  }
}
