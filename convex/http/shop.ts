/**
 * Shop HTTP Endpoints with x402 Payment Protocol
 *
 * HTTP endpoints for AI agents to purchase gems and packs using x402 payments.
 * These endpoints complement the existing Convex mutations with HTTP-based
 * payment-gated access.
 *
 * @see https://www.x402.org/
 */

import { internal } from "../_generated/api";
import { httpAction } from "../_generated/server";
import { GEM_PACKAGES } from "../lib/constants";
import type { PaymentEndpointConfig } from "../lib/x402/types";
import { type AuthenticatedRequest, authenticateRequest } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";
import { x402CorsPreflightResponse, x402HttpAction } from "./middleware/x402";

// Module-scope helper to avoid TS2589
// biome-ignore lint/suspicious/noExplicitAny: Required to break TS2589 deep type instantiation
const internalAny = internal as unknown as any;

// =============================================================================
// Package Listing (No Auth Required)
// =============================================================================

/**
 * GET /api/agents/shop/packages
 * List available gem packages with pricing information
 *
 * No authentication required - public endpoint for agents to discover
 * available purchases before making payment decisions.
 *
 * @returns List of gem packages with prices
 */
export const getPackages = httpAction(async (_ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  if (request.method !== "GET") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Only GET method is allowed",
      405,
      undefined,
      request
    );
  }

  try {
    // Get packages from database or constants
    const packages = GEM_PACKAGES.map((pkg) => ({
      packageId: pkg.id,
      name: pkg.name,
      gems: pkg.gems,
      usdCents: pkg.usdCents,
      bonusPercent: pkg.bonus,
      // Note: Token price calculated dynamically based on oracle
      // Agents should use getTokenPrice action before purchasing
    }));

    return successResponse({ packages }, 200, request);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch packages",
      500,
      { error: error instanceof Error ? error.message : String(error) },
      request
    );
  }
});

/**
 * GET /api/agents/shop/products
 * List available shop products (packs, boxes, currency bundles)
 *
 * No authentication required - public endpoint for agents to discover
 * available purchases.
 *
 * @returns List of shop products with prices
 */
export const getProducts = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  if (request.method !== "GET") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Only GET method is allowed",
      405,
      undefined,
      request
    );
  }

  try {
    // Get products from database
    const products = await ctx.runQuery(internalAny.economy.shop.getShopProductsInternal, {});

    return successResponse({ products }, 200, request);
  } catch (error) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch products",
      500,
      { error: error instanceof Error ? error.message : String(error) },
      request
    );
  }
});

// =============================================================================
// x402 Payment-Gated Endpoints
// =============================================================================

/**
 * POST /api/agents/shop/gems
 * Purchase gems using x402 payment protocol
 *
 * Flow:
 * 1. Agent sends POST with { packageId }
 * 2. Server returns 402 with PAYMENT-REQUIRED header
 * 3. Agent signs SPL token transfer and retries with PAYMENT-SIGNATURE header
 * 4. Server verifies payment via facilitator and credits gems
 *
 * @param packageId - The gem package ID to purchase
 * @returns Gems credited and new balance
 */
export const purchaseGems = x402HttpAction(
  // Payment config resolver - determines payment amount based on package
  async (request) => {
    // Clone request to read body without consuming it
    const body = (await request
      .clone()
      .json()
      .catch(() => ({}))) as { packageId?: string };
    const packageId = body?.packageId;

    if (!packageId) {
      throw new Error("packageId is required");
    }

    const pkg = GEM_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) {
      throw new Error(`Unknown gem package: ${packageId}`);
    }

    // Calculate token amount based on USD price
    // Uses a fixed rate for x402 (actual rate may vary with oracle)
    // Token price in cents - for now assume $1.00 per token (100 cents)
    // In production, this should query the token price oracle
    const tokenPriceCents = 100; // $1.00 per token
    const tokenAmount = pkg.usdCents / tokenPriceCents;

    return {
      description: `Purchase ${pkg.gems.toLocaleString()} gems (${pkg.name} package)`,
      amount: tokenAmount,
      metadata: {
        packageId,
        gems: pkg.gems.toString(),
        usdCents: pkg.usdCents.toString(),
      },
    } satisfies PaymentEndpointConfig;
  },
  // Handler after payment verified
  async (ctx, request, payment) => {
    try {
      const body = await parseJsonBody<{ packageId: string }>(request);
      if (body instanceof Response) return body;

      const validation = validateRequiredFields(body, ["packageId"]);
      if (validation) return validation;

      const pkg = GEM_PACKAGES.find((p) => p.id === body.packageId);
      if (!pkg) {
        return errorResponse("INVALID_PACKAGE", "Package not found", 400, undefined, request);
      }

      // Try to authenticate to link to user (optional for x402)
      let auth: AuthenticatedRequest | null = null;
      try {
        auth = await authenticateRequest(ctx, request);
      } catch {
        // No auth - payment is still valid, just not linked to user
      }

      // Credit gems via internal mutation
      const result = await ctx.runMutation(internalAny.economy.gemPurchases.creditGemsFromX402, {
        payerWallet: payment.payer,
        transactionSignature: payment.signature,
        packageId: body.packageId,
        gemsAmount: pkg.gems,
        usdValueCents: pkg.usdCents,
        tokenAmount: payment.amount,
        userId: auth?.userId ?? null,
        agentId: auth?.agentId ?? null,
      });

      return successResponse(
        {
          success: true,
          gemsCredited: pkg.gems,
          transactionSignature: payment.signature,
          newBalance: result.newBalance,
        },
        200,
        request
      );
    } catch (error) {
      console.error("Purchase gems error:", error);
      return errorResponse(
        "PURCHASE_FAILED",
        error instanceof Error ? error.message : "Purchase failed",
        500,
        undefined,
        request
      );
    }
  }
);

