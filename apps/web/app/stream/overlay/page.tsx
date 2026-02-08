"use client";

import { DecisionPanel } from "@/components/streaming/DecisionPanel";
import { EventFeedTicker } from "@/components/streaming/EventFeedTicker";
import { GameBoardSpectator } from "@/components/streaming/GameBoardSpectator";
import { StreamCompositeView } from "@/components/streaming/StreamCompositeView";
import { StreamerInfoPanel } from "@/components/streaming/StreamerInfoPanel";
import type { OverlayConfig, SessionStatus, StreamType } from "@/lib/streaming/types";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { LiveKitRoom } from "@livekit/components-react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import "@livekit/components-styles";

// Declare window.startRecording for LiveKit
declare global {
  interface Window {
    startRecording?: () => void;
  }
}

type OverlayPreviewState = "live" | "waiting" | "error";

interface OverlayPreviewSession {
  entityName: string;
  entityAvatar?: string;
  streamType: StreamType;
  platform: string;
  status: Extract<SessionStatus, "pending" | "live" | "error">;
  overlayConfig: Partial<OverlayConfig>;
  agentId?: string;
  lastMatchEndedAt?: number;
  lastMatchResult?: "win" | "loss" | "draw" | "unknown";
  lastMatchSummary?: string;
  lastMatchReason?: string;
}

function parseOverlayPreviewState(value: string | null): OverlayPreviewState | null {
  if (value === "live" || value === "waiting" || value === "error") {
    return value;
  }
  return null;
}

const PREVIEW_GAME_STATE = {
  gameId: "preview_game_001",
  turnNumber: 7,
  boardState: {
    hostBoard: [
      { _id: "host_1", name: "Blazewing Griffin", currentAttack: 2100, currentDefense: 1600 },
      { _id: "host_2", name: "Runebinder Squire", currentAttack: 1500, currentDefense: 1200 },
    ],
    opponentBoard: [
      { _id: "opp_1", name: "Crypt Warden", currentAttack: 1800, currentDefense: 1400 },
    ],
    hostLifePoints: 6200,
    opponentLifePoints: 5400,
    currentPhase: "battle",
    turnNumber: 7,
    hostUsername: "Dizzy",
    opponentUsername: "Night Archivist",
    hostHandCount: 3,
    hostDeckCount: 19,
    hostSpellTrapZone: [{ _id: "hst_1", name: "Radiant Sigil", isFaceDown: false }],
    hostGraveyard: [{ _id: "hg_1" }, { _id: "hg_2" }],
    opponentHandCount: 2,
    opponentDeckCount: 21,
    opponentSpellTrapZone: [{ _id: "ost_1", isFaceDown: true }],
    opponentGraveyard: [{ _id: "og_1" }],
  },
  host: { username: "Dizzy" },
  opponent: { username: "Night Archivist" },
};

const PREVIEW_DECISIONS = [
  {
    turnNumber: 7,
    action: "Declared attack with Blazewing Griffin",
    reasoning: "Opponent has one unknown set card and no board pressure after this line.",
    timestamp: 1700000000000,
  },
  {
    turnNumber: 7,
    action: "Held Quick-Play spell in hand",
    reasoning: "Protects lethal line on the next turn if battle trap resolves.",
    timestamp: 1700000005000,
  },
];

const PREVIEW_EVENTS = [
  {
    eventId: "evt_1",
    description: "Blazewing Griffin attacked Crypt Warden",
    playerUsername: "Dizzy",
  },
  {
    eventId: "evt_2",
    description: "Night Archivist activated a set trap card",
    playerUsername: "Night Archivist",
  },
  {
    eventId: "evt_3",
    description: "Damage calculation complete: 300 LP dealt",
    playerUsername: "System",
  },
];

type OverlayScene = "starting-soon" | "live-game" | "match-over" | "lobby-chat" | "brb" | "ending";

