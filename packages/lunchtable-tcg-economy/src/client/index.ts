import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationOptions,
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
 * Client for the @lunchtable-tcg/economy Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGEconomy } from "@lunchtable-tcg/economy";
 *
 * const economy = new LTCGEconomy(components.ltcgEconomy);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await economy.currency.getPlayerBalance(ctx, userId);
 *   }
 * });
 * ```
 */
export class LTCGEconomy {
  public currency: CurrencyClient;
  public shop: ShopClient;
  public rewards: RewardsClient;
  public sales: SalesClient;
  public promo: PromoClient;
  public seeds: SeedsClient;
  public wager: WagerClient;

  constructor(private component: typeof api) {
    this.currency = new CurrencyClient(component);
    this.shop = new ShopClient(component);
    this.rewards = new RewardsClient(component);
    this.sales = new SalesClient(component);
    this.promo = new PromoClient(component);
    this.seeds = new SeedsClient(component);
    this.wager = new WagerClient(component);
  }
}

// ============================================================================
// CURRENCY CLIENT
// ============================================================================

export class CurrencyClient {
  constructor(private component: typeof api) {}

  async initializePlayerCurrency(
    ctx: RunMutationCtx,
    userId: string,
    welcomeBonus: { gold: number; gems: number }
  ) {
    return await ctx.runMutation(
      this.component.currency.initializePlayerCurrency,
      { userId, welcomeBonus }
    );
  }

  async adjustPlayerCurrency(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      transactionType: string;
      currencyType: string;
      amount: number;
      description: string;
      referenceId?: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(
      this.component.currency.adjustPlayerCurrency,
      {
        userId: args.userId,
        transactionType: args.transactionType as any,
        currencyType: args.currencyType as any,
        amount: args.amount,
        description: args.description,
        referenceId: args.referenceId,
        metadata: args.metadata,
      }
    );
  }

  async getPlayerBalance(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.currency.getPlayerBalance, {
      userId,
    });
  }

  async getTransactionHistory(
    ctx: RunQueryCtx,
    userId: string,
    limit?: number
  ) {
    return await ctx.runQuery(this.component.currency.getTransactionHistory, {
      userId,
      limit,
    });
  }

  async getTransactionHistoryPaginated(
    ctx: RunQueryCtx,
    userId: string,
    paginationOpts: PaginationOptions
  ) {
    return await ctx.runQuery(
      this.component.currency.getTransactionHistoryPaginated,
      { userId, paginationOpts }
    );
  }
}

// ============================================================================
// SHOP CLIENT
// ============================================================================

export class ShopClient {
  constructor(private component: typeof api) {}

  async getShopProducts(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.shop.getShopProducts, {});
  }

  async getProduct(ctx: RunQueryCtx, productId: string) {
    return await ctx.runQuery(this.component.shop.getProduct, { productId });
  }

  async createProduct(ctx: RunMutationCtx, product: any) {
    return await ctx.runMutation(this.component.shop.createProduct, product);
  }

  async updateProduct(
    ctx: RunMutationCtx,
    productId: string,
    updates: any
  ) {
    return await ctx.runMutation(this.component.shop.updateProduct, {
      productId,
      updates,
    });
  }

  async recordPackOpening(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      productId: string;
      packType: string;
      cardsReceived: {
        cardDefinitionId: string;
        name: string;
        rarity: string;
        variant?: string;
        serialNumber?: number;
      }[];
      currencyUsed: string;
      amountPaid: number;
      pityTriggered?: {
        epic?: boolean;
        legendary?: boolean;
        fullArt?: boolean;
      };
    }
  ) {
    return await ctx.runMutation(this.component.shop.recordPackOpening, {
      ...args,
      currencyUsed: args.currencyUsed as any,
    });
  }

  async getPityState(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.shop.getPityState, { userId });
  }

  async updatePityState(
    ctx: RunMutationCtx,
    userId: string,
    packsSinceLastLegendary: number,
    lastLegendaryAt?: number
  ) {
    return await ctx.runMutation(this.component.shop.updatePityState, {
      userId,
      packsSinceLastLegendary,
      lastLegendaryAt,
    });
  }

  async getPackOpeningHistory(
    ctx: RunQueryCtx,
    userId: string,
    limit?: number
  ) {
    return await ctx.runQuery(this.component.shop.getPackOpeningHistory, {
      userId,
      limit,
    });
  }

  async getPackOpeningHistoryPaginated(
    ctx: RunQueryCtx,
    userId: string,
    paginationOpts: PaginationOptions
  ) {
    return await ctx.runQuery(
      this.component.shop.getPackOpeningHistoryPaginated,
      { userId, paginationOpts }
    );
  }
}

// ============================================================================
// REWARDS CLIENT
// ============================================================================

export class RewardsClient {
  constructor(private component: typeof api) {}

  async getDailyRewardStatus(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.rewards.getDailyRewardStatus, {
      userId,
    });
  }

  async getRewardHistory(ctx: RunQueryCtx, userId: string, limit?: number) {
    return await ctx.runQuery(this.component.rewards.getRewardHistory, {
      userId,
      limit,
    });
  }

  async recordRewardClaim(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      rewardType: string;
      reward: {
        type: string;
        amount?: number;
        packId?: string;
        cardId?: string;
        variant?: string;
        serialNumber?: number;
      };
      jackpotResult?: {
        won: boolean;
        prizeType?: string;
        rollValue?: number;
      };
    }
  ) {
    return await ctx.runMutation(this.component.rewards.recordRewardClaim, {
      userId: args.userId,
      rewardType: args.rewardType as any,
      reward: {
        ...args.reward,
        type: args.reward.type as any,
      },
      jackpotResult: args.jackpotResult,
    });
  }
}

// ============================================================================
// SALES CLIENT
// ============================================================================

export class SalesClient {
  constructor(private component: typeof api) {}

  async getActiveSales(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.sales.getActiveSales, {});
  }

  async getSalesForProduct(ctx: RunQueryCtx, productId: string) {
    return await ctx.runQuery(this.component.sales.getSalesForProduct, {
      productId,
    });
  }

  async getDiscountedPrice(
    ctx: RunQueryCtx,
    userId: string,
    productId: string
  ) {
    return await ctx.runQuery(this.component.sales.getDiscountedPrice, {
      userId,
      productId,
    });
  }

  async createSale(ctx: RunMutationCtx, sale: any) {
    return await ctx.runMutation(this.component.sales.createSale, sale);
  }

  async recordSaleUsage(
    ctx: RunMutationCtx,
    args: {
      userId: string;
      saleId: string;
      productId: string;
      originalPrice: number;
      discountedPrice: number;
    }
  ) {
    return await ctx.runMutation(this.component.sales.recordSaleUsage, args);
  }
}

// ============================================================================
// PROMO CLIENT
// ============================================================================

export class PromoClient {
  constructor(private component: typeof api) {}

  async getPromoCode(ctx: RunQueryCtx, code: string) {
    return await ctx.runQuery(this.component.promoCodes.getPromoCode, {
      code,
    });
  }

  async getUserRedemptions(ctx: RunQueryCtx, userId: string) {
    return await ctx.runQuery(this.component.promoCodes.getUserRedemptions, {
      userId,
    });
  }

  async createPromoCode(
    ctx: RunMutationCtx,
    args: {
      code: string;
      description: string;
      rewardType: string;
      rewardAmount: number;
      rewardPackId?: string;
      maxRedemptions?: number;
      expiresAt?: number;
      isActive: boolean;
    }
  ) {
    return await ctx.runMutation(this.component.promoCodes.createPromoCode, {
      ...args,
      rewardType: args.rewardType as any,
    });
  }

  async redeemPromoCode(ctx: RunMutationCtx, userId: string, code: string) {
    return await ctx.runMutation(this.component.promoCodes.redeemPromoCode, {
      userId,
      code,
    });
  }
}

// ============================================================================
// SEEDS CLIENT
// ============================================================================

export class SeedsClient {
  constructor(private component: typeof api) {}

  async seedShopProducts(ctx: RunMutationCtx, products: any[]) {
    return await ctx.runMutation(this.component.seeds.seedShopProducts, {
      products,
    });
  }
}

// ============================================================================
// WAGER CLIENT
// ============================================================================

export class WagerClient {
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
    return await ctx.runMutation(this.component.wager.recordTransaction, {
      lobbyId: args.lobbyId,
      userId: args.userId,
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

  async getForPlayer(ctx: RunQueryCtx, args: { userId: string; limit?: number }) {
    return await ctx.runQuery(this.component.wager.getPlayerTransactions, {
      userId: args.userId,
      limit: args.limit,
    });
  }

  async getForLobby(ctx: RunQueryCtx, args: { lobbyId: string }) {
    return await ctx.runQuery(this.component.wager.getTransactionsByLobby, {
      lobbyId: args.lobbyId,
    });
  }

  async getPlayerBalance(ctx: RunQueryCtx, args: { userId: string; currency?: "sol" | "usdc" }) {
    return await ctx.runQuery(this.component.wager.getPlayerBalance, {
      userId: args.userId,
      currency: args.currency,
    });
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.wager.getTransactionById, {
      id: args.id as any,
    });
  }

  async updateStatus(
    ctx: RunMutationCtx,
    args: { id: string; status: "pending" | "confirmed" | "failed"; txSignature?: string }
  ) {
    return await ctx.runMutation(this.component.wager.updateTransactionStatus, {
      id: args.id as any,
      status: args.status,
      txSignature: args.txSignature,
    });
  }
}
