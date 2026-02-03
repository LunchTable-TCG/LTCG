import { sendToEliza } from "@/lib/eliza/runtime";
import type { Id } from "@convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { type NextRequest, NextResponse } from "next/server";

// Use require to avoid TS2589 deep type instantiation issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require("@convex/_generated/api");

// Initialize Convex HTTP client for server-side mutations
const convex = new ConvexHttpClient(process.env["NEXT_PUBLIC_CONVEX_URL"]!);

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
    // Parse request body
    const body = await req.json();
    const { message, sessionId, userId, authToken } = body;

    // Validate required fields
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Set auth token for Convex calls if provided
    if (authToken) {
      convex.setAuth(authToken);
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
