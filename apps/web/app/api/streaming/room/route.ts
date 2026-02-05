import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { generateRoomToken, generateRoomName, getLiveKitUrl } from "@/lib/streaming/livekitRoom";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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
    const token = await generateRoomToken({
      roomName,
      participantIdentity,
      participantName: `${streamType}-${participantIdentity}`,
      metadata: JSON.stringify({ sessionId, streamType }),
    });

    // Update session with room info
    await convex.mutation(api.streaming.sessions.updateSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      updates: {
        streamKeyHash: streamKey, // Will be encrypted by mutation
        status: "pending",
      },
    });

    const livekitUrl = getLiveKitUrl();

    return NextResponse.json({
      success: true,
      sessionId,
      roomName,
      token,
      livekitUrl,
      message: "Room created. Join to start streaming.",
    });
  } catch (error) {
    console.error("Error creating streaming room:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
