"use client";

import { cn } from "@/lib/utils";
import { HelpCircleIcon } from "lucide-react";
import { useHelpModeSafe } from "./HelpModeProvider";

interface HelpModeToggleProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  position?: "fixed" | "relative";
}

/**
 * Help Mode Toggle Button
 *
 * Floating "?" button that toggles Help Mode.
 * When active, tapping elements shows their tooltips.
 */
export function HelpModeToggle({
  className,
  size = "md",
  position = "fixed",
}: HelpModeToggleProps) {
  const helpMode = useHelpModeSafe();

  // Don't render if outside provider
  if (!helpMode) return null;

  const { isHelpModeActive, toggleHelpMode } = helpMode;

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <button
      type="button"
      onClick={toggleHelpMode}
      className={cn(
        // Base styles
        "flex items-center justify-center rounded-full transition-all duration-200",
        "border-2 shadow-lg",
        // Position
        position === "fixed" && "fixed bottom-4 right-4 z-50",
        // Size
        sizeClasses[size],
        // Active state
        isHelpModeActive
          ? "bg-amber-500 border-amber-400 text-white animate-pulse shadow-amber-500/50"
          : "bg-slate-800/90 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 hover:text-white",
        className
      )}
      aria-label={isHelpModeActive ? "Exit Help Mode" : "Enter Help Mode"}
      title={isHelpModeActive ? "Click to exit Help Mode" : "Click for Help Mode"}
    >
      <HelpCircleIcon className={cn(iconSizes[size])} />
    </button>
  );
}

/**
 * Inline Help Mode Toggle (for use in headers/toolbars)
 */
export function HelpModeToggleInline({ className }: { className?: string }) {
  return <HelpModeToggle position="relative" size="sm" className={className} />;
}
