import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

/**
 * Validate overlay access code
 * POST /api/streaming/validate-overlay
 */
export async function POST(req: NextRequest) {
  try {
    const convex = createConvexClient();
    const body = await req.json();
    const { sessionId, code } = body;

    if (!sessionId || !code) {
      return NextResponse.json({ error: "Missing sessionId or code" }, { status: 400 });
    }

    // Validate the access code
    const result = await convex.mutation(api.streaming.sessions.validateOverlayAccess, {
      sessionId: sessionId as Id<"streamingSessions">,
      code,
    });

    return NextResponse.json({
      success: true,
      valid: result.valid,
      sessionId: result.sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid access code";
    return NextResponse.json({ error: message, valid: false }, { status: 401 });
  }
}
