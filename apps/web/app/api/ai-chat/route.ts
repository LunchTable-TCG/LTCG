import { sendToEliza } from "@/lib/eliza/runtime";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

function createConvexClient() {
  const convexUrl = process.env["NEXT_PUBLIC_CONVEX_URL"]?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

/**
 * POST /api/ai-chat
 *
 * Processes an AI chat message:
 * 1. Receives user message + session info
 * 2. Fetches conversation history from Convex
 * 3. Sends to ElizaOS for response
 * 4. Saves agent response to Convex
 * 5. Returns the response
 *
 * Note: Authentication is handled by the Convex mutations.
 * The frontend calls sendUserMessage (which requires auth) before calling this.
 */
export async function POST(req: NextRequest) {
  try {
    const convex = createConvexClient();

    // Parse request body
    const body = await req.json();
    const { message, sessionId, userId: requestedUserId, authToken: bodyAuthToken } = body;

    // Validate required fields
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const authHeader = req.headers.get("Authorization");
    const authToken =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : bodyAuthToken;
    if (!authToken || typeof authToken !== "string") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    convex.setAuth(authToken);

    const currentUser = await convex.query(api.core.users.currentUser, {});
    if (!currentUser?._id) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = currentUser._id as Id<"users">;
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch recent conversation history for context
    let conversationHistory: Array<{ role: "user" | "agent"; message: string }> = [];
    try {
      const messages = await convex.query(api.social.aiChat.getSessionMessages, {
        sessionId,
      });

      // Convert to the format expected by ElizaOS
      conversationHistory = messages
        .slice(-10)
        .map((m: { role: "user" | "agent"; message: string }) => ({
          role: m.role,
          message: m.message,
        }));
    } catch (err) {
      // Continue without history if fetch fails
      console.warn("Failed to fetch conversation history:", err);
    }

    // Send to ElizaOS and get response
    const agentResponse = await sendToEliza(userId, sessionId, message, conversationHistory);

    // Save agent response to Convex
    try {
      await convex.mutation(api.social.aiChat.saveAgentResponse, {
        userId: userId as Id<"users">,
        sessionId,
        message: agentResponse,
      });
    } catch (err) {
      // Log but don't fail - the user still gets the response
      console.error("Failed to save agent response:", err);
    }

    return NextResponse.json({
      response: agentResponse,
      sessionId,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    return NextResponse.json(
      {
        error: "Failed to process message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
