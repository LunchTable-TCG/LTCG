"use client";

import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { DecisionPanel } from "./DecisionPanel";
import { EventFeedTicker } from "./EventFeedTicker";
import { StreamerInfoPanel } from "./StreamerInfoPanel";
import { GameBoardSpectator } from "./GameBoardSpectator";

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
  const session = useQuery(api.streaming.sessions.getSession, {
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
    api.gameplay.games.queries.getGameSpectatorView,
    session?.currentLobbyId ? { lobbyId: session.currentLobbyId } : "skip"
  );

  // Get agent decisions if agent stream
  const decisions = useQuery(
    api.agents.decisions.getRecentDecisionsForStream,
    session?.agentId ? { agentId: session.agentId, limit: 3 } : "skip"
  );

  const config = session?.overlayConfig || {
    showDecisions: false,
    showAgentInfo: false,
    showEventFeed: true,
    showPlayerCam: true,
    theme: "dark" as const,
  };

  return (
    <div className="stream-composite">
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
          />
        ) : (
          // No screen share - show game board
          gameState && <GameBoardSpectator gameState={gameState} />
        )}
      </div>

      {/* Webcam - Picture in Picture */}
      {cameraTrack && config.showPlayerCam && (
        <div className="webcam-pip">
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
          />
        </div>
      )}

      {/* Overlay UI Elements */}
      <div className="overlay-ui">
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
            <EventFeedTicker events={[]} />
          </div>
        )}
      </div>

      {/* Signal that overlay is ready for egress capture */}
      {session && typeof window !== "undefined" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.startRecording) {
                window.startRecording();
              }
            `,
          }}
        />
      )}

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
        }

        .screen-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .webcam-pip {
          position: absolute;
          bottom: 24px;
          right: 24px;
          width: 320px;
          height: 180px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid rgba(212, 175, 55, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 10;
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

        @media (max-width: 1920px) {
          .stream-composite {
            transform-origin: top left;
          }
        }
      `}</style>
    </div>
  );
}
