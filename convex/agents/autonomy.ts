import { v } from "convex/values";
import * as generatedApi from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { presence } from "../presence";

// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const internalAny = (generatedApi as any).internal;

type AgentSnapshot = {
  agentId: Id<"agents">;
  userId: Id<"users">;
  name: string;
  streamingEnabled: boolean;
  streamingAutoStart: boolean;
  streamingPlatform?: string;
  activeSessionCount: number;
  latestSessionCreatedAt?: number;
  activeLobby?: {
    lobbyId: Id<"gameLobbies">;
    status: string;
    gameId?: string;
    currentTurnPlayerId?: Id<"users">;
    lastMoveAt?: number;
    turnStartedAt?: number;
    startedAt?: number;
    createdAt: number;
  };
  latestDecisionAt?: number;
};

function normalizeControlBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/ltcg/control")) {
    return trimmed;
  }
  return `${trimmed}/ltcg/control`;
}

function computeLatestActivityAt(snapshot: AgentSnapshot): number {
  const timestamps = [
    snapshot.latestDecisionAt ?? 0,
    snapshot.latestSessionCreatedAt ?? 0,
    snapshot.activeLobby?.lastMoveAt ?? 0,
    snapshot.activeLobby?.turnStartedAt ?? 0,
    snapshot.activeLobby?.startedAt ?? 0,
    snapshot.activeLobby?.createdAt ?? 0,
  ];
  return Math.max(...timestamps);
}

