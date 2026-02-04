import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { LTCGApiClient } from "../../src/client/LTCGApiClient";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { handProvider } from "../../src/providers/handProvider";
import { summonAction } from "../../src/actions/summonAction";

describe("Summon Action", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    // Create mock runtime
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        return null;
      }),
      useModel: mock(async () => {
        // Mock LLM decision to summon first monster
        return JSON.stringify({
          handIndex: 0,
          position: "attack",
          tributeIndices: [],
        });
      }),
    } as any;

    // Mock message with game ID
    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "I want to summon a monster",
        source: "test",
        gameId: "test-game-123",
      },
    } as Memory;

    // Mock state
    mockState = {
      values: {},
      data: {},
      text: "",
    };

    // Mock callback
    mockCallback = mock();
  });

  describe("Action Structure", () => {
    it("should have correct name", () => {
      expect(summonAction.name).toBe("SUMMON_MONSTER");
    });

    it("should have similes", () => {
      expect(summonAction.similes).toContain("SUMMON");
      expect(summonAction.similes).toContain("PLAY_MONSTER");
      expect(summonAction.similes).toContain("NORMAL_SUMMON");
    });

    it("should have description", () => {
      expect(summonAction.description).toBeDefined();
      expect(summonAction.description.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(summonAction.examples).toBeDefined();
      expect(summonAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should validate when it is Main Phase and summon available", async () => {
      // Mock game state provider to return main phase
      const mockGameState = {
        gameId: "test-game-123",
        phase: "main1",
        currentTurn: "host",
        hasNormalSummoned: false,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      // Mock hand provider to return summonable monsters
      const mockHand = [
        { type: "monster", level: 4, name: "Test Monster", atk: 1500, def: 1200, handIndex: 0 },
      ];

      // Override providers temporarily
      const originalGameStateGet = gameStateProvider.get;
      const originalHandGet = handProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      handProvider.get = async () => ({
        text: "",
        values: {},
        data: { hand: mockHand },
      });

      const result = await summonAction.validate(mockRuntime, mockMessage, mockState);

      // Restore providers
      gameStateProvider.get = originalGameStateGet;
      handProvider.get = originalHandGet;

      expect(result).toBe(true);
    });

    it("should not validate when not in Main Phase", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        phase: "battle",
        currentTurn: "host",
        hasNormalSummoned: false,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      const originalGameStateGet = gameStateProvider.get;
      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      const result = await summonAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;
      expect(result).toBe(false);
    });

    it("should not validate when already summoned this turn", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        phase: "main1",
        currentTurn: "host",
        hasNormalSummoned: true,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      const mockHand = [
        { type: "monster", level: 4, name: "Test Monster", atk: 1500, def: 1200, handIndex: 0 },
      ];

      const originalGameStateGet = gameStateProvider.get;
      const originalHandGet = handProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      handProvider.get = async () => ({
        text: "",
        values: {},
        data: { hand: mockHand },
      });

      const result = await summonAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;
      handProvider.get = originalHandGet;

      expect(result).toBe(false);
    });

    it("should not validate when no summonable monsters in hand", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        phase: "main1",
        currentTurn: "host",
        hasNormalSummoned: false,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      const mockHand = [
        { type: "spell", name: "Test Spell", handIndex: 0 },
        { type: "trap", name: "Test Trap", handIndex: 1 },
      ];

      const originalGameStateGet = gameStateProvider.get;
      const originalHandGet = handProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      handProvider.get = async () => ({
        text: "",
        values: {},
        data: { hand: mockHand },
      });

      const result = await summonAction.validate(mockRuntime, mockMessage, mockState);

      gameStateProvider.get = originalGameStateGet;
      handProvider.get = originalHandGet;

      expect(result).toBe(false);
    });
  });

  describe("Handler", () => {
    it("should summon a Level 4 or lower monster successfully", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        phase: "main1",
        currentTurn: "host",
        hasNormalSummoned: false,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      const mockHand = [
        {
          handIndex: 0,
          type: "monster",
          level: 4,
          name: "Blue-Eyes White Dragon",
          atk: 3000,
          def: 2500,
        },
      ];

      // Mock providers
      const originalGameStateGet = gameStateProvider.get;
      const originalHandGet = handProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      handProvider.get = async () => ({
        text: "",
        values: {},
        data: { hand: mockHand },
      });

      // Mock API client
      const originalSummon = LTCGApiClient.prototype.summon;
      LTCGApiClient.prototype.summon = mock(async () => ({
        success: true,
        message: "Monster summoned successfully",
      })) as any;

      const result = await summonAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      // Restore
      gameStateProvider.get = originalGameStateGet;
      handProvider.get = originalHandGet;
      LTCGApiClient.prototype.summon = originalSummon;

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        phase: "main1",
        currentTurn: "host",
        hasNormalSummoned: false,
        hostPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
        opponentPlayer: {
          monsterZone: [],
          spellTrapZone: [],
          lifePoints: 8000,
        },
      };

      const mockHand = [
        { handIndex: 0, type: "monster", level: 4, name: "Test Monster", atk: 1500, def: 1200 },
      ];

      const originalGameStateGet = gameStateProvider.get;
      const originalHandGet = handProvider.get;

      gameStateProvider.get = async () => ({
        text: "",
        values: {},
        data: { gameState: mockGameState, isMyTurn: true },
      });

      handProvider.get = async () => ({
        text: "",
        values: {},
        data: { hand: mockHand },
      });

      // Mock API client to throw error
      const originalSummon = LTCGApiClient.prototype.summon;
      LTCGApiClient.prototype.summon = mock(async () => {
        throw new Error("API Error");
      }) as any;

      const result = await summonAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      gameStateProvider.get = originalGameStateGet;
      handProvider.get = originalHandGet;
      LTCGApiClient.prototype.summon = originalSummon;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
