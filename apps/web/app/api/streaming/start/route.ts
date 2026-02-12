import { buildRtmpUrl, decryptStreamKey } from "@/lib/streaming/encryption";
import {
  isLiveKitConfigured,
  isWebEgressActive,
  startWebEgress,
  stopOrphanedOverlayEgresses,
  stopWebEgress,
} from "@/lib/streaming/livekit";
import { logError, logInfo, logWarn } from "@/lib/streaming/logging";
import {
  type StreamingPlatform,
  isStreamingPlatform,
  requiresCustomRtmpUrl,
} from "@/lib/streaming/platforms";
import { getRetakeRTMPCredentials, startRetakeStream } from "@/lib/streaming/retake";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import { generateOverlayToken } from "@/lib/streaming/tokens";
import type { StartStreamBody } from "@/lib/streaming/types";
import * as generatedApi from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation in API route
const apiAny = (generatedApi as any).api;

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

function isAgentOnlyStreamingEnabled(): boolean {
  const raw = process.env.STREAMING_AGENT_ONLY?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== "false" && raw !== "0" && raw !== "off";
}

type StartRouteBody = StartStreamBody & {
  retakeAccessToken?: string;
};

type ResolvedDestination = {
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
};

type StoredStreamingSession = {
  _id: Id<"streamingSessions">;
  streamType: "user" | "agent";
  userId?: Id<"users">;
  agentId?: Id<"agents">;
  status: "initializing" | "pending" | "live" | "ended" | "error";
  overlayUrl?: string;
  egressId?: string;
  createdAt: number;
};

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getEnvStreamKey(platform: StreamingPlatform): string | undefined {
  const platformUpper = platform.toUpperCase();
  return firstNonEmpty(process.env[`${platformUpper}_STREAM_KEY`]);
}

function getEnvRtmpUrl(platform: StreamingPlatform): string | undefined {
  const platformUpper = platform.toUpperCase();
  return firstNonEmpty(process.env[`${platformUpper}_RTMP_URL`]);
}

async function resolveStoredDestination(params: {
  convex: ConvexHttpClient;
  streamType: "user" | "agent";
  userId?: Id<"users"> | null;
  agentId?: string;
  requestedPlatform?: StreamingPlatform;
  customRtmpUrl?: string;
  internalAuth?: string;
}): Promise<ResolvedDestination> {
  const { convex, streamType, userId, agentId, requestedPlatform, customRtmpUrl, internalAuth } =
    params;

  if (streamType === "user") {
    if (!userId) {
      throw new Error("Authentication required to use stored user streaming credentials");
    }

    const config = await convex.query(apiAny.core.userPreferences.getUserStreamingConfig, {
      userId,
    });

    if (!config?.streamKeyHash) {
      throw new Error("No stored user streaming credentials found");
    }

    const storedPlatform = config.platform;
    if (!storedPlatform || !isStreamingPlatform(storedPlatform)) {
      throw new Error("Stored user streaming platform is missing or invalid");
    }

    if (requestedPlatform && requestedPlatform !== storedPlatform) {
      throw new Error(
        `Stored user streaming platform mismatch (expected ${storedPlatform}, got ${requestedPlatform})`
      );
    }

    return {
      platform: storedPlatform,
      streamKey: decryptStreamKey(config.streamKeyHash),
      customRtmpUrl: firstNonEmpty(customRtmpUrl, config.rtmpUrl),
    };
  }

  if (!agentId) {
    throw new Error("agentId is required for stored agent streaming credentials");
  }
  if (!internalAuth) {
    throw new Error("INTERNAL_API_SECRET is required for stored agent streaming credentials");
  }

  const config = await convex.query(apiAny.agents.streaming.getAgentStreamKeyHash, {
    agentId: agentId as Id<"agents">,
    internalAuth,
  });

  if (!config?.streamingKeyHash) {
    throw new Error("No stored agent streaming credentials found");
  }

  const storedPlatform = config.streamingPlatform;
  if (!storedPlatform || !isStreamingPlatform(storedPlatform)) {
    throw new Error("Stored agent streaming platform is missing or invalid");
  }

  if (requestedPlatform && requestedPlatform !== storedPlatform) {
    throw new Error(
      `Stored agent streaming platform mismatch (expected ${storedPlatform}, got ${requestedPlatform})`
    );
  }

  return {
    platform: storedPlatform,
    streamKey: decryptStreamKey(config.streamingKeyHash),
    customRtmpUrl: firstNonEmpty(customRtmpUrl, config.streamingRtmpUrl),
  };
}

