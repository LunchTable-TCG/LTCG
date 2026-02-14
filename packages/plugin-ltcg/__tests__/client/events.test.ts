/**
 * Tests for Event Type Definitions
 * Converted to bun:test for ElizaOS pattern compatibility
 *
 * Validates that event types are correctly structured and type-safe
 */

import { describe, expect, it } from "bun:test";
import type { GameEvent } from "../../src/types/api";
import type {
  ChainWindowOpenEvent,
  GameEndedEvent,
  GameEventOccurredEvent,
  GameRealtimeEvent,
  GameStateUpdatedEvent,
  Subscription,
  TurnNotificationEvent,
} from "../../src/client/events";

describe("Event Types", () => {
  // ============================================================================
  // Event Structure Tests
  // ============================================================================

  describe("GameStateUpdatedEvent", () => {
    it("should have correct structure", () => {
      const event: GameStateUpdatedEvent = {
        type: "game_state_updated",
        gameId: "game-123",
        state: {
          gameId: "game-123",
          status: "active",
          currentTurn: "host",
          phase: "main",
          turnNumber: 1,
          hostPlayer: {
            playerId: "host-id",
            lifePoints: 8000,
            deckCount: 30,
            monsterZone: [],
            spellTrapZone: [],
            graveyard: [],
            banished: [],
            extraDeck: 0,
          },
          opponentPlayer: {
            playerId: "opponent-id",
            lifePoints: 8000,
            deckCount: 30,
            monsterZone: [],
            spellTrapZone: [],
            graveyard: [],
            banished: [],
            extraDeck: 0,
          },
          hand: [],
          hasNormalSummoned: false,
          canChangePosition: [],
        },
        timestamp: Date.now(),
      };

      expect(event.type).toBe("game_state_updated");
      expect(event.gameId).toBe("game-123");
      expect(event.state).toBeDefined();
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe("TurnNotificationEvent", () => {
    it("should have correct structure", () => {
      const event: TurnNotificationEvent = {
        type: "turn_notification",
        gameId: "game-123",
        phase: "main",
        isMyTurn: true,
        timestamp: Date.now(),
      };

      expect(event.type).toBe("turn_notification");
      expect(event.gameId).toBe("game-123");
      expect(event.phase).toBe("main");
      expect(event.isMyTurn).toBe(true);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe("GameEventOccurredEvent", () => {
    it("should have correct structure", () => {
      const gameEvent: GameEvent = {
        eventId: "event-1",
        gameId: "game-123",
        turnNumber: 1,
        phase: "main",
        eventType: "summon",
        playerId: "player-123",
        description: "Summoned Infernal God Dragon",
        timestamp: Date.now(),
      };

      const event: GameEventOccurredEvent = {
        type: "game_event_occurred",
        gameId: "game-123",
        event: gameEvent,
        timestamp: Date.now(),
      };

      expect(event.type).toBe("game_event_occurred");
      expect(event.gameId).toBe("game-123");
      expect(event.event).toEqual(gameEvent);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe("GameEndedEvent", () => {
    it("should have correct structure for victory", () => {
      const event: GameEndedEvent = {
        type: "game_ended",
        gameId: "game-123",
        winner: "host",
        reason: "victory",
        timestamp: Date.now(),
      };

      expect(event.type).toBe("game_ended");
      expect(event.gameId).toBe("game-123");
      expect(event.winner).toBe("host");
      expect(event.reason).toBe("victory");
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it("should support draw outcome", () => {
      const event: GameEndedEvent = {
        type: "game_ended",
        gameId: "game-123",
        reason: "draw",
        timestamp: Date.now(),
      };

      expect(event.type).toBe("game_ended");
      expect(event.winner).toBeUndefined();
      expect(event.reason).toBe("draw");
    });

    it("should support surrender outcome", () => {
      const event: GameEndedEvent = {
        type: "game_ended",
        gameId: "game-123",
        winner: "opponent",
        reason: "surrender",
        timestamp: Date.now(),
      };

      expect(event.winner).toBe("opponent");
      expect(event.reason).toBe("surrender");
    });

    it("should support timeout outcome", () => {
      const event: GameEndedEvent = {
        type: "game_ended",
        gameId: "game-123",
        winner: "host",
        reason: "timeout",
        timestamp: Date.now(),
      };

      expect(event.winner).toBe("host");
      expect(event.reason).toBe("timeout");
    });
  });

  describe("ChainWindowOpenEvent", () => {
    it("should have correct structure", () => {
      const event: ChainWindowOpenEvent = {
        type: "chain_window_open",
        gameId: "game-123",
        chainLength: 2,
        timeRemaining: 5000,
        canRespond: true,
        timestamp: Date.now(),
      };

      expect(event.type).toBe("chain_window_open");
      expect(event.gameId).toBe("game-123");
      expect(event.chainLength).toBe(2);
      expect(event.timeRemaining).toBe(5000);
      expect(event.canRespond).toBe(true);
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Union Type Tests
  // ============================================================================

  describe("GameRealtimeEvent union type", () => {
    it("should accept all event types", () => {
      const events: GameRealtimeEvent[] = [
        {
          type: "game_state_updated",
          gameId: "game-123",
          state: {} as any,
          timestamp: Date.now(),
        },
        {
          type: "turn_notification",
          gameId: "game-123",
          phase: "main",
          isMyTurn: true,
          timestamp: Date.now(),
        },
        {
          type: "game_event_occurred",
          gameId: "game-123",
          event: {} as any,
          timestamp: Date.now(),
        },
        {
          type: "game_ended",
          gameId: "game-123",
          reason: "victory",
          timestamp: Date.now(),
        },
        {
          type: "chain_window_open",
          gameId: "game-123",
          chainLength: 1,
          timeRemaining: 5000,
          canRespond: true,
          timestamp: Date.now(),
        },
      ];

      expect(events).toHaveLength(5);
      expect(events[0].type).toBe("game_state_updated");
      expect(events[1].type).toBe("turn_notification");
      expect(events[2].type).toBe("game_event_occurred");
      expect(events[3].type).toBe("game_ended");
      expect(events[4].type).toBe("chain_window_open");
    });

    it("should allow type narrowing", () => {
      const event: GameRealtimeEvent = {
        type: "game_ended",
        gameId: "game-123",
        winner: "host",
        reason: "victory",
        timestamp: Date.now(),
      };

      if (event.type === "game_ended") {
        expect(event.winner).toBe("host");
        expect(event.reason).toBe("victory");
      }
    });
  });

  // ============================================================================
  // Subscription Type Tests
  // ============================================================================

  describe("Subscription type", () => {
    it("should have correct structure for game subscription", () => {
      const subscription: Subscription = {
        id: "game:123",
        type: "game",
        gameId: "game-123",
        unsubscribe: () => {},
        createdAt: Date.now(),
      };

      expect(subscription.id).toBe("game:123");
      expect(subscription.type).toBe("game");
      expect(subscription.gameId).toBe("game-123");
      expect(subscription.unsubscribe).toBeInstanceOf(Function);
      expect(subscription.createdAt).toBeGreaterThan(0);
    });

    it("should have correct structure for turns subscription", () => {
      const subscription: Subscription = {
        id: "turns:user-456",
        type: "turns",
        userId: "user-456",
        unsubscribe: () => {},
        createdAt: Date.now(),
      };

      expect(subscription.id).toBe("turns:user-456");
      expect(subscription.type).toBe("turns");
      expect(subscription.userId).toBe("user-456");
      expect(subscription.unsubscribe).toBeInstanceOf(Function);
    });

    it("should have correct structure for events subscription", () => {
      const subscription: Subscription = {
        id: "events:game-123",
        type: "events",
        gameId: "game-123",
        unsubscribe: () => {},
        createdAt: Date.now(),
      };

      expect(subscription.id).toBe("events:game-123");
      expect(subscription.type).toBe("events");
      expect(subscription.gameId).toBe("game-123");
      expect(subscription.unsubscribe).toBeInstanceOf(Function);
    });
  });

  // ============================================================================
  // Callback Type Tests
  // ============================================================================

  describe("Callback types", () => {
    it("should allow proper callback signatures", () => {
      // These should compile without errors
      const gameStateCallback = (_state: any) => {
        // Process game state
      };

      const turnNotificationCallback = (_gameIds: string[]) => {
        // Process turn notifications
      };

      const gameEventCallback = (_event: GameEvent) => {
        // Process game event
      };

      const chainWindowCallback = (_gameId: string, _timeRemaining: number) => {
        // Process chain window
      };

      expect(gameStateCallback).toBeInstanceOf(Function);
      expect(turnNotificationCallback).toBeInstanceOf(Function);
      expect(gameEventCallback).toBeInstanceOf(Function);
      expect(chainWindowCallback).toBeInstanceOf(Function);
    });
  });
});
