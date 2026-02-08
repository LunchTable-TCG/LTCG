import { buildRtmpUrl, encryptStreamKey } from "@/lib/streaming/encryption";
import { updateStreamUrls } from "@/lib/streaming/livekit";
import { type StreamingPlatform, isStreamingPlatform } from "@/lib/streaming/platforms";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
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

interface Destination {
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
}

interface SessionDestinationRecord {
  platform: StreamingPlatform;
  status?: string;
  rtmpUrl: string;
}

interface ResolvedAddDestination {
  platform: StreamingPlatform;
  streamKey: string;
  rtmpUrl: string;
}

interface ResolvedRemoveDestination {
  platform: StreamingPlatform;
  rtmpUrl: string;
}

/**
 * Add or remove RTMP destinations from a live stream.
 *
 * Uses LiveKit's updateStream() to dynamically modify egress outputs
 * without stopping the stream.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    const convex = createConvexClient();
    if (auth.bearerToken && !auth.isAgentApiKey && !auth.isInternal) {
      convex.setAuth(auth.bearerToken);
    }
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();
    if ((auth.isInternal || auth.isAgentApiKey) && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }
    const body = await req.json();
    const { sessionId, addDestinations, removeDestinations } = body as {
      sessionId: string;
      addDestinations?: Destination[];
      removeDestinations?: Array<{ platform: StreamingPlatform }>;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Get current session to find egressId
    const session = await convex.query(apiAny.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
      internalAuth,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (auth.isAgentApiKey && session.streamType !== "agent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!auth.isInternal && !auth.isAgentApiKey) {
      if (!auth.userId) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      if (!session.userId || session.userId !== auth.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!session.egressId) {
      return NextResponse.json({ error: "No active egress for this session" }, { status: 400 });
    }

    if (session.status !== "live" && session.status !== "pending") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    const additions: ResolvedAddDestination[] = [];
    const removals: ResolvedRemoveDestination[] = [];

    // Build RTMP URLs for additions
    if (addDestinations && addDestinations.length > 0) {
      for (const dest of addDestinations) {
        if (!isStreamingPlatform(dest.platform)) {
          return NextResponse.json(
            { error: `Unsupported destination platform: ${dest.platform}` },
            { status: 400 }
          );
        }
        if (session.streamType === "user" && dest.platform === "retake") {
          return NextResponse.json(
            { error: "Retake is agent-only. User streams cannot add Retake destinations." },
            { status: 400 }
          );
        }
        let rtmpUrl: string;
        try {
          rtmpUrl = buildRtmpUrl(dest.platform, dest.streamKey, dest.customRtmpUrl);
        } catch (validationError) {
          const message =
            validationError instanceof Error ? validationError.message : "Invalid destination";
          return NextResponse.json({ error: message }, { status: 400 });
        }
        additions.push({
          platform: dest.platform,
          streamKey: dest.streamKey,
          rtmpUrl,
        });
      }
    }

    // Build RTMP URLs for removals
    if (removeDestinations && removeDestinations.length > 0) {
      // Get current destinations to find their RTMP URLs
      const currentDestinations = await convex.query(
        apiAny.streaming.sessions.getSessionDestinations,
        {
          sessionId: sessionId as Id<"streamingSessions">,
          internalAuth,
        }
      );

      for (const removal of removeDestinations) {
        if (!isStreamingPlatform(removal.platform)) {
          return NextResponse.json(
            { error: `Unsupported destination platform: ${removal.platform}` },
            { status: 400 }
          );
        }
        const destinations = (currentDestinations ?? []) as SessionDestinationRecord[];
        const dest = destinations.find(
          (d) => d.platform === removal.platform && d.status === "active"
        );
        if (dest) {
          removals.push({
            platform: removal.platform,
            rtmpUrl: dest.rtmpUrl,
          });
        }
      }
    }

    if (additions.length === 0 && removals.length === 0) {
      return NextResponse.json(
        { error: "No destination changes requested or matching active destinations found" },
        { status: 400 }
      );
    }

    try {
      // Update LiveKit egress with new URLs first.
      // We only persist destination state if LiveKit accepts the update.
      await updateStreamUrls({
        egressId: session.egressId,
        addUrls: additions.length > 0 ? additions.map((dest) => dest.rtmpUrl) : undefined,
        removeUrls: removals.length > 0 ? removals.map((dest) => dest.rtmpUrl) : undefined,
      });

      for (const destination of additions) {
        await convex.mutation(apiAny.streaming.sessions.addDestination, {
          sessionId: sessionId as Id<"streamingSessions">,
          platform: destination.platform,
          rtmpUrl: destination.rtmpUrl,
          streamKeyHash: encryptStreamKey(destination.streamKey),
          internalAuth,
        });
      }

      for (const destination of removals) {
        await convex.mutation(apiAny.streaming.sessions.removeDestination, {
          sessionId: sessionId as Id<"streamingSessions">,
          platform: destination.platform,
          internalAuth,
        });
      }
    } catch (updateError) {
      const errorMessage =
        updateError instanceof Error ? updateError.message : "Failed to update stream destinations";

      // Persist failed add attempts so telemetry can surface retry/error history.
      for (const destination of additions) {
        await convex.mutation(apiAny.streaming.sessions.addDestination, {
          sessionId: sessionId as Id<"streamingSessions">,
          platform: destination.platform,
          rtmpUrl: destination.rtmpUrl,
          streamKeyHash: encryptStreamKey(destination.streamKey),
          status: "failed",
          errorMessage,
          internalAuth,
        });
      }

      return NextResponse.json(
        {
          error: errorMessage,
          added: 0,
          removed: 0,
          failedAdds: additions.length,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      added: additions.length,
      removed: removals.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
