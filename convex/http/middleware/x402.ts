/**
 * x402 Payment Protocol Middleware
 *
 * HTTP middleware for protecting endpoints with x402 payment requirements.
 * Follows the same pattern as auth.ts for consistency.
 *
 * Treasury wallet and token configuration is loaded from:
 * 1. Database (treasuryWallets table with purpose=fee_collection)
 * 2. Environment variables as fallback
 *
 * This allows admins to configure payment recipients via the admin dashboard
 * without requiring environment variable changes.
 *
 * @see https://facilitator.payai.network/
 * @see https://docs.cdp.coinbase.com/x402/welcome
 */

import type { ActionCtx } from "../../_generated/server";
import { httpAction } from "../../_generated/server";
import { getX402TokenMint, getX402TreasuryWallet } from "../../lib/x402/config";
import { X402_CONFIG, X402_ERROR_CODES } from "../../lib/x402/constants";
import { FacilitatorError, defaultFacilitator } from "../../lib/x402/facilitator";
import type {
  PaymentEndpointConfig,
  PaymentPayload,
  PaymentRequired,
  PaymentRequirements,
  X402PaymentResult,
} from "../../lib/x402/types";
import { X402_VERSION } from "../../lib/x402/types";

// =============================================================================
// Types
// =============================================================================

/**
 * HTTP action context type (uses ActionCtx from Convex)
 */
export type HttpActionCtx = ActionCtx;

/**
 * Handler function signature for x402-protected endpoints
 */
export type X402Handler = (
  ctx: HttpActionCtx,
  request: Request,
  payment: {
    /** Wallet address that made the payment */
    payer: string;
    /** Solana transaction signature */
    signature: string;
    /** Payment amount in atomic units */
    amount: string;
  }
) => Promise<Response>;

/**
 * Payment config resolver function type
 * Allows dynamic payment requirements based on request
 */
export type PaymentConfigResolver = (
  request: Request
) => PaymentEndpointConfig | Promise<PaymentEndpointConfig>;

// =============================================================================
// Header Utilities
// =============================================================================

/**
 * Create PAYMENT-REQUIRED header value
 * Encodes payment requirements as base64 JSON
 */
export function createPaymentRequiredHeader(
  request: Request,
  config: PaymentEndpointConfig,
  requirements: PaymentRequirements
): string {
  const url = new URL(request.url);

  const paymentRequired: PaymentRequired = {
    x402Version: X402_VERSION,
    resource: {
      url: url.pathname,
      description: config.description,
    },
    accepts: [requirements],
  };

  // Use btoa() instead of Buffer.from() for Convex runtime compatibility
  return btoa(JSON.stringify(paymentRequired));
}

/**
 * Build payment requirements from endpoint config (synchronous, uses static config)
 * @deprecated Use buildPaymentRequirementsAsync for database-backed configuration
 */
export function buildPaymentRequirements(config: PaymentEndpointConfig): PaymentRequirements {
  const amountInAtomicUnits = Math.floor(config.amount * 10 ** X402_CONFIG.TOKEN_DECIMALS);

  return {
    scheme: X402_CONFIG.SCHEME,
    network: X402_CONFIG.NETWORK,
    amount: amountInAtomicUnits.toString(),
    asset: config.tokenMint || X402_CONFIG.TOKEN_MINT,
    payTo: config.recipient || X402_CONFIG.TREASURY_WALLET,
    maxTimeoutSeconds: X402_CONFIG.MAX_TIMEOUT_SECONDS,
    extra: {
      name: "LunchTable Token",
      description: config.description,
    },
  };
}

/**
 * Build payment requirements with database-backed configuration
 *
 * Queries the treasuryWallets table for the active fee_collection wallet.
 * Falls back to environment variables if not configured in database.
 *
 * @param ctx - Convex context with database access
 * @param config - Payment endpoint configuration
 */
export async function buildPaymentRequirementsAsync(
  ctx: HttpActionCtx,
  config: PaymentEndpointConfig
): Promise<PaymentRequirements> {
  const amountInAtomicUnits = Math.floor(config.amount * 10 ** X402_CONFIG.TOKEN_DECIMALS);

  // Get treasury wallet from database (falls back to env vars)
  const treasuryWallet = config.recipient || (await getX402TreasuryWallet(ctx));
  const tokenMint = config.tokenMint || getX402TokenMint();

  if (!treasuryWallet) {
    throw new Error(
      "x402 treasury wallet not configured. Set up a fee_collection wallet in the admin dashboard."
    );
  }

  if (!tokenMint) {
    throw new Error("x402 token mint not configured. Set LTCG_TOKEN_MINT environment variable.");
  }

  return {
    scheme: X402_CONFIG.SCHEME,
    network: X402_CONFIG.NETWORK,
    amount: amountInAtomicUnits.toString(),
    asset: tokenMint,
    payTo: treasuryWallet,
    maxTimeoutSeconds: X402_CONFIG.MAX_TIMEOUT_SECONDS,
    extra: {
      name: "LunchTable Token",
      description: config.description,
    },
  };
}

