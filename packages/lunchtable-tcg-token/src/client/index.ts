import { Infer, GenericId } from "convex/values";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

type ComponentClient<API> = {
  query: <Query extends FunctionReference<"query", "public">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Promise<Infer<Query["_returnType"]>>;
  mutation: <Mutation extends FunctionReference<"mutation", "public">>(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
  ) => Promise<Infer<Mutation["_returnType"]>>;
};

export class BalancesClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  getBalance(args: { userId: string }) {
    return this.client.query(this.api.balances.getBalance, args);
  }

  getBalanceByWallet(args: { walletAddress: string }) {
    return this.client.query(this.api.balances.getBalanceByWallet, args);
  }

  updateBalance(args: {
    userId: string;
    walletAddress: string;
    tokenMint: string;
    balance: number;
    lastVerifiedAt: number;
  }) {
    return this.client.mutation(this.api.balances.updateBalance, args);
  }
}

export class TransactionsClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  recordTransaction(args: {
    userId: string;
    transactionType: "marketplace_purchase" | "marketplace_sale" | "platform_fee" | "battle_pass_purchase" | "gem_purchase";
    amount: number;
    signature?: string;
    status: "pending" | "confirmed" | "failed";
    referenceId?: string;
    description: string;
    createdAt: number;
    confirmedAt?: number;
  }) {
    return this.client.mutation(this.api.transactions.recordTransaction, args);
  }

  getTransactions(args: { userId: string; limit?: number }) {
    return this.client.query(this.api.transactions.getTransactions, args);
  }

  getTransactionBySignature(args: { signature: string }) {
    return this.client.query(this.api.transactions.getTransactionBySignature, args);
  }

  confirmTransaction(args: { transactionId: GenericId<"tokenTransactions">; signature: string }) {
    return this.client.mutation(this.api.transactions.confirmTransaction, args);
  }

  createPendingPurchase(args: {
    buyerId: string;
    listingId?: string;
    battlePassId?: string;
    purchaseType?: "marketplace" | "battle_pass";
    amount: number;
    buyerWallet: string;
    sellerWallet: string;
    status: "awaiting_signature" | "submitted" | "confirmed" | "failed" | "expired";
    transactionSignature?: string;
    createdAt: number;
    expiresAt: number;
  }) {
    return this.client.mutation(this.api.transactions.createPendingPurchase, args);
  }

  updatePurchaseStatus(args: {
    purchaseId: GenericId<"pendingTokenPurchases">;
    status: "awaiting_signature" | "submitted" | "confirmed" | "failed" | "expired";
    transactionSignature?: string;
  }) {
    return this.client.mutation(this.api.transactions.updatePurchaseStatus, args);
  }
}

export class ConfigClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  getConfig() {
    return this.client.query(this.api.config.getConfig);
  }

  updateConfig(args: { configId: GenericId<"tokenConfig">; updates: any }) {
    return this.client.mutation(this.api.config.updateConfig, args);
  }

  createConfig(args: {
    name: string;
    symbol: string;
    description: string;
    imageUrl?: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
    initialSupply?: number;
    decimals?: number;
    targetMarketCap?: number;
    mintAddress?: string;
    bondingCurveAddress?: string;
    pumpfunUrl?: string;
    launchedAt?: number;
    graduatedAt?: number;
    status: "draft" | "ready" | "launched" | "graduated";
    createdBy: string;
    createdAt: number;
    updatedAt: number;
  }) {
    return this.client.mutation(this.api.config.createConfig, args);
  }
}

export class MetricsClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  recordMetrics(args: {
    timestamp: number;
    price: number;
    priceUsd: number;
    marketCap: number;
    volume24h: number;
    txCount24h: number;
    holderCount: number;
    liquidity: number;
    bondingCurveProgress: number;
    graduationEta?: number;
  }) {
    return this.client.mutation(this.api.metrics.recordMetrics, args);
  }

  getMetrics(args?: { since?: number; limit?: number }) {
    return this.client.query(this.api.metrics.getMetrics, args ?? {});
  }

  getLatestMetrics() {
    return this.client.query(this.api.metrics.getLatestMetrics);
  }
}

export class HoldersClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  upsertHolder(args: {
    address: string;
    balance: number;
    percentOwnership: number;
    firstPurchaseAt: number;
    lastActivityAt: number;
    totalBought: number;
    totalSold: number;
    isPlatformWallet: boolean;
    label?: string;
  }) {
    return this.client.mutation(this.api.holders.upsertHolder, args);
  }

  getHolders(args?: { limit?: number; platformOnly?: boolean }) {
    return this.client.query(this.api.holders.getHolders, args ?? {});
  }

  getHolderByAddress(args: { address: string }) {
    return this.client.query(this.api.holders.getHolderByAddress, args);
  }
}

export class TradesClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  recordTrade(args: {
    signature: string;
    type: "buy" | "sell";
    traderAddress: string;
    tokenAmount: number;
    solAmount: number;
    pricePerToken: number;
    timestamp: number;
    isWhale: boolean;
    source?: string;
  }) {
    return this.client.mutation(this.api.trades.recordTrade, args);
  }

  getTrades(args?: { limit?: number; type?: "buy" | "sell"; whaleOnly?: boolean }) {
    return this.client.query(this.api.trades.getTrades, args ?? {});
  }

  getTradeBySignature(args: { signature: string }) {
    return this.client.query(this.api.trades.getTradeBySignature, args);
  }
}

export class RollupClient {
  private client: ComponentClient<any>;
  private api: any;

  constructor(client: ComponentClient<any>, api: any) {
    this.client = client;
    this.api = api;
  }

  upsertRollup(args: {
    period: "hour" | "day";
    periodStart: number;
    volume: number;
    buyVolume: number;
    sellVolume: number;
    txCount: number;
    buyCount: number;
    sellCount: number;
    uniqueTraders: number;
    highPrice: number;
    lowPrice: number;
    openPrice: number;
    closePrice: number;
    newHolders: number;
    lostHolders: number;
  }) {
    return this.client.mutation(this.api.rollup.upsertRollup, args);
  }

  getRollups(args: { period: "hour" | "day"; since?: number; limit?: number }) {
    return this.client.query(this.api.rollup.getRollups, args);
  }
}

export class LTCGToken {
  public balances: BalancesClient;
  public transactions: TransactionsClient;
  public config: ConfigClient;
  public metrics: MetricsClient;
  public holders: HoldersClient;
  public trades: TradesClient;
  public rollup: RollupClient;

  constructor(client: ComponentClient<any>, api: any) {
    this.balances = new BalancesClient(client, api);
    this.transactions = new TransactionsClient(client, api);
    this.config = new ConfigClient(client, api);
    this.metrics = new MetricsClient(client, api);
    this.holders = new HoldersClient(client, api);
    this.trades = new TradesClient(client, api);
    this.rollup = new RollupClient(client, api);
  }
}
