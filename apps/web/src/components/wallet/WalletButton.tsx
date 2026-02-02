"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import { type WalletType, useGameWallet } from "@/hooks/wallet/useGameWallet";
import { cn } from "@/lib/utils";
import { AlertTriangle, Coins, Shield, Wallet } from "lucide-react";
import { useState } from "react";
import { WalletConnect } from "./WalletConnect";
import { WalletDisplay } from "./WalletDisplay";

/**
 * Truncates a wallet address for display.
 */
function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

interface WalletButtonProps {
  /** Optional additional class names */
  className?: string;
  /** Show expanded wallet details on click instead of dialog */
  expandable?: boolean;
}

/**
 * Combined wallet button component.
 * Shows "Connect Wallet" when not connected, or wallet info when connected.
 * Can be used in navigation bars or headers.
 */
export function WalletButton({ className, expandable = false }: WalletButtonProps) {
  const { walletAddress, walletType, isLoading, isConnected } = useGameWallet();
  const { isStale, isLoading: balanceLoading, formatBalance } = useTokenBalance();

  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showWalletPanel, setShowWalletPanel] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton variant="text" className="w-16 h-4 hidden sm:block" />
      </div>
    );
  }

  // Not connected - show connect button
  if (!isConnected || !walletAddress) {
    return (
      <>
        <Button
          onClick={() => setShowConnectDialog(true)}
          className={cn("tcg-button rounded-lg", className)}
        >
          <Wallet className="w-4 h-4 mr-2" />
          <span>Connect Wallet</span>
        </Button>

        <WalletConnect open={showConnectDialog} onOpenChange={setShowConnectDialog} />
      </>
    );
  }

  // Connected - show wallet info
  if (expandable) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowWalletPanel(!showWalletPanel)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
            "bg-black/20 border border-[#3d2b1f] hover:border-[#5d4b3f]",
            showWalletPanel && "border-primary/50",
            className
          )}
        >
          <WalletIcon walletType={walletType} />
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-xs font-mono text-[#e8e0d5]">
              {truncateAddress(walletAddress)}
            </span>
            <div className="flex items-center gap-1">
              {balanceLoading ? (
                <Skeleton variant="text" className="w-10 h-3" />
              ) : (
                <>
                  <Coins className="w-2.5 h-2.5 text-primary" />
                  <span
                    className={cn(
                      "text-[10px] font-medium text-[#a89f94]",
                      isStale && "text-yellow-400/80"
                    )}
                  >
                    {formatBalance(2)} LTCG
                  </span>
                  {isStale && <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />}
                </>
              )}
            </div>
          </div>
        </button>

        {/* Expandable Panel */}
        {showWalletPanel && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowWalletPanel(false)} />
            {/* Panel */}
            <div className="absolute right-0 top-full mt-2 z-50 w-80">
              <WalletDisplay />
            </div>
          </>
        )}
      </div>
    );
  }

  // Default inline display
  return (
    <>
      <button
        type="button"
        onClick={() => setShowConnectDialog(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "bg-black/20 border border-[#3d2b1f] hover:border-[#5d4b3f]",
          className
        )}
      >
        <WalletIcon walletType={walletType} />
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-xs font-mono text-[#e8e0d5]">{truncateAddress(walletAddress)}</span>
          <div className="flex items-center gap-1">
            {balanceLoading ? (
              <Skeleton variant="text" className="w-10 h-3" />
            ) : (
              <>
                <Coins className="w-2.5 h-2.5 text-primary" />
                <span
                  className={cn(
                    "text-[10px] font-medium text-[#a89f94]",
                    isStale && "text-yellow-400/80"
                  )}
                >
                  {formatBalance(2)} LTCG
                </span>
                {isStale && <AlertTriangle className="w-2.5 h-2.5 text-yellow-400" />}
              </>
            )}
          </div>
        </div>
      </button>

      {/* Opens WalletDisplay in a dialog for managing wallet */}
      <WalletConnect open={showConnectDialog} onOpenChange={setShowConnectDialog} />
    </>
  );
}

/**
 * Icon for wallet type indicator.
 */
function WalletIcon({ walletType }: { walletType: WalletType | null }) {
  const iconClass = "w-5 h-5 text-primary";

  if (walletType === "privy_embedded") {
    return (
      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
        <Shield className={iconClass} />
      </div>
    );
  }

  return (
    <div className="w-8 h-8 rounded-lg bg-[#3d2b1f]/50 flex items-center justify-center">
      <Wallet className={iconClass} />
    </div>
  );
}
