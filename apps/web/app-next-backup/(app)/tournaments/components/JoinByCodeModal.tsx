"use client";

import { useJoinUserTournament, useTournamentByCode } from "@/hooks/social/useUserTournaments";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, Hash, Loader2, Trophy, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface JoinByCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userGoldBalance?: number;
  initialCode?: string;
}

export function JoinByCodeModal({
  isOpen,
  onClose,
  onSuccess,
  userGoldBalance = 0,
  initialCode = "",
}: JoinByCodeModalProps) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const { tournament, isLoading: isSearching, isValid } = useTournamentByCode(code);
  const { joinByCode, isJoining } = useJoinUserTournament();

  const insufficientGold = tournament ? tournament.entryFee > userGoldBalance : false;
  const canJoin =
    isValid && tournament && tournament.status === "registration" && !insufficientGold;

  const resetForm = useCallback(() => {
    setCode("");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Update code when initialCode changes
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.toUpperCase());
    }
  }, [initialCode]);

  useEffect(() => {
    if (isOpen) {
      codeInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleCodeChange = (value: string) => {
    // Allow only alphanumeric, convert to uppercase, max 6 characters
    const cleaned = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setCode(cleaned);
    setError(null);
  };

  const handleJoin = async () => {
    if (!code || code.length < 6) {
      setError("Please enter a valid 6-character code");
      return;
    }

    setError(null);

    try {
      await joinByCode(code);
      onSuccess?.();
      handleClose();
    } catch {
      // Error is handled by the hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        role="presentation"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
        }}
      />

      <div className="relative w-full max-w-md mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden">
        <div className="ornament-corner ornament-corner-tl opacity-50" />
        <div className="ornament-corner ornament-corner-tr opacity-50" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3d2b1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Hash className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-tight">
                Join by Code
              </h2>
              <p className="text-xs text-[#a89f94]">Enter invite code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg border border-[#3d2b1f] bg-black/30 text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Code Input */}
          <div>
            <label
              htmlFor="code"
              className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2"
            >
              Tournament Code
            </label>
            <input
              ref={codeInputRef}
              id="code"
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-4 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] placeholder-[#6b5d52] focus:border-[#d4af37]/50 focus:outline-none transition-all text-center text-2xl font-mono tracking-[0.3em] uppercase"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canJoin) {
                  handleJoin();
                }
              }}
            />
            <p className="text-xs text-[#6b5d52] mt-1 text-center">{code.length}/6 characters</p>
          </div>

          {/* Loading State */}
          {isSearching && code.length >= 6 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-[#d4af37]" />
              <span className="text-sm text-[#a89f94]">Looking up tournament...</span>
            </div>
          )}

          {/* Tournament Preview */}
          {tournament && !isSearching && (
            <div className="p-4 rounded-lg bg-black/30 border border-[#3d2b1f] space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#d4af37]" />
                <h3 className="font-bold text-[#e8e0d5]">{tournament.name}</h3>
              </div>

              {tournament.description && (
                <p className="text-sm text-[#a89f94]">{tournament.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-black/20 border border-[#3d2b1f]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Users className="w-3 h-3 text-[#d4af37]" />
                    <span className="text-[10px] text-[#a89f94] uppercase">Players</span>
                  </div>
                  <p className="font-bold text-[#e8e0d5] text-sm">
                    {tournament.registeredCount}/{tournament.maxPlayers}
                    <span className="text-xs font-normal text-green-400 ml-1">
                      ({tournament.slotsRemaining} left)
                    </span>
                  </p>
                </div>

                <div className="p-2 rounded bg-black/20 border border-[#3d2b1f]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="w-3 h-3 text-amber-400" />
                    <span className="text-[10px] text-[#a89f94] uppercase">Entry</span>
                  </div>
                  <p
                    className={cn(
                      "font-bold text-sm",
                      tournament.entryFee > 0 ? "text-amber-400" : "text-green-400"
                    )}
                  >
                    {tournament.entryFee > 0
                      ? `${tournament.entryFee.toLocaleString()} Gold`
                      : "Free"}
                  </p>
                </div>
              </div>

              {/* Prize Preview */}
              {tournament.entryFee > 0 && (
                <div className="p-2 rounded bg-[#d4af37]/10 border border-[#d4af37]/20">
                  <p className="text-[10px] text-[#a89f94] uppercase mb-1">
                    Prize Pool (when full)
                  </p>
                  <div className="flex justify-between text-xs">
                    <span>
                      <span className="text-[#a89f94]">1st:</span>{" "}
                      <span className="text-[#d4af37] font-bold">
                        {tournament.prizeBreakdown.first.toLocaleString()}g
                      </span>
                    </span>
                    <span>
                      <span className="text-[#a89f94]">2nd:</span>{" "}
                      <span className="text-gray-300 font-bold">
                        {tournament.prizeBreakdown.second.toLocaleString()}g
                      </span>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#a89f94]">Host: {tournament.creatorUsername}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                    tournament.mode === "ranked"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-green-500/20 text-green-400"
                  )}
                >
                  {tournament.mode}
                </span>
              </div>
            </div>
          )}

          {/* Not Found */}
          {!tournament && !isSearching && code.length >= 6 && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
              <p className="text-sm text-red-400">
                No tournament found with this code. Please check and try again.
              </p>
            </div>
          )}

          {/* Insufficient Gold Warning */}
          {insufficientGold && tournament && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-bold">Insufficient Gold</p>
                  <p className="text-xs text-red-400/80 mt-0.5">
                    You need {(tournament.entryFee - userGoldBalance).toLocaleString()} more gold to
                    join.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Entry Fee Info */}
          {tournament && tournament.entryFee > 0 && !insufficientGold && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2">
                <Coins className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-bold">Entry Fee</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    {tournament.entryFee.toLocaleString()} gold will be deducted from your balance.
                  </p>
                </div>
              </div>
            </div>
          )}

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
            onClick={handleClose}
            disabled={isJoining}
            className="flex-1 px-4 py-3 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={isJoining || !canJoin}
            className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold uppercase tracking-wide text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                {tournament?.entryFee
                  ? `Join (${tournament.entryFee.toLocaleString()} Gold)`
                  : "Join Tournament"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
