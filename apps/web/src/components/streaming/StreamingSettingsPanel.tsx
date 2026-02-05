"use client";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";

interface StreamingSettingsPanelProps {
  userId: string;
}

/**
 * User-facing panel for configuring streaming settings
 * Allows users to connect their Twitch/YouTube accounts and manage streams
 */
export function StreamingSettingsPanel({ userId }: StreamingSettingsPanelProps) {
  const [platform, setPlatform] = useState<"twitch" | "youtube">("twitch");
  const [streamKey, setStreamKey] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get user's streaming sessions
  const sessions = useQuery(api.streaming.sessions.getUserSessions, {
    userId: userId as any,
    limit: 5,
  });

  const activeSession = sessions?.find((s) => s.status === "live");

  const startStream = async () => {
    setError(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/streaming/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          streamType: "user",
          platform,
          streamKey,
          streamTitle: `${platform === "twitch" ? "Twitch" : "YouTube"} Stream`,
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
        headers: { "Content-Type": "application/json" },
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
      <p className="subtitle">Broadcast your LTCG matches live to Twitch or YouTube</p>

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
          <button onClick={stopStream} className="btn-stop">
            Stop Streaming
          </button>
        </div>
      ) : (
        <div className="stream-setup">
          <div className="platform-selector">
            <label>Platform</label>
            <div className="platform-buttons">
              <button
                className={platform === "twitch" ? "active" : ""}
                onClick={() => setPlatform("twitch")}
              >
                🟣 Twitch
              </button>
              <button
                className={platform === "youtube" ? "active" : ""}
                onClick={() => setPlatform("youtube")}
              >
                🔴 YouTube
              </button>
            </div>
          </div>

          <div className="stream-key-input">
            <label>Stream Key</label>
            <input
              type="password"
              placeholder={
                platform === "twitch"
                  ? "Get from twitch.tv/dashboard/settings/stream"
                  : "Get from studio.youtube.com"
              }
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
            />
            <p className="help-text">
              {platform === "twitch" ? (
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
              ) : (
                <>
                  Get your stream key from{" "}
                  <a href="https://studio.youtube.com/" target="_blank" rel="noreferrer noopener">
                    YouTube Studio
                  </a>
                </>
              )}
            </p>
          </div>

          <button onClick={startStream} disabled={!streamKey || isStreaming} className="btn-start">
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
                <span className="platform-icon">{session.platform === "twitch" ? "🟣" : "🔴"}</span>
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
          gap: 12px;
        }

        .platform-buttons button {
          flex: 1;
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
