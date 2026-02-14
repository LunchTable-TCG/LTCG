"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ToolGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  gap?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
}

const columnVariants = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 ml:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
};

const gapVariants = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

/**
 * ToolGrid - A responsive layout wrapper for grid-based views.
 * Designed for Binders, Shops, and Tool lists with Zine-style spacing.
 */
export function ToolGrid({
  children,
  columns = 3,
  className,
  gap = "lg",
  isLoading = false,
  isEmpty = false,
  emptyMessage = "No items found.",
}: ToolGridProps) {
  if (isLoading) {
    return (
      <div className={cn("grid w-full", columnVariants[columns], gapVariants[gap], className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="paper-panel aspect-[3/4] animate-pulse bg-secondary/20 border-2 border-primary" />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border-4 border-dashed border-primary/20 bg-secondary/5">
        <div className="text-xl font-black uppercase italic text-muted-foreground opacity-50 mb-2">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "grid w-full",
        columnVariants[columns],
        gapVariants[gap],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
