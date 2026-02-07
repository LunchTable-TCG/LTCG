import { encryptStreamKey } from "@/lib/streaming/encryption";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Server-side API route for configuring agent streaming.
 *
 * Handles stream key encryption on the server so the encryption key
 * is never exposed to the client bundle.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      enabled,
      platform,
      streamKey,
      rtmpUrl,
      autoStart,
    } = body;

    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    // Encrypt stream key server-side if provided
    let streamKeyHash: string | undefined;
    if (streamKey) {
      streamKeyHash = encryptStreamKey(streamKey);
    }

    // Call Convex mutation with encrypted key
    await convex.mutation(api.agents.streaming.configureAgentStreaming, {
      agentId: agentId as Id<"agents">,
      enabled: enabled ?? true,
      platform,
      streamKeyHash,
      rtmpUrl,
      autoStart,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
