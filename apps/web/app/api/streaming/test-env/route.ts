import { NextResponse } from "next/server";

export async function GET() {
  // No auth required for debugging

  // Return environment variable status and values for debugging
  return NextResponse.json({
    livekitUrl: process.env.LIVEKIT_URL || "MISSING",
    livekitApiKey: process.env.LIVEKIT_API_KEY || "MISSING",
    livekitApiSecret: process.env.LIVEKIT_API_SECRET ? `${process.env.LIVEKIT_API_SECRET.substring(0, 10)}... (${process.env.LIVEKIT_API_SECRET.length} chars)` : "MISSING",
    streamingEnabled: process.env.STREAMING_ENABLED || "MISSING",
    // Check for any whitespace issues
    apiKeyHasNewline: process.env.LIVEKIT_API_KEY?.includes("\n") || false,
    apiSecretHasNewline: process.env.LIVEKIT_API_SECRET?.includes("\n") || false,
  });
}
