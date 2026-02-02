/**
 * Decision Stream Panel
 *
 * Displays real-time AI decision feed including:
 * - Scrolling decision cards
 * - Filter by action type
 * - Auto-scroll toggle
 * - Success/failure indicators
 */

import React from 'react';
import { useAgentStatus, useDecisionHistory } from '../hooks';
import { DecisionCard, LoadingState, ErrorState, EmptyState } from '../components';
import { cn } from '../utils';

interface DecisionStreamProps {
  agentId: string;
}

/**
 * Action filter button
 */
const FilterButton = React.memo(function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 text-xs rounded-full border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:bg-accent'
      )}
    >
      {label}
    </button>
  );
});

/**
 * Decision Stream Panel Component
 */
export function DecisionStream({ agentId }: DecisionStreamProps) {
  const { data: agentStatus } = useAgentStatus(agentId);
  const gameId = agentStatus?.currentGameId ?? null;

  const { data, isLoading, error, refetch } = useDecisionHistory(agentId, gameId, 50);

  const [filterAction, setFilterAction] = React.useState<string | null>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new decisions arrive
  React.useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.decisions, autoScroll]);

  if (!gameId) {
    return (
      <EmptyState
        title="No active game"
        description="Start a game to see AI decisions"
        className="py-16"
      />
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading decision history..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load decision history'}
        onRetry={() => refetch()}
      />
    );
  }

  const decisions = data?.decisions ?? [];
  const filteredDecisions = filterAction
    ? decisions.filter((d) => d.action === filterAction)
    : decisions;

  // Get unique action types for filter buttons
  const actionTypes = Array.from(new Set(decisions.map((d) => d.action)));

  // Calculate success rate
  const successCount = decisions.filter((d) => d.result === 'success').length;
  const successRate = decisions.length > 0 ? Math.round((successCount / decisions.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto h-full">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">AI Decision Stream</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Success Rate:</span>
            <span className={cn('text-sm font-bold', successRate >= 80 ? 'text-green-400' : 'text-yellow-400')}>
              {successRate}%
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          Game: {gameId.slice(0, 12)}... • {filteredDecisions.length} decisions
        </div>
      </div>

      {/* Filters and controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Filter by Action</h3>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            Auto-scroll
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FilterButton label="All" active={filterAction === null} onClick={() => setFilterAction(null)} />
          {actionTypes.map((action) => (
            <FilterButton
              key={action}
              label={action.replace(/_/g, ' ')}
              active={filterAction === action}
              onClick={() => setFilterAction(action)}
            />
          ))}
        </div>
      </div>

      {/* Decision feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card/30 p-3 sm:p-4 space-y-3 min-h-[300px] sm:min-h-[400px] max-h-[600px]"
      >
        {filteredDecisions.length > 0 ? (
          filteredDecisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))
        ) : (
          <EmptyState
            title={filterAction ? 'No matching decisions' : 'No decisions yet'}
            description={filterAction ? 'Try selecting a different filter' : 'AI decisions will appear here'}
            className="py-16"
          />
        )}
      </div>

      {/* Summary stats */}
      {decisions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg border border-border bg-card">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold">{decisions.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Success</span>
            <span className="text-lg font-bold text-green-400">{successCount}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Failed</span>
            <span className="text-lg font-bold text-red-400">
              {decisions.filter((d) => d.result === 'failed').length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Avg Time</span>
            <span className="text-lg font-bold tabular-nums">
              {Math.round(decisions.reduce((sum, d) => sum + d.executionTimeMs, 0) / decisions.length)}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
