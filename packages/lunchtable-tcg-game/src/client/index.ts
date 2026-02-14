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
 * Client for the @lunchtable-tcg/game Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGGame } from "@lunchtable-tcg/game";
 *
 * const game = new LTCGGame(components.ltcgGame);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     const lobby = await game.lobbies.getLobby(ctx, lobbyId);
 *   }
 * });
 * ```
 */
export class LTCGGame {
  public lobbies: LobbiesClient;
  public events: EventsClient;
  public states: StatesClient;
  public matchmaking: MatchmakingClient;

  constructor(private component: typeof api) {
    this.lobbies = new LobbiesClient(component);
    this.events = new EventsClient(component);
    this.states = new StatesClient(component);
    this.matchmaking = new MatchmakingClient(component);
  }
}

// ============================================================================
// LOBBIES CLIENT
// ============================================================================

export class LobbiesClient {
  constructor(private component: typeof api) {}

  async createLobby(
    ctx: RunMutationCtx,
    args: {
      hostId: string;
      hostUsername: string;
      hostRank: string;
      hostRating: number;
      deckArchetype: string;
      mode: string;
      isPrivate: boolean;
      joinCode?: string;
      maxRatingDiff?: number;
      stageId?: string;
      allowSpectators?: boolean;
      maxSpectators?: number;
      wagerAmount?: number;
      cryptoWagerCurrency?: string;
      cryptoWagerTier?: number;
      cryptoEscrowPda?: string;
      cryptoHostWallet?: string;
    }
  ) {
    return await ctx.runMutation(this.component.lobbies.createLobby, args);
  }

  async getLobby(ctx: RunQueryCtx, lobbyId: string) {
    return await ctx.runQuery(this.component.lobbies.getLobby, {
      lobbyId: lobbyId as any,
    });
  }

  async getLobbyByJoinCode(ctx: RunQueryCtx, joinCode: string) {
    return await ctx.runQuery(this.component.lobbies.getLobbyByJoinCode, {
      joinCode,
    });
  }

  async updateLobby(ctx: RunMutationCtx, lobbyId: string, updates: any) {
    return await ctx.runMutation(this.component.lobbies.updateLobby, {
      lobbyId: lobbyId as any,
      updates,
    });
  }

  async getActiveLobbies(
    ctx: RunQueryCtx,
    args?: { status?: string; mode?: string; limit?: number }
  ) {
    return await ctx.runQuery(this.component.lobbies.getActiveLobbies, {
      status: args?.status,
      mode: args?.mode,
      limit: args?.limit,
    });
  }

  async getLobbiesByHost(
    ctx: RunQueryCtx,
    hostId: string,
    limit?: number
  ) {
    return await ctx.runQuery(this.component.lobbies.getLobbiesByHost, {
      hostId,
      limit,
    });
  }
}

// ============================================================================
// EVENTS CLIENT
// ============================================================================

export class EventsClient {
  constructor(private component: typeof api) {}

  async recordEvent(
    ctx: RunMutationCtx,
    args: {
      lobbyId: string;
      gameId: string;
      turnNumber: number;
      eventType: string;
      playerId: string;
      playerUsername: string;
      description: string;
      metadata?: any;
      timestamp: number;
    }
  ) {
    return await ctx.runMutation(this.component.events.recordEvent, {
      ...args,
      lobbyId: args.lobbyId as any,
    });
  }

  async getEventsForLobby(
    ctx: RunQueryCtx,
    lobbyId: string,
    limit?: number
  ) {
    return await ctx.runQuery(this.component.events.getEventsForLobby, {
      lobbyId: lobbyId as any,
      limit,
    });
  }

  async getEventsForGame(
    ctx: RunQueryCtx,
    gameId: string,
    limit?: number
  ) {
    return await ctx.runQuery(this.component.events.getEventsForGame, {
      gameId,
      limit,
    });
  }
}

// ============================================================================
// STATES CLIENT
// ============================================================================

export class StatesClient {
  constructor(private component: typeof api) {}

  async createGameState(ctx: RunMutationCtx, state: any) {
    return await ctx.runMutation(this.component.states.createGameState, {
      state,
    });
  }

  async getGameState(ctx: RunQueryCtx, stateId: string) {
    return await ctx.runQuery(this.component.states.getGameState, {
      stateId: stateId as any,
    });
  }

  async getGameStateByLobby(ctx: RunQueryCtx, lobbyId: string) {
    return await ctx.runQuery(this.component.states.getGameStateByLobby, {
      lobbyId: lobbyId as any,
    });
  }

  async updateGameState(
    ctx: RunMutationCtx,
    stateId: string,
    updates: any
  ) {
    return await ctx.runMutation(this.component.states.updateGameState, {
      stateId: stateId as any,
      updates,
    });
  }
}

// ============================================================================
// MATCHMAKING CLIENT
// ============================================================================

export class MatchmakingClient {
  constructor(private component: typeof api) {}

  async joinQueue(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      username: string;
      rating: number;
      deckArchetype: string;
      mode: string;
    }
  ) {
    return await ctx.runMutation(this.component.matchmaking.joinQueue, args);
  }

  async leaveQueue(ctx: RunMutationCtx, userId: string) {
    return await ctx.runMutation(this.component.matchmaking.leaveQueue, {
      userId,
    });
  }

  async getQueueEntries(
    ctx: RunQueryCtx,
    args?: { mode?: string; limit?: number }
  ) {
    return await ctx.runQuery(this.component.matchmaking.getQueueEntries, {
      mode: args?.mode,
      limit: args?.limit,
    });
  }

  async getQueueEntry(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.matchmaking.getQueueEntry, {
      userId,
    });
  }
}
