import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { LTCGApiClient } from "../../src/client/LTCGApiClient";
import type { Lobby } from "../../src/types/api";
import { findGameAction } from "../../src/actions/findGameAction";

describe("Find Game Action", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    // Create mock runtime
    // Note: The action uses state.values for game/lobby IDs, not runtime.get()/set()
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_AUTO_MATCHMAKING") return "true";
        if (key === "LTCG_RANKED_MODE") return "false";
        if (key === "LTCG_PREFERRED_DECK_ID") return "deck-123";
        return null;
      }),
      useModel: mock(async () => {
        return JSON.stringify({
          lobbyIndex: 0,
        });
      }),
    } as any;

    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "Find me a game",
        source: "test",
      },
    } as Memory;

    mockState = {
      values: {},
      data: {},
      text: "",
    };

    mockCallback = mock();
  });

  describe("Action Structure", () => {
    it("should have correct name", () => {
      expect(findGameAction.name).toBe("FIND_GAME");
    });

    it("should have similes", () => {
      expect(findGameAction.similes).toContain("SEARCH_GAME");
      expect(findGameAction.similes).toContain("MATCHMAKING");
      expect(findGameAction.similes).toContain("PLAY_GAME");
    });

    it("should have description", () => {
      expect(findGameAction.description).toBeDefined();
      expect(findGameAction.description.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(findGameAction.examples).toBeDefined();
      expect(findGameAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should validate when not in game and credentials exist", async () => {
      const result = await findGameAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it("should not validate when already in game", async () => {
      // The action checks state.values.LTCG_CURRENT_GAME_ID, not runtime.get()
      mockState.values.LTCG_CURRENT_GAME_ID = "existing-game-123";

      const result = await findGameAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });

    it("should not validate without API credentials", async () => {
      mockRuntime.getSetting = mock((key: string) => null) as any;

      const result = await findGameAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });
  });

  describe("Handler - Joining Existing Lobby", () => {
    it("should join existing lobby when lobbies available", async () => {
      const mockLobbies: Lobby[] = [
        {
          lobbyId: "lobby-123",
          mode: "casual",
          hostPlayerId: "host-456",
          hostPlayerName: "HostAgent",
          isPrivate: false,
          status: "waiting",
          createdAt: Date.now(),
        },
      ];

      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;
      const originalJoinLobby = LTCGApiClient.prototype.joinLobby;

      LTCGApiClient.prototype.getLobbies = mock(async () => mockLobbies) as any;
      LTCGApiClient.prototype.joinLobby = mock(async () => ({
        gameId: "game-789",
        opponentName: "HostAgent",
      })) as any;

      const result = await findGameAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;
      LTCGApiClient.prototype.joinLobby = originalJoinLobby;

      expect(result.success).toBe(true);
      expect(result.values?.joinedExisting).toBe(true);
      expect(result.values?.gameId).toBe("game-789");
      expect(mockCallback).toHaveBeenCalled();
      // The action stores game ID in state.values, not runtime.set()
      expect(mockState.values.LTCG_CURRENT_GAME_ID).toBe("game-789");
    });
  });

  describe("Handler - Creating New Lobby", () => {
    it("should create new lobby when no lobbies available", async () => {
      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;
      const originalEnterMatchmaking = LTCGApiClient.prototype.enterMatchmaking;

      LTCGApiClient.prototype.getLobbies = mock(async () => []) as any;
      LTCGApiClient.prototype.enterMatchmaking = mock(async () => ({
        lobbyId: "new-lobby-123",
        status: "waiting" as const,
      })) as any;

      const result = await findGameAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;
      LTCGApiClient.prototype.enterMatchmaking = originalEnterMatchmaking;

      expect(result.success).toBe(true);
      expect(result.values?.status).toBe("waiting");
      expect(result.values?.lobbyId).toBe("new-lobby-123");
      expect(mockCallback).toHaveBeenCalled();
      // The action stores lobby ID in state.values, not runtime.set()
      expect(mockState.values.LTCG_CURRENT_LOBBY_ID).toBe("new-lobby-123");
    });

    it("should handle instant match when creating lobby", async () => {
      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;
      const originalEnterMatchmaking = LTCGApiClient.prototype.enterMatchmaking;

      LTCGApiClient.prototype.getLobbies = mock(async () => []) as any;
      LTCGApiClient.prototype.enterMatchmaking = mock(async () => ({
        lobbyId: "lobby-123",
        status: "matched" as const,
        gameId: "instant-game-456",
      })) as any;

      const result = await findGameAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;
      LTCGApiClient.prototype.enterMatchmaking = originalEnterMatchmaking;

      expect(result.success).toBe(true);
      expect(result.values?.gameId).toBe("instant-game-456");
      // The action stores game ID in state.values, not runtime.set()
      expect(mockState.values.LTCG_CURRENT_GAME_ID).toBe("instant-game-456");
    });
  });

  describe("Handler - Deck Selection", () => {
    it("should use preferred deck when available", async () => {
      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;
      const originalEnterMatchmaking = LTCGApiClient.prototype.enterMatchmaking;

      LTCGApiClient.prototype.getLobbies = mock(async () => []) as any;
      LTCGApiClient.prototype.enterMatchmaking = mock(async (request: any) => {
        expect(request.deckId).toBe("deck-123");
        return {
          lobbyId: "lobby-123",
          status: "waiting" as const,
        };
      }) as any;

      await findGameAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;
      LTCGApiClient.prototype.enterMatchmaking = originalEnterMatchmaking;
    });

    it("should fallback to first deck when no preference", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_AUTO_MATCHMAKING") return "true";
        if (key === "LTCG_RANKED_MODE") return "false";
        if (key === "LTCG_PREFERRED_DECK_ID") return null;
        return null;
      }) as any;

      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;
      const originalGetDecks = LTCGApiClient.prototype.getDecks;
      const originalEnterMatchmaking = LTCGApiClient.prototype.enterMatchmaking;

      LTCGApiClient.prototype.getLobbies = mock(async () => []) as any;
      LTCGApiClient.prototype.getDecks = mock(async () => [
        { deckId: "fallback-deck", name: "Starter", cards: [] },
      ]) as any;
      LTCGApiClient.prototype.enterMatchmaking = mock(async (request: any) => {
        expect(request.deckId).toBe("fallback-deck");
        return {
          lobbyId: "lobby-123",
          status: "waiting" as const,
        };
      }) as any;

      await findGameAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;
      LTCGApiClient.prototype.getDecks = originalGetDecks;
      LTCGApiClient.prototype.enterMatchmaking = originalEnterMatchmaking;
    });
  });

  describe("Handler - Auto-Matchmaking Setting", () => {
    it("should reject when auto-matchmaking is disabled", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_KEY") return "test-api-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_AUTO_MATCHMAKING") return "false";
        return null;
      }) as any;

      const result = await findGameAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      expect(result.success).toBe(false);
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("Handler - Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const originalGetLobbies = LTCGApiClient.prototype.getLobbies;

      LTCGApiClient.prototype.getLobbies = mock(async () => {
        throw new Error("API Error");
      }) as any;

      const result = await findGameAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getLobbies = originalGetLobbies;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
