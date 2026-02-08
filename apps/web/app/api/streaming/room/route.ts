import { decryptStreamKey } from "@/lib/streaming/encryption";
import { generateRoomName, generateRoomToken, getLiveKitUrl } from "@/lib/streaming/livekitRoom";
import { logError } from "@/lib/streaming/logging";
import { isStreamingPlatform, requiresCustomRtmpUrl } from "@/lib/streaming/platforms";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import type { CreateRoomBody } from "@/lib/streaming/types";
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
 * Create a LiveKit room for streaming
 * Returns room details and access token
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    const convex = createConvexClient();
    if (auth.bearerToken && !auth.isAgentApiKey && !auth.isInternal) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    const body = (await req.json()) as CreateRoomBody;
    const { agentId, streamType, streamTitle, overlayConfig } = body;

    if (streamType === "agent" && !auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (streamType === "user" && !auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if ((auth.isInternal || auth.isAgentApiKey) && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }

    const userId = streamType === "user" ? auth.userId : undefined;

    // Validate streamType
    if (!streamType || (streamType !== "user" && streamType !== "agent")) {
      return NextResponse.json({ error: "Invalid streamType" }, { status: 400 });
    }

    // Resolve stream key — supports stored credentials or direct key
    let streamKey: string;
    let platform = body.platform;
    let customRtmpUrl = body.customRtmpUrl;

    if (body.useStoredCredentials) {
      if (streamType === "agent" && agentId) {
        if (!internalAuth) {
          return NextResponse.json(
            { error: "INTERNAL_API_SECRET required for stored credentials" },
            { status: 500 }
          );
        }
        const agentCreds = await convex.query(apiAny.agents.streaming.getAgentStreamKeyHash, {
          agentId: agentId as Id<"agents">,
          internalAuth,
        });
        if (!agentCreds?.streamingKeyHash) {
          return NextResponse.json({ error: "No stored stream key for agent" }, { status: 400 });
        }
        streamKey = decryptStreamKey(agentCreds.streamingKeyHash);
        platform = platform || agentCreds.streamingPlatform;
        customRtmpUrl = customRtmpUrl || agentCreds.streamingRtmpUrl || undefined;
      } else if (streamType === "user" && auth.userId) {
        const userConfig = await convex.query(apiAny.core.userPreferences.getUserStreamingConfig, {
          userId: auth.userId,
        });
        if (!userConfig?.streamKeyHash) {
          return NextResponse.json({ error: "No stored stream key for user" }, { status: 400 });
        }
        streamKey = decryptStreamKey(userConfig.streamKeyHash);
        platform = platform || userConfig.platform;
        customRtmpUrl = customRtmpUrl || userConfig.rtmpUrl || undefined;
      } else {
        return NextResponse.json({ error: "Cannot resolve stored credentials" }, { status: 400 });
      }
    } else if (body.streamKey) {
      streamKey = body.streamKey;
    } else {
      return NextResponse.json({ error: "Missing stream key" }, { status: 400 });
    }

    // Validate platform and stream key
    if (!platform) {
      return NextResponse.json({ error: "Missing required field: platform" }, { status: 400 });
    }
    if (!streamKey.trim()) {
      return NextResponse.json({ error: "Stream key cannot be empty" }, { status: 400 });
    }
    if (!isStreamingPlatform(platform)) {
      return NextResponse.json({ error: "Unsupported streaming platform" }, { status: 400 });
    }
    if (streamType === "user" && platform === "retake") {
      return NextResponse.json(
        { error: "Retake is agent-only. User streams must use another platform." },
        { status: 400 }
      );
    }
    if (requiresCustomRtmpUrl(platform) && !customRtmpUrl) {
      return NextResponse.json(
        { error: `RTMP URL required for ${platform} platform` },
        { status: 400 }
      );
    }

    if (streamType === "user" && !userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const trimmedVoiceTrackUrl = overlayConfig?.voiceTrackUrl?.trim();
    const trimmedProfilePictureUrl = overlayConfig?.profilePictureUrl?.trim();
    const clampedVoiceVolume =
      typeof overlayConfig?.voiceVolume === "number"
        ? Math.max(0, Math.min(1, overlayConfig.voiceVolume))
        : undefined;
    const playerVisualMode =
      overlayConfig?.playerVisualMode === "profile-picture" ? "profile-picture" : "webcam";

    const finalOverlayConfig = {
      showDecisions: overlayConfig?.showDecisions ?? streamType === "agent",
      showAgentInfo: overlayConfig?.showAgentInfo ?? streamType === "agent",
      showEventFeed: overlayConfig?.showEventFeed ?? true,
      showPlayerCam: overlayConfig?.showPlayerCam ?? streamType === "user",
      webcamPosition: overlayConfig?.webcamPosition ?? "bottom-right",
      webcamSize: overlayConfig?.webcamSize ?? "medium",
      playerVisualMode,
      ...(trimmedProfilePictureUrl ? { profilePictureUrl: trimmedProfilePictureUrl } : {}),
      matchOverHoldMs: overlayConfig?.matchOverHoldMs ?? 45000,
      showSceneLabel: overlayConfig?.showSceneLabel ?? true,
      sceneTransitions: overlayConfig?.sceneTransitions ?? true,
      ...(trimmedVoiceTrackUrl ? { voiceTrackUrl: trimmedVoiceTrackUrl } : {}),
      ...(clampedVoiceVolume !== undefined ? { voiceVolume: clampedVoiceVolume } : {}),
      ...(typeof overlayConfig?.voiceLoop === "boolean"
        ? { voiceLoop: overlayConfig.voiceLoop }
        : {}),
      theme: overlayConfig?.theme ?? ("dark" as const),
    };

    // Create streaming session in Convex
    const sessionId = await convex.mutation(apiAny.streaming.sessions.createSession, {
      streamType,
      userId: userId ? (userId as Id<"users">) : undefined,
      agentId: agentId ? (agentId as Id<"agents">) : undefined,
      platform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: finalOverlayConfig,
      internalAuth,
    });

    // Generate LiveKit room name
    const roomName = generateRoomName(sessionId);

    // Generate access token for user
    const participantIdentity = streamType === "user" ? userId : agentId;
    const userToken = await generateRoomToken({
      roomName,
      participantIdentity,
      participantName: `${streamType}-${participantIdentity}`,
      metadata: JSON.stringify({ sessionId, streamType }),
    });

    // Generate access token for overlay to join room
    const overlayToken = await generateRoomToken({
      roomName,
      participantIdentity: `overlay-${sessionId}`,
      participantName: "Stream Overlay",
      metadata: JSON.stringify({ sessionId, isOverlay: true }),
    });

    // Generate secure access code for overlay URL
    const crypto = await import("node:crypto");
    const accessCode = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Create access code in database
    await convex.mutation(apiAny.streaming.sessions.createOverlayAccess, {
      sessionId: sessionId as Id<"streamingSessions">,
      accessCode,
      expiresAt,
      internalAuth,
    });

    const livekitUrl = getLiveKitUrl();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3333";

    // Create overlay URL with access code instead of token
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&code=${accessCode}&token=${encodeURIComponent(overlayToken)}&roomName=${encodeURIComponent(roomName)}&livekitUrl=${encodeURIComponent(livekitUrl)}`;

    // Start Web Egress to capture the composite overlay
    const { startWebEgress } = await import("@/lib/streaming/livekit");
    const { buildRtmpUrl } = await import("@/lib/streaming/encryption");

    let rtmpUrl: string;
    try {
      rtmpUrl = buildRtmpUrl(platform, streamKey, customRtmpUrl);
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : "Invalid stream destination";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    try {
      const { egressId } = await startWebEgress({
        overlayUrl,
        rtmpUrls: [rtmpUrl],
        sessionId,
      });

      // Update session with room and egress info
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId: sessionId as Id<"streamingSessions">,
        internalAuth,
        updates: {
          egressId,
          overlayUrl,
          status: "pending",
        },
      });

      return NextResponse.json({
        success: true,
        sessionId,
        roomName,
        token: userToken,
        overlayToken: overlayToken, // Separate token for client storage
        livekitUrl,
        message: "Room created. Join to start streaming.",
      });
    } catch (egressError) {
      logError("Failed to start egress", {
        error: egressError instanceof Error ? egressError.message : String(egressError),
      });

      // Still return success for room creation, but log egress failure
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId: sessionId as Id<"streamingSessions">,
        internalAuth,
        updates: {
          status: "error",
          errorMessage: "Failed to start egress",
        },
      });

      return NextResponse.json(
        {
          success: false,
          sessionId,
          roomName,
          token: userToken,
          overlayToken: overlayToken,
          livekitUrl,
          error: "Room created but egress failed to start. Stream will not be broadcast.",
        },
        { status: 502 }
      );
    }
  } catch (error) {
    logError("Error creating streaming room", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
