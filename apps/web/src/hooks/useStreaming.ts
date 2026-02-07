"use client";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useCallback, useState } from "react";

type StreamingPlatform = "twitch" | "youtube" | "custom" | "retake" | "x" | "pumpfun";

interface StreamDestination {
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
}

interface StartStreamOptions {
  userId?: string;
  agentId?: string;
  streamType: "user" | "agent";
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
  streamTitle?: string;
  destinations?: StreamDestination[];
  overlayConfig?: {
    showDecisions?: boolean;
    showAgentInfo?: boolean;
    showEventFeed?: boolean;
    showPlayerCam?: boolean;
    theme?: "dark" | "light";
  };
}

interface StreamSession {
  _id: string;
  status: "initializing" | "pending" | "live" | "ended" | "error";
  platform: string;
  streamTitle: string;
  overlayUrl?: string;
  errorMessage?: string;
  viewerCount?: number;
  peakViewerCount?: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  stats?: {
    duration: number;
    decisionsLogged: number;
    eventsRecorded: number;
  };
}

export function useStreaming() {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startStream = useCallback(async (options: StartStreamOptions) => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/streaming/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
  }, []);

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
          headers: { "Content-Type": "application/json" },
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
    [sessionId]
  );

  const addDestination = useCallback(
    async (targetSessionId: string, destination: StreamDestination) => {
      try {
        const response = await fetch("/api/streaming/update-destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    []
  );

  const removeDestination = useCallback(
    async (targetSessionId: string, platform: StreamingPlatform) => {
      try {
        const response = await fetch("/api/streaming/update-destinations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    []
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
    api.streaming.sessions.getSession,
    sessionId ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip"
  );

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
    api.streaming.sessions.getUserSessions,
    userId ? { userId: userId as Id<"users">, limit } : "skip"
  );

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
    api.streaming.sessions.getAgentSessions,
    agentId ? { agentId: agentId as Id<"agents">, limit } : "skip"
  );

  const activeSession = sessions?.find((s) => s.status === "live" || s.status === "pending");

  return {
    sessions: sessions as StreamSession[] | undefined,
    activeSession: activeSession as StreamSession | undefined,
    hasActiveStream: Boolean(activeSession),
    isLoading: sessions === undefined,
  };
}

export function useAllActiveStreams() {
  const streams = useQuery(api.streaming.sessions.getActiveStreams);

  return {
    streams: streams as StreamSession[] | undefined,
    count: streams?.length || 0,
    isLoading: streams === undefined,
  };
}

export function useSessionDestinations(sessionId?: string) {
  const destinations = useQuery(
    api.streaming.sessions.getSessionDestinations,
    sessionId ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip"
  );

  return {
    destinations,
    isLoading: destinations === undefined,
  };
}
