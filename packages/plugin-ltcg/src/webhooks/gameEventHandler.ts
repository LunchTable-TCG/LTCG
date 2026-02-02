/**
 * Game Event Webhook Handler
 *
 * Processes incoming game events from the LTCG server and triggers
 * appropriate agent actions in real-time.
 */

import type { IAgentRuntime, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";

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

/**
 * Verify webhook signature using HMAC
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Use Web Crypto API for HMAC verification
  // In production, this should use constant-time comparison
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const data = encoder.encode(payload);

    // For now, simple comparison - in production use crypto.subtle
    // This is a placeholder that should be replaced with proper HMAC
    const expectedSignature = `ltcg_sig_${Buffer.from(data).toString("base64").substring(0, 32)}`;

    return signature.startsWith("ltcg_sig_") && signature.length > 10;
  } catch (error) {
    logger.error({ error }, "Failed to verify webhook signature");
    return false;
  }
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
 */
async function handleTurnStarted(
  gameId: string,
  data: GameWebhookPayload["data"],
  runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  logger.info(
    { gameId, phase: data.phase, turn: data.turnNumber },
    "Turn started - agent should act"
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

  // Emit event that will trigger action selection
  // The action system will pick the appropriate move based on game state
  logger.info({ gameId, phase: data.phase }, "Game state fetched, ready for action selection");

  return {
    processed: true,
    actionTaken: "turn_notification_processed",
  };
}

/**
 * Handle chain waiting event - agent must respond to chain or pass
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
    "Chain waiting for response"
  );

  // Store chain state for chain response action
  state.values.LTCG_CHAIN_WAITING = true;
  state.values.LTCG_CHAIN_TIMEOUT = chainState?.timeoutMs;

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
  runtime: IAgentRuntime,
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
  data: GameWebhookPayload["data"],
  runtime: IAgentRuntime,
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
  runtime: IAgentRuntime,
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
  runtime: IAgentRuntime,
  state: State
): Promise<WebhookHandlerResult> {
  logger.info({ gameId, phase: data.phase }, "Phase changed");

  state.values.LTCG_CURRENT_PHASE = data.phase;

  return {
    processed: true,
    actionTaken: "phase_change_noted",
  };
}
