import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const originalEnv = { ...process.env };

const refs = {
  streaming: {
    sessions: {
      createSession: {} as any,
      linkLobby: {} as any,
      updateSession: {} as any,
      createOverlayAccess: {} as any,
      addDestination: {} as any,
      getSession: {} as any,
      endSession: {} as any,
      getSessionDestinations: {} as any,
      removeDestination: {} as any,
      getSessionPublic: {} as any,
    },
  },
};

const setAuthMock = vi.fn();
const queryMock = vi.fn();
const mutationMock = vi.fn();

const isLiveKitConfiguredMock = vi.fn();
const startWebEgressMock = vi.fn();
const stopWebEgressMock = vi.fn();
const updateStreamUrlsMock = vi.fn();

const resolveStreamingAuthMock = vi.fn();
const buildRtmpUrlMock = vi.fn();
const encryptStreamKeyMock = vi.fn();
const decryptStreamKeyMock = vi.fn();
const generateOverlayTokenMock = vi.fn();

const logErrorMock = vi.fn();
const logWarnMock = vi.fn();

vi.mock("@convex/_generated/api", () => ({ api: refs }));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth = setAuthMock;
    query = queryMock;
    mutation = mutationMock;
  },
}));
vi.mock("@/lib/streaming/livekit", () => ({
  isLiveKitConfigured: isLiveKitConfiguredMock,
  startWebEgress: startWebEgressMock,
  stopWebEgress: stopWebEgressMock,
  updateStreamUrls: updateStreamUrlsMock,
}));
vi.mock("@/lib/streaming/serverAuth", () => ({
  resolveStreamingAuth: resolveStreamingAuthMock,
}));
vi.mock("@/lib/streaming/encryption", () => ({
  buildRtmpUrl: buildRtmpUrlMock,
  encryptStreamKey: encryptStreamKeyMock,
  decryptStreamKey: decryptStreamKeyMock,
}));
vi.mock("@/lib/streaming/tokens", () => ({
  generateOverlayToken: generateOverlayTokenMock,
}));
vi.mock("@/lib/streaming/logging", () => ({
  logError: logErrorMock,
  logWarn: logWarnMock,
}));

async function loadStartRoute() {
  return await import("../../../app/api/streaming/start/route");
}

async function loadStopRoute() {
  return await import("../../../app/api/streaming/stop/route");
}

async function loadUpdateDestinationsRoute() {
  return await import("../../../app/api/streaming/update-destinations/route");
}

