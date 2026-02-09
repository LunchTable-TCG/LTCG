"use client";

import { STREAMING_PLATFORM_META, type StreamingPlatform } from "@/lib/streaming/platforms";
import type {
  PlayerVisualMode,
  StreamType,
  WebcamPosition,
  WebcamSize,
} from "@/lib/streaming/types";
import {
  LiveKitRoom,
  PreJoin,
  RoomAudioRenderer,
  VideoConference,
} from "@livekit/components-react";
import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useRef, useState } from "react";
import "@livekit/components-styles";

interface LiveStreamingRoomProps {
  userId?: string;
  agentId?: string;
  streamType: StreamType;
  platform: StreamingPlatform;
  streamKey?: string;
  customRtmpUrl?: string;
  useStoredCredentials?: boolean;
  showPlayerCam?: boolean;
  playerVisualMode?: PlayerVisualMode;
  profilePictureUrl?: string;
  webcamPosition?: WebcamPosition;
  webcamSize?: WebcamSize;
  voiceTrackUrl?: string;
  voiceVolume?: number;
  voiceLoop?: boolean;
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
  streamKey = "",
  customRtmpUrl,
  useStoredCredentials = false,
  showPlayerCam = true,
  playerVisualMode = "webcam",
  profilePictureUrl,
  webcamPosition = "bottom-right",
  webcamSize = "medium",
  voiceTrackUrl,
  voiceVolume,
  voiceLoop = false,
  onStreamStarted,
  onError,
}: LiveStreamingRoomProps) {
  const { getAccessToken } = usePrivy();
  const [token, setToken] = useState<string>("");
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const stoppingRef = useRef(false);
  const platformMeta = STREAMING_PLATFORM_META[platform];
  const maskedStreamKey = useStoredCredentials
    ? "Saved credentials"
    : streamKey.length <= 8
      ? "********"
      : `${streamKey.slice(0, 4)}******${streamKey.slice(-4)}`;

  const handlePreJoinSubmit = async (values: { username: string }) => {
    setIsCreatingRoom(true);

    try {
      const authToken = await getAccessToken();
      const response = await fetch("/api/streaming/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          userId,
          agentId,
          streamType,
          platform,
          ...(useStoredCredentials ? {} : { streamKey, customRtmpUrl }),
          streamTitle: `${values.username}'s Stream`,
          overlayConfig: {
            showDecisions: streamType === "agent",
            showAgentInfo: streamType === "agent",
            showEventFeed: true,
            showPlayerCam: streamType === "user" ? showPlayerCam : false,
            playerVisualMode,
            profilePictureUrl,
            webcamPosition,
            webcamSize,
            voiceTrackUrl,
            voiceVolume,
            voiceLoop,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start stream");
      }

      setToken(data.overlayToken || "");
      setLivekitUrl(data.overlayUrl || "");
      setSessionId(data.sessionId);

      onStreamStarted?.(data.sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start stream";
      onError?.(message);
      setIsCreatingRoom(false);
    }
  };

  const handleDisconnected = useCallback(async () => {
    if (!sessionId || stoppingRef.current) return;
    stoppingRef.current = true;

    try {
      const authToken = await getAccessToken();
      await fetch("/api/streaming/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          reason: "participant_disconnected",
        }),
      });
    } catch (err) {
      console.warn("Failed to stop stream on disconnect:", err);
    } finally {
      stoppingRef.current = false;
    }
  }, [sessionId, getAccessToken]);

  // Show PreJoin for device selection
  if (!token || !livekitUrl) {
    return (
      <div className="livekit-prejoin-shell">
        <div className="prejoin-header">
          <div>
            <p className="prejoin-kicker">Control Room</p>
            <h3>Pre-Live Device & Scene Check</h3>
            <p>Confirm camera, mic, and layout before the stream pushes to {platformMeta.label}.</p>
          </div>
          <div className="destination-chip">
            <span>{platformMeta.icon}</span>
            <strong>{platformMeta.label}</strong>
          </div>
        </div>

        <div className="prejoin-grid">
          <div className="prejoin-main">
            <PreJoin
              defaults={{
                username: streamType === "user" ? "Streamer" : "AI Agent",
                videoEnabled: streamType === "user" && playerVisualMode === "webcam",
                audioEnabled: streamType === "user",
              }}
              onSubmit={handlePreJoinSubmit}
              joinLabel={isCreatingRoom ? "Building broadcast room..." : "Enter Pre-Live Room"}
            />
          </div>
          <aside className="prejoin-sidebar">
            <h4>Destination Summary</h4>
            <dl>
              <div>
                <dt>Platform</dt>
                <dd>{platformMeta.label}</dd>
              </div>
              <div>
                <dt>RTMP Endpoint</dt>
                <dd>{customRtmpUrl?.trim() || "Managed default ingest"}</dd>
              </div>
              <div>
                <dt>Stream Key</dt>
                <dd>{maskedStreamKey}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{streamType === "user" ? "User Stream" : "Agent Stream"}</dd>
              </div>
              <div>
                <dt>Webcam Window</dt>
                <dd>
                  {streamType === "user"
                    ? showPlayerCam
                      ? playerVisualMode === "profile-picture"
                        ? "Profile Picture (PiP)"
                        : "Webcam (PiP)"
                      : "Disabled"
                    : "N/A"}
                </dd>
              </div>
              {streamType === "user" && showPlayerCam && (
                <>
                  <div>
                    <dt>Webcam Position</dt>
                    <dd>{webcamPosition}</dd>
                  </div>
                  <div>
                    <dt>Webcam Size</dt>
                    <dd>{webcamSize}</dd>
                  </div>
                </>
              )}
            </dl>
            <p className="prejoin-note">
              Your overlay URL and LiveKit room are provisioned after this pre-live join step.
            </p>
          </aside>
        </div>

        <style jsx>{`
          .livekit-prejoin-shell {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px 0;
            display: grid;
            gap: 16px;
          }

          .prejoin-header {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: flex-start;
            border: 1px solid rgba(74, 52, 37, 0.8);
            border-radius: 14px;
            padding: 18px;
            background: linear-gradient(180deg, rgba(32, 23, 19, 0.92), rgba(18, 13, 10, 0.92));
          }

          .prejoin-kicker {
            margin: 0;
            font-size: 11px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #b8a894;
            font-weight: 800;
          }

          .prejoin-header h3 {
            margin: 6px 0 4px;
            font-size: 22px;
            font-weight: 900;
            color: #f5deb3;
          }

          .prejoin-header p {
            margin: 0;
            color: #c7b8a4;
            font-size: 14px;
          }

          .destination-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(212, 175, 55, 0.45);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 12px;
            background: rgba(212, 175, 55, 0.12);
            color: #f4ddb0;
          }

          .prejoin-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 320px;
            gap: 16px;
          }

          .prejoin-main {
            min-width: 0;
          }

          .prejoin-sidebar {
            border: 1px solid rgba(74, 52, 37, 0.8);
            border-radius: 14px;
            padding: 16px;
            background: linear-gradient(180deg, rgba(21, 15, 12, 0.94), rgba(13, 9, 7, 0.94));
          }

          .prejoin-sidebar h4 {
            margin: 0 0 10px;
            font-size: 15px;
            font-weight: 800;
            color: #f5deb3;
          }

          .prejoin-sidebar dl {
            display: grid;
            gap: 10px;
            margin: 0;
          }

          .prejoin-sidebar dt {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #a89f94;
          }

          .prejoin-sidebar dd {
            margin: 3px 0 0;
            font-size: 12px;
            color: #e8e0d5;
            word-break: break-word;
          }

          .prejoin-note {
            margin: 12px 0 0;
            font-size: 11px;
            color: #b8a894;
          }

          .prejoin-main :global(.lk-prejoin) {
            background: linear-gradient(180deg, rgba(13, 9, 7, 0.85), rgba(9, 6, 5, 0.9));
            border: 1px solid rgba(74, 52, 37, 0.8);
            border-radius: 14px;
          }

          .prejoin-main :global(.lk-button) {
            background: linear-gradient(135deg, #d4af37 0%, #c49d2e 100%);
            color: #1a1614;
            font-weight: 800;
            letter-spacing: 0.02em;
          }

          .prejoin-main :global(.lk-button:hover) {
            background: linear-gradient(135deg, #e8c955 0%, #d4af37 100%);
          }

          @media (max-width: 1024px) {
            .prejoin-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  // Show live room with controls
  return (
    <div className="livekit-room-container">
      <div className="stream-info-banner">
        <div className="banner-row">
          <div className="live-indicator">
            <span className="live-dot" />
            <span>CONTROL ROOM ACTIVE</span>
          </div>
          <div className="platform-chip">
            {platformMeta.icon} {platformMeta.label}
          </div>
        </div>
        <p>
          Stream pipeline connected. Verify frame composition and audio levels before switching to
          gameplay focus.
        </p>
        <div className="banner-meta">
          <span>Stream key: {maskedStreamKey}</span>
          <span className="live-dot" />
          <span>{streamType === "agent" ? "Agent stream mode" : "User stream mode"}</span>
        </div>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={streamType === "user"}
        video={streamType === "user" && playerVisualMode === "webcam"}
        screen={streamType === "user"}
        onConnected={() => {
          console.log(
            "[LiveKit] Participant connected to room — web egress already active, session:",
            sessionId
          );
        }}
        onDisconnected={() => {
          console.log("[LiveKit] Participant disconnected from room, session:", sessionId);
          handleDisconnected();
        }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      <style jsx>{`
        .livekit-room-container {
          width: 100%;
          height: 100%;
          min-height: 620px;
          background: #0d0a09;
          display: grid;
          grid-template-rows: auto 1fr;
        }

        .stream-info-banner {
          padding: 14px 20px;
          background: linear-gradient(
            180deg,
            rgba(34, 24, 20, 0.96) 0%,
            rgba(20, 15, 12, 0.96) 100%
          );
          border-bottom: 1px solid rgba(212, 175, 55, 0.35);
        }

        .banner-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 10px;
          background: rgba(245, 158, 11, 0.22);
          border: 1px solid rgba(251, 191, 36, 0.45);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          color: #fcd34d;
        }

        .platform-chip {
          border-radius: 999px;
          border: 1px solid rgba(212, 175, 55, 0.35);
          background: rgba(212, 175, 55, 0.12);
          color: #f5deb3;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 5px 10px;
          white-space: nowrap;
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
          color: #d7c39e;
          font-size: 13px;
        }

        .banner-meta {
          margin-top: 7px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #a89f94;
        }

        .livekit-room-container :global(.lk-video-conference) {
          height: 100%;
          background: radial-gradient(
              circle at 15% 20%,
              rgba(212, 175, 55, 0.08),
              transparent 40%
            ),
            #0b0807;
        }

        .livekit-room-container :global(.lk-control-bar) {
          background: rgba(0, 0, 0, 0.86);
          border-top: 1px solid rgba(212, 175, 55, 0.25);
        }

        .livekit-room-container :global(.lk-button) {
          background: rgba(212, 175, 55, 0.16);
        }

        .livekit-room-container :global(.lk-button:hover) {
          background: rgba(212, 175, 55, 0.3);
        }

        @media (max-width: 768px) {
          .banner-row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
