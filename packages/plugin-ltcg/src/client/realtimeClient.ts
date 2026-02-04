/**
 * Convex Real-Time Subscription Client
 *
 * Manages WebSocket-based subscriptions to Convex queries for real-time
 * game state updates, turn notifications, and game events.
 *
 * This client uses ConvexClient from convex/browser which establishes
 * a WebSocket connection to receive live updates when data changes.
 */

import { ConvexClient } from "convex/browser";
import type { BoardCard, GameEvent, GameStateResponse } from "../types/api";
import type {
  GameEventCallback,
  GameStateCallback,
  Subscription,
  TurnNotificationCallback,
} from "./events";

/**
 * Interface for ConvexClient methods used by ConvexRealtimeClient.
 * This allows for dependency injection of a mock client in tests.
 */
import type { ConvexQueryArgs, Unsubscribe } from "../types/eliza";

// Convex function reference type
export type ConvexFunction = {
  _functionName: string;
  [key: string]: unknown;
};

export interface IConvexClient {
  setAuth(fetchToken: () => Promise<string | null | undefined>): void;
  clearAuth?(): void;
  onUpdate<T>(
    query: ConvexFunction,
    args: ConvexQueryArgs,
    callback: (result: T) => void
  ): Unsubscribe;
  query<T>(query: ConvexFunction, args: ConvexQueryArgs): Promise<T>;
  close(): void;
}

export interface ConvexRealtimeClientConfig {
  /**
   * Convex deployment URL
   * Format: https://your-deployment.convex.cloud
   */
  convexUrl: string;

  /**
   * Authentication token for Convex
   * This should be the JWT token from agent registration
   */
  authToken?: string;

  /**
   * Enable debug logging
   */
  debug?: boolean;

  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;

  /**
   * Optional injected client for testing purposes.
   * @internal
   */
  _testClient?: IConvexClient;
}

/**
 * Real-time client for Convex subscriptions
 *
 * Provides methods to subscribe to game state changes, turn notifications,
 * and game events using Convex's reactive query system.
 */
export class ConvexRealtimeClient {
  private client: IConvexClient;
  private subscriptions: Map<string, Subscription>;
  private debug: boolean;
  private isConnected: boolean;
  private authToken?: string;

