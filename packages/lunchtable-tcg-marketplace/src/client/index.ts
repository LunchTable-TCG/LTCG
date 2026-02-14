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
 * Client for the @lunchtable-tcg/marketplace Convex component.
 *
 * Usage:
 * ```ts
 * import { components } from "@convex/_generated/api";
 * import { LTCGMarketplace } from "@lunchtable-tcg/marketplace/client";
 *
 * const marketplace = new LTCGMarketplace(components.ltcgMarketplace);
 *
 * export const myMutation = mutation({
 *   handler: async (ctx) => {
 *     await marketplace.listings.createListing(ctx, { ... });
 *   }
 * });
 * ```
 */
export class LTCGMarketplace {
  public listings: ListingsClient;
  public bids: BidsClient;
  public shop: ShopClient;
  public analytics: AnalyticsClient;

  constructor(private component: typeof api) {
    this.listings = new ListingsClient(component);
    this.bids = new BidsClient(component);
    this.shop = new ShopClient(component);
    this.analytics = new AnalyticsClient(component);
  }
}

/**
 * Client for marketplace listings management.
 */
export class ListingsClient {
  constructor(private component: typeof api) {}

  async createListing(
    ctx: RunMutationCtx,
    args: {
      sellerId: string;
      sellerUsername: string;
      listingType: "fixed" | "auction";
      cardDefinitionId: string;
      quantity: number;
      price: number;
      endsAt?: number;
      currencyType?: "gold" | "token";
      tokenPrice?: number;
    }
  ) {
    return await ctx.runMutation(this.component.listings.createListing, {
      sellerId: args.sellerId as any,
      sellerUsername: args.sellerUsername,
      listingType: args.listingType,
      cardDefinitionId: args.cardDefinitionId as any,
      quantity: args.quantity,
      price: args.price,
      endsAt: args.endsAt,
      currencyType: args.currencyType,
      tokenPrice: args.tokenPrice,
    });
  }

  async cancelListing(
    ctx: RunMutationCtx,
    args: {
      listingId: string;
      sellerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.listings.cancelListing, {
      listingId: args.listingId as any,
      sellerId: args.sellerId as any,
    });
  }

  async purchaseListing(
    ctx: RunMutationCtx,
    args: {
      listingId: string;
      buyerId: string;
      buyerUsername: string;
    }
  ) {
    return await ctx.runMutation(this.component.listings.purchaseListing, {
      listingId: args.listingId as any,
      buyerId: args.buyerId as any,
      buyerUsername: args.buyerUsername,
    });
  }

  async getActive(
    ctx: RunQueryCtx,
    args?: {
      listingType?: "fixed" | "auction";
      currencyType?: "gold" | "token";
    }
  ) {
    return await ctx.runQuery(this.component.listings.getActive, args || {});
  }

  async getBySeller(
    ctx: RunQueryCtx,
    args: {
      sellerId: string;
      status?: "active" | "sold" | "cancelled" | "expired" | "suspended";
    }
  ) {
    return await ctx.runQuery(this.component.listings.getBySeller, {
      sellerId: args.sellerId as any,
      status: args.status,
    });
  }

  async getById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.listings.getById, {
      id: args.id as any,
    });
  }

  async expireListings(ctx: RunMutationCtx) {
    return await ctx.runMutation(this.component.listings.expireListings, {});
  }
}

/**
 * Client for auction bidding.
 */
export class BidsClient {
  constructor(private component: typeof api) {}

  async placeBid(
    ctx: RunMutationCtx,
    args: {
      listingId: string;
      bidderId: string;
      bidderUsername: string;
      bidAmount: number;
    }
  ) {
    return await ctx.runMutation(this.component.bids.placeBid, {
      listingId: args.listingId as any,
      bidderId: args.bidderId as any,
      bidderUsername: args.bidderUsername,
      bidAmount: args.bidAmount,
    });
  }

