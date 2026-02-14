import type { FunctionReference } from "convex/server";

export class GemPackagesClient {
  constructor(private component: any) {}

  getGemPackages(args?: { activeOnly?: boolean }): FunctionReference<"query"> {
    return this.component.gemPackages.getGemPackages.bind(null, args || {});
  }

  getGemPackage(packageId: string): FunctionReference<"query"> {
    return this.component.gemPackages.getGemPackage.bind(null, { packageId });
  }

  createGemPackage(args: {
    packageId: string;
    name: string;
    description: string;
    gems: number;
    usdPrice: number;
    bonusPercent: number;
    isActive: boolean;
    sortOrder: number;
    featuredBadge?: string;
    iconUrl?: string;
  }): FunctionReference<"mutation"> {
    return this.component.gemPackages.createGemPackage.bind(null, args);
  }

  updateGemPackage(
    pkgId: string,
    updates: Record<string, any>
  ): FunctionReference<"mutation"> {
    return this.component.gemPackages.updateGemPackage.bind(null, {
      pkgId,
      updates,
    });
  }
}

export class GemPurchasesClient {
  constructor(private component: any) {}

  recordGemPurchase(args: {
    userId: string;
    packageId: string;
    gemsReceived: number;
    usdValue: number;
    tokenAmount: number;
    tokenPriceUsd: number;
    solanaSignature: string;
    status: "pending" | "confirmed" | "failed" | "expired";
  }): FunctionReference<"mutation"> {
    return this.component.gemPurchases.recordGemPurchase.bind(null, args);
  }

  getGemPurchases(
    userId: string,
    limit?: number
  ): FunctionReference<"query"> {
    return this.component.gemPurchases.getGemPurchases.bind(null, {
      userId,
      limit,
    });
  }

  getGemPurchaseBySignature(signature: string): FunctionReference<"query"> {
    return this.component.gemPurchases.getGemPurchaseBySignature.bind(null, {
      signature,
    });
  }

  confirmGemPurchase(
    purchaseId: string,
    confirmedAt?: number
  ): FunctionReference<"mutation"> {
    return this.component.gemPurchases.confirmGemPurchase.bind(null, {
      purchaseId,
      confirmedAt,
    });
  }

  failGemPurchase(
    purchaseId: string,
    reason: string
  ): FunctionReference<"mutation"> {
    return this.component.gemPurchases.failGemPurchase.bind(null, {
      purchaseId,
      reason,
    });
  }
}

export class X402Client {
  constructor(private component: any) {}

  recordX402Payment(args: {
    transactionSignature: string;
    payerWallet: string;
    recipientWallet: string;
    amount: number;
    tokenMint: string;
    network: string;
    resourcePath: string;
    resourceDescription: string;
    userId?: string;
    agentId?: string;
    purchaseType?: "gems" | "pack" | "box" | "other";
    purchaseId?: string;
    verifiedAt: number;
    facilitatorResponse?: string;
    status: "verified" | "settled" | "failed";
    errorMessage?: string;
  }): FunctionReference<"mutation"> {
    return this.component.x402.recordX402Payment.bind(null, args);
  }

  getX402Payments(args?: {
    userId?: string;
    agentId?: string;
    limit?: number;
  }): FunctionReference<"query"> {
    return this.component.x402.getX402Payments.bind(null, args || {});
  }

  getX402PaymentBySignature(signature: string): FunctionReference<"query"> {
    return this.component.x402.getX402PaymentBySignature.bind(null, {
      signature,
    });
  }

  updateX402Status(
    paymentId: string,
    status: "verified" | "settled" | "failed",
    errorMessage?: string
  ): FunctionReference<"mutation"> {
    return this.component.x402.updateX402Status.bind(null, {
      paymentId,
      status,
      errorMessage,
    });
  }
}

export class StripeClient {
  constructor(private component: any) {}

  getOrCreateStripeCustomer(
    userId: string,
    email: string,
    stripeCustomerId: string
  ): FunctionReference<"mutation"> {
    return this.component.stripe.getOrCreateStripeCustomer.bind(null, {
      userId,
      email,
      stripeCustomerId,
    });
  }

  getStripeCustomer(userId: string): FunctionReference<"query"> {
    return this.component.stripe.getStripeCustomer.bind(null, { userId });
  }

  getStripeCustomerByStripeId(
    stripeCustomerId: string
  ): FunctionReference<"query"> {
    return this.component.stripe.getStripeCustomerByStripeId.bind(null, {
      stripeCustomerId,
    });
  }

  upsertSubscription(args: {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    status:
      | "active"
      | "canceled"
      | "past_due"
      | "unpaid"
      | "incomplete"
      | "trialing";
    planInterval: "month" | "year";
    planAmount: number;
    currentPeriodStart: number;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    canceledAt?: number;
  }): FunctionReference<"mutation"> {
    return this.component.stripe.upsertSubscription.bind(null, args);
  }

  getSubscription(userId: string): FunctionReference<"query"> {
    return this.component.stripe.getSubscription.bind(null, { userId });
  }

  cancelSubscription(subscriptionId: string): FunctionReference<"mutation"> {
    return this.component.stripe.cancelSubscription.bind(null, {
      subscriptionId,
    });
  }

  recordWebhookEvent(
    stripeEventId: string,
    type: string
  ): FunctionReference<"mutation"> {
    return this.component.stripe.recordWebhookEvent.bind(null, {
      stripeEventId,
      type,
    });
  }

  isEventProcessed(stripeEventId: string): FunctionReference<"query"> {
    return this.component.stripe.isEventProcessed.bind(null, {
      stripeEventId,
    });
  }

  markEventProcessed(eventId: string): FunctionReference<"mutation"> {
    return this.component.stripe.markEventProcessed.bind(null, { eventId });
  }
}

export class LTCGPayments {
  public gemPackages: GemPackagesClient;
  public gemPurchases: GemPurchasesClient;
  public x402: X402Client;
  public stripe: StripeClient;

  constructor(component: any) {
    this.gemPackages = new GemPackagesClient(component);
    this.gemPurchases = new GemPurchasesClient(component);
    this.x402 = new X402Client(component);
    this.stripe = new StripeClient(component);
  }
}
