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
 * Client for the @lunchtable-tcg/wager Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGWager } from "@lunchtable-tcg/wager/client";
 *
 * const wager = new LTCGWager(components.ltcgWager);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await wager.escrow.create(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGWager {
  public escrow: EscrowClient;
  public transactions: TransactionsClient;

  constructor(private component: typeof api) {
    this.escrow = new EscrowClient(component);
    this.transactions = new TransactionsClient(component);
  }
}

/**
 * Client for wager escrow management.
 */
export class EscrowClient {
  constructor(private component: typeof api) {}

  async create(
    ctx: RunMutationCtx,
    args: {
      gameId: string;
      player1Id: string;
      player2Id: string;
      amount: number;
      currency: string;
      expiresAt?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.escrow.createEscrow, args);
  }

  async get(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.escrow.getEscrow, {
      id: args.id as any,
    });
  }

  async getForGame(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.escrow.getEscrowForGame, args);
  }

  async releaseToWinner(
    ctx: RunMutationCtx,
    args: {
      escrowId: string;
      winnerId: string;
      txSignature?: string;
    }
  ) {
    return await ctx.runMutation(this.component.escrow.releaseToWinner, {
      escrowId: args.escrowId as any,
      winnerId: args.winnerId,
      txSignature: args.txSignature,
    });
  }

  async refund(
    ctx: RunMutationCtx,
    args: {
      escrowId: string;
      txSignature1?: string;
      txSignature2?: string;
    }
  ) {
    return await ctx.runMutation(this.component.escrow.refundEscrow, {
      escrowId: args.escrowId as any,
      txSignature1: args.txSignature1,
      txSignature2: args.txSignature2,
    });
  }

  async getPlayerEscrows(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      status?: string;
    }
  ) {
    return await ctx.runQuery(this.component.escrow.getPlayerEscrows, args);
  }

  async markDeposited(
    ctx: RunMutationCtx,
    args: {
      escrowId: string;
      playerId: string;
      txSignature?: string;
    }
  ) {
    return await ctx.runMutation(this.component.escrow.markDeposited, {
      escrowId: args.escrowId as any,
      playerId: args.playerId,
      txSignature: args.txSignature,
    });
  }
}

/**
 * Client for wager transaction tracking.
 */
export class TransactionsClient {
  constructor(private component: typeof api) {}

  async record(
    ctx: RunMutationCtx,
    args: {
      escrowId: string;
      playerId: string;
      type: string;
      amount: number;
      currency: string;
      txSignature?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.transactions.recordTransaction, {
      escrowId: args.escrowId as any,
      playerId: args.playerId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      txSignature: args.txSignature,
      metadata: args.metadata,
    });
  }

  async getForPlayer(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.transactions.getPlayerTransactions, args);
  }

  async getForGame(ctx: RunQueryCtx, args: { gameId: string }) {
    return await ctx.runQuery(this.component.transactions.getTransactionsByGame, args);
  }

  async getPlayerBalance(
    ctx: RunQueryCtx,
    args: {
      playerId: string;
      currency?: string;
    }
  ) {
    return await ctx.runQuery(this.component.transactions.getPlayerBalance, args);
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.transactions.getTransactionById, {
      id: args.id as any,
    });
  }

  async getForEscrow(ctx: RunQueryCtx, args: { escrowId: string }) {
    return await ctx.runQuery(this.component.transactions.getEscrowTransactions, {
      escrowId: args.escrowId as any,
    });
  }
}
