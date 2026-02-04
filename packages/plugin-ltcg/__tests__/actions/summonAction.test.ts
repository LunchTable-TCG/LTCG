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
    } as IAgentRuntime;

    // Mock message with game ID
    mockMessage = {
      id: "test-message-id",
      visibleTo: [],
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
      // Mock game state - includes both new API fields and legacy fields for compatibility
      const mockGameState = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        phase: "main1",
        currentTurn: "host",
        turnNumber: 2,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: false,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 29,
        opponentDeckCount: 29,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        // Legacy fields needed by current summonAction implementation
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

      // Hand with summonable creature - includes both field naming conventions
      const mockHand = [
        {
          _id: "card-1",
          handIndex: 0,
          name: "Blazing Drake",
          type: "creature", // Legacy field
          cardType: "creature",
          level: 4, // Legacy field
          cost: 4,
          atk: 1600, // Legacy field
          attack: 1600,
          def: 1200, // Legacy field
          defense: 1200,
          archetype: "fire",
        },
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

      expect(result).toBe(true);
    });

    it("should not validate when not in Main Phase", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        phase: "battle",
        currentTurn: "host",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: false,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 28,
        opponentDeckCount: 28,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
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
        lobbyId: "lobby-123",
        status: "active",
        phase: "main1",
        currentTurn: "host",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: true,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 28,
        opponentDeckCount: 28,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
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
          _id: "card-1",
          handIndex: 0,
          name: "Murky Whale",
          type: "creature",
          cardType: "creature",
          level: 4,
          cost: 4,
          atk: 2100,
          attack: 2100,
          def: 1500,
          defense: 1500,
          archetype: "water",
        },
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
        lobbyId: "lobby-123",
        status: "active",
        phase: "main1",
        currentTurn: "host",
        turnNumber: 2,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: false,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 29,
        opponentDeckCount: 29,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
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

      // Hand with only spell/trap cards - no creatures
      const mockHand = [
        {
          _id: "card-1",
          handIndex: 0,
          name: "Tidal Surge",
          type: "spell",
          cardType: "spell",
          cost: 2,
          description: "Destroy one creature",
        },
        {
          _id: "card-2",
          handIndex: 1,
          name: "Ring of Fire",
          type: "trap",
          cardType: "trap",
          cost: 1,
          description: "Deals damage when triggered",
        },
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
        lobbyId: "lobby-123",
        status: "active",
        phase: "main1",
        currentTurn: "host",
        turnNumber: 2,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: false,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 29,
        opponentDeckCount: 29,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
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
          _id: "card-1",
          handIndex: 0,
          name: "Ember Wyrmling",
          type: "creature",
          cardType: "creature",
          level: 3,
          cost: 3,
          atk: 1200,
          attack: 1200,
          def: 800,
          defense: 800,
          archetype: "fire",
        },
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

      // Mock API client summon method
      const originalSummon = LTCGApiClient.prototype.summon;
      const summonMock = mock(async () => ({
        success: true,
        message: "Monster summoned successfully",
      }));
      LTCGApiClient.prototype.summon = summonMock;

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

      expect(result.success).toBe(true);
      expect(mockCallback).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const mockGameState = {
        gameId: "test-game-123",
        lobbyId: "lobby-123",
        status: "active",
        phase: "main1",
        currentTurn: "host",
        turnNumber: 2,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        hasNormalSummoned: false,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 29,
        opponentDeckCount: 29,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
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
          _id: "card-1",
          handIndex: 0,
          name: "Tidal Serpent",
          type: "creature",
          cardType: "creature",
          level: 3,
          cost: 3,
          atk: 1800,
          attack: 1800,
          def: 1000,
          defense: 1000,
          archetype: "water",
        },
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
      const summonMock = mock(async () => {
        throw new Error("API Error");
      });
      LTCGApiClient.prototype.summon = summonMock;

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
