"use client";

import type { TournamentDetails } from "@/hooks/social/useTournament";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Calendar,
  Coins,
  Loader2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

interface RegisterModalProps {
  tournament: TournamentDetails;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RegisterModal({ tournament, isOpen, onClose, onConfirm }: RegisterModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrize =
    tournament.prizePool.first +
    tournament.prizePool.second +
    tournament.prizePool.thirdFourth * 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        role="presentation"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden">
        <div className="ornament-corner ornament-corner-tl opacity-50" />
        <div className="ornament-corner ornament-corner-tr opacity-50" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3d2b1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-tight">
                Register
              </h2>
              <p className="text-xs text-[#a89f94]">Tournament Registration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Tournament Name */}
          <div className="text-center">
            <h3 className="font-black text-[#e8e0d5] text-xl">{tournament.name}</h3>
            {tournament.description && (
              <p className="text-sm text-[#a89f94] mt-1">{tournament.description}</p>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs text-[#a89f94] uppercase tracking-wider">Players</span>
              </div>
              <p className="font-bold text-[#e8e0d5]">
                {tournament.registeredCount}/{tournament.maxPlayers}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-[#a89f94] uppercase tracking-wider">Prize Pool</span>
              </div>
              <p className="font-bold text-amber-400">{totalPrize} Gold</p>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-[#a89f94] uppercase tracking-wider">Starts</span>
              </div>
              <p className="font-bold text-blue-400 text-sm">
                {formatDate(tournament.scheduledStartAt)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f]">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-[#a89f94] uppercase tracking-wider">Mode</span>
              </div>
              <p
                className={cn(
                  "font-bold uppercase",
                  tournament.mode === "ranked" ? "text-amber-400" : "text-green-400"
                )}
              >
                {tournament.mode}
              </p>
            </div>
          </div>

          {/* Prize Breakdown */}
          <div className="p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20">
            <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-2">Prize Distribution</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-[#a89f94]">1st</p>
                <p className="font-bold text-[#d4af37]">{tournament.prizePool.first}</p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94]">2nd</p>
                <p className="font-bold text-gray-300">{tournament.prizePool.second}</p>
              </div>
              <div>
                <p className="text-xs text-[#a89f94]">3rd-4th</p>
                <p className="font-bold text-amber-600">{tournament.prizePool.thirdFourth}</p>
              </div>
            </div>
          </div>

          {/* Entry Fee Warning */}
          {tournament.entryFee > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-bold">Entry Fee Required</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    {tournament.entryFee} Gold will be deducted from your balance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Check-in Reminder */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-400">
              <strong>Important:</strong> You must check in before the tournament starts.
              Check-in opens at {formatDate(tournament.checkInStartsAt)}.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 border-t border-[#3d2b1f] bg-black/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold uppercase tracking-wide text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                {tournament.entryFee > 0 ? `Register (${tournament.entryFee} Gold)` : "Register"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
