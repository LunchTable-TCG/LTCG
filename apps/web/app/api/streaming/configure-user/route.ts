import { encryptStreamKey } from "@/lib/streaming/encryption";
import { isStreamingPlatform, requiresCustomRtmpUrl } from "@/lib/streaming/platforms";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import type { ConfigureUserBody } from "@/lib/streaming/types";
import * as generatedApi from "@convex/_generated/api";
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
 * Server-side API route for saving user streaming credentials.
 *
 * Handles stream key encryption on the server so the encryption key
 * is never exposed to the client bundle.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const convex = createConvexClient();
    if (auth.bearerToken) {
      convex.setAuth(auth.bearerToken);
    }

    const body = (await req.json()) as ConfigureUserBody;

    const { platform, streamKey, rtmpUrl } = body;

    if (!platform || !isStreamingPlatform(platform)) {
      return NextResponse.json({ error: "Valid platform is required" }, { status: 400 });
    }

    // Retake is agent-only
    if (platform === "retake") {
      return NextResponse.json(
        { error: "Retake is agent-only. Users cannot configure Retake streaming." },
        { status: 400 }
      );
    }

    if (!streamKey || !streamKey.trim()) {
      return NextResponse.json({ error: "Stream key is required" }, { status: 400 });
    }

    const trimmedRtmpUrl = rtmpUrl?.trim();
    if (trimmedRtmpUrl && !/^rtmps?:\/\//i.test(trimmedRtmpUrl)) {
      return NextResponse.json(
        { error: "RTMP URL must start with rtmp:// or rtmps://" },
        { status: 400 }
      );
    }

    if (requiresCustomRtmpUrl(platform) && !trimmedRtmpUrl) {
      return NextResponse.json(
        { error: `RTMP URL is required for ${platform} platform` },
        { status: 400 }
      );
    }

    // Encrypt stream key server-side
    const streamKeyHash = encryptStreamKey(streamKey.trim());

    // Save to user preferences via mutation (auth set on client)
    await convex.mutation(apiAny.core.userPreferences.saveUserStreamingConfig, {
      platform,
      streamKeyHash,
      rtmpUrl: trimmedRtmpUrl,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
