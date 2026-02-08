"use client";

import { useSessionDestinationHealth, useStreamStatus } from "@/hooks/useStreaming";
import { STREAMING_PLATFORM_META, type StreamingPlatform } from "@/lib/streaming/platforms";
import type { DestinationStatus } from "@/lib/streaming/types";

interface ChannelHealthPanelProps {
  sessionId?: string;
}

function statusLabel(status: DestinationStatus) {
  switch (status) {
    case "active":
      return "Healthy";
    case "failed":
      return "Failed";
    case "removed":
      return "Removed";
    case "primary":
      return "Primary";
    default:
      return "Unknown";
  }
}

function statusClass(status: DestinationStatus) {
  switch (status) {
    case "active":
      return "status status--active";
    case "failed":
      return "status status--failed";
    case "removed":
      return "status status--removed";
    case "primary":
      return "status status--primary";
    default:
      return "status";
  }
}

export function ChannelHealthPanel({ sessionId }: ChannelHealthPanelProps) {
  const { session } = useStreamStatus(sessionId);
  const { destinations, hasFailures, isLoading } = useSessionDestinationHealth(sessionId);

  if (!sessionId) {
    return (
      <div className="channel-health-panel">
        <h3>Channel Health</h3>
        <p className="muted">Start a stream to see destination telemetry.</p>
        <style jsx>{baseStyles}</style>
      </div>
    );
  }

  const primaryPlatform = (session?.platform || "custom") as StreamingPlatform;
  const primaryMeta = STREAMING_PLATFORM_META[primaryPlatform];
  const activeCount = destinations.filter((destination) => destination.status === "active").length;
  const failedCount = destinations.filter((destination) => destination.status === "failed").length;

  return (
    <div className="channel-health-panel" data-testid="channel-health-panel">
      <div className="panel-header">
        <h3>Channel Health</h3>
        <p className="muted">Session {sessionId}</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="label">Session</span>
          <strong>{session?.status?.toUpperCase() || "..."}</strong>
        </div>
        <div className="summary-card">
          <span className="label">Active Outputs</span>
          <strong>{activeCount + (session?.status === "live" ? 1 : 0)}</strong>
        </div>
        <div className="summary-card">
          <span className="label">Failed Outputs</span>
          <strong className={failedCount > 0 ? "text-error" : ""}>{failedCount}</strong>
        </div>
      </div>

      <ul className="destinations-list">
        <li className="destination-row destination-row--primary">
          <div className="destination-main">
            <span className="icon">{primaryMeta?.icon || "RTMP"}</span>
            <div>
              <p className="title">{primaryMeta?.label || primaryPlatform} (Primary)</p>
              <p className="endpoint">Managed by session stream start</p>
            </div>
          </div>
          <span className={statusClass("primary")}>{statusLabel("primary")}</span>
        </li>

        {destinations.map((destination) => {
          const meta = STREAMING_PLATFORM_META[destination.platform] || {
            icon: "RTMP",
            label: destination.platform,
          };
          const updated = new Date(destination.lastUpdatedAt).toLocaleTimeString();
          return (
            <li key={destination.platform} className="destination-row">
              <div className="destination-main">
                <span className="icon">{meta.icon}</span>
                <div>
                  <p className="title">{meta.label}</p>
                  <p className="endpoint" title={destination.endpoint}>
                    {destination.endpoint}
                  </p>
                  <p className="meta">
                    Attempts: {destination.attempts} · Retries: {destination.retryCount} · Updated:{" "}
                    {updated}
                  </p>
                  {destination.lastError && (
                    <p className="error-text">Last error: {destination.lastError}</p>
                  )}
                </div>
              </div>
              <span className={statusClass(destination.status)}>
                {statusLabel(destination.status)}
              </span>
            </li>
          );
        })}
      </ul>

      {isLoading && <p className="muted">Loading destination telemetry...</p>}
      {!isLoading && destinations.length === 0 && (
        <p className="muted">No secondary destinations configured yet.</p>
      )}
      {hasFailures && (
        <p className="warning">
          One or more destinations failed. Re-add the destination with a fresh stream key/RTMP URL.
        </p>
      )}

      <style jsx>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .channel-health-panel {
    border: 1px solid rgba(139, 69, 19, 0.45);
    background: linear-gradient(180deg, rgba(24, 17, 14, 0.96), rgba(14, 10, 8, 0.96));
    border-radius: 14px;
    padding: 16px;
    color: #e8e0d5;
  }

  .panel-header h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 800;
  }

  .muted {
    margin: 0;
    color: #a89f94;
    font-size: 12px;
  }

  .summary-grid {
    margin-top: 12px;
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .summary-card {
    border: 1px solid rgba(95, 68, 50, 0.7);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.25);
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .summary-card .label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #a89f94;
  }

  .summary-card strong {
    font-size: 14px;
  }

  .summary-card .text-error {
    color: #f87171;
  }

  .destinations-list {
    margin: 14px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .destination-row {
    border: 1px solid rgba(95, 68, 50, 0.6);
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.22);
    padding: 10px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .destination-row--primary {
    border-color: rgba(212, 175, 55, 0.45);
    background: rgba(212, 175, 55, 0.08);
  }

  .destination-main {
    display: flex;
    gap: 10px;
    min-width: 0;
  }

  .icon {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid rgba(212, 175, 55, 0.5);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: #d4af37;
    flex-shrink: 0;
  }

  .title {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
  }

  .endpoint,
  .meta,
  .error-text {
    margin: 2px 0 0;
    font-size: 11px;
    line-height: 1.35;
  }

  .endpoint {
    color: #c7b8a4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 260px;
  }

  .meta {
    color: #a89f94;
  }

  .error-text {
    color: #fca5a5;
  }

  .status {
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 10px;
    line-height: 1;
    height: fit-content;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .status--active {
    color: #86efac;
    background: rgba(22, 163, 74, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.45);
  }

  .status--failed {
    color: #fca5a5;
    background: rgba(185, 28, 28, 0.25);
    border: 1px solid rgba(248, 113, 113, 0.45);
  }

  .status--removed {
    color: #d4d4d8;
    background: rgba(82, 82, 91, 0.3);
    border: 1px solid rgba(161, 161, 170, 0.45);
  }

  .status--primary {
    color: #fcd34d;
    background: rgba(217, 119, 6, 0.2);
    border: 1px solid rgba(251, 191, 36, 0.45);
  }

  .warning {
    margin: 12px 0 0;
    font-size: 11px;
    color: #fcd34d;
  }
`;
