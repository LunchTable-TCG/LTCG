import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalEnv = { ...process.env };

const refs = {
  agents: {
    agents: {
      getAgentByApiKey: {} as any,
    },
  },
  gameplay: {
    gameEvents: {
      recordEvent: {} as any,
    },
  },
};

const queryMock = vi.fn();
const mutationMock = vi.fn();

vi.mock("@convex/_generated/api", () => ({ api: refs }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    query = queryMock;
    mutation = mutationMock;
  },
}));

async function loadRoute() {
  return await import("../../../app/api/agents/events/route");
}

const validBody = {
  gameId: "game_1",
  lobbyId: "lobby_1",
  turnNumber: 3,
  eventType: "agent_thinking",
  agentName: "Dizzy",
  description: "Thinking through battle phase options",
};

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_CONVEX_URL: "https://convex.example",
  };
  queryMock.mockReset();
  mutationMock.mockReset();
  queryMock.mockResolvedValue({
    agentId: "agent_1",
    userId: "user_1",
    name: "Dizzy",
  });
  mutationMock.mockResolvedValue("evt_1");
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("/api/agents/events", () => {
  it("accepts Authorization bearer API key", async () => {
    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/agents/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ltcg_api_key_123",
      },
      body: JSON.stringify(validBody),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(refs.agents.agents.getAgentByApiKey, {
      apiKey: "ltcg_api_key_123",
    });
    expect(mutationMock).toHaveBeenCalledWith(
      refs.gameplay.gameEvents.recordEvent,
      expect.objectContaining({
        gameId: "game_1",
        lobbyId: "lobby_1",
        playerId: "user_1",
      })
    );
  });

  it("accepts x-api-key header", async () => {
    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/agents/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "ltcg_api_key_456",
      },
      body: JSON.stringify(validBody),
    });

    const response = await route.POST(request);

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(refs.agents.agents.getAgentByApiKey, {
      apiKey: "ltcg_api_key_456",
    });
  });

  it("rejects requests without API key", async () => {
    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/agents/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("API key required");
  });

  it("returns failure details when recording mutation throws", async () => {
    mutationMock.mockRejectedValueOnce(new Error("schema validation failed"));

    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/agents/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ltcg_api_key_789",
      },
      body: JSON.stringify(validBody),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Failed to record event");
    expect(payload.details).toContain("schema validation failed");
  });
});
