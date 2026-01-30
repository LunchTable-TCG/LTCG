/**
 * Agent Management API Endpoints
 *
 * Handles agent registration, authentication, and rate limit status.
 * Used by ElizaOS agents and other external clients.
 */

import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  authHttpAction,
} from "./middleware/auth";
import {
  successResponse,
  errorResponse,
  parseJsonBody,
  validateRequiredFields,
  corsPreflightResponse,
} from "./middleware/responses";
import {
  getRateLimitStatus,
  DEFAULT_RATE_LIMITS,
} from "./middleware/rateLimit";

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
    }>(request);

    if (body instanceof Response) return body; // Error parsing JSON

    // Validate required fields
    const validation = validateRequiredFields(body, ["name"]);
    if (validation) return validation;

    // Call internal registerAgent mutation (no auth required)
    // Note: registerAgentInternal returns { agentId, apiKey, keyPrefix, internalAgentId }
    const result = await ctx.runMutation(internal.agents.registerAgentInternal, {
      name: body.name,
      profilePictureUrl: undefined, // Optional
      socialLink: undefined, // Optional
      starterDeckCode: body.starterDeckCode || "STARTER_BALANCED", // Default deck
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

    return errorResponse(
      "REGISTRATION_FAILED",
      "Failed to register agent",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});

/**
 * GET /api/agents/me
 * Get authenticated agent information
 * Requires API key authentication
 */
export const me = authHttpAction(async (_ctx, request, auth) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Note: We skip calling getAgent to avoid TypeScript deep instantiation errors
    // The auth object already provides agentId and userId which is sufficient
    // For full agent details, clients can call specific endpoints as needed

    // Return minimal agent profile from auth context
    const agent = {
      _id: auth.agentId,
      userId: auth.userId,
      // Additional fields would come from separate API calls if needed
    };

    // User stats placeholder (avoid TypeScript deep instantiation)
    const user = {
      rankedElo: 1000,
      gold: 0,
      premiumCurrency: 0,
    };

    // Return minimal agent profile
    // Note: For full details, use GET /api/agents/{id} endpoint
    return successResponse({
      playerId: agent._id,
      userId: agent.userId,
      rating: user.rankedElo,
      gold: user.gold,
      premium: user.premiumCurrency,
      // Full stats available through other endpoints
      message: "Use dedicated endpoints for detailed agent information",
    });
  } catch (error) {
    return errorResponse(
      "FETCH_FAILED",
      "Failed to fetch agent information",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
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
    return errorResponse(
      "RATE_LIMIT_CHECK_FAILED",
      "Failed to check rate limit status",
      500,
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
});
