"use client";

import { useQuery } from "convex/react";
import {
  Bot,
  Calendar,
  Clock,
  Gamepad2,
  Medal,
  Percent,
  Shield,
  Star,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { useAuth } from "@/components/ConvexAuthProvider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AgentManagement } from "./components";

type PageParams = { playerId: string };

// Format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}

// Get rank from win count
function getRank(gamesWon: number): { name: string; color: string; icon: typeof Medal } {
  if (gamesWon >= 500) return { name: "Legend", color: "text-yellow-400", icon: Trophy };
  if (gamesWon >= 250) return { name: "Master", color: "text-purple-400", icon: Star };
  if (gamesWon >= 100) return { name: "Diamond", color: "text-cyan-400", icon: Medal };
  if (gamesWon >= 50) return { name: "Platinum", color: "text-blue-400", icon: Medal };
  if (gamesWon >= 25) return { name: "Gold", color: "text-yellow-500", icon: Medal };
  if (gamesWon >= 10) return { name: "Silver", color: "text-gray-300", icon: Medal };
  return { name: "Bronze", color: "text-orange-400", icon: Medal };
}

export default function PlayerProfilePage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = use(params);
  const playerId = resolvedParams.playerId as Id<"users">;

  const { token } = useAuth();
  const currentUser = useQuery(api.users.currentUser, token ? { token } : "skip");
  const profileUser = useQuery(api.users.getUser, { userId: playerId });

  const isOwnProfile = currentUser?._id === playerId;

  // Mock stats for now - in real app these would come from backend
  const stats = {
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
  };

  const winRate =
    stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  const rank = getRank(stats.gamesWon);
  const RankIcon = rank?.icon || Medal;

  if (profileUser === undefined) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-purple-950/20 to-background pt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 rounded-xl bg-white/5" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileUser === null) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-purple-950/20 to-background pt-24">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Player Not Found</h2>
          <p className="text-muted-foreground mb-6">
            This player profile does not exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/social">Back to Social</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-profile pt-24">
      <div className="absolute inset-0 bg-vignette z-0" />
      <div className="absolute inset-0 grid-pattern opacity-30 z-0" />
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="relative p-8 rounded-2xl tcg-chat-leather mb-8 overflow-hidden shadow-2xl">
          <div className="ornament-corner ornament-corner-tl" />
          <div className="ornament-corner ornament-corner-tr" />

          {/* Rank Badge */}
          {rank && (
            <Badge
              className={cn(
                "absolute top-6 right-6 text-[10px] px-3 py-1 font-black uppercase tracking-widest z-20",
                "bg-black/40 border border-[#d4af37]/30 text-[#d4af37]"
              )}
            >
              <RankIcon className="w-4 h-4 mr-2" />
              {rank.name}
            </Badge>
          )}

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative z-10">
              <Avatar className="w-32 h-32 border-4 border-[#3d2b1f] shadow-2xl">
                <AvatarFallback className="bg-linear-to-br from-[#8b4513] to-[#3d2b1f] text-4xl font-black text-[#d4af37]">
                  {(profileUser.username || "U")[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold mb-2">{profileUser.username || "Unknown"}</h1>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {formatDate(profileUser.createdAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Last seen {formatRelativeTime(profileUser.createdAt)}
                </div>
              </div>
            </div>

            {!isOwnProfile && currentUser && (
              <div className="flex flex-col gap-3 relative z-10">
                <Button className="tcg-button-primary h-11 px-6 font-black uppercase tracking-widest text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Propose Alliance
                </Button>
                <Button
                  variant="outline"
                  className="border-[#3d2b1f] bg-black/40 text-[#a89f94] hover:text-[#d4af37] h-11 px-6 font-black uppercase tracking-widest"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Challenge
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Gamepad2}
            label="Games Played"
            value={stats.gamesPlayed}
            color="text-blue-400"
          />
          <StatCard
            icon={Trophy}
            label="Games Won"
            value={stats.gamesWon}
            color="text-yellow-400"
          />
          <StatCard icon={Percent} label="Win Rate" value={`${winRate}%`} color="text-green-400" />
          <StatCard
            icon={Target}
            label="Total Score"
            value={stats.totalScore.toLocaleString()}
            color="text-purple-400"
          />
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="p-8 rounded-2xl tcg-chat-leather relative overflow-hidden min-h-[250px] shadow-2xl">
            <div className="ornament-corner ornament-corner-tl opacity-50" />
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-[#e8e0d5] uppercase tracking-tighter relative z-10">
              <TrendingUp className="w-6 h-6 text-[#d4af37]" />
              Recent Chronicles
            </h3>
            <div className="relative z-10 flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#3d2b1f] rounded-xl bg-black/20">
              <p className="text-[#a89f94] text-xs font-black uppercase tracking-widest italic opacity-50">
                Match history is being inscribed...
              </p>
            </div>
          </div>

          {/* Achievements */}
          <div className="p-8 rounded-2xl tcg-chat-leather relative overflow-hidden shadow-2xl">
            <div className="ornament-corner ornament-corner-tl opacity-50" />
            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-[#e8e0d5] uppercase tracking-tighter relative z-10">
              <Medal className="w-6 h-6 text-[#d4af37]" />
              Battle Trophies
            </h3>
            <div className="grid grid-cols-3 gap-4 relative z-10">
              <Achievement
                name="First Blood"
                description="Secure your initial victory"
                unlocked={stats.gamesWon >= 1}
              />
              <Achievement
                name="Lore Keeper"
                description="Study 100 encounters"
                unlocked={stats.gamesPlayed >= 100}
              />
              <Achievement
                name="Warlord"
                description="Conquer 50 fields"
                unlocked={stats.gamesWon >= 50}
              />
            </div>
          </div>
        </div>

        {/* Profile Settings (own profile only) */}
        {isOwnProfile && (
          <div className="mt-8 space-y-8">
            {/* AI Agents Section */}
            <div className="p-8 rounded-2xl tcg-chat-leather relative overflow-hidden shadow-2xl">
              <div className="ornament-corner ornament-corner-tl opacity-50" />
              <h3 className="text-xl font-black mb-4 flex items-center gap-3 text-[#e8e0d5] uppercase tracking-tighter relative z-10">
                <Bot className="w-6 h-6 text-[#d4af37]" />
                AI Agents
              </h3>
              <p className="text-[#a89f94] text-xs font-medium italic mb-6 relative z-10">
                Register ElizaOS agents to battle on your behalf. Maximum 3 agents per account.
              </p>
              <AgentManagement />
            </div>

            {/* Profile Settings */}
            <div className="p-8 rounded-2xl tcg-chat-leather relative overflow-hidden shadow-2xl">
              <div className="ornament-corner ornament-corner-tl opacity-50" />
              <h3 className="text-xl font-black mb-4 flex items-center gap-3 text-[#e8e0d5] uppercase tracking-tighter relative z-10">
                <Shield className="w-6 h-6 text-[#d4af37]" />
                Archivist Settings
              </h3>
              <p className="text-[#a89f94] text-xs font-medium italic mb-6 relative z-10">
                Modify your presence within the Grand Archive.
              </p>
              <Button
                variant="outline"
                className="border-[#3d2b1f] bg-black/40 text-[#a89f94] hover:text-[#d4af37] font-black uppercase tracking-widest text-xs h-11 px-8 relative z-10"
              >
                Edit Inscriptions
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: typeof Trophy;
  label: string;
  value: number | string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="group p-1 tcg-panel bg-leather rounded-xl shadow-xl hover:scale-[1.05] transition-transform relative overflow-hidden">
      <div className="ornament-corner ornament-corner-tl opacity-30" />
      <div className="tcg-frame bg-parchment p-5 shadow-inner relative h-full flex flex-col items-center text-center">
        <div
          className={cn(
            "p-2.5 rounded-lg bg-black/5 mb-3 border border-[#3d2b1f]/10 group-hover:bg-[#d4af37]/10 transition-colors",
            color
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-3xl font-black text-[#2a1f14] uppercase tracking-tighter leading-none mb-1.5">
          {value}
        </p>
        <p className="text-[10px] text-[#2a1f14]/60 uppercase font-black tracking-widest">
          {label}
        </p>
      </div>
    </div>
  );
}

interface AchievementProps {
  name: string;
  description: string;
  unlocked: boolean;
}

function Achievement({ name, description, unlocked }: AchievementProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border relative overflow-hidden transition-all duration-500",
        unlocked
          ? "bg-parchment border-[#d4af37]/40 shadow-gold"
          : "bg-black/40 border-[#3d2b1f] opacity-40 grayscale"
      )}
    >
      <div className="ornament-corner ornament-corner-tl opacity-20" />
      <div
        className={cn(
          "w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 shadow-lg",
          unlocked ? "bg-[#d4af37]/20 border border-[#d4af37]/30" : "bg-black/40"
        )}
      >
        <Star
          className={cn("w-6 h-6", unlocked ? "text-[#d4af37] fill-[#d4af37]" : "text-[#3d2b1f]")}
        />
      </div>
      <p
        className={cn(
          "text-[10px] font-black uppercase tracking-widest mb-1 truncate",
          unlocked ? "text-[#2a1f14]" : "text-[#a89f94]"
        )}
      >
        {name}
      </p>
      <p
        className={cn(
          "text-[8px] font-medium leading-tight line-clamp-2",
          unlocked ? "text-[#2a1f14]/60" : "text-[#a89f94]/40"
        )}
      >
        {description}
      </p>
    </div>
  );
}
