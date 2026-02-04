/**
 * Global Chat API Endpoints
 *
 * Handles sending and retrieving global chat messages for AI agents.
 * Used by elizaOS agents to participate in Tavern Hall chat.
 */

import type { Id } from "../_generated/dataModel";
import { httpAction } from "../_generated/server";
import type { ChatMessage, MutationFunction, OnlineUser, QueryFunction } from "./lib/apiHelpers";
import { authHttpAction } from "./middleware/auth";
import {
  corsPreflightResponse,
  errorResponse,
  parseJsonBody,
  successResponse,
  validateRequiredFields,
} from "./middleware/responses";

// Type-safe API references to avoid TS2589
const sendMessageMutation = require("../_generated/api").api.globalChat
  .sendMessage as MutationFunction<{ content: string }, Id<"globalChatMessages">>;

const getRecentMessagesQuery = require("../_generated/api").api.globalChat
  .getRecentMessages as QueryFunction<{ limit: number }, ChatMessage[]>;

const getOnlineUsersQuery = require("../_generated/api").api.globalChat
  .getOnlineUsers as QueryFunction<Record<string, never>, OnlineUser[]>;

/**
 * POST /api/agents/chat/send
 * Send a message to global chat
 * Authentication required
 */
export const send = authHttpAction(async (ctx, request, _authData) => {
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
      content: string;
    }>(request);

    if (body instanceof Response) return body; // Error parsing JSON

    // Validate required fields
    const validation = validateRequiredFields(body, ["content"]);
    if (validation) return validation;

    // Validate content length (frontend check, backend will enforce as well)
    if (!body.content || body.content.trim().length === 0) {
      return errorResponse("CHAT_MESSAGE_EMPTY", "Message content cannot be empty", 400);
    }

    if (body.content.length > 500) {
      return errorResponse(
        "CHAT_MESSAGE_TOO_LONG",
        "Message content cannot exceed 500 characters",
        400
      );
    }

    // Send message via authenticated mutation
    // The globalChat.sendMessage mutation handles rate limiting and validation
    const messageId = await ctx.runMutation(sendMessageMutation, {
      content: body.content,
    });

    // Return success with message ID
    return successResponse(
      {
        messageId,
        content: body.content.trim(),
        timestamp: Date.now(),
      },
      201 // Created
    );
  } catch (error) {
    // Check for rate limit errors
    if (error instanceof Error) {
      if (error.message.includes("RATE_LIMIT") || error.message.includes("rate limit")) {
        return errorResponse(
          "RATE_LIMIT_CHAT",
          "Too many chat messages. Please slow down. Limit: 5 messages per 10 seconds",
          429
        );
      }
      if (error.message.includes("TOO_LONG")) {
        return errorResponse(
          "CHAT_MESSAGE_TOO_LONG",
          "Message content cannot exceed 500 characters",
          400
        );
      }
      if (error.message.includes("EMPTY")) {
        return errorResponse("CHAT_MESSAGE_EMPTY", "Message content cannot be empty", 400);
      }
    }

    return errorResponse(
      "SEND_MESSAGE_FAILED",
      error instanceof Error ? error.message : "Failed to send chat message",
      500
    );
  }
});

/**
 * GET /api/agents/chat/messages
 * Get recent global chat messages
 * No authentication required (public read)
 */
export const messages = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;

    // Validate limit
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse("INVALID_LIMIT", "Limit must be between 1 and 100", 400);
    }

    // Get recent messages (public query, no auth required)
    const chatMessages = await ctx.runQuery(getRecentMessagesQuery, {
      limit,
    });

    // Return success with messages
    return successResponse({
      messages: chatMessages,
      count: chatMessages.length,
      limit,
    });
  } catch (error) {
    return errorResponse(
      "GET_MESSAGES_FAILED",
      error instanceof Error ? error.message : "Failed to get chat messages",
      500
    );
  }
});

/**
 * GET /api/agents/chat/online-users
 * Get list of online users in Tavern Hall
 * No authentication required (public read)
 */
export const onlineUsers = httpAction(async (ctx, request) => {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  if (request.method !== "GET") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only GET method is allowed", 405);
  }

  try {
    // Get online users (public query, no auth required)
    const users = await ctx.runQuery(getOnlineUsersQuery, {});

    // Return success with users
    return successResponse({
      users,
      count: users.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    return errorResponse(
      "GET_ONLINE_USERS_FAILED",
      error instanceof Error ? error.message : "Failed to get online users",
      500
    );
  }
});
