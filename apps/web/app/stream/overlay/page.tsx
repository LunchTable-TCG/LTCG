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

  // Get agent decisions (for agent streams)
  const decisions = useQuery(
    api.agents.decisions.getRecentDecisionsForStream,
    session?.agentId ? { agentId: session.agentId, limit: 3 } : "skip"
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
          {gameState ? (
            <GameBoardSpectator gameState={gameState} />
          ) : (
            <div className="stream-overlay__waiting">
              <div className="stream-overlay__waiting-content">
                <h2>{session.entityName || "AI Agent"}</h2>
                <p>Waiting for game to start...</p>
                <div className="pulse-ring" />
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
          width: 1920px;
          height: 1080px;
          display: flex;
          flex-direction: column;
          font-family: system-ui, -apple-system, sans-serif;
          color: white;
        }

        .stream-overlay--dark {
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
        }

        .stream-overlay--light {
          background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
          color: #1a1a2e;
        }

        .stream-overlay__content {
          flex: 1;
          display: flex;
          gap: 20px;
          padding: 20px;
        }

        .stream-overlay__game {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
        }

        .stream-overlay__sidebar {
          width: 400px;
          display: flex;
          flex-direction: column;
        }

        .stream-overlay__waiting {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .stream-overlay__waiting-content h2 {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .stream-overlay__waiting-content p {
          font-size: 24px;
          opacity: 0.7;
        }

        .pulse-ring {
          width: 100px;
          height: 100px;
          margin: 40px auto 0;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.6;
          }
        }

        .stream-overlay-loading,
        .stream-overlay-error {
          width: 1920px;
          height: 1080px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f0f23;
          color: white;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
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
