/**
 * Metrics Panel
 *
 * Displays agent operational metrics including:
 * - Agent status (running/stopped)
 * - Polling activity
 * - Current game status
 * - Uptime information
 */

import { EmptyState, ErrorState, LoadingState, StatCard } from "../components";
import { useAgentStatus } from "../hooks";
import { cn } from "../utils";

interface MetricsPanelProps {
  agentId: string;
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 1000) {
    return "Just now";
  }
  if (diff < 60000) {
    return `${Math.floor(diff / 1000)}s ago`;
  }
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}m ago`;
  }
  return `${Math.floor(diff / 3600000)}h ago`;
}

/**
 * Metrics Panel Component
 */
export function MetricsPanel({ agentId }: MetricsPanelProps) {
  const { data: agentStatus, isLoading, error, refetch } = useAgentStatus(agentId);

  if (isLoading) {
    return <LoadingState message="Loading metrics..." />;
  }

  if (error) {
    return (
      <ErrorState
        message="Failed to load metrics"
        onRetry={() => refetch()}
      />
    );
  }

  if (!agentStatus) {
    return (
      <EmptyState
        title="No agent data"
        description="Agent status not available"
        className="py-16"
      />
    );
  }

  const isInGame = !!agentStatus.currentGameId;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Agent Metrics</h2>
        <div
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            agentStatus.isRunning
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          )}
        >
          {agentStatus.isRunning ? "Running" : "Stopped"}
        </div>
      </div>

      {/* Operational Statistics */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-3">Operational Status</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Uptime"
            value={formatUptime(agentStatus.uptime)}
            variant={agentStatus.isRunning ? "success" : "default"}
          />
          <StatCard
            label="Polling"
            value={agentStatus.pollingActive ? "Active" : "Inactive"}
            variant={agentStatus.pollingActive ? "success" : "warning"}
          />
          <StatCard
            label="Auto-Match"
            value={agentStatus.autoMatchmaking ? "Enabled" : "Disabled"}
            variant={agentStatus.autoMatchmaking ? "primary" : "default"}
          />
          <StatCard
            label="Last Activity"
            value={formatRelativeTime(agentStatus.lastActivity)}
          />
        </div>
      </div>

      {/* Current Game */}
      {isInGame && agentStatus.currentGameId && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Current Game</h3>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Game ID</span>
              <span className="text-sm font-mono text-white">
                {agentStatus.currentGameId.slice(0, 12)}...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              isInGame
                ? "bg-green-500 animate-pulse"
                : agentStatus.pollingActive
                  ? "bg-blue-500 animate-pulse"
                  : "bg-gray-500"
            )}
          />
          <span className="text-sm text-gray-300">
            {isInGame
              ? "Currently playing a game"
              : agentStatus.pollingActive
                ? "Scanning for games..."
                : "Idle - waiting for activity"}
          </span>
        </div>
      </div>
    </div>
  );
}
