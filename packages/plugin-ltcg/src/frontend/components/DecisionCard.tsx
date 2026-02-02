/**
 * Decision Card Component
 *
 * Displays a single AI decision with collapsible details
 */

import React from "react";
import type { Decision } from "../types/panel";
import { cn } from "../utils";

interface DecisionCardProps {
  decision: Decision;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Get result badge styling
 */
function getResultStyles(result: Decision["result"]): string {
  switch (result) {
    case "success":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}

/**
 * Get action icon/emoji
 */
function getActionIcon(action: string): string {
  switch (action.toUpperCase()) {
    case "SUMMON_MONSTER":
      return "🐉";
    case "SET_CARD":
      return "🃏";
    case "ACTIVATE_SPELL":
      return "✨";
    case "ACTIVATE_TRAP":
      return "🪤";
    case "ATTACK":
      return "⚔️";
    case "CHANGE_POSITION":
      return "🔄";
    case "FLIP_SUMMON":
      return "🔃";
    case "END_TURN":
      return "🏁";
    case "CHAIN_RESPONSE":
      return "⛓️";
    case "PASS_CHAIN":
      return "⏭️";
    default:
      return "🎯";
  }
}

/**
 * Format timestamp to time string
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Decision card component with collapsible details
 */
export function DecisionCard({ decision, defaultExpanded = false, className }: DecisionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const hasParameters = decision.parameters && Object.keys(decision.parameters).length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden transition-all",
        getResultStyles(decision.result).includes("green")
          ? "border-green-500/20"
          : "border-border",
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-accent/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-xl flex-shrink-0">{getActionIcon(decision.action)}</span>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{decision.action.replace(/_/g, " ")}</span>
              <span
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full border",
                  getResultStyles(decision.result)
                )}
              >
                {decision.result}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <span>Turn {decision.turnNumber}</span>
              <span>•</span>
              <span>{decision.phase}</span>
              <span>•</span>
              <span>{formatTime(decision.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {decision.executionTimeMs}ms
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-border p-3 space-y-3 bg-muted/20">
          {/* Reasoning */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Reasoning</h4>
            <p className="text-sm text-foreground">{decision.reasoning}</p>
          </div>

          {/* Parameters */}
          {hasParameters && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Parameters</h4>
              <div className="bg-background/50 rounded p-2 font-mono text-xs">
                <pre className="overflow-x-auto">
                  {JSON.stringify(decision.parameters, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Confidence (if available) */}
          {decision.confidence !== undefined && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">Confidence</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${decision.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.round(decision.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
