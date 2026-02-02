"use client";

import { WalletConnect } from "@/components/wallet";
import { useCurrency } from "@/hooks/economy/useCurrency";
import { useTokenBalance } from "@/hooks/economy/useTokenBalance";
import { useGameWallet } from "@/hooks/wallet/useGameWallet";
import { cn } from "@/lib/utils";
import { AlertCircle, Coins, Gem, Loader2, Wallet } from "lucide-react";
import { useState } from "react";

interface CurrencySelectorProps {
  value: "gold" | "token";
  onChange: (currency: "gold" | "token") => void;
  className?: string;
}

/**
 * Toggle selector for marketplace currency (Gold vs Token).
 * Displays user balances and handles wallet connection for token mode.
 */
export function CurrencySelector({ value, onChange, className }: CurrencySelectorProps) {
  const { gold, isLoading: goldLoading } = useCurrency();
  const { isStale, isLoading: tokenLoading, formatBalance } = useTokenBalance();
  const { isConnected: walletConnected, isLoading: walletLoading } = useGameWallet();

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);

  const handleTokenClick = () => {
    if (!walletConnected && !walletLoading) {
      setWalletDialogOpen(true);
    } else {
      onChange("token");
    }
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-2 sm:gap-0 rounded-xl overflow-hidden border border-[#3d2b1f]",
          className
        )}
      >
        {/* Gold Option */}
        <button
          type="button"
          onClick={() => onChange("gold")}
          className={cn(
            "flex-1 p-4 transition-all text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-inset",
            value === "gold" ? "bg-[#d4af37]/20 border-[#d4af37]" : "bg-black/20 hover:bg-black/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                value === "gold" ? "bg-[#d4af37]/30" : "bg-[#3d2b1f]/50"
              )}
            >
              <Coins
                className={cn("w-5 h-5", value === "gold" ? "text-[#d4af37]" : "text-[#a89f94]")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-bold",
                    value === "gold" ? "text-[#d4af37]" : "text-[#e8e0d5]"
                  )}
                >
                  Gold
                </span>
                {value === "gold" && (
                  <span className="text-[10px] font-bold text-[#d4af37] px-1.5 py-0.5 rounded border border-[#d4af37]/30 bg-[#d4af37]/10 uppercase tracking-tighter">
                    Selected
                  </span>
                )}
              </div>
              <div className="text-sm text-[#a89f94] mt-0.5">
                {goldLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <span>Balance: {gold.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px bg-[#3d2b1f]" />
        <div className="block sm:hidden h-px bg-[#3d2b1f]" />

        {/* Token Option */}
        <button
          type="button"
          onClick={handleTokenClick}
          className={cn(
            "flex-1 p-4 transition-all text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            value === "token" ? "bg-primary/20 border-primary" : "bg-black/20 hover:bg-black/30"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                value === "token" ? "bg-primary/30" : "bg-[#3d2b1f]/50"
              )}
            >
              <Gem
                className={cn("w-5 h-5", value === "token" ? "text-primary" : "text-[#a89f94]")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={cn("font-bold", value === "token" ? "text-primary" : "text-[#e8e0d5]")}
                >
                  Token
                </span>
                {value === "token" && (
                  <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 uppercase tracking-tighter">
                    Selected
                  </span>
                )}
                {isStale && walletConnected && (
                  <span title="Balance may be outdated">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  </span>
                )}
              </div>
              <div className="text-sm text-[#a89f94] mt-0.5">
                {walletLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                ) : !walletConnected ? (
                  <span className="flex items-center gap-1.5 text-primary/80">
                    <Wallet className="w-3 h-3" />
                    Connect Wallet
                  </span>
                ) : tokenLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  <span>Balance: {formatBalance(2)}</span>
                )}
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Wallet Connect Dialog */}
      <WalletConnect open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
}
