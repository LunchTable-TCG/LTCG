import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { boardAnalysisProvider } from "../../src/providers/boardAnalysisProvider";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { emotionalStateEvaluator } from "../../src/evaluators/emotionalStateEvaluator";

describe("Emotional State Evaluator", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

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
    } as any;

    mockMessage = {
      id: "test-message-id",
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
      values: {},
      data: {},
      text: "",
      currentAction: "TRASH_TALK",
    } as any;
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
              status: "active",
              hostPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Dragon", atk: 3000 }],
              },
              opponentPlayer: {
                lifePoints: 4000,
                monsterZone: [],
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_ADVANTAGE" },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });

    it("should filter trash talk when losing badly", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              hostPlayer: {
                lifePoints: 1000,
                monsterZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [
                  { name: "Dragon1", atk: 3000 },
                  { name: "Dragon2", atk: 2500 },
                ],
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      expect(shouldAllow).toBe(false);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
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
              status: "active",
              hostPlayer: { lifePoints: 1000, monsterZone: [] },
              opponentPlayer: { lifePoints: 8000, monsterZone: [{ name: "Dragon", atk: 3000 }] },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });

    it("should allow non-trash-talk actions when losing", async () => {
      mockMessage.content = { ...mockMessage.content, action: "SUMMON_MONSTER" };
      mockState.currentAction = "SUMMON_MONSTER";

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              hostPlayer: { lifePoints: 1000, monsterZone: [] },
              opponentPlayer: { lifePoints: 8000, monsterZone: [] },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "STRONG_DISADVANTAGE" },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });

    it("should evaluate emotional state without errors", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              hostPlayer: { lifePoints: 8000, monsterZone: [] },
              opponentPlayer: { lifePoints: 8000, monsterZone: [] },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "EVEN" },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      // Evaluator should return a boolean indicating whether to allow the response
      expect(typeof shouldAllow).toBe("boolean");

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });
  });

  describe("Error Handling", () => {
    it("should allow response on error", async () => {
      const mockGameStateProvider = {
        get: mock(async () => {
          throw new Error("Network error");
        }),
      };

      const originalProvider = (gameStateProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;

      const shouldAllow = await emotionalStateEvaluator.handler(
        mockRuntime,
        mockMessage,
        mockState
      );

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalProvider;
    });
  });
});
