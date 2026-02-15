import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// ── Agent Auth Middleware ─────────────────────────────────────────

async function authenticateAgent(
  ctx: { runQuery: any },
  request: Request,
) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7);
  if (!apiKey.startsWith("ltcg_")) {
    return null;
  }

  // Hash the key and look up
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const apiKeyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const agent = await ctx.runQuery(api.agentAuth.getAgentByKeyHash, { apiKeyHash });
  if (!agent || !agent.isActive) return null;

  return agent;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ── Routes ───────────────────────────────────────────────────────

http.route({
  path: "/api/agent/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.length < 1 || name.length > 50) {
      return errorResponse("Name is required (1-50 characters).");
    }

    // Generate a random API key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const keyBody = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const apiKey = `ltcg_${keyBody}`;
    const apiKeyPrefix = `ltcg_${keyBody.slice(0, 8)}...`;

    // Hash the key for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const apiKeyHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const result = await ctx.runMutation(api.agentAuth.registerAgent, {
      name,
      apiKeyHash,
      apiKeyPrefix,
    });

    return jsonResponse({
      agentId: result.agentId,
      userId: result.userId,
      apiKey, // Shown once — cannot be retrieved again
      apiKeyPrefix,
      message: "Save your API key! It cannot be retrieved again.",
    });
  }),
});

http.route({
  path: "/api/agent/me",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const agent = await authenticateAgent(ctx, request);
    if (!agent) return errorResponse("Unauthorized", 401);

    return jsonResponse({
      id: agent._id,
      name: agent.name,
      userId: agent.userId,
      apiKeyPrefix: agent.apiKeyPrefix,
      isActive: agent.isActive,
      createdAt: agent.createdAt,
    });
  }),
});

http.route({
  path: "/api/agent/game/start",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const agent = await authenticateAgent(ctx, request);
    if (!agent) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { chapterId, stageNumber } = body;

    if (!chapterId || typeof chapterId !== "string") {
      return errorResponse("chapterId is required.");
    }

    try {
      const result = await ctx.runMutation(api.agentAuth.agentStartBattle, {
        agentUserId: agent.userId,
        chapterId,
        stageNumber: typeof stageNumber === "number" ? stageNumber : undefined,
      });
      return jsonResponse(result);
    } catch (e: any) {
      return errorResponse(e.message, 422);
    }
  }),
});

http.route({
  path: "/api/agent/game/action",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const agent = await authenticateAgent(ctx, request);
    if (!agent) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { matchId, command, seat } = body;

    if (!matchId || !command || !seat) {
      return errorResponse("matchId, command, and seat are required.");
    }

    if (seat !== "host" && seat !== "away") {
      return errorResponse("seat must be 'host' or 'away'.");
    }

    try {
      const result = await ctx.runMutation(api.game.submitAction, {
        matchId,
        command: typeof command === "string" ? command : JSON.stringify(command),
        seat,
      });
      return jsonResponse(result);
    } catch (e: any) {
      return errorResponse(e.message, 422);
    }
  }),
});

http.route({
  path: "/api/agent/game/view",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const agent = await authenticateAgent(ctx, request);
    if (!agent) return errorResponse("Unauthorized", 401);

    const url = new URL(request.url);
    const matchId = url.searchParams.get("matchId");
    const seat = url.searchParams.get("seat") ?? "host";

    if (!matchId) {
      return errorResponse("matchId query parameter is required.");
    }

    if (seat !== "host" && seat !== "away") {
      return errorResponse("seat must be 'host' or 'away'.");
    }

    try {
      const view = await ctx.runQuery(api.game.getPlayerView, { matchId, seat });
      return jsonResponse(view);
    } catch (e: any) {
      return errorResponse(e.message, 422);
    }
  }),
});

export default http;
