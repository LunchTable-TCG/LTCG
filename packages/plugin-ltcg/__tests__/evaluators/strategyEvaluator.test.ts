import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { boardAnalysisProvider } from "../../src/providers/boardAnalysisProvider";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { legalActionsProvider } from "../../src/providers/legalActionsProvider";
import { strategyEvaluator } from "../../src/evaluators/strategyEvaluator";
import type { LTCGState } from "../../src/types/eliza";

describe("Strategy Evaluator", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: LTCGState;

  beforeEach(() => {
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_RISK_TOLERANCE") return "medium";
        return null;
      }),
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
        action: "ATTACK",
      },
    } as Memory;

    mockState = {
      values: {
        currentAction: "ATTACK",
        actionParams: {
          attackerIndex: 0,
          targetIndex: 0,
        },
      },
      data: {},
      text: "",
    };
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
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "battle",
              turnNumber: 3,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 8000,
              myDeckCount: 30,
              opponentDeckCount: 28,
              myGraveyardCount: 0,
              opponentGraveyardCount: 0,
              opponentHandCount: 4,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Infernal God Dragon",
                  cardType: "creature",
                  attack: 4000,
                  defense: 3500,
                  currentAttack: 4000,
                  currentDefense: 3500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [
                {
                  _id: "card-2",
                  name: "Flame Whelp",
                  cardType: "creature",
                  attack: 600,
                  defense: 400,
                  currentAttack: 600,
                  currentDefense: 400,
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
          data: { advantage: "SLIGHT_ADVANTAGE" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });

    it("should filter bad attack - weaker attacking stronger", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "battle",
              turnNumber: 3,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 8000,
              myDeckCount: 30,
              opponentDeckCount: 28,
              myGraveyardCount: 0,
              opponentGraveyardCount: 0,
              opponentHandCount: 4,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Flame Whelp",
                  cardType: "creature",
                  attack: 600,
                  defense: 400,
                  currentAttack: 600,
                  currentDefense: 400,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [
                {
                  _id: "card-2",
                  name: "Infernal God Dragon",
                  cardType: "creature",
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
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(false);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });

    it("should allow risky attack when desperate", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "battle",
              turnNumber: 8,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 1000,
              opponentLifePoints: 8000,
              myDeckCount: 20,
              opponentDeckCount: 25,
              myGraveyardCount: 5,
              opponentGraveyardCount: 2,
              opponentHandCount: 5,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Flame Whelp",
                  cardType: "creature",
                  attack: 600,
                  defense: 400,
                  currentAttack: 600,
                  currentDefense: 400,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [
                {
                  _id: "card-2",
                  name: "Infernal God Dragon",
                  cardType: "creature",
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

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });

    it("should filter direct attack when opponent has monsters", async () => {
      mockState.values.actionParams = {
        attackerIndex: 0,
        targetIndex: null,
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "battle",
              turnNumber: 4,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 8000,
              myDeckCount: 28,
              opponentDeckCount: 27,
              myGraveyardCount: 1,
              opponentGraveyardCount: 1,
              opponentHandCount: 4,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Murky Whale",
                  cardType: "creature",
                  attack: 2100,
                  defense: 1500,
                  currentAttack: 2100,
                  currentDefense: 1500,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [
                {
                  _id: "card-2",
                  name: "Ember Wyrmling",
                  cardType: "creature",
                  attack: 1200,
                  defense: 800,
                  currentAttack: 1200,
                  currentDefense: 800,
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
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(false);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });

    it("should warn about trap risk with high backrow", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_RISK_TOLERANCE") return "low";
        return null;
      });

      mockState.values.actionParams = {
        attackerIndex: 0,
        targetIndex: null,
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "battle",
              turnNumber: 5,
              currentTurnPlayer: "user-123",
              isMyTurn: true,
              myLifePoints: 8000,
              opponentLifePoints: 8000,
              myDeckCount: 26,
              opponentDeckCount: 24,
              myGraveyardCount: 2,
              opponentGraveyardCount: 3,
              opponentHandCount: 3,
              myBoard: [
                {
                  _id: "card-1",
                  name: "Blazing Drake",
                  cardType: "creature",
                  attack: 1600,
                  defense: 1200,
                  currentAttack: 1600,
                  currentDefense: 1200,
                  position: 1,
                  hasAttacked: false,
                  isFaceDown: false,
                },
              ],
              opponentBoard: [],
              opponentPlayer: {
                spellTrapZone: [
                  { isFaceDown: true },
                  { isFaceDown: true },
                  { isFaceDown: true },
                ],
              },
              hand: [],
              hasNormalSummoned: true,
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

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(false);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });
  });

  describe("Non-Attack Actions", () => {
    it("should allow summon actions", async () => {
      mockMessage.content = { ...mockMessage.content, action: "SUMMON_MONSTER" };
      mockState.values.currentAction = "SUMMON_MONSTER";
      mockState.values.actionParams = {
        handIndex: 0,
      };

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              lobbyId: "lobby-123",
              status: "active",
              currentTurn: "host",
              phase: "main1",
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
              hand: [
                {
                  handIndex: 0,
                  cardId: "card-blazing-drake",
                  name: "Blazing Drake",
                  type: "creature",
                  cardType: "creature",
                  cost: 4,
                  attack: 1600,
                  defense: 1200,
                  archetype: "fire",
                  description: "A dragon wreathed in flames",
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
          data: { advantage: "EVEN" },
        })),
      };

      const mockLegalActionsProvider = {
        get: mock(async () => ({
          data: {},
        })),
      };

      const originalGameState = gameStateProvider.get;
      const originalBoardAnalysis = boardAnalysisProvider.get;
      const originalLegalActions = legalActionsProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;
      boardAnalysisProvider.get = mockBoardAnalysisProvider.get;
      legalActionsProvider.get = mockLegalActionsProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalGameState;
      boardAnalysisProvider.get = originalBoardAnalysis;
      legalActionsProvider.get = originalLegalActions;
    });
  });

  describe("Error Handling", () => {
    it("should allow action on error", async () => {
      const mockGameStateProvider = {
        get: mock(async () => {
          throw new Error("Network error");
        }),
      };

      const originalProvider = gameStateProvider.get;
      gameStateProvider.get = mockGameStateProvider.get;

      await strategyEvaluator.handler(mockRuntime, mockMessage, mockState);
      const shouldAllow = mockState.values.LTCG_STRATEGY_ALLOWED;

      expect(shouldAllow).toBe(true);

      gameStateProvider.get = originalProvider;
    });
  });
});
