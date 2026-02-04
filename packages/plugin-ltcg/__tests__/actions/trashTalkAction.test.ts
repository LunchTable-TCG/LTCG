import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { boardAnalysisProvider } from "../../src/providers/boardAnalysisProvider";
import { gameStateProvider } from "../../src/providers/gameStateProvider";
import { trashTalkAction } from "../../src/actions/trashTalkAction";

describe("Trash Talk Action", () => {
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
        if (key === "LTCG_CHAT_ENABLED") return "true";
        if (key === "LTCG_TRASH_TALK_LEVEL") return "mild";
        return null;
      }),
      useModel: mock(async () => {
        return "Nice try, but I have the advantage here!";
      }),
      character: {
        name: "TestAgent",
        bio: "A competitive but friendly card game player",
      },
    } as any;

    // Mock message with game ID
    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "I want to trash talk",
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
      expect(trashTalkAction.name).toBe("TRASH_TALK");
    });

    it("should have similes", () => {
      expect(trashTalkAction.similes).toContain("TAUNT");
      expect(trashTalkAction.similes).toContain("BANTER");
      expect(trashTalkAction.similes).toContain("TEASE");
    });

    it("should have description", () => {
      expect(trashTalkAction.description).toBeDefined();
      expect(trashTalkAction.description.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(trashTalkAction.examples).toBeDefined();
      expect(trashTalkAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should validate when chat enabled and in active game", async () => {
      // Mock providers
      const mockGameStateProvider = {
        get: mock(async () => ({
          text: "Game state",
          values: {},
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              phase: "main1",
              currentTurn: "host",
              hostPlayer: { lifePoints: 8000, monsterZone: [], spellTrapZone: [] },
              opponentPlayer: { lifePoints: 8000, monsterZone: [], spellTrapZone: [] },
            },
          },
        })),
      };

      // Temporarily replace provider
      const originalProvider = (gameStateProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;

      const isValid = await trashTalkAction.validate(mockRuntime, mockMessage, mockState);

      expect(isValid).toBe(true);

      // Restore provider
      (gameStateProvider as any).get = originalProvider;
    });

    it("should not validate when chat is disabled", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_CHAT_ENABLED") return "false";
        return null;
      });

      const isValid = await trashTalkAction.validate(mockRuntime, mockMessage, mockState);

      expect(isValid).toBe(false);
    });

    it("should not validate when trash talk level is none", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_CHAT_ENABLED") return "true";
        if (key === "LTCG_TRASH_TALK_LEVEL") return "none";
        return null;
      });

      const isValid = await trashTalkAction.validate(mockRuntime, mockMessage, mockState);

      expect(isValid).toBe(false);
    });

    it("should not validate when game is not active", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          text: "Game state",
          values: {},
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "completed",
              phase: "end",
            },
          },
        })),
      };

      const originalProvider = (gameStateProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;

      const isValid = await trashTalkAction.validate(mockRuntime, mockMessage, mockState);

      expect(isValid).toBe(false);

      (gameStateProvider as any).get = originalProvider;
    });
  });

  describe("Handler", () => {
    it("should generate trash talk for winning position", async () => {
      // Mock providers
      const mockGameStateProvider = {
        get: mock(async () => ({
          text: "Game state",
          values: {},
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              phase: "main1",
              turnNumber: 5,
              hostPlayer: { lifePoints: 8000, monsterZone: [{ name: "Infernal God Dragon", attack: 4000 }] },
              opponentPlayer: { lifePoints: 4000, monsterZone: [] },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          text: "Board analysis",
          values: {},
          data: {
            advantage: "STRONG_ADVANTAGE",
            myMonsterCount: 1,
            opponentMonsterCount: 0,
          },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      const result = await trashTalkAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
      expect(mockCallback).toHaveBeenCalled();

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });

    it("should generate different trash talk for losing position", async () => {
      const mockGameStateProvider = {
        get: mock(async () => ({
          text: "Game state",
          values: {},
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              phase: "main1",
              turnNumber: 5,
              hostPlayer: { lifePoints: 2000, monsterZone: [] },
              opponentPlayer: { lifePoints: 8000, monsterZone: [{ name: "Infernal God Dragon", attack: 4000 }] },
            },
          },
        })),
      };

      const mockBoardAnalysisProvider = {
        get: mock(async () => ({
          text: "Board analysis",
          values: {},
          data: {
            advantage: "STRONG_DISADVANTAGE",
            myMonsterCount: 0,
            opponentMonsterCount: 1,
          },
        })),
      };

      const originalGameState = (gameStateProvider as any).get;
      const originalBoardAnalysis = (boardAnalysisProvider as any).get;
      (gameStateProvider as any).get = mockGameStateProvider.get;
      (boardAnalysisProvider as any).get = mockBoardAnalysisProvider.get;

      mockRuntime.useModel = mock(async () => {
        return "I'm not done yet! Still got tricks up my sleeve!";
      });

      const result = await trashTalkAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(result.values?.advantage).toBe("STRONG_DISADVANTAGE");

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });

    it("should respect trash talk level setting", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_TRASH_TALK_LEVEL") return "aggressive";
        return "true";
      });

      const mockGameStateProvider = {
        get: mock(async () => ({
          data: {
            gameState: {
              gameId: "test-game-123",
              status: "active",
              turnNumber: 5,
              hostPlayer: { lifePoints: 8000 },
              opponentPlayer: { lifePoints: 4000 },
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

      const result = await trashTalkAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(true);
      expect(result.values?.trashTalkLevel).toBe("aggressive");

      (gameStateProvider as any).get = originalGameState;
      (boardAnalysisProvider as any).get = originalBoardAnalysis;
    });
  });
});
