/**
 * Game Event Webhook Handler
 *
 * Processes incoming game events from the LTCG server and triggers
 * appropriate agent actions in real-time.
 */

import type { IAgentRuntime, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import { type ITurnOrchestrator, SERVICE_TYPES } from "../services/types";

/**
 * Webhook event types sent by the game server
 */
export type WebhookEventType =
  | "turn_started" // It's the agent's turn
  | "game_started" // Game has begun
  | "game_ended" // Game completed
  | "opponent_action" // Opponent made a move
  | "chain_waiting" // Waiting for chain response
  | "phase_changed"; // Phase transitioned

/**
 * Webhook payload structure
 */
export interface GameWebhookPayload {
  eventType: WebhookEventType;
  gameId: string;
  agentId: string;
  timestamp: number;
  signature: string; // HMAC signature for verification
  data: {
    phase?: string;
    turnNumber?: number;
    opponentAction?: {
      type: string;
      description: string;
    };
    chainState?: {
      isWaiting: boolean;
      timeoutMs: number;
    };
    gameResult?: {
      winner: "agent" | "opponent";
      reason: string;
    };
  };
}

/**
 * Webhook handler response
 */
export interface WebhookHandlerResult {
  processed: boolean;
  actionTaken?: string;
  error?: string;
}

// Webhook security constants
const WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const processedWebhooks = new Set<string>();

/**
 * Verify webhook signature using HMAC-SHA256
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Remove signature prefix if present
    const cleanSignature = signature.replace(/^ltcg_sig_/, "");

    // Create HMAC using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const data = encoder.encode(payload);
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, data);

    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Constant-time comparison
    return constantTimeCompare(cleanSignature, expectedSignature);
  } catch (error) {
    logger.error({ error }, "Failed to verify webhook signature");
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate webhook timestamp is fresh (prevents replay attacks)
 */
export function validateWebhookTimestamp(timestamp: number): boolean {
  const age = Date.now() - timestamp;
  return age >= 0 && age < WEBHOOK_MAX_AGE_MS;
}

/**
 * Check if webhook has already been processed (idempotency)
 * Returns true if webhook should be processed, false if duplicate
 */
export function checkWebhookIdempotency(
  gameId: string,
  timestamp: number,
  eventType: string
): boolean {
  const webhookId = `${gameId}:${timestamp}:${eventType}`;

  if (processedWebhooks.has(webhookId)) {
    return false; // Already processed
  }

  processedWebhooks.add(webhookId);

  // Clean up old entries after 10 minutes to prevent memory leak
  setTimeout(() => processedWebhooks.delete(webhookId), 10 * 60 * 1000);

  return true;
}

/**
 * Clear processed webhooks (for testing or service restart)
 */
export function clearProcessedWebhooks(): void {
  processedWebhooks.clear();
}

/**
 * Handle incoming game event webhook
 */
export async function handleGameWebhook(
  payload: GameWebhookPayload,
  runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  const { eventType, gameId, data } = payload;

  logger.info({ eventType, gameId, data }, "Processing game webhook");

  // Store game ID in state for actions to use
  state.values.LTCG_CURRENT_GAME_ID = gameId;

  try {
    switch (eventType) {
      case "turn_started":
        return await handleTurnStarted(gameId, data, runtime, state);

      case "chain_waiting":
        return await handleChainWaiting(gameId, data, runtime, state);

      case "opponent_action":
        return await handleOpponentAction(gameId, data, runtime, state);

      case "game_started":
        return await handleGameStarted(gameId, data, runtime, state);

      case "game_ended":
        return await handleGameEnded(gameId, data, runtime, state);

      case "phase_changed":
        return await handlePhaseChanged(gameId, data, runtime, state);

      default:
        logger.warn({ eventType }, "Unknown webhook event type");
        return { processed: false, error: "Unknown event type" };
    }
  } catch (error) {
    logger.error({ error, eventType, gameId }, "Error handling game webhook");
    return {
      processed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle turn started event - agent should make a move
 *
 * This triggers the TurnOrchestrator to begin autonomous turn execution.
 * The orchestrator will make LLM calls to decide actions and execute them.
 */
async function handleTurnStarted(
  gameId: string,
  data: GameWebhookPayload["data"],
  runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  logger.info(
    { gameId, phase: data.phase, turn: data.turnNumber },
    "Turn started - triggering autonomous turn execution"
  );

  // Get API client
  const apiKey = runtime.getSetting("LTCG_API_KEY") as string;
  const apiUrl = runtime.getSetting("LTCG_API_URL") as string;

  if (!apiKey || !apiUrl) {
    return { processed: false, error: "API credentials not configured" };
  }

  const client = new LTCGApiClient({ apiKey, baseUrl: apiUrl });

  // Fetch current game state
  const gameState = await client.getGameState(gameId);

  // Store in state for providers
  state.values.LTCG_GAME_STATE = gameState;
  state.values.LTCG_CURRENT_PHASE = data.phase;
  state.values.LTCG_TURN_NUMBER = data.turnNumber;

  // Trigger TurnOrchestrator for autonomous gameplay
  const orchestrator = runtime.getService(
    SERVICE_TYPES.ORCHESTRATOR
  ) as unknown as ITurnOrchestrator | null;

  if (orchestrator) {
    // Fire-and-forget: orchestrator handles the full turn asynchronously
    orchestrator
      .onTurnStarted(gameId, data.phase ?? "main1", data.turnNumber ?? 1)
      .catch((error) => {
        logger.error({ error, gameId }, "TurnOrchestrator error during turn execution");
      });

    logger.info({ gameId, phase: data.phase }, "TurnOrchestrator triggered for autonomous play");

    return {
      processed: true,
      actionTaken: "autonomous_turn_started",
    };
  }

  // Fallback: orchestrator not available
  logger.warn({ gameId }, "TurnOrchestrator not available - turn will not be autonomous");

  return {
    processed: true,
    actionTaken: "turn_notification_processed",
  };
}

/**
 * Handle chain waiting event - agent must respond to chain or pass
 *
 * This triggers the TurnOrchestrator to decide whether to chain or pass.
 */
async function handleChainWaiting(
  gameId: string,
  data: GameWebhookPayload["data"],
  runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  const chainState = data.chainState;

  logger.info(
    { gameId, isWaiting: chainState?.isWaiting, timeoutMs: chainState?.timeoutMs },
    "Chain waiting - triggering chain response decision"
  );

  // Store chain state for chain response action
  state.values.LTCG_CHAIN_WAITING = true;
  state.values.LTCG_CHAIN_TIMEOUT = chainState?.timeoutMs;

  // Trigger TurnOrchestrator for chain response
  const orchestrator = runtime.getService(
    SERVICE_TYPES.ORCHESTRATOR
  ) as unknown as ITurnOrchestrator | null;

  if (orchestrator) {
    // Fire-and-forget: orchestrator handles chain response asynchronously
    orchestrator.onChainWaiting(gameId, chainState?.timeoutMs ?? 30000).catch((error) => {
      logger.error({ error, gameId }, "TurnOrchestrator error during chain response");
    });

    logger.info({ gameId }, "TurnOrchestrator triggered for chain response");

    return {
      processed: true,
      actionTaken: "autonomous_chain_response_started",
    };
  }

  // Fallback: orchestrator not available
  logger.warn({ gameId }, "TurnOrchestrator not available - chain response will not be autonomous");

  return {
    processed: true,
    actionTaken: "chain_notification_processed",
  };
}

/**
 * Handle opponent action event - for trash talk or reaction
 */
async function handleOpponentAction(
  gameId: string,
  data: GameWebhookPayload["data"],
  _runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  const oppAction = data.opponentAction;

  logger.info(
    { gameId, actionType: oppAction?.type, description: oppAction?.description },
    "Opponent made an action"
  );

  // Store for react action
  state.values.LTCG_LAST_OPPONENT_ACTION = oppAction;

  return {
    processed: true,
    actionTaken: "opponent_action_noted",
  };
}

/**
 * Handle game started event
 */
async function handleGameStarted(
  gameId: string,
  _data: GameWebhookPayload["data"],
  _runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  logger.info({ gameId }, "Game has started");

  // Store game ID
  state.values.LTCG_CURRENT_GAME_ID = gameId;
  state.values.LTCG_GAME_ACTIVE = true;

  return {
    processed: true,
    actionTaken: "game_started_acknowledged",
  };
}

/**
 * Handle game ended event
 */
async function handleGameEnded(
  gameId: string,
  data: GameWebhookPayload["data"],
  _runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  const result = data.gameResult;

  logger.info({ gameId, winner: result?.winner, reason: result?.reason }, "Game has ended");

  // Clear game state
  state.values.LTCG_CURRENT_GAME_ID = undefined;
  state.values.LTCG_GAME_ACTIVE = false;
  state.values.LTCG_GAME_RESULT = result;

  return {
    processed: true,
    actionTaken: result?.winner === "agent" ? "victory_acknowledged" : "defeat_acknowledged",
  };
}

/**
 * Handle phase changed event
 */
async function handlePhaseChanged(
  gameId: string,
  data: GameWebhookPayload["data"],
  _runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  logger.info({ gameId, phase: data.phase }, "Phase changed");

  state.values.LTCG_CURRENT_PHASE = data.phase;

  return {
    processed: true,
    actionTaken: "phase_change_noted",
  };
}
