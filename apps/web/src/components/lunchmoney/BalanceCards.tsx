"use client";

import { cn } from "@/lib/utils";
import { Coins, Gem, RefreshCw, Wallet } from "lucide-react";

interface BalanceCardsProps {
  gold: number;
  gems: number;
  lifetimeGoldEarned: number;
  lifetimeGoldSpent: number;
  lifetimeGemsEarned: number;
  lifetimeGemsSpent: number;
  tokenBalance: number;
  tokenBalanceStale: boolean;
  walletAddress?: string;
  lastTokenUpdate?: number;
  onRefreshToken: () => void;
  isLoading?: boolean;
}

function truncateAddress(address: string) {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(num: number) {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function BalanceCards({
  gold,
  gems,
  lifetimeGoldEarned,
  lifetimeGoldSpent,
  lifetimeGemsEarned,
  lifetimeGemsSpent,
  tokenBalance,
  tokenBalanceStale,
  walletAddress,
  lastTokenUpdate,
  onRefreshToken,
  isLoading,
}: BalanceCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Gold Card */}
      <div className="relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-5">
        <div className="absolute top-3 right-3 opacity-20">
          <Coins className="h-12 w-12 text-yellow-400" />
        </div>
        <div className="relative">
          <p className="text-sm font-medium text-yellow-400/80">Gold</p>
          <p className={cn("text-3xl font-bold text-yellow-300 mt-1", isLoading && "animate-pulse")}>
            {isLoading ? "..." : formatNumber(gold)}
          </p>
          <div className="mt-4 space-y-1 text-xs text-[#a89f94]">
            <div className="flex justify-between">
              <span>Lifetime Earned</span>
              <span className="text-yellow-400/70">{formatNumber(lifetimeGoldEarned)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lifetime Spent</span>
              <span className="text-yellow-400/70">{formatNumber(lifetimeGoldSpent)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gems Card */}
      <div className="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5">
        <div className="absolute top-3 right-3 opacity-20">
          <Gem className="h-12 w-12 text-purple-400" />
        </div>
        <div className="relative">
          <p className="text-sm font-medium text-purple-400/80">Gems</p>
          <p className={cn("text-3xl font-bold text-purple-300 mt-1", isLoading && "animate-pulse")}>
            {isLoading ? "..." : formatNumber(gems)}
          </p>
          <div className="mt-4 space-y-1 text-xs text-[#a89f94]">
            <div className="flex justify-between">
              <span>Lifetime Earned</span>
              <span className="text-purple-400/70">{formatNumber(lifetimeGemsEarned)}</span>
            </div>
            <div className="flex justify-between">
              <span>Lifetime Spent</span>
              <span className="text-purple-400/70">{formatNumber(lifetimeGemsSpent)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Card */}
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 sm:col-span-2 lg:col-span-1">
        <div className="absolute top-3 right-3 opacity-20">
          <Wallet className="h-12 w-12 text-primary" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-primary/80">LTCG Tokens</p>
            <button
              onClick={onRefreshToken}
              className="p-1 rounded hover:bg-primary/10 transition-colors"
              title="Refresh balance"
            >
              <RefreshCw className="h-4 w-4 text-primary/60 hover:text-primary" />
            </button>
          </div>
          <p className={cn("text-3xl font-bold text-primary mt-1", isLoading && "animate-pulse")}>
            {isLoading ? "..." : tokenBalance.toLocaleString()}
          </p>
          <div className="mt-4 space-y-1 text-xs text-[#a89f94]">
            {walletAddress ? (
              <>
                <div className="flex justify-between items-center">
                  <span>Wallet</span>
                  <span className="font-mono text-primary/70">{truncateAddress(walletAddress)}</span>
                </div>
                {tokenBalanceStale && (
                  <div className="flex items-center gap-1 text-amber-400/70">
                    <span>Balance may be stale</span>
                  </div>
                )}
                {lastTokenUpdate && (
                  <div className="flex justify-between">
                    <span>Last Updated</span>
                    <span className="text-primary/50">
                      {new Date(lastTokenUpdate).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[#a89f94]/60 italic">No wallet connected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
