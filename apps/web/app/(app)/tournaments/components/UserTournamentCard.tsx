"use client";

import type { UserTournamentSummary } from "@/hooks/social/useUserTournaments";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import { Clock, Coins, Copy, Eye, EyeOff, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserTournamentCardProps {
  tournament: UserTournamentSummary;
  onJoin?: (tournamentId: Id<"tournaments">) => void;
  showJoinCode?: boolean;
}

function formatTimeRemaining(timestamp: number) {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

export function UserTournamentCard({
  tournament,
  onJoin,
  showJoinCode = false,
}: UserTournamentCardProps) {
  const isFull = tournament.registeredCount >= tournament.maxPlayers;
  const canJoin = tournament.status === "registration" && !isFull;
  const isPrivate = tournament.visibility === "private";

  const copyJoinCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (tournament.joinCode) {
      navigator.clipboard.writeText(tournament.joinCode);
      toast.success("Join code copied!");
    }
  };

  return (
    <Link
      href={`/tournaments/${tournament._id}`}
      className="group relative block p-4 rounded-xl tcg-chat-leather border border-[#3d2b1f] hover:border-[#d4af37]/50 transition-all shadow-lg hover:shadow-xl overflow-hidden"
    >
      <div className="ornament-corner ornament-corner-tl opacity-20 scale-75" />
      <div className="ornament-corner ornament-corner-tr opacity-20 scale-75" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Trophy className="w-4 h-4 text-[#d4af37] shrink-0" />
            <h3 className="font-bold text-[#e8e0d5] truncate">{tournament.name}</h3>
          </div>
          <p className="text-xs text-[#a89f94]">by {tournament.creatorUsername}</p>
        </div>

        {/* Visibility Badge */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider shrink-0",
            isPrivate
              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : "bg-green-500/20 text-green-400 border-green-500/30"
          )}
        >
          {isPrivate ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {isPrivate ? "Private" : "Public"}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-3">
        {/* Players */}
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="text-sm text-[#e8e0d5] font-bold">
            {tournament.registeredCount}/{tournament.maxPlayers}
          </span>
          {tournament.slotsRemaining > 0 && (
            <span className="text-xs text-green-400">({tournament.slotsRemaining} left)</span>
          )}
        </div>

        {/* Entry Fee */}
        <div className="flex items-center gap-1.5">
          <Coins
            className={cn(
              "w-3.5 h-3.5",
              tournament.entryFee > 0 ? "text-amber-400" : "text-green-400"
            )}
          />
          <span
            className={cn(
              "text-sm font-bold",
              tournament.entryFee > 0 ? "text-amber-400" : "text-green-400"
            )}
          >
            {tournament.entryFee > 0 ? `${tournament.entryFee.toLocaleString()}g` : "Free"}
          </span>
        </div>

        {/* Mode */}
        <div
          className={cn(
            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
            tournament.mode === "ranked"
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
              : "bg-green-500/20 text-green-400 border-green-500/30"
          )}
        >
          {tournament.mode}
        </div>
      </div>

      {/* Prize Preview (if entry fee > 0) */}
      {tournament.entryFee > 0 && (
        <div className="flex items-center gap-3 text-xs mb-3 px-2 py-1.5 rounded bg-[#d4af37]/10 border border-[#d4af37]/20">
          <span className="text-[#a89f94]">Prizes:</span>
          <span>
            <span className="text-[#d4af37] font-bold">
              {tournament.prizeBreakdown.first.toLocaleString()}g
            </span>
            <span className="text-[#6b5d52]"> / </span>
            <span className="text-gray-400 font-bold">
              {tournament.prizeBreakdown.second.toLocaleString()}g
            </span>
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#3d2b1f]/50">
        {/* Expiry Time */}
        {tournament.expiresAt && (
          <div className="flex items-center gap-1.5 text-xs text-[#a89f94]">
            <Clock className="w-3 h-3" />
            {formatTimeRemaining(tournament.expiresAt)}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Join Code (for host view) */}
          {showJoinCode && tournament.joinCode && (
            <button
              type="button"
              onClick={copyJoinCode}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
            >
              <span className="text-xs font-mono text-purple-400">{tournament.joinCode}</span>
              <Copy className="w-3 h-3 text-purple-400" />
            </button>
          )}

          {/* Join Button */}
          {canJoin && !showJoinCode && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onJoin?.(tournament._id);
              }}
              className="px-3 py-1.5 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold text-xs uppercase tracking-wider shadow transition-all"
            >
              Join
            </button>
          )}

          {/* Full Badge */}
          {isFull && tournament.status === "registration" && (
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Full</span>
          )}
        </div>
      </div>
    </Link>
  );
}
