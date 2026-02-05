import { buildRtmpUrl, encryptStreamKey } from "@/lib/streaming/encryption";
import { isLiveKitConfigured, startWebEgress } from "@/lib/streaming/livekit";
import { generateOverlayToken } from "@/lib/streaming/tokens";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Feature flag check
    const streamingEnabled = process.env.NEXT_PUBLIC_STREAMING_ENABLED === "true";
    if (!streamingEnabled) {
      return NextResponse.json({ error: "Streaming feature is not enabled" }, { status: 503 });
    }

    // Check if LiveKit is configured
    if (!isLiveKitConfigured()) {
      return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
    }

    const body = await req.json();
    const {
      userId,
      agentId,
      streamType = "user",
      platform,
      streamKey,
      customRtmpUrl,
      streamTitle,
      overlayConfig,
    } = body;

    // Validate required fields
    if (!platform || !streamKey) {
      return NextResponse.json(
        { error: "Missing required fields: platform, streamKey" },
        { status: 400 }
      );
    }

    if (streamType === "user" && !userId) {
      return NextResponse.json({ error: "userId required for user streams" }, { status: 400 });
    }

    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required for agent streams" }, { status: 400 });
    }

    // Default overlay config
    const finalOverlayConfig = overlayConfig || {
      showDecisions: streamType === "agent",
      showAgentInfo: streamType === "agent",
      showEventFeed: true,
      showPlayerCam: streamType === "user",
      theme: "dark" as const,
    };

    // 1. Create session in Convex
    const sessionId = await convex.mutation(api.streaming.sessions.createSession, {
      streamType,
      userId: userId ? (userId as Id<"users">) : undefined,
      agentId: agentId ? (agentId as Id<"agents">) : undefined,
      platform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: finalOverlayConfig,
    });

    // 2. Encrypt and store stream key
    const streamKeyHash = encryptStreamKey(streamKey);
    await convex.mutation(api.streaming.sessions.updateSession, {
      sessionId,
      updates: { streamKeyHash },
    });

    // 3. Generate overlay URL with JWT token
    const entityId = streamType === "user" ? userId : agentId;
    const token = await generateOverlayToken(sessionId, streamType, entityId);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&token=${token}`;

    // 4. Build RTMP URL
    const rtmpUrl = buildRtmpUrl(platform, streamKey, customRtmpUrl);

    // 5. Start LiveKit egress
    try {
      const { egressId } = await startWebEgress({
        overlayUrl,
        rtmpUrl,
        sessionId,
      });

      // 6. Update session with egress ID
      await convex.mutation(api.streaming.sessions.updateSession, {
        sessionId,
        updates: {
          egressId,
          overlayUrl,
          status: "pending",
        },
      });

      return NextResponse.json({
        success: true,
        sessionId,
        status: "pending",
        overlayUrl,
        message: "Stream starting... It may take a few seconds to go live.",
      });
    } catch (liveKitError) {
      // Mark session as error
      const errorMessage = liveKitError instanceof Error ? liveKitError.message : "LiveKit error";
      await convex.mutation(api.streaming.sessions.updateSession, {
        sessionId,
        updates: {
          status: "error",
          errorMessage,
        },
      });

      return NextResponse.json({ error: errorMessage, sessionId }, { status: 500 });
    }
  } catch (error) {
    console.error("Error starting stream:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
