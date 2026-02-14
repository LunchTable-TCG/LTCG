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
  public transactions: TransactionsClient;

  constructor(private component: typeof api) {
    this.transactions = new TransactionsClient(component);
  }
}

/**
 * Client for crypto wager transaction tracking.
 */
export class TransactionsClient {
  constructor(private component: typeof api) {}

  async record(
    ctx: RunMutationCtx,
    args: {
      lobbyId: string;
      userId: string;
      walletAddress: string;
      type: "deposit" | "payout" | "treasury_fee";
      currency: "sol" | "usdc";
      amount: number;
      amountAtomic: string;
      escrowPda: string;
      txSignature?: string;
      status?: "pending" | "confirmed" | "failed";
    }
  ) {
    return await ctx.runMutation(this.component.transactions.recordTransaction, {
      lobbyId: args.lobbyId as any,
      userId: args.userId as any,
      walletAddress: args.walletAddress,
      type: args.type,
      currency: args.currency,
      amount: args.amount,
      amountAtomic: args.amountAtomic,
      escrowPda: args.escrowPda,
      txSignature: args.txSignature,
      status: args.status,
    });
  }

  async getForPlayer(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.transactions.getPlayerTransactions, {
      userId: args.userId as any,
      limit: args.limit,
    });
  }

  async getForLobby(ctx: RunQueryCtx, args: { lobbyId: string }) {
    return await ctx.runQuery(this.component.transactions.getTransactionsByLobby, {
      lobbyId: args.lobbyId as any,
    });
  }

  async getPlayerBalance(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      currency?: "sol" | "usdc";
    }
  ) {
    return await ctx.runQuery(this.component.transactions.getPlayerBalance, {
      userId: args.userId as any,
      currency: args.currency,
    });
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.transactions.getTransactionById, {
      id: args.id as any,
    });
  }

  async updateStatus(
    ctx: RunMutationCtx,
    args: {
      id: string;
      status: "pending" | "confirmed" | "failed";
      txSignature?: string;
    }
  ) {
    return await ctx.runMutation(this.component.transactions.updateTransactionStatus, {
      id: args.id as any,
      status: args.status,
      txSignature: args.txSignature,
    });
  }
}
