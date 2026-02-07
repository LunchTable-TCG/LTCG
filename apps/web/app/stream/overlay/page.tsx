"use client";

import { DecisionPanel } from "@/components/streaming/DecisionPanel";
import { EventFeedTicker } from "@/components/streaming/EventFeedTicker";
import { GameBoardSpectator } from "@/components/streaming/GameBoardSpectator";
import { StreamerInfoPanel } from "@/components/streaming/StreamerInfoPanel";
import { StreamCompositeView } from "@/components/streaming/StreamCompositeView";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";

// Declare window.startRecording for LiveKit
declare global {
  interface Window {
    startRecording?: () => void;
  }
}

function StreamOverlayContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const code = searchParams.get("code");
  const token = searchParams.get("token");
  const roomName = searchParams.get("roomName");
  const livekitUrl = searchParams.get("livekitUrl");
  const [isReady, setIsReady] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedToken, setValidatedToken] = useState<string | null>(null);

  // Get streaming session
  const session = useQuery(
    api.streaming.sessions.getSession,
    sessionId ? { sessionId: sessionId as Id<"streamingSessions"> } : "skip"
  );

  // If roomName is provided, use LiveKit composite mode
  const useLiveKitComposite = Boolean(roomName && livekitUrl && token);

  // Check if current lobby is a story game (story games don't have lobby entries)
  const isStoryGame = session?.currentLobbyId && typeof session.currentLobbyId === "string" && session.currentLobbyId.startsWith("story_");

  // Get game state for multiplayer games (via lobby ID)
  const multiplayerGameState = useQuery(
    api.gameplay.games.queries.getGameSpectatorView,
    session?.currentLobbyId && !isStoryGame ? { lobbyId: session.currentLobbyId as Id<"gameLobbies"> } : "skip"
  );

  // Get lobby ID for story games (via game ID)
  const storyGameLookup = useQuery(
    api.gameplay.games.queries.getGameStateByGameId,
    session?.currentLobbyId && isStoryGame ? { gameId: session.currentLobbyId } : "skip"
  );

  // Get full game state for story games (via lobby ID from lookup)
  const storyGameState = useQuery(
    api.gameplay.games.queries.getGameSpectatorView,
    storyGameLookup?.lobbyId ? { lobbyId: storyGameLookup.lobbyId } : "skip"
  );

  // Use the appropriate game state
  const gameState = isStoryGame ? storyGameState : multiplayerGameState;

  // Get recent game events (only for multiplayer games)
  const events = useQuery(
    api.gameplay.gameEvents.subscribeToGameEvents,
    session?.currentLobbyId && !isStoryGame ? { lobbyId: session.currentLobbyId as Id<"gameLobbies">, limit: 10 } : "skip"
  );

  // Get agent decisions (for agent streams) — filter by current game to avoid stale decisions
  const currentGameId = gameState?.gameId;
  const decisions = useQuery(
    api.agents.decisions.getRecentDecisionsForStream,
    session?.agentId
      ? { agentId: session.agentId, gameId: currentGameId || undefined, limit: 5 }
      : "skip"
  );

  // Validate access code on mount
  useEffect(() => {
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
  }, [sessionId, code, token]);

  // Signal LiveKit when overlay is ready
  useEffect(() => {
    if (session && !isReady && !isValidating && !validationError) {
      setIsReady(true);
      // Wait a brief moment for rendering to complete
      setTimeout(() => {
        if (window.startRecording) {
          console.log("Signaling LiveKit to start recording");
          window.startRecording();
        }
      }, 1000);
    }
  }, [session, isReady, isValidating, validationError]);

  // Show validation status
  if (isValidating) {
    return (
      <div className="stream-overlay-loading">
        <div className="spinner" />
        <p>Validating access...</p>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="stream-overlay-error">
        <h1>Access Denied</h1>
        <p>{validationError}</p>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="stream-overlay-error">
        <h1>Invalid Stream Access</h1>
        <p>Missing session ID.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="stream-overlay-loading">
        <div className="spinner" />
        <p>Loading stream...</p>
      </div>
    );
  }

  const config = session.overlayConfig;
  const theme = config.theme || "dark";

  // LiveKit composite mode - for user streams with screen share + webcam
  if (useLiveKitComposite && roomName && livekitUrl && validatedToken && sessionId) {
    return (
      <LiveKitRoom token={validatedToken} serverUrl={livekitUrl} connect={true}>
        <StreamCompositeView sessionId={sessionId} />
      </LiveKitRoom>
    );
  }

  // Standard overlay mode - for AI agents or game-only streams
  return (
    <div className={`stream-overlay stream-overlay--${theme}`}>
      {/* Top: Streamer/Agent info bar */}
      {config.showAgentInfo && (
        <StreamerInfoPanel
          name={session.entityName}
          avatar={session.entityAvatar}
          streamType={session.streamType}
          platform={session.platform}
        />
      )}

      <div className="stream-overlay__content">
        {/* Main game area */}
        <div className="stream-overlay__game">
          {gameState?.boardState ? (
            <GameBoardSpectator gameState={gameState.boardState} />
          ) : (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>{session.entityName || "AI Agent"}</h2>
                <p>Waiting for game to start...</p>
                <div className="pulse-ring">
                  <div className="inner-ring" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Decision panel (agent streams only) */}
        {config.showDecisions && session.agentId && (
          <div className="stream-overlay__sidebar">
            <DecisionPanel decisions={decisions || []} agentName={session.entityName} />
          </div>
        )}
      </div>

      {/* Bottom: Event ticker */}
      {config.showEventFeed && <EventFeedTicker events={events || []} />}

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

        .stream-overlay__content {
          flex: 1;
          display: flex;
          gap: 24px;
          padding: 24px;
          position: relative;
          z-index: 1;
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
          font-size: 72px;
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
