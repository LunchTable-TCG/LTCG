/**
 * Tests for LTCG ElizaOS Providers
 * Converted to bun:test for ElizaOS pattern compatibility
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { LTCGApiClient } from "../../src/client/LTCGApiClient";
import type { AvailableActionsResponse, GameStateResponse } from "../../src/types/api";
import { boardAnalysisProvider } from "../../src/providers/boardAnalysisProvider";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { handProvider } from "../../src/providers/handProvider";
import { legalActionsProvider } from "../../src/providers/legalActionsProvider";
import { strategyProvider } from "../../src/providers/strategyProvider";

// Create mock functions using bun:test mock
const mockGetGameState = mock();
const mockGetAvailableActions = mock();

// Store original prototype methods
const originalGetGameState = LTCGApiClient.prototype.getGameState;
const originalGetAvailableActions = LTCGApiClient.prototype.getAvailableActions;

describe("LTCG Providers", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    // Mock LTCGApiClient prototype methods
    LTCGApiClient.prototype.getGameState = mockGetGameState as any;
    LTCGApiClient.prototype.getAvailableActions = mockGetAvailableActions as any;

    // Reset mocks
    mockGetGameState.mockReset();
    mockGetAvailableActions.mockReset();

    // Mock runtime with settings using bun:test mock
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "https://api.test.com";
        return undefined;
      }),
    } as unknown as IAgentRuntime;

    // Mock message with game ID (some providers check message.content.gameId)
    mockMessage = {
      content: {
        text: "Test message",
        gameId: "game-123", // Some providers need this in message
      },
      userId: "user-123",
      roomId: "room-123",
    } as Memory;

    // Mock state with game ID in values (ElizaOS pattern for new providers)
    mockState = {
      values: {
        LTCG_CURRENT_GAME_ID: "game-123",
      },
      data: {},
      text: "",
    } as State;
  });

  afterEach(() => {
    // Restore original prototype methods
    LTCGApiClient.prototype.getGameState = originalGetGameState;
    LTCGApiClient.prototype.getAvailableActions = originalGetAvailableActions;
  });

  describe("gameStateProvider", () => {
    it("should have correct name and description", () => {
      expect(gameStateProvider.name).toBe("LTCG_GAME_STATE");
      expect(gameStateProvider.description).toBeDefined();
    });

    it("should return game state overview", async () => {
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 7000,
        opponentLifePoints: 6500,
        myDeckCount: 30,
        opponentDeckCount: 28,
        myGraveyardCount: 2,
        opponentGraveyardCount: 1,
        opponentHandCount: 4,
        myBoard: [
          {
            _id: "card-1",
            name: "Murky Whale",
            cardType: "stereotype",
            attack: 2100,
            defense: 1500,
            currentAttack: 2100,
            currentDefense: 1500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
          {
            _id: "card-2",
            name: "Ember Wyrmling",
            cardType: "stereotype",
            attack: 1200,
            defense: 800,
            currentAttack: 1200,
            currentDefense: 800,
            position: 0, // defense
            hasAttacked: false,
            isFaceDown: false,
          },
          {
            _id: "card-3",
            name: "Ring of Fire",
            cardType: "trap",
            position: 0,
            hasAttacked: false,
            isFaceDown: true,
          },
        ],
        opponentBoard: [
          {
            _id: "card-6",
            name: "Infernal God Dragon",
            cardType: "stereotype",
            attack: 4000,
            defense: 3500,
            currentAttack: 4000,
            currentDefense: 3500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        hand: [
          {
            handIndex: 0,
            cardId: "card-11",
            name: "Tidal Surge",
            cardType: "spell",
            cost: 2,
            description: "Destroy all opponent stereotypes",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await gameStateProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.text).toContain("Turn 3");
      expect(result.text).toContain("Main Phase"); // Formatted phase name
      expect(result.text).toContain("YOUR TURN");
      expect(result.text).toContain("7000"); // Life points
      expect(result.text).toContain("6500"); // Opponent LP
      expect(result.values).toHaveProperty("gameId", "game-123");
      expect(result.values).toHaveProperty("turnNumber", 3);
    });

    it("should handle missing game ID", async () => {
      // Both state and message must not have game ID
      const stateNoGameId = {
        values: {},
        data: {},
        text: "",
      } as State;

      const messageNoGameId = {
        content: {
          text: "Test message",
        },
        userId: "user-123",
        roomId: "room-123",
      } as Memory;

      const result = await gameStateProvider.get(mockRuntime, messageNoGameId, stateNoGameId);

      expect(result.text).toContain("No active game");
    });
  });

  describe("handProvider", () => {
    it("should have correct name and description", () => {
      expect(handProvider.name).toBe("LTCG_HAND");
      expect(handProvider.description).toBeDefined();
    });

    it("should format hand cards with details", async () => {
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 7000,
        opponentLifePoints: 6500,
        myDeckCount: 30,
        opponentDeckCount: 28,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 4,
        myBoard: [],
        opponentBoard: [],
        hand: [
          {
            handIndex: 0,
            cardId: "card-1",
            name: "Infernal God Dragon",
            cardType: "stereotype",
            cost: 10,
            attack: 4000,
            defense: 3500,
            archetype: "infernal_dragons",
            description: "A legendary dragon wreathed in infernal flames.",
            abilities: [],
          },
          {
            handIndex: 1,
            cardId: "card-2",
            name: "Murky Whale",
            cardType: "stereotype",
            cost: 4,
            attack: 2100,
            defense: 1500,
            archetype: "abyssal_depths",
            description: "A massive stereotype from the depths.",
            abilities: [
              {
                name: "Deep Dive",
                description: "Can attack directly if opponent has no water stereotypes",
              },
            ],
          },
          {
            handIndex: 2,
            cardId: "card-3",
            name: "Reef Rush",
            cardType: "spell",
            cost: 1,
            archetype: "abyssal_depths",
            description: "Draw 2 cards, then discard 1 card.",
            abilities: [
              {
                name: "Draw",
                description: "Draw 2 cards, then discard 1",
              },
            ],
          },
          {
            handIndex: 3,
            cardId: "card-4",
            name: "Tidal Surge",
            cardType: "spell",
            cost: 2,
            archetype: "abyssal_depths",
            description: "Destroy all stereotypes your opponent controls.",
            abilities: [],
          },
          {
            handIndex: 4,
            cardId: "card-5",
            name: "Ring of Fire",
            cardType: "trap",
            cost: 1,
            archetype: "infernal_dragons",
            description: "When an opponent's stereotype attacks: Destroy the attacking stereotype.",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
        canChangePosition: [],
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await handProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Your Hand (5 cards)");
      expect(result.text).toContain("Infernal God Dragon");
      expect(result.text).toContain("Cost 10");
      expect(result.text).toContain("ATK: 4000");
      expect(result.text).toContain("DEF: 3500");
      expect(result.text).toContain("Requires 2 tributes");
      expect(result.text).toContain("Murky Whale");
      expect(result.text).toContain("Reef Rush");
      expect(result.text).toContain("Tidal Surge");
      expect(result.text).toContain("Ring of Fire");
      expect(result.values).toHaveProperty("handSize", 5);
    });
  });

  describe("boardAnalysisProvider", () => {
    it("should have correct name and description", () => {
      expect(boardAnalysisProvider.name).toBe("LTCG_BOARD_ANALYSIS");
      expect(boardAnalysisProvider.description).toBeDefined();
    });

    it("should analyze board advantage and threats", async () => {
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 7000,
        opponentLifePoints: 6500,
        myDeckCount: 30,
        opponentDeckCount: 28,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 4,
        myBoard: [
          {
            _id: "card-1",
            name: "Murky Whale",
            cardType: "stereotype",
            attack: 2100,
            defense: 1500,
            currentAttack: 2100,
            currentDefense: 1500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
          {
            _id: "card-2",
            name: "Ember Wyrmling",
            cardType: "stereotype",
            attack: 1200,
            defense: 800,
            currentAttack: 1200,
            currentDefense: 800,
            position: 0, // defense
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        opponentBoard: [
          {
            _id: "card-4",
            name: "Infernal God Dragon",
            cardType: "stereotype",
            attack: 4000,
            defense: 3500,
            currentAttack: 4000,
            currentDefense: 3500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
          {
            _id: "card-5",
            name: "Flame Whelp",
            cardType: "stereotype",
            attack: 600,
            defense: 400,
            currentAttack: 600,
            currentDefense: 400,
            position: 0, // defense
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        hand: [],
        hasNormalSummoned: false,
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await boardAnalysisProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Board Analysis");
      expect(result.text).toContain("Advantage:"); // Check that advantage is reported
      expect(result.text).toContain("Murky Whale"); // Our strongest
      expect(result.text).toContain("Infernal God Dragon"); // Opponent's strongest
      expect(result.data).toHaveProperty("myMonsters", 2);
      expect(result.data).toHaveProperty("opponentMonsters", 2);
    });
  });

  describe("legalActionsProvider", () => {
    it("should have correct name and description", () => {
      expect(legalActionsProvider.name).toBe("LTCG_LEGAL_ACTIONS");
      expect(legalActionsProvider.description).toBeDefined();
    });

    it("should list available actions with parameters", async () => {
      // legalActionsProvider calls BOTH getAvailableActions AND getGameState
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 2,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 8000,
        opponentLifePoints: 8000,
        myDeckCount: 35,
        opponentDeckCount: 35,
        myGraveyardCount: 0,
        opponentGraveyardCount: 0,
        opponentHandCount: 5,
        myBoard: [],
        opponentBoard: [],
        hand: [],
        hasNormalSummoned: false,
      };

      const mockAvailableActions: AvailableActionsResponse = {
        phase: "main",
        turnNumber: 2,
        actions: [
          {
            action: "summon",
            description: "Normal summon a stereotype from hand",
            parameters: {
              availableCards: [
                { handIndex: 0, name: "Ember Wyrmling", cost: 3, atk: 1200 },
                { handIndex: 1, name: "Blazing Drake", cost: 4, atk: 1600 },
              ],
              normalSummonUsed: false,
            },
          },
          {
            action: "set",
            description: "Set a card face-down",
            parameters: {
              availableCards: [
                { handIndex: 2, name: "Ring of Fire", cardType: "trap" },
                { handIndex: 3, name: "Reef Rush", cardType: "spell" },
              ],
            },
          },
          {
            action: "activate_spell",
            description: "Activate a spell card",
            parameters: {
              availableCards: [
                { handIndex: 4, name: "Reef Rush" },
                { handIndex: 5, name: "Tidal Surge" },
              ],
            },
          },
          {
            action: "end_turn",
            description: "End your turn",
            parameters: {},
          },
        ],
      } as AvailableActionsResponse;

      mockGetGameState.mockResolvedValue(mockGameState);
      mockGetAvailableActions.mockResolvedValue(mockAvailableActions);

      const result = await legalActionsProvider.get(mockRuntime, mockMessage, mockState);

      // Output uses uppercase action names with underscores
      expect(result.text).toContain("SUMMON_MONSTER");
      expect(result.text).toContain("Ember Wyrmling");
      expect(result.text).toContain("SET_CARD");
      expect(result.text).toContain("ACTIVATE_SPELL");
      expect(result.text).toContain("END_TURN");
      expect(result.values).toHaveProperty("actionCount");
    });
  });

  describe("strategyProvider", () => {
    it("should have correct name and description", () => {
      expect(strategyProvider.name).toBe("LTCG_STRATEGY");
      expect(strategyProvider.description).toBeDefined();
    });

    it("should provide strategic recommendations based on game state", async () => {
      // Use correct API format: myBoard/opponentBoard, myLifePoints/opponentLifePoints
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        lobbyId: "lobby-123",
        status: "active",
        currentTurn: "host",
        phase: "main",
        turnNumber: 3,
        currentTurnPlayer: "user-123",
        isMyTurn: true,
        myLifePoints: 3000, // Low life points - should trigger LOSING state
        opponentLifePoints: 7500,
        myDeckCount: 30,
        opponentDeckCount: 28,
        myGraveyardCount: 2,
        opponentGraveyardCount: 0,
        opponentHandCount: 4,
        myBoard: [
          {
            _id: "card-1",
            name: "Ember Wyrmling",
            cardType: "stereotype",
            attack: 1200,
            defense: 800,
            currentAttack: 1200,
            currentDefense: 800,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        opponentBoard: [
          {
            _id: "card-2",
            name: "Infernal God Dragon",
            cardType: "stereotype",
            attack: 4000,
            defense: 3500,
            currentAttack: 4000,
            currentDefense: 3500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
          {
            _id: "card-3",
            name: "Murky Whale",
            cardType: "stereotype",
            attack: 2100,
            defense: 1500,
            currentAttack: 2100,
            currentDefense: 1500,
            position: 1, // attack
            hasAttacked: false,
            isFaceDown: false,
          },
        ],
        hand: [
          {
            handIndex: 0,
            cardId: "card-5",
            name: "Ring of Fire",
            cardType: "trap",
            cost: 1,
            description: "Destroy attacking stereotype",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await strategyProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Strategic Analysis");
      expect(result.text).toContain("Game State:"); // Could be LOSING or SLIGHTLY_LOSING
      expect(result.text).toContain("Priority Actions");
      expect(result.data).toHaveProperty("playStyle");
      expect(result.data).toHaveProperty("gameState");
    });
  });
});
