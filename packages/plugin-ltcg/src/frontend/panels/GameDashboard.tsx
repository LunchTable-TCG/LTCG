/**
 * Game Dashboard Panel
 *
 * Displays current game state including:
 * - Game ID and status
 * - Turn/phase indicator
 * - Life points
 * - Board state visualization
 * - Hand viewer
 */

import React from "react";
import {
  BoardVisualizer,
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
  StatusBadge,
} from "../components";
import { useAgentStatus, useGameState } from "../hooks";
import { cn } from "../utils";

interface GameDashboardProps {
  agentId: string;
}

/**
 * Hand card component
 */
const HandCard = React.memo(function HandCard({
  type,
  name,
}: {
  type: "monster" | "spell" | "trap";
  name: string;
}) {
  const typeColors = {
    monster: "bg-orange-500/10 border-orange-500/30 text-orange-400",
    spell: "bg-green-500/10 border-green-500/30 text-green-400",
    trap: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  };

  const typeIcons = {
    monster: "🐉",
    spell: "✨",
    trap: "🪤",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 p-2 rounded border min-w-[80px]",
        typeColors[type]
      )}
    >
      <span className="text-xl">{typeIcons[type]}</span>
      <span className="text-xs text-center line-clamp-2">{name}</span>
    </div>
  );
});

/**
 * Game Dashboard Panel Component
 */
export function GameDashboard({ agentId }: GameDashboardProps) {
  const { data: agentStatus } = useAgentStatus(agentId);
  const gameId = agentStatus?.currentGameId ?? null;

  const { data: gameState, isLoading, error, refetch } = useGameState(agentId, gameId);

  if (!gameId) {
    return (
      <EmptyState
        title="No active game"
        description="Start a game to see the dashboard"
        className="py-16"
      />
    );
  }

  if (isLoading) {
    return <LoadingState message="Loading game state..." />;
  }

  if (error) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Failed to load game state"}
        onRetry={() => refetch()}
      />
    );
  }

  if (!gameState) {
    return <EmptyState title="No game data" description="Game state not available" />;
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header with game info */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Game Dashboard</h2>
          <StatusBadge
            variant={gameState.isMyTurn ? "active" : "idle"}
            label={gameState.isMyTurn ? "YOUR TURN" : "WAITING"}
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
          <span>Game: {gameState.gameId.slice(0, 12)}...</span>
          {gameState.status === "completed" && gameState.winner && (
            <>
              <span>•</span>
              <span className={gameState.winner === "agent" ? "text-green-400" : "text-red-400"}>
                Winner: {gameState.winner === "agent" ? "You" : "Opponent"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Turn and Phase info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Turn Number" value={gameState.turnNumber} variant="default" />
        <StatCard
          label="Current Phase"
          value={gameState.phase.toUpperCase()}
          variant={gameState.isMyTurn ? "primary" : "default"}
        />
      </div>

      {/* Board visualizer */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium mb-4">Board State</h3>
        <BoardVisualizer gameState={gameState} />
      </div>

      {/* Hand viewer */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Your Hand</h3>
          <span className="text-xs text-muted-foreground">{gameState.hand.count} cards</span>
        </div>

        {gameState.hand.count > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {gameState.hand.cards.map((card, index) => (
              <HandCard key={`${card.name}-${index}`} type={card.type} name={card.name} />
            ))}
          </div>
        ) : (
          <EmptyState title="No cards in hand" className="py-6" />
        )}
      </div>

      {/* Game completed banner */}
      {gameState.status === "completed" && (
        <div
          className={cn(
            "rounded-lg border p-6 text-center",
            gameState.winner === "agent"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          )}
        >
          <h3
            className={cn(
              "text-lg font-bold",
              gameState.winner === "agent" ? "text-green-400" : "text-red-400"
            )}
          >
            {gameState.winner === "agent" ? "🎉 Victory!" : "💀 Defeat"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {gameState.winner === "agent" ? "You won the game!" : "Opponent won the game."}
          </p>
        </div>
      )}
    </div>
  );
}
