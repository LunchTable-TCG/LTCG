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
      itemId: string;
      itemType: string;
      itemName: string;
      price: number;
      currency: string;
      quantity: number;
      isAuction: boolean;
      auctionEndTime?: number;
      minBid?: number;
      buyNowPrice?: number;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.listings.createListing, args);
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
      sellerId: args.sellerId,
    });
  }

  async purchaseListing(
    ctx: RunMutationCtx,
    args: {
      listingId: string;
      buyerId: string;
    }
  ) {
    return await ctx.runMutation(this.component.listings.purchaseListing, {
      listingId: args.listingId as any,
      buyerId: args.buyerId,
    });
  }

  async getActive(
    ctx: RunQueryCtx,
    args?: {
      itemType?: string;
      currency?: string;
    }
  ) {
    return await ctx.runQuery(this.component.listings.getActive, args || {});
  }

  async getBySeller(ctx: RunQueryCtx, args: { sellerId: string }) {
    return await ctx.runQuery(this.component.listings.getBySeller, args);
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
      amount: number;
    }
  ) {
    return await ctx.runMutation(this.component.bids.placeBid, {
      listingId: args.listingId as any,
      bidderId: args.bidderId,
      amount: args.amount,
    });
  }

  async getBidsForListing(ctx: RunQueryCtx, args: { listingId: string }) {
    return await ctx.runQuery(this.component.bids.getBidsForListing, {
      listingId: args.listingId as any,
    });
  }

  async getPlayerBids(ctx: RunQueryCtx, args: { bidderId: string }) {
    return await ctx.runQuery(this.component.bids.getPlayerBids, args);
  }

  async resolveAuction(ctx: RunMutationCtx, args: { listingId: string }) {
    return await ctx.runMutation(this.component.bids.resolveAuction, {
      listingId: args.listingId as any,
    });
  }
}

/**
 * Client for in-game shop operations.
 */
export class ShopClient {
  constructor(private component: typeof api) {}

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
 */
export class AnalyticsClient {
  constructor(private component: typeof api) {}

  async recordPrice(
    ctx: RunMutationCtx,
    args: {
      itemId: string;
      price: number;
      currency: string;
      type: string;
      metadata?: any;
    }
  ) {
    return await ctx.runMutation(this.component.analytics.recordPrice, args);
  }

  async getPriceHistory(
    ctx: RunQueryCtx,
    args: {
      itemId: string;
      limit?: number;
    }
  ) {
    return await ctx.runQuery(this.component.analytics.getPriceHistory, args);
  }

  async getTransactionHistory(
    ctx: RunQueryCtx,
    args: {
      userId: string;
      role?: "buyer" | "seller";
      limit?: number;
    }
  ) {
    return await ctx.runQuery(
      this.component.analytics.getTransactionHistory,
      args
    );
  }

  async getRecentTransactions(ctx: RunQueryCtx, args?: { limit?: number }) {
    return await ctx.runQuery(
      this.component.analytics.getRecentTransactions,
      args || {}
    );
  }
}
