import { buildRtmpUrl, decryptStreamKey, encryptStreamKey } from "@/lib/streaming/encryption";
import { isLiveKitConfigured, startWebEgress } from "@/lib/streaming/livekit";
import { logError } from "@/lib/streaming/logging";
import { isStreamingPlatform } from "@/lib/streaming/platforms";
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

function clampVoiceVolume(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(1, value));
}

export async function POST(req: NextRequest) {
  try {
    // Check if LiveKit is configured
    if (!isLiveKitConfigured()) {
      return NextResponse.json({ error: "LiveKit is not configured" }, { status: 500 });
    }

    const auth = await resolveStreamingAuth(req);
    const convex = createConvexClient();
    if (auth.bearerToken && !auth.isAgentApiKey && !auth.isInternal) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();

    const body = (await req.json()) as StartStreamBody;
    const {
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
      baseUrl: customBaseUrl,
      // Multi-destination support
      destinations,
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

    const userId = streamType === "user" ? auth.userId : undefined;

    // Determine stream key source and resolve platform/RTMP from stored credentials if requested
    let streamKey: string;
    let resolvedPlatform = platform;
    let resolvedRtmpUrl = customRtmpUrl;

    if (body.useStoredCredentials) {
      // Look up stored credentials from the database
      if (streamType === "agent" && agentId) {
        if (!internalAuth) {
          return NextResponse.json(
            { error: "INTERNAL_API_SECRET required for stored credentials" },
            { status: 500 }
          );
        }
        const agentCreds = await convex.query(apiAny.agents.streaming.getAgentStreamKeyHash, {
          agentId: agentId as Id<"agents">,
          internalAuth: internalAuth,
        });
        if (!agentCreds?.streamingKeyHash) {
          return NextResponse.json({ error: "No stored stream key for agent" }, { status: 400 });
        }
        streamKey = decryptStreamKey(agentCreds.streamingKeyHash);
        resolvedPlatform = resolvedPlatform || agentCreds.streamingPlatform;
        resolvedRtmpUrl = resolvedRtmpUrl || agentCreds.streamingRtmpUrl || undefined;
      } else if (streamType === "user" && auth.userId) {
        // Look up user streaming config from preferences
        const userConfig = await convex.query(apiAny.core.userPreferences.getUserStreamingConfig, {
          userId: auth.userId,
        });
        if (!userConfig?.streamKeyHash) {
          return NextResponse.json({ error: "No stored stream key for user" }, { status: 400 });
        }
        streamKey = decryptStreamKey(userConfig.streamKeyHash);
        resolvedPlatform = resolvedPlatform || userConfig.platform;
        resolvedRtmpUrl = resolvedRtmpUrl || userConfig.rtmpUrl || undefined;
      } else {
        return NextResponse.json({ error: "Cannot resolve stored credentials" }, { status: 400 });
      }
    } else if (streamKeyHash) {
      // Agent request with encrypted key (internal auto-start flow)
      if (!auth.isInternal) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      streamKey = decryptStreamKey(streamKeyHash);
    } else if (plainStreamKey) {
      // User request with plain key
      streamKey = plainStreamKey;
    } else {
      return NextResponse.json({ error: "Missing stream key" }, { status: 400 });
    }

    // Validate stream key is not empty after resolution
    if (!streamKey?.trim()) {
      return NextResponse.json({ error: "Stream key cannot be empty" }, { status: 400 });
    }

    // Validate required fields
    if (!resolvedPlatform) {
      return NextResponse.json({ error: "Missing required field: platform" }, { status: 400 });
    }
    if (!isStreamingPlatform(resolvedPlatform)) {
      return NextResponse.json({ error: "Unsupported streaming platform" }, { status: 400 });
    }
    if (streamType === "user" && resolvedPlatform === "retake") {
      return NextResponse.json(
        { error: "Retake is agent-only. User streams must use another platform." },
        { status: 400 }
      );
    }

    if (streamType === "agent" && !agentId) {
      return NextResponse.json({ error: "agentId required for agent streams" }, { status: 400 });
    }

    // Default overlay config
    const trimmedVoiceTrackUrl = overlayConfig?.voiceTrackUrl?.trim();
    const trimmedProfilePictureUrl = overlayConfig?.profilePictureUrl?.trim();
    const clampedVoiceVolume = clampVoiceVolume(overlayConfig?.voiceVolume);
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

    // 1. Create session in Convex
    const sessionId = await convex.mutation(apiAny.streaming.sessions.createSession, {
      streamType,
      userId: userId ? (userId as Id<"users">) : undefined,
      agentId: agentId ? (agentId as Id<"agents">) : undefined,
      platform: resolvedPlatform,
      streamTitle: streamTitle || "LTCG Live",
      overlayConfig: finalOverlayConfig,
      internalAuth,
    });

    // 1b. Link game to session if provided (so overlay knows what to display)
    const currentLobbyId = lobbyId || gameId;
    if (currentLobbyId) {
      await convex.mutation(apiAny.streaming.sessions.linkLobby, {
        sessionId,
        lobbyId: currentLobbyId as Id<"gameLobbies">,
        internalAuth,
      });
    }

    // 2. Encrypt and store stream key
    const encryptedKey = encryptStreamKey(streamKey);
    await convex.mutation(apiAny.streaming.sessions.updateSession, {
      sessionId,
      internalAuth,
      updates: { streamKeyHash: encryptedKey },
    });

    // 3. Generate secure access code for overlay URL
    const crypto = await import("node:crypto");
    const accessCode = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Create access code in database
    await convex.mutation(apiAny.streaming.sessions.createOverlayAccess, {
      sessionId,
      accessCode,
      expiresAt,
      internalAuth,
    });

    const baseUrl = (
      customBaseUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3333"
    ).trim();

    // Generate overlay token BEFORE building URL (needed for middleware auth)
    const entityId =
      streamType === "user" ? (userId ?? "external_user") : agentId || "external_agent";
    const overlayToken = await generateOverlayToken(sessionId, streamType, entityId);

    const overlayUrl = `${baseUrl}/stream/overlay?sessionId=${sessionId}&code=${accessCode}&token=${overlayToken}`;

    // 4. Build RTMP URL(s) — supports multi-destination
    let rtmpUrls: string[];
    try {
      if (destinations && Array.isArray(destinations) && destinations.length > 0) {
        // Multi-destination mode
        for (const destination of destinations) {
          if (!isStreamingPlatform(destination.platform)) {
            return NextResponse.json(
              { error: `Unsupported destination platform: ${destination.platform}` },
              { status: 400 }
            );
          }
          if (streamType === "user" && destination.platform === "retake") {
            return NextResponse.json(
              { error: "Retake is agent-only. User streams cannot include Retake destinations." },
              { status: 400 }
            );
          }
        }
        rtmpUrls = destinations.map((dest) =>
          buildRtmpUrl(dest.platform, dest.streamKey, dest.customRtmpUrl)
        );
      } else {
        // Single destination (backward-compatible)
        rtmpUrls = [buildRtmpUrl(resolvedPlatform, streamKey, resolvedRtmpUrl)];
      }
    } catch (validationError) {
      const message =
        validationError instanceof Error ? validationError.message : "Invalid stream destination";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 5. Start LiveKit egress
    try {
      const { egressId } = await startWebEgress({
        overlayUrl,
        rtmpUrls,
        sessionId,
      });

      // 6. Update session with egress ID
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId,
        internalAuth,
        updates: {
          egressId,
          overlayUrl,
          status: "pending",
        },
      });

      // 6b. Track individual destinations for multi-destination streams
      if (destinations && Array.isArray(destinations) && destinations.length > 0) {
        for (const dest of destinations) {
          const destStreamKey = dest.streamKey;
          const destRtmpUrl = buildRtmpUrl(dest.platform, destStreamKey, dest.customRtmpUrl);
          await convex.mutation(apiAny.streaming.sessions.addDestination, {
            sessionId,
            platform: dest.platform,
            rtmpUrl: destRtmpUrl,
            streamKeyHash: encryptStreamKey(destStreamKey),
            internalAuth,
          });
        }
      }

      return NextResponse.json({
        success: true,
        sessionId,
        status: "pending",
        overlayUrl,
        overlayToken, // Token for client storage and middleware auth
        message: "Stream starting... It may take a few seconds to go live.",
      });
    } catch (liveKitError) {
      // Mark session as error
      const errorMessage = liveKitError instanceof Error ? liveKitError.message : "LiveKit error";
      await convex.mutation(apiAny.streaming.sessions.updateSession, {
        sessionId,
        internalAuth,
        updates: {
          status: "error",
          errorMessage,
        },
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
