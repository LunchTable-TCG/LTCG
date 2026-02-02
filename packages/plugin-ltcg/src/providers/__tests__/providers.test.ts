/**
 * Tests for LTCG ElizaOS Providers
 * Converted to bun:test for ElizaOS pattern compatibility
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { LTCGApiClient } from "../../client/LTCGApiClient";
import type { AvailableActionsResponse, GameStateResponse } from "../../types/api";
import { boardAnalysisProvider } from "../boardAnalysisProvider";
import { gameStateProvider } from "../gameStateProvider";
import { handProvider } from "../handProvider";
import { legalActionsProvider } from "../legalActionsProvider";
import { strategyProvider } from "../strategyProvider";

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
        status: "active",
        currentTurn: "host",
        phase: "main1",
        turnNumber: 3,
        hostPlayer: {
          playerId: "user-123",
          lifePoints: 7000,
          deckCount: 30,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-1",
              name: "Dark Magician",
              position: "attack",
              atk: 2500,
              def: 2100,
              level: 7,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
            {
              boardIndex: 1,
              cardId: "card-2",
              name: "Celtic Guardian",
              position: "defense",
              atk: 1400,
              def: 1200,
              level: 4,
              canAttack: false,
              canChangePosition: true,
              summonedThisTurn: false,
            },
          ],
          spellTrapZone: [
            {
              boardIndex: 0,
              cardId: "card-3",
              name: "Mirror Force",
              faceUp: false,
              type: "trap",
            },
          ],
          graveyard: [
            { cardId: "card-4", name: "Mystical Elf", type: "monster" },
            { cardId: "card-5", name: "Pot of Greed", type: "spell" },
          ],
          banished: [],
          extraDeck: 0,
        },
        opponentPlayer: {
          playerId: "opponent-123",
          lifePoints: 6500,
          deckCount: 28,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-6",
              name: "Blue-Eyes White Dragon",
              position: "attack",
              atk: 3000,
              def: 2500,
              level: 8,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
          spellTrapZone: [
            { boardIndex: 0, cardId: "card-7", name: "Unknown", faceUp: false, type: "spell" },
            { boardIndex: 1, cardId: "card-8", name: "Unknown", faceUp: false, type: "trap" },
            { boardIndex: 2, cardId: "card-9", name: "Unknown", faceUp: false, type: "trap" },
          ],
          graveyard: [{ cardId: "card-10", name: "Kuriboh", type: "monster" }],
          banished: [],
          extraDeck: 0,
        },
        hand: [
          {
            handIndex: 0,
            cardId: "card-11",
            name: "Raigeki",
            type: "spell",
            description: "Destroy all opponent monsters",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
        canChangePosition: [true, true, false, false, false],
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await gameStateProvider.get(mockRuntime, mockMessage, mockState);

      expect(result).toBeDefined();
      expect(result.text).toContain("Turn 3");
      expect(result.text).toContain("Main Phase 1"); // Formatted phase name
      expect(result.text).toContain("YOUR TURN");
      expect(result.text).toContain("Your LP: 7000");
      expect(result.text).toContain("Opponent LP: 6500");
      expect(result.text).toContain("2 monsters");
      expect(result.text).toContain("1 spell/trap");
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
        status: "active",
        currentTurn: "host",
        phase: "main1",
        turnNumber: 3,
        hostPlayer: {
          playerId: "user-123",
          lifePoints: 7000,
          deckCount: 30,
          monsterZone: [],
          spellTrapZone: [],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        opponentPlayer: {
          playerId: "opponent-123",
          lifePoints: 6500,
          deckCount: 28,
          monsterZone: [],
          spellTrapZone: [],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        hand: [
          {
            handIndex: 0,
            cardId: "card-1",
            name: "Blue-Eyes White Dragon",
            type: "monster",
            level: 8,
            atk: 3000,
            def: 2500,
            attribute: "LIGHT",
            race: "Dragon",
            description: "This legendary dragon is a powerful engine of destruction.",
            abilities: [],
          },
          {
            handIndex: 1,
            cardId: "card-2",
            name: "Dark Magician",
            type: "monster",
            level: 7,
            atk: 2500,
            def: 2100,
            attribute: "DARK",
            race: "Spellcaster",
            description: "The ultimate wizard in terms of attack and defense.",
            abilities: [
              {
                name: "Special Summon",
                description: "Can be special summoned from graveyard",
              },
            ],
          },
          {
            handIndex: 2,
            cardId: "card-3",
            name: "Monster Reborn",
            type: "spell",
            description: "Target 1 monster in either GY; Special Summon it.",
            abilities: [
              {
                name: "Revive",
                description: "Special summon 1 monster from either graveyard",
              },
            ],
          },
          {
            handIndex: 3,
            cardId: "card-4",
            name: "Raigeki",
            type: "spell",
            description: "Destroy all monsters your opponent controls.",
            abilities: [],
          },
          {
            handIndex: 4,
            cardId: "card-5",
            name: "Mirror Force",
            type: "trap",
            description:
              "When an opponent's monster declares an attack: Destroy all your opponent's Attack Position monsters.",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
        canChangePosition: [],
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await handProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Your Hand (5 cards)");
      expect(result.text).toContain("Blue-Eyes White Dragon");
      expect(result.text).toContain("Level 8");
      expect(result.text).toContain("ATK: 3000");
      expect(result.text).toContain("DEF: 2500");
      expect(result.text).toContain("Requires 2 tributes");
      expect(result.text).toContain("Dark Magician");
      expect(result.text).toContain("Monster Reborn");
      expect(result.text).toContain("Raigeki");
      expect(result.text).toContain("Mirror Force");
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
        status: "active",
        currentTurn: "host",
        phase: "main1",
        turnNumber: 3,
        hostPlayer: {
          playerId: "user-123",
          lifePoints: 7000,
          deckCount: 30,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-1",
              name: "Dark Magician",
              position: "attack",
              atk: 2500,
              def: 2100,
              level: 7,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
            {
              boardIndex: 1,
              cardId: "card-2",
              name: "Celtic Guardian",
              position: "defense",
              atk: 1400,
              def: 1200,
              level: 4,
              canAttack: false,
              canChangePosition: true,
              summonedThisTurn: false,
            },
          ],
          spellTrapZone: [
            { boardIndex: 0, cardId: "card-3", name: "Mirror Force", faceUp: false, type: "trap" },
          ],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        opponentPlayer: {
          playerId: "opponent-123",
          lifePoints: 6500,
          deckCount: 28,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-4",
              name: "Blue-Eyes White Dragon",
              position: "attack",
              atk: 3000,
              def: 2500,
              level: 8,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
            {
              boardIndex: 1,
              cardId: "card-5",
              name: "Kuriboh",
              position: "defense",
              atk: 300,
              def: 200,
              level: 1,
              canAttack: false,
              canChangePosition: false,
              summonedThisTurn: true,
            },
          ],
          spellTrapZone: [
            { boardIndex: 0, cardId: "card-6", name: "Unknown", faceUp: false, type: "trap" },
            { boardIndex: 1, cardId: "card-7", name: "Unknown", faceUp: false, type: "trap" },
            { boardIndex: 2, cardId: "card-8", name: "Unknown", faceUp: false, type: "spell" },
          ],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        hand: [],
        hasNormalSummoned: false,
        canChangePosition: [true, true, false, false, false],
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await boardAnalysisProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Board Analysis");
      expect(result.text).toContain("Advantage:"); // Just check that advantage is reported
      expect(result.text).toContain("Your Strongest: Dark Magician (2500 ATK)");
      expect(result.text).toContain("Opponent Strongest: Blue-Eyes White Dragon (3000 ATK)");
      expect(result.text).toContain("THREAT");
      expect(result.text).toContain("3 set backrow");
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
      const mockAvailableActions: AvailableActionsResponse = {
        gameId: "game-123",
        phase: "main1",
        actions: [
          {
            type: "summon",
            description: "Normal summon a monster from hand",
            parameters: {
              availableCards: [
                { handIndex: 0, name: "Celtic Guardian", level: 4, atk: 1400 },
                { handIndex: 1, name: "Dark Blade", level: 4, atk: 1800 },
              ],
              normalSummonUsed: false,
            },
          },
          {
            type: "set",
            description: "Set a card face-down",
            parameters: {
              availableCards: [
                { handIndex: 2, name: "Mirror Force", type: "trap" },
                { handIndex: 3, name: "Mystical Space Typhoon", type: "spell" },
              ],
            },
          },
          {
            type: "activate_spell",
            description: "Activate a spell card",
            parameters: {
              availableCards: [
                { handIndex: 4, name: "Monster Reborn" },
                { handIndex: 5, name: "Raigeki" },
              ],
            },
          },
          {
            type: "end_turn",
            description: "End your turn",
            parameters: {},
          },
        ],
      };

      mockGetAvailableActions.mockResolvedValue(mockAvailableActions);

      const result = await legalActionsProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Available Actions");
      expect(result.text).toContain("SUMMON_MONSTER");
      expect(result.text).toContain("Celtic Guardian");
      expect(result.text).toContain("1400 ATK");
      expect(result.text).toContain("SET_CARD");
      expect(result.text).toContain("Mirror Force");
      expect(result.text).toContain("ACTIVATE_SPELL");
      expect(result.text).toContain("Monster Reborn");
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
      const mockGameState: GameStateResponse = {
        gameId: "game-123",
        status: "active",
        currentTurn: "host",
        phase: "main1",
        turnNumber: 3,
        hostPlayer: {
          playerId: "user-123",
          lifePoints: 3000, // Low life points
          deckCount: 30,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-1",
              name: "Celtic Guardian",
              position: "attack",
              atk: 1400,
              def: 1200,
              level: 4,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
          spellTrapZone: [],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        opponentPlayer: {
          playerId: "opponent-123",
          lifePoints: 7500,
          deckCount: 28,
          monsterZone: [
            {
              boardIndex: 0,
              cardId: "card-2",
              name: "Blue-Eyes White Dragon",
              position: "attack",
              atk: 3000,
              def: 2500,
              level: 8,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
            {
              boardIndex: 1,
              cardId: "card-3",
              name: "Dark Magician",
              position: "attack",
              atk: 2500,
              def: 2100,
              level: 7,
              canAttack: true,
              canChangePosition: false,
              summonedThisTurn: false,
            },
          ],
          spellTrapZone: [
            { boardIndex: 0, cardId: "card-4", name: "Unknown", faceUp: false, type: "trap" },
          ],
          graveyard: [],
          banished: [],
          extraDeck: 0,
        },
        hand: [
          {
            handIndex: 0,
            cardId: "card-5",
            name: "Mirror Force",
            type: "trap",
            description: "Destroy all opponent attack position monsters",
            abilities: [],
          },
        ],
        hasNormalSummoned: false,
        canChangePosition: [true, false, false, false, false],
      };

      mockGetGameState.mockResolvedValue(mockGameState);

      const result = await strategyProvider.get(mockRuntime, mockMessage, mockState);

      expect(result.text).toContain("Strategic Analysis");
      expect(result.text).toContain("Game State: LOSING");
      expect(result.text).toContain("DEFENSIVE");
      expect(result.text).toContain("Risk Level: HIGH");
      expect(result.text).toContain("Priority Actions");
      expect(result.data).toHaveProperty("playStyle");
      expect(result.data).toHaveProperty("gameState");
    });
  });
});
