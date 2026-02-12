"use client";

import { useGuildInteraction } from "@/hooks/guilds/useGuildInteraction";
import { Loader2, Shield } from "lucide-react";
import { GuildDashboard } from "./components/GuildDashboard";
import { NoGuildView } from "./components/NoGuildView";

export default function GuildsPage() {
  const { isAuthenticated, isLoading, hasGuild, dashboard, discovery } = useGuildInteraction();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
          <p className="text-[#a89f94]">Please log in to view guilds</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0a09] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#d4af37] animate-spin" />
          <p className="text-[#a89f94] text-sm">Loading guild data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a09] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-amber-900/10 via-[#0d0a09] to-[#0d0a09]" />

      <div className="container mx-auto px-4 pt-28 pb-16 relative z-10">
        {hasGuild ? (
          <GuildDashboard dashboard={dashboard} />
        ) : (
          <NoGuildView discovery={discovery} />
        )}
      </div>
    </div>
  );
}
