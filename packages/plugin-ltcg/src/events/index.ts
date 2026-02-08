/**
 * LTCG Plugin Event Handlers
 *
 * Registers handlers for all 27 ElizaOS event types in EventPayloadMap,
 * PLUS custom LTCG platform events for game lifecycle, AI decisions,
 * and matchmaking.
 *
 * Design principles:
 * - Lightweight: no API calls, no heavy computation
 * - Fail-safe: every handler wrapped in try/catch
 * - Conditional: verbose events gated behind LTCG_DEBUG_MODE
 */

import type {
  ActionEventPayload,
  ChannelClearedPayload,
  ControlMessagePayload,
  EmbeddingGenerationPayload,
  EntityPayload,
  EvaluatorEventPayload,
  InvokePayload,
  MessagePayload,
  ModelEventPayload,
  PluginEvents,
  RunEventPayload,
  WorldPayload,
} from "@elizaos/core";
import { logger } from "../utils/logger";
import type {
  LTCGActionDecidedPayload,
  LTCGActionExecutedPayload,
  LTCGChainWaitingPayload,
  LTCGEventPayload,
  LTCGGameEndedPayload,
  LTCGGameStartedPayload,
  LTCGMatchmakingJoinedPayload,
  LTCGMatchmakingScanningPayload,
  LTCGOpponentActionPayload,
  LTCGPhaseChangedPayload,
  LTCGTurnCompletedPayload,
  LTCGTurnStartedPayload,
} from "./types";
import { LTCGEventType } from "./types";

// Re-export for consumers
export { emitLTCGEvent, LTCGEventType } from "./types";
export type { LTCGEventPayload, LTCGEventTypeName } from "./types";

// =============================================================================
// In-Memory Event Metrics
// =============================================================================

const eventMetrics = {
  messagesReceived: 0,
  messagesSent: 0,
  actionsStarted: 0,
  actionsCompleted: 0,
  runsStarted: 0,
  runsCompleted: 0,
  runsTimedOut: 0,
  modelCalls: 0,
  totalTokens: 0,
  embeddingsRequested: 0,
  embeddingsCompleted: 0,
  embeddingsFailed: 0,
  reactionsReceived: 0,
  interactionsReceived: 0,
  postsGenerated: 0,
  connectedAt: 0,
  // Custom LTCG game metrics
  gamesStarted: 0,
  gamesEnded: 0,
  gamesWon: 0,
  gamesLost: 0,
  turnsStarted: 0,
  turnsCompleted: 0,
  totalActionsInTurns: 0,
  chainsResponded: 0,
  phasesChanged: 0,
  opponentActions: 0,
  aiDecisions: 0,
  aiActionsExecuted: 0,
  aiActionsSucceeded: 0,
  aiActionsFailed: 0,
  matchmakingScans: 0,
  matchmakingJoins: 0,
};

/**
 * Get a snapshot of event metrics for StateAggregator or panel APIs
 */
export function getEventMetrics() {
  return { ...eventMetrics };
}

/**
 * Reset all event metrics (useful for testing)
 */
export function resetEventMetrics() {
  for (const key of Object.keys(eventMetrics)) {
    (eventMetrics as Record<string, number>)[key] = 0;
  }
}

// =============================================================================
// Helpers
// =============================================================================

const isDebug = () => process.env.LTCG_DEBUG_MODE === "true";

/**
 * Wraps an async handler in try/catch so event errors never crash the agent
 */
