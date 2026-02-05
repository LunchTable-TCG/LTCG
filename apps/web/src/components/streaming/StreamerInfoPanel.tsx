"use client";

interface StreamerInfoPanelProps {
  name: string;
  avatar?: string;
  streamType: "user" | "agent";
  platform: string;
}

export function StreamerInfoPanel({
  name,
  avatar,
  streamType,
  platform,
}: StreamerInfoPanelProps) {
  const platformIcon = {
    twitch: "🟣",
    youtube: "🔴",
    custom: "📡",
  }[platform] || "📺";

  return (
    <div className="streamer-info">
      <div className="streamer-info__left">
        {avatar ? (
          <img src={avatar} alt={name} className="streamer-info__avatar" />
        ) : (
          <div className="streamer-info__avatar streamer-info__avatar--placeholder">
            {streamType === "agent" ? "🤖" : "👤"}
          </div>
        )}
        <div className="streamer-info__details">
          <h1 className="streamer-info__name">{name}</h1>
          <span className="streamer-info__badge">
            {streamType === "agent" ? "🤖 AI Agent" : "🎮 Live Player"}
          </span>
        </div>
      </div>

      <div className="streamer-info__right">
        <span className="streamer-info__platform">
          {platformIcon} {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </span>
        <span className="streamer-info__live">
          <span className="live-dot" /> LIVE
        </span>
      </div>

      <style jsx>{`
        .streamer-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
        }

        .streamer-info__left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .streamer-info__avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.2);
        }

        .streamer-info__avatar--placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          background: rgba(255, 255, 255, 0.1);
        }

        .streamer-info__details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .streamer-info__name {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
        }

        .streamer-info__badge {
          font-size: 16px;
          opacity: 0.8;
        }

        .streamer-info__right {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .streamer-info__platform {
          font-size: 18px;
          opacity: 0.8;
        }

        .streamer-info__live {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #e91e63;
          border-radius: 8px;
          font-weight: 700;
          font-size: 18px;
        }

        .live-dot {
          width: 10px;
          height: 10px;
          background: white;
          border-radius: 50%;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