async function controlRequest(params: {
  baseUrl: string;
  apiKey: string;
  path: "/status" | "/story-mode" | "/start-stream" | "/surrender";
  body?: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; data: unknown }> {
  const response = await fetch(`${params.baseUrl}${params.path}`, {
    method: params.body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    ...(params.body ? { body: JSON.stringify(params.body) } : {}),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

/**
 * Internal query: gather current autonomy/watchdog state for active agents.
 */
export const getAutonomySnapshots = internalQuery({
  args: {
    agentId: v.optional(v.id("agents")),
  },
  returns: v.array(
    v.object({
      agentId: v.id("agents"),
      userId: v.id("users"),
      name: v.string(),
      streamingEnabled: v.boolean(),
      streamingAutoStart: v.boolean(),
      streamingPlatform: v.optional(v.string()),
      activeSessionCount: v.number(),
      latestSessionCreatedAt: v.optional(v.number()),
      activeLobby: v.optional(
        v.object({
          lobbyId: v.id("gameLobbies"),
          status: v.string(),
          gameId: v.optional(v.string()),
          currentTurnPlayerId: v.optional(v.id("users")),
          lastMoveAt: v.optional(v.number()),
          turnStartedAt: v.optional(v.number()),
          startedAt: v.optional(v.number()),
          createdAt: v.number(),
        })
      ),
      latestDecisionAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args): Promise<AgentSnapshot[]> => {
    const candidateAgents = args.agentId
      ? [await ctx.db.get(args.agentId)].filter((value): value is NonNullable<typeof value> =>
          Boolean(value)
        )
      : await ctx.db.query("agents").collect();

    const activeAgents = candidateAgents.filter((agent) => agent.isActive);
    const snapshots: AgentSnapshot[] = [];

    for (const agent of activeAgents) {
      const [activeSessions, hostLobbies, opponentLobbies, latestDecision] = await Promise.all([
        ctx.db
          .query("streamingSessions")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .filter((q) =>
            q.or(
              q.eq(q.field("status"), "live"),
              q.eq(q.field("status"), "pending"),
              q.eq(q.field("status"), "initializing")
            )
          )
          .collect(),
        ctx.db
          .query("gameLobbies")
          .withIndex("by_host", (q) => q.eq("hostId", agent.userId))
          .filter((q) =>
            q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "waiting"))
          )
          .collect(),
        ctx.db
          .query("gameLobbies")
          .withIndex("by_opponent", (q) => q.eq("opponentId", agent.userId))
          .filter((q) =>
            q.or(q.eq(q.field("status"), "active"), q.eq(q.field("status"), "waiting"))
          )
          .collect(),
        ctx.db
          .query("agentDecisions")
          .withIndex("by_agent", (q) => q.eq("agentId", agent._id))
          .order("desc")
          .first(),
      ]);

      const lobbyCandidates = [...hostLobbies, ...opponentLobbies];
      const activeLobby =
        lobbyCandidates.find((lobby) => lobby.status === "active") ??
        lobbyCandidates.sort((a, b) => b.createdAt - a.createdAt)[0] ??
        null;

      const latestSessionCreatedAt =
        activeSessions.length > 0
          ? Math.max(...activeSessions.map((session) => session.createdAt))
          : undefined;

      snapshots.push({
        agentId: agent._id,
        userId: agent.userId,
        name: agent.name,
        streamingEnabled: Boolean(agent.streamingEnabled),
        streamingAutoStart: agent.streamingAutoStart ?? true,
        streamingPlatform: agent.streamingPlatform ?? undefined,
        activeSessionCount: activeSessions.length,
        latestSessionCreatedAt,
        activeLobby: activeLobby
          ? {
              lobbyId: activeLobby._id,
              status: activeLobby.status,
              ...(activeLobby.gameId ? { gameId: activeLobby.gameId } : {}),
              ...(activeLobby.currentTurnPlayerId
                ? { currentTurnPlayerId: activeLobby.currentTurnPlayerId }
                : {}),
              ...(activeLobby.lastMoveAt ? { lastMoveAt: activeLobby.lastMoveAt } : {}),
              ...(activeLobby.turnStartedAt ? { turnStartedAt: activeLobby.turnStartedAt } : {}),
              ...(activeLobby.startedAt ? { startedAt: activeLobby.startedAt } : {}),
              createdAt: activeLobby.createdAt,
            }
          : undefined,
        latestDecisionAt: latestDecision?.createdAt ?? undefined,
      });
    }

    return snapshots;
  },
});

/**
 * Internal mutation: heartbeat agent presence from the watchdog loop.
 */
export const heartbeatAgentPresence = internalMutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(v.literal("online"), v.literal("in_game"), v.literal("idle")),
    lobbyId: v.optional(v.id("gameLobbies")),
    activeSessionCount: v.optional(v.number()),
  },
  returns: v.object({
    ok: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return { ok: false, reason: "agent_not_found" };
    }

    const sessionId = `watchdog:${args.agentId}`;
    const roomId = `agent:${args.agentId}`;
    const syntheticUserId = `agent:${args.agentId}`;
    const intervalMs = 60_000;

    await (
      presence as unknown as { heartbeat: (...args: unknown[]) => Promise<unknown> }
    ).heartbeat(ctx, roomId, syntheticUserId, sessionId, intervalMs, {
      username: agent.name,
      status: args.status,
      lastActiveAt: Date.now(),
      ...(args.lobbyId ? { lobbyId: args.lobbyId } : {}),
      ...(args.activeSessionCount !== undefined
        ? { activeSessionCount: args.activeSessionCount }
        : {}),
      source: "convex_watchdog",
    });

    return { ok: true };
  },
});

/**
 * Internal mutation: keep a single active stream session per agent.
 * Ends duplicate pending/live/initializing sessions in Convex while preserving
 * the best candidate to stay live.
 */
export const dedupeAgentStreamingSessions = internalMutation({
  args: {
    agentId: v.id("agents"),
    activeLobbyId: v.optional(v.id("gameLobbies")),
  },
  returns: v.object({
    keptSessionId: v.optional(v.id("streamingSessions")),
    endedSessionIds: v.array(v.id("streamingSessions")),
  }),
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("streamingSessions")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "live"),
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "initializing")
        )
      )
      .collect();

    if (sessions.length <= 1) {
      return {
        keptSessionId: sessions[0]?._id,
        endedSessionIds: [],
      };
    }

    const statusPriority = (status: string): number => {
      if (status === "live") return 3;
      if (status === "pending") return 2;
      if (status === "initializing") return 1;
      return 0;
    };

    const sorted = [...sessions].sort((a, b) => {
      const scoreA =
        statusPriority(a.status) * 100 +
        (a.egressId ? 20 : 0) +
        (args.activeLobbyId && a.currentLobbyId === args.activeLobbyId ? 50 : 0);
      const scoreB =
        statusPriority(b.status) * 100 +
        (b.egressId ? 20 : 0) +
        (args.activeLobbyId && b.currentLobbyId === args.activeLobbyId ? 50 : 0);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return b.createdAt - a.createdAt;
    });

    const keep = sorted[0];
    const duplicates = sorted.slice(1);
    const now = Date.now();
    const endedSessionIds: Id<"streamingSessions">[] = [];

    for (const session of duplicates) {
      await ctx.db.patch(session._id, {
        status: "ended",
        endedAt: now,
        endReason: "autonomy_dedupe_session",
        currentLobbyId: undefined,
      });
      endedSessionIds.push(session._id);
    }

    return {
      keptSessionId: keep?._id,
      endedSessionIds,
    };
  },
});

