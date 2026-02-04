"use client";

/**
 * StatCard Component
 *
 * Reusable metric display card with optional trend indicator.
 * Uses Tremor for rich metric visualization.
 */

import { Skeleton } from "@/components/ui/skeleton";
import { BadgeDelta, Card, Flex, Metric, Text } from "@tremor/react";
import type { ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

type TrendType = "increase" | "decrease" | "unchanged" | "moderateIncrease" | "moderateDecrease";

interface StatCardProps {
  /** Title/label of the stat */
  title: string;
  /** The metric value to display */
  value: string | number;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional previous value for trend calculation */
  previousValue?: number;
  /** Optional delta value (if provided, overrides calculation) */
  delta?: string;
  /** Type of delta (for color coding) */
  deltaType?: TrendType;
  /** Loading state */
  isLoading?: boolean;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Additional CSS classes */
  className?: string;
}

interface StatGridProps {
  children: ReactNode;
  /** Number of columns (1-5) */
  columns?: 1 | 2 | 3 | 4 | 5;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Components
// =============================================================================

/**
 * Single stat card component
 */
export function StatCard({
  title,
  value,
  icon,
  previousValue,
  delta,
  deltaType,
  isLoading = false,
  subtitle,
  className = "",
}: StatCardProps) {
  // Calculate delta if not provided
  const calculatedDelta = (() => {
    if (delta) return delta;
    if (previousValue === undefined || typeof value !== "number") return undefined;

    const diff = value - previousValue;
    const percentage = previousValue > 0 ? (diff / previousValue) * 100 : 0;
    return `${percentage >= 0 ? "+" : ""}${percentage.toFixed(1)}%`;
  })();

  // Determine delta type if not provided
  const calculatedDeltaType: TrendType = (() => {
    if (deltaType) return deltaType;
    if (previousValue === undefined || typeof value !== "number") return "unchanged";

    const diff = value - previousValue;
    if (diff > 0) return "increase";
    if (diff < 0) return "decrease";
    return "unchanged";
  })();

  if (isLoading) {
    return (
      <Card className={className}>
        <Flex justifyContent="start" className="space-x-4">
          {icon && <Skeleton className="h-10 w-10 rounded" />}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-8 w-[120px]" />
          </div>
        </Flex>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Flex justifyContent="start" className="space-x-4">
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">{icon}</div>
        )}
        <div>
          <Text>{title}</Text>
          <Flex justifyContent="start" alignItems="baseline" className="space-x-3 truncate">
            <Metric>{typeof value === "number" ? value.toLocaleString() : value}</Metric>
            {calculatedDelta && (
              <BadgeDelta deltaType={calculatedDeltaType} size="xs">
                {calculatedDelta}
              </BadgeDelta>
            )}
          </Flex>
          {subtitle && <Text className="text-xs text-muted-foreground">{subtitle}</Text>}
        </div>
      </Flex>
    </Card>
  );
}

/**
 * Grid container for stat cards
 */
export function StatGrid({ children, columns = 4, className = "" }: StatGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  };

  return <div className={`grid gap-3 sm:gap-4 ${gridCols[columns]} ${className}`}>{children}</div>;
}

// =============================================================================
// Specialized Stat Cards
// =============================================================================

interface QuickStatProps {
  label: string;
  value: string | number;
  className?: string;
}

/**
 * Simplified stat display for inline use
 */
export function QuickStat({ label, value, className = "" }: QuickStatProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

interface RatioStatProps {
  label: string;
  current: number;
  total: number;
  className?: string;
  showPercentage?: boolean;
}

/**
 * Stat card showing a ratio (e.g., 5/10 active)
 */
export function RatioStat({
  label,
  current,
  total,
  className = "",
  showPercentage = true,
}: RatioStatProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">
        {current.toLocaleString()} / {total.toLocaleString()}
        {showPercentage && (
          <span className="ml-2 text-sm text-muted-foreground">({percentage}%)</span>
        )}
      </span>
    </div>
  );
}
