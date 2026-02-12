"use client";

import { cn } from "@/lib/utils";
import type { TabType } from "@/hooks/social/useFriendsInteraction";

interface FriendsTabsProps {
  tabs: { id: TabType; label: string; count: number }[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export function FriendsTabs({ tabs, activeTab, setActiveTab }: FriendsTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit mb-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all",
              isActive
                ? "bg-[#d4af37] text-[#1a1614]"
                : "text-[#a89f94] hover:text-[#e8e0d5] hover:bg-white/5"
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  isActive ? "bg-black/20" : "bg-white/10"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