  async getBidsForListing(ctx: RunQueryCtx, args: { listingId: string }) {
    return await ctx.runQuery(this.component.bids.getBidsForListing, {
      listingId: args.listingId as any,
    });
  }

  async getPlayerBids(
    ctx: RunQueryCtx,
    args: {
      bidderId: string;
      bidStatus?: "active" | "outbid" | "won" | "refunded" | "cancelled";
    }
  ) {
    return await ctx.runQuery(this.component.bids.getPlayerBids, {
      bidderId: args.bidderId as any,
      bidStatus: args.bidStatus,
    });
  }

  async resolveAuction(ctx: RunMutationCtx, args: { listingId: string }) {
    return await ctx.runMutation(this.component.bids.resolveAuction, {
      listingId: args.listingId as any,
    });
  }
}

/**
 * Client for marketplace shop products, sales, and price caps.
 */
export class ShopClient {
  constructor(private component: typeof api) {}

  async getPriceCaps(
    ctx: RunQueryCtx,
    args?: {
      cardDefinitionId?: string;
      isActive?: boolean;
    }
  ) {
    return await ctx.runQuery(this.component.shop.getPriceCaps, {
      cardDefinitionId: args?.cardDefinitionId
        ? (args.cardDefinitionId as any)
        : undefined,
      isActive: args?.isActive,
    });
  }

  async getProducts(ctx: RunQueryCtx, args?: { category?: string }) {
    return await ctx.runQuery(this.component.shop.getProducts, args || {});
  }

  async getProductById(ctx: RunQueryCtx, args: { id: string }) {
    return await ctx.runQuery(this.component.shop.getProductById, {
      id: args.id as any,
    });
  }

  async purchaseProduct(
    ctx: RunMutationCtx,
    args: {
      productId: string;
      buyerId: string;
      quantity: number;
    }
  ) {
    return await ctx.runMutation(this.component.shop.purchaseProduct, {
      productId: args.productId as any,
      buyerId: args.buyerId,
      quantity: args.quantity,
    });
  }

  async createProduct(
    ctx: RunMutationCtx,
    args: {
      name: string;
      description: string;
      category: string;
      price: number;
      currency: string;
      imageUrl?: string;
      stock?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.shop.createProduct, args);
  }

  async updateProduct(
    ctx: RunMutationCtx,
    args: {
      id: string;
      fields: {
        name?: string;
        description?: string;
        category?: string;
        price?: number;
        currency?: string;
        imageUrl?: string;
        stock?: number;
        isActive?: boolean;
        saleId?: string;
        metadata?: any;
      };
    }
  ) {
    return await ctx.runMutation(this.component.shop.updateProduct, {
      id: args.id as any,
      fields: {
        ...args.fields,
        saleId: args.fields.saleId ? (args.fields.saleId as any) : undefined,
      },
    });
  }

  async createSale(
    ctx: RunMutationCtx,
    args: {
      name: string;
      discountPercent: number;
      startTime: number;
      endTime: number;
      productIds?: string[];
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.shop.createSale, args);
  }

  async getActiveSales(ctx: RunQueryCtx) {
    return await ctx.runQuery(this.component.shop.getActiveSales, {});
  }
}

/**
 * Client for marketplace analytics and price tracking.
 * Derives data from sold marketplaceListings.
 */
export class AnalyticsClient {
  constructor(private component: typeof api) {}

  async getPriceHistory(
    ctx: RunQueryCtx,
    args: {
      cardDefinitionId: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.analytics.getPriceHistory, {
      cardDefinitionId: args.cardDefinitionId as any,
      limit: args.limit,
    });
  }

  async getTransactionHistory(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      role?: "buyer" | "seller";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.analytics.getTransactionHistory, {
      userId: args.userId as any,
      role: args.role,
      limit: args.limit,
    });
  }

  async getRecentTransactions(ctx: RunQueryCtx, args?: { limit?: number }) {
    return await ctx.runQuery(
      this.component.analytics.getRecentTransactions,
      args || {}
    );
  }
}
