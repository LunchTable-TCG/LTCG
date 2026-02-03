"use client";

import { Tooltip } from "@/components/help";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Scroll, Sparkles, Swords } from "lucide-react";

// Only show interactive phases that players actually stop at
const PHASES = [
  { id: "main1", label: "Main Phase", shortLabel: "Main", fullName: "Main Phase 1" },
  { id: "battle", label: "Battle", shortLabel: "Battle", fullName: "Battle Phase" },
  { id: "main2", label: "Main 2", shortLabel: "Main2", fullName: "Main Phase 2" },
] as const;

// Map all phases to display phases for highlighting
const PHASE_MAPPING: Record<string, string> = {
  draw: "main1",
  standby: "main1",
  main1: "main1",
  battle_start: "battle",
  battle: "battle",
  battle_end: "battle",
  main2: "main2",
  end: "main2",
};

interface PhaseBarProps {
  currentPhase: string;
  turnNumber: number;
  isPlayerTurn: boolean;
  canAdvancePhase: boolean;
  onAdvancePhase: () => void;
  onEndTurn: () => void;
}

export function PhaseBar({
  currentPhase,
  turnNumber,
  isPlayerTurn,
  canAdvancePhase,
  onAdvancePhase,
  onEndTurn,
}: PhaseBarProps) {
  // Map current phase to display phase
  const displayPhase = PHASE_MAPPING[currentPhase] || currentPhase;
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === displayPhase);

  // Determine button label based on current phase
  const getAdvanceButtonLabel = () => {
    if (currentPhase === "main1") return "Battle";
    if (currentPhase === "battle") return "Main 2";
    if (currentPhase === "main2") return "End Turn";
    return "Next";
  };

  // Get phase hint based on current phase
  const getPhaseHint = () => {
    if (!isPlayerTurn) return null;

    switch (currentPhase) {
      case "draw":
      case "standby":
      case "main1":
        return {
          icon: Sparkles,
          text: "Summon monsters, activate spells, set cards",
          color: "text-purple-400",
        };
      case "battle_start":
      case "battle":
      case "battle_end":
        return {
          icon: Swords,
          text: "Attack with your monsters",
          color: "text-red-400",
        };
      case "main2":
        return {
          icon: Scroll,
          text: "Last chance to play cards before ending turn",
          color: "text-blue-400",
        };
      case "end":
        return {
          icon: ChevronRight,
          text: "Ending turn...",
          color: "text-gray-400",
        };
      default:
        return null;
    }
  };

  const phaseHint = getPhaseHint();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-lg border">
        {/* Turn indicator */}
        <Tooltip id="turn_indicator">
          <div className="flex items-center gap-1 pr-2 border-r">
            <span className="text-[8px] sm:text-[10px] text-muted-foreground">Turn</span>
            <span className="text-[10px] sm:text-xs font-bold" data-testid="turn-number">
              {turnNumber}
            </span>
          </div>
        </Tooltip>

        {/* Phase indicators */}
        <Tooltip id="phase_indicator">
          <div className="flex items-center gap-1">
            {PHASES.map((phase, index) => {
              const isActive = phase.id === displayPhase;
              const isPast = index < currentPhaseIndex;

              return (
                <div
                  key={phase.id}
                  className={cn(
                    "px-2 sm:px-3 py-1 rounded text-[9px] sm:text-[11px] font-semibold transition-all duration-200 whitespace-nowrap",
                    isActive &&
                      "bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/30 scale-105",
                    isPast && "text-muted-foreground/70 bg-muted/30",
                    !isActive && !isPast && "text-muted-foreground/40 bg-muted/10"
                  )}
                >
                  <span className="hidden sm:inline">{phase.label}</span>
                  <span className="sm:hidden">{phase.shortLabel}</span>
                </div>
              );
            })}
          </div>
        </Tooltip>

        {/* Advance button */}
        {isPlayerTurn && canAdvancePhase && (
          <Button
            size="sm"
            variant="default"
            onClick={currentPhase === "main2" ? onEndTurn : onAdvancePhase}
            className="ml-auto gap-1 h-7 text-[11px] px-3 font-semibold bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {getAdvanceButtonLabel()}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Turn indicator */}
        {!isPlayerTurn && (
          <div className="ml-auto px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 text-[8px] sm:text-[10px] font-medium">
            <span className="hidden sm:inline">Opponent&apos;s Turn</span>
            <span className="sm:hidden">Opp Turn</span>
          </div>
        )}
      </div>

      {/* Phase Hint */}
      {phaseHint && (
        <div className="px-2 py-1.5 bg-muted/30 rounded border border-muted/50 flex items-center gap-2">
          <phaseHint.icon className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5", phaseHint.color)} />
          <span className={cn("text-[9px] sm:text-[11px] font-medium", phaseHint.color)}>
            {phaseHint.text}
          </span>
        </div>
      )}
    </div>
  );
}
