import { httpAction } from "../../_generated/server";
import { getX402TreasuryWallet } from "../../lib/x402/config";
import { X402_CONFIG, X402_ERROR_CODES } from "../../lib/x402/constants";
import { FacilitatorError } from "../../lib/x402/facilitator";
import type { PaymentEndpointConfig, PaymentRequirements } from "../../lib/x402/types";
import { X402_VERSION } from "../../lib/x402/types";
import {
  type AuthenticatedRequest,
  AuthenticationError,
  type HttpActionCtx,
  authenticateRequest,
} from "./auth";
import { verifyPayment } from "./x402";

// =============================================================================
// Types
// =============================================================================

/**
 * Handler for endpoints requiring both auth and payment.
 */
export type AuthX402Handler = (
  ctx: HttpActionCtx,
  request: Request,
  auth: AuthenticatedRequest,
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
 * Payment config resolver that receives the authenticated identity.
 * This allows dynamic payment requirements (e.g., querying a lobby's wager tier).
 *
 * May also return `null` to indicate no payment is required (gold wager or free lobby).
 */
export type AuthPaymentConfigResolver = (
  ctx: HttpActionCtx,
  request: Request,
  auth: AuthenticatedRequest
) => Promise<PaymentEndpointConfig | null>;

// =============================================================================
// Payment Requirements Builder (Extended)
// =============================================================================

/**
 * Extended PaymentEndpointConfig that supports custom decimals.
 * SOL uses 9 decimals, USDC uses 6.
 */
export interface WagerPaymentConfig extends PaymentEndpointConfig {
  /** Token decimals (9 for SOL, 6 for USDC). Defaults to X402_CONFIG.TOKEN_DECIMALS (6). */
  decimals?: number;
}

/**
 * Build payment requirements for wager endpoints.
 * Supports custom decimals and recipient addresses (escrow PDAs).
 */
async function buildWagerPaymentRequirements(
  ctx: HttpActionCtx,
  config: WagerPaymentConfig
): Promise<PaymentRequirements> {
  const decimals = config.decimals ?? X402_CONFIG.TOKEN_DECIMALS;
  const amountInAtomicUnits = Math.floor(config.amount * 10 ** decimals);

  const recipient = config.recipient || (await getX402TreasuryWallet(ctx));
  if (!recipient) {
    throw new Error(
      "Wager payment recipient not configured. Ensure escrow PDA or treasury wallet is set."
    );
  }

  const tokenMint = config.tokenMint;
  if (!tokenMint) {
    throw new Error("Token mint required for wager payment requirements.");
  }

  return {
    scheme: X402_CONFIG.SCHEME,
    network: X402_CONFIG.NETWORK,
    amount: amountInAtomicUnits.toString(),
    asset: tokenMint,
    payTo: recipient,
    maxTimeoutSeconds: X402_CONFIG.MAX_TIMEOUT_SECONDS,
    extra: {
      name: "Crypto Wager",
      description: config.description,
    },
  };
}

// =============================================================================
// Response Helpers
// =============================================================================

function getAuthX402CorsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": `Content-Type, Authorization, ${X402_CONFIG.HEADERS.PAYMENT_SIGNATURE}`,
    "Access-Control-Expose-Headers": X402_CONFIG.HEADERS.PAYMENT_REQUIRED,
    "Access-Control-Max-Age": "86400",
  };
}

function authX402CorsPreflightResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getAuthX402CorsHeaders(request),
  });
}

function createPaymentRequiredHeader(
  request: Request,
  config: PaymentEndpointConfig,
  requirements: PaymentRequirements
): string {
  const url = new URL(request.url);
  const paymentRequired = {
    x402Version: X402_VERSION,
    resource: {
      url: url.pathname,
      description: config.description,
    },
    accepts: [requirements],
  };
  return btoa(JSON.stringify(paymentRequired));
}

function paymentRequiredResponse(
  request: Request,
  config: PaymentEndpointConfig,
  requirements: PaymentRequirements
): Response {
  const headerValue = createPaymentRequiredHeader(request, config, requirements);
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "PAYMENT_REQUIRED",
        message: "Payment required to join wager lobby",
        details: {
          description: config.description,
          amount: config.amount,
          tokenMint: config.tokenMint,
          recipient: config.recipient,
        },
      },
      timestamp: Date.now(),
    }),
    {
      status: 402,
      headers: {
        "Content-Type": "application/json",
        [X402_CONFIG.HEADERS.PAYMENT_REQUIRED]: headerValue,
        ...getAuthX402CorsHeaders(request),
      },
    }
  );
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  request: Request,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message, details },
      timestamp: Date.now(),
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...getAuthX402CorsHeaders(request),
      },
    }
  );
}

