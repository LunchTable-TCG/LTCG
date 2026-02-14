"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useGuildInteraction } from "@/hooks/guilds/useGuildInteraction";
import {
  Plus,
  Search,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GuildCard } from "./GuildCard";
import { Badge } from "@/components/ui/badge";

import { ToolGrid } from "@/components/shared/ToolGrid";

interface NoGuildViewProps {
  discovery: ReturnType<typeof useGuildInteraction>["discovery"];
}

export function NoGuildView({ discovery }: NoGuildViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    publicGuilds,
    searchResults,
    isLoading,
    joinPublicGuild,
    requestToJoin,
    search
  } = discovery;

  const displayGuilds = searchQuery.trim() ? searchResults : publicGuilds;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-12 scanner-noise">
      {/* Hero Section */}
      <div className="paper-panel p-8 md:p-12 border-4 border-primary relative overflow-hidden bg-secondary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-3 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
              Social Registry
            </div>

            <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none tracking-tighter ink-bleed">
              Guilds
            </h1>

            <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight max-w-md leading-snug">
              Forge your legacy together. Join forces with fellow champions, recruit members, and dominate the hierarchy as a united front.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                asChild
                className="tcg-button-primary h-14 px-8 text-lg gap-3"
              >
                <Link href="/guilds/create">
                  <Plus className="w-6 h-6" />
                  Form Guild
                </Link>
              </Button>
              <Button
                variant="outline"
                className="tcg-button-outline h-14 px-8 text-lg border-2"
                onClick={() =>
                  document
                    .getElementById("guild-discovery")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <Search className="w-6 h-6" />
                Find Active
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Users, label: "50 Seats", desc: "Member Cap" },
              { icon: Trophy, label: "Rankings", desc: "Live Soon" },
              { icon: Swords, label: "Wars", desc: "Conflict Mod" },
              { icon: Sparkles, label: "AI Recruits", desc: "Bot Support" },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.label}
                  className="p-4 border-2 border-primary bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform"
                >
                  <div className="w-10 h-10 border-2 border-primary bg-secondary/20 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-black text-xs uppercase tracking-tighter">{feature.label}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discovery Section */}
      <div id="guild-discovery" className="space-y-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-4 border-primary pb-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none ink-bleed">
              Active Discovery
            </h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Search the registry for your new home
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative w-full md:max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name..."
              className="pl-12 pr-4 h-12 bg-white border-2 border-primary rounded-none font-bold uppercase text-xs focus:ring-0 focus:border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
          </form>
        </div>

        <ToolGrid
          isLoading={isLoading}
          isEmpty={displayGuilds.length === 0}
          emptyMessage={searchQuery ? "No guilds found for this filter." : "No public guilds registered."}
        >
          {displayGuilds.map((guild) => (
            <GuildCard
              key={guild._id}
              guild={guild}
              onJoin={() => {
                if (guild.visibility === "public") {
                  joinPublicGuild(guild._id);
                } else {
                  requestToJoin(guild._id);
                }
              }}
            />
          ))}
        </ToolGrid>
      </div>

      {/* Features Teaser */}
      <div className="space-y-8 pt-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary bg-secondary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Upcoming Systems</h2>
            <div className="h-1 w-32 bg-primary" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Trophy,
              title: "Leaderboards",
              desc: "Seasonal conflicts for eternal glory.",
              status: "PENDING"
            },
            {
              icon: Swords,
              title: "Guild Wars",
              desc: "Strategic conquest modes.",
              status: "LOCKED"
            },
            {
              icon: Sparkles,
              title: "AI Recruits",
              desc: "Neural network members.",
              status: "ALPHA"
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="paper-panel p-6 border-2 border-primary bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                   <div className="w-12 h-12 border-2 border-primary bg-secondary/10 flex items-center justify-center">
                     <Icon className="w-6 h-6 text-primary" />
                   </div>
                   <Badge className="rounded-none border-2 border-primary bg-primary text-primary-foreground text-[8px] font-black uppercase px-2 py-0.5">
                     {feature.status}
                   </Badge>
                </div>
                <h3 className="font-black text-lg uppercase italic tracking-tighter mb-2">{feature.title}</h3>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight leading-snug">
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
