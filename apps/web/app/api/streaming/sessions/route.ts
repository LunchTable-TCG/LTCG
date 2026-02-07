import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET() {
  try {
    const sessions = await convex.query(api.streaming.sessions.getActiveSessions, {});

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
