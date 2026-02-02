/**
 * Stat card component for displaying metrics and statistics
 */

import type React from "react";
import { cn } from "../utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "success" | "warning";
}

/**
 * Get card styling based on variant
 */
function getVariantStyles(variant: StatCardProps["variant"]): string {
  switch (variant) {
    case "primary":
      return "bg-primary/5 border-primary/20";
    case "success":
      return "bg-green-500/5 border-green-500/20";
    case "warning":
      return "bg-yellow-500/5 border-yellow-500/20";
    default:
      return "bg-card border-border";
  }
}

/**
 * Stat card component for displaying key metrics
 */
export function StatCard({ label, value, icon, className, variant = "default" }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-4 rounded-lg border",
        getVariantStyles(variant),
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon && <span className="opacity-70">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
