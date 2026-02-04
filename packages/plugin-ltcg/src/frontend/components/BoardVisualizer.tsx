import type { GameSnapshot } from "../types/panel";
import { cn } from "../utils";

interface BoardVisualizerProps {
  gameState: GameSnapshot;
  className?: string;
}

/**
 * Card zone indicator component
 */
function CardZone({
  count,
  label,
  variant = "default",
}: {
  count: number;
  label: string;
  variant?: "agent" | "opponent" | "default";
}) {
  const variantStyles = {
    agent: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    opponent: "bg-red-500/10 border-red-500/30 text-red-400",
    default: "bg-muted border-border text-muted-foreground",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded border min-w-[60px]",
        variantStyles[variant]
      )}
    >
      <div className="text-2xl font-bold tabular-nums">{count}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

/**
 * Player board section
 */
function PlayerBoard({
  label,
  monsters,
  spellTraps,
  lifePoints,
  variant,
}: {
  label: string;
  monsters: number;
  spellTraps: number;
  lifePoints: number;
  variant: "agent" | "opponent";
}) {
  const isAgent = variant === "agent";

  return (
    <div className={cn("flex flex-col gap-3", isAgent ? "order-2" : "order-1")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={cn("text-sm font-medium", isAgent ? "text-blue-400" : "text-red-400")}>
          {label}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">LP:</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              isAgent ? "text-blue-400" : "text-red-400"
            )}
          >
            {lifePoints}
          </span>
        </div>
      </div>

      {/* Card zones */}
      <div className="grid grid-cols-2 gap-2">
        <CardZone count={monsters} label="Monsters" variant={variant} />
        <CardZone count={spellTraps} label="S/T" variant={variant} />
      </div>
    </div>
  );
}

/**
 * Board visualizer component
 */
export function BoardVisualizer({ gameState, className }: BoardVisualizerProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Opponent board */}
      <PlayerBoard
        label="Opponent"
        monsters={gameState.board.opponentMonsters}
        spellTraps={gameState.board.opponentSpellTraps}
        lifePoints={gameState.lifePoints.opponent}
        variant="opponent"
      />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground uppercase tracking-wide">
            Battle Field
          </span>
        </div>
      </div>

      {/* Agent board */}
      <PlayerBoard
        label="You (Agent)"
        monsters={gameState.board.agentMonsters}
        spellTraps={gameState.board.agentSpellTraps}
        lifePoints={gameState.lifePoints.agent}
        variant="agent"
      />
    </div>
  );
}
