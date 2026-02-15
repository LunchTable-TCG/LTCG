"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface XPDisplayProps {
  level: number;
  currentXP: number;
  className?: string;
  showLevel?: boolean;
  showXP?: boolean;
}

/**
 * Reusable XP and Level display component.
 * Calculates next level requirement using common game logic: N * 100 XP.
 */
export function XPDisplay({
  level,
  currentXP,
  className,
  showLevel = true,
  showXP = true,
}: XPDisplayProps) {
  const nextLevelXP = level * 100;
  const progress = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));

  return (
    <div className={cn("space-y-1 w-full", className)}>
      <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-tighter">
        {showLevel && <span className="text-destructive font-bold ink-bleed">Level {level}</span>}
        {showXP && (
          <span className="text-muted-foreground">
            {currentXP} / {nextLevelXP} XP
          </span>
        )}
      </div>
      <Progress
        value={progress}
        className="h-1.5 border border-primary bg-secondary/30 rounded-none shadow-[2px_2px_0px_rgba(0,0,0,1)]"
      />
    </div>
  );
}
