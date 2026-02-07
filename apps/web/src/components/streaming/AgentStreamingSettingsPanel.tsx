"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

interface AgentStreamingSettingsPanelProps {
  agentId: string;
}

/**
 * Agent owner panel for configuring agent streaming settings
 * Allows agent owners to enable auto-streaming for their AI agents
 */
type StreamingPlatform = "twitch" | "youtube" | "custom" | "retake" | "x" | "pumpfun";

const PLATFORM_NEEDS_RTMP_URL: Record<string, boolean> = {
  x: true,
  pumpfun: true,
  custom: true,
};

const PLATFORM_LABELS: Record<StreamingPlatform, string> = {
  twitch: "Twitch",
  youtube: "YouTube",
  retake: "Retake.tv",
  x: "X (Twitter)",
  pumpfun: "Pump.fun",
  custom: "Custom RTMP",
};

const PLATFORM_ICONS: Record<StreamingPlatform, string> = {
  twitch: "\uD83D\uDFE3",
  youtube: "\uD83D\uDD34",
  retake: "\uD83D\uDCFA",
  x: "\u2715",
  pumpfun: "\uD83D\uDCA7",
  custom: "\u2699\uFE0F",
};

export function AgentStreamingSettingsPanel({ agentId }: AgentStreamingSettingsPanelProps) {
  const [platform, setPlatform] = useState<StreamingPlatform>("twitch");
  const [streamKey, setStreamKey] = useState("");
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const needsRtmpUrl = PLATFORM_NEEDS_RTMP_URL[platform] || false;

  // Get current config
  const config = useQuery(api.agents.streaming.getAgentStreamingConfig, {
    agentId: agentId as Id<"agents">,
  });

  // Get agent sessions
  const sessions = useQuery(api.streaming.sessions.getAgentSessions, {
    agentId: agentId as Id<"agents">,
    limit: 5,
  });

  const activeSession = sessions?.find((s) => s.status === "live" || s.status === "pending");

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate
      if (!streamKey && !config?.hasStreamKey) {
        throw new Error("Stream key is required to enable streaming");
      }

      if (needsRtmpUrl && !rtmpUrl && !config?.hasRtmpUrl) {
        throw new Error("RTMP URL is required for this platform");
      }

      // Save config via server API (encryption happens server-side)
      const response = await fetch("/api/streaming/configure-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          enabled: true,
          platform,
          streamKey: streamKey || undefined,
          rtmpUrl: needsRtmpUrl ? rtmpUrl : undefined,
          autoStart,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess(true);
      setStreamKey(""); // Clear for security
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/streaming/configure-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          enabled: false,
          autoStart: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disable streaming");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable streaming");
    } finally {
      setIsSaving(false);
    }
  };

  const isEnabled = config?.enabled || false;
  const currentPlatform = config?.platform || platform;

  return (
    <div className="agent-streaming-settings">
      <div className="header">
        <h2>🤖 Agent Auto-Streaming</h2>
        <p className="subtitle">
          Let your AI agent automatically stream its gameplay with decision overlays
        </p>
      </div>

      {error && (
        <div className="error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="success-message">
          <span>✅</span> Settings saved successfully!
        </div>
      )}

      {activeSession && (
        <div className="live-banner">
          <div className="live-indicator">
            <span className="live-dot" />
            <span>AGENT LIVE</span>
          </div>
          <p>Your agent is currently streaming</p>
          <p className="stream-info">
            Platform: {activeSession.platform}
            <br />
            Viewers: {activeSession.viewerCount || 0}
          </p>
        </div>
      )}

      <div className="config-section">
        <div className="toggle-section">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => {
                if (!e.target.checked) {
                  handleDisable();
                }
              }}
              disabled={isSaving}
            />
            <span>Enable Auto-Streaming</span>
          </label>
          <p className="help-text">
            When enabled, your agent will automatically stream every game it plays
          </p>
        </div>

        {isEnabled && (
          <>
            <div className="platform-selector">
              <label>Streaming Platform</label>
              <div className="platform-buttons">
                {(["twitch", "youtube", "x", "pumpfun", "retake", "custom"] as StreamingPlatform[]).map((p) => (
                  <button
                    key={p}
                    className={currentPlatform === p ? "active" : ""}
                    onClick={() => setPlatform(p)}
                    disabled={isSaving}
                  >
                    {PLATFORM_ICONS[p]} {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {needsRtmpUrl && (
              <div className="stream-key-section">
                <label>
                  RTMP URL {config?.hasRtmpUrl && <span className="saved-badge">Saved</span>}
                </label>
                <input
                  type="text"
                  placeholder={
                    config?.hasRtmpUrl
                      ? "Enter new URL to update"
                      : platform === "x"
                        ? "rtmp://... from Media Studio > Producer"
                        : platform === "pumpfun"
                          ? "rtmp://... from your coin page > Start Livestream"
                          : "rtmp://your-server.com/live"
                  }
                  value={rtmpUrl}
                  onChange={(e) => setRtmpUrl(e.target.value)}
                  disabled={isSaving}
                />
                <p className="help-text">
                  {platform === "x" && "Go to Media Studio > Producer > Create RTMP Source > Copy URL"}
                  {platform === "pumpfun" && "Go to your coin page > Start Livestream > Select RTMP > Copy URL"}
                  {platform === "custom" && "Enter your custom RTMP ingest URL"}
                  {config?.hasRtmpUrl && " • RTMP URL saved"}
                </p>
              </div>
            )}

            <div className="stream-key-section">
              <label>
                Stream Key {config?.hasStreamKey && <span className="saved-badge">Saved</span>}
              </label>
              <input
                type="password"
                placeholder={
                  config?.hasStreamKey
                    ? "Enter new key to update"
                    : platform === "twitch"
                      ? "Get from twitch.tv/dashboard/settings/stream"
                      : platform === "youtube"
                        ? "Get from studio.youtube.com"
                        : platform === "x"
                          ? "Get from Media Studio > Producer"
                          : platform === "pumpfun"
                            ? "Get from your coin page > Start Livestream"
                            : "Enter your stream key"
                }
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                disabled={isSaving}
              />
              <p className="help-text">
                {platform === "twitch" && (
                  <>
                    Get from{" "}
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
                    Get from{" "}
                    <a
                      href="https://studio.youtube.com/"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      YouTube Studio
                    </a>
                  </>
                )}
                {platform === "x" && "Copy stream key from Media Studio. Requires X Premium."}
                {platform === "pumpfun" && "Copy stream key from livestream settings. Must be token creator."}
                {platform === "retake" && "Stream key is provided via Retake.tv integration."}
                {platform === "custom" && "Enter the stream key for your RTMP server."}
                {config?.hasStreamKey && " • Stream key is encrypted and secure"}
              </p>
            </div>

            <div className="auto-start-section">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  disabled={isSaving}
                />
                <span>Auto-start streaming when games begin</span>
              </label>
              <p className="help-text">
                Agent will automatically go live when it joins a game lobby
              </p>
            </div>

            <div className="overlay-preview">
              <h3>What Gets Streamed</h3>
              <ul className="feature-list">
                <li>
                  <span className="icon">🎮</span>
                  Full game board view
                </li>
                <li>
                  <span className="icon">🧠</span>
                  AI decision reasoning (unique to agents!)
                </li>
                <li>
                  <span className="icon">📊</span>
                  Real-time strategy analysis
                </li>
                <li>
                  <span className="icon">⚡</span>
                  Turn-by-turn action breakdown
                </li>
                <li>
                  <span className="icon">📈</span>
                  Game events and stats ticker
                </li>
              </ul>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving || (!streamKey && !config?.hasStreamKey) || (needsRtmpUrl && !rtmpUrl && !config?.hasRtmpUrl)}
              className="btn-save"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </>
        )}
      </div>

      {sessions && sessions.length > 0 && (
        <div className="stream-history">
          <h3>Recent Agent Streams</h3>
          <ul>
            {sessions.slice(0, 5).map((session) => (
              <li key={session._id}>
                <span className="platform-icon">
                  {PLATFORM_ICONS[session.platform as StreamingPlatform] || "📺"}
                </span>
                <span className="session-info">
                  {new Date(session.createdAt).toLocaleDateString()}
                  {session.stats && ` • ${formatDuration(session.stats.duration)}`}
                  {session.stats && ` • ${session.stats.decisionsLogged} decisions`}
                </span>
                <span className={`status-badge status-${session.status}`}>{session.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .agent-streaming-settings {
          max-width: 700px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
        }

        .header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .subtitle {
          margin: 0 0 24px 0;
          opacity: 0.8;
        }

        .error-message,
        .success-message {
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .error-message {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          color: #fca5a5;
        }

        .success-message {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

        .live-banner {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
          border: 1px solid rgba(220, 38, 38, 0.4);
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin-bottom: 24px;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #dc2626;
          border-radius: 8px;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .live-dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .stream-info {
          margin-top: 12px;
          opacity: 0.8;
          font-size: 14px;
          line-height: 1.6;
        }

        .config-section {
          margin-bottom: 24px;
        }

        .toggle-section,
        .auto-start-section {
          margin-bottom: 24px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-weight: 600;
        }

        .toggle-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
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
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.5);
        }

        .platform-buttons button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }

        .platform-buttons button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .stream-key-section {
          margin-bottom: 20px;
        }

        .stream-key-section label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .saved-badge {
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .stream-key-section input {
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
          line-height: 1.4;
        }

        .help-text a {
          color: #a78bfa;
          text-decoration: none;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .overlay-preview {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .overlay-preview h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .feature-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          font-size: 14px;
        }

        .feature-list .icon {
          font-size: 20px;
        }

        .btn-save {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-save:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .status-pending {
          background: rgba(251, 191, 36, 0.2);
          color: #fcd34d;
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
