"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import { type WalletType, useGameWallet } from "@/hooks/wallet/useGameWallet";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Check,
  Coins,
  Copy,
  Loader2,
  LogOut,
  RefreshCw,
  Shield,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Truncates a wallet address for display.
 * @param address - Full wallet address
 * @param chars - Number of characters to show at start and end (default 4)
 */
function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

interface WalletDisplayProps {
  /** Optional additional class names */
  className?: string;
  /** Compact mode - smaller display for tight spaces */
  compact?: boolean;
}

/**
 * Displays connected wallet information including address, type, and balance.
 * Provides actions for copying address, refreshing balance, and disconnecting.
 */
export function WalletDisplay({ className, compact = false }: WalletDisplayProps) {
  const { walletAddress, walletType, disconnectWallet, isConnecting, isLoading } = useGameWallet();
  const {
    isStale,
    isLoading: balanceLoading,
    isRefreshing,
    refresh,
    formatBalance,
  } = useTokenBalance();

  const [copied, setCopied] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleRefreshBalance = async () => {
    try {
      await refresh();
    } catch {
      // Error is handled in the hook with toast
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      toast.success("Wallet disconnected");
      setShowDisconnectDialog(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect wallet";
      toast.error(message);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton variant="text" className="w-24 h-4" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
      </div>
    );
  }

  // Not connected
  if (!walletAddress) {
    return null;
  }

  const walletTypeBadge = getWalletTypeBadge(walletType);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={handleCopyAddress}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/20 hover:bg-black/30 transition-colors"
          title="Click to copy full address"
        >
          <WalletIcon walletType={walletType} className="w-3.5 h-3.5" />
          <span className="text-xs font-mono text-[#a89f94]">{truncateAddress(walletAddress)}</span>
        </button>
        <div className="flex items-center gap-1 text-xs">
          {balanceLoading ? (
            <Skeleton variant="text" className="w-12 h-4" />
          ) : (
            <>
              <Coins className="w-3 h-3 text-primary" />
              <span className={cn("font-medium", isStale && "text-yellow-400/80")}>
                {formatBalance(2)}
              </span>
              {isStale && <AlertTriangle className="w-3 h-3 text-yellow-400" />}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("p-4 rounded-xl bg-black/20 border border-[#3d2b1f]", className)}>
        {/* Wallet Address Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3d2b1f]/50 flex items-center justify-center">
              <WalletIcon walletType={walletType} className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-[#e8e0d5]">
                  {truncateAddress(walletAddress, 6)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1 rounded hover:bg-white/5 transition-colors"
                  title="Copy full address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#a89f94]" />
                  )}
                </button>
              </div>
              <div className="mt-0.5">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider",
                    walletTypeBadge.className
                  )}
                >
                  {walletTypeBadge.label}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isConnecting}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#a89f94] hover:text-red-400 transition-colors"
            title="Disconnect wallet"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Section */}
        <div className="mt-4 pt-4 border-t border-[#3d2b1f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-xs text-[#a89f94] uppercase tracking-wider">Balance</span>
            </div>
            <button
              type="button"
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="p-1.5 rounded hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Refresh balance"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5 text-[#a89f94]", isRefreshing && "animate-spin")}
              />
            </button>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            {balanceLoading ? (
              <Skeleton variant="text" className="w-20 h-6" />
            ) : (
              <>
                <span className="text-2xl font-bold text-[#e8e0d5]">{formatBalance(2)}</span>
                <span className="text-sm text-[#a89f94]">LTCG</span>
              </>
            )}
          </div>

          {isStale && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-400/80">
              <AlertTriangle className="w-3 h-3" />
              <span>Balance may be outdated</span>
            </div>
          )}
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-yellow-400" />
            </div>
            <DialogTitle className="text-xl text-[#e8e0d5]">Disconnect Wallet?</DialogTitle>
            <DialogDescription className="text-[#a89f94]">
              Your wallet will be unlinked from your game account. You can reconnect anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200/80">
                <p className="font-medium text-yellow-300 mb-1">Note:</p>
                <ul className="space-y-1 text-xs">
                  <li>Your tokens and assets remain safe in your wallet</li>
                  <li>Game progress and collection are saved to your account</li>
                  <li>You&apos;ll need to reconnect to use the marketplace</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
              className="w-full sm:w-auto border-[#3d2b1f] text-[#a89f94] hover:text-[#e8e0d5]"
            >
              Keep Connected
            </Button>
            <Button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-500 text-white"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Icon component for different wallet types.
 */
function WalletIcon({
  walletType,
  className,
}: { walletType: WalletType | null; className?: string }) {
  if (walletType === "privy_embedded") {
    return <Shield className={className} />;
  }
  return <Wallet className={className} />;
}

/**
 * Returns badge styling for wallet type.
 */
function getWalletTypeBadge(walletType: WalletType | null) {
  if (walletType === "privy_embedded") {
    return {
      label: "Game Wallet",
      className: "bg-primary/20 text-primary border border-primary/30",
    };
  }
  return {
    label: "External",
    className: "bg-[#3d2b1f]/50 text-[#a89f94] border border-[#3d2b1f]",
  };
}
