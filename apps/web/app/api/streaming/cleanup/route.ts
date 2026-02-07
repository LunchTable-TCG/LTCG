import { stopWebEgress } from "@/lib/streaming/livekit";
import { logError } from "@/lib/streaming/logging";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";
import { EgressClient } from "livekit-server-sdk";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim()?.replace("wss://", "https://") || "";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim() || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim() || "";

/**
 * POST /api/streaming/cleanup
 * Cleans up stale LiveKit egresses and streaming sessions.
 * Requires internal auth.
 */
export async function POST(req: NextRequest) {
  try {
    const internalAuth = req.headers.get("X-Internal-Auth");
    if (internalAuth !== process.env.INTERNAL_API_SECRET?.trim()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = {
      stoppedEgresses: [] as string[],
      endedSessions: [] as string[],
      errors: [] as string[],
    };

    // 1. Stop stale LiveKit egresses
    if (LIVEKIT_URL && LIVEKIT_API_KEY && LIVEKIT_API_SECRET) {
      const egressClient = new EgressClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
      const egresses = await egressClient.listEgress();

      // Get active session egress IDs from Convex
      const activeSessions = await convex.query(api.streaming.sessions.getActiveSessions, {});
      const activeEgressIds = new Set(
        activeSessions.map((s: { egressId?: string }) => s.egressId).filter(Boolean)
      );

      // Stop egresses that are active (status 1) but don't have a matching active session
      for (const egress of egresses) {
        if (egress.status === 1 && !activeEgressIds.has(egress.egressId)) {
          try {
            await egressClient.stopEgress(egress.egressId);
            results.stoppedEgresses.push(egress.egressId);
          } catch (err) {
            results.errors.push(`Failed to stop egress ${egress.egressId}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
    }

    // 2. End stale Convex sessions (initializing/pending/error older than 1 hour)
    const allSessions = await convex.query(api.streaming.sessions.getAllSessions, { limit: 50 });
    const ONE_HOUR = 60 * 60 * 1000;
    const now = Date.now();

    for (const session of allSessions) {
      const isStale =
        (session.status === "initializing" || session.status === "pending" || session.status === "error") &&
        now - session.createdAt > ONE_HOUR;

      if (isStale) {
        try {
          // Stop egress if it exists
          if (session.egressId) {
            try {
              await stopWebEgress(session.egressId);
            } catch {
              // Egress might already be stopped
            }
          }

          await convex.mutation(api.streaming.sessions.endSession, {
            sessionId: session._id as Id<"streamingSessions">,
            reason: "auto-cleanup",
          });
          results.endedSessions.push(session._id);
        } catch (err) {
          results.errors.push(`Failed to end session ${session._id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      summary: `Stopped ${results.stoppedEgresses.length} egresses, ended ${results.endedSessions.length} sessions`,
    });
  } catch (error) {
    logError("Error in streaming cleanup", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
