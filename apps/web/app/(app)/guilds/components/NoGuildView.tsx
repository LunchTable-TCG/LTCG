"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useGuildInteraction } from "@/hooks/guilds/useGuildInteraction";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Loader2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GuildCard } from "./GuildCard";

interface NoGuildViewProps {
  discovery: ReturnType<typeof useGuildInteraction>["discovery"];
}

export function NoGuildView({ discovery }: NoGuildViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { publicGuilds, searchResults, isLoading, joinPublicGuild, requestToJoin, search } =
    discovery;

  const displayGuilds = searchQuery.trim() ? searchResults : publicGuilds;
  const isSearching = searchQuery.trim().length > 0 && isLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-[#3d2b1f] bg-gradient-to-br from-[#1a1614] via-[#261f1c] to-[#1a1614]">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600/5 rounded-full blur-2xl" />

        <div className="relative p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left - CTA */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30">
                <Shield className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
                  Guilds
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl font-black text-[#e8e0d5] leading-tight">
                Forge Your
                <span className="block gold-gradient">Legacy Together</span>
              </h1>

              <p className="text-[#a89f94] text-lg leading-relaxed">
                Join forces with fellow champions. Create your guild, recruit members, and dominate
                the leaderboards as a united force.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  className="tcg-button-primary rounded-xl px-6 py-6 text-base font-bold"
                >
                  <Link href="/guilds/create">
                    <Plus className="w-5 h-5 mr-2" />
                    Create Guild
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl px-6 py-6 text-base border-[#3d2b1f] text-[#e8e0d5] hover:bg-[#d4af37]/10 hover:border-[#d4af37]/50"
                  onClick={() =>
                    document
                      .getElementById("guild-discovery")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <Search className="w-5 h-5 mr-2" />
                  Find a Guild
                </Button>
              </div>
            </div>

            {/* Right - Feature Cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, label: "50 Members Max", desc: "Build your army" },
                { icon: Trophy, label: "Guild Rankings", desc: "Coming Soon" },
                { icon: Swords, label: "Guild Wars", desc: "Coming Soon" },
                { icon: Sparkles, label: "AI Agents", desc: "Recruit bots" },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className="p-4 rounded-xl bg-black/30 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center mb-3 group-hover:bg-[#d4af37]/20 transition-colors">
                      <Icon className="w-5 h-5 text-[#d4af37]" />
                    </div>
                    <p className="font-bold text-[#e8e0d5] text-sm">{feature.label}</p>
                    <p className="text-[10px] text-[#a89f94] uppercase tracking-wider">
                      {feature.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Guild Discovery Section */}
      <div id="guild-discovery" className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <Search className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#e8e0d5]">Discover Guilds</h2>
              <p className="text-xs text-[#a89f94] uppercase tracking-wider">Find your new home</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a89f94]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guilds by name..."
            className="pl-12 pr-4 py-6 bg-black/40 border-[#3d2b1f] text-[#e8e0d5] rounded-xl focus:border-[#d4af37]/50"
          />
        </form>

        {/* Guild Grid */}
        {isSearching ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
          </div>
        ) : displayGuilds.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        ) : (
          <div className="text-center py-16 rounded-xl bg-black/40 border border-[#3d2b1f]">
            <Shield className="w-16 h-16 mx-auto mb-4 text-[#a89f94]/50" />
            <p className="text-[#e8e0d5] font-bold mb-2">
              {searchQuery ? "No guilds found" : "No public guilds yet"}
            </p>
            <p className="text-[#a89f94] mb-6">
              {searchQuery ? "Try a different search term" : "Be the first to create one!"}
            </p>
            <Button asChild className="tcg-button-primary rounded-xl">
              <Link href="/guilds/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Guild
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Future Features Teaser */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#e8e0d5]">Coming Soon</h2>
            <p className="text-xs text-[#a89f94] uppercase tracking-wider">The future awaits</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: Trophy,
              title: "Guild Leaderboards",
              desc: "Compete against other guilds for seasonal rewards and eternal glory.",
              color: "amber",
            },
            {
              icon: Swords,
              title: "Guild Wars",
              desc: "Wage epic battles against rival guilds in strategic conquest mode.",
              color: "red",
            },
            {
              icon: Sparkles,
              title: "AI Agent Surprises",
              desc: "Recruit powerful AI agents with unique abilities to your guild.",
              color: "purple",
            },
          ].map((feature) => {
            const Icon = feature.icon;
            const colorClasses = {
              amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
              red: "bg-red-500/10 border-red-500/20 text-red-400",
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
            };
            return (
              <div
                key={feature.title}
                className="relative overflow-hidden p-6 rounded-xl bg-black/40 border border-[#3d2b1f] hover:border-[#d4af37]/30 transition-all group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl border flex items-center justify-center mb-4",
                    colorClasses[feature.color as keyof typeof colorClasses]
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#e8e0d5] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#a89f94] leading-relaxed">{feature.desc}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-[#d4af37]">
                  <span className="font-bold uppercase tracking-wider">Learn More</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
