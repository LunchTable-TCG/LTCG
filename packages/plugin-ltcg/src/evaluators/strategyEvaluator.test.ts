import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { boardAnalysisProvider } from "../providers/boardAnalysisProvider";
import { gameStateProvider } from "../providers/gameStateProvider";
import { legalActionsProvider } from "../providers/legalActionsProvider";
import { strategyEvaluator } from "./strategyEvaluator";

describe("Strategy Evaluator", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;

  beforeEach(() => {
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_RISK_TOLERANCE") return "medium";
        return null;
      }),
    } as any;

    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "Test message",
        source: "test",
        gameId: "test-game-123",
        action: "ATTACK",
      },
    } as Memory;

    mockState = {
      values: {},
      data: {},
      text: "",
      currentAction: "ATTACK",
      actionParams: {
        attackerIndex: 0,
        targetIndex: 0,
      },
    } as any;
  });

  describe("Evaluator Structure", () => {
    it("should have correct name", () => {
      expect(strategyEvaluator.name).toBe("LTCG_STRATEGY");
    });

    it("should have description", () => {
      expect(strategyEvaluator.description).toBeDefined();
    });

    it("should have similes", () => {
      expect(strategyEvaluator.similes).toBeDefined();
      expect(strategyEvaluator.similes.length).toBeGreaterThan(0);
    });
  });

  describe("Attack Strategy Evaluation", () => {
    it("should allow good attack - stronger attacking weaker", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hostPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Dragon", atk: 3000, canAttack: true, boardIndex: 0 }],
                spellTrapZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [
                  { name: "Weak", atk: 1000, position: "attack", boardIndex: 0, faceUp: true },
                ],
                spellTrapZone: [],
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "SLIGHT_ADVANTAGE" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });

    it("should filter bad attack - weaker attacking stronger", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hostPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Weak", atk: 1000, canAttack: true, boardIndex: 0 }],
                spellTrapZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [
                  { name: "Dragon", atk: 3000, position: "attack", boardIndex: 0, faceUp: true },
                ],
                spellTrapZone: [],
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(false);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });

    it("should allow risky attack when desperate", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hostPlayer: {
                lifePoints: 1000, // Low LP - desperate
                monsterZone: [{ name: "Weak", atk: 1000, canAttack: true, boardIndex: 0 }],
                spellTrapZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [
                  { name: "Dragon", atk: 3000, position: "attack", boardIndex: 0, faceUp: true },
                ],
                spellTrapZone: [],
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

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(true); // Allow desperate plays

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });

    it("should filter direct attack when opponent has monsters", async () => {
      mockState.actionParams = {
        attackerIndex: 0,
        targetIndex: null, // Direct attack
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hostPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Attacker", atk: 2000, canAttack: true, boardIndex: 0 }],
                spellTrapZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Blocker", atk: 1000, boardIndex: 0 }], // Has monster!
                spellTrapZone: [],
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(false);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });

    it("should warn about trap risk with high backrow", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_RISK_TOLERANCE") return "low";
        return null;
      });

      mockState.actionParams = {
        attackerIndex: 0,
        targetIndex: null, // Direct attack
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hostPlayer: {
                lifePoints: 8000,
                monsterZone: [{ name: "Attacker", atk: 2000, canAttack: true, boardIndex: 0 }],
                spellTrapZone: [],
              },
              opponentPlayer: {
                lifePoints: 8000,
                monsterZone: [],
                spellTrapZone: [{ faceUp: false }, { faceUp: false }, { faceUp: false }], // 3 backrow!
              },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(false); // Low risk tolerance filters high trap risk

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });
  });

  describe("Non-Attack Actions", () => {
    it("should allow summon actions", async () => {
      mockMessage.content = { ...mockMessage.content, action: "SUMMON_MONSTER" };
      mockState.currentAction = "SUMMON_MONSTER";
      mockState.actionParams = {
        handIndex: 0,
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              hand: [{ type: "monster", atk: 2000, level: 4, handIndex: 0 }],
              hasNormalSummoned: false,
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

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      const originalLegalActions = (legalActionsProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;
      (legalActionsProvider as any).get = mockLegalActionsProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
      (legalActionsProvider as any).get = originalLegalActions;
    });
  });

  describe("Error Handling", () => {
    it("should allow action on error", async () => {
      const mockGameStateProvider = {
        get: mock(async () => {
          throw new Error("Network error");
        }),
      };

      const originalProvider = (gameStateProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;

      const shouldAllow = await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);

      expect(shouldAllow).toBe(true);

      (gameStateProvider as any).get = originalProvider;
    });
  });
});
