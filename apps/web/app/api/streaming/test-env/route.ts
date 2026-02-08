import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function redactSecret(value?: string) {
  if (!value) return "MISSING";
  return `SET (${value.length} chars)`;
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function GET(req: Request) {
  const internalSecret = process.env.INTERNAL_API_SECRET?.trim();
  const requestSecret = req.headers.get("x-internal-auth");

  if (!internalSecret || !requestSecret || !safeCompare(requestSecret, internalSecret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    livekitUrl: process.env.LIVEKIT_URL ? "SET" : "MISSING",
    livekitApiKey: redactSecret(process.env.LIVEKIT_API_KEY),
    livekitApiSecret: redactSecret(process.env.LIVEKIT_API_SECRET),
    streamingEnabled: process.env.STREAMING_ENABLED || "MISSING",
    apiKeyHasNewline: process.env.LIVEKIT_API_KEY?.includes("\n") || false,
    apiSecretHasNewline: process.env.LIVEKIT_API_SECRET?.includes("\n") || false,
  });
}
