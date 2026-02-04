"use client";

import { typedApi, useConvexMutation, useConvexQuery } from "@/lib/convexHelpers";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface HelpModeContextValue {
  isHelpModeActive: boolean;
  toggleHelpMode: () => void;
  enableHelpMode: () => void;
  disableHelpMode: () => void;
  activeTooltipId: string | null;
  setActiveTooltipId: (id: string | null) => void;
}

const HelpModeContext = createContext<HelpModeContextValue | null>(null);

export function useHelpMode() {
  const context = useContext(HelpModeContext);
  if (!context) {
    throw new Error("useHelpMode must be used within a HelpModeProvider");
  }
  return context;
}

// Safe hook that returns null when outside provider (for conditional use)
export function useHelpModeSafe() {
  return useContext(HelpModeContext);
}

interface HelpModeProviderProps {
  children: React.ReactNode;
}

export function HelpModeProvider({ children }: HelpModeProviderProps) {
  const [isHelpModeActive, setIsHelpModeActive] = useState(false);
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);

  // Persist preference to database
  const helpModeEnabled = useConvexQuery(typedApi.tutorial.getHelpModeEnabled, {});
  const setHelpModeEnabled = useConvexMutation(typedApi.tutorial.setHelpModeEnabled);

  // Sync local state with database preference on load
  useEffect(() => {
    if (helpModeEnabled !== undefined && helpModeEnabled !== null) {
      setIsHelpModeActive(helpModeEnabled);
    }
  }, [helpModeEnabled]);

  const toggleHelpMode = useCallback(() => {
    setIsHelpModeActive((prev) => {
      const newValue = !prev;
      // Clear active tooltip when disabling
      if (!newValue) {
        setActiveTooltipId(null);
      }
      // Persist to database (fire and forget)
      setHelpModeEnabled({ enabled: newValue });
      return newValue;
    });
  }, [setHelpModeEnabled]);

  const enableHelpMode = useCallback(() => {
    setIsHelpModeActive(true);
    setHelpModeEnabled({ enabled: true });
  }, [setHelpModeEnabled]);

  const disableHelpMode = useCallback(() => {
    setIsHelpModeActive(false);
    setActiveTooltipId(null);
    setHelpModeEnabled({ enabled: false });
  }, [setHelpModeEnabled]);

  // Close tooltip when clicking outside or pressing Escape
  useEffect(() => {
    if (!isHelpModeActive || !activeTooltipId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveTooltipId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isHelpModeActive, activeTooltipId]);

  return (
    <HelpModeContext.Provider
      value={{
        isHelpModeActive,
        toggleHelpMode,
        enableHelpMode,
        disableHelpMode,
        activeTooltipId,
        setActiveTooltipId,
      }}
    >
      {children}
    </HelpModeContext.Provider>
  );
}
