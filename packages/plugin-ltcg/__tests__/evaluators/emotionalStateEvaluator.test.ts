import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { boardAnalysisProvider } from "../../src/providers/boardAnalysisProvider";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { emotionalStateEvaluator } from "../../src/evaluators/emotionalStateEvaluator";
import type { LTCGState } from "../../src/types/eliza";

describe("Emotional State Evaluator", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: LTCGState;

  beforeEach(() => {
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        return null;
      }),
      set: mock(async () => {}),
      character: {
        name: "TestAgent",
        bio: "Strategic card game player",
      },
    } as IAgentRuntime;

    mockMessage = {
      id: "test-message-id",
      visibleTo: [],
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "Test message",
        source: "test",
        gameId: "test-game-123",
        action: "TRASH_TALK",
      },
    } as Memory;

    mockState = {
      values: {
        currentAction: "TRASH_TALK",
      },
      data: {},
      text: "",
    };
  });

  describe("Evaluator Structure", () => {
    it("should have correct name", () => {
      expect(emotionalStateEvaluator.name).toBe("LTCG_EMOTIONAL_STATE");
    });

    it("should have description", () => {
      expect(emotionalStateEvaluator.description).toBeDefined();
    });

    it("should have similes", () => {
      expect(emotionalStateEvaluator.similes).toBeDefined();
      expect(emotionalStateEvaluator.similes.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(emotionalStateEvaluator.examples).toBeDefined();
      expect(emotionalStateEvaluator.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Emotional State Analysis", () => {
    it("should allow trash talk when winning", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main",
              turnNumber: 5,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 4000,
              myDeckCount: 26,
              opponentDeckCount: 22,
              myGraveyardCount: 2,
              opponentGraveyardCount: 5,
              opponentHandCount: 2,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Infernal God Dragon",
                  cardType: "stereotype",
                  attack: 4000,
                  defense: 3500,
                  currentAttack: 4000,
                  currentDefense: 3500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [],
              hand: [],
              hasNormalSummoned: true,
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_ADVANTAGE" },
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;

      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
    });

    it("should filter trash talk when losing badly", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main",
              turnNumber: 7,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 1000,
              opponentLifePoints: 8000,
              myDeckCount: 18,
              opponentDeckCount: 25,
              myGraveyardCount: 8,
              opponentGraveyardCount: 2,
              opponentHandCount: 5,
              myBoard: [],
              opponentBoard: [
                {
                  _id: "card-1",
                  name: "Infernal God Dragon",
                  cardType: "stereotype",
                  attack: 4000,
                  defense: 3500,
                  currentAttack: 4000,
                  currentDefense: 3500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
                {
                  _id: "card-2",
                  name: "Murky Whale",
                  cardType: "stereotype",
                  attack: 2100,
                  defense: 1500,
                  currentAttack: 2100,
                  currentDefense: 1500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              hand: [],
              hasNormalSummoned: true,
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;

      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;

      expect(shouldAllow).toBe(false);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
    });

    it("should allow trash talk for defiant character even when losing", async () => {
      mockRuntime.character = {
        name: "DefiantAgent",
        bio: "A defiant player who never gives up and loves trash talk",
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main",
              turnNumber: 8,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 1000,
              opponentLifePoints: 8000,
              myDeckCount: 15,
              opponentDeckCount: 26,
              myGraveyardCount: 10,
              opponentGraveyardCount: 1,
              opponentHandCount: 6,
              myBoard: [],
              opponentBoard: [
                {
                  _id: "card-1",
                  name: "Infernal God Dragon",
                  cardType: "stereotype",
                  attack: 4000,
                  defense: 3500,
                  currentAttack: 4000,
                  currentDefense: 3500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              hand: [],
              hasNormalSummoned: true,
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;

      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
    });

    it("should allow non-trash-talk actions when losing", async () => {
      mockMessage.content = { ...mockMessage.content, action: "SUMMON_MONSTER" };
      mockState.values.currentAction = "SUMMON_MONSTER";

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main",
              turnNumber: 6,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 1000,
              opponentLifePoints: 8000,
              myDeckCount: 20,
              opponentDeckCount: 27,
              myGraveyardCount: 6,
              opponentGraveyardCount: 0,
              opponentHandCount: 5,
              myBoard: [],
              opponentBoard: [],
              hand: [
                {
                  handIndex: 0,
                  cardId: "card-blazing-drake",
                  name: "Blazing Drake",
                  cardType: "stereotype",
                  cost: 4,
                  attack: 1600,
                  defense: 1200,
                  archetype: "fire",
                  description: "A dragon wreathed in flames.",
                  abilities: [],
                },
              ],
              hasNormalSummoned: false,
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;

      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
    });

    it("should evaluate emotional state without errors", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main",
              turnNumber: 2,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 8000,
              myDeckCount: 29,
              opponentDeckCount: 29,
              myGraveyardCount: 0,
              opponentGraveyardCount: 0,
              opponentHandCount: 5,
              myBoard: [],
              opponentBoard: [],
              hand: [],
              hasNormalSummoned: false,
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "EVEN" },
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;

      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;

      expect(typeof shouldAllow).toBe("boolean");

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
    });
  });

  describe("Error Handling", () => {
    it("should allow response on error", async () => {
      const mockGameStateProvider = {
        get: mock(async () => {
          throw new Error("Network error");
        }),
      };

      const originalProvider = gameStateProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;

      // Should not throw
      await emotionalStateEvaluator.handler(mockRuntime, mockMessage, mockState);

      // On error, evaluator returns early without setting value
      const shouldAllow = mockState.values.LTCG_EMOTIONAL_ALLOWED;
      expect(shouldAllow).toBeUndefined();

      gameStateProvider.get = originalProvider;
    });
  });
});
