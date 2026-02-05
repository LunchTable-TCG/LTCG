"use client";

import { useUserStreams, useAgentStreams } from "@/hooks/useStreaming";

interface StreamAnalyticsDashboardProps {
  userId?: string;
  agentId?: string;
  limit?: number;
}

/**
 * Comprehensive analytics dashboard for stream statistics
 */
export function StreamAnalyticsDashboard({
  userId,
  agentId,
  limit = 20,
}: StreamAnalyticsDashboardProps) {
  const { sessions: userSessions, activeSession: userActive } = useUserStreams(userId, limit);
  const { sessions: agentSessions, activeSession: agentActive } = useAgentStreams(agentId, limit);

  const sessions = userId ? userSessions : agentSessions;
  const activeSession = userActive || agentActive;

  if (!sessions) {
    return (
      <div className="analytics-loading">
        <p>Loading analytics...</p>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalStreams = sessions.length;
  const completedStreams = sessions.filter((s) => s.status === "ended").length;
  const totalDuration = sessions
    .filter((s) => s.stats?.duration)
    .reduce((sum, s) => sum + (s.stats?.duration || 0), 0);
  const totalViewers = sessions.reduce((sum, s) => sum + (s.peakViewerCount || 0), 0);
  const avgViewers = completedStreams > 0 ? Math.round(totalViewers / completedStreams) : 0;

  return (
    <div className="stream-analytics-dashboard">
      <h2>📊 Stream Analytics</h2>

      {activeSession && (
        <div className="active-stream-card">
          <div className="card-header">
            <span className="live-badge">LIVE NOW</span>
            <span className="platform-icon">
              {activeSession.platform === "twitch" ? "🟣" : "🔴"}
            </span>
          </div>
          <h3>{activeSession.streamTitle}</h3>
          <div className="live-stats">
            <div className="stat">
              <span className="stat-label">Current Viewers</span>
              <span className="stat-value">{activeSession.viewerCount || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Peak Viewers</span>
              <span className="stat-value">{activeSession.peakViewerCount || 0}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">
                {activeSession.startedAt
                  ? formatDuration(Date.now() - activeSession.startedAt)
                  : "Starting..."}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎥</div>
          <div className="stat-content">
            <div className="stat-value-large">{totalStreams}</div>
            <div className="stat-label">Total Streams</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value-large">{formatDuration(totalDuration)}</div>
            <div className="stat-label">Total Streaming Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <div className="stat-value-large">{avgViewers}</div>
            <div className="stat-label">Avg Peak Viewers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value-large">{completedStreams}</div>
            <div className="stat-label">Completed Streams</div>
          </div>
        </div>
      </div>

      <div className="stream-history-section">
        <h3>Recent Streams</h3>
        {sessions.length === 0 ? (
          <p className="empty-state">No streams yet. Start streaming to see analytics!</p>
        ) : (
          <div className="stream-list">
            {sessions.map((session) => (
              <div key={session._id} className="stream-item">
                <div className="stream-item-header">
                  <span className="platform-icon">
                    {session.platform === "twitch" ? "🟣" : "🔴"}
                  </span>
                  <span className="stream-title">{session.streamTitle}</span>
                  <span className={`status-badge status-${session.status}`}>{session.status}</span>
                </div>
                <div className="stream-item-stats">
                  <span className="stat-chip">
                    📅 {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                  {session.stats?.duration && (
                    <span className="stat-chip">⏱️ {formatDuration(session.stats.duration)}</span>
                  )}
                  {session.peakViewerCount !== undefined && (
                    <span className="stat-chip">👁️ {session.peakViewerCount} peak</span>
                  )}
                  {agentId && session.stats?.decisionsLogged && (
                    <span className="stat-chip">
                      🧠 {session.stats.decisionsLogged} decisions
                    </span>
                  )}
                </div>
                {session.errorMessage && (
                  <div className="error-message-sm">
                    <span>⚠️</span> {session.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .stream-analytics-dashboard {
          padding: 24px;
        }

        h2 {
          margin: 0 0 24px 0;
          font-size: 28px;
        }

        .active-stream-card {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
          border: 1px solid rgba(220, 38, 38, 0.4);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #dc2626;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .live-badge::before {
          content: "";
          width: 8px;
          height: 8px;
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

        .platform-icon {
          font-size: 24px;
        }

        .active-stream-card h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
        }

        .live-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value-large {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 12px;
          opacity: 0.7;
          margin-bottom: 4px;
        }

        .stat-value {
          display: block;
          font-size: 24px;
          font-weight: 700;
        }

        .stream-history-section {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 20px;
        }

        .stream-history-section h3 {
          margin: 0 0 16px 0;
          font-size: 20px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          opacity: 0.6;
        }

        .stream-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stream-item {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .stream-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .stream-item-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .stream-item .platform-icon {
          font-size: 20px;
        }

        .stream-title {
          flex: 1;
          font-weight: 600;
          font-size: 14px;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
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

        .stream-item-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stat-chip {
          padding: 4px 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          font-size: 12px;
          opacity: 0.8;
        }

        .error-message-sm {
          margin-top: 8px;
          padding: 8px;
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 4px;
          font-size: 12px;
          color: #fca5a5;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .analytics-loading {
          padding: 60px 24px;
          text-align: center;
          opacity: 0.6;
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
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
