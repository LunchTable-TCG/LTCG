"use client";

const PLATFORM_BADGE: Record<string, { label: string; color: string; icon: string }> = {
  twitch: { label: "Twitch", color: "#9146FF", icon: "\uD83D\uDFE3" },
  youtube: { label: "YouTube", color: "#FF0000", icon: "\uD83D\uDD34" },
  retake: { label: "Retake.tv", color: "#00D4AA", icon: "\uD83D\uDCFA" },
  x: { label: "X", color: "#1DA1F2", icon: "\u2715" },
  pumpfun: { label: "Pump.fun", color: "#00E676", icon: "\uD83D\uDCA7" },
  custom: { label: "RTMP", color: "#888888", icon: "\u2699\uFE0F" },
};

interface StreamerInfoPanelProps {
  name: string;
  avatar?: string;
  streamType: "user" | "agent";
  platform: string;
}

export function StreamerInfoPanel({ name, avatar, streamType, platform }: StreamerInfoPanelProps) {
  const displayName = name || (streamType === "agent" ? "AI Agent" : "Player");
  const badge = PLATFORM_BADGE[platform];

  return (
    <div className="streamer-info">
      <div className="streamer-info__left">
        {avatar && (
          <img src={avatar} alt={displayName} className="streamer-info__avatar" />
        )}
        <div className="streamer-info__details">
          <h1 className="streamer-info__name">{displayName}</h1>
        </div>
      </div>

      <div className="streamer-info__right">
        {badge && (
          <span
            className="streamer-info__platform"
            style={{ borderColor: `${badge.color}66`, color: badge.color }}
          >
            {badge.icon} {badge.label}
          </span>
        )}
        <span className="streamer-info__live">
          <span className="live-dot" />
          <span className="live-text">LIVE</span>
        </span>
      </div>

      <style jsx>{`
        .streamer-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 32px;
          background: linear-gradient(180deg, rgba(38, 31, 28, 0.95) 0%, rgba(26, 22, 20, 0.98) 100%);
          border-bottom: 2px solid rgba(139, 69, 19, 0.4);
          box-shadow: inset 0 1px 0 rgba(212, 175, 55, 0.1), 0 4px 20px rgba(0, 0, 0, 0.6);
        }

        .streamer-info__left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .streamer-info__avatar {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid #d4af37;
          box-shadow: 0 0 12px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .streamer-info__details {
          display: flex;
          flex-direction: column;
        }

        .streamer-info__name {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #e8e0d5;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.2);
          font-family: var(--font-cinzel), serif;
        }

        .streamer-info__right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .streamer-info__platform {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border: 1px solid;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .streamer-info__live {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: linear-gradient(180deg, rgba(139, 0, 0, 0.2) 0%, rgba(139, 0, 0, 0.3) 100%);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 4px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(239, 68, 68, 0.2);
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
          animation: pulse 2s ease-in-out infinite;
        }

        .live-text {
          font-size: 12px;
          font-weight: 700;
          color: #ef4444;
          text-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
          letter-spacing: 1px;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
