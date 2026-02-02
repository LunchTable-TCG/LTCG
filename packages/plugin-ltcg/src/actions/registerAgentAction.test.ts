import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import { LTCGApiClient } from "../client/LTCGApiClient";
import type { StarterDeck } from "../types/api";
import { registerAgentAction } from "./registerAgentAction";

describe("Register Agent Action", () => {
  let mockRuntime: IAgentRuntime;
  let mockMessage: Memory;
  let mockState: State;
  let mockCallback: ReturnType<typeof mock>;

  beforeEach(() => {
    mockRuntime = {
      getSetting: mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "balanced";
        if (key === "AGENT_NAME") return "TestAgent";
        return null;
      }),
      setSetting: mock(async () => {}),
      useModel: mock(async () => {
        return JSON.stringify({ deckIndex: 0 });
      }),
      character: {
        name: "TestAgent",
      },
    } as any;

    mockMessage = {
      id: "test-message-id",
      entityId: "test-entity",
      roomId: "test-room",
      content: {
        text: "Register me",
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
      expect(registerAgentAction.name).toBe("REGISTER_AGENT");
    });

    it("should have similes", () => {
      expect(registerAgentAction.similes).toContain("CREATE_ACCOUNT");
      expect(registerAgentAction.similes).toContain("SIGN_UP");
      expect(registerAgentAction.similes).toContain("INITIALIZE");
    });

    it("should have description", () => {
      expect(registerAgentAction.description).toBeDefined();
      expect(registerAgentAction.description.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(registerAgentAction.examples).toBeDefined();
      expect(registerAgentAction.examples.length).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should validate when no API key exists", async () => {
      const result = await registerAgentAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(true);
    });

    it("should not validate when API key already exists", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_KEY") return "existing-key";
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        return null;
      }) as any;

      const result = await registerAgentAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });

    it("should not validate without API URL", async () => {
      mockRuntime.getSetting = mock((key: string) => null) as any;

      const result = await registerAgentAction.validate(mockRuntime, mockMessage, mockState);
      expect(result).toBe(false);
    });
  });

  describe("Handler - Basic Registration", () => {
    it("should register agent with character name", async () => {
      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_BALANCED",
          name: "Balanced Starter",
          description: "A balanced deck for beginners",
          archetype: "Balanced",
        },
      ];

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (name: string) => ({
        success: true,
        data: {
          userId: "user-123",
          agentId: "agent-456",
          apiKey: "ltcg_test_key_789",
          keyPrefix: "ltcg_",
        },
      })) as any;

      const result = await registerAgentAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;

      expect(result.success).toBe(true);
      expect(mockRuntime.setSetting).toHaveBeenCalledWith(
        "LTCG_API_KEY",
        "ltcg_test_key_789",
        true
      );
      expect(mockRuntime.setSetting).toHaveBeenCalledWith("LTCG_AGENT_ID", "agent-456");
      expect(mockRuntime.setSetting).toHaveBeenCalledWith("LTCG_USER_ID", "user-123");
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe("Handler - Name Extraction", () => {
    it("should extract name from message text", async () => {
      mockRuntime.character = null as any;
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "balanced";
        return null;
      }) as any;

      mockMessage.content.text = "Register with name: CustomAgent";

      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_BALANCED",
          name: "Balanced Starter",
          description: "A balanced deck",
          archetype: "Balanced",
        },
      ];

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (name: string) => {
        expect(name).toBe("CustomAgent");
        return {
          success: true,
          data: {
            userId: "user-123",
            agentId: "agent-456",
            apiKey: "ltcg_test_key_789",
            keyPrefix: "ltcg_",
          },
        };
      }) as any;

      await registerAgentAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;
    });

    it("should generate name when none provided", async () => {
      mockRuntime.character = null as any;
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "balanced";
        return null;
      }) as any;

      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_BALANCED",
          name: "Balanced Starter",
          description: "A balanced deck",
          archetype: "Balanced",
        },
      ];

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (name: string) => {
        expect(name).toMatch(/^Agent_[A-Z0-9]{6}$/);
        return {
          success: true,
          data: {
            userId: "user-123",
            agentId: "agent-456",
            apiKey: "ltcg_test_key_789",
            keyPrefix: "ltcg_",
          },
        };
      }) as any;

      await registerAgentAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;
    });
  });

  describe("Handler - Deck Selection by Play Style", () => {
    it("should select aggressive deck for aggressive play style", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "aggressive";
        if (key === "AGENT_NAME") return "TestAgent";
        return null;
      }) as any;

      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_BALANCED",
          name: "Balanced Starter",
          description: "A balanced deck",
          archetype: "Balanced",
        },
        {
          code: "STARTER_ATTACK",
          name: "Beatdown Deck",
          description: "Aggressive deck",
          archetype: "Attack",
        },
      ];

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (_name: string, deckCode?: string) => {
        expect(deckCode).toBe("STARTER_ATTACK");
        return {
          success: true,
          data: {
            userId: "user-123",
            agentId: "agent-456",
            apiKey: "ltcg_test_key_789",
            keyPrefix: "ltcg_",
          },
        };
      }) as any;

      await registerAgentAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;
    });

    it("should select defensive deck for defensive play style", async () => {
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "defensive";
        if (key === "AGENT_NAME") return "TestAgent";
        return null;
      }) as any;

      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_BALANCED",
          name: "Balanced Starter",
          description: "A balanced deck",
          archetype: "Balanced",
        },
        {
          code: "STARTER_DEFENSE",
          name: "Wall Deck",
          description: "Defensive deck",
          archetype: "Defense",
        },
      ];

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (_name: string, deckCode?: string) => {
        expect(deckCode).toBe("STARTER_DEFENSE");
        return {
          success: true,
          data: {
            userId: "user-123",
            agentId: "agent-456",
            apiKey: "ltcg_test_key_789",
            keyPrefix: "ltcg_",
          },
        };
      }) as any;

      await registerAgentAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;
    });

    it("should use LLM when no matching deck for play style", async () => {
      // Play style is 'balanced' but no balanced deck exists
      mockRuntime.getSetting = mock((key: string) => {
        if (key === "LTCG_API_URL") return "http://localhost:3000";
        if (key === "LTCG_PLAY_STYLE") return "balanced";
        if (key === "AGENT_NAME") return "TestAgent";
        return null;
      }) as any;

      const mockStarterDecks: StarterDeck[] = [
        {
          code: "STARTER_ATTACK",
          name: "Beatdown Deck",
          description: "Aggressive deck",
          archetype: "Attack",
        },
        {
          code: "STARTER_CONTROL",
          name: "Control Deck",
          description: "Control deck",
          archetype: "Control",
        },
      ];

      mockRuntime.useModel = mock(async () => {
        return JSON.stringify({ deckIndex: 1 });
      }) as any;

      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;
      const originalRegisterAgent = LTCGApiClient.prototype.registerAgent;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => mockStarterDecks) as any;
      LTCGApiClient.prototype.registerAgent = mock(async (_name: string, deckCode?: string) => {
        expect(deckCode).toBe("STARTER_CONTROL");
        return {
          success: true,
          data: {
            userId: "user-123",
            agentId: "agent-456",
            apiKey: "ltcg_test_key_789",
            keyPrefix: "ltcg_",
          },
        };
      }) as any;

      await registerAgentAction.handler(mockRuntime, mockMessage, mockState, {}, mockCallback);

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;
      LTCGApiClient.prototype.registerAgent = originalRegisterAgent;

      expect(mockRuntime.useModel).toHaveBeenCalled();
    });
  });

  describe("Handler - Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => {
        throw new Error("API Error");
      }) as any;

      const result = await registerAgentAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle no decks available", async () => {
      const originalGetStarterDecks = LTCGApiClient.prototype.getStarterDecks;

      LTCGApiClient.prototype.getStarterDecks = mock(async () => []) as any;

      const result = await registerAgentAction.handler(
        mockRuntime,
        mockMessage,
        mockState,
        {},
        mockCallback
      );

      LTCGApiClient.prototype.getStarterDecks = originalGetStarterDecks;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
