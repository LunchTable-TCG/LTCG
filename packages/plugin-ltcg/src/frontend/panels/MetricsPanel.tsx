/**
 * Metrics Panel
 *
 * Displays agent performance analytics including:
 * - Win/loss record and win rate
 * - Performance stats (avg turn time, actions per turn)
 * - API call statistics
 * - Recent games history
 */

import React from "react";
import { EmptyState, ErrorState, LoadingState, StatCard } from "../components";
import { useMetrics } from "../hooks";
import { cn } from "../utils";

interface MetricsPanelProps {
  agentId: string;
}

/**
 * Win rate progress bar
 */
const WinRateBar = React.memo(function WinRateBar({ winRate }: { winRate: number }) {
  const percentage = Math.round(winRate * 100);
  const color = winRate >= 0.6 ? "bg-green-500" : winRate >= 0.4 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Win Rate</span>
        <span className="font-bold tabular-nums">{percentage}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

/**
 * Performance metric row
 */
const MetricRow = React.memo(function MetricRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">
        {value}
        {unit && <span className="text-muted-foreground ml-1">{unit}</span>}
      </span>
    </div>
  );
});

/**
 * Metrics Panel Component
 */
export function MetricsPanel({ agentId }: MetricsPanelProps) {
  const { data: metrics, isLoading, error, refetch } = useMetrics(agentId);

  if (isLoading) {
    return <LoadingState message="Loading performance metrics..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load metrics"}
        onRetry={() => refetch()}
      />
    );
  }

  if (!metrics) {
    return <EmptyState title="No metrics data" description="Metrics not available" />;
  }

  const hasGames = metrics.lifetime.gamesPlayed > 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Performance Metrics</h2>
        <span className="text-xs text-muted-foreground">Updates every 10s</span>
      </div>

      {/* Lifetime Stats */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-muted-foreground">Lifetime Statistics</h3>

        {hasGames ? (
          <>
            {/* Win/Loss Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Games Played"
                value={metrics.lifetime.gamesPlayed}
                variant="default"
              />
              <StatCard label="Wins" value={metrics.lifetime.wins} variant="success" />
              <StatCard label="Losses" value={metrics.lifetime.losses} variant="default" />
            </div>

            {/* Win Rate Bar */}
            <div className="p-4 rounded-lg border border-border bg-card">
              <WinRateBar winRate={metrics.lifetime.winRate} />
            </div>
          </>
        ) : (
          <EmptyState
            title="No games played yet"
            description="Start playing to see your stats"
            className="py-6"
          />
        )}
      </div>

      {/* Performance Metrics */}
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium text-muted-foreground">Performance</h3>

        <div className="rounded-lg border border-border bg-card p-4">
          <MetricRow label="Avg Turn Time" value={metrics.performance.avgTurnTimeMs} unit="ms" />
          <MetricRow label="Avg Actions Per Turn" value={metrics.performance.avgActionsPerTurn} />
          <MetricRow label="API Call Count" value={metrics.performance.apiCallCount} />
          <MetricRow
            label="API Error Rate"
            value={`${Math.round(metrics.performance.apiErrorRate * 100)}%`}
          />
        </div>
      </div>

      {/* Recent Games */}
      {metrics.recentGames && metrics.recentGames.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">Recent Games</h3>

          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Game ID</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Result</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Turns</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Duration</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentGames.map((game) => (
                  <tr key={game.gameId} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{game.gameId.slice(0, 12)}...</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "px-2 py-1 rounded text-xs font-medium",
                          game.result === "win"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        )}
                      >
                        {game.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 tabular-nums">{game.turns}</td>
                    <td className="p-3 tabular-nums">{Math.round(game.duration / 1000)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Story Mode Progress (if available) */}
      {metrics.storyMode && (
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-medium text-muted-foreground">Story Mode</h3>

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Battle</span>
              <span className="text-sm font-medium">{metrics.storyMode.currentBattle}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Battles Completed</span>
              <span className="text-sm font-medium">{metrics.storyMode.battlesCompleted}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(metrics.storyMode.progress * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${metrics.storyMode.progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
