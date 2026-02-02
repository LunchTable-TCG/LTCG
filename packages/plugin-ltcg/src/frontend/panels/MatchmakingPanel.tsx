/**
 * Matchmaking Panel
 *
 * Displays real-time auto-matchmaking activity including:
 * - Matchmaking status (idle, scanning, in_game)
 * - Statistics (lobbies scanned, joins, games started)
 * - Recent join events feed
 * - Next scan countdown
 */

import React from "react";
import { EmptyState, ErrorState, LoadingState, StatCard, StatusBadge } from "../components";
import { useMatchmakingStatus } from "../hooks";

interface MatchmakingPanelProps {
  agentId: string;
}

/**
 * Format timestamp to relative time (e.g., "2m ago")
 */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get status label from matchmaking status
 */
function getStatusLabel(status: string, enabled: boolean): string {
  if (!enabled) return "DISABLED";

  switch (status) {
    case "scanning":
      return "SCANNING";
    case "in_game":
      return "IN GAME";
    case "joining":
      return "JOINING";
    default:
      return "IDLE";
  }
}

/**
 * Countdown timer component
 */
const CountdownTimer = React.memo(function CountdownTimer({ nextScanIn }: { nextScanIn: number }) {
  const [timeLeft, setTimeLeft] = React.useState(Math.ceil(nextScanIn / 1000));

  React.useEffect(() => {
    setTimeLeft(Math.ceil(nextScanIn / 1000));

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [nextScanIn]);

  if (timeLeft <= 0) {
    return <span className="text-muted-foreground">Scanning...</span>;
  }

  return (
    <span className="tabular-nums">
      Next scan in: <span className="font-medium text-foreground">{timeLeft}s</span>
    </span>
  );
});

/**
 * Matchmaking Panel Component
 */
export function MatchmakingPanel({ agentId }: MatchmakingPanelProps) {
  const { data, isLoading, error, refetch } = useMatchmakingStatus(agentId);

  if (isLoading) {
    return <LoadingState message="Loading matchmaking status..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load matchmaking status"}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState title="No matchmaking data" description="Matchmaking service not available" />
    );
  }

  const statusLabel = getStatusLabel(data.status, data.enabled);
  const hasRecentJoins = data.recentJoins && data.recentJoins.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Auto-Matchmaking</h2>
        <StatusBadge variant={data.status as any} label={statusLabel} />
      </div>

      {/* Statistics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Lobbies Scanned" value={data.lobbiesScanned} variant="default" />
        <StatCard label="Total Joins" value={data.stats.lobbiesJoined} variant="primary" />
        <StatCard label="Games Started" value={data.stats.gamesStarted} variant="success" />
      </div>

      {/* Recent joins section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">Recent Joins</h3>

        {hasRecentJoins ? (
          <div className="flex flex-col gap-2">
            {data.recentJoins.slice(0, 10).map((event, index) => (
              <div
                key={`${event.lobbyId}-${event.timestamp}-${index}`}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors min-h-[60px]"
              >
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="text-muted-foreground">vs </span>
                    <span className="font-medium truncate">{event.hostUsername}</span>
                  </div>
                  {event.gameId && (
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      Game: {event.gameId.slice(0, 12)}...
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatRelativeTime(event.timestamp)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No recent joins"
            description="Auto-matchmaking activity will appear here"
            className="py-8"
          />
        )}
      </div>

      {/* Next scan countdown */}
      {data.enabled && data.status === "scanning" && (
        <div className="flex items-center justify-center p-4 rounded-lg bg-muted/30 border border-border">
          <div className="text-sm text-muted-foreground">
            <CountdownTimer nextScanIn={data.nextScanIn} />
          </div>
        </div>
      )}

      {/* Disabled state message */}
      {!data.enabled && (
        <div className="flex items-center justify-center p-6 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Auto-matchmaking is currently disabled
          </p>
        </div>
      )}
    </div>
  );
}
