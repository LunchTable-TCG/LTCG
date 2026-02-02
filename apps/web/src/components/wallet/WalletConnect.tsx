"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameWallet } from "@/hooks/wallet/useGameWallet";
import { cn } from "@/lib/utils";
import { ExternalLink, Loader2, Shield, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WalletConnectProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for connecting a wallet to the game account.
 * Supports both Privy embedded (game) wallets and external wallets (Phantom, etc.).
 */
export function WalletConnect({ open, onOpenChange }: WalletConnectProps) {
  const { connectEmbeddedWallet, connectExternalWallet, isConnecting, error } = useGameWallet();
  const [connectingType, setConnectingType] = useState<"embedded" | "external" | null>(null);

  const handleConnectEmbedded = async () => {
    setConnectingType("embedded");
    try {
      await connectEmbeddedWallet();
      toast.success("Game wallet connected successfully");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      toast.error(message);
    } finally {
      setConnectingType(null);
    }
  };

  const handleConnectExternal = async () => {
    setConnectingType("external");
    try {
      await connectExternalWallet();
      toast.success("External wallet connected successfully");
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      toast.error(message);
    } finally {
      setConnectingType(null);
    }
  };

  const isConnectingEmbedded = isConnecting && connectingType === "embedded";
  const isConnectingExternal = isConnecting && connectingType === "external";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl text-[#e8e0d5]">Connect Wallet</DialogTitle>
          <DialogDescription className="text-[#a89f94]">
            Choose how you want to connect to the game economy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {/* Game Wallet (Privy Embedded) - Recommended */}
          <button
            type="button"
            onClick={handleConnectEmbedded}
            disabled={isConnecting}
            className={cn(
              "w-full p-4 rounded-xl border transition-all",
              "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "text-left group"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                {isConnectingEmbedded ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Shield className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#e8e0d5]">Use Game Wallet</span>
                  <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 uppercase tracking-tighter">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-[#a89f94] mt-1">
                  Secure wallet managed by the game. No setup needed - just play!
                </p>
                <ul className="mt-2 text-xs text-[#a89f94]/80 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    <span>Automatic setup</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    <span>Seamless transactions</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary/60" />
                    <span>Recoverable with your account</span>
                  </li>
                </ul>
              </div>
            </div>
          </button>

          {/* External Wallet (Phantom, etc.) */}
          <button
            type="button"
            onClick={handleConnectExternal}
            disabled={isConnecting}
            className={cn(
              "w-full p-4 rounded-xl border transition-all",
              "bg-black/20 border-[#3d2b1f] hover:bg-black/30 hover:border-[#5d4b3f]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "text-left group"
            )}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#3d2b1f]/50 flex items-center justify-center shrink-0">
                {isConnectingExternal ? (
                  <Loader2 className="w-6 h-6 text-[#a89f94] animate-spin" />
                ) : (
                  <ExternalLink className="w-6 h-6 text-[#a89f94]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[#e8e0d5]">Connect External Wallet</span>
                <p className="text-sm text-[#a89f94] mt-1">
                  Use your own Solana wallet (Phantom, Solflare, etc.)
                </p>
                <ul className="mt-2 text-xs text-[#a89f94]/80 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#a89f94]/40" />
                    <span>Full control of your keys</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#a89f94]/40" />
                    <span>Use across multiple apps</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-[#a89f94]/40" />
                    <span>Requires browser extension</span>
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isConnecting}
            className="text-[#a89f94] hover:text-[#e8e0d5]"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