function safe<T>(name: string, fn: (payload: T) => Promise<void>) {
  return async (payload: T): Promise<void> => {
    try {
      await fn(payload);
    } catch (err) {
      logger.error(
        `LTCG event handler [${name}] error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
}

// =============================================================================
// World & Entity Events
// =============================================================================

const handleWorldJoined = safe<WorldPayload>("WORLD_JOINED", async (payload) => {
  eventMetrics.connectedAt = Date.now();
  logger.info(
    `LTCG: Joined world (source: ${payload.source}, rooms: ${payload.rooms?.length ?? 0}, entities: ${payload.entities?.length ?? 0})`
  );
});

const handleWorldConnected = safe<WorldPayload>("WORLD_CONNECTED", async (payload) => {
  if (!eventMetrics.connectedAt) {
    eventMetrics.connectedAt = Date.now();
  }
  logger.info(`LTCG: Connected to world (source: ${payload.source})`);
  if (process.env.LTCG_AUTO_MATCHMAKING === "true") {
    logger.info("LTCG: Auto-matchmaking enabled — agent ready to find games");
  }
});

const handleWorldLeft = safe<WorldPayload>("WORLD_LEFT", async (payload) => {
  logger.info(`LTCG: Left world (source: ${payload.source})`);
  if (process.env.LTCG_CURRENT_GAME_ID) {
    logger.warn("LTCG: Left world while game was active — possible unexpected disconnect");
  }
});

const handleEntityJoined = safe<EntityPayload>("ENTITY_JOINED", async (payload) => {
  const username = payload.metadata?.username ?? payload.entityId;
  if (isDebug()) {
    logger.debug(`LTCG: Entity joined (${username}, room: ${payload.roomId ?? "unknown"})`);
  }
});

const handleEntityLeft = safe<EntityPayload>("ENTITY_LEFT", async (payload) => {
  const username = payload.metadata?.username ?? payload.entityId;
  if (isDebug()) {
    logger.debug(`LTCG: Entity left (${username}, room: ${payload.roomId ?? "unknown"})`);
  }
});

const handleEntityUpdated = safe<EntityPayload>("ENTITY_UPDATED", async (payload) => {
  if (isDebug()) {
    logger.debug(`LTCG: Entity updated (${payload.entityId})`);
  }
});

// =============================================================================
// Message Events
// =============================================================================

const handleMessageReceived = safe<MessagePayload>("MESSAGE_RECEIVED", async (_payload) => {
  eventMetrics.messagesReceived++;
  if (isDebug()) {
    logger.debug("LTCG: MESSAGE_RECEIVED event");
  }
});

const handleMessageSent = safe<MessagePayload>("MESSAGE_SENT", async (_payload) => {
  eventMetrics.messagesSent++;
  if (isDebug()) {
    logger.debug("LTCG: MESSAGE_SENT event");
  }
});

const handleMessageDeleted = safe<MessagePayload>("MESSAGE_DELETED", async (_payload) => {
  if (isDebug()) {
    logger.debug("LTCG: MESSAGE_DELETED event");
  }
});

const handleChannelCleared = safe<ChannelClearedPayload>(
  "CHANNEL_CLEARED",
  async (payload) => {
    logger.info(
      `LTCG: Channel cleared (roomId: ${payload.roomId}, messages: ${payload.memoryCount})`
    );
  }
);

const handleVoiceMessageReceived = safe<MessagePayload>(
  "VOICE_MESSAGE_RECEIVED",
  async (_payload) => {
    if (isDebug()) {
      logger.debug("LTCG: VOICE_MESSAGE_RECEIVED event");
    }
  }
);

const handleVoiceMessageSent = safe<MessagePayload>(
  "VOICE_MESSAGE_SENT",
  async (_payload) => {
    if (isDebug()) {
      logger.debug("LTCG: VOICE_MESSAGE_SENT event");
    }
  }
);

// =============================================================================
// Interaction Events
// =============================================================================

const handleReactionReceived = safe<MessagePayload>(
  "REACTION_RECEIVED",
  async (_payload) => {
    eventMetrics.reactionsReceived++;
    if (isDebug()) {
      logger.debug("LTCG: REACTION_RECEIVED event");
    }
  }
);

const handlePostGenerated = safe<InvokePayload>("POST_GENERATED", async (_payload) => {
  eventMetrics.postsGenerated++;
  if (isDebug()) {
    logger.debug("LTCG: POST_GENERATED event");
  }
});

const handleInteractionReceived = safe<MessagePayload>(
  "INTERACTION_RECEIVED",
  async (_payload) => {
    eventMetrics.interactionsReceived++;
    if (isDebug()) {
      logger.debug("LTCG: INTERACTION_RECEIVED event");
    }
  }
);

// =============================================================================
// Run Lifecycle Events
// =============================================================================

const handleRunStarted = safe<RunEventPayload>("RUN_STARTED", async (payload) => {
  eventMetrics.runsStarted++;
  if (isDebug()) {
    logger.debug(`LTCG: Run started (runId: ${payload.runId}, room: ${payload.roomId})`);
  }
});

const handleRunEnded = safe<RunEventPayload>("RUN_ENDED", async (payload) => {
  eventMetrics.runsCompleted++;
  const duration = payload.duration ?? (payload.endTime ? payload.endTime - payload.startTime : 0);
  if (isDebug()) {
    logger.debug(
      `LTCG: Run ended (runId: ${payload.runId}, status: ${payload.status}, duration: ${duration}ms)`
    );
  }
});

const handleRunTimeout = safe<RunEventPayload>("RUN_TIMEOUT", async (payload) => {
  eventMetrics.runsTimedOut++;
  logger.warn(
    `LTCG: Run timed out (runId: ${payload.runId}, error: ${payload.error ?? "unknown"})`
  );
});

// =============================================================================
// Action & Evaluator Events
// =============================================================================

const handleActionStarted = safe<ActionEventPayload>("ACTION_STARTED", async (payload) => {
  eventMetrics.actionsStarted++;
  if (isDebug()) {
    const actionName = payload.content?.actions?.[0] ?? "unknown";
    logger.debug(`LTCG: Action started (${actionName}, room: ${payload.roomId})`);
  }
});

const handleActionCompleted = safe<ActionEventPayload>(
  "ACTION_COMPLETED",
  async (payload) => {
    eventMetrics.actionsCompleted++;
    if (isDebug()) {
      const actionName = payload.content?.actions?.[0] ?? "unknown";
      logger.debug(`LTCG: Action completed (${actionName}, room: ${payload.roomId})`);
    }
  }
);

const handleEvaluatorStarted = safe<EvaluatorEventPayload>(
  "EVALUATOR_STARTED",
  async (payload) => {
    if (isDebug()) {
      logger.debug(`LTCG: Evaluator started (${payload.evaluatorName})`);
    }
  }
);

const handleEvaluatorCompleted = safe<EvaluatorEventPayload>(
  "EVALUATOR_COMPLETED",
  async (payload) => {
    if (payload.error) {
      logger.warn(`LTCG: Evaluator failed (${payload.evaluatorName}: ${payload.error.message})`);
    } else if (isDebug()) {
      logger.debug(`LTCG: Evaluator completed (${payload.evaluatorName})`);
    }
  }
);

// =============================================================================
// Model Events
// =============================================================================

const handleModelUsed = safe<ModelEventPayload>("MODEL_USED", async (payload) => {
  eventMetrics.modelCalls++;
  if (payload.tokens?.total) {
    eventMetrics.totalTokens += payload.tokens.total;
  }
  if (isDebug()) {
    const tokenInfo = payload.tokens
      ? `tokens: ${payload.tokens.prompt}+${payload.tokens.completion}=${payload.tokens.total}`
      : "tokens: unknown";
    logger.debug(`LTCG: Model used (provider: ${payload.provider}, type: ${payload.type}, ${tokenInfo})`);
  }
});

// =============================================================================
// Embedding Events
// =============================================================================

const handleEmbeddingRequested = safe<EmbeddingGenerationPayload>(
  "EMBEDDING_GENERATION_REQUESTED",
  async (_payload) => {
    eventMetrics.embeddingsRequested++;
    if (isDebug()) {
      logger.debug("LTCG: Embedding generation requested");
    }
  }
);

const handleEmbeddingCompleted = safe<EmbeddingGenerationPayload>(
  "EMBEDDING_GENERATION_COMPLETED",
  async (_payload) => {
    eventMetrics.embeddingsCompleted++;
    if (isDebug()) {
      logger.debug("LTCG: Embedding generation completed");
    }
  }
);

const handleEmbeddingFailed = safe<EmbeddingGenerationPayload>(
  "EMBEDDING_GENERATION_FAILED",
  async (payload) => {
    eventMetrics.embeddingsFailed++;
    const errorMsg =
      payload.error instanceof Error
        ? payload.error.message
        : typeof payload.error === "string"
          ? payload.error
          : "unknown";
    logger.warn(`LTCG: Embedding generation failed (${errorMsg})`);
  }
);

// =============================================================================
// Control Events
// =============================================================================

const handleControlMessage = safe<ControlMessagePayload>(
  "CONTROL_MESSAGE",
  async (payload) => {
    logger.info(
      `LTCG: Control message received (type: ${payload.message.type}, source: ${payload.source})`
    );
  }
);

// =============================================================================
// Custom LTCG Platform Event Handlers
// =============================================================================

const handleLtcgGameStarted = safe<LTCGGameStartedPayload>(
  LTCGEventType.GAME_STARTED,
  async (payload) => {
    eventMetrics.gamesStarted++;
    logger.info(`LTCG: Game started (gameId: ${payload.gameId})`);
  }
);

const handleLtcgGameEnded = safe<LTCGGameEndedPayload>(
  LTCGEventType.GAME_ENDED,
  async (payload) => {
    eventMetrics.gamesEnded++;
    if (payload.winner === "agent") {
      eventMetrics.gamesWon++;
    } else {
      eventMetrics.gamesLost++;
    }
    logger.info(
      `LTCG: Game ended (gameId: ${payload.gameId}, winner: ${payload.winner}, reason: ${payload.reason})`
    );
  }
);

const handleLtcgTurnStarted = safe<LTCGTurnStartedPayload>(
  LTCGEventType.TURN_STARTED,
  async (payload) => {
    eventMetrics.turnsStarted++;
    logger.info(
      `LTCG: Turn started (gameId: ${payload.gameId}, turn: ${payload.turnNumber}, phase: ${payload.phase})`
    );
  }
);

const handleLtcgTurnCompleted = safe<LTCGTurnCompletedPayload>(
  LTCGEventType.TURN_COMPLETED,
  async (payload) => {
    eventMetrics.turnsCompleted++;
    eventMetrics.totalActionsInTurns += payload.actionCount;
    logger.info(
      `LTCG: Turn completed (gameId: ${payload.gameId}, turn: ${payload.turnNumber}, actions: ${payload.actionCount})`
    );
  }
);

const handleLtcgChainWaiting = safe<LTCGChainWaitingPayload>(
  LTCGEventType.CHAIN_WAITING,
  async (payload) => {
    eventMetrics.chainsResponded++;
    logger.info(
      `LTCG: Chain waiting (gameId: ${payload.gameId}, timeout: ${payload.timeoutMs}ms)`
    );
  }
);

const handleLtcgPhaseChanged = safe<LTCGPhaseChangedPayload>(
  LTCGEventType.PHASE_CHANGED,
  async (payload) => {
    eventMetrics.phasesChanged++;
    if (isDebug()) {
      logger.debug(
        `LTCG: Phase changed (gameId: ${payload.gameId}, phase: ${payload.phase}, turn: ${payload.turnNumber})`
      );
    }
  }
);

const handleLtcgOpponentAction = safe<LTCGOpponentActionPayload>(
  LTCGEventType.OPPONENT_ACTION,
  async (payload) => {
    eventMetrics.opponentActions++;
    if (isDebug()) {
      logger.debug(
        `LTCG: Opponent action (gameId: ${payload.gameId}, type: ${payload.actionType}, desc: ${payload.description})`
      );
    }
  }
);

const handleLtcgActionDecided = safe<LTCGActionDecidedPayload>(
  LTCGEventType.ACTION_DECIDED,
  async (payload) => {
    eventMetrics.aiDecisions++;
    logger.info(
      `LTCG: AI decided (gameId: ${payload.gameId}, action: ${payload.action}, turn: ${payload.turnNumber})`
    );
    if (isDebug()) {
      logger.debug(`LTCG: AI reasoning: ${payload.reasoning}`);
    }
  }
);

const handleLtcgActionExecuted = safe<LTCGActionExecutedPayload>(
  LTCGEventType.ACTION_EXECUTED,
  async (payload) => {
    eventMetrics.aiActionsExecuted++;
    if (payload.success) {
      eventMetrics.aiActionsSucceeded++;
    } else {
      eventMetrics.aiActionsFailed++;
    }
    if (isDebug()) {
      logger.debug(
        `LTCG: AI action executed (gameId: ${payload.gameId}, action: ${payload.action}, success: ${payload.success}, time: ${payload.executionTimeMs}ms)`
      );
    }
  }
);

const handleLtcgMatchmakingScanning = safe<LTCGMatchmakingScanningPayload>(
  LTCGEventType.MATCHMAKING_SCANNING,
  async (payload) => {
    eventMetrics.matchmakingScans++;
    if (isDebug()) {
      logger.debug(`LTCG: Matchmaking scan (lobbies found: ${payload.lobbiesFound})`);
    }
  }
);

const handleLtcgMatchmakingJoined = safe<LTCGMatchmakingJoinedPayload>(
  LTCGEventType.MATCHMAKING_JOINED,
  async (payload) => {
    eventMetrics.matchmakingJoins++;
    logger.info(
      `LTCG: Matchmaking joined (lobbyId: ${payload.lobbyId}, opponent: ${payload.opponent}, gameId: ${payload.gameId})`
    );
  }
);

// =============================================================================
// Export: All 27 Standard + 11 Custom Event Handlers
// =============================================================================

// Standard ElizaOS events (typed)
const standardEvents: PluginEvents = {
  // World & Entity (6)
  WORLD_JOINED: [handleWorldJoined],
  WORLD_CONNECTED: [handleWorldConnected],
  WORLD_LEFT: [handleWorldLeft],
  ENTITY_JOINED: [handleEntityJoined],
  ENTITY_LEFT: [handleEntityLeft],
  ENTITY_UPDATED: [handleEntityUpdated],

  // Messages (6)
  MESSAGE_RECEIVED: [handleMessageReceived],
  MESSAGE_SENT: [handleMessageSent],
  MESSAGE_DELETED: [handleMessageDeleted],
  CHANNEL_CLEARED: [handleChannelCleared],
  VOICE_MESSAGE_RECEIVED: [handleVoiceMessageReceived],
  VOICE_MESSAGE_SENT: [handleVoiceMessageSent],

  // Interactions (3)
  REACTION_RECEIVED: [handleReactionReceived],
  POST_GENERATED: [handlePostGenerated],
  INTERACTION_RECEIVED: [handleInteractionReceived],

  // Run Lifecycle (3)
  RUN_STARTED: [handleRunStarted],
  RUN_ENDED: [handleRunEnded],
  RUN_TIMEOUT: [handleRunTimeout],

  // Action & Evaluator (4)
  ACTION_STARTED: [handleActionStarted],
  ACTION_COMPLETED: [handleActionCompleted],
  EVALUATOR_STARTED: [handleEvaluatorStarted],
  EVALUATOR_COMPLETED: [handleEvaluatorCompleted],

  // Model (1)
  MODEL_USED: [handleModelUsed],

  // Embeddings (3)
  EMBEDDING_GENERATION_REQUESTED: [handleEmbeddingRequested],
  EMBEDDING_GENERATION_COMPLETED: [handleEmbeddingCompleted],
  EMBEDDING_GENERATION_FAILED: [handleEmbeddingFailed],

  // Control (1)
  CONTROL_MESSAGE: [handleControlMessage],
};

// Custom LTCG platform events (runtime accepts string keys via RuntimeEventStorage)
const customEvents: Record<string, ((params: unknown) => Promise<void>)[]> = {
  [LTCGEventType.GAME_STARTED]: [handleLtcgGameStarted],
  [LTCGEventType.GAME_ENDED]: [handleLtcgGameEnded],
  [LTCGEventType.TURN_STARTED]: [handleLtcgTurnStarted],
  [LTCGEventType.TURN_COMPLETED]: [handleLtcgTurnCompleted],
  [LTCGEventType.CHAIN_WAITING]: [handleLtcgChainWaiting],
  [LTCGEventType.PHASE_CHANGED]: [handleLtcgPhaseChanged],
  [LTCGEventType.OPPONENT_ACTION]: [handleLtcgOpponentAction],
  [LTCGEventType.ACTION_DECIDED]: [handleLtcgActionDecided],
  [LTCGEventType.ACTION_EXECUTED]: [handleLtcgActionExecuted],
  [LTCGEventType.MATCHMAKING_SCANNING]: [handleLtcgMatchmakingScanning],
  [LTCGEventType.MATCHMAKING_JOINED]: [handleLtcgMatchmakingJoined],
};

// Merge standard + custom events
// The runtime's RuntimeEventStorage type accepts both typed EventPayloadMap keys
// and arbitrary string keys, so custom events are fully supported at runtime.
export const ltcgEvents: PluginEvents = {
  ...standardEvents,
  ...customEvents,
} as PluginEvents;