  constructor(config: ConvexRealtimeClientConfig) {
    if (!config.convexUrl) {
      throw new Error("Convex URL is required");
    }

    // Use injected test client if provided, otherwise create real ConvexClient
    this.client = (config._testClient ?? new ConvexClient(config.convexUrl)) as IConvexClient;
    this.subscriptions = new Map();
    this.debug = config.debug ?? false;
    this.isConnected = false;
    this.authToken = config.authToken;

    // Set auth if provided
    if (this.authToken) {
      this.client.setAuth(async () => this.authToken || null);
    }

    // Connection state tracking
    this.setupConnectionHandlers();
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Set up connection state handlers
   */
  private setupConnectionHandlers() {
    // ConvexClient handles reconnection automatically
    // We just track connection state for isConnected()
    this.isConnected = true;

    if (this.debug) {
      console.log("[ConvexRealtimeClient] Client initialized");
    }
  }

  /**
   * Set authentication token
   */
  setAuth(token: string) {
    this.authToken = token;
    this.client.setAuth(async () => token);

    if (this.debug) {
      console.log("[ConvexRealtimeClient] Authentication token set");
    }
  }

  /**
   * Clear authentication token
   */
  clearAuth() {
    this.authToken = undefined;
    this.client.clearAuth?.();

    if (this.debug) {
      console.log("[ConvexRealtimeClient] Authentication token cleared");
    }
  }

  /**
   * Check if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  // ============================================================================
  // Game State Subscriptions
  // ============================================================================

  /**
   * Subscribe to game state changes for a specific game
   *
   * @param gameId - The lobby ID of the game to subscribe to
   * @param callback - Called whenever game state changes
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = client.subscribeToGame('game123', (state) => {
   *   console.log('Game updated:', state.phase, state.currentTurnPlayer);
   * });
   *
   * // Later: cleanup
   * unsub();
   * ```
   */
  subscribeToGame(gameId: string, callback: GameStateCallback): () => void {
    const subscriptionId = `game:${gameId}`;

    if (this.subscriptions.has(subscriptionId)) {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Already subscribed to game ${gameId}`);
      }
      // Return existing unsubscribe function or no-op if not found
      return this.subscriptions.get(subscriptionId)?.unsubscribe ?? (() => {});
    }

    if (this.debug) {
      console.log(`[ConvexRealtimeClient] Subscribing to game ${gameId}`);
    }

    // Subscribe to game state query
    // Using string paths since we don't have the generated API object
    const convexQuery: ConvexFunction = {
      _functionName: "gameplay/games/queries:getGameStateForPlayer",
    };
    const unsubscribe = this.client.onUpdate(
      convexQuery,
      { lobbyId: gameId },
      (result: GameStateResponse) => {
        if (this.debug) {
          console.log(`[ConvexRealtimeClient] Game ${gameId} state updated`);
        }

        // Convert result to GameStateResponse format
        if (result) {
          callback(this.formatGameState(result));
        }
      }
    );

    // Store subscription
    const subscription: Subscription = {
      id: subscriptionId,
      type: "game",
      gameId,
      unsubscribe,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Return unsubscribe function that also cleans up our tracking
    return () => {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Unsubscribing from game ${gameId}`);
      }
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    };
  }

  /**
   * Subscribe to turn notifications for a user
   *
   * Notifies when it's the user's turn in any of their active games.
   *
   * @param userId - The user ID to check for pending turns
   * @param callback - Called with array of game IDs where it's the user's turn
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = client.subscribeToTurnNotifications('user456', (gameIds) => {
   *   console.log('Your turn in games:', gameIds);
   * });
   * ```
   */
  subscribeToTurnNotifications(userId: string, callback: TurnNotificationCallback): () => void {
    const subscriptionId = `turns:${userId}`;

    if (this.subscriptions.has(subscriptionId)) {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Already subscribed to turns for ${userId}`);
      }
      return this.subscriptions.get(subscriptionId)?.unsubscribe ?? (() => {});
    }

    if (this.debug) {
      console.log(`[ConvexRealtimeClient] Subscribing to turn notifications for ${userId}`);
    }

    // Subscribe to active lobby query and check if it's user's turn
    const lobbyQuery: ConvexFunction = {
      _functionName: "gameplay/games/queries:getActiveLobby",
    };
    const unsubscribe = this.client.onUpdate(
      lobbyQuery,
      { userId },
      (result: { _id: string } | null) => {
        if (this.debug) {
          console.log(`[ConvexRealtimeClient] Active lobby updated for ${userId}`);
        }

        if (!result) {
          callback([]);
          return;
        }

        // Check if it's the user's turn by querying game state
        // Note: In a production implementation, you might want to batch these
        // or have a dedicated query that returns pending turns
        const gameStateQuery: ConvexFunction = {
          _functionName: "gameplay/games/queries:getGameStateForPlayer",
        };
        this.client
          .query<GameStateResponse>(gameStateQuery, {
            lobbyId: result._id,
          })
          .then((gameState) => {
            if (gameState && gameState.currentTurnPlayer === userId) {
              callback([result._id]);
            } else {
              callback([]);
            }
          })
          .catch((error: Error) => {
            if (this.debug) {
              console.error("[ConvexRealtimeClient] Error checking turn status:", error);
            }
            callback([]);
          });
      }
    );

    // Store subscription
    const subscription: Subscription = {
      id: subscriptionId,
      type: "turns",
      userId,
      unsubscribe,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    return () => {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Unsubscribing from turns for ${userId}`);
      }
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    };
  }

  /**
   * Subscribe to game events for a specific game
   *
   * Notifies when game actions occur (summons, attacks, spell activations, etc.)
   *
   * @param gameId - The game ID to subscribe to
   * @param callback - Called when a game event occurs
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsub = client.subscribeToGameEvents('game123', (event) => {
   *   console.log('Game event:', event.eventType, event.description);
   * });
   * ```
   */
  subscribeToGameEvents(gameId: string, callback: GameEventCallback): () => void {
    const subscriptionId = `events:${gameId}`;

    if (this.subscriptions.has(subscriptionId)) {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Already subscribed to events for ${gameId}`);
      }
      return this.subscriptions.get(subscriptionId)?.unsubscribe ?? (() => {});
    }

    if (this.debug) {
      console.log(`[ConvexRealtimeClient] Subscribing to events for game ${gameId}`);
    }

    // Track last event to detect new ones
    let lastEventId: string | null = null;

    // Subscribe to game state and extract latest event
    const eventQuery: ConvexFunction = {
      _functionName: "gameplay/games/queries:getGameStateForPlayer",
    };
    const unsubscribe = this.client.onUpdate(
      eventQuery,
      { lobbyId: gameId },
      (result: {
        gameEvents?: Array<{ eventId: string; eventType: string }>;
      }) => {
        if (!result || !result.gameEvents || result.gameEvents.length === 0) {
          return;
        }

        // Get the latest event
        const latestEvent = result.gameEvents[result.gameEvents.length - 1];

        // Only emit if this is a new event
        if (latestEvent.eventId !== lastEventId) {
          lastEventId = latestEvent.eventId;

          if (this.debug) {
            console.log(
              `[ConvexRealtimeClient] New game event for ${gameId}:`,
              latestEvent.eventType
            );
          }

          // Cast to GameEvent with required properties - the callback expects a minimal event
          const gameEvent = latestEvent as unknown as GameEvent;
          callback(gameEvent);
        }
      }
    );

    // Store subscription
    const subscription: Subscription = {
      id: subscriptionId,
      type: "events",
      gameId,
      unsubscribe,
      createdAt: Date.now(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    return () => {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Unsubscribing from events for ${gameId}`);
      }
      unsubscribe();
      this.subscriptions.delete(subscriptionId);
    };
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Unsubscribe from a specific subscription by key
   *
   * @param key - The subscription key (e.g., "game:123" or "turns:user456")
   */
  unsubscribe(key: string) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      if (this.debug) {
        console.log(`[ConvexRealtimeClient] Unsubscribing from ${key}`);
      }
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   *
   * Should be called when shutting down the client to clean up resources.
   */
  unsubscribeAll() {
    if (this.debug) {
      console.log(
        `[ConvexRealtimeClient] Unsubscribing from all ${this.subscriptions.size} subscriptions`
      );
    }

    // Convert to array to avoid iterator issues
    const entries = Array.from(this.subscriptions.entries());
    for (const [key, subscription] of entries) {
      try {
        subscription.unsubscribe();
      } catch (error) {
        if (this.debug) {
          console.error(`[ConvexRealtimeClient] Error unsubscribing from ${key}:`, error);
        }
      }
    }

    this.subscriptions.clear();
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Close the client and clean up all subscriptions
   */
  close() {
    if (this.debug) {
      console.log("[ConvexRealtimeClient] Closing client");
    }

    this.unsubscribeAll();
    this.client.close();
    this.isConnected = false;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Format Convex query result to GameStateResponse
   */
  private formatGameState(result: GameStateResponse): GameStateResponse {
    // The query returns a comprehensive game state object
    // We map it to the GameStateResponse format

    // Determine if this player is the host based on available data
    const isHost = result.currentTurn === "host";

    return {
      gameId: result.lobbyId || result.gameId,
      lobbyId: result.lobbyId || result.gameId,
      status: result.status || "active",
      currentTurn: result.currentTurn || "host",
      currentTurnPlayer: result.currentTurnPlayer || "",
      isMyTurn: result.isMyTurn ?? false,
      phase: result.phase || "main1",
      turnNumber: result.turnNumber || 1,

      // New format fields
      myLifePoints: isHost ? result.hostLifePoints || 0 : result.opponentLifePoints || 0,
      opponentLifePoints: isHost ? result.opponentLifePoints || 0 : result.hostLifePoints || 0,
      myBoard:
        ((isHost ? result.hostMonsters : result.opponentMonsters) as unknown as BoardCard[]) || [],
      opponentBoard:
        ((isHost ? result.opponentMonsters : result.hostMonsters) as unknown as BoardCard[]) || [],
      myDeckCount: (isHost ? result.hostDeckCount : result.opponentDeckCount) || 0,
      opponentDeckCount: (isHost ? result.opponentDeckCount : result.hostDeckCount) || 0,
      myGraveyardCount:
        (isHost ? result.hostGraveyard?.length : result.opponentGraveyard?.length) || 0,
      opponentGraveyardCount:
        (isHost ? result.opponentGraveyard?.length : result.hostGraveyard?.length) || 0,
      opponentHandCount: result.opponentHandCount || 0,

      // Legacy fields for compatibility
      hostPlayer: {
        playerId: result.hostId || "",
        lifePoints: result.hostLifePoints || 0,
        deckCount: result.hostDeckCount || 0,
        monsterZone: result.hostMonsters || [],
        spellTrapZone: result.hostSpellTraps || [],
        graveyard: result.hostGraveyard || [],
        banished: result.hostBanished || [],
        extraDeck: result.hostExtraDeckCount || 0,
      },

      opponentPlayer: {
        playerId: result.opponentId || "",
        lifePoints: result.opponentLifePoints || 0,
        deckCount: result.opponentDeckCount || 0,
        monsterZone: result.opponentMonsters || [],
        spellTrapZone: result.opponentSpellTraps || [],
        graveyard: result.opponentGraveyard || [],
        banished: result.opponentBanished || [],
        extraDeck: result.opponentExtraDeckCount || 0,
      },

      hand: result.myHand || [],
      hasNormalSummoned: result.hasNormalSummoned || false,
      canChangePosition: Array.isArray(result.monsterPositionChanges)
        ? result.monsterPositionChanges.map(() => true)
        : [],
    };
  }
}
