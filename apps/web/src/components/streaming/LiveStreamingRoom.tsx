"use client";

import { useState } from "react";
import { LiveKitRoom, PreJoin, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveStreamingRoomProps {
  userId?: string;
  agentId?: string;
  streamType: "user" | "agent";
  platform: "twitch" | "youtube";
  streamKey: string;
  onStreamStarted?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

/**
 * Complete streaming room with LiveKit components
 * Handles device selection, preview, and publishing
 */
export function LiveStreamingRoom({
  userId,
  agentId,
  streamType,
  platform,
  streamKey,
  onStreamStarted,
  onError,
}: LiveStreamingRoomProps) {
  const [token, setToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handlePreJoinSubmit = async (values: { username: string }) => {
    setIsCreatingRoom(true);

    try {
      // Create LiveKit room
      const response = await fetch("/api/streaming/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          agentId,
          streamType,
          platform,
          streamKey,
          streamTitle: `${values.username}'s Stream`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create room");
      }

      setToken(data.token);
      setLivekitUrl(data.livekitUrl);

      onStreamStarted?.(data.sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create room";
      onError?.(message);
      setIsCreatingRoom(false);
    }
  };

  // Show PreJoin for device selection
  if (!token || !livekitUrl) {
    return (
      <div className="livekit-prejoin-container">
        <PreJoin
          defaults={{
            username: streamType === "user" ? "Streamer" : "AI Agent",
            videoEnabled: streamType === "user",
            audioEnabled: streamType === "user",
          }}
          onSubmit={handlePreJoinSubmit}
          joinLabel={isCreatingRoom ? "Creating room..." : "Start Streaming"}
        />
        <style jsx>{`
          .livekit-prejoin-container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 24px;
          }

          .livekit-prejoin-container :global(.lk-prejoin) {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
          }

          .livekit-prejoin-container :global(.lk-button) {
            background: linear-gradient(135deg, #d4af37 0%, #c49d2e 100%);
            color: #1a1614;
            font-weight: 600;
          }

          .livekit-prejoin-container :global(.lk-button:hover) {
            background: linear-gradient(135deg, #e8c955 0%, #d4af37 100%);
          }
        `}</style>
      </div>
    );
  }

  // Show live room with controls
  return (
    <div className="livekit-room-container">
      <div className="stream-info-banner">
        <div className="live-indicator">
          <span className="live-dot" />
          <span>SETTING UP STREAM</span>
        </div>
        <p>Your stream will go live once LiveKit egress starts capturing...</p>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={streamType === "user"}
        video={streamType === "user"}
        screen={streamType === "user"}
        onConnected={() => {
          console.log("Connected to LiveKit room");
          // TODO: Start track composite egress here
        }}
        onDisconnected={() => {
          console.log("Disconnected from room");
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      <style jsx>{`
        .livekit-room-container {
          width: 100%;
          height: 100vh;
          background: #0d0a09;
        }

        .stream-info-banner {
          padding: 16px 24px;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
          border-bottom: 1px solid rgba(251, 191, 36, 0.3);
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #f59e0b;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }

        .stream-info-banner p {
          margin: 0;
          color: #fcd34d;
          font-size: 14px;
        }

        .livekit-room-container :global(.lk-video-conference) {
          height: calc(100vh - 80px);
        }

        .livekit-room-container :global(.lk-control-bar) {
          background: rgba(0, 0, 0, 0.8);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .livekit-room-container :global(.lk-button) {
          background: rgba(212, 175, 55, 0.2);
        }

        .livekit-room-container :global(.lk-button:hover) {
          background: rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}
