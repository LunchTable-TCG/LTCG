import { httpAction } from "../_generated/server";

/**
 * HTTP Action: Start a streaming session
 * Called by agents to initiate streaming to RTMP destinations (Retake.tv, etc.)
 */
export const startStreaming = httpAction(async (_ctx, request) => {
  try {
    const body = await request.json();

    // Validate auth
    const authHeader = request.headers.get("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");
    const expectedKey = process.env["LTCG_API_KEY"];

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      agentId,
      streamType = "agent",
      platform = "custom",
      customRtmpUrl,
      streamKey,
      streamTitle,
    } = body;

    // Validate required fields
    if (!agentId) {
      return new Response(JSON.stringify({ error: "Missing agentId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!streamKey) {
      return new Response(JSON.stringify({ error: "Missing streamKey" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // For now, use the existing Next.js streaming API to handle LiveKit egress
    // TODO: Migrate egress creation to use LiveKit REST API directly
    const nextJsUrl = process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:3333";

    const response = await fetch(`${nextJsUrl}/api/streaming/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agentId,
        streamType,
        platform,
        customRtmpUrl,
        streamKey,
        streamTitle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error starting stream:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
