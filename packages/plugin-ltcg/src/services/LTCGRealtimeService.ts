/**
 * LTCG Real-Time Service
 *
 * Manages Convex real-time subscriptions for game state updates,
 * turn notifications, and game events.
 */

import { type IAgentRuntime, Service, logger } from "@elizaos/core";
import type {
  GameEventCallback,
  GameStateCallback,
  TurnNotificationCallback,
} from "../client/events";
import { ConvexRealtimeClient } from "../client/realtimeClient";

export class LTCGRealtimeService extends Service {
  static serviceType = "ltcg-realtime";

  private client: ConvexRealtimeClient | null = null;

  capabilityDescription = "Provides real-time game state updates via Convex subscriptions";

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<LTCGRealtimeService> {
    logger.info("*** Starting LTCG real-time service ***");

    const service = new LTCGRealtimeService(runtime);

    // Initialize Convex client if URL is configured
    const convexUrl = runtime.getSetting("LTCG_CONVEX_URL") || runtime.getSetting("CONVEX_URL");
    const debugMode = runtime.getSetting("LTCG_DEBUG_MODE") === "true";

    if (convexUrl) {
      try {
        service.client = new ConvexRealtimeClient({
          convexUrl: convexUrl as string,
          debug: debugMode,
        });

        logger.info("Convex real-time client initialized");
      } catch (error) {
        logger.error({ error }, "Failed to initialize Convex real-time client");
      }
    } else {
      logger.warn("CONVEX_URL not configured - real-time updates disabled");
    }

    return service;
  }

  static async stop(runtime: IAgentRuntime): Promise<void> {
    logger.info("*** Stopping LTCG real-time service ***");

    const service = runtime.getService(LTCGRealtimeService.serviceType) as LTCGRealtimeService;

    if (!service) {
      throw new Error("LTCG real-time service not found");
    }

    await service.stop();
  }

  async stop(): Promise<void> {
    logger.info("*** Stopping LTCG real-time service instance ***");

    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Get the Convex real-time client
   */
  getClient(): ConvexRealtimeClient | null {
    return this.client;
  }

  /**
   * Subscribe to game state changes
   */
  subscribeToGame(gameId: string, callback: GameStateCallback): (() => void) | null {
    if (!this.client) {
      logger.warn("Convex client not initialized - cannot subscribe to game");
      return null;
    }

    return this.client.subscribeToGame(gameId, callback);
  }

  /**
   * Subscribe to turn notifications
   */
  subscribeToTurns(userId: string, callback: TurnNotificationCallback): (() => void) | null {
    if (!this.client) {
      logger.warn("Convex client not initialized - cannot subscribe to turns");
      return null;
    }

    return this.client.subscribeToTurnNotifications(userId, callback);
  }

  /**
   * Subscribe to game events
   */
  subscribeToEvents(gameId: string, callback: GameEventCallback): (() => void) | null {
    if (!this.client) {
      logger.warn("Convex client not initialized - cannot subscribe to events");
      return null;
    }

    return this.client.subscribeToGameEvents(gameId, callback);
  }

  /**
   * Check if real-time client is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.client.isClientConnected();
  }
}
