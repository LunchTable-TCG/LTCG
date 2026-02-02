/**
 * ConvexRealtimeClient Usage Examples
 *
 * This file demonstrates how to use the ConvexRealtimeClient for
 * real-time game updates in the LTCG ElizaOS plugin.
 */

import type { GameEventCallback, GameStateCallback, TurnNotificationCallback } from "../events";
import { ConvexRealtimeClient } from "../realtimeClient";

// ============================================================================
// Basic Setup
// ============================================================================

/**
 * Example 1: Initialize the client
 */
function initializeClient() {
  const client = new ConvexRealtimeClient({
    convexUrl: process.env['CONVEX_URL'] || "https://your-deployment.convex.cloud",
    authToken: "your-jwt-token-from-agent-registration",
    debug: process.env['NODE_ENV'] === "development",
  });

  return client;
}

// ============================================================================
// Game State Monitoring
// ============================================================================

/**
 * Example 2: Subscribe to game state updates
 *
 * Use this to monitor when game state changes (cards played, attacks, etc.)
 */
function monitorGameState(client: ConvexRealtimeClient, gameId: string) {
  const callback: GameStateCallback = (state) => {
    console.log(`Game ${gameId} updated:`);
    console.log(`  Phase: ${state.phase}`);
    console.log(`  Turn: ${state.turnNumber}`);
    console.log(`  Current Player: ${state.currentTurn}`);
    console.log(`  My Life Points: ${state.hostPlayer.lifePoints}`);
    console.log(`  Opponent Life Points: ${state.opponentPlayer.lifePoints}`);
    console.log(`  Cards in Hand: ${state.hand.length}`);

    // Check if it's my turn
    if (state.currentTurn === "host") {
      console.log("It's my turn! Time to make a move.");
      // Trigger agent's decision-making logic here
    }
  };

  // Subscribe and get unsubscribe function
  const unsubscribe = client.subscribeToGame(gameId, callback);

  // Return cleanup function
  return unsubscribe;
}

// ============================================================================
// Turn Notifications
// ============================================================================

/**
 * Example 3: Monitor when it's the agent's turn
 *
 * Use this to get notified across all active games when it's your turn
 */
function monitorTurns(client: ConvexRealtimeClient, userId: string) {
  const callback: TurnNotificationCallback = (gameIds) => {
    if (gameIds.length > 0) {
      console.log(`Your turn in ${gameIds.length} game(s):`);
      gameIds.forEach((gameId) => {
        console.log(`  - ${gameId}`);
        // Trigger agent's turn logic for this game
      });
    } else {
      console.log("No pending turns");
    }
  };

  const unsubscribe = client.subscribeToTurnNotifications(userId, callback);

  return unsubscribe;
}

// ============================================================================
// Game Events
// ============================================================================

/**
 * Example 4: Subscribe to game events
 *
 * Use this to track individual actions (summons, attacks, spell activations)
 */
function monitorGameEvents(client: ConvexRealtimeClient, gameId: string) {
  const callback: GameEventCallback = (event) => {
    console.log(`[${event.eventType}] ${event.description}`);
    console.log(`  Turn: ${event.turnNumber}, Phase: ${event.phase}`);

    // React to specific event types
    switch (event.eventType) {
      case "summon":
        console.log("Opponent summoned a monster!");
        break;
      case "attack":
        console.log("Battle phase action detected!");
        break;
      case "spell_activation":
        console.log("Spell card activated!");
        break;
      case "damage":
        console.log("Damage dealt!");
        break;
    }
  };

  const unsubscribe = client.subscribeToGameEvents(gameId, callback);

  return unsubscribe;
}

// ============================================================================
// Complete Agent Integration
// ============================================================================

/**
 * Example 5: Complete agent setup with real-time monitoring
 *
 * This demonstrates a full integration for an AI agent
 */