/**
 * Internal action: watchdog loop to keep autonomous agents progressing.
 *
 * Behavior:
 * - Publishes presence heartbeat per active agent.
 * - Cleans duplicate live/pending/initializing stream sessions.
 * - Restarts story-mode when an agent is idle for too long.
 * - Attempts stream start when a game is active but no stream session exists.
 * - Optionally surrenders if agent turn is stuck beyond threshold.
 */
export const tick = internalAction({
  args: {
    agentId: v.optional(v.id("agents")),
  },
  returns: v.object({
    processed: v.number(),
    actions: v.array(
      v.object({
        agentId: v.id("agents"),
        action: v.string(),
        ok: v.boolean(),
        status: v.optional(v.number()),
        detail: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const snapshots = (await ctx.runQuery(internalAny.agents.autonomy.getAutonomySnapshots, {
      agentId: args.agentId,
    })) as AgentSnapshot[];

    const actions: Array<{
      agentId: Id<"agents">;
      action: string;
      ok: boolean;
      status?: number;
      detail?: string;
    }> = [];

    const controlBaseRaw =
      process.env["LTCG_AGENT_CONTROL_BASE_URL"]?.trim() ||
      process.env["LTCG_AGENT_CONTROL_URL"]?.trim();
    const controlApiKey =
      process.env["LTCG_CONTROL_API_KEY"]?.trim() || process.env["LTCG_API_KEY"]?.trim();
    const appBaseUrlRaw =
      process.env["LTCG_APP_URL"]?.trim() ||
      process.env["NEXT_PUBLIC_APP_URL"]?.trim() ||
      "https://www.lunchtable.cards";
    const appBaseUrl = appBaseUrlRaw.includes(".convex.site")
      ? "https://www.lunchtable.cards"
      : appBaseUrlRaw.replace(/\/+$/, "");
    const internalAuth = process.env["INTERNAL_API_SECRET"]?.trim();

    const controlBaseUrl = controlBaseRaw ? normalizeControlBaseUrl(controlBaseRaw) : null;

    const idleRestartMs = Math.max(
      60_000,
      Number.parseInt(process.env["LTCG_AGENT_AUTONOMY_IDLE_RESTART_MS"] || "120000", 10) || 120000
    );
    const stuckTurnMs = Math.max(
      60_000,
      Number.parseInt(process.env["LTCG_AGENT_AUTONOMY_STUCK_TURN_MS"] || "240000", 10) || 240000
    );
    const allowAutoSurrender = process.env["LTCG_AGENT_AUTONOMY_ALLOW_SURRENDER"] === "true";

    for (const snapshot of snapshots) {
      const now = Date.now();
      const latestActivityAt = computeLatestActivityAt(snapshot);
      const idleForMs = latestActivityAt > 0 ? now - latestActivityAt : Number.POSITIVE_INFINITY;
      const turnAnchor = Math.max(
        snapshot.activeLobby?.lastMoveAt ?? 0,
        snapshot.activeLobby?.turnStartedAt ?? 0,
        snapshot.activeLobby?.startedAt ?? 0,
        snapshot.activeLobby?.createdAt ?? 0
      );
      const stalledTurnForMs =
        snapshot.activeLobby?.status === "active" &&
        snapshot.activeLobby.currentTurnPlayerId === snapshot.userId &&
        turnAnchor > 0
          ? now - turnAnchor
          : 0;

      const presenceStatus =
        snapshot.activeLobby?.status === "active"
          ? "in_game"
          : snapshot.activeLobby
            ? "online"
            : "idle";

      await ctx.runMutation(internalAny.agents.autonomy.heartbeatAgentPresence, {
        agentId: snapshot.agentId,
        status: presenceStatus,
        ...(snapshot.activeLobby ? { lobbyId: snapshot.activeLobby.lobbyId } : {}),
        activeSessionCount: snapshot.activeSessionCount,
      });

      if (snapshot.activeSessionCount > 1) {
        const dedupeResult = await ctx.runMutation(
          internalAny.agents.autonomy.dedupeAgentStreamingSessions,
          {
            agentId: snapshot.agentId,
            ...(snapshot.activeLobby ? { activeLobbyId: snapshot.activeLobby.lobbyId } : {}),
          }
        );

        actions.push({
          agentId: snapshot.agentId,
          action: "cleanup_duplicate_stream_sessions",
          ok: true,
          detail: `ended ${dedupeResult.endedSessionIds.length} duplicate session(s)`,
        });

        if (internalAuth && dedupeResult.endedSessionIds.length > 0) {
          const cleanupResponse = await fetch(`${appBaseUrl}/api/streaming/cleanup`, {
            method: "POST",
            headers: {
              "X-Internal-Auth": internalAuth,
            },
          });
          actions.push({
            agentId: snapshot.agentId,
            action: "run_stream_cleanup",
            ok: cleanupResponse.ok,
            status: cleanupResponse.status,
          });
        }
      }

      if (!controlBaseUrl || !controlApiKey) {
        actions.push({
          agentId: snapshot.agentId,
          action: "control_api_unavailable",
          ok: false,
          detail: "LTCG_AGENT_CONTROL_BASE_URL/LTCG_AGENT_CONTROL_URL or control API key missing",
        });
        continue;
      }

      if (!snapshot.activeLobby && idleForMs >= idleRestartMs) {
        const startResult = await controlRequest({
          baseUrl: controlBaseUrl,
          apiKey: controlApiKey,
          path: "/story-mode",
          body: {},
        });
        actions.push({
          agentId: snapshot.agentId,
          action: "start_story_mode",
          ok: startResult.ok,
          status: startResult.status,
        });
        continue;
      }

      if (
        snapshot.activeLobby?.status === "active" &&
        snapshot.streamingEnabled &&
        snapshot.streamingAutoStart &&
        snapshot.activeSessionCount === 0
      ) {
        const streamResult = await controlRequest({
          baseUrl: controlBaseUrl,
          apiKey: controlApiKey,
          path: "/start-stream",
          body: {
            lobbyId: snapshot.activeLobby.lobbyId,
            ...(snapshot.streamingPlatform ? { platform: snapshot.streamingPlatform } : {}),
          },
        });
        actions.push({
          agentId: snapshot.agentId,
          action: "start_stream_for_active_game",
          ok: streamResult.ok,
          status: streamResult.status,
        });
      }

      if (stalledTurnForMs >= stuckTurnMs) {
        const statusResult = await controlRequest({
          baseUrl: controlBaseUrl,
          apiKey: controlApiKey,
          path: "/status",
        });
        const statusBody =
          statusResult.data && typeof statusResult.data === "object"
            ? (statusResult.data as Record<string, unknown>)
            : {};
        const isInGame = statusBody["isInGame"] === true;

        actions.push({
          agentId: snapshot.agentId,
          action: "probe_stalled_game",
          ok: statusResult.ok,
          status: statusResult.status,
        });

        if (!isInGame) {
          const restartResult = await controlRequest({
            baseUrl: controlBaseUrl,
            apiKey: controlApiKey,
            path: "/story-mode",
            body: {},
          });
          actions.push({
            agentId: snapshot.agentId,
            action: "restart_story_mode_after_stall",
            ok: restartResult.ok,
            status: restartResult.status,
          });
        } else if (allowAutoSurrender) {
          const surrenderResult = await controlRequest({
            baseUrl: controlBaseUrl,
            apiKey: controlApiKey,
            path: "/surrender",
            body: {},
          });
          actions.push({
            agentId: snapshot.agentId,
            action: "surrender_stalled_game",
            ok: surrenderResult.ok,
            status: surrenderResult.status,
          });
        }
      }
    }

    return {
      processed: snapshots.length,
      actions,
    };
  },
});
