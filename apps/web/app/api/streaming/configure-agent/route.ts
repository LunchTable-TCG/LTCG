import { encryptStreamKey } from "@/lib/streaming/encryption";
import {
  type StreamingPlatform,
  isStreamingPlatform,
  requiresCustomRtmpUrl,
} from "@/lib/streaming/platforms";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import type { ConfigureAgentBody } from "@/lib/streaming/types";
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
 * Server-side API route for configuring agent streaming.
 *
 * Handles stream key encryption on the server so the encryption key
 * is never exposed to the client bundle.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.userId && !auth.isInternal && !auth.isAgentApiKey) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const convex = createConvexClient();
    if (auth.bearerToken && auth.userId) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    if (!auth.userId && !internalAuth) {
      return NextResponse.json(
        { error: "INTERNAL_API_SECRET is required for non-user agent streaming config" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ConfigureAgentBody;
    const {
      agentId,
      enabled,
      platform,
      streamKey,
      rtmpUrl,
      autoStart,
      keepAlive,
      voiceTrackUrl,
      voiceVolume,
      voiceLoop,
      visualMode,
      profilePictureUrl,
    } = body;
    const hasVoiceTrackUrl = Object.prototype.hasOwnProperty.call(body, "voiceTrackUrl");
    const hasVoiceVolume = Object.prototype.hasOwnProperty.call(body, "voiceVolume");
    const hasVoiceLoop = Object.prototype.hasOwnProperty.call(body, "voiceLoop");
    const hasVisualMode = Object.prototype.hasOwnProperty.call(body, "visualMode");
    const hasProfilePictureUrl = Object.prototype.hasOwnProperty.call(body, "profilePictureUrl");
    const trimmedRtmpUrl = typeof rtmpUrl === "string" ? rtmpUrl.trim() : undefined;
    const trimmedVoiceTrackUrl =
      typeof voiceTrackUrl === "string" ? voiceTrackUrl.trim() : undefined;
    const trimmedProfilePictureUrl =
      typeof profilePictureUrl === "string" ? profilePictureUrl.trim() : undefined;

    if (trimmedVoiceTrackUrl && !/^https?:\/\//i.test(trimmedVoiceTrackUrl)) {
      return NextResponse.json(
        { error: "voiceTrackUrl must start with https:// or http://" },
        { status: 400 }
      );
    }
    if (trimmedProfilePictureUrl && !/^https?:\/\//i.test(trimmedProfilePictureUrl)) {
      return NextResponse.json(
        { error: "profilePictureUrl must start with https:// or http://" },
        { status: 400 }
      );
    }
    if (hasVisualMode && visualMode !== "webcam" && visualMode !== "profile-picture") {
      return NextResponse.json(
        { error: "visualMode must be either webcam or profile-picture" },
        { status: 400 }
      );
    }

    if (
      typeof voiceVolume === "number" &&
      (Number.isNaN(voiceVolume) || voiceVolume < 0 || voiceVolume > 1)
    ) {
      return NextResponse.json({ error: "voiceVolume must be between 0 and 1" }, { status: 400 });
    }

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    let validatedPlatform: StreamingPlatform | undefined;
    if (enabled !== false) {
      if (!platform || typeof platform !== "string" || !isStreamingPlatform(platform)) {
        return NextResponse.json(
          { error: "Valid platform is required when streaming is enabled" },
          { status: 400 }
        );
      }
      validatedPlatform = platform;

      if (typeof streamKey === "string" && !streamKey.trim()) {
        return NextResponse.json({ error: "Stream key cannot be empty" }, { status: 400 });
      }

      if (trimmedRtmpUrl && !/^rtmps?:\/\//i.test(trimmedRtmpUrl)) {
        return NextResponse.json(
          { error: `RTMP URL for ${validatedPlatform} must start with rtmp:// or rtmps://` },
          { status: 400 }
        );
      }

      if (requiresCustomRtmpUrl(validatedPlatform) && !trimmedRtmpUrl) {
        return NextResponse.json(
          { error: `RTMP URL is required for ${validatedPlatform} platform` },
          { status: 400 }
        );
      }
    }

    // Encrypt stream key server-side if provided
    let streamKeyHash: string | undefined;
    if (streamKey) {
      streamKeyHash = encryptStreamKey(streamKey);
    }

    // Call Convex mutation with encrypted key
    await convex.mutation(apiAny.agents.streaming.configureAgentStreaming, {
      agentId: agentId as Id<"agents">,
      enabled: enabled ?? true,
      platform: validatedPlatform,
      streamKeyHash,
      rtmpUrl: trimmedRtmpUrl,
      autoStart,
      keepAlive,
      ...(hasVoiceTrackUrl ? { voiceTrackUrl: trimmedVoiceTrackUrl ?? "" } : {}),
      ...(hasVoiceVolume && typeof voiceVolume === "number" ? { voiceVolume } : {}),
      ...(hasVoiceLoop && typeof voiceLoop === "boolean" ? { voiceLoop } : {}),
      ...(hasVisualMode ? { visualMode } : {}),
      ...(hasProfilePictureUrl ? { profilePictureUrl: trimmedProfilePictureUrl ?? "" } : {}),
      internalAuth: auth.userId ? undefined : internalAuth,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
