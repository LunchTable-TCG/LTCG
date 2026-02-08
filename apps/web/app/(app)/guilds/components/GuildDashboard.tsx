"use client";

import { useMyGuild } from "@/hooks/guilds";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { GuildChat } from "./GuildChat";
import { GuildHeader } from "./GuildHeader";
import { GuildInvitePanel } from "./GuildInvitePanel";
import { GuildMemberList } from "./GuildMemberList";
import { GuildSettings } from "./GuildSettings";

type TabType = "members" | "chat" | "settings" | "invites";

export function GuildDashboard() {
  const { guild, myRole, isOwner } = useMyGuild();
  const [activeTab, setActiveTab] = useState<TabType>("members");

  if (!guild) return null;

  const tabs = [
    { id: "members" as const, label: "Members", count: guild.memberCount },
    { id: "chat" as const, label: "Chat" },
    ...(isOwner
      ? [
          { id: "invites" as const, label: "Invites & Requests" },
          { id: "settings" as const, label: "Settings" },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      {/* Guild Header with Banner */}
      <GuildHeader guild={guild} myRole={myRole} />

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-[#3d2b1f] w-fit">
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
              {tab.count !== undefined && (
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

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "members" && <GuildMemberList guildId={guild._id} />}
        {activeTab === "chat" && <GuildChat guildId={guild._id} />}
        {activeTab === "settings" && isOwner && <GuildSettings guildId={guild._id} />}
        {activeTab === "invites" && isOwner && <GuildInvitePanel guildId={guild._id} />}
      </div>
    </div>
  );
}
