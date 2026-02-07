import { buildRtmpUrl, decryptStreamKey, encryptStreamKey } from "@/lib/streaming/encryption";
import { isLiveKitConfigured, startWebEgress } from "@/lib/streaming/livekit";
import { generateOverlayToken } from "@/lib/streaming/tokens";
import { logError } from "@/lib/streaming/logging";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Check if LiveKit is configured
    if (!isLiveKitConfigured()) {
      return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
    }

    // Check internal auth header for agent requests
    const internalAuth = req.headers.get("X-Internal-Auth");
    const isInternalRequest = internalAuth === process.env.INTERNAL_API_SECRET;

    const body = await req.json();
    const {
      userId,
      agentId,
      streamType = "user",
      platform,
      streamKey: plainStreamKey,
      streamKeyHash,
      customRtmpUrl,
      streamTitle,
      overlayConfig,
      gameId,
      lobbyId,
    } = body;

    // Determine stream key source
    let streamKey: string;
    if (streamKeyHash) {
      // Agent request with encrypted key
      if (!isInternalRequest) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      streamKey = decryptStreamKey(streamKeyHash);
    } else if (plainStreamKey) {
      // User request with plain key
      streamKey = plainStreamKey;
    } else {
      return NextResponse.json({ error: "Missing stream key" }, { status: 400 });
    }

    // Validate required fields
    if (!platform) {
      return NextResponse.json({ error: "Missing required field: platform" }, { status: 400 });
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
      agentId: agentId && agentId.startsWith("j") ? (agentId as Id<"agents">) : undefined, // Only use if it's a Convex ID
      platform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: finalOverlayConfig,
    });

    // 1b. Link game to session if provided (so overlay knows what to display)
    const currentLobbyId = lobbyId || gameId;
    if (currentLobbyId) {
      await convex.mutation(api.streaming.sessions.linkLobby, {
        sessionId,
        lobbyId: currentLobbyId as Id<"gameLobbies">,
      });
    }

    // 2. Encrypt and store stream key
    const encryptedKey = encryptStreamKey(streamKey);
    await convex.mutation(api.streaming.sessions.updateSession, {
      sessionId,
      updates: { streamKeyHash: encryptedKey },
    });

    // 3. Generate secure access code for overlay URL
    const crypto = await import("crypto");
    const accessCode = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Create access code in database
    await convex.mutation(api.streaming.sessions.createOverlayAccess, {
      sessionId,
      accessCode,
      expiresAt,
    });

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();
    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&code=${accessCode}`;

    // Generate overlay token separately (for client storage, not in URL)
    const entityId = streamType === "user" ? userId : (agentId || "external_agent");
    const token = await generateOverlayToken(sessionId, streamType, entityId!);

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
        overlayToken: token, // Token separate for client storage
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
    logError("Error starting stream", { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
