"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  delay?: number;
}

/**
 * StatCard - A high-contrast, paper-panel stat display.
 * Features the LunchTable "Zine" aesthetic with bold ink borders
 * and ink-bleed typography.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  className,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        "paper-panel p-6 relative group overflow-hidden",
        "hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform",
        className
      )}
    >
      {/* Decorative Scanner Noise Overlay */}
      <div className="absolute inset-0 scanner-noise opacity-10 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground ink-bleed">
            {label}
          </span>
          {Icon && (
            <div className="p-2 border-2 border-primary bg-white shadow-[2px_2px_0px_0px_rgba(18,18,18,1)]">
              <Icon className="w-4 h-4 text-primary" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="text-3xl font-black italic uppercase tracking-tighter ink-bleed">
            {value}
          </h3>

          {(description || trend) && (
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 border border-primary",
                  trend.isPositive ? "bg-reputation text-primary" : "bg-destructive text-white"
                )}>
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
              )}
              {description && (
                <span className="text-[10px] font-bold uppercase text-muted-foreground truncate">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