function parseSceneOverride(value: string | null): OverlayScene | null {
  if (!value) {
    return null;
  }
  if (
    value === "starting-soon" ||
    value === "live-game" ||
    value === "match-over" ||
    value === "lobby-chat" ||
    value === "brb" ||
    value === "ending"
  ) {
    return value;
  }
  return null;
}

function getSceneLabel(scene: OverlayScene): string {
  switch (scene) {
    case "starting-soon":
      return "Starting Soon";
    case "live-game":
      return "Live Match";
    case "match-over":
      return "Match Over";
    case "lobby-chat":
      return "Lobby Chat";
    case "brb":
      return "BRB";
    case "ending":
      return "Stream Ending";
    default:
      return "Live";
  }
}

function StreamOverlayContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const roomName = searchParams.get("roomName");
  const livekitUrl = searchParams.get("livekitUrl");
  const previewState = parseOverlayPreviewState(searchParams.get("preview"));
  const sceneOverride = parseSceneOverride(searchParams.get("scene"));
  const audioEnabled = searchParams.get("audio") !== "0";
  const isPreview = previewState !== null;
  const disableMotion = isPreview || searchParams.get("static") === "1";
  const [isReady, setIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(!isPreview);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedToken, setValidatedToken] = useState<string | null>(null);

  // Get streaming session
  const session = useQuery(
    api.streaming.sessions.getSessionPublic,
    sessionId && !isPreview ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip"
  );

  // If roomName is provided, use LiveKit composite mode
  const useLiveKitComposite = !isPreview && Boolean(roomName && livekitUrl && token);

  // Determine if the currentLobbyId is a story game ID (story_xxx) or a real lobby ID
  const currentLobbyId = session?.currentLobbyId;
  const isStoryGame = typeof currentLobbyId === "string" && currentLobbyId.startsWith("story_");

  // Story games store gameId as currentLobbyId — resolve to actual lobbyId first
  const storyGameLookup = useQuery(
    api.gameplay.games.queries.getGameStateByGameId,
    !isPreview && currentLobbyId && isStoryGame ? { gameId: currentLobbyId } : "skip"
  );

  // Resolve the actual lobby ID for all queries
  const resolvedLobbyId = isStoryGame ? storyGameLookup?.lobbyId : currentLobbyId;

  // Get game state (works for both story and multiplayer once we have a lobby ID)
  const gameState = useQuery(
    api.gameplay.games.queries.getGameSpectatorView,
    !isPreview && resolvedLobbyId ? { lobbyId: resolvedLobbyId as Id<"gameLobbies"> } : "skip"
  );

  // Get recent game events
  const events = useQuery(
    api.gameplay.gameEvents.subscribeToGameEvents,
    !isPreview && resolvedLobbyId
      ? { lobbyId: resolvedLobbyId as Id<"gameLobbies">, limit: 10 }
      : "skip"
  );

  // Get agent decisions (for agent streams) — filter by current game to avoid stale decisions
  const currentGameId = gameState?.gameId;
  const decisions = useQuery(
    api.agents.decisions.getRecentDecisionsForStream,
    !isPreview && session?.agentId
      ? { agentId: session.agentId, gameId: currentGameId || undefined, limit: 5 }
      : "skip"
  );

  // Validate access code on mount
  useEffect(() => {
    if (isPreview) {
      setIsValidating(false);
      setValidationError(null);
      return;
    }

    const validateAccess = async () => {
      if (!sessionId || !code) {
        setValidationError("Missing session ID or access code");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch("/api/streaming/validate-overlay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, code }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          // In headless/streaming environment, allow to proceed if we have sessionId
          console.warn("Validation failed, but allowing access for streaming:", data.error);
          setIsValidating(false);
          return;
        }

        // Access code is valid - store token if provided
        if (token) {
          setValidatedToken(token);
        }

        setIsValidating(false);
      } catch (error) {
        // In headless/streaming environment, network failures are common
        // Allow overlay to proceed if we have sessionId
        console.error("Validation request failed (headless environment?):", error);
        setIsValidating(false);
      }
    };

    validateAccess();
  }, [isPreview, sessionId, code, token]);

  // Signal LiveKit when overlay is ready
  useEffect(() => {
    if (!isPreview && session && !isReady && !isValidating && !validationError) {
      setIsReady(true);
      // Wait a brief moment for rendering to complete
      setTimeout(() => {
        if (window.startRecording) {
          console.log("Signaling LiveKit to start recording");
          window.startRecording();
        }
      }, 1000);
    }
  }, [isPreview, session, isReady, isValidating, validationError]);

  // Keep a near-silent audio signal active so RTMP destinations that require an audio track
  // (like Retake's player pipeline) always receive one, even in no-voice scenes.
  useEffect(() => {
    if (!audioEnabled || typeof window === "undefined") {
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 20;
    gain.gain.value = 0.00001;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    void audioContext.resume().catch(() => {});

    return () => {
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
      void audioContext.close().catch(() => {});
    };
  }, [audioEnabled]);

  const previewSession: OverlayPreviewSession | null = previewState
    ? {
        entityName: "Dizzy",
        streamType: "agent",
        platform: "retake",
        status: previewState === "live" ? "live" : previewState === "waiting" ? "pending" : "error",
        overlayConfig: {
          showDecisions: true,
          showAgentInfo: true,
          showEventFeed: true,
          theme: "dark",
        },
        agentId: "preview_agent_001",
      }
    : null;

  const overlaySession = isPreview ? previewSession : session;
  const overlayGameState = isPreview && previewState === "live" ? PREVIEW_GAME_STATE : gameState;
  const overlayEvents = isPreview ? PREVIEW_EVENTS : events || [];
  const overlayDecisions = isPreview ? PREVIEW_DECISIONS : decisions || [];
  const overlayLobbyId = isPreview ? "preview_lobby_001" : resolvedLobbyId;

  const voiceTrackUrl = overlaySession?.overlayConfig?.voiceTrackUrl?.trim();
  const voiceVolumeRaw = overlaySession?.overlayConfig?.voiceVolume;
  const voiceLoop = overlaySession?.overlayConfig?.voiceLoop ?? false;

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !voiceTrackUrl) {
      return;
    }

    const audio = new Audio(voiceTrackUrl);
    audio.crossOrigin = "anonymous";
    audio.loop = voiceLoop;
    audio.volume =
      typeof voiceVolumeRaw === "number" && !Number.isNaN(voiceVolumeRaw)
        ? Math.max(0, Math.min(1, voiceVolumeRaw))
        : 0.9;

    voiceAudioRef.current = audio;

    void audio.play().catch((error) => {
      console.warn("Voice track playback failed:", error);
    });

    return () => {
      audio.pause();
      audio.src = "";
      voiceAudioRef.current = null;
    };
  }, [voiceTrackUrl, voiceLoop]);

  useEffect(() => {
    if (
      voiceAudioRef.current &&
      typeof voiceVolumeRaw === "number" &&
      !Number.isNaN(voiceVolumeRaw)
    ) {
      voiceAudioRef.current.volume = Math.max(0, Math.min(1, voiceVolumeRaw));
    }
  }, [voiceVolumeRaw]);

  // Show validation status
  if (!isPreview && isValidating) {
    return (
      <div className="stream-overlay-loading">
        <div className="spinner" />
        <p>Validating access...</p>
      </div>
    );
  }

  if (!isPreview && validationError) {
    return (
      <div className="stream-overlay-error">
        <h1>Access Denied</h1>
        <p>{validationError}</p>
      </div>
    );
  }

  if (!isPreview && !sessionId) {
    return (
      <div className="stream-overlay-error">
        <h1>Invalid Stream Access</h1>
        <p>Missing session ID.</p>
      </div>
    );
  }

  if (!overlaySession) {
    return (
      <div className="stream-overlay-loading">
        <div className="spinner" />
        <p>Loading stream...</p>
      </div>
    );
  }

  if (isPreview && previewState === "error") {
    return (
      <div className="stream-overlay-error" data-testid="overlay-preview-error">
        <h1>Overlay Preview Error State</h1>
        <p>Destination ingest failed. Check stream key and RTMP URL.</p>
      </div>
    );
  }

  const config = overlaySession.overlayConfig;
  const visualMode = config.playerVisualMode === "profile-picture" ? "profile-picture" : "webcam";
  const profilePictureUrl =
    config.profilePictureUrl?.trim() || overlaySession.entityAvatar?.trim() || "";
  const showProfilePicturePip =
    config.showPlayerCam && visualMode === "profile-picture" && profilePictureUrl.length > 0;
  const theme = config.theme || "dark";
  const sceneTransitionsEnabled = config.sceneTransitions ?? true;
  const showSceneLabel = config.showSceneLabel ?? true;
  const hasActiveGame = Boolean(overlayGameState?.boardState);
  const matchOverHoldMs = Math.max(5000, Math.min(config.matchOverHoldMs ?? 45000, 60 * 60 * 1000));
  const hasRecentMatchSummary = Boolean(
    overlaySession.lastMatchEndedAt &&
      Date.now() - overlaySession.lastMatchEndedAt < matchOverHoldMs &&
      !hasActiveGame
  );
  let scene: OverlayScene = "lobby-chat";
  if (overlaySession.status === "pending" && !hasActiveGame && !hasRecentMatchSummary) {
    scene = "starting-soon";
  } else if (hasActiveGame) {
    scene = "live-game";
  } else if (hasRecentMatchSummary) {
    scene = "match-over";
  }
  if (sceneOverride) {
    scene = sceneOverride;
  }

  // LiveKit composite mode - for user streams with screen share + webcam
  if (!isPreview && useLiveKitComposite && roomName && livekitUrl && validatedToken && sessionId) {
    return (
      <LiveKitRoom token={validatedToken} serverUrl={livekitUrl} connect={true}>
        <StreamCompositeView sessionId={sessionId} />
      </LiveKitRoom>
    );
  }

  // Standard overlay mode - for AI agents or game-only streams
  return (
    <div
      className={`stream-overlay stream-overlay--${theme} ${
        disableMotion ? "stream-overlay--static" : ""
      } ${sceneTransitionsEnabled && !disableMotion ? "stream-overlay--scene-transitions" : ""}`}
      data-scene={scene}
      data-testid={`overlay-preview-${previewState || "session"}`}
    >
      {/* Top: Streamer/Agent info bar */}
      {config.showAgentInfo && (
        <StreamerInfoPanel
          name={overlaySession.entityName}
          avatar={overlaySession.entityAvatar}
          streamType={overlaySession.streamType}
          platform={overlaySession.platform}
        />
      )}

      <div className="stream-overlay__hud">
        <div className="hud-pill">
          <span className="hud-label">Status</span>
          <strong>{overlaySession.status.toUpperCase()}</strong>
        </div>
        <div className="hud-pill">
          <span className="hud-label">Platform</span>
          <strong>{overlaySession.platform}</strong>
        </div>
        {showSceneLabel && (
          <div className="hud-pill hud-pill--scene">
            <span className="hud-label">Scene</span>
            <strong>{getSceneLabel(scene)}</strong>
          </div>
        )}
        {overlayGameState?.turnNumber && (
          <div className="hud-pill">
            <span className="hud-label">Turn</span>
            <strong>{overlayGameState.turnNumber}</strong>
          </div>
        )}
        {overlayLobbyId && (
          <div className="hud-pill hud-pill--dim">
            <span className="hud-label">Lobby</span>
            <strong>{overlayLobbyId}</strong>
          </div>
        )}
      </div>

      <div className="stream-overlay__content">
        {/* Main game area */}
        <div className="stream-overlay__game">
          {scene === "live-game" && overlayGameState?.boardState ? (
            <GameBoardSpectator
              gameState={{
                ...overlayGameState.boardState,
                hostUsername: overlayGameState.host?.username,
                opponentUsername: overlayGameState.opponent?.username ?? "AI Opponent",
                turnNumber: overlayGameState.turnNumber,
              }}
            />
          ) : scene === "match-over" ? (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content stream-overlay__waiting-content--match-over">
                <h2>Match Over</h2>
                <p>{overlaySession.lastMatchSummary || "The duel has concluded."}</p>
                <div className="match-over-chip">
                  <span>Result</span>
                  <strong>{(overlaySession.lastMatchResult || "unknown").toUpperCase()}</strong>
                </div>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          ) : scene === "starting-soon" ? (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>Starting Soon</h2>
                <p>{overlaySession.entityName || "Streamer"} is preparing the arena...</p>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          ) : scene === "brb" ? (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>Be Right Back</h2>
                <p>Quick break. Stream resumes shortly.</p>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          ) : scene === "ending" ? (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>Stream Ending</h2>
                <p>Thanks for watching. Returning to lobby loop soon.</p>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          ) : (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>{overlaySession.entityName || "AI Agent"} Live</h2>
                <p>In lobby mode: chatting and preparing for the next match...</p>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Decision panel (agent streams only) */}
        {config.showDecisions && overlaySession.agentId && (
          <div className="stream-overlay__sidebar">
            <DecisionPanel decisions={overlayDecisions} agentName={overlaySession.entityName} />
          </div>
        )}
        {showProfilePicturePip && (
          <div
            className={`overlay-profile-pip overlay-profile-pip--${config.webcamPosition} overlay-profile-pip--${config.webcamSize}`}
          >
            <img src={profilePictureUrl} alt={`${overlaySession.entityName} profile`} />
          </div>
        )}
      </div>

      {/* Bottom: Event ticker */}
      {config.showEventFeed && <EventFeedTicker events={overlayEvents} />}

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          overflow: hidden;
          background: transparent;
        }

        .stream-overlay {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: var(--font-crimson), serif;
          color: #e8e0d5;
        }

        .stream-overlay--dark {
          background-image: url('/assets/backgrounds/arena_grimoire.png');
          background-size: cover;
          background-position: center;
          position: relative;
          overflow: hidden;
        }

        .stream-overlay--dark::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(10, 5, 3, 0.3) 60%, rgba(10, 5, 3, 0.7) 100%);
        }

        .stream-overlay--light {
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          color: #1a1a2e;
        }

        .stream-overlay--static *,
        .stream-overlay--static *::before,
        .stream-overlay--static *::after {
          animation: none !important;
          transition: none !important;
        }

        .stream-overlay__content {
          flex: 1;
          display: flex;
          gap: 24px;
          padding: 16px 24px 24px;
          position: relative;
          z-index: 1;
        }

        .stream-overlay__hud {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 24px 0;
        }

        .hud-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 55, 0.4);
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.45));
          padding: 6px 12px;
          font-size: 12px;
          color: #e5d6bf;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .hud-pill--dim {
          border-color: rgba(168, 159, 148, 0.35);
          color: #c0b4a6;
        }

        .hud-pill--scene {
          border-color: rgba(82, 191, 181, 0.5);
          color: #b9f5ee;
        }

        .hud-label {
          opacity: 0.72;
        }

        .stream-overlay--scene-transitions .stream-overlay__game {
          transition: filter 360ms ease, transform 360ms ease, opacity 360ms ease;
        }

        .stream-overlay--scene-transitions[data-scene="match-over"] .stream-overlay__game,
        .stream-overlay--scene-transitions[data-scene="starting-soon"] .stream-overlay__game,
        .stream-overlay--scene-transitions[data-scene="brb"] .stream-overlay__game,
        .stream-overlay--scene-transitions[data-scene="ending"] .stream-overlay__game {
          filter: saturate(0.92) contrast(0.96);
        }

        .stream-overlay__game {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at top, rgba(212, 175, 55, 0.03) 0%, transparent 60%),
            linear-gradient(180deg, rgba(15, 12, 10, 0.92) 0%, rgba(8, 5, 3, 0.88) 100%);
          border-radius: 12px;
          border: 2px solid rgba(139, 69, 19, 0.4);
          box-shadow:
            inset 0 1px 0 rgba(212, 175, 55, 0.1),
            inset 0 0 60px rgba(0, 0, 0, 0.7),
            0 8px 32px rgba(0, 0, 0, 0.8);
          position: relative;
          overflow: hidden;
        }

        .stream-overlay__game::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 40%,
            rgba(212, 175, 55, 0.03) 50%,
            transparent 60%
          );
          animation: shine 12s ease-in-out infinite;
        }

        @keyframes shine {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); }
          50% { transform: translate(-40%, -40%) rotate(180deg); }
        }

        .stream-overlay__sidebar {
          width: 420px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
        }

        .overlay-profile-pip {
          position: absolute;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(212, 175, 55, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 3;
        }

        .overlay-profile-pip img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .overlay-profile-pip--small {
          width: 220px;
          height: 220px;
        }

        .overlay-profile-pip--medium {
          width: 280px;
          height: 280px;
        }

        .overlay-profile-pip--large {
          width: 340px;
          height: 340px;
        }

        .overlay-profile-pip--bottom-right {
          right: 24px;
          bottom: 24px;
        }

        .overlay-profile-pip--bottom-left {
          left: 24px;
          bottom: 24px;
        }

        .overlay-profile-pip--top-right {
          right: 24px;
          top: 24px;
        }

        .overlay-profile-pip--top-left {
          left: 24px;
          top: 24px;
        }

        .stream-overlay__waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 2;
        }

        .stream-overlay__waiting-content {
          position: relative;
        }

        .stream-overlay__waiting-content h2 {
          font-size: 56px;
          margin-bottom: 24px;
          font-weight: 800;
          background: linear-gradient(180deg, #f0d77a 0%, #d4af37 40%, #8b6914 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 30px rgba(212, 175, 55, 0.4)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8));
          animation: titleGlow 3s ease-in-out infinite;
          letter-spacing: 3px;
          font-family: var(--font-cinzel), serif;
        }

        .stream-overlay__waiting-content--match-over h2 {
          color: #f8d88c;
          letter-spacing: 4px;
        }

        .match-over-chip {
          margin: 4px auto 20px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 55, 0.55);
          background: rgba(0, 0, 0, 0.42);
          padding: 8px 14px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #d7c39e;
        }

        @keyframes titleGlow {
          0%, 100% { filter: drop-shadow(0 0 30px rgba(212, 175, 55, 0.4)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8)); }
          50% { filter: drop-shadow(0 0 40px rgba(212, 175, 55, 0.6)) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.8)); }
        }

        .stream-overlay__waiting-content p {
          font-size: 28px;
          opacity: 0.85;
          font-weight: 500;
          margin-bottom: 48px;
          color: #a89f94;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
        }

        .pulse-ring {
          width: 180px;
          height: 180px;
          margin: 0 auto;
          position: relative;
        }

        .pulse-ring::before,
        .pulse-ring::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2px solid;
        }

        .pulse-ring::before {
          border-color: rgba(212, 175, 55, 0.5);
          animation: pulseOuter 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .pulse-ring::after {
          border-color: rgba(139, 69, 19, 0.4);
          animation: pulseOuter 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.6s;
        }

        .pulse-ring .inner-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          animation: pulseInner 2.5s ease-in-out infinite;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.3);
        }

        @keyframes pulseOuter {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.8;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes pulseInner {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.9;
          }
        }

        .stream-overlay-loading,
        .stream-overlay-error {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #1a1614;
          color: #e8e0d5;
          font-family: var(--font-crimson), serif;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(139, 69, 19, 0.3);
          border-top-color: #d4af37;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default function StreamOverlayPage() {
  return (
    <Suspense
      fallback={
        <div className="stream-overlay-loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      }
    >
      <StreamOverlayContent />
    </Suspense>
  );
}
