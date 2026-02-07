import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check internal auth
  const auth = req.headers.get("Authorization");
  const expectedAuth = `Bearer ${process.env.INTERNAL_API_SECRET}`;

  if (auth !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return environment variable status (not the actual values, for security)
  return NextResponse.json({
    livekitUrl: process.env.LIVEKIT_URL ? "✓ set" : "✗ missing",
    livekitApiKey: process.env.LIVEKIT_API_KEY ? "✓ set" : "✗ missing",
    livekitApiSecret: process.env.LIVEKIT_API_SECRET ? "✓ set" : "✗ missing",
    streamingEnabled: process.env.STREAMING_ENABLED,
    internalApiSecret: process.env.INTERNAL_API_SECRET ? "✓ set" : "✗ missing",
    // Show first 10 chars of API key for debugging
    apiKeyPrefix: process.env.LIVEKIT_API_KEY?.substring(0, 10),
  });
}