async function loadStatusRoute() {
  return await import("../../../app/api/streaming/status/route");
}

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NEXT_PUBLIC_CONVEX_URL: "https://convex.example",
    NEXT_PUBLIC_APP_URL: "https://app.example",
    INTERNAL_API_SECRET: "internal-secret",
  };

  setAuthMock.mockReset();
  queryMock.mockReset();
  mutationMock.mockReset();

  isLiveKitConfiguredMock.mockReset();
  startWebEgressMock.mockReset();
  stopWebEgressMock.mockReset();
  updateStreamUrlsMock.mockReset();

  resolveStreamingAuthMock.mockReset();
  buildRtmpUrlMock.mockReset();
  encryptStreamKeyMock.mockReset();
  decryptStreamKeyMock.mockReset();
  generateOverlayTokenMock.mockReset();

  logErrorMock.mockReset();
  logWarnMock.mockReset();

  isLiveKitConfiguredMock.mockReturnValue(true);
  startWebEgressMock.mockResolvedValue({ egressId: "egress_1" });
  stopWebEgressMock.mockResolvedValue(undefined);
  updateStreamUrlsMock.mockResolvedValue(undefined);

  resolveStreamingAuthMock.mockResolvedValue({
    isInternal: false,
    isAgentApiKey: false,
    bearerToken: "user-token",
    userId: "user_1",
  });

  buildRtmpUrlMock.mockImplementation((platform: string) => `rtmp://${platform}/live/new`);
  encryptStreamKeyMock.mockImplementation((key: string) => `enc:${key}`);
  decryptStreamKeyMock.mockImplementation((key: string) => `dec:${key}`);
  generateOverlayTokenMock.mockResolvedValue("overlay-token");
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Streaming API routes", () => {
  it("POST /start starts a user stream and propagates auth/context", async () => {
    mutationMock.mockImplementation(async (fn: unknown) => {
      if (fn === refs.streaming.sessions.createSession) {
        return "session_123";
      }
      return undefined;
    });

    const route = await loadStartRoute();

    const request = new NextRequest("http://localhost/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "user",
        platform: "twitch",
        streamKey: "plain-stream-key",
        streamTitle: "My Test Stream",
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.sessionId).toBe("session_123");
    expect(setAuthMock).toHaveBeenCalledWith("user-token");

    const createCall = mutationMock.mock.calls.find(
      (call: unknown[]) => call[0] === refs.streaming.sessions.createSession
    );
    expect(createCall?.[1]).toMatchObject({
      streamType: "user",
      userId: "user_1",
      internalAuth: "internal-secret",
    });
  });

  it("POST /start returns 500 for internal requests when INTERNAL_API_SECRET is missing", async () => {
    delete process.env.INTERNAL_API_SECRET;
    resolveStreamingAuthMock.mockResolvedValue({
      isInternal: true,
      isAgentApiKey: false,
      bearerToken: null,
      userId: null,
    });

    const route = await loadStartRoute();
    const request = new NextRequest("http://localhost/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "agent",
        agentId: "agent_1",
        platform: "retake",
        streamKeyHash: "encrypted-key",
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain("INTERNAL_API_SECRET");
  });

  it("POST /start rejects unsupported platforms with 400", async () => {
    const route = await loadStartRoute();
    const request = new NextRequest("http://localhost/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "user",
        platform: "unknown-platform",
        streamKey: "plain-stream-key",
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Unsupported streaming platform");
  });

  it("POST /start rejects Retake for user streams", async () => {
    const route = await loadStartRoute();
    const request = new NextRequest("http://localhost/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "user",
        platform: "retake",
        streamKey: "plain-stream-key",
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("agent-only");
  });

  it("POST /start forwards voice overlay config to session creation", async () => {
    mutationMock.mockImplementation(async (fn: unknown) => {
      if (fn === refs.streaming.sessions.createSession) {
        return "session_voice_1";
      }
      return undefined;
    });

    const route = await loadStartRoute();
    const request = new NextRequest("http://localhost/api/streaming/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        streamType: "user",
        platform: "twitch",
        streamKey: "plain-stream-key",
        overlayConfig: {
          playerVisualMode: "profile-picture",
          profilePictureUrl: "https://cdn.example.com/profile.png",
          voiceTrackUrl: "https://cdn.example.com/voice.mp3",
          voiceVolume: 1.5,
          voiceLoop: true,
        },
      }),
    });

    const response = await route.POST(request);
    expect(response.status).toBe(200);

    const createCall = mutationMock.mock.calls.find(
      (call: unknown[]) => call[0] === refs.streaming.sessions.createSession
    );
    expect(createCall?.[1]).toMatchObject({
      overlayConfig: expect.objectContaining({
        playerVisualMode: "profile-picture",
        profilePictureUrl: "https://cdn.example.com/profile.png",
        voiceTrackUrl: "https://cdn.example.com/voice.mp3",
        voiceVolume: 1,
        voiceLoop: true,
      }),
    });
  });

  it("POST /stop stops owned session and records end stats", async () => {
    queryMock.mockResolvedValue({
      _id: "session_1",
      userId: "user_1",
      streamType: "user",
      status: "live",
      egressId: "egress_1",
    });
    mutationMock.mockResolvedValue({ duration: 1000, decisionsLogged: 0 });

    const route = await loadStopRoute();

    const request = new NextRequest("http://localhost/api/streaming/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "session_1", reason: "manual" }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(stopWebEgressMock).toHaveBeenCalledWith("egress_1");
    expect(queryMock).toHaveBeenCalledWith(refs.streaming.sessions.getSession, {
      sessionId: "session_1",
      internalAuth: "internal-secret",
    });
    expect(mutationMock).toHaveBeenCalledWith(refs.streaming.sessions.endSession, {
      sessionId: "session_1",
      reason: "manual",
      internalAuth: "internal-secret",
    });
  });

  it("POST /stop rejects user trying to stop another user's stream", async () => {
    queryMock.mockResolvedValue({
      _id: "session_1",
      userId: "other_user",
      streamType: "user",
      status: "live",
      egressId: null,
    });

    const route = await loadStopRoute();

    const request = new NextRequest("http://localhost/api/streaming/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "session_1" }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toBe("Forbidden");
  });

  it("POST /update-destinations updates add/remove destinations for active session", async () => {
    queryMock
      .mockResolvedValueOnce({
        _id: "session_1",
        userId: "user_1",
        streamType: "user",
        status: "live",
        egressId: "egress_1",
      })
      .mockResolvedValueOnce([
        {
          platform: "youtube",
          status: "active",
          rtmpUrl: "rtmp://youtube/live/old",
        },
      ]);

    const route = await loadUpdateDestinationsRoute();

    const request = new NextRequest("http://localhost/api/streaming/update-destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session_1",
        addDestinations: [{ platform: "twitch", streamKey: "new-key" }],
        removeDestinations: [{ platform: "youtube" }],
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.added).toBe(1);
    expect(payload.removed).toBe(1);
    expect(queryMock).toHaveBeenNthCalledWith(1, refs.streaming.sessions.getSession, {
      sessionId: "session_1",
      internalAuth: "internal-secret",
    });
    expect(queryMock).toHaveBeenNthCalledWith(2, refs.streaming.sessions.getSessionDestinations, {
      sessionId: "session_1",
      internalAuth: "internal-secret",
    });
    expect(updateStreamUrlsMock).toHaveBeenCalledWith({
      egressId: "egress_1",
      addUrls: ["rtmp://twitch/live/new"],
      removeUrls: ["rtmp://youtube/live/old"],
    });
  });

  it("POST /update-destinations rejects Retake additions for user streams", async () => {
    queryMock.mockResolvedValueOnce({
      _id: "session_1",
      userId: "user_1",
      streamType: "user",
      status: "live",
      egressId: "egress_1",
    });

    const route = await loadUpdateDestinationsRoute();
    const request = new NextRequest("http://localhost/api/streaming/update-destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session_1",
        addDestinations: [{ platform: "retake", streamKey: "new-key" }],
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("agent-only");
  });

  it("POST /update-destinations records failed add attempts when LiveKit update fails", async () => {
    queryMock.mockResolvedValueOnce({
      _id: "session_1",
      userId: "user_1",
      streamType: "user",
      status: "live",
      egressId: "egress_1",
    });
    updateStreamUrlsMock.mockRejectedValueOnce(new Error("egress update failed"));

    const route = await loadUpdateDestinationsRoute();

    const request = new NextRequest("http://localhost/api/streaming/update-destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session_1",
        addDestinations: [{ platform: "twitch", streamKey: "new-key" }],
      }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      error: "egress update failed",
      added: 0,
      removed: 0,
      failedAdds: 1,
    });
    expect(mutationMock).toHaveBeenCalledWith(refs.streaming.sessions.addDestination, {
      sessionId: "session_1",
      platform: "twitch",
      rtmpUrl: "rtmp://twitch/live/new",
      streamKeyHash: "enc:new-key",
      status: "failed",
      errorMessage: "egress update failed",
      internalAuth: "internal-secret",
    });
  });

  it("GET /status returns mapped public session status", async () => {
    queryMock.mockResolvedValue({
      _id: "session_1",
      status: "live",
      streamType: "user",
      platform: "twitch",
      streamTitle: "Live Title",
      entityName: "Player One",
      entityAvatar: "https://avatar.example/u.png",
      currentLobbyId: "lobby_1",
      viewerCount: 42,
      peakViewerCount: 84,
      createdAt: 1,
      startedAt: 10,
      endedAt: undefined,
      errorMessage: undefined,
      stats: { duration: 9000, decisionsLogged: 0, eventsRecorded: 0 },
    });

    const route = await loadStatusRoute();

    const request = new NextRequest("http://localhost/api/streaming/status?sessionId=session_1", {
      method: "GET",
    });

    const response = await route.GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledWith(refs.streaming.sessions.getSessionPublic, {
      sessionId: "session_1",
    });
    expect(payload).toMatchObject({
      sessionId: "session_1",
      status: "live",
      streamType: "user",
      platform: "twitch",
      streamTitle: "Live Title",
      entityName: "Player One",
      viewerCount: 42,
      peakViewerCount: 84,
    });
  });

  it("GET /status returns 400 when sessionId is missing", async () => {
    const route = await loadStatusRoute();

    const request = new NextRequest("http://localhost/api/streaming/status", {
      method: "GET",
    });

    const response = await route.GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("sessionId");
  });
});
