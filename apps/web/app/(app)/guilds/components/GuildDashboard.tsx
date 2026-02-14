"use client";

import type { useGuildInteraction } from "@/hooks/guilds/useGuildInteraction";
import { cn } from "@/lib/utils";
import { GuildChat } from "./GuildChat";
import { GuildHeader } from "./GuildHeader";
import { GuildInvitePanel } from "./GuildInvitePanel";
import { GuildMemberList } from "./GuildMemberList";
import { GuildSettings } from "./GuildSettings";

interface GuildDashboardProps {
  dashboard: ReturnType<typeof useGuildInteraction>["dashboard"];
}

export function GuildDashboard({ dashboard }: GuildDashboardProps) {
  const { guild, activeTab, setActiveTab, isOwner, myRole } = dashboard;

  if (!guild) return null;

  const tabs = [
    { id: "members" as const, label: "Registry", count: guild.memberCount },
    { id: "chat" as const, label: "Comms" },
    ...(isOwner
      ? [
          { id: "invites" as const, label: "Requests" },
          { id: "settings" as const, label: "Admin" },
        ]
      : []),
  ];

  return (
    <div className="space-y-10 scanner-noise">
      {/* Guild Header with Banner */}
      <GuildHeader guild={guild} myRole={myRole} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-2 border-4 border-primary bg-secondary/10 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 font-black uppercase tracking-widest transition-all text-xs",
                "border-2",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                  : "bg-white text-muted-foreground border-primary/20 hover:border-primary/50 hover:text-foreground hover:translate-y-[-1px]"
              )}
            >
              <span className="ink-bleed">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 font-bold text-[10px]",
                    isActive ? "bg-black/20" : "bg-primary/10 text-primary"
                  )}
                >
                  {tab.count.toString().padStart(2, '0')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px] paper-panel border-4 border-primary p-6 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-2">
        {activeTab === "members" && (
          <GuildMemberList
            members={dashboard.members}
            isLoading={!dashboard.members}
            isOwner={dashboard.isOwner}
            onKickMember={dashboard.kickMember}
            onTransferOwnership={dashboard.transferOwnership}
          />
        )}
        {activeTab === "chat" && <GuildChat guildId={guild._id} />}
        {activeTab === "settings" && isOwner && <GuildSettings guildId={guild._id} />}
        {activeTab === "invites" && isOwner && <GuildInvitePanel guildId={guild._id} />}
      </div>
    </div>
  );
}
