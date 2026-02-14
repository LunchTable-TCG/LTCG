/**
 * Tests for ConvexRealtimeClient
 * Converted to bun:test for ElizaOS pattern compatibility
 *
 * Tests WebSocket-based real-time subscriptions using mocked ConvexClient
 * via dependency injection pattern (_testClient config option).
 */

import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { GameEvent } from "../../src/types/api";
import { ConvexRealtimeClient, type IConvexClient } from "../../src/client/realtimeClient";

// Mock ConvexClient methods using bun:test mock
const mockOnUpdate = mock();
const mockSetAuth = mock();
const mockClearAuth = mock();
const mockClose = mock();
const mockQuery = mock();

// Create a mock ConvexClient that implements IConvexClient interface
function createMockConvexClient(): IConvexClient {
  return {
    setAuth: mockSetAuth,
    clearAuth: mockClearAuth,
    onUpdate: mockOnUpdate,
    query: mockQuery,
    close: mockClose,
  };
}

describe("ConvexRealtimeClient", () => {
  const TEST_CONVEX_URL = "https://test-deployment.convex.cloud";
  const TEST_AUTH_TOKEN = "test-jwt-token-123";
  const TEST_GAME_ID = "test-game-123";
  const TEST_USER_ID = "test-user-456";

  let client: ConvexRealtimeClient;
  let mockClient: IConvexClient;

  beforeEach(() => {
    // Clear all mocks before each test
    mockOnUpdate.mockReset();
    mockSetAuth.mockReset();
    mockClearAuth.mockReset();
    mockClose.mockReset();
    mockQuery.mockReset();

    // Create fresh mock client for each test
    mockClient = createMockConvexClient();
  });

  afterEach(() => {
    if (client) {
      client.close();
    }
  });

  // Helper to create client with mock injected
  function createTestClient(
    config: { convexUrl?: string; authToken?: string; debug?: boolean } = {}
  ) {
    return new ConvexRealtimeClient({
      convexUrl: config.convexUrl ?? TEST_CONVEX_URL,
      authToken: config.authToken,
      debug: config.debug,
      _testClient: mockClient,
    });
  }

  // ============================================================================
  // Constructor Tests
  // ============================================================================

  describe("constructor", () => {
    it("should create client with required config", () => {
      client = createTestClient();

      expect(client).toBeInstanceOf(ConvexRealtimeClient);
      expect(client.isClientConnected()).toBe(true);
    });

    it("should create client with auth token", () => {
      client = createTestClient({ authToken: TEST_AUTH_TOKEN });

      expect(mockSetAuth).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should throw if Convex URL is missing", () => {
      expect(() => {
        new ConvexRealtimeClient({ convexUrl: "", _testClient: mockClient });
      }).toThrow("Convex URL is required");
    });

    it("should enable debug mode when specified", () => {
      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

      client = createTestClient({ debug: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ConvexRealtimeClient] Client initialized")
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Authentication Tests
  // ============================================================================

  describe("authentication", () => {
    beforeEach(() => {
      client = createTestClient();
    });

    it("should set authentication token", () => {
      client.setAuth(TEST_AUTH_TOKEN);
      expect(mockSetAuth).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should clear authentication token", () => {
      client.clearAuth();
      expect(mockClearAuth).toHaveBeenCalled();
    });

    it("should log auth changes in debug mode", () => {
      client = createTestClient({ debug: true });

      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

      client.setAuth(TEST_AUTH_TOKEN);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ConvexRealtimeClient] Authentication token set")
      );

      client.clearAuth();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ConvexRealtimeClient] Authentication token cleared")
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Game State Subscription Tests
  // ============================================================================

  describe("subscribeToGame", () => {
    beforeEach(() => {
      client = createTestClient();

      // Mock unsubscribe function
      mockOnUpdate.mockReturnValue(() => {
        // Unsubscribe function
      });
    });

    it("should subscribe to game state updates", () => {
      const callback = mock();

      const unsubscribe = client.subscribeToGame(TEST_GAME_ID, callback);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _functionName: "gameplay/games/queries:getGameStateForPlayer" }),
        { lobbyId: TEST_GAME_ID },
        expect.any(Function)
      );
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it("should call callback when game state updates", () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      client.subscribeToGame(TEST_GAME_ID, callback);

      // Simulate game state update from Convex
      const mockGameState = {
        lobbyId: TEST_GAME_ID,
        status: "active",
        isHost: true,
        currentPhase: "main",
        turnNumber: 3,
        hostId: "host-123",
        opponentId: "opponent-456",
        hostLifePoints: 8000,
        opponentLifePoints: 7000,
        hostDeckCount: 30,
        opponentDeckCount: 28,
        hostMonsters: [],
        hostSpellTraps: [],
        opponentMonsters: [],
        opponentSpellTraps: [],
        myHand: [],
        hasNormalSummoned: false,
        monsterPositionChanges: [],
      };

      capturedCallback(mockGameState);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          gameId: TEST_GAME_ID,
          status: "active",
          phase: "main",
          turnNumber: 3,
        })
      );
    });

    it("should not create duplicate subscriptions", () => {
      const callback1 = mock();
      const callback2 = mock();

      const unsub1 = client.subscribeToGame(TEST_GAME_ID, callback1);
      const unsub2 = client.subscribeToGame(TEST_GAME_ID, callback2);

      // Should only create one subscription
      expect(mockOnUpdate).toHaveBeenCalledTimes(1);
      expect(client.getSubscriptionCount()).toBe(1);

      // Both unsubscribe functions should work
      expect(unsub1).toBeInstanceOf(Function);
      expect(unsub2).toBeInstanceOf(Function);
    });

    it("should unsubscribe and clean up tracking", () => {
      const callback = mock();
      const mockUnsubscribe = mock();

      mockOnUpdate.mockReturnValue(mockUnsubscribe);

      const unsubscribe = client.subscribeToGame(TEST_GAME_ID, callback);

      expect(client.getSubscriptionCount()).toBe(1);

      unsubscribe();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(client.getSubscriptionCount()).toBe(0);
    });

    it("should track subscription in active list", () => {
      const callback = mock();

      client.subscribeToGame(TEST_GAME_ID, callback);

      const subscriptions = client.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toMatchObject({
        type: "game",
        gameId: TEST_GAME_ID,
      });
    });
  });

  // ============================================================================
  // Turn Notification Subscription Tests
  // ============================================================================

  describe("subscribeToTurnNotifications", () => {
    beforeEach(() => {
      client = createTestClient();

      mockOnUpdate.mockReturnValue(() => {});
      mockQuery.mockResolvedValue({
        currentTurnPlayer: TEST_USER_ID,
      });
    });

    it("should subscribe to turn notifications", () => {
      const callback = mock();

      const unsubscribe = client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      expect(mockOnUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ _functionName: "gameplay/games/queries:getActiveLobby" }),
        { userId: TEST_USER_ID },
        expect.any(Function)
      );
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it("should call callback with empty array when no active lobby", () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      // Simulate no active lobby
      capturedCallback(null);

      expect(callback).toHaveBeenCalledWith([]);
    });

    it("should call callback with game IDs when it is user turn", async () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      mockQuery.mockResolvedValue({
        currentTurnPlayer: TEST_USER_ID,
      });

      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      // Simulate active lobby update
      const mockLobby = {
        _id: TEST_GAME_ID,
        hostId: TEST_USER_ID,
      };

      capturedCallback(mockLobby);

      // Wait for async query to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({ _functionName: "gameplay/games/queries:getGameStateForPlayer" }),
        { lobbyId: TEST_GAME_ID }
      );
      expect(callback).toHaveBeenCalledWith([TEST_GAME_ID]);
    });

    it("should call callback with empty array when not user turn", async () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      mockQuery.mockResolvedValue({
        currentTurnPlayer: "other-user-789",
      });

      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      // Simulate active lobby update
      const mockLobby = {
        _id: TEST_GAME_ID,
        hostId: TEST_USER_ID,
      };

      capturedCallback(mockLobby);

      // Wait for async query to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith([]);
    });

    it("should track subscription in active list", () => {
      const callback = mock();

      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      const subscriptions = client.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toMatchObject({
        type: "turns",
        userId: TEST_USER_ID,
      });
    });
  });

  // ============================================================================
  // Game Events Subscription Tests
  // ============================================================================

  describe("subscribeToGameEvents", () => {
    beforeEach(() => {
      client = createTestClient();

      mockOnUpdate.mockReturnValue(() => {});
    });

    it("should subscribe to game events", () => {
      const callback = mock();

      const unsubscribe = client.subscribeToGameEvents(TEST_GAME_ID, callback);

      expect(mockOnUpdate).toHaveBeenCalled();
      expect(unsubscribe).toBeInstanceOf(Function);
    });

    it("should call callback only for new events", () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      client.subscribeToGameEvents(TEST_GAME_ID, callback);

      const mockEvent1: GameEvent = {
        eventId: "event-1",
        gameId: TEST_GAME_ID,
        turnNumber: 1,
        phase: "main",
        eventType: "summon",
        playerId: "player-123",
        description: "Summoned Infernal God Dragon",
        timestamp: Date.now(),
      };

      const mockEvent2: GameEvent = {
        eventId: "event-2",
        gameId: TEST_GAME_ID,
        turnNumber: 1,
        phase: "combat",
        eventType: "attack",
        playerId: "player-123",
        description: "Attacked with Infernal God Dragon",
        timestamp: Date.now(),
      };

      // First update with event 1
      capturedCallback({
        gameEvents: [mockEvent1],
      });

      expect(callback).toHaveBeenCalledWith(mockEvent1);

      // Second update with same event 1 (should not trigger callback)
      callback.mockClear();
      capturedCallback({
        gameEvents: [mockEvent1],
      });

      expect(callback).not.toHaveBeenCalled();

      // Third update with new event 2 (should trigger callback)
      capturedCallback({
        gameEvents: [mockEvent1, mockEvent2],
      });

      expect(callback).toHaveBeenCalledWith(mockEvent2);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should not call callback when no events exist", () => {
      const callback = mock();
      let capturedCallback: any;

      mockOnUpdate.mockImplementation((_path, _args, cb) => {
        capturedCallback = cb;
        return () => {};
      });

      client.subscribeToGameEvents(TEST_GAME_ID, callback);

      // Update with no events
      capturedCallback({
        gameEvents: [],
      });

      expect(callback).not.toHaveBeenCalled();

      // Update with null
      capturedCallback(null);

      expect(callback).not.toHaveBeenCalled();
    });

    it("should track subscription in active list", () => {
      const callback = mock();

      client.subscribeToGameEvents(TEST_GAME_ID, callback);

      const subscriptions = client.getActiveSubscriptions();
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toMatchObject({
        type: "events",
        gameId: TEST_GAME_ID,
      });
    });
  });

  // ============================================================================
  // Subscription Management Tests
  // ============================================================================

  describe("subscription management", () => {
    beforeEach(() => {
      client = createTestClient();

      mockOnUpdate.mockReturnValue(() => {});
    });

    it("should unsubscribe by key", () => {
      const callback = mock();
      const mockUnsubscribe = mock();

      mockOnUpdate.mockReturnValue(mockUnsubscribe);

      client.subscribeToGame(TEST_GAME_ID, callback);

      expect(client.getSubscriptionCount()).toBe(1);

      client.unsubscribe(`game:${TEST_GAME_ID}`);

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(client.getSubscriptionCount()).toBe(0);
    });

    it("should unsubscribe all subscriptions", () => {
      const callback = mock();
      const mockUnsubscribe1 = mock();
      const mockUnsubscribe2 = mock();
      const mockUnsubscribe3 = mock();

      mockOnUpdate
        .mockReturnValueOnce(mockUnsubscribe1)
        .mockReturnValueOnce(mockUnsubscribe2)
        .mockReturnValueOnce(mockUnsubscribe3);

      client.subscribeToGame("game-1", callback);
      client.subscribeToGame("game-2", callback);
      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      expect(client.getSubscriptionCount()).toBe(3);

      client.unsubscribeAll();

      expect(mockUnsubscribe1).toHaveBeenCalled();
      expect(mockUnsubscribe2).toHaveBeenCalled();
      expect(mockUnsubscribe3).toHaveBeenCalled();
      expect(client.getSubscriptionCount()).toBe(0);
    });

    it("should handle unsubscribe errors gracefully", () => {
      const callback = mock();
      const mockUnsubscribe = mock().mockImplementation(() => {
        throw new Error("Unsubscribe failed");
      });

      mockOnUpdate.mockReturnValue(mockUnsubscribe);

      client = createTestClient({ debug: true });

      const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

      client.subscribeToGame(TEST_GAME_ID, callback);
      client.unsubscribeAll();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ConvexRealtimeClient] Error unsubscribing"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should get all active subscriptions", () => {
      const callback = mock();

      client.subscribeToGame("game-1", callback);
      client.subscribeToGame("game-2", callback);
      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      const subscriptions = client.getActiveSubscriptions();

      expect(subscriptions).toHaveLength(3);
      expect(subscriptions[0].type).toBe("game");
      expect(subscriptions[1].type).toBe("game");
      expect(subscriptions[2].type).toBe("turns");
    });

    it("should get subscription count", () => {
      const callback = mock();

      expect(client.getSubscriptionCount()).toBe(0);

      client.subscribeToGame("game-1", callback);
      expect(client.getSubscriptionCount()).toBe(1);

      client.subscribeToGame("game-2", callback);
      expect(client.getSubscriptionCount()).toBe(2);

      client.subscribeToTurnNotifications(TEST_USER_ID, callback);
      expect(client.getSubscriptionCount()).toBe(3);

      client.unsubscribe("game:game-1");
      expect(client.getSubscriptionCount()).toBe(2);

      client.unsubscribeAll();
      expect(client.getSubscriptionCount()).toBe(0);
    });
  });

  // ============================================================================
  // Client Lifecycle Tests
  // ============================================================================

  describe("client lifecycle", () => {
    it("should close client and clean up subscriptions", () => {
      client = createTestClient();

      const callback = mock();
      const mockUnsubscribe = mock();

      mockOnUpdate.mockReturnValue(mockUnsubscribe);

      client.subscribeToGame(TEST_GAME_ID, callback);
      client.subscribeToTurnNotifications(TEST_USER_ID, callback);

      expect(client.getSubscriptionCount()).toBe(2);
      expect(client.isClientConnected()).toBe(true);

      client.close();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
      expect(mockClose).toHaveBeenCalled();
      expect(client.getSubscriptionCount()).toBe(0);
      expect(client.isClientConnected()).toBe(false);
    });

    it("should log close action in debug mode", () => {
      client = createTestClient({ debug: true });

      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});

      client.close();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ConvexRealtimeClient] Closing client")
      );

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Debug Logging Tests
  // ============================================================================

  describe("debug logging", () => {
    it("should log subscription actions in debug mode", () => {
      client = createTestClient({ debug: true });

      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
      const callback = mock();

      mockOnUpdate.mockReturnValue(() => {});

      client.subscribeToGame(TEST_GAME_ID, callback);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[ConvexRealtimeClient] Subscribing to game ${TEST_GAME_ID}`)
      );

      consoleSpy.mockRestore();
    });

    it("should log duplicate subscription attempts in debug mode", () => {
      client = createTestClient({ debug: true });

      const consoleSpy = spyOn(console, "log").mockImplementation(() => {});
      const callback = mock();

      mockOnUpdate.mockReturnValue(() => {});

      client.subscribeToGame(TEST_GAME_ID, callback);
      client.subscribeToGame(TEST_GAME_ID, callback);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[ConvexRealtimeClient] Already subscribed to game ${TEST_GAME_ID}`)
      );

      consoleSpy.mockRestore();
    });
  });
});