async function maybeResolveRetakeDestination(
  destination: {
    platform: StreamingPlatform;
    streamKey?: string;
    customRtmpUrl?: string;
  },
  body: StartRouteBody
): Promise<ResolvedDestination> {
  if (destination.platform !== "retake") {
    if (!destination.streamKey) {
      throw new Error("Missing stream key");
    }
    return {
      platform: destination.platform,
      streamKey: destination.streamKey,
      customRtmpUrl: destination.customRtmpUrl,
    };
  }

  const tokenCandidates = Array.from(
    new Set(
      [
        firstNonEmpty(body.retakeAccessToken),
        firstNonEmpty(process.env.RETAKE_ACCESS_TOKEN),
        firstNonEmpty(process.env.DIZZY_RETAKE_ACCESS_TOKEN),
        !destination.customRtmpUrl ? firstNonEmpty(destination.streamKey) : undefined,
      ].filter((value): value is string => Boolean(value))
    )
  );

  let lastError: Error | null = null;
  for (const accessToken of tokenCandidates) {
    try {
      await startRetakeStream(accessToken);
      const rtmp = await getRetakeRTMPCredentials(accessToken);
      return {
        platform: destination.platform,
        streamKey: rtmp.key,
        customRtmpUrl: rtmp.url,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (destination.customRtmpUrl && destination.streamKey) {
    if (lastError) {
      logWarn("Retake go-live handshake failed; using provided RTMP credentials instead", {
        error: lastError.message,
      });
    }
    return {
      platform: destination.platform,
      streamKey: destination.streamKey,
      customRtmpUrl: destination.customRtmpUrl,
    };
  }

  if (lastError) {
    throw new Error(`Failed to resolve Retake stream destination: ${lastError.message}`);
  }
  throw new Error("Retake stream destination is missing credentials");
}

async function resolveDestination(params: {
  convex: ConvexHttpClient;
  body: StartRouteBody;
  streamType: "user" | "agent";
  userId?: Id<"users"> | null;
  internalAuth?: string;
}): Promise<ResolvedDestination> {
  const { convex, body, streamType, userId, internalAuth } = params;
  const requestedPlatform =
    typeof body.platform === "string" && isStreamingPlatform(body.platform) ? body.platform : undefined;

  let platform: StreamingPlatform | undefined = requestedPlatform;
  let streamKey = firstNonEmpty(body.streamKey);
  let customRtmpUrl = firstNonEmpty(body.customRtmpUrl);

  if (body.useStoredCredentials) {
    const stored = await resolveStoredDestination({
      convex,
      streamType,
      userId,
      agentId: body.agentId,
      requestedPlatform,
      customRtmpUrl,
      internalAuth,
    });
    platform = stored.platform;
    streamKey = firstNonEmpty(streamKey, stored.streamKey);
    customRtmpUrl = firstNonEmpty(customRtmpUrl, stored.customRtmpUrl);
  }

  if (!streamKey && body.streamKeyHash) {
    streamKey = decryptStreamKey(body.streamKeyHash);
  }

  if (!platform) {
    throw new Error("Missing or unsupported platform");
  }

  streamKey = firstNonEmpty(streamKey, getEnvStreamKey(platform));
  customRtmpUrl = firstNonEmpty(customRtmpUrl, getEnvRtmpUrl(platform));

  if (!streamKey && platform !== "retake") {
    const platformUpper = platform.toUpperCase();
    throw new Error(
      `No stream key for ${platform}. Set ${platformUpper}_STREAM_KEY env var or pass streamKey in body.`
    );
  }

  const resolved = await maybeResolveRetakeDestination(
    {
      platform,
      streamKey,
      customRtmpUrl,
    },
    body
  );

  // For platforms with required custom RTMP URLs, enforce it explicitly
  if (requiresCustomRtmpUrl(resolved.platform) && !resolved.customRtmpUrl) {
    const platformUpper = resolved.platform.toUpperCase();
    throw new Error(
      `No RTMP URL for ${resolved.platform}. Set ${platformUpper}_RTMP_URL env var or pass customRtmpUrl in body.`
    );
  }

  return resolved;
}

function isActiveSessionStatus(status: StoredStreamingSession["status"]): boolean {
  return status === "live" || status === "pending" || status === "initializing";
}

type AgentSessionSnapshot = {
  allSessions: StoredStreamingSession[];
  activeAgentSessions: StoredStreamingSession[];
};

async function listActiveAgentSessions(params: {
  convex: ConvexHttpClient;
  agentId: string;
  internalAuth: string;
}): Promise<AgentSessionSnapshot> {
  const { convex, agentId, internalAuth } = params;
  const sessionsRaw = await convex.query(apiAny.streaming.sessions.getAllSessions, {
    limit: 100,
    internalAuth,
  });
  const sessions = Array.isArray(sessionsRaw) ? (sessionsRaw as StoredStreamingSession[]) : [];

  const activeAgentSessions = sessions
    .filter((session) => session.agentId === (agentId as Id<"agents">))
    .filter((session) => isActiveSessionStatus(session.status))
    .sort((a, b) => b.createdAt - a.createdAt);

  return {
    allSessions: sessions,
    activeAgentSessions,
  };
}

async function cleanupExistingAgentSessions(params: {
  convex: ConvexHttpClient;
  agentId: string;
  internalAuth: string;
  keepSessionId?: Id<"streamingSessions">;
}): Promise<void> {
  const { convex, agentId, internalAuth, keepSessionId } = params;
  const { activeAgentSessions } = await listActiveAgentSessions({ convex, agentId, internalAuth });

  for (const session of activeAgentSessions) {
    if (keepSessionId && session._id === keepSessionId) {
      continue;
    }

    if (session.egressId) {
      try {
        await stopWebEgress(session.egressId);
      } catch (error) {
        logWarn("Failed to stop existing agent egress during stream restart", {
          sessionId: session._id,
          egressId: session.egressId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      await convex.mutation(apiAny.streaming.sessions.endSession, {
        sessionId: session._id,
        reason: "replaced_by_new_start",
        internalAuth,
      });
    } catch (error) {
      logWarn("Failed to end existing agent stream session during stream restart", {
        sessionId: session._id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

async function isAgentSessionReusable(session: StoredStreamingSession): Promise<boolean> {
  if (session.status !== "live") {
    return true;
  }
  if (!session.egressId) {
    return false;
  }

  try {
    return await isWebEgressActive(session.egressId);
  } catch {
    return false;
  }
}

async function cleanupOrphanedEgresses(params: {
  convex: ConvexHttpClient;
  internalAuth: string;
  sessions?: StoredStreamingSession[];
}): Promise<void> {
  const { convex, internalAuth } = params;

  try {
    let sessions = params.sessions;
    if (!sessions) {
      const sessionsRaw = await convex.query(apiAny.streaming.sessions.getAllSessions, {
        limit: 100,
        internalAuth,
      });
      sessions = Array.isArray(sessionsRaw) ? (sessionsRaw as StoredStreamingSession[]) : [];
    }

    const activeEgressIds = sessions
      .filter((session) => isActiveSessionStatus(session.status))
      .map((session) => session.egressId)
      .filter((egressId): egressId is string => Boolean(egressId));

    const stoppedEgresses = await stopOrphanedOverlayEgresses(activeEgressIds);
    if (stoppedEgresses.length > 0) {
      logWarn("Stopped orphaned overlay egresses during start flow", {
        stoppedCount: stoppedEgresses.length,
      });
    }
  } catch (error) {
    logWarn("Failed orphaned overlay egress cleanup", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isLiveKitConfigured()) {
      return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
    }

    // 1. Auth
    const auth = await resolveStreamingAuth(req);
    const convex = createConvexClient();
    if (auth.bearerToken && !auth.isAgentApiKey && !auth.isInternal) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();

    // 2. Parse body
    const body = (await req.json()) as StartRouteBody;
    const {
      agentId,
      streamType = "user",
      streamTitle,
      overlayConfig,
      lobbyId,
      baseUrl: customBaseUrl,
    } = body;
    const forceRestart = body.forceRestart === true;

    const platformFromBody = body.platform;
    if (isAgentOnlyStreamingEnabled() && streamType !== "agent") {
      return NextResponse.json(
        { error: "Human/user streaming is disabled. Agent streaming only." },
        { status: 403 }
      );
    }
    if (platformFromBody && !isStreamingPlatform(platformFromBody)) {
      return NextResponse.json({ error: "Missing or unsupported platform" }, { status: 400 });
    }
    if (!platformFromBody && !body.useStoredCredentials) {
      return NextResponse.json({ error: "Missing or unsupported platform" }, { status: 400 });
    }
    if (auth.isAgentApiKey && streamType !== "agent") {
      return NextResponse.json({ error: "Agent API keys may only start agent streams" }, { status: 403 });
    }
    if (streamType === "agent" && !auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (streamType === "user" && !auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if ((auth.isInternal || auth.isAgentApiKey) && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }
    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required for agent streams" }, { status: 400 });
    }
    if (streamType === "agent" && auth.isAgentApiKey) {
      if (!auth.agentId) {
        return NextResponse.json(
          { error: "Agent API key is not bound to a registered agent" },
          { status: 403 }
        );
      }
      if (agentId !== auth.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const userId = streamType === "user" ? auth.userId : undefined;
    const baseUrl = (customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3334").trim();
    const currentLobbyId = firstNonEmpty(lobbyId);

    if (streamType === "agent" && agentId && internalAuth) {
      const sessionSnapshot = await listActiveAgentSessions({
        convex,
        agentId,
        internalAuth,
      });
      const existingSessions = sessionSnapshot.activeAgentSessions;
      const existing = existingSessions[0];

      if (existing && !forceRestart) {
        const reusable = await isAgentSessionReusable(existing);
        if (reusable) {
          logInfo("Reusing existing active agent stream session", {
            agentId,
            sessionId: existing._id,
            status: existing.status,
            reason: "idempotent_start",
          });
          const entityId = agentId || "external_agent";
          const overlayToken = await generateOverlayToken(existing._id, streamType, entityId);
          const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${existing._id}&token=${overlayToken}`;

          if (currentLobbyId) {
            await convex.mutation(apiAny.streaming.sessions.linkLobby, {
              sessionId: existing._id,
              lobbyId: currentLobbyId as Id<"gameLobbies">,
              internalAuth,
            });
          }

          return NextResponse.json({
            sessionId: existing._id,
            status: existing.status,
            overlayUrl,
            overlayToken,
            reused: true,
          });
        }

        logWarn("Existing agent session is not reusable; forcing cleanup before restart", {
          agentId,
          sessionId: existing._id,
          status: existing.status,
          hasEgressId: Boolean(existing.egressId),
        });
        await cleanupExistingAgentSessions({
          convex,
          agentId,
          internalAuth,
        });
        await cleanupOrphanedEgresses({ convex, internalAuth });
      }

      if (existing && forceRestart) {
        logWarn("Force restart requested; cleaning up existing active agent stream sessions", {
          agentId,
          activeSessionCount: existingSessions.length,
        });
        await cleanupExistingAgentSessions({
          convex,
          agentId,
          internalAuth,
        });
        await cleanupOrphanedEgresses({ convex, internalAuth });
      }

      // Even when no active session exists in Convex, an orphaned LiveKit overlay egress
      // may still be running from a prior crash/redeploy. Always clean these before
      // creating a fresh agent stream to avoid duplicate outputs fighting each other.
      if (!existingSessions.length) {
        await cleanupOrphanedEgresses({
          convex,
          internalAuth,
          sessions: sessionSnapshot.allSessions,
        });
      }
    }

    // 3. Resolve stream destination
    let destination: ResolvedDestination;
    let rtmpUrl: string;
    try {
      destination = await resolveDestination({
        convex,
        body,
        streamType,
        userId,
        internalAuth,
      });
      rtmpUrl = buildRtmpUrl(destination.platform, destination.streamKey, destination.customRtmpUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid RTMP destination";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 4. Create session in Convex (defaults applied server-side)
    let sessionId: Id<"streamingSessions">;
    try {
      sessionId = await convex.mutation(apiAny.streaming.sessions.createSession, {
        streamType,
        userId: userId ? (userId as Id<"users">) : undefined,
        agentId: agentId ? (agentId as Id<"agents">) : undefined,
        platform: destination.platform,
        streamTitle: streamTitle || "LTCG Live",
        overlayConfig: overlayConfig || undefined,
        internalAuth,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        streamType === "agent" &&
        agentId &&
        internalAuth &&
        message.includes("Already has an active streaming session")
      ) {
        const existingSessions = await listActiveAgentSessions({
          convex,
          agentId,
          internalAuth,
        });
        const existing = existingSessions.activeAgentSessions[0];
        if (existing) {
          const reusable = await isAgentSessionReusable(existing);
          if (reusable) {
            const entityId = agentId || "external_agent";
            const overlayToken = await generateOverlayToken(existing._id, streamType, entityId);
            const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${existing._id}&token=${overlayToken}`;

            if (currentLobbyId) {
              await convex.mutation(apiAny.streaming.sessions.linkLobby, {
                sessionId: existing._id,
                lobbyId: currentLobbyId as Id<"gameLobbies">,
                internalAuth,
              });
            }

            return NextResponse.json({
              sessionId: existing._id,
              status: existing.status,
              overlayUrl,
              overlayToken,
              reused: true,
            });
          }

          logWarn("Active session conflict points to non-reusable egress; cleaning and retrying", {
            agentId,
            sessionId: existing._id,
            status: existing.status,
            hasEgressId: Boolean(existing.egressId),
          });

          await cleanupExistingAgentSessions({
            convex,
            agentId,
            internalAuth,
          });
          await cleanupOrphanedEgresses({ convex, internalAuth });

          sessionId = await convex.mutation(apiAny.streaming.sessions.createSession, {
            streamType,
            userId: userId ? (userId as Id<"users">) : undefined,
            agentId: agentId ? (agentId as Id<"agents">) : undefined,
            platform: destination.platform,
            streamTitle: streamTitle || "LTCG Live",
            overlayConfig: overlayConfig || undefined,
            internalAuth,
          });
        }
      }
      throw error;
    }

    // 3b. Link game if provided
    if (currentLobbyId) {
      await convex.mutation(apiAny.streaming.sessions.linkLobby, {
        sessionId,
        lobbyId: currentLobbyId as Id<"gameLobbies">,
        internalAuth,
      });
    }

    // 5. Generate JWT overlay token
    const entityId = streamType === "user" ? (userId ?? "external_user") : agentId || "external_agent";
    const overlayToken = await generateOverlayToken(sessionId, streamType, entityId);

    // 6. Build overlay URL
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&token=${overlayToken}`;

    // 7. Start LiveKit web egress
    try {
      const { egressId } = await startWebEgress({
        overlayUrl,
        rtmpUrls: [rtmpUrl],
        sessionId,
      });

      // 8. Update session with egressId
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId,
        internalAuth,
        updates: {
          egressId,
          overlayUrl,
          status: "live",
          startedAt: Date.now(),
        },
      });

      return NextResponse.json({
        sessionId,
        status: "live",
        overlayUrl,
        overlayToken,
      });
    } catch (liveKitError) {
      const errorMessage = liveKitError instanceof Error ? liveKitError.message : "LiveKit error";
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId,
        internalAuth,
        updates: { status: "error", errorMessage },
      });
      return NextResponse.json({ error: errorMessage, sessionId }, { status: 500 });
    }
  } catch (error) {
    logError("Error starting stream", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