/**
 * Parse PAYMENT-SIGNATURE header from request
 * Returns null if header is missing or invalid
 */
export function parsePaymentSignature(header: string): PaymentPayload | null {
  try {
    // Use atob() instead of Buffer.from() for Convex runtime compatibility
    const decoded = atob(header);
    const payload = JSON.parse(decoded) as PaymentPayload;

    // Basic validation
    if (!payload.x402Version || !payload.payload?.transaction) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// =============================================================================
// Response Utilities
// =============================================================================

/**
 * Get CORS headers with x402-specific headers exposed
 */
function getX402CorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("Origin") || "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, Authorization, ${X402_CONFIG.HEADERS.PAYMENT_SIGNATURE}`,
    "Access-Control-Expose-Headers": X402_CONFIG.HEADERS.PAYMENT_REQUIRED,
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Create 402 Payment Required response
 *
 * @param request - The incoming request
 * @param config - Payment endpoint configuration
 * @param requirements - Pre-built payment requirements (from buildPaymentRequirementsAsync)
 */
export function paymentRequiredResponse(
  request: Request,
  config: PaymentEndpointConfig,
  requirements: PaymentRequirements
): Response {
  const headerValue = createPaymentRequiredHeader(request, config, requirements);

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: X402_ERROR_CODES.PAYMENT_REQUIRED,
        message: "Payment required",
        details: {
          description: config.description,
          amount: config.amount,
          tokenMint: requirements.asset,
          recipient: requirements.payTo,
        },
      },
      timestamp: Date.now(),
    }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        [X402_CONFIG.HEADERS.PAYMENT_REQUIRED]: headerValue,
        ...getX402CorsHeaders(request),
      },
    }
  );
}

/**
 * Create payment error response
 */
export function paymentErrorResponse(
  code: string,
  message: string,
  status = 402,
  details?: Record<string, unknown>,
  request?: Request
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getX402CorsHeaders(request),
      },
    }
  );
}

/**
 * Create CORS preflight response for x402 endpoints
 */
export function x402CorsPreflightResponse(request?: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getX402CorsHeaders(request),
  });
}

// =============================================================================
// Payment Verification
// =============================================================================

/**
 * Verify payment from request headers
 *
 * @param ctx - Convex context with database access
 * @param request - The incoming request with payment signature header
 * @param expectedConfig - Payment endpoint configuration
 */
export async function verifyPayment(
  ctx: HttpActionCtx,
  request: Request,
  expectedConfig: PaymentEndpointConfig
): Promise<X402PaymentResult> {
  const paymentHeader = request.headers.get(X402_CONFIG.HEADERS.PAYMENT_SIGNATURE);

  if (!paymentHeader) {
    return { valid: false, error: "Missing payment signature header" };
  }

  const paymentPayload = parsePaymentSignature(paymentHeader);

  if (!paymentPayload) {
    return { valid: false, error: "Invalid payment signature format" };
  }

  // Validate protocol version
  if (paymentPayload.x402Version !== X402_VERSION) {
    return {
      valid: false,
      error: `Unsupported x402 version: ${paymentPayload.x402Version}`,
    };
  }

  // Build expected requirements from database-backed config
  const expectedRequirements = await buildPaymentRequirementsAsync(ctx, expectedConfig);

  // Verify with facilitator
  try {
    const result = await defaultFacilitator.verifyAndSettle(paymentPayload, expectedRequirements);

    if (!result.verified) {
      return {
        valid: false,
        error: result.error || "Payment verification failed",
      };
    }

    if (!result.settled) {
      return {
        valid: false,
        error: result.error || "Payment settlement failed",
      };
    }

    return {
      valid: true,
      payer: result.payer,
      signature: result.signature,
    };
  } catch (error) {
    if (error instanceof FacilitatorError) {
      return {
        valid: false,
        error: error.message,
      };
    }
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown verification error",
    };
  }
}

// =============================================================================
// Middleware Wrapper
// =============================================================================

