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
 * Client for the @lunchtable-tcg/treasury Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGTreasury } from "@lunchtable-tcg/treasury";
 *
 * const treasury = new LTCGTreasury(components.ltcgTreasury);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await treasury.wallets.getWallets(ctx, {});
 *   }
 * });
 * ```
 */
export class LTCGTreasury {
  public wallets: WalletsClient;
  public transactions: TransactionsClient;
  public policies: PoliciesClient;

  constructor(private component: typeof api) {
    this.wallets = new WalletsClient(component);
    this.transactions = new TransactionsClient(component);
    this.policies = new PoliciesClient(component);
  }
}

// ============================================================================
// WALLETS CLIENT
// ============================================================================

export class WalletsClient {
  constructor(private component: typeof api) {}

  async createWallet(
    ctx: RunMutationCtx,
    args: {
      privyWalletId: string;
      address: string;
      name: string;
      purpose: "fee_collection" | "distribution" | "liquidity" | "reserves";
      balance?: number;
      tokenBalance?: number;
      policyId?: string;
      status?: "active" | "frozen" | "archived";
      creationStatus?: "pending" | "creating" | "active" | "failed";
      createdBy?: string;
    }
  ) {
    return await ctx.runMutation(this.component.wallets.createWallet, {
      privyWalletId: args.privyWalletId,
      address: args.address,
      name: args.name,
      purpose: args.purpose as any,
      balance: args.balance,
      tokenBalance: args.tokenBalance,
      policyId: args.policyId,
      status: args.status as any,
      creationStatus: args.creationStatus as any,
      createdBy: args.createdBy,
    });
  }

  async updateWallet(
    ctx: RunMutationCtx,
    walletId: string,
    updates: Record<string, any>
  ) {
    return await ctx.runMutation(this.component.wallets.updateWallet, {
      walletId: walletId as any,
      updates,
    });
  }

  async getWallets(
    ctx: RunQueryCtx,
    args: {
      purpose?: "fee_collection" | "distribution" | "liquidity" | "reserves";
      status?: "active" | "frozen" | "archived";
    }
  ) {
    return await ctx.runQuery(this.component.wallets.getWallets, {
      purpose: args.purpose as any,
      status: args.status as any,
    });
  }

  async getWallet(ctx: RunQueryCtx, walletId: string) {
    return await ctx.runQuery(this.component.wallets.getWallet, {
      walletId: walletId as any,
    });
  }

  async getWalletByAddress(ctx: RunQueryCtx, address: string) {
    return await ctx.runQuery(this.component.wallets.getWalletByAddress, {
      address,
    });
  }
}

// ============================================================================
// TRANSACTIONS CLIENT
// ============================================================================

export class TransactionsClient {
  constructor(private component: typeof api) {}

  async recordTransaction(
    ctx: RunMutationCtx,
    args: {
      walletId: string;
      type:
        | "fee_received"
        | "distribution"
        | "liquidity_add"
        | "liquidity_remove"
        | "transfer_internal"
        | "transfer_external";
      amount: number;
      tokenMint: string;
      signature?: string;
      status?: "pending" | "submitted" | "confirmed" | "failed";
      metadata?: any;
      initiatedBy?: string;
      approvedBy?: string[];
    }
  ) {
    return await ctx.runMutation(this.component.transactions.recordTransaction, {
      walletId: args.walletId as any,
      type: args.type as any,
      amount: args.amount,
      tokenMint: args.tokenMint,
      signature: args.signature,
      status: args.status as any,
      metadata: args.metadata,
      initiatedBy: args.initiatedBy,
      approvedBy: args.approvedBy,
    });
  }

  async confirmTransaction(
    ctx: RunMutationCtx,
    transactionId: string,
    signature: string
  ) {
    return await ctx.runMutation(
      this.component.transactions.confirmTransaction,
      {
        transactionId: transactionId as any,
        signature,
      }
    );
  }

  async failTransaction(
    ctx: RunMutationCtx,
    transactionId: string,
    errorMessage: string
  ) {
    return await ctx.runMutation(this.component.transactions.failTransaction, {
      transactionId: transactionId as any,
      errorMessage,
    });
  }

  async getTransactions(
    ctx: RunQueryCtx,
    args: {
      walletId?: string;
      status?: "pending" | "submitted" | "confirmed" | "failed";
      type?:
        | "fee_received"
        | "distribution"
        | "liquidity_add"
        | "liquidity_remove"
        | "transfer_internal"
        | "transfer_external";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.transactions.getTransactions, {
      walletId: args.walletId as any,
      status: args.status as any,
      type: args.type as any,
      limit: args.limit,
    });
  }

  async getTransactionBySignature(ctx: RunQueryCtx, signature: string) {
    return await ctx.runQuery(
      this.component.transactions.getTransactionBySignature,
      { signature }
    );
  }
}

// ============================================================================
// POLICIES CLIENT
// ============================================================================

export class PoliciesClient {
  constructor(private component: typeof api) {}

  async createPolicy(
    ctx: RunMutationCtx,
    args: {
      name: string;
      description?: string;
      privyPolicyId?: string;
      rules: {
        maxTransactionAmount?: number;
        dailyLimit?: number;
        allowedRecipients?: string[];
        requiresApproval: boolean;
        minApprovers?: number;
      };
      isActive: boolean;
      createdBy: string;
    }
  ) {
    return await ctx.runMutation(this.component.policies.createPolicy, args);
  }

  async updatePolicy(
    ctx: RunMutationCtx,
    policyId: string,
    updates: Record<string, any>
  ) {
    return await ctx.runMutation(this.component.policies.updatePolicy, {
      policyId: policyId as any,
      updates,
    });
  }

  async getPolicies(ctx: RunQueryCtx, activeOnly?: boolean) {
    return await ctx.runQuery(this.component.policies.getPolicies, {
      activeOnly,
    });
  }

  async getPolicy(ctx: RunQueryCtx, policyId: string) {
    return await ctx.runQuery(this.component.policies.getPolicy, {
      policyId: policyId as any,
    });
  }
}
