import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Memory, State } from "@elizaos/core";
import { type MockRuntime, setupActionTest } from "../utils/core-test-utils";
import { LTCGApiClient } from "../../src/client/LTCGApiClient";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { surrenderAction } from "../../src/actions/surrenderAction";

describe("Surrender Action", () => {
  let mockRuntime: MockRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    // Use ElizaOS pattern: setupActionTest with stateOverrides
    const setup = setupActionTest({
      stateOverrides: {
        values: {
          // ElizaOS pattern: transient game state in state.values
          LTCG_CURRENT_GAME_ID: "active-game-123",
        },
      },
      settingOverrides: {
        // ElizaOS pattern: persistent settings via runtime.getSetting
        LTCG_API_KEY: "test-api-key",
        LTCG_API_URL: "http://localhost:3000",
        LTCG_AUTO_SURRENDER: "true",
      },
    });

    mockRuntime = setup.mockRuntime;
    mockMessage = setup.mockMessage as Memory;
    mockState = setup.mockState;
    mockCallback = setup.callbackFn;

    // Override message content
    mockMessage.content = {
      text: "I surrender",
      source: "test",
    };

    // Setup useModel mock for confirmation
    mockRuntime.useModel = mock(async () => {
      return JSON.stringify({ confirm: true });
    }) as any;
  });

  describe("Action Structure", () => {
    it("should have correct name", () => {
      expect(surrenderAction.name).toBe("SURRENDER");
    });

    it("should have similes", () => {
      expect(surrenderAction.similes).toContain("FORFEIT");
      expect(surrenderAction.similes).toContain("CONCEDE");
      expect(surrenderAction.similes).toContain("GIVE_UP");
    });

    it("should have description", () => {
      expect(surrenderAction.description).toBeDefined();
      expect(surrenderAction.description.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(surrenderAction.examples).toBeDefined();
      expect(surrenderAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should validate when in active game", async () => {
      const originalGameStateGet = gameStateProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: {
          gameState: {
            gameId: "active-game-123",
            status: "active",
          },
        },
      });

      const result = await surrenderAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;

      expect(result).toBe(true);
    });

    it("should not validate when not in game", async () => {
      // ElizaOS pattern: clear state.values to simulate no active game
      mockState.values.LTCG_CURRENT_GAME_ID = undefined;

      const result = await surrenderAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });

    it("should not validate when game already completed", async () => {
      const originalGameStateGet = gameStateProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: {
          gameState: {
            gameId: "active-game-123",
            status: "completed",
          },
        },
      });

      const result = await surrenderAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;

      expect(result).toBe(false);
    });

    it("should validate even if game state unavailable (cleanup)", async () => {
      const originalGameStateGet = gameStateProvider.get;

      gameStateProvider.get = async () => {
        throw new Error("Cannot get game state");
      };

      const result = await surrenderAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;

      expect(result).toBe(true);
    });
  });

  describe("Handler - Auto Surrender", () => {
    it("should surrender immediately when auto-surrender enabled", async () => {
      const originalSurrender = LTCGApiClient.prototype.surrender;

      LTCGApiClient.prototype.surrender = mock(async () => ({
        success: true,
        message: "Game ended by surrender",
      })) as any;

      const result = await surrenderAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.surrender = originalSurrender;

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
      // Note: The action calls runtime.delete for cleanup after surrender
      // This is legacy behavior - state.values should be cleared in ElizaOS pattern
    });
  });

  describe("Handler - Confirmation Flow", () => {
    it("should ask for confirmation when auto-surrender disabled", async () => {
      // ElizaOS pattern: use runtime._settings directly to override
      mockRuntime._settings.LTCG_AUTO_SURRENDER = "false";

      const originalGameStateGet = gameStateProvider.get;
      const originalSurrender = LTCGApiClient.prototype.surrender;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: {
          gameState: {
            gameId: "active-game-123",
            status: "active",
            hostPlayer: { lifePoints: 2000, monsterZone: [] },
            opponentPlayer: { lifePoints: 8000, monsterZone: [{}] },
            turnNumber: 10,
          },
        },
      });

      LTCGApiClient.prototype.surrender = mock(async () => ({
        success: true,
        message: "Game ended by surrender",
      })) as any;

      const result = await surrenderAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      gameStateProvider.get = originalGameStateGet;
      LTCGApiClient.prototype.surrender = originalSurrender;

      expect(mockRuntime.useModel).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should cancel surrender when confirmation declined", async () => {
      // ElizaOS pattern: use runtime._settings directly to override
      mockRuntime._settings.LTCG_AUTO_SURRENDER = "false";

      mockRuntime.useModel = mock(async () => {
        return JSON.stringify({ confirm: false });
      }) as any;

      const originalGameStateGet = gameStateProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: {
          gameState: {
            gameId: "active-game-123",
            status: "active",
            hostPlayer: { lifePoints: 2000, monsterZone: [] },
            opponentPlayer: { lifePoints: 8000, monsterZone: [{}] },
            turnNumber: 10,
          },
        },
      });

      const result = await surrenderAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      gameStateProvider.get = originalGameStateGet;

      expect(result.success).toBe(false);
      expect(result.text).toContain("cancelled");
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("Handler - Error Handling", () => {
    it("should clean up state even when API fails", async () => {
      const originalSurrender = LTCGApiClient.prototype.surrender;

      LTCGApiClient.prototype.surrender = mock(async () => {
        throw new Error("API Error");
      }) as any;

      const result = await surrenderAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.surrender = originalSurrender;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Note: State cleanup is still attempted via runtime.delete (legacy)
    });

    it("should handle missing game ID gracefully", async () => {
      // ElizaOS pattern: clear state.values to simulate no active game
      mockState.values.LTCG_CURRENT_GAME_ID = undefined;

      const result = await surrenderAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