/**
 * Wrapper for httpAction that requires x402 payment
 *
 * Similar to authHttpAction, but for payment-gated endpoints.
 *
 * @param getPaymentConfig - Function to resolve payment requirements from request
 * @param handler - Handler function called after payment is verified
 *
 * @example
 * export const purchaseGems = x402HttpAction(
 *   async (request) => {
 *     const body = await request.clone().json();
 *     const pkg = GEM_PACKAGES.find(p => p.id === body.packageId);
 *     return {
 *       description: `Purchase ${pkg.gems} gems`,
 *       amount: pkg.tokenPrice,
 *     };
 *   },
 *   async (ctx, request, payment) => {
 *     // Process purchase with payment.payer and payment.signature
 *     return successResponse({ gems: 100 });
 *   }
 * );
 */
export function x402HttpAction(getPaymentConfig: PaymentConfigResolver, handler: X402Handler) {
  return httpAction(async (ctx, request) => {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return x402CorsPreflightResponse(request);
    }

    try {
      // Get payment configuration for this request
      const paymentConfig = await getPaymentConfig(request);

      // Build payment requirements from database-backed config
      // This queries treasuryWallets table for fee_collection wallet
      const requirements = await buildPaymentRequirementsAsync(ctx, paymentConfig);

      // Check for payment signature header
      const paymentHeader = request.headers.get(X402_CONFIG.HEADERS.PAYMENT_SIGNATURE);

      if (!paymentHeader) {
        // No payment - return 402 with requirements
        return paymentRequiredResponse(request, paymentConfig, requirements);
      }

      // Verify payment
      const paymentResult = await verifyPayment(ctx, request, paymentConfig);

      if (!paymentResult.valid) {
        return paymentErrorResponse(
          X402_ERROR_CODES.PAYMENT_INVALID,
          paymentResult.error || "Payment verification failed",
          402,
          undefined,
          request
        );
      }

      // Payment verified - execute handler
      return await handler(ctx, request, {
        payer: paymentResult.payer!,
        signature: paymentResult.signature!,
        amount: requirements.amount,
      });
    } catch (error) {
      // Handle configuration errors (e.g., treasury wallet not configured)
      if (
        error instanceof Error &&
        (error.message.includes("required") || error.message.includes("not configured"))
      ) {
        return paymentErrorResponse(
          "CONFIGURATION_ERROR",
          error.message,
          500,
          {
            hint: "Configure x402 treasury wallet in the admin dashboard under Treasury > Wallets",
          },
          request
        );
      }

      // Handle facilitator errors
      if (error instanceof FacilitatorError) {
        return paymentErrorResponse(error.code, error.message, 502, error.details, request);
      }

      // Handle unexpected errors
      console.error("x402 middleware error:", error);
      return paymentErrorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        500,
        { error: error instanceof Error ? error.message : String(error) },
        request
      );
    }
  });
}

/**
 * Wrapper for httpAction that supports OPTIONAL x402 payment
 *
 * Useful for endpoints that can be accessed with or without payment,
 * where payment unlocks premium features.
 *
 * @param getPaymentConfig - Function to resolve payment requirements from request
 * @param handler - Handler function with optional payment info
 */
export function optionalX402HttpAction(
  getPaymentConfig: PaymentConfigResolver,
  handler: (
    ctx: HttpActionCtx,
    request: Request,
    payment: { payer: string; signature: string; amount: string } | null
  ) => Promise<Response>
) {
  return httpAction(async (ctx, request) => {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return x402CorsPreflightResponse(request);
    }

    try {
      // Check for payment signature header
      const paymentHeader = request.headers.get(X402_CONFIG.HEADERS.PAYMENT_SIGNATURE);

      if (!paymentHeader) {
        // No payment - call handler without payment info
        return await handler(ctx, request, null);
      }

      // Get payment configuration for this request
      const paymentConfig = await getPaymentConfig(request);

      // Build requirements from database-backed config
      const requirements = await buildPaymentRequirementsAsync(ctx, paymentConfig);

      // Verify payment
      const paymentResult = await verifyPayment(ctx, request, paymentConfig);

      if (!paymentResult.valid) {
        // Payment provided but invalid - call handler without payment
        // (could also return 402 error here depending on use case)
        return await handler(ctx, request, null);
      }

      // Payment verified - call handler with payment info
      return await handler(ctx, request, {
        payer: paymentResult.payer!,
        signature: paymentResult.signature!,
        amount: requirements.amount,
      });
    } catch (error) {
      console.error("optional x402 middleware error:", error);
      return paymentErrorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred",
        500,
        { error: error instanceof Error ? error.message : String(error) },
        request
      );
    }
  });
}
