import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const setAuthMock = vi.fn();

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth = setAuthMock;
    mutation = vi.fn();
  },
}));

const resolveStreamingAuthMock = vi.fn();
vi.mock("@/lib/streaming/serverAuth", () => ({
  resolveStreamingAuth: resolveStreamingAuthMock,
}));

vi.mock("@/lib/streaming/livekitRoom", () => ({
  generateRoomName: vi.fn(),
  generateRoomToken: vi.fn(),
  getLiveKitUrl: vi.fn(),
}));

vi.mock("@/lib/streaming/livekit", () => ({
  startWebEgress: vi.fn(),
}));

describe("POST /api/streaming/room", () => {
  beforeEach(() => {
    resolveStreamingAuthMock.mockReset();
    setAuthMock.mockReset();
    resolveStreamingAuthMock.mockResolvedValue({
      isInternal: false,
      isAgentApiKey: false,
      bearerToken: "user-token",
      userId: "user_1",
    });
  });

  it("rejects Retake for user streams", async () => {
    const { POST } = await import("../../../app/api/streaming/room/route");

    const request = new NextRequest("http://localhost/api/streaming/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "user",
        platform: "retake",
        streamKey: "plain-stream-key",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("agent-only");
  });
});

