/**
 * Agent Management API Endpoints
 *
 * Handles agent registration, authentication, and rate limit status.
 * Used by elizaOS agents and other external clients.
 */

// Workaround for TS2589 (excessively deep type instantiation)
// biome-ignore lint/style/noNamespaceImport: Required for Convex internal API type workaround
import * as generatedApi from "../_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: Convex internal type workaround for TS2589
const internal = (generatedApi as any).internal;
import { httpAction } from "../_generated/server";
import { authHttpAction } from "./middleware/auth";
import { DEFAULT_RATE_LIMITS, getRateLimitStatus } from "./middleware/rateLimit";
import {
  corsPreflightResponse,
  errorResponse,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";

/**
 * POST /api/agents/register
 * Register a new AI agent and receive an API key
 * No authentication required
 */
export const register = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST method is allowed", 405);
  }

  try {
    // Parse request body
    const body = await parseJsonBody<{
      name: string;
      personality?: string;
      difficulty?: string;
      starterDeckCode?: string;
      callbackUrl?: string; // Webhook URL for real-time notifications
    }>(request);

    if (body instanceof Response) return body; // Error parsing JSON

    // Validate required fields
    const validation = validateRequiredFields(body, ["name"]);
    if (validation) return validation;

    // Validate callback URL if provided
    if (body.callbackUrl) {
      try {
        new URL(body.callbackUrl);
      } catch {
        return errorResponse("INVALID_CALLBACK_URL", "Callback URL must be a valid URL", 400);
      }
    }

    // Call internal registerAgent mutation (no auth required)
    // Note: registerAgentInternal returns { agentId, apiKey, keyPrefix, internalAgentId }
    const result = await ctx.runMutation(internal.agents.agents.registerAgentInternal, {
      name: body.name,
      profilePictureUrl: undefined, // Optional
      socialLink: undefined, // Optional
      starterDeckCode: body.starterDeckCode || "INFERNAL_DRAGONS", // Default deck
      callbackUrl: body.callbackUrl, // Webhook URL for real-time notifications
    });

    // Create HD wallet for the agent (async, non-blocking)
    // The wallet creation happens in the background
    let walletAddress: string | undefined;
    try {
      const walletResult = await ctx.runAction(
        internal.wallet.createAgentWallet.createSolanaWallet,
        {
          agentId: result.agentId,
          ownerUserId: result.internalAgentId,
        }
      );
      if (walletResult.success) {
        walletAddress = walletResult.walletAddress;
      }
    } catch (walletError) {
      // Log but don't fail registration if wallet creation fails
      console.error("Wallet creation failed:", walletError);
    }

    // Return success with agent info
    return successResponse(
      {
        playerId: result.agentId,
        apiKey: result.apiKey, // Only shown once!
        keyPrefix: result.keyPrefix,
        walletAddress, // Solana wallet address (if created)
        webhookEnabled: !!body.callbackUrl, // Whether real-time notifications are enabled
      },
      201 // Created
    );
  } catch (error) {
    // Check if error is from validation in registerAgent
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return errorResponse(
          "AGENT_NAME_EXISTS",
          "An agent with this name already exists for your account",
          409
        );
      }
      if (error.message.includes("maximum")) {
        return errorResponse(
          "MAX_AGENTS_REACHED",
          "Maximum number of agents reached (3 per user)",
          403
        );
      }
    }

    return errorResponse("REGISTRATION_FAILED", "Failed to register agent", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/me
 * Get authenticated agent information
 * Requires API key authentication
 */
export const me = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Get full agent profile using internal query
    const agent = await ctx.runQuery(internal.agents.agents.getAgentByIdInternal, {
      agentId: auth.agentId,
    });

    if (!agent) {
      return errorResponse("AGENT_NOT_FOUND", "Agent not found", 404);
    }

    // Return full agent profile matching AgentProfile type
    return successResponse({
      agentId: agent.agentId,
      userId: agent.userId,
      name: agent.name,
      elo: agent.elo,
      wins: agent.wins,
      losses: agent.losses,
      createdAt: agent.createdAt,
      walletAddress: agent.walletAddress,
      walletChainType: agent.walletChainType,
      walletCreatedAt: agent.walletCreatedAt,
    });
  } catch (error) {
    return errorResponse("FETCH_FAILED", "Failed to fetch agent information", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/wallet
 * Get agent's non-custodial HD wallet information
 * Requires API key authentication
 */
export const wallet = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Get agent with wallet info
    const agent = await ctx.runQuery(internal.wallet.updateAgentWallet.getAgent, {
      agentId: auth.agentId,
    });

    if (!agent) {
      return errorResponse("AGENT_NOT_FOUND", "Agent not found", 404);
    }

    // Check if agent has wallet
    const hasWallet = !!(agent.walletAddress && agent.walletId);

    if (!hasWallet) {
      return successResponse({
        hasWallet: false,
        wallet: null,
      });
    }

    // Return wallet info (no private keys - just public data)
    return successResponse({
      hasWallet: true,
      wallet: {
        address: agent.walletAddress,
        chainType: agent.walletChainType || "solana",
        walletIndex: agent.walletIndex || 1,
        createdAt: agent.walletCreatedAt || agent._creationTime,
        // Balance not included - fetch separately via Solana RPC if needed
      },
    });
  } catch (error) {
    return errorResponse("WALLET_FETCH_FAILED", "Failed to fetch wallet information", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/agents/rate-limit
 * Get current rate limit status
 * Requires API key authentication
 */
export const rateLimit = authHttpAction(async (ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    const status = await getRateLimitStatus(ctx, auth, DEFAULT_RATE_LIMITS);

    return successResponse({
      remaining: status.remaining,
      limit: status.limit,
      resetAt: status.resetAt,
      dailyRemaining: status.dailyRemaining,
      dailyLimit: status.dailyLimit,
    });
  } catch (error) {
    return errorResponse("RATE_LIMIT_CHECK_FAILED", "Failed to check rate limit status", 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
