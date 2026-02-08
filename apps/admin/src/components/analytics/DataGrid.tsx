"use client";

/**
 * DataGrid Component
 *
 * Advanced data display grid for analytics dashboards.
 * Supports various layouts and interactive features.
 */

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, Flex, Text, Title } from "@tremor/react";
import type { ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

export interface DataPoint {
  label: string;
  value: number | string;
  sublabel?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
}

export interface DataGridProps {
  /** Title of the grid */
  title: string;
  /** Description */
  description?: string;
  /** Data points to display */
  data: DataPoint[];
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Loading state */
  isLoading?: boolean;
  /** Additional className */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function DataGrid({
  title,
  description,
  data,
  columns = 3,
  isLoading = false,
  className = "",
}: DataGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <Skeleton className="h-6 w-32" />
        {description && <Skeleton className="mt-1 h-4 w-48" />}
        <div className={`mt-4 grid gap-4 ${gridCols[columns]}`}>
          {Array.from({ length: 6  }, (_, i) => i).map((i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <Title>{title}</Title>
      {description && <Text className="text-muted-foreground">{description}</Text>}
      <div className={`mt-4 grid gap-4 ${gridCols[columns]}`}>
        {data.map((point, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Flex justifyContent="start" alignItems="center" className="gap-2">
              {point.icon && <span className="text-muted-foreground">{point.icon}</span>}
              <Text className="text-sm text-muted-foreground">{point.label}</Text>
              {point.badge && (
                <Badge variant={point.badge.variant ?? "secondary"} className="ml-auto">
                  {point.badge.text}
                </Badge>
              )}
            </Flex>
            <Flex justifyContent="start" alignItems="baseline" className="mt-1 gap-2">
              <span className="text-xl font-bold">
                {typeof point.value === "number" ? point.value.toLocaleString() : point.value}
              </span>
              {point.trend && (
                <span
                  className={`text-xs font-medium ${
                    point.trend.isPositive ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {point.trend.isPositive ? "↑" : "↓"}
                  {Math.abs(point.trend.value).toFixed(1)}%
                </span>
              )}
            </Flex>
            {point.sublabel && (
              <Text className="text-xs text-muted-foreground">{point.sublabel}</Text>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// LeaderboardGrid Component
// =============================================================================

export interface LeaderboardItem {
  rank: number;
  name: string;
  value: number | string;
  sublabel?: string;
  avatar?: string;
  trend?: "up" | "down" | "same";
}

export interface LeaderboardGridProps {
  title?: string;
  description?: string;
  items: LeaderboardItem[];
  valueLabel?: string;
  isLoading?: boolean;
  className?: string;
  maxItems?: number;
}

export function LeaderboardGrid({
  title,
  description,
  items,
  valueLabel = "Score",
  isLoading = false,
  className = "",
  maxItems = 10,
}: LeaderboardGridProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5  }, (_, i) => i).map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500 text-yellow-950";
      case 2:
        return "bg-gray-400 text-gray-950";
      case 3:
        return "bg-amber-600 text-amber-950";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "same") => {
    switch (trend) {
      case "up":
        return <span className="text-emerald-500">↑</span>;
      case "down":
        return <span className="text-red-500">↓</span>;
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {(title || description) && (
        <Flex justifyContent="between" alignItems="center" className="mb-4">
          <div>
            {title && <Title>{title}</Title>}
            {description && <Text className="text-muted-foreground">{description}</Text>}
          </div>
          <Text className="text-sm text-muted-foreground">{valueLabel}</Text>
        </Flex>
      )}
      <div className="space-y-2">
        {displayItems.map((item) => (
          <div
            key={item.rank}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${getRankStyle(
                item.rank
              )}`}
            >
              {item.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{item.name}</span>
                {getTrendIcon(item.trend)}
              </div>
              {item.sublabel && (
                <Text className="text-xs text-muted-foreground truncate">{item.sublabel}</Text>
              )}
            </div>
            <span className="font-bold tabular-nums">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
