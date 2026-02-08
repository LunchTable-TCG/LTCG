"use client";

import { typedApi, useConvexQuery } from "@/lib/convexHelpers";
import {
  STREAMING_PLATFORMS,
  STREAMING_PLATFORM_META,
  type StreamingPlatform,
  requiresCustomRtmpUrl,
} from "@/lib/streaming/platforms";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

interface StreamingSettingsPanelProps {
  userId: string;
}

export function StreamingSettingsPanel({ userId }: StreamingSettingsPanelProps) {
  const { getAccessToken } = usePrivy();
  const [platform, setPlatform] = useState<StreamingPlatform>("twitch");
  const [streamKey, setStreamKey] = useState("");
  const [customRtmpUrl, setCustomRtmpUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useStoredCreds, setUseStoredCreds] = useState(false);

  const needsRtmpUrl = requiresCustomRtmpUrl(platform);
  const supportsOptionalRtmpOverride =
    platform === "twitch" || platform === "kick" || platform === "youtube";
  const showRtmpInput = needsRtmpUrl || supportsOptionalRtmpOverride;

  // Load saved streaming config
  const streamingConfig = useConvexQuery(typedApi.core.userPreferences.getUserStreamingConfig, {});

  // Pre-fill from saved config
  useEffect(() => {
    if (streamingConfig?.platform) {
      const savedPlatform = streamingConfig.platform as StreamingPlatform;
      if (STREAMING_PLATFORM_META[savedPlatform]) {
        setPlatform(savedPlatform);
      }
      if (streamingConfig.hasStreamKey) {
        setUseStoredCreds(true);
      }
      if (streamingConfig.rtmpUrl) {
        setCustomRtmpUrl(streamingConfig.rtmpUrl);
      }
    }
  }, [streamingConfig]);

  // Get user's streaming sessions
  const sessions = useQuery(api.streaming.sessions.getUserSessions, {
    userId: userId as Id<"users">,
    limit: 5,
  });

  const activeSession = sessions?.find((s) => s.status === "live");

  const startStream = async () => {
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/streaming/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await (async () => {
            const token = await getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          })()),
        },
        body: JSON.stringify({
          userId,
          streamType: "user",
          platform,
          ...(useStoredCreds
            ? { useStoredCredentials: true }
            : {
                streamKey,
                customRtmpUrl: customRtmpUrl.trim() ? customRtmpUrl.trim() : undefined,
              }),
          streamTitle: `${STREAMING_PLATFORM_META[platform].label} Stream`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start stream");
      }

      setSessionId(data.sessionId);
      setStreamKey(""); // Clear for security
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start stream");
      setIsStreaming(false);
    }
  };

  const stopStream = async () => {
    if (!sessionId && !activeSession) return;

    try {
      await fetch("/api/streaming/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await (async () => {
            const token = await getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          })()),
        },
        body: JSON.stringify({
          sessionId: sessionId || activeSession?._id,
        }),
      });

      setSessionId(null);
      setIsStreaming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop stream");
    }
  };

  const isLive = activeSession?.status === "live" || isStreaming;

  return (
    <div className="streaming-settings">
      <h2>Stream Your Gameplay</h2>
      <p className="subtitle">
        Broadcast your LTCG matches live to Twitch, YouTube, Kick, X, Pump.fun, and more
      </p>
      <p className="subtitle">Retake is available for agent streams only.</p>

      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      {isLive ? (
        <div className="live-status">
          <div className="live-indicator">
            <span className="live-dot" />
            <span>LIVE</span>
          </div>
          <p>Your stream is live!</p>
          <p className="stream-info">
            Platform: {activeSession?.platform || platform}
            <br />
            Duration: {formatDuration(Date.now() - (activeSession?.startedAt || 0))}
            <br />
            Viewers: {activeSession?.viewerCount || 0}
          </p>
          <button type="button" onClick={stopStream} className="btn-stop">
            Stop Streaming
          </button>
        </div>
      ) : (
        <div className="stream-setup">
          <div className="platform-selector">
            <p>Platform</p>
            <div className="platform-buttons">
              {STREAMING_PLATFORMS.filter((p) => p !== "retake").map((p) => (
                <button
                  key={p}
                  type="button"
                  className={platform === p ? "active" : ""}
                  onClick={() => setPlatform(p)}
                >
                  {STREAMING_PLATFORM_META[p].icon} {STREAMING_PLATFORM_META[p].label}
                </button>
              ))}
            </div>
          </div>

          {showRtmpInput && (
            <div className="stream-key-input">
              <label htmlFor="streaming-rtmp-url">
                RTMP URL {supportsOptionalRtmpOverride && !needsRtmpUrl && "(optional override)"}
              </label>
              <input
                id="streaming-rtmp-url"
                type="text"
                placeholder={
                  platform === "x"
                    ? "rtmp://... from Media Studio > Producer"
                    : platform === "pumpfun"
                      ? "rtmp://... from your coin page > Start Livestream"
                      : platform === "retake"
                        ? "rtmps://... from Retake agent RTMP API"
                        : platform === "twitch"
                          ? "rtmps://live.twitch.tv/app (optional)"
                          : platform === "kick"
                            ? "rtmps://...kick ingest.../app (optional)"
                            : "rtmp://your-server.com/live"
                }
                value={customRtmpUrl}
                onChange={(e) => setCustomRtmpUrl(e.target.value)}
              />
              <p className="help-text">
                {platform === "x" &&
                  "Go to Media Studio > Producer > Create RTMP Source > Copy URL"}
                {platform === "pumpfun" &&
                  "Go to your coin page > Start Livestream > Select RTMP > Copy URL"}
                {platform === "retake" && "Use RTMP URL returned by Retake.tv API"}
                {platform === "twitch" && "Optional: override default Twitch ingest if needed."}
                {platform === "kick" && "Optional: override default Kick ingest if needed."}
                {platform === "custom" && "Enter your custom RTMP ingest URL"}
              </p>
            </div>
          )}

          <div className="stream-key-input">
            <label htmlFor="streaming-stream-key">Stream Key</label>
            {useStoredCreds ? (
              <div className="saved-creds-indicator">
                <span className="saved-badge">Using saved credentials</span>
                <button
                  type="button"
                  className="switch-manual"
                  onClick={() => setUseStoredCreds(false)}
                >
                  Enter manually
                </button>
              </div>
            ) : (
              <>
                <input
                  id="streaming-stream-key"
                  type="password"
                  placeholder={
                    platform === "twitch"
                      ? "Get from twitch.tv/dashboard/settings/stream"
                      : platform === "youtube"
                        ? "Get from studio.youtube.com"
                        : platform === "kick"
                          ? "Get from Kick Dashboard > Stream URL & Key"
                          : platform === "x"
                            ? "Get from Media Studio > Producer"
                            : platform === "pumpfun"
                              ? "Get from your coin page > Start Livestream"
                              : "Enter your stream key"
                  }
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                />
                {streamingConfig?.hasStreamKey && (
                  <button
                    type="button"
                    className="switch-saved"
                    onClick={() => {
                      setUseStoredCreds(true);
                      setStreamKey("");
                    }}
                  >
                    Use saved credentials instead
                  </button>
                )}
                <p className="help-text">
                  {platform === "twitch" && (
                    <>
                      Get your stream key from{" "}
                      <a
                        href="https://dashboard.twitch.tv/settings/stream"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Twitch Dashboard
                      </a>
                    </>
                  )}
                  {platform === "youtube" && (
                    <>
                      Get your stream key from{" "}
                      <a
                        href="https://studio.youtube.com/"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        YouTube Studio
                      </a>
                    </>
                  )}
                  {platform === "kick" && (
                    <>
                      Get your stream key from{" "}
                      <a
                        href="https://help.kick.com/en/articles/12273234-how-to-stream-on-kick-com"
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        Kick Creator Dashboard
                      </a>
                    </>
                  )}
                  {platform === "x" &&
                    "Copy the stream key from your RTMP source in Media Studio. Requires X Premium."}
                  {platform === "pumpfun" &&
                    "Copy the stream key from your livestream settings. Must be the token creator."}
                  {platform === "retake" && "Stream key is provided via Retake.tv integration."}
                  {platform === "custom" && "Enter the stream key for your RTMP server."}
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={startStream}
            disabled={
              (!useStoredCreds && !streamKey) || isStreaming || (needsRtmpUrl && !customRtmpUrl)
            }
            className="btn-start"
          >
            {isStreaming ? "Starting..." : "Go Live"}
          </button>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="stream-history">
          <h3>Recent Streams</h3>
          <ul>
            {sessions.slice(0, 5).map((session) => (
              <li key={session._id}>
                <span className="platform-icon">
                  {STREAMING_PLATFORM_META[session.platform as StreamingPlatform]?.icon || "TV"}
                </span>
                <span className="session-info">
                  {new Date(session.createdAt).toLocaleDateString()}
                  {session.stats && ` • ${formatDuration(session.stats.duration)}`}
                </span>
                <span className={`status-badge status-${session.status}`}>{session.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .streaming-settings {
          max-width: 600px;
          padding: 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
        }

        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0 0 24px 0;
          opacity: 0.7;
        }

        .error-message {
          padding: 12px;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 8px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        .live-status {
          text-align: center;
          padding: 32px;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #dc2626;
          border-radius: 8px;
          font-weight: 700;
          margin-bottom: 16px;
        }

        .live-dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stream-info {
          margin: 16px 0;
          opacity: 0.8;
          line-height: 1.6;
        }

        .platform-selector {
          margin-bottom: 20px;
        }

        .platform-selector label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .platform-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .platform-buttons button {
          flex: 1 1 calc(33% - 8px);
          min-width: 120px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .platform-buttons button.active {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .platform-buttons button:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .stream-key-input {
          margin-bottom: 20px;
        }

        .stream-key-input label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .stream-key-input input {
          width: 100%;
          padding: 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
        }

        .help-text {
          margin-top: 8px;
          font-size: 12px;
          opacity: 0.6;
        }

        .help-text a {
          color: #60a5fa;
          text-decoration: none;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .saved-creds-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
        }

        .saved-badge {
          color: #6ee7b7;
          font-size: 14px;
          font-weight: 600;
        }

        .switch-manual,
        .switch-saved {
          background: none;
          border: none;
          color: #60a5fa;
          font-size: 12px;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }

        .switch-manual:hover,
        .switch-saved:hover {
          color: #93c5fd;
        }

        .switch-saved {
          display: block;
          margin-top: 8px;
        }

        .btn-start,
        .btn-stop {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-start {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .btn-start:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-start:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-stop {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
        }

        .btn-stop:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
        }

        .stream-history {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stream-history h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
        }

        .stream-history ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .stream-history li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .platform-icon {
          font-size: 20px;
        }

        .session-info {
          flex: 1;
          font-size: 14px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-live {
          background: rgba(220, 38, 38, 0.2);
          color: #fca5a5;
        }

        .status-ended {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
        }

        .status-error {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
      `}</style>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