// =============================================================================
// Main Middleware
// =============================================================================

/**
 * Combined auth + x402 middleware for wager endpoints.
 *
 * Flow:
 * 1. Handle CORS preflight
 * 2. Authenticate request (API key)
 * 3. Resolve dynamic payment config from authenticated context
 * 4. If no PAYMENT-SIGNATURE header → return 402 with requirements
 * 5. Verify payment via PayAI facilitator
 * 6. Execute handler with both auth + payment context
 *
 * @example
 * ```typescript
 * export const wagerJoin = authX402HttpAction(
 *   async (ctx, request, auth) => {
 *     const { lobbyId } = await request.clone().json();
 *     const lobby = await ctx.runQuery(getLobby, { lobbyId });
 *     return {
 *       description: `Wager: ${lobby.cryptoWagerTier} ${lobby.cryptoWagerCurrency}`,
 *       amount: lobby.cryptoWagerTier,
 *       recipient: lobby.cryptoEscrowPda,
 *       tokenMint: getMintForCurrency(lobby.cryptoWagerCurrency),
 *       decimals: lobby.cryptoWagerCurrency === "sol" ? 9 : 6,
 *     };
 *   },
 *   async (ctx, request, auth, payment) => {
 *     // Both authenticated and paid — process wager join
 *   }
 * );
 * ```
 */
export function authX402HttpAction(
  getPaymentConfig: (
    ctx: HttpActionCtx,
    request: Request,
    auth: AuthenticatedRequest
  ) => Promise<WagerPaymentConfig>,
  handler: AuthX402Handler
) {
  return httpAction(async (ctx, request) => {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return authX402CorsPreflightResponse(request);
    }

    try {
      // Step 1: Authenticate (API key)
      const auth = await authenticateRequest(ctx, request);

      // Step 2: Resolve dynamic payment config
      const paymentConfig = await getPaymentConfig(ctx, request, auth);

      // Step 3: Build payment requirements
      const requirements = await buildWagerPaymentRequirements(ctx, paymentConfig);

      // Step 4: Check for payment signature header
      const paymentHeader = request.headers.get(X402_CONFIG.HEADERS.PAYMENT_SIGNATURE);

      if (!paymentHeader) {
        // No payment — return 402 with requirements
        return paymentRequiredResponse(request, paymentConfig, requirements);
      }

      // Step 5: Verify payment via facilitator
      const paymentResult = await verifyPayment(ctx, request, paymentConfig);

      if (!paymentResult.valid) {
        return errorResponse(
          X402_ERROR_CODES.PAYMENT_INVALID,
          paymentResult.error || "Payment verification failed",
          402,
          request
        );
      }

      if (!paymentResult.payer || !paymentResult.signature) {
        return errorResponse(
          X402_ERROR_CODES.PAYMENT_INVALID,
          "Payment verification succeeded but payer/signature are missing",
          402,
          request
        );
      }

      // Step 6: Execute handler with both auth and payment
      return await handler(ctx, request, auth, {
        payer: paymentResult.payer,
        signature: paymentResult.signature,
        amount: requirements.amount,
      });
    } catch (error) {
      // Handle authentication errors
      if (error instanceof AuthenticationError) {
        return error.toResponse();
      }

      // Handle configuration errors
      if (
        error instanceof Error &&
        (error.message.includes("required") || error.message.includes("not configured"))
      ) {
        return errorResponse("CONFIGURATION_ERROR", error.message, 500, request, {
          hint: "Ensure escrow PDA and token mint are configured for this wager lobby",
        });
      }

      // Handle facilitator errors
      if (error instanceof FacilitatorError) {
        return errorResponse(error.code, error.message, 502, request, error.details);
      }

      // Unexpected errors
      console.error("authX402 middleware error:", error);
      return errorResponse("INTERNAL_ERROR", "An unexpected error occurred", 500, request, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
