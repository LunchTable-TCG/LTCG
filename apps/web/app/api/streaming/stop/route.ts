import { stopWebEgress } from "@/lib/streaming/livekit";
import { logError, logInfo, logWarn } from "@/lib/streaming/logging";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import type { StopStreamBody } from "@/lib/streaming/types";
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

function isActiveSessionStatus(status: string): boolean {
  return status === "live" || status === "pending" || status === "initializing";
}

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

    const { sessionId, agentId, reason } = (await req.json()) as StopStreamBody;

    const targetSessionIds: Id<"streamingSessions">[] = [];

    if (sessionId) {
      targetSessionIds.push(sessionId as Id<"streamingSessions">);
    } else if (agentId) {
      if (!internalAuth) {
        return NextResponse.json(
          { error: "INTERNAL_API_SECRET is required to stop by agentId" },
          { status: 500 }
        );
      }

      const sessions = await convex.query(apiAny.streaming.sessions.getAllSessions, {
        limit: 100,
        internalAuth,
      });

      const activeForAgent = (sessions as Array<{ _id: Id<"streamingSessions">; agentId?: Id<"agents">; status: string; createdAt: number }>)
        .filter((s) => s.agentId === (agentId as Id<"agents">))
        .filter((s) => isActiveSessionStatus(s.status))
        .sort((a, b) => b.createdAt - a.createdAt);

      logInfo("Resolved active sessions for agent stop request", {
        agentId,
        activeSessionCount: activeForAgent.length,
      });

      for (const activeSession of activeForAgent) {
        targetSessionIds.push(activeSession._id);
      }
    }

    if (targetSessionIds.length === 0) {
      return NextResponse.json({ error: "Missing sessionId or active session for agentId" }, { status: 400 });
    }

    const stoppedSessionIds: Id<"streamingSessions">[] = [];
    const alreadyEndedSessionIds: Id<"streamingSessions">[] = [];
    const statsBySession: Record<string, unknown> = {};

    for (const targetSessionId of targetSessionIds) {
      // Get session to find egress ID
      const session = await convex.query(apiAny.streaming.sessions.getSession, {
        sessionId: targetSessionId,
        internalAuth,
      });

      if (!session) {
        if (targetSessionIds.length === 1) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        continue;
      }

      if (auth.isAgentApiKey && session.streamType !== "agent") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Internal jobs and agent API key can stop any session they own operationally.
      // User requests can only stop their own stream sessions.
      if (!auth.isInternal && !auth.isAgentApiKey) {
        if (!auth.userId) {
          return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        if (!session.userId || session.userId !== auth.userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      // Check if already ended (idempotent)
      if (session.status === "ended") {
        alreadyEndedSessionIds.push(targetSessionId);
        continue;
      }

      // Stop LiveKit egress if active
      if (session.egressId) {
        try {
          await stopWebEgress(session.egressId);
        } catch (error) {
          // Log but don't fail - egress might already be stopped
          logWarn("Error stopping egress", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // End session with stats
      const stats = await convex.mutation(apiAny.streaming.sessions.endSession, {
        sessionId: targetSessionId,
        reason: reason || "manual",
        internalAuth,
      });

      stoppedSessionIds.push(targetSessionId);
      statsBySession[targetSessionId as string] = stats;
    }

    if (stoppedSessionIds.length === 0 && alreadyEndedSessionIds.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const primarySessionId =
      stoppedSessionIds[0] || alreadyEndedSessionIds[0] || targetSessionIds[0];

    if (stoppedSessionIds.length === 0 && alreadyEndedSessionIds.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Session already ended",
        sessionId: primarySessionId,
        alreadyEnded: true,
        alreadyEndedSessionIds,
      });
    }

    const response: Record<string, unknown> = {
      success: true,
      sessionId: primarySessionId,
      stoppedSessionIds,
      alreadyEndedSessionIds,
    };

    logInfo("Completed stream stop request", {
      targetCount: targetSessionIds.length,
      stoppedCount: stoppedSessionIds.length,
      alreadyEndedCount: alreadyEndedSessionIds.length,
      primarySessionId,
    });

    if (targetSessionIds.length === 1) {
      response.stats = statsBySession[primarySessionId as string];
    } else {
      response.statsBySession = statsBySession;
    }

    return NextResponse.json({
      ...response,
    });
  } catch (error) {
    logError("Error stopping stream", {
      error: error instanceof Error ? error.message : String(error),
    });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
