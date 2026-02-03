"use client";

import type { TournamentSummary } from "@/hooks/social/useTournament";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Coins,
  Crown,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

interface TournamentCardProps {
  tournament: TournamentSummary;
  onRegister?: () => void;
}

const STATUS_CONFIG = {
  registration: {
    label: "Registration Open",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: Users,
  },
  checkin: {
    label: "Check-in Open",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  active: {
    label: "In Progress",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Trophy,
  },
  completed: {
    label: "Completed",
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    icon: Crown,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: Users,
  },
};

function formatCountdown(timestamp: number) {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) return "Started";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TournamentCard({ tournament, onRegister }: TournamentCardProps) {
  const statusConfig = STATUS_CONFIG[tournament.status];
  const StatusIcon = statusConfig.icon;

  const totalPrize =
    tournament.prizePool.first +
    tournament.prizePool.second +
    tournament.prizePool.thirdFourth * 2;

  const isFull = tournament.registeredCount >= tournament.maxPlayers;
  const canRegister = tournament.status === "registration" && !isFull;

  return (
    <Link
      href={`/tournaments/${tournament._id}`}
      className="group relative block p-5 rounded-xl tcg-chat-leather border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all shadow-lg hover:shadow-xl overflow-hidden"
    >
      <div className="ornament-corner ornament-corner-tl opacity-30" />
      <div className="ornament-corner ornament-corner-tr opacity-30" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-[#d4af37] shrink-0" />
            <h3 className="font-black text-[#e8e0d5] truncate text-lg">
              {tournament.name}
            </h3>
          </div>
          {tournament.description && (
            <p className="text-sm text-[#a89f94] line-clamp-1">
              {tournament.description}
            </p>
          )}
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider shrink-0",
            statusConfig.color
          )}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig.label}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {/* Players */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div>
            <p className="text-xs text-[#a89f94] uppercase tracking-wider">Players</p>
            <p className="font-bold text-[#e8e0d5]">
              {tournament.registeredCount}/{tournament.maxPlayers}
            </p>
          </div>
        </div>

        {/* Prize Pool */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-[#a89f94] uppercase tracking-wider">Prize</p>
            <p className="font-bold text-amber-400">{totalPrize} Gold</p>
          </div>
        </div>

        {/* Entry Fee */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Coins className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-[#a89f94] uppercase tracking-wider">Entry</p>
            <p className="font-bold text-green-400">
              {tournament.entryFee > 0 ? `${tournament.entryFee} Gold` : "Free"}
            </p>
          </div>
        </div>

        {/* Start Time */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-[#a89f94] uppercase tracking-wider">
              {tournament.status === "registration" ? "Starts in" : "Started"}
            </p>
            <p className="font-bold text-blue-400">
              {tournament.status === "registration"
                ? formatCountdown(tournament.scheduledStartAt)
                : formatDate(tournament.scheduledStartAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#3d2b1f]">
        {/* Mode Badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
            tournament.mode === "ranked"
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-green-500/20 text-green-400 border-green-500/30"
          )}
        >
          {tournament.mode === "ranked" ? (
            <Trophy className="w-3 h-3" />
          ) : (
            <Users className="w-3 h-3" />
          )}
          {tournament.mode}
        </div>

        {/* Winner or CTA */}
        {tournament.status === "completed" && tournament.winnerUsername ? (
          <div className="flex items-center gap-2 text-sm">
            <Crown className="w-4 h-4 text-[#d4af37]" />
            <span className="text-[#a89f94]">Winner:</span>
            <span className="font-bold text-[#d4af37]">{tournament.winnerUsername}</span>
          </div>
        ) : canRegister ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegister?.();
            }}
            className="px-4 py-2 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            Register Now
          </button>
        ) : isFull && tournament.status === "registration" ? (
          <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
            Tournament Full
          </span>
        ) : (
          <span className="text-xs text-[#a89f94] uppercase tracking-wider">
            View Details
          </span>
        )}
      </div>
    </Link>
  );
}
