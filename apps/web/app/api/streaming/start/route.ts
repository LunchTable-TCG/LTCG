import { isLiveKitConfigured, startWebEgress } from "@/lib/streaming/livekit";
import { logError } from "@/lib/streaming/logging";
import { isStreamingPlatform } from "@/lib/streaming/platforms";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import { generateOverlayToken } from "@/lib/streaming/tokens";
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

/**
 * Resolve RTMP URL and stream key from platform env vars.
 * Convention: {PLATFORM}_RTMP_URL, {PLATFORM}_STREAM_KEY
 * Well-known platforms (twitch, youtube, kick) have default RTMP base URLs.
 */
function resolveRtmpDestination(platform: string, body: {
  streamKey?: string;
  customRtmpUrl?: string;
}) {
  const platformUpper = platform.toUpperCase();
  const streamKey = body.streamKey || process.env[`${platformUpper}_STREAM_KEY`] || "";
  const customRtmpUrl = body.customRtmpUrl || process.env[`${platformUpper}_RTMP_URL`];

  if (!streamKey) {
    throw new Error(`No stream key for ${platform}. Set ${platformUpper}_STREAM_KEY env var or pass streamKey in body.`);
  }

  // Well-known RTMP base URLs
  const defaultRtmpUrls: Record<string, string> = {
    twitch: "rtmps://live.twitch.tv/app",
    youtube: "rtmps://a.rtmp.youtube.com/live2",
    kick: "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app",
  };

  const rtmpBase = customRtmpUrl?.trim() || defaultRtmpUrls[platform];
  if (!rtmpBase) {
    throw new Error(`No RTMP URL for ${platform}. Set ${platformUpper}_RTMP_URL env var or pass customRtmpUrl in body.`);
  }

  // Append stream key to base URL
  const normalizedBase = rtmpBase.replace(/\/+$/, "");
  return `${normalizedBase}/${streamKey.trim()}`;
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
    const body = await req.json();
    const {
      agentId,
      streamType = "user",
      platform,
      streamTitle,
      overlayConfig,
      gameId,
      lobbyId,
      baseUrl: customBaseUrl,
    } = body;

    if (streamType === "agent" && !auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (streamType === "user" && !auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if ((auth.isInternal || auth.isAgentApiKey) && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }
    if (!platform || !isStreamingPlatform(platform)) {
      return NextResponse.json({ error: "Missing or unsupported platform" }, { status: 400 });
    }
    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required for agent streams" }, { status: 400 });
    }

    const userId = streamType === "user" ? auth.userId : undefined;

    // 3. Create session in Convex (defaults applied server-side)
    const sessionId = await convex.mutation(apiAny.streaming.sessions.createSession, {
      streamType,
      userId: userId ? (userId as Id<"users">) : undefined,
      agentId: agentId ? (agentId as Id<"agents">) : undefined,
      platform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: overlayConfig || undefined,
      internalAuth,
    });

    // 3b. Link game if provided
    const currentLobbyId = lobbyId || gameId;
    if (currentLobbyId) {
      await convex.mutation(apiAny.streaming.sessions.linkLobby, {
        sessionId,
        lobbyId: currentLobbyId as Id<"gameLobbies">,
        internalAuth,
      });
    }

    // 4. Generate JWT overlay token
    const entityId = streamType === "user" ? (userId ?? "external_user") : agentId || "external_agent";
    const overlayToken = await generateOverlayToken(sessionId, streamType, entityId);

    // 5. Build overlay URL
    const baseUrl = (customBaseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333").trim();
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&token=${overlayToken}`;

    // 6. Resolve RTMP destination from env vars
    let rtmpUrl: string;
    try {
      rtmpUrl = resolveRtmpDestination(platform, body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid RTMP destination";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

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
          status: "pending",
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
