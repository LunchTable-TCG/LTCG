"use client";

import type { TournamentDetails } from "@/hooks/social/useTournament";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { useState } from "react";

interface CheckInModalProps {
  tournament: TournamentDetails;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function formatCountdown(timestamp: number) {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) return "Starting soon...";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} minutes`;
}

export function CheckInModal({ tournament, isOpen, onClose, onConfirm }: CheckInModalProps) {
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
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  const checkInEndsIn = formatCountdown(tournament.checkInEndsAt);
  const tournamentStartsIn = formatCountdown(tournament.scheduledStartAt);

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
      <div className="relative w-full max-w-sm mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden">
        <div className="ornament-corner ornament-corner-tl opacity-50" />
        <div className="ornament-corner ornament-corner-tr opacity-50" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3d2b1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-tight">
                Check In
              </h2>
              <p className="text-xs text-[#a89f94]">{tournament.name}</p>
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
          {/* Status */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="font-bold text-[#e8e0d5]">Ready to Check In?</h3>
            <p className="text-sm text-[#a89f94] mt-1">
              Confirm your participation in this tournament.
            </p>
          </div>

          {/* Countdown Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f] text-center">
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                Check-in Closes
              </p>
              <p className="font-bold text-amber-400">{checkInEndsIn}</p>
            </div>
            <div className="p-3 rounded-lg bg-black/30 border border-[#3d2b1f] text-center">
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
                Tournament Starts
              </p>
              <p className="font-bold text-green-400">{tournamentStartsIn}</p>
            </div>
          </div>

          {/* Players Checked In */}
          <div className="p-3 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 text-center">
            <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-1">
              Players Checked In
            </p>
            <p className="font-black text-[#d4af37] text-xl">
              {tournament.checkedInCount} / {tournament.registeredCount}
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-400 font-bold">Don't Miss It!</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  If you don't check in before the deadline, you will be removed from
                  the tournament and receive a refund.
                </p>
              </div>
            </div>
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
            Later
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold uppercase tracking-wide text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Check In Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
