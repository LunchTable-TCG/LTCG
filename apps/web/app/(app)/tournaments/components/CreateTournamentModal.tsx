"use client";

import {
  type TournamentMode,
  type TournamentSize,
  type TournamentVisibility,
  useCreateUserTournament,
} from "@/hooks/social/useUserTournaments";
import { cn } from "@/lib/utils";
import type { Id } from "@convex/_generated/dataModel";
import {
  AlertTriangle,
  Coins,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tournamentId: Id<"tournaments">, joinCode?: string) => void;
  userGoldBalance?: number;
}

const SIZE_OPTIONS: { value: TournamentSize; label: string }[] = [
  { value: 4, label: "4 Players" },
  { value: 8, label: "8 Players" },
  { value: 16, label: "16 Players" },
  { value: 32, label: "32 Players" },
];

const BUY_IN_PRESETS = [0, 100, 500, 1000, 5000, 10000];

function calculatePrizeBreakdown(buyIn: number, maxPlayers: number) {
  const totalPool = buyIn * maxPlayers;
  const first = Math.floor(totalPool * 0.6);
  const second = Math.floor(totalPool * 0.3);
  const treasury = totalPool - first - second;
  return { totalPool, first, second, treasury };
}

export function CreateTournamentModal({
  isOpen,
  onClose,
  onSuccess,
  userGoldBalance = 0,
}: CreateTournamentModalProps) {
  const { createTournament, isCreating } = useCreateUserTournament();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<TournamentSize>(8);
  const [buyIn, setBuyIn] = useState(0);
  const [mode, setMode] = useState<TournamentMode>("casual");
  const [visibility, setVisibility] = useState<TournamentVisibility>("public");
  const [error, setError] = useState<string | null>(null);

  // Result state (for showing join code after creation)
  const [createdJoinCode, setCreatedJoinCode] = useState<string | null>(null);

  const prizes = calculatePrizeBreakdown(buyIn, maxPlayers);
  const insufficientGold = buyIn > userGoldBalance;

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setMaxPlayers(8);
    setBuyIn(0);
    setMode("casual");
    setVisibility("public");
    setError(null);
    setCreatedJoinCode(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleSubmit = async () => {
    setError(null);

    if (name.trim().length < 3) {
      setError("Tournament name must be at least 3 characters");
      return;
    }

    if (name.trim().length > 50) {
      setError("Tournament name must be 50 characters or less");
      return;
    }

    if (buyIn < 0 || buyIn > 100000) {
      setError("Buy-in must be between 0 and 100,000 gold");
      return;
    }

    if (insufficientGold) {
      setError("You don't have enough gold for this buy-in");
      return;
    }

    try {
      const result = await createTournament({
        name: name.trim(),
        description: description.trim() || undefined,
        maxPlayers,
        buyIn,
        mode,
        visibility,
      });

      if (visibility === "private" && result.joinCode) {
        setCreatedJoinCode(result.joinCode);
      } else {
        onSuccess?.(result.tournamentId, result.joinCode);
        handleClose();
      }
    } catch {
      // Error is handled by the hook
    }
  };

  const copyJoinCode = () => {
    if (createdJoinCode) {
      navigator.clipboard.writeText(createdJoinCode);
      toast.success("Join code copied to clipboard!");
    }
  };

  if (!isOpen) return null;

  // Show join code result for private tournaments
  if (createdJoinCode) {
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

          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-green-400" />
            </div>

            <div>
              <h2 className="text-xl font-black text-[#e8e0d5]">Tournament Created!</h2>
              <p className="text-sm text-[#a89f94] mt-1">Share this code with your friends</p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-[#d4af37]/30">
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-2">Join Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold text-[#d4af37] tracking-[0.3em]">
                  {createdJoinCode}
                </span>
                <button
                  type="button"
                  onClick={copyJoinCode}
                  className="p-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 hover:bg-[#d4af37]/30 transition-all"
                >
                  <Copy className="w-5 h-5 text-[#d4af37]" />
                </button>
              </div>
            </div>

            <p className="text-xs text-[#a89f94]">
              The tournament will start automatically once all {maxPlayers} players have joined.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 text-[#1a1614] font-bold uppercase tracking-wide text-sm shadow-lg transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

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

      <div className="relative w-full max-w-lg mx-4 tcg-chat-leather rounded-2xl border border-[#3d2b1f] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="ornament-corner ornament-corner-tl opacity-50" />
        <div className="ornament-corner ornament-corner-tr opacity-50" />

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3d2b1f] sticky top-0 tcg-chat-leather z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#e8e0d5] uppercase tracking-tight">
                Create Tournament
              </h2>
              <p className="text-xs text-[#a89f94]">Host your own competition</p>
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

        {/* Form */}
        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
              Tournament Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Night Showdown"
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] placeholder-[#6b5d52] focus:border-[#d4af37]/50 focus:outline-none transition-all"
            />
            <p className="text-xs text-[#6b5d52] mt-1">{name.length}/50 characters</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell players what this tournament is about..."
              maxLength={200}
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] placeholder-[#6b5d52] focus:border-[#d4af37]/50 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Size & Visibility */}
          <div className="grid grid-cols-2 gap-4">
            {/* Size */}
            <div>
              <label htmlFor="size" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                <Users className="w-3 h-3 inline mr-1" />
                Tournament Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMaxPlayers(opt.value)}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-bold transition-all",
                      maxPlayers === opt.value
                        ? "bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]"
                        : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-[#d4af37]/30"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label htmlFor="visibility" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
                Visibility
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("public")}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                    visibility === "public"
                      ? "bg-green-500/20 border-green-500/50 text-green-400"
                      : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-green-500/30"
                  )}
                >
                  <Eye className="w-4 h-4" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("private")}
                  className={cn(
                    "px-3 py-2 rounded-lg border text-sm font-bold transition-all flex items-center justify-center gap-1.5",
                    visibility === "private"
                      ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                      : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-purple-500/30"
                  )}
                >
                  <EyeOff className="w-4 h-4" />
                  Private
                </button>
              </div>
              <p className="text-xs text-[#6b5d52] mt-1">
                {visibility === "public"
                  ? "Anyone can find and join"
                  : "Invite-only with join code"}
              </p>
            </div>
          </div>

          {/* Mode */}
          <div>
            <label htmlFor="mode" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
              <Trophy className="w-3 h-3 inline mr-1" />
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("casual")}
                className={cn(
                  "px-4 py-3 rounded-lg border text-sm font-bold transition-all",
                  mode === "casual"
                    ? "bg-green-500/20 border-green-500/50 text-green-400"
                    : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-green-500/30"
                )}
              >
                Casual
              </button>
              <button
                type="button"
                onClick={() => setMode("ranked")}
                className={cn(
                  "px-4 py-3 rounded-lg border text-sm font-bold transition-all",
                  mode === "ranked"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                    : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-amber-500/30"
                )}
              >
                Ranked
              </button>
            </div>
          </div>

          {/* Buy-in */}
          <div>
            <label htmlFor="buyIn" className="block text-xs text-[#a89f94] uppercase tracking-wider mb-2">
              <Coins className="w-3 h-3 inline mr-1" />
              Entry Fee (Gold)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BUY_IN_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBuyIn(preset)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-bold transition-all",
                    buyIn === preset
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                      : "bg-black/30 border-[#3d2b1f] text-[#a89f94] hover:border-amber-500/30"
                  )}
                >
                  {preset === 0 ? "Free" : `${preset.toLocaleString()}g`}
                </button>
              ))}
            </div>
            <input
              id="buyIn"
              type="number"
              value={buyIn}
              onChange={(e) => setBuyIn(Math.max(0, Math.min(100000, Number(e.target.value))))}
              min={0}
              max={100000}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-[#3d2b1f] text-[#e8e0d5] focus:border-[#d4af37]/50 focus:outline-none transition-all"
            />
            <p className="text-xs text-[#6b5d52] mt-1">
              Your balance: {userGoldBalance.toLocaleString()} gold
            </p>
          </div>

          {/* Prize Breakdown */}
          {buyIn > 0 && (
            <div className="p-4 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20">
              <p className="text-xs text-[#a89f94] uppercase tracking-wider mb-3">
                Prize Distribution (when full)
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-[#a89f94]">Pool</p>
                  <p className="font-bold text-[#e8e0d5]">{prizes.totalPool.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#a89f94]">1st (60%)</p>
                  <p className="font-bold text-[#d4af37]">{prizes.first.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#a89f94]">2nd (30%)</p>
                  <p className="font-bold text-gray-300">{prizes.second.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#a89f94]">Fee (10%)</p>
                  <p className="font-bold text-amber-600">{prizes.treasury.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {buyIn > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-bold">Entry Fee</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    {buyIn.toLocaleString()} gold will be deducted when you create this tournament.
                  </p>
                </div>
              </div>
            </div>
          )}

          {insufficientGold && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">
                You need {(buyIn - userGoldBalance).toLocaleString()} more gold to create this tournament.
              </p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-blue-400">
              <strong>Auto-start:</strong> Tournament begins automatically when all {maxPlayers}{" "}
              players join. Unfilled tournaments expire after 24 hours with full refunds.
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
        <div className="flex gap-3 p-5 border-t border-[#3d2b1f] bg-black/20 sticky bottom-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isCreating}
            className="flex-1 px-4 py-3 rounded-lg border border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5] hover:border-[#d4af37]/50 font-bold uppercase tracking-wide text-sm transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCreating || insufficientGold || name.trim().length < 3}
            className="flex-1 px-4 py-3 rounded-lg bg-linear-to-r from-[#d4af37] to-amber-500 hover:from-amber-500 hover:to-[#d4af37] text-[#1a1614] font-bold uppercase tracking-wide text-sm shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Trophy className="w-4 h-4" />
                Create Tournament
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
