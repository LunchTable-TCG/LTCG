import { resolveStreamingAuth } from "@/lib/streaming/serverAuth";
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

/**
 * GET /api/agents/streaming-config?agentId=<id>
 *
 * Returns agent streaming configuration for plugin consumption.
 * Requires agent API key, internal auth, or user auth (owner).
 * Never returns plaintext stream keys — only `hasStreamKey` boolean.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await resolveStreamingAuth(req);
    if (!auth.isAgentApiKey && !auth.isInternal && !auth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const agentId = req.nextUrl.searchParams.get("agentId");
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId query parameter" }, { status: 400 });
    }
    if (auth.isAgentApiKey) {
      if (!auth.agentId) {
        return NextResponse.json(
          { error: "Agent API key is not bound to a registered agent" },
          { status: 403 }
        );
      }
      if (agentId !== auth.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const convex = createConvexClient();
    const internalAuth = process.env.INTERNAL_API_SECRET?.trim();

    // For non-user auth (agent API key or internal), require INTERNAL_API_SECRET
    if (!auth.userId && !internalAuth) {
      return NextResponse.json({ error: "INTERNAL_API_SECRET is not configured" }, { status: 500 });
    }

    // Set user auth if available
    if (auth.bearerToken && auth.userId) {
      convex.setAuth(auth.bearerToken);
    }

    // Query agent streaming config via public query with internalAuth
    const config = await convex.query(apiAny.agents.streaming.getAgentStreamingConfigByAuth, {
      agentId: agentId as Id<"agents">,
      internalAuth: auth.userId ? undefined : internalAuth,
    });

    if (!config) {
      return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
