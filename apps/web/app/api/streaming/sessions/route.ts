import { typedApi } from "@/lib/convexHelpers";
import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

// Module-scope reference to avoid TS2589
const getActiveSessionsQuery = typedApi.streaming.sessions.getActiveSessions;

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.isInternal && !auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const convex = createConvexClient();
    const sessions = await convex.query(getActiveSessionsQuery, {});

    return NextResponse.json({
      count: sessions.length,
      sessions: sessions.map((s) => ({
        id: s._id,
        status: s.status,
        entityName: s.entityName,
        overlayUrl: s.overlayUrl,
        streamType: s.streamType,
        platform: s.platform,
        createdAt: new Date(s.createdAt).toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
