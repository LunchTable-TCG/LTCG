import { type NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { generateRoomToken, generateRoomName, getLiveKitUrl } from "@/lib/streaming/livekitRoom";
import { logError, logInfo } from "@/lib/streaming/logging";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/**
 * Create a LiveKit room for streaming
 * Returns room details and access token
 */
export async function POST(req: NextRequest) {
  try {
    const streamingEnabled = process.env.NEXT_PUBLIC_STREAMING_ENABLED === "true";
    if (!streamingEnabled) {
      return NextResponse.json({ error: "Streaming not enabled" }, { status: 503 });
    }

    const body = await req.json();
    const { userId, agentId, streamType, platform, streamKey, streamTitle, overlayConfig } = body;

    // Validate
    if (!platform || !streamKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (streamType === "user" && !userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    // Create streaming session in Convex
    const sessionId = await convex.mutation(api.streaming.sessions.createSession, {
      streamType,
      userId: userId ? (userId as Id<"users">) : undefined,
      agentId: agentId ? (agentId as Id<"agents">) : undefined,
      platform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: overlayConfig || {
        showDecisions: streamType === "agent",
        showAgentInfo: streamType === "agent",
        showEventFeed: true,
        showPlayerCam: streamType === "user",
        theme: "dark" as const,
      },
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
    const crypto = await import("crypto");
    const accessCode = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Create access code in database
    await convex.mutation(api.streaming.sessions.createOverlayAccess, {
      sessionId: sessionId as Id<"streamingSessions">,
      accessCode,
      expiresAt,
    });

    const livekitUrl = getLiveKitUrl();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create overlay URL with access code instead of token
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&code=${accessCode}&roomName=${encodeURIComponent(roomName)}&livekitUrl=${encodeURIComponent(livekitUrl)}`;

    // Start Web Egress to capture the composite overlay
    const { startWebEgress } = await import("@/lib/streaming/livekit");
    const { buildRtmpUrl } = await import("@/lib/streaming/encryption");

    const rtmpUrl = buildRtmpUrl(platform, streamKey);

    try {
      const { egressId } = await startWebEgress({
        overlayUrl,
        rtmpUrl,
        sessionId,
      });

      // Update session with room and egress info
      await convex.mutation(api.streaming.sessions.updateSession, {
        sessionId: sessionId as Id<"streamingSessions">,
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
      logError("Failed to start egress", { error: egressError instanceof Error ? egressError.message : String(egressError) });

      // Still return success for room creation, but log egress failure
      await convex.mutation(api.streaming.sessions.updateSession, {
        sessionId: sessionId as Id<"streamingSessions">,
        updates: {
          status: "error",
          errorMessage: "Failed to start egress",
        },
      });

      return NextResponse.json({
        success: true,
        sessionId,
        roomName,
        token: userToken,
        overlayToken: overlayToken, // Separate token for client storage
        livekitUrl,
        warning: "Room created but egress failed to start",
      });
    }
  } catch (error) {
    logError("Error creating streaming room", { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
