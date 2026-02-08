"use client";

import { useGameLobby } from "@/hooks/game/useGameLobby";
import { cn } from "@/lib/utils";
import { formatWagerAmount } from "@/lib/wagerTiers";
import { api } from "@convex/_generated/api";
import { useMutation } from "convex/react";
import { Check, Coins, Loader2, Swords, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const RANK_COLORS: Record<string, string> = {
  Bronze: "text-orange-400",
  Silver: "text-gray-300",
  Gold: "text-yellow-500",
  Platinum: "text-blue-400",
  Diamond: "text-cyan-400",
  Master: "text-purple-400",
  Legend: "text-yellow-400",
};

export function IncomingChallengeNotification() {
  const router = useRouter();
  const { incomingChallenge } = useGameLobby();
  const joinLobbyMutation = useMutation(api.games.joinLobby);
  const leaveLobbyMutation = useMutation(api.games.leaveLobby);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  if (!incomingChallenge) {
    return null;
  }

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const result = await joinLobbyMutation({ lobbyId: incomingChallenge._id });
      toast.success(`Joined game vs ${incomingChallenge.hostUsername}!`);
      // Navigate to the game
      if (result?.lobbyId) {
        router.push(`/game/${result.lobbyId}`);
      }
    } catch (error) {
      console.error("Failed to accept challenge:", error);
      toast.error("Failed to accept challenge");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await leaveLobbyMutation({});
      toast.success("Challenge declined");
    } catch (error) {
      console.error("Failed to decline challenge:", error);
      toast.error("Failed to decline challenge");
    } finally {
      setIsDeclining(false);
    }
  };

  const rankColor = RANK_COLORS[incomingChallenge.hostRank] || "text-[#e8e0d5]";
  const modeLabel = incomingChallenge.mode === "ranked" ? "Ranked" : "Casual";

  // Determine wager type and formatting
  const hasCryptoWager =
    incomingChallenge.cryptoWagerCurrency && incomingChallenge.cryptoWagerTier !== undefined;
  const hasGoldWager = incomingChallenge.wagerAmount && incomingChallenge.wagerAmount > 0;
  const hasAnyWager = hasCryptoWager || hasGoldWager;

  let wagerBadgeContent: React.ReactNode = null;
  let wagerText = "challenges you to battle!";

  if (
    hasCryptoWager &&
    incomingChallenge.cryptoWagerCurrency &&
    incomingChallenge.cryptoWagerTier !== undefined
  ) {
    const formattedWager = formatWagerAmount(
      incomingChallenge.cryptoWagerTier,
      incomingChallenge.cryptoWagerCurrency
    );
    const badgeClasses =
      incomingChallenge.cryptoWagerCurrency === "sol"
        ? "bg-purple-500/20 text-purple-300"
        : "bg-blue-500/20 text-blue-300";

    wagerBadgeContent = (
      <span
        className={cn(
          "flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded",
          badgeClasses
        )}
      >
        <Coins className="w-3 h-3" />
        {incomingChallenge.cryptoWagerTier}
      </span>
    );
    wagerText = `wagers ${formattedWager}!`;
  } else if (hasGoldWager && incomingChallenge.wagerAmount) {
    wagerBadgeContent = (
      <span className="flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded bg-[#d4af37]/20 text-[#d4af37]">
        <Coins className="w-3 h-3" />
        {incomingChallenge.wagerAmount.toLocaleString()}
      </span>
    );
    wagerText = `wagers ${incomingChallenge.wagerAmount.toLocaleString()} gold!`;
  }

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="relative px-6 py-4 rounded-xl bg-gradient-to-br from-[#2a1f1a] via-[#1f1714] to-[#1a1311] border-2 border-[#d4af37]/60 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#d4af37]/10 to-transparent pointer-events-none" />

        {/* Animated border pulse */}
        <div className="absolute inset-0 rounded-xl border-2 border-[#d4af37]/40 animate-pulse pointer-events-none" />

        <div className="relative flex items-center gap-4">
          {/* Challenge Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#d4af37]/30 to-[#d4af37]/10 border border-[#d4af37]/50">
            <Swords className="w-6 h-6 text-[#d4af37] animate-pulse" />
          </div>

          {/* Challenge Info */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#d4af37] uppercase tracking-wider">
                {hasAnyWager ? "Wager Challenge!" : "Challenge Received!"}
              </span>
              <span
                className={cn(
                  "text-xs font-bold uppercase px-2 py-0.5 rounded",
                  incomingChallenge.mode === "ranked"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-green-500/20 text-green-400"
                )}
              >
                {modeLabel}
              </span>
              {wagerBadgeContent}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[#e8e0d5] font-bold">{incomingChallenge.hostUsername}</span>
              <span className={cn("text-sm font-semibold", rankColor)}>
                ({incomingChallenge.hostRank})
              </span>
              <span className="text-[#a89f94] text-sm">{wagerText}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-200",
                "bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600",
                "text-white shadow-lg hover:shadow-green-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isAccepting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Accept
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-wider transition-all duration-200",
                "bg-gradient-to-br from-red-600/80 to-red-700/80 hover:from-red-500 hover:to-red-600",
                "text-white shadow-lg hover:shadow-red-500/30",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isDeclining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
