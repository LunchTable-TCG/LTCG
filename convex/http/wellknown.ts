/**
 * .well-known Endpoints
 *
 * Standard discovery endpoints for x402 payment protocol.
 * These endpoints allow clients to discover payment capabilities.
 *
 * @see https://www.x402.org/
 */

import { httpAction } from "../_generated/server";
import { getX402TokenMint, getX402TreasuryWallet } from "../lib/x402/config";
import { X402_CONFIG } from "../lib/x402/constants";
import { X402_VERSION } from "../lib/x402/types";

/**
 * GET /.well-known/pay
 *
 * Discovery endpoint for x402 payment capabilities.
 * Returns information about supported payment methods, networks, and assets.
 *
 * This is the standard x402 discovery endpoint that clients use to determine
 * if a server supports x402 payments and what payment methods are accepted.
 *
 * @returns Payment capabilities configuration
 */
export const pay = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get treasury wallet from database (falls back to env vars)
    const treasuryWallet = await getX402TreasuryWallet(ctx);
    const tokenMint = getX402TokenMint();

    // Check if x402 is configured
    const isConfigured = Boolean(treasuryWallet && tokenMint);

    const capabilities = {
      // x402 protocol version
      x402Version: X402_VERSION,

      // Whether x402 payments are enabled
      enabled: isConfigured,

      // Supported payment schemes
      schemes: ["exact"],

      // Supported networks (CAIP-2 format)
      networks: [X402_CONFIG.NETWORK],

      // Accepted assets
      accepts: isConfigured
        ? [
            {
              network: X402_CONFIG.NETWORK,
              asset: tokenMint,
              name: "LunchTable Token",
              decimals: X402_CONFIG.TOKEN_DECIMALS,
            },
          ]
        : [],

      // Payment recipient (treasury wallet)
      payTo: treasuryWallet || null,

      // Facilitator URL for payment verification
      facilitator: X402_CONFIG.FACILITATOR_URL,

      // Payment timeout
      maxTimeoutSeconds: X402_CONFIG.MAX_TIMEOUT_SECONDS,

      // Server information
      server: {
        name: "LunchTable",
        version: "1.0.0",
      },

      // Endpoints that support x402 payments
      endpoints: [
        {
          path: "/api/agents/shop/gems",
          method: "POST",
          description: "Purchase gems with token payment",
        },
        {
          path: "/api/agents/shop/pack",
          method: "POST",
          description: "Purchase card pack with token payment",
        },
      ],
    };

    return new Response(JSON.stringify(capabilities, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("Error in /.well-known/pay:", error);
    return new Response(
      JSON.stringify({
        x402Version: X402_VERSION,
        enabled: false,
        error: "Failed to retrieve payment configuration",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
