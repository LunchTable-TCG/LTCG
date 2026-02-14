/**
 * Profile Tabs Component
 * Tab switcher for profile sections (stats, badges, agents)
 */

import { cn } from "@/lib/utils";
import { Bot, Medal, Target } from "lucide-react";

interface ProfileTabsProps {
  activeTab: "stats" | "badges" | "agents";
  onTabChange: (tab: "stats" | "badges" | "agents") => void;
}

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="px-6">
      <div className="flex border-b border-[#3d2b1f]">
        {(["stats", "badges", "agents"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              "flex-1 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 -mb-px",
              activeTab === tab
                ? "border-[#d4af37] text-[#d4af37]"
                : "border-transparent text-[#a89f94] hover:text-[#e8e0d5]"
            )}
          >
            {tab === "stats" && <Target className="w-3.5 h-3.5 inline mr-2" />}
            {tab === "badges" && <Medal className="w-3.5 h-3.5 inline mr-2" />}
            {tab === "agents" && <Bot className="w-3.5 h-3.5 inline mr-2" />}
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
