"use client";

import { useUserStreams, useAgentStreams } from "@/hooks/useStreaming";
import Link from "next/link";

interface StreamStatusWidgetProps {
  userId?: string;
  agentId?: string;
  variant?: "minimal" | "full";
}

/**
 * Compact widget showing stream status
 * Can be placed in navbar, header, or sidebar
 */
export function StreamStatusWidget({ userId, agentId, variant = "minimal" }: StreamStatusWidgetProps) {
  const { activeSession: userStream } = useUserStreams(userId);
  const { activeSession: agentStream } = useAgentStreams(agentId);

  const activeStream = userStream || agentStream;

  if (!activeStream) {
    return null;
  }

  const isLive = activeStream.status === "live";
  const isPending = activeStream.status === "pending" || activeStream.status === "initializing";

  const statusText = isPending ? "Starting..." : "LIVE";
  const platformEmoji = activeStream.platform === "twitch" ? "🟣" : "🔴";

  if (variant === "minimal") {
    return (
      <Link href="/streaming" className="stream-status-widget minimal">
        <span className="live-dot" style={{ background: isPending ? "#f59e0b" : "#dc2626" }} />
        <span className="status-text">{statusText}</span>
        <style jsx>{`
          .stream-status-widget.minimal {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: ${isPending ? "rgba(251, 191, 36, 0.1)" : "rgba(220, 38, 38, 0.1)"};
            border: 1px solid ${isPending ? "rgba(251, 191, 36, 0.3)" : "rgba(220, 38, 38, 0.3)"};
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-decoration: none;
            color: ${isPending ? "#fcd34d" : "#fca5a5"};
            transition: all 0.2s;
          }

          .stream-status-widget.minimal:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px ${isPending ? "rgba(251, 191, 36, 0.2)" : "rgba(220, 38, 38, 0.2)"};
          }

          .live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            animation: ${isLive ? "blink" : "pulse"} 1s ease-in-out infinite;
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

          .status-text {
            font-size: 11px;
            letter-spacing: 0.5px;
          }
        `}</style>
      </Link>
    );
  }

  return (
    <Link href="/streaming" className="stream-status-widget full">
      <div className="widget-header">
        <span className="live-indicator">
          <span className="live-dot" />
          <span>{statusText}</span>
        </span>
        <span className="platform">{platformEmoji}</span>
      </div>
      <div className="widget-content">
        <p className="stream-title">{activeStream.streamTitle}</p>
        {isLive && (
          <p className="viewer-count">
            👁️ {activeStream.viewerCount || 0} {activeStream.viewerCount === 1 ? "viewer" : "viewers"}
          </p>
        )}
      </div>
      <style jsx>{`
        .stream-status-widget.full {
          display: block;
          padding: 12px;
          background: linear-gradient(
            135deg,
            ${isPending ? "rgba(251, 191, 36, 0.1)" : "rgba(220, 38, 38, 0.1)"} 0%,
            ${isPending ? "rgba(245, 158, 11, 0.1)" : "rgba(185, 28, 28, 0.1)"} 100%
          );
          border: 1px solid
            ${isPending ? "rgba(251, 191, 36, 0.3)" : "rgba(220, 38, 38, 0.3)"};
          border-radius: 12px;
          text-decoration: none;
          color: white;
          transition: all 0.2s;
        }

        .stream-status-widget.full:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px
            ${isPending ? "rgba(251, 191, 36, 0.2)" : "rgba(220, 38, 38, 0.2)"};
        }

        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .live-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: ${isPending ? "#f59e0b" : "#dc2626"};
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: ${isLive ? "blink" : "pulse"} 1s ease-in-out infinite;
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

        .platform {
          font-size: 18px;
        }

        .widget-content {
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stream-title {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .viewer-count {
          margin: 0;
          font-size: 12px;
          opacity: 0.8;
        }
      `}</style>
    </Link>
  );
}