async function setupAgentRealtime(config: {
  convexUrl: string;
  authToken: string;
  userId: string;
  gameId: string;
}) {
  const { convexUrl, authToken, userId, gameId } = config;

  // Initialize client
  const client = new ConvexRealtimeClient({
    convexUrl,
    authToken,
    debug: true,
  });

  console.log("Real-time client initialized");

  // Store unsubscribe functions for cleanup
  const unsubscribers: (() => void)[] = [];

  // 1. Subscribe to game state for detailed information
  const unsubGameState = client.subscribeToGame(gameId, (state) => {
    console.log("\n=== Game State Update ===");
    console.log(`Phase: ${state.phase}, Turn: ${state.turnNumber}`);

    // Agent decision logic would go here
    if (state.currentTurn === "host") {
      console.log("Making decision...");
      // Call your agent's decision-making function
      // makeGameplayDecision(state);
    }
  });
  unsubscribers.push(unsubGameState);

  // 2. Subscribe to turn notifications
  const unsubTurns = client.subscribeToTurnNotifications(userId, (gameIds) => {
    console.log("\n=== Turn Notification ===");
    if (gameIds.length > 0) {
      console.log(`Your turn in: ${gameIds.join(", ")}`);
      // Trigger turn handler for each game
      // gameIds.forEach(handleMyTurn);
    }
  });
  unsubscribers.push(unsubTurns);

  // 3. Subscribe to game events for logging/analysis
  const unsubEvents = client.subscribeToGameEvents(gameId, (event) => {
    console.log("\n=== Game Event ===");
    console.log(`[${event.eventType}] ${event.description}`);
    // Log events for learning/analysis
    // logEventForAnalysis(event);
  });
  unsubscribers.push(unsubEvents);

  console.log("All subscriptions active");

  // Return cleanup function
  return () => {
    console.log("Cleaning up subscriptions...");
    unsubscribers.forEach((unsub) => unsub());
    client.close();
    console.log("Real-time client closed");
  };
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Example 6: Proper cleanup on shutdown
 *
 * Always clean up subscriptions when your agent shuts down
 */
function setupGracefulShutdown(client: ConvexRealtimeClient) {
  const cleanup = () => {
    console.log("Shutting down real-time client...");
    client.unsubscribeAll();
    client.close();
    console.log("Real-time client shutdown complete");
  };

  // Handle various shutdown signals
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  process.on("exit", cleanup);

  return cleanup;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Example 7: Handle connection errors
 *
 * The ConvexClient automatically handles reconnection,
 * but you should still handle subscription errors
 */
function robustSubscription(client: ConvexRealtimeClient, gameId: string) {
  try {
    const unsubscribe = client.subscribeToGame(gameId, (state) => {
      try {
        // Process game state
        console.log("Game state:", state.phase);
      } catch (error) {
        console.error("Error processing game state:", error);
        // Don't let processing errors crash the subscription
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Failed to subscribe to game:", error);
    // Handle subscription error (e.g., retry, alert, etc.)
    throw error;
  }
}

// ============================================================================
// Advanced: Subscription Management
// ============================================================================

/**
 * Example 8: Manage multiple game subscriptions
 */
class GameSubscriptionManager {
  private client: ConvexRealtimeClient;
  private gameSubscriptions: Map<string, () => void> = new Map();

  constructor(convexUrl: string, authToken: string) {
    this.client = new ConvexRealtimeClient({
      convexUrl,
      authToken,
      debug: true,
    });
  }

  /**
   * Start monitoring a game
   */
  addGame(gameId: string, callback: GameStateCallback) {
    if (this.gameSubscriptions.has(gameId)) {
      console.log(`Already monitoring game ${gameId}`);
      return;
    }

    console.log(`Adding subscription for game ${gameId}`);
    const unsubscribe = this.client.subscribeToGame(gameId, callback);
    this.gameSubscriptions.set(gameId, unsubscribe);
  }

  /**
   * Stop monitoring a game
   */
  removeGame(gameId: string) {
    const unsubscribe = this.gameSubscriptions.get(gameId);
    if (unsubscribe) {
      console.log(`Removing subscription for game ${gameId}`);
      unsubscribe();
      this.gameSubscriptions.delete(gameId);
    }
  }

  /**
   * Get active game count
   */
  getActiveGameCount(): number {
    return this.gameSubscriptions.size;
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    console.log(`Cleaning up ${this.gameSubscriptions.size} game subscriptions`);
    for (const [gameId, unsubscribe] of this.gameSubscriptions.entries()) {
      unsubscribe();
    }
    this.gameSubscriptions.clear();
    this.client.close();
  }
}

// ============================================================================
// Usage in ElizaOS Plugin
// ============================================================================

/**
 * Example 9: Integration with ElizaOS plugin
 *
 * This is how you would use the client in an ElizaOS action/service
 */
export class LTCGRealtimeService {
  private client: ConvexRealtimeClient | null = null;
  private activeSubscriptions: Map<string, () => void> = new Map();

  async initialize(config: { convexUrl: string; authToken: string }) {
    this.client = new ConvexRealtimeClient({
      convexUrl: config.convexUrl,
      authToken: config.authToken,
      debug: process.env['NODE_ENV'] === "development",
    });

    console.log("LTCG Real-time service initialized");
  }

  monitorGame(gameId: string, onUpdate: GameStateCallback) {
    if (!this.client) {
      throw new Error("Client not initialized");
    }

    const key = `game:${gameId}`;
    if (this.activeSubscriptions.has(key)) {
      return;
    }

    const unsubscribe = this.client.subscribeToGame(gameId, onUpdate);
    this.activeSubscriptions.set(key, unsubscribe);
  }

  stopMonitoringGame(gameId: string) {
    const key = `game:${gameId}`;
    const unsubscribe = this.activeSubscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.activeSubscriptions.delete(key);
    }
  }

  async shutdown() {
    for (const unsubscribe of this.activeSubscriptions.values()) {
      unsubscribe();
    }
    this.activeSubscriptions.clear();

    if (this.client) {
      this.client.close();
      this.client = null;
    }

    console.log("LTCG Real-time service shut down");
  }
}

// ============================================================================
// Export Examples
// ============================================================================

export {
  initializeClient,
  monitorGameState,
  monitorTurns,
  monitorGameEvents,
  setupAgentRealtime,
  setupGracefulShutdown,
  robustSubscription,
  GameSubscriptionManager,
};
