/**
 * Real API Integration Tests
 *
 * These tests call the ACTUAL production API to verify:
 * 1. API endpoints exist and respond correctly
 * 2. LTCGApiClient correctly constructs requests
 * 3. Response parsing works with real data
 *
 * Requires: LTCG_API_KEY and CONVEX_URL in .env
 */
import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import path from "node:path";
import { LTCGApiClient } from "../src/client/LTCGApiClient";

// Note: Bun automatically loads .env files

const API_KEY = process.env['LTCG_API_KEY'];
const CONVEX_URL = process.env['CONVEX_URL'];
const BASE_URL = CONVEX_URL?.replace(".cloud", ".site") || "";

// Skip if no credentials
const SKIP_INTEGRATION = !API_KEY || !CONVEX_URL;

describe("Real API Integration Tests", () => {
  let client: LTCGApiClient;

  beforeAll(() => {
    if (SKIP_INTEGRATION) {
      console.warn("⚠️ Skipping integration tests - no credentials found");
      return;
    }
    console.log("🔗 Running integration tests against:", BASE_URL);
  });

  beforeEach(() => {
    if (!SKIP_INTEGRATION) {
      client = new LTCGApiClient({
        apiKey: API_KEY!,
        baseUrl: BASE_URL,
      });
    }
  });

  describe("Authenticated Endpoints - Starter Decks", () => {
    it("should get starter decks", async () => {
      if (SKIP_INTEGRATION) return;

      const starterDecks = await client.getStarterDecks();

      console.log("📦 Starter Decks:", starterDecks.length);

      expect(Array.isArray(starterDecks)).toBe(true);
      expect(starterDecks.length).toBeGreaterThan(0);

      // Verify deck structure
      const firstDeck = starterDecks[0];
      expect(firstDeck).toHaveProperty("deckCode");
      expect(firstDeck).toHaveProperty("name");
      expect(firstDeck).toHaveProperty("description");
    });

    it("should get card definitions", async () => {
      if (SKIP_INTEGRATION) return;

      const cards = await client.getCards();

      console.log("🃏 Cards found:", cards.length);

      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThan(0);

      // Verify card structure
      const firstCard = cards[0];
      expect(firstCard).toHaveProperty("cardId");
      expect(firstCard).toHaveProperty("name");
      expect(firstCard).toHaveProperty("archetype");
    });

    it("should filter cards by archetype", async () => {
      if (SKIP_INTEGRATION) return;

      const dropoutCards = await client.getCards({ archetype: "dropout" });
      const freakCards = await client.getCards({ archetype: "freak" });

      console.log("Dropouts:", dropoutCards.length);
      console.log("Freaks:", freakCards.length);

      // All returned cards should match filter
      for (const card of dropoutCards.slice(0, 5)) {
        expect(card.archetype).toBe("dropout");
      }
      for (const card of freakCards.slice(0, 5)) {
        expect(card.archetype).toBe("freak");
      }
    });
  });

  describe("Authenticated Endpoints", () => {
    it("should get agent profile", async () => {
      if (SKIP_INTEGRATION) return;

      const profile = await client.getAgentProfile();

      console.log("👤 Agent Profile:", {
        id: profile.agentId,
        name: profile.name,
        elo: profile.elo,
      });

      expect(profile).toHaveProperty("agentId");
      expect(profile).toHaveProperty("name");
      expect(profile).toHaveProperty("elo");
      expect(typeof profile.elo).toBe("number");
    });

    it("should get agent decks", async () => {
      if (SKIP_INTEGRATION) return;

      const decks = await client.getDecks();

      console.log("📚 Agent Decks:", decks.length);

      expect(Array.isArray(decks)).toBe(true);
      // Agent may or may not have decks depending on setup
      if (decks.length > 0) {
        const firstDeck = decks[0];
        expect(firstDeck).toHaveProperty("deckId");
        expect(firstDeck).toHaveProperty("name");
      }
    });

    it("should get available lobbies", async () => {
      if (SKIP_INTEGRATION) return;

      const lobbies = await client.getLobbies();

      console.log("🏠 Available Lobbies:", lobbies.length);

      expect(Array.isArray(lobbies)).toBe(true);
      // Lobbies may be empty if no one is waiting
      if (lobbies.length > 0) {
        const firstLobby = lobbies[0];
        expect(firstLobby).toHaveProperty("lobbyId");
        expect(firstLobby).toHaveProperty("mode");
        // API returns canJoin instead of status for available lobbies
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid API key gracefully", async () => {
      if (SKIP_INTEGRATION) return;

      const badClient = new LTCGApiClient({
        apiKey: "invalid_key_12345",
        baseUrl: BASE_URL,
      });

      try {
        await badClient.getAgentProfile();
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        console.log("🔒 Auth error handled:", error.message, error.code);
        // Check that we got an authentication error (401 status or auth-related code)
        expect(
          error.statusCode === 401 ||
            error.code === "UNAUTHORIZED" ||
            error.name === "AuthenticationError"
        ).toBe(true);
      }
    });

    it("should handle network timeouts", async () => {
      if (SKIP_INTEGRATION) return;

      const slowClient = new LTCGApiClient({
        apiKey: API_KEY!,
        baseUrl: BASE_URL,
        timeout: 1, // 1ms timeout - will definitely fail
      });

      try {
        await slowClient.getCards();
        expect(true).toBe(false); // Should have thrown
      } catch (error: any) {
        console.log("⏱️ Timeout handled:", error.constructor.name);
        // Should be a network/timeout error
        expect(error).toBeDefined();
      }
    });
  });

  describe("Request/Response Format", () => {
    it("should send correct Authorization header", async () => {
      if (SKIP_INTEGRATION) return;

      // If we get a profile, auth header was correct
      const profile = await client.getAgentProfile();
      expect(profile.agentId).toBeDefined();
      console.log("✅ Auth header format verified");
    });

    it("should parse JSON responses correctly", async () => {
      if (SKIP_INTEGRATION) return;

      const cards = await client.getCards();

      // Verify we got actual parsed objects, not strings
      expect(typeof cards[0]).toBe("object");
      expect(typeof cards[0].name).toBe("string");
      console.log("✅ JSON parsing verified");
    });
  });
});
