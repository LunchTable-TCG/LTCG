/**
 * Simplified Tests for LTCG API Client (Non-Timing Tests)
 * Converted to bun:test for ElizaOS pattern compatibility
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ApiErrorCode } from "../../src/types/api";
import { LTCGApiClient } from "../../src/client/LTCGApiClient";
import { AuthenticationError, GameError, RateLimitError, ValidationError } from "../../src/client/errors";

// Mock fetch globally using bun:test mock
const mockFetch = mock();
global.fetch = mockFetch as unknown as typeof fetch;

describe("LTCGApiClient - Basic Functionality", () => {
  const TEST_API_KEY = "ltcg_test_key_123";
  const TEST_BASE_URL = "https://api.example.com";

  let client: LTCGApiClient;

  beforeEach(() => {
    client = new LTCGApiClient({
      apiKey: TEST_API_KEY,
      baseUrl: TEST_BASE_URL,
      timeout: 5000,
      maxRetries: 1, // 1 retry means 2 attempts total (initial + 1 retry)
    });
    mockFetch.mockReset();
  });

  describe("constructor", () => {
    it("should create client with required config", () => {
      expect(client).toBeInstanceOf(LTCGApiClient);
    });

    it("should throw if API key is missing", () => {
      expect(() => {
        new LTCGApiClient({ apiKey: "", baseUrl: TEST_BASE_URL });
      }).toThrow("API key is required");
    });

    it("should throw if base URL is missing", () => {
      expect(() => {
        new LTCGApiClient({ apiKey: TEST_API_KEY, baseUrl: "" });
      }).toThrow("Base URL is required");
    });
  });

  describe("successful requests", () => {
    it("should make authenticated request with Authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { agentId: "test", name: "TestAgent" },
          timestamp: Date.now(),
        }),
      });

      const result = await client.getAgentProfile();

      expect(result).toEqual({ agentId: "test", name: "TestAgent" });
      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/me`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_API_KEY}`,
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should make unauthenticated request without Authorization header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: "u1", agentId: "a1", apiKey: "key", keyPrefix: "ltcg_" },
          timestamp: Date.now(),
        }),
      });

      await client.registerAgent("TestAgent");

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders.Authorization).toBeUndefined();
    });

    it("should include x-api-key when emitting agent events", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, eventId: "evt_1" },
          timestamp: Date.now(),
        }),
      });

      await client.emitAgentEvent({
        gameId: "game123",
        lobbyId: "lobby123",
        turnNumber: 1,
        eventType: "agent_thinking",
        agentName: "Dizzy",
        description: "Considering options",
      });

      const expectedEventsBaseUrl =
        process.env.LTCG_APP_URL || process.env.NEXT_PUBLIC_APP_URL || TEST_BASE_URL;

      expect(mockFetch).toHaveBeenCalledWith(
        `${expectedEventsBaseUrl.replace(/\/$/, "")}/api/agents/events`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_API_KEY}`,
            "x-api-key": TEST_API_KEY,
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("should throw AuthenticationError on 401", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: "Invalid API key",
          },
          timestamp: Date.now(),
        }),
      });

      await expect(client.getAgentProfile()).rejects.toThrow(AuthenticationError);
    });

    it("should throw RateLimitError on 429", async () => {
      // Mock for all retry attempts
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.RATE_LIMIT_EXCEEDED,
            message: "Rate limit exceeded",
            details: {
              retryAfter: 30,
              remaining: 0,
              limit: 60,
            },
          },
          timestamp: Date.now(),
        }),
      });

      const error = await client.getAgentProfile().catch((e) => e);

      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.retryAfter).toBe(30);
      expect(error.remaining).toBe(0);
      expect(error.limit).toBe(60);
    });

    it("should throw ValidationError on 400", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: "Missing required fields",
            details: {
              missingFields: ["name"],
            },
          },
          timestamp: Date.now(),
        }),
      });

      const error = await client.registerAgent("").catch((e) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.invalidFields).toEqual(["name"]);
    });

    it("should throw GameError for game-specific errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: {
            code: ApiErrorCode.NOT_YOUR_TURN,
            message: "Not your turn",
            details: {
              gameId: "game123",
              phase: "combat",
            },
          },
          timestamp: Date.now(),
        }),
      });

      const error = await client
        .summon({ gameId: "game123", handIndex: 0, position: "attack" })
        .catch((e) => e);

      expect(error).toBeInstanceOf(GameError);
      expect(error.gameId).toBe("game123");
    });
  });

  describe("API endpoints", () => {
    it("should call registerAgent endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { userId: "u1", agentId: "a1", apiKey: "key", keyPrefix: "ltcg" },
          timestamp: Date.now(),
        }),
      });

      await client.registerAgent("Agent1", "starter_warrior");

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/register`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "Agent1", starterDeckCode: "starter_warrior" }),
        })
      );
    });

    it("should call getGameState with query parameter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { gameId: "game123", status: "active" },
          timestamp: Date.now(),
        }),
      });

      await client.getGameState("game123");

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/games/state?gameId=game123`,
        expect.any(Object)
      );
    });

    it("should call attack endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { success: true, message: "Attack successful" },
          timestamp: Date.now(),
        }),
      });

      await client.attack({
        gameId: "game123",
        attackerBoardIndex: 0,
        targetBoardIndex: 1,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.attackerBoardIndex).toBe(0);
      expect(body.targetBoardIndex).toBe(1);
    });

    it("should call getCards with filters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          timestamp: Date.now(),
        }),
      });

      await client.getCards({ type: "monster", archetype: "warrior" });

      expect(mockFetch).toHaveBeenCalledWith(
        `${TEST_BASE_URL}/api/agents/cards?type=monster&archetype=warrior`,
        expect.any(Object)
      );
    });

    it("should call enterMatchmaking endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { lobbyId: "lobby123", status: "waiting" },
          timestamp: Date.now(),
        }),
      });

      await client.enterMatchmaking({ deckId: "deck123", mode: "ranked" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.deckId).toBe("deck123");
      expect(body.mode).toBe("ranked");
    });
  });
});
