"use client";

import * as generatedApi from "@convex/_generated/api";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;
import type { StreamingPlatform } from "@/lib/streaming/platforms";
import type {
  OverlayConfigInput,
  PublicStreamSession,
  StartStreamDestination,
  StreamType,
} from "@/lib/streaming/types";
import type { Id } from "@convex/_generated/dataModel";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface SessionDestination {
  _id: string;
  platform: StreamingPlatform;
  rtmpUrl: string;
  status: "active" | "failed" | "removed";
  errorMessage?: string;
  addedAt: number;
  removedAt?: number;
}

interface StartStreamOptions {
  userId?: string;
  agentId?: string;
  streamType: StreamType;
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
  streamTitle?: string;
  destinations?: StartStreamDestination[];
  overlayConfig?: OverlayConfigInput;
}

/** Session shape returned by Convex public queries. */
type StreamSession = PublicStreamSession;

export function useStreaming() {
  const { getAccessToken } = usePrivy();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const startStream = useCallback(
    async (options: StartStreamOptions) => {
      setIsStarting(true);
      setError(null);

      try {
        const response = await fetch("/api/streaming/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify(options),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to start stream");
        }

        setSessionId(data.sessionId);
        return { success: true, sessionId: data.sessionId };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start stream";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsStarting(false);
      }
    },
    [getAuthHeaders]
  );

  const stopStream = useCallback(
    async (stopSessionId?: string) => {
      const targetSessionId = stopSessionId || sessionId;
      if (!targetSessionId) {
        setError("No active session to stop");
        return { success: false, error: "No active session" };
      }

      setIsStopping(true);
      setError(null);

      try {
        const response = await fetch("/api/streaming/stop", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({ sessionId: targetSessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to stop stream");
        }

        setSessionId(null);
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to stop stream";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsStopping(false);
      }
    },
    [getAuthHeaders, sessionId]
  );

  const addDestination = useCallback(
    async (targetSessionId: string, destination: StartStreamDestination) => {
      try {
        const response = await fetch("/api/streaming/update-destinations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            addDestinations: [destination],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to add destination");
        }
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to add destination";
        setError(message);
        return { success: false, error: message };
      }
    },
    [getAuthHeaders]
  );

  const removeDestination = useCallback(
    async (targetSessionId: string, platform: StreamingPlatform) => {
      try {
        const response = await fetch("/api/streaming/update-destinations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await getAuthHeaders()),
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            removeDestinations: [{ platform }],
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to remove destination");
        }
        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to remove destination";
        setError(message);
        return { success: false, error: message };
      }
    },
    [getAuthHeaders]
  );

  return {
    startStream,
    stopStream,
    addDestination,
    removeDestination,
    isStarting,
    isStopping,
    error,
    sessionId,
    setError,
  };
}

export function useStreamStatus(sessionId?: string) {
  const session = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    apiAny.streaming.sessions.getSessionPublic as any,
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    (sessionId ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip") as any
  ) as StreamSession | null | undefined;

  return {
    session: session as StreamSession | null,
    isLive: session?.status === "live",
    isPending: session?.status === "pending" || session?.status === "initializing",
    hasError: session?.status === "error",
    isEnded: session?.status === "ended",
  };
}

export function useUserStreams(userId?: string, limit = 10) {
  const sessions = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    apiAny.streaming.sessions.getUserSessions as any,
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    (userId ? { userId: userId as Id<"users">, limit } : "skip") as any
  ) as StreamSession[] | undefined;

  const activeSession = sessions?.find((s) => s.status === "live" || s.status === "pending");

  return {
    sessions: sessions as StreamSession[] | undefined,
    activeSession: activeSession as StreamSession | undefined,
    hasActiveStream: Boolean(activeSession),
    isLoading: sessions === undefined,
  };
}

export function useAgentStreams(agentId?: string, limit = 10) {
  const sessions = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    apiAny.streaming.sessions.getAgentSessions as any,
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    (agentId ? { agentId: agentId as Id<"agents">, limit } : "skip") as any
  ) as StreamSession[] | undefined;

  const activeSession = sessions?.find((s) => s.status === "live" || s.status === "pending");

  return {
    sessions: sessions as StreamSession[] | undefined,
    activeSession: activeSession as StreamSession | undefined,
    hasActiveStream: Boolean(activeSession),
    isLoading: sessions === undefined,
  };
}

export function useAllActiveStreams() {
  const streams = useQuery(apiAny.streaming.sessions.getActiveStreams, {});

  return {
    streams: streams as StreamSession[] | undefined,
    count: streams?.length || 0,
    isLoading: streams === undefined,
  };
}

export function useSessionDestinations(sessionId?: string) {
  const destinations = useQuery(
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    apiAny.streaming.sessions.getSessionDestinations as any,
    // biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
    (sessionId ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip") as any
  ) as SessionDestination[] | undefined;

  return {
    destinations,
    isLoading: destinations === undefined,
  };
}

export function useSessionDestinationHealth(sessionId?: string) {
  const { destinations, isLoading } = useSessionDestinations(sessionId);

  const byPlatform = new Map<
    StreamingPlatform,
    {
      platform: StreamingPlatform;
      status: "active" | "failed" | "removed";
      endpoint: string;
      retryCount: number;
      attempts: number;
      lastError?: string;
      lastUpdatedAt: number;
    }
  >();

  for (const destination of destinations || []) {
    const previous = byPlatform.get(destination.platform);
    const attempts = (previous?.attempts || 0) + 1;
    const retryCount = (previous?.retryCount || 0) + (destination.status === "failed" ? 1 : 0);
    const lastUpdatedAt = Math.max(
      previous?.lastUpdatedAt || 0,
      destination.removedAt || destination.addedAt
    );

    let status = previous?.status || destination.status;
    if (destination.status === "active") {
      status = "active";
    } else if (status !== "active" && destination.status === "failed") {
      status = "failed";
    } else if (status !== "active" && status !== "failed") {
      status = "removed";
    }

    byPlatform.set(destination.platform, {
      platform: destination.platform,
      status,
      endpoint: destination.rtmpUrl,
      retryCount,
      attempts,
      lastError: destination.errorMessage || previous?.lastError,
      lastUpdatedAt,
    });
  }

  const health = Array.from(byPlatform.values()).sort((a, b) =>
    a.platform.localeCompare(b.platform)
  );

  return {
    destinations: health,
    isLoading,
    hasFailures: health.some((entry) => entry.status === "failed"),
  };
}
