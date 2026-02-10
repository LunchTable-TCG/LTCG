/**
 * Shared streaming types — single source of truth.
 *
 * Import from here instead of defining inline in routes, hooks, or components.
 * The Convex schema mirrors these shapes via validators; keep them in sync.
 */

import type { StreamingPlatform } from "./platforms";

// Re-export for convenience
export type { StreamingPlatform } from "./platforms";

// ---------------------------------------------------------------------------
// Session status
// ---------------------------------------------------------------------------

export const SESSION_STATUSES = ["initializing", "pending", "live", "ended", "error"] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Stream type
// ---------------------------------------------------------------------------

export type StreamType = "user" | "agent";

// ---------------------------------------------------------------------------
// Destination status (multi-destination health)
// ---------------------------------------------------------------------------

export type DestinationStatus = "active" | "failed" | "removed" | "primary";

// ---------------------------------------------------------------------------
// Overlay config
// ---------------------------------------------------------------------------

export type WebcamPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type WebcamSize = "small" | "medium" | "large";
export type PlayerVisualMode = "webcam" | "profile-picture";
export type OverlayTheme = "dark" | "light";

/** Fields the client sends — all optional (server applies defaults). */
export interface OverlayConfigInput {
  showDecisions?: boolean;
  showAgentInfo?: boolean;
  showEventFeed?: boolean;
  showPlayerCam?: boolean;
  webcamPosition?: WebcamPosition;
  webcamSize?: WebcamSize;
  playerVisualMode?: PlayerVisualMode;
  profilePictureUrl?: string;
  matchOverHoldMs?: number;
  showSceneLabel?: boolean;
  sceneTransitions?: boolean;
  voiceTrackUrl?: string;
  voiceVolume?: number;
  voiceLoop?: boolean;
  theme?: OverlayTheme;
}

/** Shape stored in Convex — required fields are filled by server defaults. */
export interface OverlayConfig {
  showDecisions: boolean;
  showAgentInfo: boolean;
  showEventFeed: boolean;
  showPlayerCam: boolean;
  webcamPosition: WebcamPosition;
  webcamSize: WebcamSize;
  playerVisualMode?: PlayerVisualMode;
  profilePictureUrl?: string;
  matchOverHoldMs: number;
  showSceneLabel: boolean;
  sceneTransitions: boolean;
  voiceTrackUrl?: string;
  voiceVolume?: number;
  voiceLoop?: boolean;
  theme: OverlayTheme;
}

// ---------------------------------------------------------------------------
// API route request bodies
// ---------------------------------------------------------------------------

export interface CreateRoomBody {
  agentId?: string;
  streamType?: StreamType;
  platform?: string;
  streamKey?: string;
  useStoredCredentials?: boolean;
  streamTitle?: string;
  overlayConfig?: OverlayConfigInput;
  customRtmpUrl?: string;
}

export interface StartStreamDestination {
  platform: StreamingPlatform;
  streamKey: string;
  customRtmpUrl?: string;
}

export interface StartStreamBody {
  agentId?: string;
  streamType?: StreamType;
  platform?: StreamingPlatform;
  streamKey?: string;
  streamKeyHash?: string;
  customRtmpUrl?: string;
  retakeAccessToken?: string;
  useStoredCredentials?: boolean;
  streamTitle?: string;
  overlayConfig?: OverlayConfigInput;
  gameId?: string;
  lobbyId?: string;
  baseUrl?: string;
  forceRestart?: boolean;
  destinations?: StartStreamDestination[];
}

export interface StopStreamBody {
  sessionId?: string;
  agentId?: string;
  reason?: string;
}

export interface ConfigureUserBody {
  platform?: string;
  streamKey?: string;
  rtmpUrl?: string;
}

export interface ConfigureAgentBody {
  agentId?: string;
  enabled?: boolean;
  platform?: string;
  streamKey?: string;
  rtmpUrl?: string;
  autoStart?: boolean;
  keepAlive?: boolean;
  voiceTrackUrl?: string;
  voiceVolume?: number;
  voiceLoop?: boolean;
  visualMode?: PlayerVisualMode;
  profilePictureUrl?: string;
}

// ---------------------------------------------------------------------------
// Session shapes (different subsets per context)
// ---------------------------------------------------------------------------

/** Public session info returned by API routes and Convex public queries. */
export interface PublicStreamSession {
  _id: string;
  streamType: StreamType;
  platform: StreamingPlatform;
  streamTitle: string;
  status: SessionStatus;
  overlayUrl?: string;
  currentLobbyId?: string;
  entityName?: string;
  entityAvatar?: string;
  entityUserId?: string;
  viewerCount?: number;
  peakViewerCount?: number;
  startedAt?: number;
  endedAt?: number;
  createdAt: number;
  errorMessage?: string;
  stats?: StreamSessionStats;
}

export interface StreamSessionStats {
  duration: number;
  decisionsLogged: number;
  eventsRecorded: number;
}

// ---------------------------------------------------------------------------
// Agent streaming config (returned by /api/agents/streaming-config)
// ---------------------------------------------------------------------------

export interface AgentStreamingConfig {
  enabled: boolean;
  platform: string | null;
  hasStreamKey: boolean;
  rtmpUrl: string | null;
  autoStart: boolean;
  keepAlive: boolean;
  voiceTrackUrl: string | null;
  voiceVolume: number | null;
  voiceLoop: boolean;
  visualMode: PlayerVisualMode;
  profilePictureUrl: string | null;
}
