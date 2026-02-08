import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const resolveStreamingAuthMock = vi.fn();

vi.mock("@/lib/streaming/serverAuth", () => ({
  resolveStreamingAuth: resolveStreamingAuthMock,
}));

const originalEnv = { ...process.env };

async function loadRoute() {
  return await import("../../../app/api/streaming/voice/elevenlabs/route");
}

describe("POST /api/streaming/voice/elevenlabs", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ELEVENLABS_API_KEY: "eleven-key",
    };
    resolveStreamingAuthMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects unauthorized requests", async () => {
    resolveStreamingAuthMock.mockResolvedValue({
      userId: null,
      isInternal: false,
      isAgentApiKey: false,
    });

    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/streaming/voice/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello" }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toContain("Unauthorized");
  });

  it("requires text", async () => {
    resolveStreamingAuthMock.mockResolvedValue({
      userId: "user_1",
      isInternal: false,
      isAgentApiKey: false,
    });

    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/streaming/voice/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("text is required");
  });

  it("returns data URL when returnDataUrl is true", async () => {
    resolveStreamingAuthMock.mockResolvedValue({
      userId: "user_1",
      isInternal: false,
      isAgentApiKey: false,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode("mp3-bytes").buffer,
    } as Response);

    const route = await loadRoute();
    const request = new NextRequest("http://localhost/api/streaming/voice/elevenlabs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "hello", returnDataUrl: true }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.mimeType).toBe("audio/mpeg");
    expect(payload.dataUrl).toContain("data:audio/mpeg;base64,");
  });
});
