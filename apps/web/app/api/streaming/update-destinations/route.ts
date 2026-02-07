import { buildRtmpUrl, encryptStreamKey } from "@/lib/streaming/encryption";
import { updateStreamUrls } from "@/lib/streaming/livekit";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface Destination {
  platform: "twitch" | "youtube" | "custom" | "retake" | "x" | "pumpfun";
  streamKey: string;
  customRtmpUrl?: string;
}

/**
 * Add or remove RTMP destinations from a live stream.
 *
 * Uses LiveKit's updateStream() to dynamically modify egress outputs
 * without stopping the stream.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      addDestinations,
      removeDestinations,
    } = body as {
      sessionId: string;
      addDestinations?: Destination[];
      removeDestinations?: Array<{ platform: string }>;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Get current session to find egressId
    const session = await convex.query(api.streaming.sessions.getSession, {
      sessionId: sessionId as Id<"streamingSessions">,
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.egressId) {
      return NextResponse.json({ error: "No active egress for this session" }, { status: 400 });
    }

    if (session.status !== "live" && session.status !== "pending") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    const addUrls: string[] = [];
    const removeUrls: string[] = [];

    // Build RTMP URLs for additions
    if (addDestinations && addDestinations.length > 0) {
      for (const dest of addDestinations) {
        const rtmpUrl = buildRtmpUrl(dest.platform, dest.streamKey, dest.customRtmpUrl);
        addUrls.push(rtmpUrl);

        // Track destination in Convex
        await convex.mutation(api.streaming.sessions.addDestination, {
          sessionId: sessionId as Id<"streamingSessions">,
          platform: dest.platform,
          rtmpUrl,
          streamKeyHash: encryptStreamKey(dest.streamKey),
        });
      }
    }

    // Build RTMP URLs for removals
    if (removeDestinations && removeDestinations.length > 0) {
      // Get current destinations to find their RTMP URLs
      const currentDestinations = await convex.query(api.streaming.sessions.getSessionDestinations, {
        sessionId: sessionId as Id<"streamingSessions">,
      });

      for (const removal of removeDestinations) {
        const dest = currentDestinations?.find(
          (d: any) => d.platform === removal.platform && d.status === "active"
        );
        if (dest) {
          removeUrls.push(dest.rtmpUrl);

          // Mark as removed in Convex
          await convex.mutation(api.streaming.sessions.removeDestination, {
            sessionId: sessionId as Id<"streamingSessions">,
            platform: removal.platform as any,
          });
        }
      }
    }

    // Update LiveKit egress with new URLs
    if (addUrls.length > 0 || removeUrls.length > 0) {
      await updateStreamUrls({
        egressId: session.egressId,
        addUrls: addUrls.length > 0 ? addUrls : undefined,
        removeUrls: removeUrls.length > 0 ? removeUrls : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      added: addUrls.length,
      removed: removeUrls.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