/**
 * POST /api/agents/shop/pack
 * Purchase a card pack using x402 payment protocol
 *
 * Flow:
 * 1. Agent sends POST with { productId }
 * 2. Server returns 402 with PAYMENT-REQUIRED header
 * 3. Agent signs SPL token transfer and retries with PAYMENT-SIGNATURE header
 * 4. Server verifies payment, opens pack, and returns cards
 *
 * @param productId - The shop product ID (must be a pack type)
 * @returns Cards received from the pack
 */
export const purchasePack = x402HttpAction(
  // Payment config resolver
  async (request) => {
    const body = (await request
      .clone()
      .json()
      .catch(() => ({}))) as { productId?: string };
    const productId = body?.productId;

    if (!productId) {
      throw new Error("productId is required");
    }

    // For x402, we use a fixed token price mapping
    // In production, this should query the product from DB and calculate token amount
    // Default to 10 tokens for a pack (approximately $10)
    const tokenAmount = 10;

    return {
      description: `Purchase card pack: ${productId}`,
      amount: tokenAmount,
      metadata: { productId },
    } satisfies PaymentEndpointConfig;
  },
  // Handler after payment verified
  async (ctx, request, payment) => {
    try {
      const body = await parseJsonBody<{ productId: string }>(request);
      if (body instanceof Response) return body;

      const validation = validateRequiredFields(body, ["productId"]);
      if (validation) return validation;

      // Try to authenticate to link to user
      let auth: AuthenticatedRequest | null = null;
      try {
        auth = await authenticateRequest(ctx, request);
      } catch {
        // No auth - payment is still valid
      }

      // Purchase pack via internal mutation
      const result = await ctx.runMutation(internalAny.economy.shop.purchasePackFromX402, {
        payerWallet: payment.payer,
        transactionSignature: payment.signature,
        productId: body.productId,
        tokenAmount: payment.amount,
        userId: auth?.userId ?? null,
        agentId: auth?.agentId ?? null,
      });

      return successResponse(
        {
          success: true,
          productName: result.productName,
          cardsReceived: result.cardsReceived,
          transactionSignature: payment.signature,
        },
        200,
        request
      );
    } catch (error) {
      console.error("Purchase pack error:", error);
      return errorResponse(
        "PURCHASE_FAILED",
        error instanceof Error ? error.message : "Purchase failed",
        500,
        undefined,
        request
      );
    }
  }
);

// =============================================================================
// Gem-Based Purchases (Authenticated, No x402)
// =============================================================================

/**
 * POST /api/agents/shop/pack-gems
 * Purchase a card pack using gems (not x402)
 *
 * Requires authentication. Deducts gems from player balance.
 *
 * @param productId - The shop product ID (must be a pack)
 * @returns Cards received from the pack
 */
export const purchasePackWithGems = httpAction(async (ctx, request) => {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request);
  }

  if (request.method !== "POST") {
    return errorResponse(
      "METHOD_NOT_ALLOWED",
      "Only POST method is allowed",
      405,
      undefined,
      request
    );
  }

  try {
    // Authenticate request (verifies agent has valid API key)
    await authenticateRequest(ctx, request);

    const body = await parseJsonBody<{ productId: string }>(request);
    if (body instanceof Response) return body;

    const validation = validateRequiredFields(body, ["productId"]);
    if (validation) return validation;

    // Purchase pack with gems via the regular mutation
    const result = await ctx.runMutation(internalAny.economy.shop.purchasePack, {
      productId: body.productId,
      useGems: true,
    });

    return successResponse(
      {
        success: true,
        productName: result.product?.name || body.productId,
        cardsReceived: result.cardsReceived,
        gemsSpent: result.totalCost,
        newGemBalance: result.newBalance,
      },
      200,
      request
    );
  } catch (error) {
    console.error("Purchase pack with gems error:", error);
    return errorResponse(
      "PURCHASE_FAILED",
      error instanceof Error ? error.message : "Purchase failed",
      500,
      undefined,
      request
    );
  }
});

// =============================================================================
// CORS Preflight Handlers
// =============================================================================

/**
 * OPTIONS handlers for x402 endpoints
 * Need explicit handlers because x402HttpAction already handles OPTIONS
 * but we expose these separately for router registration
 */
export const purchaseGemsOptions = httpAction(async (_, request) => {
  return x402CorsPreflightResponse(request);
});

export const purchasePackOptions = httpAction(async (_, request) => {
  return x402CorsPreflightResponse(request);
});
