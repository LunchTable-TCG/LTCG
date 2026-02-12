"use client";

import type { OverlayConfig } from "@/lib/streaming/types";
import * as generatedApi from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { RoomAudioRenderer, useTracks } from "@livekit/components-react";
import { useQuery } from "convex/react";
import { Track } from "livekit-client";
import { useEffect } from "react";
import { DecisionPanel } from "./DecisionPanel";
import { EventFeedTicker } from "./EventFeedTicker";
import { GameBoardSpectator } from "./GameBoardSpectator";
import { StreamerInfoPanel } from "./StreamerInfoPanel";
// biome-ignore lint/suspicious/noExplicitAny: TS2589 workaround for deep type instantiation
const apiAny = (generatedApi as any).api;

interface StreamCompositeViewProps {
  sessionId: string;
}

/**
 * Composite stream view that combines:
 * - User's screen share (main)
 * - User's webcam (picture-in-picture)
 * - Game overlay (stats, decisions, events)
 */
export function StreamCompositeView({ sessionId }: StreamCompositeViewProps) {
  // Get session info
  const session = useQuery(apiAny.streaming.sessions.getSessionPublic, {
    sessionId: sessionId as Id<"streamingSessions">,
  });

  // Subscribe to LiveKit tracks
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  const screenTrack = tracks.find((t) => t.publication.source === Track.Source.ScreenShare);
  const cameraTrack = tracks.find((t) => t.publication.source === Track.Source.Camera);

  // Get game state if in a lobby
  const gameState = useQuery(
    apiAny.gameplay.games.queries.getGameSpectatorView,
    session?.currentLobbyId ? { lobbyId: session.currentLobbyId as Id<"gameLobbies"> } : "skip"
  );

  const events = useQuery(
    apiAny.gameplay.gameEvents.subscribeToGameEvents,
    session?.currentLobbyId
      ? { lobbyId: session.currentLobbyId as Id<"gameLobbies">, limit: 10 }
      : "skip"
  );

  // Get agent decisions if agent stream
  const decisions = useQuery(
    apiAny.agents.decisions.getRecentDecisionsForStream,
    session?.agentId
      ? { agentId: session.agentId, gameId: gameState?.gameId || undefined, limit: 3 }
      : "skip"
  );

  const config: OverlayConfig = session?.overlayConfig || {
    showDecisions: false,
    showAgentInfo: false,
    showEventFeed: true,
    showPlayerCam: true,
    webcamPosition: "bottom-right",
    webcamSize: "medium",
    playerVisualMode: "webcam",
    profilePictureUrl: undefined,
    voiceTrackUrl: undefined,
    voiceVolume: undefined,
    voiceLoop: false,
    theme: "dark",
    matchOverHoldMs: 45000,
    showSceneLabel: true,
    sceneTransitions: true,
  };
  const hasRecentMatchSummary = Boolean(
    session?.lastMatchEndedAt &&
      Date.now() - session.lastMatchEndedAt < 60 * 60 * 1000 &&
      !gameState
  );
  const matchResult =
    session?.lastMatchResult === "win" || session?.lastMatchResult === "loss"
      ? session.lastMatchResult
      : null;
  const visualMode = config.playerVisualMode === "profile-picture" ? "profile-picture" : "webcam";
  const profilePictureUrl = config.profilePictureUrl?.trim() || session?.entityAvatar?.trim() || "";
  const shouldShowProfilePip =
    config.showPlayerCam &&
    profilePictureUrl.length > 0 &&
    (visualMode === "profile-picture" || !cameraTrack);

  useEffect(() => {
    if (!session || typeof window === "undefined") {
      return;
    }

    const overlayWindow = window as Window & { startRecording?: () => void };
    overlayWindow.startRecording?.();
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const voiceTrackUrl = config.voiceTrackUrl?.trim();
    if (!voiceTrackUrl) {
      return;
    }

    const voiceVolume =
      typeof config.voiceVolume === "number" && !Number.isNaN(config.voiceVolume)
        ? Math.max(0, Math.min(1, config.voiceVolume))
        : 0.9;
    const audio = new Audio(voiceTrackUrl);
    audio.crossOrigin = "anonymous";
    audio.loop = config.voiceLoop ?? false;
    audio.volume = voiceVolume;
    audio.muted = false;

    void audio.play().catch((error) => {
      console.warn("Composite voice track playback failed:", error);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [config.voiceTrackUrl, config.voiceVolume, config.voiceLoop]);

  return (
    <div
      className={`stream-composite ${config.showPlayerCam ? "" : "stream-composite--no-webcam"}`}
    >
      {/* Main content - Screen share or game board */}
      <div className="main-content">
        {screenTrack ? (
          // User is sharing screen - show it full size
          <video
            ref={(el) => {
              if (el && screenTrack.publication.track) {
                el.srcObject = new MediaStream([screenTrack.publication.track.mediaStreamTrack]);
              }
            }}
            autoPlay
            playsInline
            className="screen-video"
          >
            <track kind="captions" />
          </video>
        ) : // No screen share - show game board or waiting state
        gameState ? (
          <GameBoardSpectator gameState={gameState} />
        ) : hasRecentMatchSummary ? (
          <div className="waiting-state">
            <h2>Match Over</h2>
            {matchResult && (
              <p className={`match-result ${matchResult === "win" ? "match-result--win" : "match-result--loss"}`}>
                Result: {matchResult.toUpperCase()}
              </p>
            )}
            <p>{session?.lastMatchSummary || "The last match has ended."}</p>
            <p className="waiting-sub">Looping stream in lobby mode until the next game starts.</p>
          </div>
        ) : (
          <div className="waiting-state">
            <h2>Lobby / Chat Scene</h2>
            <p>Live stream remains active while waiting for the next match or screen share.</p>
          </div>
        )}
      </div>

      {/* Webcam - Picture in Picture */}
      {cameraTrack && config.showPlayerCam && visualMode === "webcam" && (
        <div
          className={`webcam-pip webcam-pip--${config.webcamPosition} webcam-pip--${config.webcamSize}`}
        >
          <video
            ref={(el) => {
              if (el && cameraTrack.publication.track) {
                el.srcObject = new MediaStream([cameraTrack.publication.track.mediaStreamTrack]);
              }
            }}
            autoPlay
            playsInline
            muted
            className="webcam-video"
          >
            <track kind="captions" />
          </video>
        </div>
      )}
      {shouldShowProfilePip && (
        <div
          className={`webcam-pip webcam-pip--${config.webcamPosition} webcam-pip--${config.webcamSize}`}
        >
          <img src={profilePictureUrl} alt="Profile" className="webcam-video" />
        </div>
      )}

      {/* Overlay UI Elements */}
      <div className="overlay-ui">
        <RoomAudioRenderer />

        {/* Streamer info */}
        {config.showAgentInfo && session && (
          <div className="top-bar">
            <StreamerInfoPanel
              name={session.streamTitle}
              streamType={session.streamType}
              platform={session.platform}
            />
          </div>
        )}

        {/* AI Decisions */}
        {config.showDecisions && decisions && decisions.length > 0 && session && (
          <div className="decisions-panel">
            <DecisionPanel decisions={decisions} agentName={session.streamTitle} />
          </div>
        )}

        {/* Event feed */}
        {config.showEventFeed && (
          <div className="event-feed">
            <EventFeedTicker events={events || []} />
          </div>
        )}
      </div>

      <style jsx>{`
        .stream-composite {
          position: relative;
          width: 1920px;
          height: 1080px;
          background: #000;
          overflow: hidden;
        }

        .main-content {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 20% 20%, rgba(212, 175, 55, 0.06), transparent 35%),
            radial-gradient(circle at 80% 10%, rgba(59, 130, 246, 0.05), transparent 30%),
            #000;
        }

        .screen-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .webcam-pip {
          position: absolute;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(212, 175, 55, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 10;
        }

        .webcam-pip--small {
          width: 260px;
          height: 146px;
        }

        .webcam-pip--medium {
          width: 320px;
          height: 180px;
        }

        .webcam-pip--large {
          width: 380px;
          height: 214px;
        }

        .webcam-pip--bottom-right {
          right: 24px;
          bottom: 24px;
        }

        .webcam-pip--bottom-left {
          left: 24px;
          bottom: 24px;
        }

        .webcam-pip--top-right {
          right: 24px;
          top: 24px;
        }

        .webcam-pip--top-left {
          left: 24px;
          top: 24px;
        }

        .webcam-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .overlay-ui {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 20;
        }

        .top-bar {
          position: absolute;
          top: 24px;
          left: 24px;
          right: 24px;
          pointer-events: auto;
        }

        .decisions-panel {
          position: absolute;
          top: 120px;
          right: 24px;
          max-width: 400px;
          pointer-events: auto;
        }

        .event-feed {
          position: absolute;
          bottom: 24px;
          left: 24px;
          right: 360px;
          pointer-events: auto;
        }

        .stream-composite--no-webcam .event-feed {
          right: 24px;
        }

        .waiting-state {
          width: min(720px, 92vw);
          border-radius: 16px;
          border: 1px solid rgba(212, 175, 55, 0.4);
          background: linear-gradient(180deg, rgba(30, 24, 21, 0.88), rgba(10, 8, 7, 0.92));
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
          padding: 28px;
          text-align: center;
        }

        .waiting-state h2 {
          margin: 0 0 10px;
          font-size: 28px;
          color: #f3e0b6;
        }

        .match-result {
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .match-result--win {
          color: #4ade80;
        }

        .match-result--loss {
          color: #f87171;
        }

        .waiting-state p {
          margin: 0;
          color: #bda88f;
          font-size: 15px;
        }

        .waiting-sub {
          margin-top: 10px;
          font-size: 13px;
          color: #9f927f;
        }

        @media (max-width: 1920px) {
          .stream-composite {
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  );
}
